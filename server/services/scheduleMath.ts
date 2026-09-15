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
    const factoryStart =
      phase.factoryStartOverride ?? addDays(previousComplete, phase.startOffsetDays ?? 0);
    const factoryComplete =
      phase.factoryCompleteOverride ?? addDays(factoryStart, phase.manufacturingDays);
    const deliveryWindow =
      phase.deliveryWindowOverride ?? addDays(factoryComplete, phase.deliveryLagDays ?? 0);
    const targetCO = phase.targetCoOverride ?? addDays(deliveryWindow, phase.onsiteDays);

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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
