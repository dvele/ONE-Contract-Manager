/**
 * Pure date arithmetic for the project schedule.
 *
 * Kept free of imports so it can be tested without a database: these functions
 * decide the dates printed in a signed contract. A missing input yields null
 * rather than a substituted default — a fabricated date in an executed
 * agreement is worse than a blank one, and the exhibit bodies already render
 * a blank as "TBD".
 *
 * Dates are `YYYY-MM-DD` strings throughout, matching the database columns.
 */

export interface PhaseDurations {
  phaseNumber: number;
  startOffsetDays: number | null;
  manufacturingDays: number | null;
  onsiteDays: number | null;
  deliveryLagDays: number | null;
  factoryStartOverride: string | null;
  factoryCompleteOverride: string | null;
  deliveryWindowOverride: string | null;
  targetCoOverride: string | null;
}

export interface PhaseDates {
  phaseNumber: number;
  factoryStart: string | null;
  factoryComplete: string | null;
  deliveryWindow: string | null;
  targetCO: string | null;
}

export interface ReviewPeriods {
  kickoffReviewDays: number | null;
  schematicReviewDays: number | null;
  permitSetReviewDays: number | null;
  greenLightReviewDays: number | null;
}

export interface DesignMilestones {
  kickoff: string | null;
  schematic: string | null;
  permitSet: string | null;
  greenLightPackage: string | null;
}

/** Matches the `YYYY-MM-DD` shape this module and the phase-override columns
 * use throughout. Shape only — it does not confirm the date exists on the
 * calendar (e.g. it accepts `2027-02-30`); callers that need that stronger
 * guarantee validate separately. */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Confirms a `YYYY-MM-DD` string names a date that actually exists on the
 * calendar. `ISO_DATE` checks shape only, and V8's `Date` parsing is
 * inconsistent about the rest: `new Date("2026-02-30T00:00:00Z")` silently
 * rolls over to March 2 instead of failing, while an out-of-range month does
 * fail. Round-tripping through `Date.UTC` (which also rolls over) and
 * confirming the components come back unchanged catches the day-level case
 * the parser itself won't.
 */
export function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Adds calendar days. Null in, null out — a missing duration is not zero. */
export function addDays(date: string | null, days: number | null): string | null {
  if (date === null || days === null) return null;
  const parsed = parseDate(date);
  if (parsed === null) return null;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatDate(parsed);
}

/**
 * Adds business days, skipping Saturdays and Sundays.
 *
 * Public holidays are not modelled — the exhibit's review periods are stated in
 * business days and no holiday calendar exists in this system.
 *
 * `days` must be zero or positive: the loop counts forward only, so a negative
 * count returns the input date unchanged rather than stepping backwards. Every
 * caller passes one of D.1's review periods, which are positive constants.
 */
export function addBusinessDays(date: string | null, days: number | null): string | null {
  if (date === null || days === null) return null;
  const parsed = parseDate(date);
  if (parsed === null) return null;

  let remaining = days;
  while (remaining > 0) {
    parsed.setUTCDate(parsed.getUTCDate() + 1);
    const day = parsed.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return formatDate(parsed);
}

/**
 * The single guard for every user- or legacy-supplied date this system reads:
 * returns the value when it is a usable `YYYY-MM-DD` calendar date, and null
 * otherwise.
 *
 * Both checks are load-bearing and neither implies the other. `ISO_DATE` is
 * shape-only and accepts `2027-02-30`, which `new Date` then silently rolls
 * over to March 2. `isRealCalendarDate` accepts unpadded `2026-3-5`, which
 * fails the ISO shape and which `new Date` parses in the *host's* zone rather
 * than UTC — shifting the day on any machine west of UTC. Only the pair
 * rejects both.
 *
 * Such a value is user/legacy-supplied text, not something this module
 * derived: a row written before validation existed at the API boundary can
 * already hold a calendar-impossible string. That is bad data, not a missing
 * input — the chain can still legitimately compute a date, so an invalid
 * value is treated as absent (callers fall through to a derived value) rather
 * than propagating null. Printing the bad string verbatim, or anchoring
 * downstream dates to it, would be worse than preferring the computed answer.
 *
 * Every caller that reads a date column routes through this one function —
 * `derivePhaseDates` and `parseDate` here, `mapper.ts`'s override resolution,
 * and both `projectStart` resolutions. Copies of this pair drifted apart once
 * already.
 */
export function asCalendarDate(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  return ISO_DATE.test(value) && isRealCalendarDate(value) ? value : null;
}

/**
 * Derives each phase's four dates, chaining phase n from phase n-1's factory
 * completion.
 *
 * @param designComplete - when production may begin; null yields null throughout
 * @param phases - ordered by `phaseNumber` ascending; order is load-bearing
 */
export function derivePhaseDates(
  designComplete: string | null,
  phases: PhaseDurations[]
): PhaseDates[] {
  const result: PhaseDates[] = [];
  let previousComplete: string | null = designComplete;

  for (const phase of phases) {
    // startOffsetDays and deliveryLagDays default to 0 in shared/schema.ts (project_phases
    // table) — a null there means "none specified," and 0 is the schema's own reading of
    // that. manufacturingDays and onsiteDays have no such column default: a null there is
    // a genuinely unknown duration, so it gets no substituted value below.
    const factoryStart =
      asCalendarDate(phase.factoryStartOverride) ??
      addDays(previousComplete, phase.startOffsetDays ?? 0);
    const factoryComplete =
      asCalendarDate(phase.factoryCompleteOverride) ??
      addDays(factoryStart, phase.manufacturingDays);
    const deliveryWindow =
      asCalendarDate(phase.deliveryWindowOverride) ??
      addDays(factoryComplete, phase.deliveryLagDays ?? 0);
    const targetCO =
      asCalendarDate(phase.targetCoOverride) ?? addDays(deliveryWindow, phase.onsiteDays);

    result.push({
      phaseNumber: phase.phaseNumber,
      factoryStart,
      factoryComplete,
      deliveryWindow,
      targetCO,
    });
    previousComplete = factoryComplete;
  }

  return result;
}

/** Chains the four Exhibit D.1 milestones through their review periods. */
export function deriveDesignMilestones(
  projectStart: string | null,
  periods: ReviewPeriods
): DesignMilestones {
  const kickoff = projectStart;
  const schematic = addBusinessDays(kickoff, periods.kickoffReviewDays);
  const permitSet = addBusinessDays(schematic, periods.schematicReviewDays);
  const greenLightPackage = addBusinessDays(permitSet, periods.permitSetReviewDays);
  return { kickoff, schematic, permitSet, greenLightPackage };
}

function parseDate(value: string): Date | null {
  if (asCalendarDate(value) === null) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Renders a UTC `Date` as `YYYY-MM-DD`, or null when it cannot be.
 *
 * Both failures are reachable from an unbounded `int4` duration column.
 * `setUTCDate` past ±8,640,000,000,000,000 ms yields an invalid `Date` whose
 * `toISOString()` throws `RangeError`, which would surface as a 500 on every
 * route that prices a project. Past year 9999 it instead returns the expanded
 * form `+010002-12-31T…`, which `slice(0, 10)` truncates to `"+010002-12"` — a
 * malformed date that would flow into the rollup and print in an exhibit.
 * Checking the rendered value against `ISO_DATE` catches the second; a null
 * here means "no derivable date", which the chain already renders as TBD.
 */
function formatDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  const rendered = date.toISOString().slice(0, 10);
  return ISO_DATE.test(rendered) ? rendered : null;
}

/**
 * Earliest and latest of a `YYYY-MM-DD` list, ignoring nulls. Lexicographic
 * comparison is chronological for zero-padded ISO dates. An empty list (a
 * project with no phases) yields null, which renders as TBD.
 *
 * Here rather than in `server/lib/mapper.ts`, which reads the database and so
 * cannot be imported by a hermetic test — these two decide what Exhibit D.2
 * prints for the whole project.
 */
export function earliestDate(dates: (string | null)[]): string | null {
  const present = dates.filter((d): d is string => d !== null);
  return present.length === 0 ? null : present.reduce((a, b) => (b < a ? b : a));
}

export function latestDate(dates: (string | null)[]): string | null {
  const present = dates.filter((d): d is string => d !== null);
  return present.length === 0 ? null : present.reduce((a, b) => (b > a ? b : a));
}

/**
 * Renders a `Date` as `YYYY-MM-DD` using the process's local calendar
 * components, not UTC. `timestamp` (without time zone) columns come back from
 * node-postgres parsed in the local zone, so rendering through
 * `toISOString()` — which is always UTC — can shift the date by one on a
 * non-UTC host: a project created at 11pm Pacific is already the next day in
 * UTC. ECS runs with `TZ=UTC` so this is invisible there; it is not invisible
 * on a developer's machine, and this date anchors a contract schedule.
 */
export function toDateOnly(date: Date | null): string | null {
  if (date === null) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
