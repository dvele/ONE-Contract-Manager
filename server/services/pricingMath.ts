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
  address: string | null;
}

export interface UnitRow {
  id: number;
  propertyId: number | null;
  unitLabel: string | null;
  /** The catalog model's name, or the configuration's, whichever priced the unit. */
  sourceName: string | null;
  squareFootage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  quantity: number;
  offsiteBasePrice: number;
  onsiteEstPrice: number;
  shippingSetPrice: number;
  customizationTotal: number;
}

/** One unit as it appears under its property in a rollup: Exhibit B.1's row. */
export interface RollupUnit {
  id: number;
  unitLabel: string | null;
  sourceName: string | null;
  squareFootage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  quantity: number;
}

/** One property as it appears under its phase: Exhibit A.2's row. */
export interface RollupProperty {
  id: number;
  propertyCode: string;
  address: string | null;
  units: RollupUnit[];
}

export interface PhaseRollup {
  phaseId: number;
  phaseNumber: number;
  name: string | null;
  properties: RollupProperty[];
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
 * `phaseValue` matches what `contractValue` bills, minus the project-level
 * design fee: it excludes customizations, which the project side leaves out of
 * `contractValue` too, and excludes on-site cost except under CMOS. Additional
 * site work is pro-rated across phases below, so it carries through as well.
 *
 * `Σ phaseValue = contractValue − designFee` therefore holds under both
 * completion models — except for units whose property carries no phase (or
 * none at all), which are excluded from every phase while still counting at
 * the project level. That is the only remaining source of divergence, and it
 * is what Plan D's reconciliation check has to refuse generation over.
 *
 * Customizations stay in `breakdown` so the figure remains visible; whether
 * they should bill at all is an unanswered commercial question, and answering
 * it here would make the per-phase milestone rows sum to more than the project
 * total on the same document.
 */
export function buildPhaseRollups(
  phaseRows: PhaseRow[],
  propertyRows: PropertyRow[],
  unitRows: UnitRow[],
  serviceModel: "CRC" | "CMOS",
  additionalSiteWork = 0
): PhaseRollup[] {
  const grouped = phaseRows.map((phase) => {
    const phaseProperties = propertyRows.filter((p) => p.phaseId === phase.id);
    const propertyIds = new Set(phaseProperties.map((p) => p.id));
    const units = unitRows.filter((u) => u.propertyId !== null && propertyIds.has(u.propertyId));

    const properties: RollupProperty[] = phaseProperties.map((p) => ({
      id: p.id,
      propertyCode: p.propertyCode,
      address: p.address,
      units: units
        .filter((u) => u.propertyId === p.id)
        .map((u) => ({
          id: u.id,
          unitLabel: u.unitLabel,
          sourceName: u.sourceName,
          squareFootage: u.squareFootage,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          quantity: u.quantity,
        })),
    }));

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

    return { phase, properties, breakdown };
  });

  // additionalSiteWork (project-level, e.g. financials.prelimOnsite) is not
  // itself attached to any property, so it has no natural home in a phase.
  // Distribute it in proportion to each phase's share of total on-site cost,
  // and give the last phase any rounding residual — the same discipline
  // buildMilestoneSchedule uses for its own residual — so the per-phase
  // shares always sum to exactly additionalSiteWork.
  const totalOnsite = grouped.reduce((sum, g) => sum + g.breakdown.onsite, 0);
  const siteWorkShares = grouped.map((g) =>
    totalOnsite > 0 ? Math.round((additionalSiteWork * g.breakdown.onsite) / totalOnsite) : 0
  );
  if (siteWorkShares.length > 0) {
    const allocated = siteWorkShares.reduce((sum, s) => sum + s, 0);
    siteWorkShares[siteWorkShares.length - 1] += additionalSiteWork - allocated;
  }

  return grouped.map(({ phase, properties, breakdown }, i) => {
    const onsite = breakdown.onsite + siteWorkShares[i];
    const phaseValue =
      breakdown.offsite +
      breakdown.shipping +
      (serviceModel === "CMOS" ? onsite : 0);

    return {
      phaseId: phase.id,
      phaseNumber: phase.phaseNumber,
      name: phase.name,
      properties,
      breakdown: { ...breakdown, onsite },
      phaseValue,
      milestones: buildMilestoneSchedule(phaseValue),
    };
  });
}
