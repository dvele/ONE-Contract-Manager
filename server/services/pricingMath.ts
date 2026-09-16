import type { PhaseDates } from "./scheduleMath";

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

/**
 * Retainage absorbs no residual: it is the figure a client withholds and
 * verifies against the stated percentage, so it must stay exact. The residual
 * lands on the last row before it — Delivery, in the template above.
 */
function residualIndexFor(rows: ReadonlyArray<{ name: string }>): number {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (!/retainage/i.test(rows[i].name)) return i;
  }
  return rows.length - 1;
}

/**
 * Prices a set of milestone percentages against one phase's value.
 *
 * Percentages are reported to two decimals and amounts derived from that
 * rounded figure, so the percentage a client reads and the amount beside it
 * always agree. The amounts sum to `phaseValue` exactly regardless of what the
 * percentages total — a stored set that does not reach 100 is the route's to
 * reject, and leaving a phase's milestones short of its own value would put an
 * uncollectable remainder into a signed agreement.
 */
function priceSchedule(
  phaseValue: number,
  rows: ReadonlyArray<Omit<ScheduledMilestone, "amount">>
): ScheduledMilestone[] {
  if (phaseValue <= 0 || rows.length === 0) return [];

  const milestones: ScheduledMilestone[] = rows.map((m) => {
    const percentage = Math.round(m.percentage * 100) / 100;
    return { ...m, percentage, amount: Math.round((phaseValue * percentage) / 100) };
  });

  const residual = phaseValue - milestones.reduce((sum, m) => sum + m.amount, 0);
  milestones[residualIndexFor(milestones)].amount += residual;

  return milestones;
}

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
  return priceSchedule(phaseValue, MILESTONE_TEMPLATE);
}

export interface ReconciliationInput {
  /** Each phase's `phaseValue`, in cents. */
  phaseValues: number[];
  contractValue: number;
  designFee: number;
  /** Value of units whose property carries no phase, or which have no property. */
  unphasedUnitValue: number;
}

export interface ReconciliationResult {
  reconciles: boolean;
  /** `contractValue − designFee − Σ phaseValues`; negative when phases exceed the contract. */
  shortfall: number;
  /** The part of the shortfall the unphased units do not account for. */
  unexplained: number;
  explainedByUnphased: boolean;
}

/**
 * Decides whether a project's phase values agree with its contract total, which
 * is what allows a contract to be generated at all.
 *
 * The identity is conditional: `Σ phaseValue = contractValue − designFee` holds
 * only when every unit sits on a property that belongs to a phase. Units on
 * unphased properties, or attached to no property, count into the project
 * totals and into no phase — correct behaviour rather than drift. So a
 * shortfall is reported alongside what explains it, and only the unexplained
 * remainder means the two disagree.
 *
 * A project with no phases is the documented legacy shape: there are no phase
 * tables to contradict the total, so it always reconciles.
 *
 * Every figure is an integer number of cents and both `buildMilestoneSchedule`
 * and the site-work pro-ration reconcile to the cent by construction, so there
 * is deliberately **no rounding tolerance** — a slack of even one cent would
 * hide exactly the drift this exists to catch.
 */
/**
 * The value of units that count into the project totals but into no phase:
 * those on a property carrying no phase, on no property at all, or on a
 * property row that is missing. Mirrors how `buildPhaseRollups` composes
 * `phaseValue`, on-site included only under CMOS, so the two are comparable.
 *
 * Project-level adjustments are excluded deliberately — every one of them is
 * distributed across phases in full, so none of it is ever unphased.
 */
export function sumUnphasedUnitValue(
  propertyRows: PropertyRow[],
  unitRows: UnitRow[],
  serviceModel: "CRC" | "CMOS"
): number {
  const phasedPropertyIds = new Set(
    propertyRows.filter((p) => p.phaseId !== null).map((p) => p.id)
  );

  return unitRows
    .filter((u) => u.propertyId === null || !phasedPropertyIds.has(u.propertyId))
    .reduce((sum, u) => {
      const qty = u.quantity || 1;
      const perUnit =
        (u.offsiteBasePrice || 0) +
        (u.customizationTotal || 0) +
        (u.shippingSetPrice || 0) +
        (serviceModel === "CMOS" ? u.onsiteEstPrice || 0 : 0);
      return sum + perUnit * qty;
    }, 0);
}

export function reconcilePhases(input: ReconciliationInput): ReconciliationResult {
  const { phaseValues, contractValue, designFee, unphasedUnitValue } = input;

  const phaseTotal = phaseValues.reduce((sum, v) => sum + v, 0);
  const shortfall = contractValue - designFee - phaseTotal;
  const unexplained = shortfall - unphasedUnitValue;

  return {
    reconciles: phaseValues.length === 0 || unexplained === 0,
    shortfall,
    unexplained,
    explainedByUnphased: shortfall !== 0 && unexplained === 0,
  };
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
  dates: PhaseDates;
}

/** One stored `milestones` row, already scoped to a phase. */
export interface StoredMilestone {
  name: string;
  trigger: string;
  percentage: number;
}

export interface PhaseRollupOptions {
  /** Stored milestone rows keyed by `phaseId`; a phase absent here gets the template. */
  storedMilestones?: Map<number, StoredMilestone[]>;
  /** Project-level adjustment on top of the model-derived offsite price, in cents. */
  additionalOffsite?: number;
  /** Project-level adjustment on top of the model-derived shipping price, in cents. */
  additionalDelivery?: number;
}

/**
 * Splits a project-level figure across phases in proportion to `weights`,
 * giving the last phase any rounding residual so the shares sum to `total`
 * exactly.
 *
 * When every weight is zero the whole figure lands on the last phase: there is
 * no proportion to divide by, and dropping it would silently bill less than the
 * project total. Accepted deliberately (see
 * `docs/phase-property-model-open-items.md` §1).
 */
function proRate(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];

  const weightTotal = weights.reduce((sum, w) => sum + w, 0);
  const shares = weights.map((w) =>
    weightTotal > 0 ? Math.round((total * w) / weightTotal) : 0
  );
  shares[shares.length - 1] += total - shares.reduce((sum, s) => sum + s, 0);

  return shares;
}

function emptyPhaseDates(phaseNumber: number): PhaseDates {
  return {
    phaseNumber,
    factoryStart: null,
    factoryComplete: null,
    deliveryWindow: null,
    targetCO: null,
  };
}

/**
 * Rolls units up to their property's phase, applying the same milestone
 * percentages to each phase's own value (`buildMilestoneSchedule` above).
 *
 * `phaseValue` matches what `contractValue` bills, minus the project-level
 * design fee: it carries customizations, which the project side bills too, and
 * excludes on-site cost except under CMOS. Additional site work is pro-rated
 * across phases below, so it carries through as well.
 *
 * `Σ phaseValue = contractValue − designFee` therefore holds under both
 * completion models — except for units whose property carries no phase (or
 * none at all), which are excluded from every phase while still counting at
 * the project level. That is the only remaining source of divergence, and it
 * is what Plan D's reconciliation check has to refuse generation over.
 *
 * `phaseDates` is matched to each phase by `phaseNumber`, not array position —
 * the caller derives it separately (deriving needs the project start, a
 * database read, which this function must not perform) and its ordering is
 * not guaranteed to track `phaseRows`. A phase with no matching entry gets
 * all-null dates rather than throwing.
 *
 * Customizations also stay broken out in `breakdown` so the figure remains
 * visible on its own.
 */
export function buildPhaseRollups(
  phaseRows: PhaseRow[],
  propertyRows: PropertyRow[],
  unitRows: UnitRow[],
  serviceModel: "CRC" | "CMOS",
  additionalSiteWork: number,
  phaseDates: PhaseDates[],
  options: PhaseRollupOptions = {}
): PhaseRollup[] {
  const { storedMilestones, additionalOffsite = 0, additionalDelivery = 0 } = options;

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

  // The three project-level adjustments are not attached to any property, so
  // none has a natural home in a phase. Each is distributed in proportion to
  // the phase cost it adjusts — site work by on-site, the offsite adjustment by
  // offsite, the delivery adjustment by shipping — so that every one of them
  // reaches the phase tables and the per-phase shares sum to the whole exactly.
  const siteWorkShares = proRate(additionalSiteWork, grouped.map((g) => g.breakdown.onsite));
  const offsiteShares = proRate(additionalOffsite, grouped.map((g) => g.breakdown.offsite));
  const deliveryShares = proRate(additionalDelivery, grouped.map((g) => g.breakdown.shipping));

  return grouped.map(({ phase, properties, breakdown }, i) => {
    const onsite = breakdown.onsite + siteWorkShares[i];
    const offsite = breakdown.offsite + offsiteShares[i];
    const shipping = breakdown.shipping + deliveryShares[i];
    const phaseValue =
      offsite +
      breakdown.customizations +
      shipping +
      (serviceModel === "CMOS" ? onsite : 0);

    const dates =
      phaseDates.find((d) => d.phaseNumber === phase.phaseNumber) ??
      emptyPhaseDates(phase.phaseNumber);

    const stored = storedMilestones?.get(phase.id);

    return {
      phaseId: phase.id,
      phaseNumber: phase.phaseNumber,
      name: phase.name,
      properties,
      breakdown: { ...breakdown, offsite, onsite, shipping },
      phaseValue,
      milestones:
        stored && stored.length > 0
          ? priceSchedule(phaseValue, stored)
          : buildMilestoneSchedule(phaseValue),
      dates,
    };
  });
}
