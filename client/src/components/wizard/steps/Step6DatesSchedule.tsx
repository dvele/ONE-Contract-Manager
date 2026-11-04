import { useEffect, useMemo, useState } from 'react';
import { useWizard, ONSITE_DEFAULT_DAYS } from '../WizardContext';
import { PhaseScheduleEditor } from '../PhaseScheduleEditor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Info, AlertTriangle, Target } from 'lucide-react';
import { toDeliveryModel } from '@shared/deliveryModel';

/**
 * The Exhibit D.1 review periods, in business days, as `D1_REVIEW_PERIODS` in
 * server/lib/mapper.ts states them. Exhibit D.1's own "Review Period" column is
 * the source; no column stores them, so they are shown here read-only rather
 * than as inputs that would have nowhere to save.
 */
const D1_REVIEW_PERIODS = [
  { label: 'Kickoff Review', days: 5 },
  { label: 'Schematic Review', days: 10 },
  { label: 'Permit Set Review', days: 10 },
  { label: 'Green Light Review', days: 5 },
];

/**
 * Ordered by the derivation chain, which is also Exhibit D.1's own row order:
 * D-1 Kickoff, D-2 Schematic, D-3 Permit Set, D-4 Green Light Package. Each
 * date derives from the one above it through that row's review period, so a
 * field showing a later date above an earlier one would contradict both the
 * exhibit and the values in the boxes.
 *
 * `designDevelopmentDate` backs D-4 and `permitSubmittalDate` backs D-3 — the
 * column names read the other way round; see
 * docs/phase-property-model-open-items.md.
 */
const D1_OVERRIDES = [
  { field: 'designKickoffDate', label: 'Kickoff (D-1)', testId: 'input-design-kickoff-date' },
  { field: 'schematicDesignDate', label: 'Schematic (D-2)', testId: 'input-schematic-design-date' },
  { field: 'permitSubmittalDate', label: 'Permit Set (D-3)', testId: 'input-permit-submittal-date' },
  { field: 'designDevelopmentDate', label: 'Green Light Package (D-4)', testId: 'input-design-development-date' },
] as const;

// The help text differs per field because the fallbacks do. mapper.ts resolves
// PRODUCTION_COMPLETE_DATE to the phase rollup when the column is empty;
// PRODUCTION_MIDPOINT_DATE has no such fallback. It also has no row: D.2's
// table is P-1 Factory Start, P-2 Factory Completion, P-3 Delivery/Set, P-4
// CO/Equivalent, so a midpoint has nowhere to print, filled or empty.
const D2_OVERRIDES = [
  {
    field: 'productionMidpointDate',
    label: 'Production Midpoint',
    testId: 'input-production-midpoint-date',
    help: 'Nothing calculates this one, and Exhibit D.2 has no row for it — it prints nowhere today.',
  },
  {
    field: 'productionCompleteDate',
    label: 'Production Complete',
    testId: 'input-production-complete-date',
    help: 'Empty means rolled up from the phases — the latest factory completion.',
  },
] as const;

const SITE_READINESS = [
  { field: 'foundationReadyDays', label: 'Foundation Ready (days)', placeholder: '14…', max: 90, testId: 'input-foundation-ready-days' },
  { field: 'utilityStubbedDays', label: 'Utilities Stubbed (days)', placeholder: '14…', max: 90, testId: 'input-utility-stubbed-days' },
  { field: 'siteAccessReadyDays', label: 'Site Access Ready (days)', placeholder: '7…', max: 60, testId: 'input-site-access-ready-days' },
  { field: 'permitsScheduledDays', label: 'Permits Scheduled (days)', placeholder: '30…', max: 120, testId: 'input-permits-scheduled-days' },
  { field: 'craneAccessReadyDays', label: 'Crane Access Ready (days)', placeholder: '7…', max: 60, testId: 'input-crane-access-ready-days' },
] as const;

/**
 * Bounds for the default production duration.
 *
 * Not the 60–365 that used to guard this field: that range was written for a
 * project-level schedule input that no longer exists. The field is now the
 * fallback `pricingEngine` applies to every phase with no `manufacturingDays`
 * of its own, so its ceiling matches the per-phase bound in
 * server/routes/phases.ts (1095) — the fallback should be able to express
 * anything a phase can state directly.
 *
 * The floor is 1, not the 0 that `phases.ts` allows. A 0 on one phase is an
 * explicit assertion about that phase; as the project-wide default it silently
 * gives every unspecified phase a zero-day production span, which then renders
 * as a derived date under a "Calculated" badge.
 */
const MIN_PRODUCTION_DAYS = 1;
const MAX_PRODUCTION_DAYS = 1095;

/**
 * Bounds for the design duration, matching the range the field has always
 * stated to the user and the "Typical: 30–90 days" help text beside it.
 *
 * A floor above 0 is what matters: `pricingEngine` derives design completion as
 * project start + this many days, so a 0 returns the project start unchanged
 * and collapses every phase's factory start onto it — four derived dates per
 * phase, all wrong, all rendered under a "Calculated" badge.
 */
const MIN_DESIGN_DAYS = 30;
const MAX_DESIGN_DAYS = 180;

const WHOLE_NUMBER = /^\d+$/;

/**
 * UTC, matching `formatDateOrTBD` in server/lib/mapper.ts: a `YYYY-MM-DD`
 * string parses as UTC midnight, so formatting it in the viewer's own zone
 * prints the previous day anywhere west of UTC.
 */
const dateFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

export const Step6DatesSchedule: React.FC = () => {
  const { wizardState, updateProjectData, draftProjectId } = useWizard();

  const { projectData, validationErrors } = wizardState;

  // Editing buffers, not a second source of truth. The autosave is ungated —
  // performAutosave's only precondition is a project name — so anything written
  // into wizard state reaches the projects row about two seconds later, and
  // `parseInt("") || 0` would make clearing either field commit a 0: a 0
  // production duration gives every phase without its own manufacturingDays a
  // zero-day span, and a 0 design duration collapses every phase's factory
  // start onto the project start. Keeping the keystrokes local means only a
  // value inside the bounds is ever committed; an out-of-range one stays in the
  // box, under an error, and the stored value keeps its last good reading.
  //
  // A `validateStep` entry would not do this job: `updateProjectData` clears
  // the whole `validationErrors` map on any field change, so a step-scoped
  // error here would disable Next and name no field.
  const [productionDraft, setProductionDraft] = useState<string | null>(null);
  const [productionDraftError, setProductionDraftError] = useState<string | null>(null);
  const [designDraft, setDesignDraft] = useState<string | null>(null);
  const [designDraftError, setDesignDraftError] = useState<string | null>(null);

  const handleDesignChange = (raw: string) => {
    setDesignDraft(raw);

    const trimmed = raw.trim();
    if (!WHOLE_NUMBER.test(trimmed)) {
      setDesignDraftError(
        `Enter a whole number of days between ${MIN_DESIGN_DAYS} and ${MAX_DESIGN_DAYS}.`,
      );
      return;
    }

    const value = Number(trimmed);
    if (value < MIN_DESIGN_DAYS || value > MAX_DESIGN_DAYS) {
      setDesignDraftError(`Enter between ${MIN_DESIGN_DAYS} and ${MAX_DESIGN_DAYS} days.`);
      return;
    }

    setDesignDraftError(null);
    updateProjectData({ designPhaseDays: value });
  };

  const handleProductionChange = (raw: string) => {
    setProductionDraft(raw);

    const trimmed = raw.trim();
    if (!WHOLE_NUMBER.test(trimmed)) {
      setProductionDraftError(
        `Enter a whole number of days between ${MIN_PRODUCTION_DAYS} and ${MAX_PRODUCTION_DAYS}.`,
      );
      return;
    }

    const value = Number(trimmed);
    if (value < MIN_PRODUCTION_DAYS || value > MAX_PRODUCTION_DAYS) {
      setProductionDraftError(
        `Enter between ${MIN_PRODUCTION_DAYS} and ${MAX_PRODUCTION_DAYS} days.`,
      );
      return;
    }

    setProductionDraftError(null);
    updateProjectData({ manufacturingDurationDays: value });
  };

  // The draft covers what the user is typing now; `validationErrors` covers a
  // project that loaded with a bad value already stored.
  const productionError = productionDraftError ?? validationErrors.manufacturingDurationDays;
  const productionValue = productionDraft ?? (projectData.manufacturingDurationDays || '');
  const designError = designDraftError ?? validationErrors.designPhaseDays;
  const designValue = designDraft ?? (projectData.designPhaseDays || '');

  // Same buffering as above, one entry per C.4 field. Clearing one commits null
  // rather than the 0 that `parseInt("") || 0` used to produce: mapper.ts reads
  // these with `??`, so a 0 survives the default and Exhibit C.4 would state a
  // site condition is due 0 days before delivery.
  const [siteReadinessDrafts, setSiteReadinessDrafts] = useState<Record<string, string>>({});
  const [siteReadinessErrors, setSiteReadinessErrors] = useState<Record<string, string>>({});

  const setSiteReadinessError = (field: string, message: string | null) =>
    setSiteReadinessErrors((previous) => {
      if (message === null) {
        if (!(field in previous)) return previous;
        const { [field]: _removed, ...rest } = previous;
        return rest;
      }
      return { ...previous, [field]: message };
    });

  const handleSiteReadinessChange = (
    field: (typeof SITE_READINESS)[number]['field'],
    max: number,
    raw: string,
  ) => {
    setSiteReadinessDrafts((previous) => ({ ...previous, [field]: raw }));

    const trimmed = raw.trim();
    if (trimmed === '') {
      setSiteReadinessError(field, null);
      updateProjectData({ [field]: null });
      return;
    }

    if (!WHOLE_NUMBER.test(trimmed)) {
      setSiteReadinessError(field, `Enter a whole number of days between 1 and ${max}.`);
      return;
    }

    const value = Number(trimmed);
    if (value < 1 || value > max) {
      setSiteReadinessError(field, `Enter between 1 and ${max} days.`);
      return;
    }

    setSiteReadinessError(field, null);
    updateProjectData({ [field]: value });
  };

  // `effectiveDate`, not `agreementDate`, is what the wizard saves to
  // projectDetails.agreementExecutionDate, and that column is what the server
  // anchors every derived date to. Showing agreementDate here would name a
  // start the schedule does not actually use.
  const projectStart = projectData.effectiveDate || projectData.agreementDate;

  const projectStartLabel = useMemo(() => {
    if (!projectStart) return 'Not set';
    const parsed = new Date(`${projectStart}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? projectStart : dateFormat.format(parsed);
  }, [projectStart]);

  // Auto-set effectiveDate from agreementDate on mount or when agreementDate changes
  useEffect(() => {
    if (!projectData.effectiveDate && projectData.agreementDate) {
      updateProjectData({ effectiveDate: projectData.agreementDate });
    } else if (!projectData.effectiveDate && !projectData.agreementDate) {
      // Default to today if no dates are set
      const today = new Date().toISOString().split('T')[0];
      updateProjectData({ effectiveDate: today });
    }
  }, [projectData.agreementDate, projectData.effectiveDate, updateProjectData]);

  useEffect(() => {
    if (!projectData.onsiteDurationDays) {
      const defaultDays = ONSITE_DEFAULT_DAYS[toDeliveryModel(projectData.serviceModel)];
      updateProjectData({ onsiteDurationDays: defaultDays });
    }
  }, [projectData.serviceModel]);

  // manufacturingDurationDays keeps its default even though this step no longer
  // shows it: the wizard saves it to projects.productionDuration, which every
  // phase with no manufacturingDays of its own falls back to. Letting it settle
  // at 0 would derive a null factoryComplete for each of those phases.
  useEffect(() => {
    const updates: Partial<typeof projectData> = {};
    if (!projectData.designPhaseDays) {
      updates.designPhaseDays = 60;
    }
    if (!projectData.manufacturingDurationDays) {
      updates.manufacturingDurationDays = 120;
    }
    if (Object.keys(updates).length > 0) {
      updateProjectData(updates);
    }
  }, []);

  // The project-level rollup behind COMPLETION_DATE and PROJECT_END_DATE in
  // mapper.ts. Its inputs are no longer edited on this step, but the mapper
  // still reads projects.estimatedCompletionDate, so it keeps being derived.
  const { deliveryDate, completionDate } = useMemo(() => {
    const startDate = new Date(`${projectStart || new Date().toISOString().split('T')[0]}T00:00:00Z`);

    const deliveryDays =
      (projectData.designPhaseDays || 0) + (projectData.manufacturingDurationDays || 0);
    const delivery = new Date(startDate);
    delivery.setUTCDate(delivery.getUTCDate() + deliveryDays);

    const totalDays = deliveryDays + (projectData.onsiteDurationDays || 0);
    const completion = new Date(startDate);
    completion.setUTCDate(completion.getUTCDate() + totalDays);

    return { deliveryDate: delivery, completionDate: completion };
  }, [
    projectStart,
    projectData.designPhaseDays,
    projectData.manufacturingDurationDays,
    projectData.onsiteDurationDays,
  ]);

  useEffect(() => {
    const deliveryStr = deliveryDate.toISOString().split('T')[0];
    const completionStr = completionDate.toISOString().split('T')[0];

    if (
      projectData.targetDeliveryDate !== deliveryStr ||
      projectData.estimatedCompletionDate !== completionStr
    ) {
      updateProjectData({
        targetDeliveryDate: deliveryStr,
        estimatedCompletionDate: completionStr,
      });
    }
  }, [deliveryDate, completionDate]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
            Project Start
          </CardTitle>
          <CardDescription>
            Every date below derives from this day. Change it in Step 1.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/30 rounded-lg border flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Project Start Date</p>
              <p className="text-lg font-semibold tabular-nums break-words" data-testid="text-project-start">
                {projectStartLabel}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Taken from the agreement date in Step 1. Design, manufacturing, delivery and
                occupancy all chain forward from it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
            Design
            <Badge variant="outline" className="text-xs">Exhibit D.1</Badge>
          </CardTitle>
          <CardDescription>
            How long design runs before the first phase enters the factory, and the review periods
            that place each D.1 milestone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="designPhaseDays">Design Duration (days)</Label>
              <Input
                id="designPhaseDays"
                name="designPhaseDays"
                type="number"
                inputMode="numeric"
                step={1}
                min={MIN_DESIGN_DAYS}
                max={MAX_DESIGN_DAYS}
                autoComplete="off"
                value={designValue}
                onChange={(e) => handleDesignChange(e.target.value)}
                placeholder="60…"
                aria-invalid={!!designError}
                aria-describedby={
                  designError ? 'designPhaseDays-error' : 'designPhaseDays-help'
                }
                className={`tabular-nums ${designError ? 'border-destructive' : ''}`}
                data-testid="input-design-days"
              />
              {designError ? (
                <p id="designPhaseDays-error" role="alert" className="text-xs text-destructive">
                  {designError} Not saved &mdash; the schedule keeps using{' '}
                  {projectData.designPhaseDays || 0} days.
                </p>
              ) : (
                <p id="designPhaseDays-help" className="text-xs text-muted-foreground">
                  Typical: 30&ndash;90 days. Phase 1 enters the factory this many days after the
                  project start.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="manufacturingDurationDays">Default Production Duration (days)</Label>
              <Input
                id="manufacturingDurationDays"
                name="manufacturingDurationDays"
                type="number"
                inputMode="numeric"
                step={1}
                min={MIN_PRODUCTION_DAYS}
                max={MAX_PRODUCTION_DAYS}
                autoComplete="off"
                value={productionValue}
                onChange={(e) => handleProductionChange(e.target.value)}
                placeholder="120…"
                aria-invalid={!!productionError}
                aria-describedby={
                  productionError
                    ? 'manufacturingDurationDays-error'
                    : 'manufacturingDurationDays-help'
                }
                className={`tabular-nums ${productionError ? 'border-destructive' : ''}`}
                data-testid="input-default-production-days"
              />
              {productionError ? (
                <p
                  id="manufacturingDurationDays-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {productionError} Not saved &mdash; the phases keep using{' '}
                  {projectData.manufacturingDurationDays || 0} days.
                </p>
              ) : (
                <p id="manufacturingDurationDays-help" className="text-xs text-muted-foreground">
                  Used by any phase with no manufacturing days of its own. Set a phase&rsquo;s own
                  duration below to override it there.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-sm font-medium">Review Periods</h3>
            <p className="text-xs text-muted-foreground">
              Fixed by Exhibit D.1 and stated in business days. They place each milestone below
              when no date is entered for it.
            </p>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              {D1_REVIEW_PERIODS.map((period) => (
                <div key={period.label} className="rounded-lg border bg-muted/30 p-3 min-w-0">
                  <dt className="text-xs text-muted-foreground break-words">{period.label}</dt>
                  <dd className="text-base font-semibold tabular-nums">
                    {period.days} business days
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-sm font-medium">Milestone Date Overrides</h3>
            <p className="text-xs text-muted-foreground">
              Leave these empty and each date is calculated from the project start through the
              review periods above. Enter one to assert it instead; clear it to calculate it again.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {D1_OVERRIDES.map((milestone) => (
                <div key={milestone.field} className="space-y-1">
                  <Label htmlFor={milestone.field}>{milestone.label}</Label>
                  <Input
                    id={milestone.field}
                    name={milestone.field}
                    type="date"
                    autoComplete="off"
                    value={projectData[milestone.field] || ''}
                    onChange={(e) => updateProjectData({ [milestone.field]: e.target.value })}
                    aria-describedby={`${milestone.field}-help`}
                    data-testid={milestone.testId}
                  />
                  <p id={`${milestone.field}-help`} className="text-xs text-muted-foreground">
                    Empty means calculated.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {draftProjectId ? (
        <PhaseScheduleEditor projectId={draftProjectId} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              Phase Schedule
            </CardTitle>
            <CardDescription>
              Save the project in Step 1 and add phases in Step 4, then set each phase&rsquo;s
              schedule here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
            Production Rollup Overrides
            <Badge variant="outline" className="text-xs">Exhibit D.2</Badge>
          </CardTitle>
          <CardDescription>
            Exhibit D.2 states one production span for the whole project. Production Complete rolls
            up from the phases above unless you assert it here; Production Midpoint has neither a
            calculation behind it nor a row in D.2 to print into.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {D2_OVERRIDES.map((milestone) => (
              <div key={milestone.field} className="space-y-1">
                <Label htmlFor={milestone.field}>{milestone.label}</Label>
                <Input
                  id={milestone.field}
                  name={milestone.field}
                  type="date"
                  autoComplete="off"
                  value={projectData[milestone.field] || ''}
                  onChange={(e) => updateProjectData({ [milestone.field]: e.target.value })}
                  aria-describedby={`${milestone.field}-help`}
                  data-testid={milestone.testId}
                />
                <p id={`${milestone.field}-help`} className="text-xs text-muted-foreground">
                  {milestone.help}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
            Delivery Window and Site Access
            <Badge variant="outline" className="text-xs">Exhibit A.8</Badge>
          </CardTitle>
          <CardDescription>
            Delivery window, crane day and Site access assumptions agreed for this project.
            Prints in Exhibit A.8; if left empty, Exhibit C governs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <Label htmlFor="siteAccessAssumptions">Assumptions</Label>
            <Textarea
              id="siteAccessAssumptions"
              name="siteAccessAssumptions"
              rows={3}
              value={projectData.siteAccessAssumptions || ''}
              onChange={(e) => updateProjectData({ siteAccessAssumptions: e.target.value })}
              placeholder="e.g., Delivery window of 5 business days after Buyer's readiness notice; crane staged on the north access road; 14 ft clearance on Vineyard Rd"
              data-testid="input-site-access-assumptions"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" aria-hidden="true" />
            Site Readiness
            <Badge variant="outline" className="text-xs">Exhibit C.4</Badge>
          </CardTitle>
          <CardDescription>
            Days before module delivery that each site condition must be ready
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SITE_READINESS.map((condition) => {
              const error = siteReadinessErrors[condition.field];
              return (
                <div key={condition.field} className="space-y-1">
                  <Label htmlFor={condition.field}>{condition.label}</Label>
                  <Input
                    id={condition.field}
                    name={condition.field}
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={1}
                    max={condition.max}
                    autoComplete="off"
                    value={
                      siteReadinessDrafts[condition.field] ?? (projectData[condition.field] ?? '')
                    }
                    onChange={(e) =>
                      handleSiteReadinessChange(condition.field, condition.max, e.target.value)
                    }
                    placeholder={condition.placeholder}
                    aria-invalid={!!error}
                    aria-describedby={
                      error ? `${condition.field}-error` : `${condition.field}-help`
                    }
                    className={`tabular-nums ${error ? 'border-destructive' : ''}`}
                    data-testid={condition.testId}
                  />
                  {error ? (
                    <p
                      id={`${condition.field}-error`}
                      role="alert"
                      className="text-xs text-destructive"
                    >
                      {error} Not saved.
                    </p>
                  ) : (
                    <p id={`${condition.field}-help`} className="text-xs text-muted-foreground">
                      Empty uses the exhibit&rsquo;s default of{' '}
                      {condition.placeholder.replace('…', '')} days.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
