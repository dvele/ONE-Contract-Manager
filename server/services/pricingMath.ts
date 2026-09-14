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

export interface PhaseRow {
  id: number;
  phaseNumber: number;
  name: string | null;
}

export interface PropertyRow {
  id: number;
  phaseId: number | null;
  propertyCode: string;
}

export interface UnitRow {
  propertyId: number | null;
  quantity: number;
  offsiteBasePrice: number;
  onsiteEstPrice: number;
  shippingSetPrice: number;
  customizationTotal: number;
}

export interface PhaseRollup {
  phaseId: number;
  phaseNumber: number;
  name: string | null;
  properties: { propertyCode: string }[];
  breakdown: {
    offsite: number;
    onsite: number;
    shipping: number;
    customizations: number;
  };
  phaseValue: number;
  milestones: ScheduledMilestone[];
}

/**
 * Rolls units up to their property's phase, applying the same milestone
 * percentages to each phase's own value (`buildMilestoneSchedule` above).
 *
 * `phaseValue` excludes the design fee (billed once, project-level) and
 * excludes on-site cost except under CMOS, mirroring `contractValue` in
 * `pricingEngine.ts`.
 */
export function buildPhaseRollups(
  phaseRows: PhaseRow[],
  propertyRows: PropertyRow[],
  unitRows: UnitRow[],
  serviceModel: "CRC" | "CMOS"
): PhaseRollup[] {
  return phaseRows.map((phase) => {
    const properties = propertyRows.filter((p) => p.phaseId === phase.id);
    const propertyIds = new Set(properties.map((p) => p.id));
    const units = unitRows.filter((u) => u.propertyId !== null && propertyIds.has(u.propertyId));

    const breakdown = units.reduce(
      (acc, u) => {
        const qty = u.quantity || 1;
        acc.offsite += (u.offsiteBasePrice || 0) * qty;
        acc.onsite += (u.onsiteEstPrice || 0) * qty;
        acc.shipping += (u.shippingSetPrice || 0) * qty;
        acc.customizations += (u.customizationTotal || 0) * qty;
        return acc;
      },
      { offsite: 0, onsite: 0, shipping: 0, customizations: 0 }
    );

    const phaseValue =
      breakdown.offsite +
      breakdown.shipping +
      breakdown.customizations +
      (serviceModel === "CMOS" ? breakdown.onsite : 0);

    return {
      phaseId: phase.id,
      phaseNumber: phase.phaseNumber,
      name: phase.name,
      properties: properties.map((p) => ({ propertyCode: p.propertyCode })),
      breakdown,
      phaseValue,
      milestones: buildMilestoneSchedule(phaseValue),
    };
  });
}
