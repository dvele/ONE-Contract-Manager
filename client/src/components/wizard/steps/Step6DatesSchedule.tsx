import { useEffect, useMemo, useState } from 'react';
import { useWizard } from '../WizardContext';
import { PhaseScheduleEditor } from '../PhaseScheduleEditor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Info, AlertTriangle, Target } from 'lucide-react';

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

const D1_OVERRIDES = [
  { field: 'designKickoffDate', label: 'Design Kickoff', testId: 'input-design-kickoff-date' },
  { field: 'schematicDesignDate', label: 'Schematic Design Complete', testId: 'input-schematic-design-date' },
  { field: 'designDevelopmentDate', label: 'Design Development Complete', testId: 'input-design-development-date' },
  { field: 'permitSubmittalDate', label: 'Permit Submittal', testId: 'input-permit-submittal-date' },
] as const;

// The help text differs per field because the fallbacks do. mapper.ts:1483
// resolves PRODUCTION_COMPLETE_DATE to the phase rollup when the column is
// empty; mapper.ts:1478 has no such fallback for PRODUCTION_MIDPOINT_DATE, and
// no rolled midpoint exists to fall back to, so an empty column prints TBD.
const D2_OVERRIDES = [
  {
    field: 'productionMidpointDate',
    label: 'Production Midpoint',
    testId: 'input-production-midpoint-date',
    help: 'Nothing calculates this one. Empty prints TBD in Exhibit D.2.',
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

  // An editing buffer, not a second source of truth. The autosave is ungated —
  // performAutosave's only precondition is a project name — so anything written
  // into wizard state reaches projects.productionDuration about two seconds
  // later, and a 0 there gives every phase without its own manufacturingDays a
  // zero-day span. Keeping the keystrokes local means only a value inside the
  // bounds is ever committed; an out-of-range one stays in the box, under an
  // error, and the stored fallback keeps its last good value.
  const [productionDraft, setProductionDraft] = useState<string | null>(null);
  const [productionDraftError, setProductionDraftError] = useState<string | null>(null);

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
      const defaultDays = projectData.serviceModel === 'CRC' ? 90 : 60;
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
                min={30}
                max={180}
                autoComplete="off"
                value={projectData.designPhaseDays || ''}
                onChange={(e) => updateProjectData({ designPhaseDays: parseInt(e.target.value) || 0 })}
                placeholder="60…"
                aria-invalid={!!validationErrors.designPhaseDays}
                aria-describedby={
                  validationErrors.designPhaseDays ? 'designPhaseDays-error' : 'designPhaseDays-help'
                }
                className={`tabular-nums ${validationErrors.designPhaseDays ? 'border-destructive' : ''}`}
                data-testid="input-design-days"
              />
              {validationErrors.designPhaseDays ? (
                <p id="designPhaseDays-error" className="text-xs text-destructive">
                  {validationErrors.designPhaseDays}
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
            up from the phases above unless you assert it here; Production Midpoint has no
            calculation behind it, so leaving it empty prints TBD.
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
            {SITE_READINESS.map((condition) => (
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
                  value={projectData[condition.field] || ''}
                  onChange={(e) =>
                    updateProjectData({ [condition.field]: parseInt(e.target.value) || 0 })
                  }
                  placeholder={condition.placeholder}
                  aria-describedby={`${condition.field}-help`}
                  className="tabular-nums"
                  data-testid={condition.testId}
                />
                <p id={`${condition.field}-help`} className="text-xs text-muted-foreground">
                  Default: {condition.placeholder.replace('…', '')} days
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
