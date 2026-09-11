/**
 * Pure milestone math for per-phase payment schedules.
 *
 * Kept free of database access so it can be tested directly: these functions
 * decide the figures that appear on a signed contract.
 */

export interface ScheduledMilestone {
  name: string;
  trigger: string;
  percentage: number;
  amount: number;
}

/**
 * The issued payment schedule, taken from the September 2026 Zaca Preserve
 * agreement. Identical under both completion models — Zaca is a CRC project and
 * carries retainage, so there is no CRC-specific variant.
 */
const MILESTONE_TEMPLATE: ReadonlyArray<Omit<ScheduledMilestone, "amount">> = [
  { name: "Signing Deposit", trigger: "Contract Execution", percentage: 20 },
  { name: "Green Light", trigger: "Green Light Notice", percentage: 20 },
  { name: "Production Start", trigger: "First module fabrication", percentage: 20 },
  { name: "Production Midpoint", trigger: "Midpoint certification", percentage: 20 },
  { name: "Delivery", trigger: "Delivery and set complete", percentage: 15 },
  { name: "Retainage", trigger: "CO/Equivalent", percentage: 5 },
];

/** Delivery absorbs the rounding residual, so retainage stays an exact 5%. */
const RESIDUAL_MILESTONE_INDEX = 4;

/**
 * Applies the standard schedule to one phase's value.
 *
 * `phaseValue` excludes the design fee, which is billed once on its own
 * Execution row — including it here would collect it twice.
 *
 * @returns an empty array when `phaseValue` is zero — a phase worth nothing
 * has nothing to bill
 */
export function buildMilestoneSchedule(phaseValue: number): ScheduledMilestone[] {
  if (phaseValue <= 0) return [];

  const milestones: ScheduledMilestone[] = MILESTONE_TEMPLATE.map((m) => ({
    ...m,
    amount: Math.round((phaseValue * m.percentage) / 100),
  }));

  const residual = phaseValue - milestones.reduce((sum, m) => sum + m.amount, 0);
  milestones[RESIDUAL_MILESTONE_INDEX].amount += residual;

  return milestones;
}
