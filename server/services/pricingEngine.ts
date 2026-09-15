import { db } from "../db/index";
import { pool } from "../db";
import { projects, projectDetails, financials, milestones, phases, properties } from "../../shared/schema";
import { asc, eq } from "drizzle-orm";
import { buildPhaseRollups, type PropertyRow, type UnitRow, type PhaseRollup } from "./pricingMath";
import { addDays, derivePhaseDates, type PhaseDurations } from "./scheduleMath";

export type { PhaseRollup, RollupProperty, RollupUnit } from "./pricingMath";

export interface PaymentScheduleItem {
  name: string;
  percentage: number;
  amount: number;
  phase: string;
}

export interface PricingBreakdown {
  totalDesignFee: number;
  totalOffsite: number;
  totalOnsite: number;
  totalCustomizations: number;
  totalShipping: number;
}

export interface PricingSummary {
  breakdown: PricingBreakdown;
  grandTotal: number;
  projectBudget: number;      // Full cost: design + offsite + customizations + shipping + onsite (always)
  contractValue: number;      // What Dvele charges: CRC excludes onsite, CMOS includes all
  serviceModel: 'CRC' | 'CMOS';
  paymentSchedule: PaymentScheduleItem[];
  unitCount: number;
  unitModelSummary: string;   // e.g., "1x Trinity, 2x Salt Point"
  phases: PhaseRollup[];
}

/**
 * The subset of the raw snake_case `pool.query` units row (below) that feeds
 * the camelCase `UnitRow` mapping.
 *
 * `pool.query` returns `any[]`, so this annotation constrains only the mapping
 * expression, not the SQL: renaming a column in the query still compiles and
 * still prices every phase at zero. Verifying the two agree is a runtime job.
 */
interface RawUnitRow {
  unit_id: number;
  property_id: number | null;
  unit_label: string | null;
  model_name: string | null;
  sq_ft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  quantity: number | null;
  offsite_base_price: number | null;
  onsite_est_price: number | null;
  shipping_set_price: number | null;
  customization_total: number | null;
}

function toDateOnly(date: Date | null): string | null {
  return date === null ? null : date.toISOString().slice(0, 10);
}

export async function calculateProjectPricing(projectId: number): Promise<PricingSummary> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  
  if (!project) {
    throw new Error(`Project with id ${projectId} not found`);
  }

  // Determine service model (CRC or CMOS) from project.onSiteSelection
  const serviceModel: 'CRC' | 'CMOS' = (project.onSiteSelection === 'CMOS') ? 'CMOS' : 'CRC';

  // Always fetch financials to get additional site work / buffer
  const [financial] = await db
    .select()
    .from(financials)
    .where(eq(financials.projectId, projectId));
  
  // Additional site work (stored in financials.prelimOnsite)
  const additionalSiteWork = financial?.prelimOnsite || 0;

  // Units are scoped to the project's own organization, not a caller's — this
  // function has no caller identity. The plain `pu.organization_id = $2` would
  // price a pre-multi-tenancy project, whose organization is null, at zero; such
  // a project keeps every one of its units instead.
  const unitsResult = await pool.query(
    `SELECT
      pu.id as unit_id,
      pu.quantity,
      pu.base_price_snapshot,
      pu.customization_total,
      pu.property_id,
      pu.unit_label,
      hm.id as model_id,
      COALESCE(hm.name, uc.name) as model_name,
      COALESCE(hm.sq_ft, uc.sq_ft) as sq_ft,
      hm.bedrooms,
      hm.bathrooms,
      COALESCE(hm.offsite_base_price, uc.derived_offsite_price) as offsite_base_price,
      hm.onsite_est_price,
      hm.shipping_set_price
     FROM project_units pu
     LEFT JOIN home_models hm ON pu.model_id = hm.id
     LEFT JOIN unit_configurations uc ON pu.configuration_id = uc.id
     WHERE pu.project_id = $1
       AND ($2::int IS NULL OR pu.organization_id = $2)
     ORDER BY pu.id`,
    [projectId, project.organizationId]
  );

  const units = unitsResult.rows;
  const unitCount = units.reduce((sum: number, u: any) => sum + (u.quantity || 1), 0);

  // Mapped explicitly to the camelCase UnitRow shape buildPhaseRollups expects —
  // the raw query above returns snake_case, and letting that mismatch pass
  // silently through the `|| 0` guards would price every phase at zero.
  const unitRows: UnitRow[] = units.map((u: RawUnitRow) => ({
    id: u.unit_id,
    propertyId: u.property_id ?? null,
    unitLabel: u.unit_label ?? null,
    sourceName: u.model_name ?? null,
    squareFootage: u.sq_ft ?? null,
    bedrooms: u.bedrooms ?? null,
    bathrooms: u.bathrooms ?? null,
    quantity: u.quantity || 1,
    offsiteBasePrice: u.offsite_base_price || 0,
    onsiteEstPrice: u.onsite_est_price || 0,
    shippingSetPrice: u.shipping_set_price || 0,
    customizationTotal: u.customization_total || 0,
  }));

  let totalDesignFee = 0;
  let totalOffsite = 0;
  let totalOnsite = 0;
  let totalCustomizations = 0;
  let totalShipping = 0;
  let unitModelSummary = '';

  if (units.length > 0) {
    const modelCounts: Record<string, number> = {};

    for (const unit of units) {
      const qty = unit.quantity || 1;
      totalOffsite += (unit.offsite_base_price || 0) * qty;
      totalOnsite += (unit.onsite_est_price || 0) * qty;
      totalCustomizations += (unit.customization_total || 0) * qty;
      totalShipping += (unit.shipping_set_price || 0) * qty;

      const modelName = unit.model_name || 'Unknown Model';
      modelCounts[modelName] = (modelCounts[modelName] || 0) + qty;
    }

    unitModelSummary = Object.entries(modelCounts)
      .map(([name, count]) => `${count}x ${name}`)
      .join(', ');

    // Add additional site work / buffer from financials
    totalOnsite += additionalSiteWork;

    // Design fee is project-level from financials, not summed from per-model design_fee
    totalDesignFee = financial?.designFee || 0;

    console.log(`[PricingEngine] Project ${projectId}: Calculated from ${units.length} line items (${unitCount} total units) - designFee=${totalDesignFee} (from financials), offsite=${totalOffsite}, shipping=${totalShipping}, onsite=${totalOnsite} (includes ${additionalSiteWork} additional site work)`);
  } else {
    // FALLBACK: No units, use financials table (financial already fetched above)
    const [details] = await db
      .select()
      .from(projectDetails)
      .where(eq(projectDetails.projectId, projectId));

    totalDesignFee = financial?.designFee || 0;
    totalOffsite = financial?.prelimOffsite || financial?.finalOffsite || 0;
    totalOnsite = financial?.prelimOnsite || financial?.refinedOnsite || 0;
    totalCustomizations = financial?.homeCustomizations || 0;

    const fallbackUnitCount = details?.totalUnits || 1;
    const homeModel = details?.homeModel || 'Custom Home';
    unitModelSummary = `${fallbackUnitCount}x ${homeModel}`;

    console.log(`[PricingEngine] Project ${projectId}: No units found, using financials fallback - designFee=${totalDesignFee}, offsite=${totalOffsite}, onsite=${totalOnsite}`);
  }

  // projectBudget = full cost of the project (design + offsite + customizations + shipping + onsite)
  const projectBudget = totalDesignFee + totalOffsite + totalCustomizations + totalShipping + totalOnsite;

  // contractValue = what Dvele charges the client
  // CRC: excludes onsite (client handles their own GC)
  // CMOS: includes everything (Dvele manages onsite)
  // Customizations are a property of the unit, not of the on-site scope, so they
  // are billed under both models — every unit-table path already adds
  // customization_total to the Unit Price column the client signs against.
  const contractValue = serviceModel === 'CRC'
    ? totalDesignFee + totalOffsite + totalCustomizations + totalShipping
    : totalDesignFee + totalOffsite + totalCustomizations + totalShipping + totalOnsite;
  
  // grandTotal kept for backwards compatibility
  const grandTotal = projectBudget;
  
  console.log(`[PricingEngine] Project ${projectId} (${serviceModel}): projectBudget=${projectBudget}, contractValue=${contractValue}`);

  // Get milestones for payment schedule
  const projectMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId));

  const paymentSchedule: PaymentScheduleItem[] = [];

  // Payment schedule is calculated based on contractValue (what Dvele actually charges)
  if (projectMilestones.length > 0) {
    for (const milestone of projectMilestones) {
      const percentage = milestone.percentage || 0;
      const phase = milestone.milestoneType || 'Unknown';

      paymentSchedule.push({
        name: milestone.name || `Milestone ${milestone.id}`,
        percentage,
        amount: Math.round((contractValue * percentage) / 100),
        phase,
      });
    }
  } else {
    // Default 6-milestone schedule based on contractValue
    const defaultMilestones = [
      { name: 'Signing Deposit', percentage: 20, phase: 'Design' },
      { name: 'Green Light', percentage: 20, phase: 'Production' },
      { name: 'Production Start', percentage: 20, phase: 'Production' },
      { name: 'Production Midpoint', percentage: 20, phase: 'Production' },
      { name: 'Delivery', percentage: 15, phase: 'Delivery' },
      { name: 'Retainage', percentage: 5, phase: 'Completion' },
    ];

    for (const m of defaultMilestones) {
      paymentSchedule.push({
        name: m.name,
        percentage: m.percentage,
        amount: Math.round((contractValue * m.percentage) / 100),
        phase: m.phase,
      });
    }
  }

  // Reconcile payment schedule to ensure sum equals contractValue exactly
  const rawSum = paymentSchedule.reduce((sum, m) => sum + m.amount, 0);
  const discrepancy = contractValue - rawSum;
  
  // Apply any rounding discrepancy to the last milestone (usually retainage)
  if (discrepancy !== 0 && paymentSchedule.length > 0) {
    paymentSchedule[paymentSchedule.length - 1].amount += discrepancy;
  }
  
  const finalSum = paymentSchedule.reduce((sum, m) => sum + m.amount, 0);
  console.log(`[PricingEngine] Payment schedule sum: ${finalSum} (contractValue: ${contractValue}, adjusted: ${discrepancy !== 0})`);

  // A project with no phases yields phases: [] and every field above keeps
  // its existing project-rollup meaning.
  const phaseRows = await db
    .select()
    .from(phases)
    .where(eq(phases.projectId, projectId))
    .orderBy(phases.phaseNumber);
  const propertyRows: PropertyRow[] = phaseRows.length > 0
    ? await db
        .select()
        .from(properties)
        .where(eq(properties.projectId, projectId))
        .orderBy(asc(properties.id))
    : [];

  const [scheduleDetails] = await db
    .select({ agreementExecutionDate: projectDetails.agreementExecutionDate })
    .from(projectDetails)
    .where(eq(projectDetails.projectId, projectId));

  const projectStart = scheduleDetails?.agreementExecutionDate ?? toDateOnly(project.createdAt);
  const designComplete = addDays(projectStart, project.designDuration);

  // manufacturingDays has no column default (unlike startOffsetDays/deliveryLagDays):
  // every phase created before this plan has it unset, so it falls back to the
  // wizard's project-level production duration rather than deriving a null
  // factoryComplete for every existing project.
  const phaseDurations: PhaseDurations[] = phaseRows.map((phase) => ({
    phaseNumber: phase.phaseNumber,
    startOffsetDays: phase.startOffsetDays,
    manufacturingDays: phase.manufacturingDays ?? project.productionDuration,
    onsiteDays: phase.onsiteDays,
    deliveryLagDays: phase.deliveryLagDays,
    factoryStartOverride: phase.factoryStartOverride,
    factoryCompleteOverride: phase.factoryCompleteOverride,
    deliveryWindowOverride: phase.deliveryWindowOverride,
    targetCoOverride: phase.targetCoOverride,
  }));
  const phaseDates = derivePhaseDates(designComplete, phaseDurations);

  const phaseRollups = buildPhaseRollups(
    phaseRows,
    propertyRows,
    unitRows,
    serviceModel,
    additionalSiteWork,
    phaseDates
  );

  return {
    breakdown: {
      totalDesignFee,
      totalOffsite,
      totalOnsite,
      totalCustomizations,
      totalShipping,
    },
    grandTotal,
    projectBudget,
    contractValue,
    serviceModel,
    paymentSchedule,
    unitCount,
    unitModelSummary,
    phases: phaseRollups,
  };
}
