import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Phase {
  id: number;
  phaseNumber: number;
  name: string | null;
  startOffsetDays: number | null;
  manufacturingDays: number | null;
  onsiteDays: number | null;
  deliveryLagDays: number | null;
  factoryStartOverride: string | null;
  factoryCompleteOverride: string | null;
  deliveryWindowOverride: string | null;
  targetCoOverride: string | null;
}

/** The four dates `derivePhaseDates` resolves for one phase, as the pricing
 * summary returns them: an override where one is set, the computed date
 * otherwise, and null where an input is missing. */
interface PhaseDates {
  phaseNumber: number;
  factoryStart: string | null;
  factoryComplete: string | null;
  deliveryWindow: string | null;
  targetCO: string | null;
}

interface PricingSummary {
  phases?: { phaseNumber: number; dates: PhaseDates }[];
}

type DurationField = "startOffsetDays" | "manufacturingDays" | "onsiteDays";
type OverrideField =
  | "factoryStartOverride"
  | "factoryCompleteOverride"
  | "deliveryWindowOverride"
  | "targetCoOverride";
type PhaseField = DurationField | OverrideField;

interface DurationSpec {
  field: DurationField;
  label: string;
  min: number;
  max: number;
  placeholder: string;
  help: string;
}

// Ranges mirror PhaseInputSchema in server/routes/phases.ts so the field states
// the limit before the request is sent rather than after a 400 comes back.
const DURATION_SPECS: DurationSpec[] = [
  {
    field: "startOffsetDays",
    label: "Start Offset (days)",
    min: -365,
    max: 365,
    placeholder: "0…",
    help: "Days after the previous milestone before this phase enters the factory. 0 starts it the same day.",
  },
  {
    field: "manufacturingDays",
    label: "Manufacturing (days)",
    min: 0,
    max: 1095,
    placeholder: "120…",
    help: "Clear this to fall back to the project's production duration.",
  },
  {
    field: "onsiteDays",
    label: "On-Site (days)",
    min: 0,
    max: 1095,
    placeholder: "60…",
    help: "Delivery through certificate of occupancy.",
  },
];

interface DateSpec {
  key: keyof Omit<PhaseDates, "phaseNumber">;
  override: OverrideField;
  label: string;
}

const DATE_SPECS: DateSpec[] = [
  { key: "factoryStart", override: "factoryStartOverride", label: "Factory Start" },
  { key: "factoryComplete", override: "factoryCompleteOverride", label: "Factory Complete" },
  { key: "deliveryWindow", override: "deliveryWindowOverride", label: "Delivery Window" },
  { key: "targetCO", override: "targetCoOverride", label: "Target CO" },
];

/**
 * UTC, matching `formatDateOrTBD` in server/lib/mapper.ts. A `YYYY-MM-DD`
 * string parses as UTC midnight, so formatting it in the viewer's own zone
 * prints the previous day anywhere west of UTC — and this is the date that
 * goes into the contract.
 */
const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string | null): string {
  if (!value) return "TBD";
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : dateFormat.format(parsed);
}

const WHOLE_NUMBER = /^-?\d+$/;

/** Shape only, matching `ISO_DATE` in server/services/scheduleMath.ts. A browser
 * with no native date control falls back to a text input, which can hand back
 * anything. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `ISO_DATE` accepts any four-digit year, so the typos that reach the server
 * unchallenged are year-magnitude ones — `0227-03-05` for `2027-03-05`, which is
 * a real calendar date and would anchor a contract schedule to the third
 * century. These bounds are wider than any plausible project and narrow enough
 * to catch that class. Lexicographic comparison is chronological for
 * zero-padded ISO dates.
 */
const MIN_OVERRIDE_DATE = "2000-01-01";
const MAX_OVERRIDE_DATE = "2099-12-31";

function dayCount(days: number | null, fallback: string): string {
  return days === null ? fallback : `${days} days`;
}

/** How the phase would reach this date if nothing overrode it. */
function derivation(phase: Phase, key: DateSpec["key"]): string {
  const previous =
    phase.phaseNumber <= 1
      ? "Design completion"
      : `Phase ${phase.phaseNumber - 1} factory completion`;

  switch (key) {
    case "factoryStart":
      return `${previous} + ${dayCount(phase.startOffsetDays, "0 days")} start offset.`;
    case "factoryComplete":
      return `Factory start + ${dayCount(
        phase.manufacturingDays,
        "the project's production duration",
      )} of manufacturing.`;
    case "deliveryWindow":
      return `Factory completion + ${dayCount(phase.deliveryLagDays, "0 days")} of delivery lag.`;
    case "targetCO":
      return `Delivery + ${dayCount(phase.onsiteDays, "an unset on-site duration")} on site.`;
  }
}

const EMPTY_DATES: Omit<PhaseDates, "phaseNumber"> = {
  factoryStart: null,
  factoryComplete: null,
  deliveryWindow: null,
  targetCO: null,
};

export const PhaseScheduleEditor: React.FC<{ projectId: number }> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const phasesKey = ["/api/projects", projectId, "phases"];
  const pricingKey = ["/api/projects", projectId, "pricing-summary"];

  const { data: phases = [], isFetching: isFetchingPhases } = useQuery<Phase[]>({
    queryKey: phasesKey,
  });
  // The derived dates come from the server's own schedule math by way of the
  // pricing summary, so what this card shows is what the contract will print.
  // Recomputing the chain here would be a second implementation of
  // server/services/scheduleMath.ts, free to drift from the one that signs.
  const { data: pricing, isFetching: isFetchingPricing } = useQuery<PricingSummary>({
    queryKey: pricingKey,
  });

  const patchPhase = useMutation({
    mutationFn: ({
      phaseId,
      field,
      value,
    }: {
      phaseId: number;
      field: PhaseField;
      value: number | string | null;
    }) => apiRequest("PATCH", `/api/phases/${phaseId}`, { [field]: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phasesKey });
      queryClient.invalidateQueries({ queryKey: pricingKey });
      setErrorMessage(null);
    },
    onError: () => setErrorMessage("Could not save the schedule change. Check the value and try again."),
  });

  // The two queries settle at different speeds. `phases` is one indexed SELECT;
  // `pricing-summary` reruns the whole pricing calculation, so after a save the
  // new override is already in `phases` while `dates` still holds the pre-save
  // value. React Query serves the previous `data` throughout a refetch, so only
  // `isFetching` separates that window from a genuine disagreement.
  const isSettled = !isFetchingPhases && !isFetchingPricing && !patchPhase.isPending;

  const setFieldError = (key: string, message: string | null) =>
    setFieldErrors((previous) => {
      if (message === null) {
        if (!(key in previous)) return previous;
        const { [key]: _removed, ...rest } = previous;
        return rest;
      }
      return { ...previous, [key]: message };
    });

  const isSaving = (phaseId: number, field: PhaseField) =>
    patchPhase.isPending &&
    patchPhase.variables?.phaseId === phaseId &&
    patchPhase.variables.field === field;

  const saveDuration = (phase: Phase, spec: DurationSpec, raw: string) => {
    const key = `${phase.id}:${spec.field}`;
    const trimmed = raw.trim();

    // An empty field means "unset", which is not the same as 0: a phase with no
    // manufacturingDays falls back to the project's production duration, while
    // 0 asserts a zero-day build.
    if (trimmed === "") {
      setFieldError(key, null);
      if (phase[spec.field] === null) return;
      patchPhase.mutate({ phaseId: phase.id, field: spec.field, value: null });
      return;
    }

    if (!WHOLE_NUMBER.test(trimmed)) {
      setFieldError(key, "Enter a whole number of days, or clear the field.");
      return;
    }

    const value = Number(trimmed);

    // Unchanged, so nothing was typed and there is nothing to validate. This has
    // to precede the range check: a row written before the API bounded these
    // fields can hold a value outside them, and tabbing past it must not raise
    // an error about a value the user never entered.
    if (phase[spec.field] === value) {
      setFieldError(key, null);
      return;
    }

    if (value < spec.min || value > spec.max) {
      setFieldError(key, `Enter between ${spec.min} and ${spec.max} days, or clear the field.`);
      return;
    }

    setFieldError(key, null);
    patchPhase.mutate({ phaseId: phase.id, field: spec.field, value });
  };

  const saveOverride = (phase: Phase, spec: DateSpec, raw: string) => {
    const key = `${phase.id}:${spec.override}`;

    // An emptied date input reads as "", which must reach the API as null so the
    // column clears and the phase returns to its derived date.
    const value = raw === "" ? null : raw;

    // Same ordering as saveDuration: an untouched field is not a typo. A legacy
    // override can sit outside the bounds below, and tabbing through it must
    // not accuse the user of entering it.
    if (phase[spec.override] === value) {
      setFieldError(key, null);
      return;
    }

    if (value !== null) {
      if (!ISO_DATE.test(value)) {
        setFieldError(key, "Enter the date as YYYY-MM-DD, or clear the field.");
        return;
      }
      if (value < MIN_OVERRIDE_DATE || value > MAX_OVERRIDE_DATE) {
        setFieldError(
          key,
          `Enter a date between ${MIN_OVERRIDE_DATE} and ${MAX_OVERRIDE_DATE}, or clear the field.`,
        );
        return;
      }
    }

    setFieldError(key, null);
    patchPhase.mutate({ phaseId: phase.id, field: spec.override, value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
          Phase Schedule
        </CardTitle>
        <CardDescription>
          Give each phase its durations and the four dates follow. Override any one of them to
          assert a date instead; clear the override to hand it back to the calculation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {phases.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No phases yet. Add them in Step 4, then set each one&rsquo;s schedule here.
          </p>
        ) : (
          phases.map((phase) => {
            const headingId = `phase-schedule-${phase.id}`;
            const defaultName = `Phase ${phase.phaseNumber}`;
            const dates =
              pricing?.phases?.find((rollup) => rollup.phaseNumber === phase.phaseNumber)?.dates ??
              EMPTY_DATES;

            return (
              <section
                key={phase.id}
                aria-labelledby={headingId}
                className="rounded-lg border p-3 space-y-4"
                data-testid={`card-phase-schedule-${phase.id}`}
              >
                <h3 id={headingId} className="text-sm font-medium flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{defaultName}</Badge>
                  {phase.name && <span className="break-words">{phase.name}</span>}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {DURATION_SPECS.map((spec) => {
                    const inputId = `${spec.field}-${phase.id}`;
                    const errorId = `${inputId}-error`;
                    const helpId = `${inputId}-help`;
                    const error = fieldErrors[`${phase.id}:${spec.field}`];
                    return (
                      <div key={spec.field} className="space-y-1">
                        <Label htmlFor={inputId} className="text-xs">
                          {spec.label}
                        </Label>
                        <Input
                          // Remount when the server value changes so defaultValue
                          // re-syncs instead of showing the stale typed input.
                          key={`${inputId}-${phase[spec.field] ?? ""}`}
                          id={inputId}
                          name={inputId}
                          type="number"
                          inputMode="numeric"
                          step={1}
                          min={spec.min}
                          max={spec.max}
                          autoComplete="off"
                          placeholder={spec.placeholder}
                          defaultValue={phase[spec.field] ?? ""}
                          aria-invalid={!!error}
                          aria-describedby={error ? errorId : helpId}
                          onBlur={(event) => saveDuration(phase, spec, event.target.value)}
                          className="tabular-nums"
                          data-testid={`input-${spec.field}-${phase.id}`}
                        />
                        {error ? (
                          // role="alert": the error is raised on blur, so focus
                          // has already left and an aria-describedby change
                          // announces nothing. This announces it without taking
                          // focus back off the field the user moved to.
                          <p id={errorId} role="alert" className="text-xs text-destructive">
                            {error} Not saved.
                          </p>
                        ) : (
                          <p id={helpId} className="text-xs text-muted-foreground">
                            {isSaving(phase.id, spec.field) ? "Saving…" : spec.help}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DATE_SPECS.map((spec) => {
                    const overrideId = `${spec.override}-${phase.id}`;
                    const sourceId = `${overrideId}-source`;
                    const overrideErrorId = `${overrideId}-error`;
                    const overrideError = fieldErrors[`${phase.id}:${spec.override}`];
                    // A blank column is not an override. Rows written before the
                    // API validated these fields can hold "" or a
                    // calendar-impossible string, both of which the server
                    // ignores in favour of the derived date.
                    const stored = phase[spec.override]?.trim() ? phase[spec.override] : null;
                    const isOverridden = stored !== null;
                    const effective = dates[spec.key];
                    // The server resolves an override to the date it prints, so
                    // an override that does not come back as the effective date
                    // is one it refused. Only meaningful once both queries have
                    // settled; see `isSettled`.
                    const isIgnored =
                      isOverridden && pricing !== undefined && isSettled && stored !== effective;

                    return (
                      <div
                        key={spec.override}
                        className={
                          isOverridden
                            ? "rounded-lg border-2 border-amber-500/70 bg-amber-500/10 p-3 space-y-2"
                            : "rounded-lg border border-dashed bg-muted/30 p-3 space-y-2"
                        }
                        data-testid={`block-${spec.override}-${phase.id}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs font-medium">{spec.label}</h4>
                          <Badge
                            variant={isOverridden ? "default" : "outline"}
                            data-testid={`badge-${spec.override}-${phase.id}`}
                          >
                            {isOverridden ? "Overridden" : "Calculated"}
                          </Badge>
                        </div>

                        <p
                          className="text-base font-semibold tabular-nums break-words"
                          data-testid={`text-${spec.key}-${phase.id}`}
                        >
                          {formatDate(effective)}
                        </p>

                        <p id={sourceId} className="text-xs text-muted-foreground">
                          {isOverridden
                            ? "Entered by hand, replacing the calculated date. Clear the field to calculate it again."
                            : derivation(phase, spec.key)}
                        </p>

                        {isIgnored && (
                          <p
                            className="text-xs text-destructive"
                            data-testid={`text-ignored-${spec.override}-${phase.id}`}
                          >
                            The date in the field is not the one above. Re-enter it, or clear the
                            field to use the calculated date.
                          </p>
                        )}

                        <div className="space-y-1">
                          <Label htmlFor={overrideId} className="text-xs">
                            Override (optional)
                          </Label>
                          <Input
                            // Remount so a cleared or server-normalised value
                            // re-syncs into the uncontrolled input.
                            key={`${overrideId}-${stored ?? ""}`}
                            id={overrideId}
                            name={overrideId}
                            type="date"
                            min={MIN_OVERRIDE_DATE}
                            max={MAX_OVERRIDE_DATE}
                            autoComplete="off"
                            defaultValue={stored ?? ""}
                            aria-invalid={!!overrideError}
                            aria-describedby={overrideError ? overrideErrorId : sourceId}
                            onBlur={(event) => saveOverride(phase, spec, event.target.value)}
                            data-testid={`input-${spec.override}-${phase.id}`}
                          />
                          {overrideError ? (
                            <p
                              id={overrideErrorId}
                              role="alert"
                              className="text-xs text-destructive"
                              data-testid={`text-error-${spec.override}-${phase.id}`}
                            >
                              {overrideError} Not saved.
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {isSaving(phase.id, spec.override)
                                ? "Saving…"
                                : "Leave empty to calculate."}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        <p
          className="text-sm text-destructive"
          aria-live="polite"
          data-testid="text-phase-schedule-error"
        >
          {errorMessage}
        </p>
      </CardContent>
    </Card>
  );
};
