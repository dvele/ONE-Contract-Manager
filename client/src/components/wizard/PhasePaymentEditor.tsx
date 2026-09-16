import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, Loader2, Plus, Receipt, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Phase {
  id: number;
  phaseNumber: number;
  name: string | null;
}

interface StoredMilestone {
  id: number;
  phaseId: number;
  milestoneNumber: number;
  name: string;
  trigger: string | null;
  percentage: number | null;
}

interface PhaseRollup {
  phaseId: number;
  phaseNumber: number;
  phaseValue: number;
  milestones: { name: string; trigger: string; percentage: number; amount: number }[];
}

interface PricingSummary {
  phases?: PhaseRollup[];
}

/** One editable row. `percentage` stays a string so a cleared field is empty
 * rather than zero — zero is an assertion the client did not make. */
interface DraftRow {
  key: string;
  name: string;
  trigger: string;
  percentage: string;
}

type Draft = Record<number, DraftRow[]>;

const MAX_MILESTONES_PER_PHASE = 50;

/** Percentages in hundredths, exactly as server/routes/milestones.ts totals
 * them, so this card's arithmetic cannot disagree with the check that accepts
 * or rejects the save. */
const REQUIRED_TOTAL_HUNDREDTHS = 10_000;

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCents(cents: number): string {
  return currencyFormat.format(cents / 100);
}

function hundredths(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || !/^\d*\.?\d*$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value * 100);
}

/**
 * Mirrors `priceSchedule` in server/services/pricingMath.ts: percentages to two
 * decimals, the rounding residual on the last row that is not retainage, and
 * amounts summing to the phase value exactly.
 *
 * Duplicated here rather than read back from the server because these are the
 * amounts for percentages the user has typed and not yet saved — there is
 * nothing to read. Keeping the rule identical is what stops the figure on
 * screen differing from the figure that reaches the contract.
 */
function deriveAmounts(phaseValue: number, rows: DraftRow[]): (number | null)[] {
  const parsed = rows.map((row) => hundredths(row.percentage));
  if (phaseValue <= 0 || parsed.some((value) => value === null)) {
    return rows.map(() => null);
  }

  const amounts = parsed.map((value) => Math.round((phaseValue * (value as number)) / 10_000));

  let residualIndex = rows.length - 1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (!/retainage/i.test(rows[i].name)) {
      residualIndex = i;
      break;
    }
  }
  amounts[residualIndex] += phaseValue - amounts.reduce((sum, amount) => sum + amount, 0);

  return amounts;
}

let rowCounter = 0;
function newRow(fields: Partial<Omit<DraftRow, "key">> = {}): DraftRow {
  rowCounter += 1;
  return { key: `row-${rowCounter}`, name: "", trigger: "", percentage: "", ...fields };
}

export const PhasePaymentEditor: React.FC<{ projectId: number }> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const phasesKey = ["/api/projects", projectId, "phases"];
  const milestonesKey = ["/api/projects", projectId, "milestones"];
  const pricingKey = ["/api/projects", projectId, "pricing-summary"];

  const { data: phases = [] } = useQuery<Phase[]>({ queryKey: phasesKey });
  const { data: stored } = useQuery<Record<string, StoredMilestone[]>>({ queryKey: milestonesKey });
  const { data: pricing } = useQuery<PricingSummary>({ queryKey: pricingKey });

  const phaseValues = useMemo(() => {
    const values = new Map<number, number>();
    for (const rollup of pricing?.phases ?? []) values.set(rollup.phaseId, rollup.phaseValue);
    return values;
  }, [pricing]);

  /**
   * The schedule as the server currently resolves it — a phase's stored rows
   * where it has them, the default template where it does not. Seeding the
   * draft from this means the table opens showing what the contract would print
   * today, rather than an empty grid the user must guess at.
   */
  const serverDraft = useMemo<Draft | null>(() => {
    if (stored === undefined || pricing === undefined || phases.length === 0) return null;

    const built: Draft = {};
    for (const phase of phases) {
      const storedRows = stored[String(phase.id)];
      const rollup = pricing.phases?.find((p) => p.phaseId === phase.id);
      const source = storedRows?.length
        ? storedRows.map((row) => ({
            name: row.name,
            trigger: row.trigger ?? "",
            percentage: row.percentage === null ? "" : String(row.percentage),
          }))
        : (rollup?.milestones ?? []).map((row) => ({
            name: row.name,
            trigger: row.trigger,
            percentage: String(row.percentage),
          }));
      built[phase.id] = source.map((fields) => newRow(fields));
    }
    return built;
  }, [stored, pricing, phases]);

  const rowsFor = (phaseId: number): DraftRow[] => draft?.[phaseId] ?? serverDraft?.[phaseId] ?? [];

  const isStored = (phaseId: number): boolean => !!stored?.[String(phaseId)]?.length;

  const updateRows = (phaseId: number, next: DraftRow[]) => {
    // Layered, not replaced: a draft that held only the phase being edited
    // would send every other phase as an empty set on save, clearing schedules
    // nobody touched.
    setDraft({ ...(serverDraft ?? {}), ...(draft ?? {}), [phaseId]: next });
    setSavedMessage(null);
    setErrors((previous) => {
      if (!(phaseId in previous)) return previous;
      const { [phaseId]: _removed, ...rest } = previous;
      return rest;
    });
  };

  const setField = (phaseId: number, key: string, field: keyof Omit<DraftRow, "key">, value: string) =>
    updateRows(
      phaseId,
      rowsFor(phaseId).map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );

  const addRow = (phaseId: number) => updateRows(phaseId, [...rowsFor(phaseId), newRow()]);

  const removeRow = (phaseId: number, key: string) =>
    updateRows(phaseId, rowsFor(phaseId).filter((row) => row.key !== key));

  const moveRow = (phaseId: number, index: number, delta: number) => {
    const rows = [...rowsFor(phaseId)];
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    updateRows(phaseId, rows);
  };

  const saveMilestones = useMutation({
    mutationFn: (payload: Record<string, { name: string; trigger: string; percentage: number }[]>) =>
      apiRequest("PUT", `/api/projects/${projectId}/milestones`, payload),
    onSuccess: () => {
      // The pricing summary is where the saved percentages become the amounts
      // this card shows, so it has to be refetched alongside the rows.
      queryClient.invalidateQueries({ queryKey: milestonesKey });
      queryClient.invalidateQueries({ queryKey: pricingKey });
      setDraft(null);
      setSaveError(null);
      setSavedMessage("Payment schedule saved.");
    },
    onError: () => {
      setSaveError("Could not save the payment schedule. Check the percentages and try again.");
      setSavedMessage(null);
    },
  });

  /**
   * Validated here, at the commit point, rather than per keystroke: a field
   * being momentarily empty or mid-number while someone types is not an error,
   * and the set totalling 100 is a property of the whole phase, not of any one
   * row.
   */
  const handleSave = () => {
    if (draft === null && serverDraft === null) return;

    const nextErrors: Record<number, string> = {};
    const payload: Record<string, { name: string; trigger: string; percentage: number }[]> = {};

    for (const phase of phases) {
      // Same merged view the table renders, so what is sent is what is shown.
      const rows = rowsFor(phase.id);
      if (rows.length === 0) {
        payload[String(phase.id)] = [];
        continue;
      }

      if (rows.length > MAX_MILESTONES_PER_PHASE) {
        nextErrors[phase.id] = `Remove rows: a phase may have at most ${MAX_MILESTONES_PER_PHASE} milestones.`;
        continue;
      }

      if (rows.some((row) => row.name.trim() === "" || row.trigger.trim() === "")) {
        nextErrors[phase.id] = "Give every row a name and a trigger, or remove the row.";
        continue;
      }

      const parsed = rows.map((row) => hundredths(row.percentage));
      if (parsed.some((value) => value === null)) {
        nextErrors[phase.id] = "Enter each percentage as a number between 0 and 100.";
        continue;
      }

      const total = parsed.reduce<number>((sum, value) => sum + (value as number), 0);
      if (total !== REQUIRED_TOTAL_HUNDREDTHS) {
        nextErrors[phase.id] =
          `The percentages total ${(total / 100).toFixed(2)}%. Adjust them to total 100% before saving.`;
        continue;
      }

      payload[String(phase.id)] = rows.map((row, index) => ({
        name: row.name.trim(),
        trigger: row.trigger.trim(),
        percentage: (parsed[index] as number) / 100,
      }));
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSaveError("Nothing was saved. Fix the phases marked below and save again.");
      return;
    }

    setSaveError(null);
    saveMilestones.mutate(payload);
  };

  const hasChanges = draft !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
          Phase Payment Schedule
        </CardTitle>
        <CardDescription>
          Give each phase the milestones it bills against its own value. Amounts are derived from
          the percentages and cannot be typed — a percentage and an amount that disagreed would put
          two different figures in one contract.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {phases.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No phases yet. Add them in Step 4, then set each one&rsquo;s payment schedule here.
          </p>
        ) : (
          phases.map((phase) => {
            const rows = rowsFor(phase.id);
            const phaseValue = phaseValues.get(phase.id) ?? 0;
            const amounts = deriveAmounts(phaseValue, rows);
            const parsed = rows.map((row) => hundredths(row.percentage));
            const totalHundredths = parsed.reduce<number>((sum, value) => sum + (value ?? 0), 0);
            const isComplete = parsed.every((value) => value !== null) && totalHundredths === REQUIRED_TOTAL_HUNDREDTHS;
            const headingId = `phase-payments-${phase.id}`;
            const errorId = `${headingId}-error`;
            const error = errors[phase.id];

            return (
              <section
                key={phase.id}
                aria-labelledby={headingId}
                className="rounded-lg border p-3 space-y-3"
                data-testid={`card-phase-payments-${phase.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id={headingId} className="text-sm font-medium flex flex-wrap items-center gap-2 min-w-0">
                    <Badge variant="secondary">Phase {phase.phaseNumber}</Badge>
                    {phase.name && <span className="break-words">{phase.name}</span>}
                    <span className="text-muted-foreground tabular-nums">
                      {formatCents(phaseValue)}
                    </span>
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {isStored(phase.id) ? "Saved for this phase" : "Default schedule, not yet saved"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Milestone</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead className="text-right">Percent</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Row</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, index) => (
                        <TableRow key={row.key} data-testid={`row-milestone-${phase.id}-${index}`}>
                          <TableCell>
                            <Input
                              name={`milestone-name-${phase.id}-${row.key}`}
                              aria-label={`Milestone ${index + 1} name, phase ${phase.phaseNumber}`}
                              autoComplete="off"
                              placeholder="Signing Deposit…"
                              value={row.name}
                              onChange={(event) => setField(phase.id, row.key, "name", event.target.value)}
                              data-testid={`input-milestone-name-${phase.id}-${index}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              name={`milestone-trigger-${phase.id}-${row.key}`}
                              aria-label={`Milestone ${index + 1} trigger, phase ${phase.phaseNumber}`}
                              autoComplete="off"
                              placeholder="Contract Execution…"
                              value={row.trigger}
                              onChange={(event) => setField(phase.id, row.key, "trigger", event.target.value)}
                              data-testid={`input-milestone-trigger-${phase.id}-${index}`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              name={`milestone-percentage-${phase.id}-${row.key}`}
                              aria-label={`Milestone ${index + 1} percentage, phase ${phase.phaseNumber}`}
                              type="number"
                              inputMode="decimal"
                              step={0.01}
                              min={0}
                              max={100}
                              autoComplete="off"
                              placeholder="20…"
                              value={row.percentage}
                              onChange={(event) => setField(phase.id, row.key, "percentage", event.target.value)}
                              className="tabular-nums text-right"
                              data-testid={`input-milestone-percentage-${phase.id}-${index}`}
                            />
                          </TableCell>
                          <TableCell
                            className="text-right tabular-nums"
                            data-testid={`text-milestone-amount-${phase.id}-${index}`}
                          >
                            {amounts[index] === null ? "—" : formatCents(amounts[index] as number)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Move milestone ${index + 1} up`}
                                disabled={index === 0}
                                onClick={() => moveRow(phase.id, index, -1)}
                                data-testid={`button-move-up-${phase.id}-${index}`}
                              >
                                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Move milestone ${index + 1} down`}
                                disabled={index === rows.length - 1}
                                onClick={() => moveRow(phase.id, index, 1)}
                                data-testid={`button-move-down-${phase.id}-${index}`}
                              >
                                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove milestone ${index + 1}`}
                                onClick={() => removeRow(phase.id, row.key)}
                                data-testid={`button-remove-milestone-${phase.id}-${index}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableRow className="bg-muted/30 font-medium">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(totalHundredths / 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCents(phaseValue)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addRow(phase.id)}
                    data-testid={`button-add-milestone-${phase.id}`}
                  >
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                    Add Milestone
                  </Button>

                  {/* The rule stated before the save, not after the server refuses it. */}
                  <p
                    className={isComplete ? "text-xs text-muted-foreground" : "text-xs text-amber-600 dark:text-amber-500"}
                    data-testid={`text-total-state-${phase.id}`}
                  >
                    {rows.length === 0
                      ? "No milestones. Saving clears this phase's schedule."
                      : isComplete
                        ? "Totals 100%."
                        : `Must total 100% to save. Currently ${(totalHundredths / 100).toFixed(2)}%.`}
                  </p>
                </div>

                {error && (
                  <p id={errorId} role="alert" className="text-xs text-destructive" data-testid={`text-error-${phase.id}`}>
                    {error}
                  </p>
                )}
              </section>
            );
          })
        )}

        {phases.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMilestones.isPending}
              data-testid="button-save-milestones"
            >
              {saveMilestones.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Save Payment Schedule"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!hasChanges || saveMilestones.isPending}
              onClick={() => {
                setDraft(null);
                setErrors({});
                setSaveError(null);
                setSavedMessage(null);
              }}
              data-testid="button-reset-milestones"
            >
              Discard Changes
            </Button>

            <p className="text-sm" aria-live="polite" data-testid="text-milestones-status">
              {saveError ? (
                <span className="text-destructive">{saveError}</span>
              ) : (
                <span className="text-muted-foreground">{savedMessage}</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
