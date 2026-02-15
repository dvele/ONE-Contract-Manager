import { db } from "../db/index";
import { pool } from "../db";
import { projects, projectDetails, financials, milestones } from "../../shared/schema";
import { eq } from "drizzle-orm";

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
  projectBudget: number;      // Full cost: design + offsite + onsite (always)
  contractValue: number;      // What Dvele charges: CRC excludes onsite, CMOS includes all
  serviceModel: 'CRC' | 'CMOS';
  paymentSchedule: PaymentScheduleItem[];
  unitCount: number;
  unitModelSummary: string;   // e.g., "1x Trinity, 2x Salt Point"
}

export async function calculateProjectPricing(projectId: number): Promise<PricingSummary> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  
  if (!project) {
    throw new Error(`Project with id ${projectId} not found`);
  }

  // Determine service model (CRC or CMOS) - use serviceModel field (canonical), fall back to onSiteSelection
  const serviceModel: 'CRC' | 'CMOS' = (project.serviceModel === 'CMOS' || project.onSiteSelection === 'CMOS') ? 'CMOS' : 'CRC';

  // Always fetch financials to get additional site work / buffer
  const [financial] = await db
    .select()
    .from(financials)
    .where(eq(financials.projectId, projectId));
  
  // Additional site work (stored in financials.prelimOnsite)
  const additionalSiteWork = financial?.prelimOnsite || 0;

  // STEP 1: Query project_units + home_models to calculate pricing from units
  const unitsResult = await pool.query(
    `SELECT 
      pu.id as unit_id,
      pu.base_price_snapshot,
      pu.customization_total,
      hm.id as model_id,
      hm.name as model_name,
      hm.design_fee,
      hm.offsite_base_price,
      hm.onsite_est_price,
      hm.shipping_set_price
     FROM project_units pu
     LEFT JOIN home_models hm ON pu.model_id = hm.id
     WHERE pu.project_id = $1`,
    [projectId]
  );

  const units = unitsResult.rows;
  const unitCount = units.length;

  let totalDesignFee = 0;
  let totalOffsite = 0;
  let totalOnsite = 0;
  let totalCustomizations = 0;
  let totalShipping = 0;
  let unitModelSummary = '';

  if (unitCount > 0) {
    // Calculate pricing by summing across all units
    const modelCounts: Record<string, number> = {};

    for (const unit of units) {
      totalOffsite += unit.offsite_base_price || 0;
      totalOnsite += unit.onsite_est_price || 0;
      totalCustomizations += unit.customization_total || 0;
      totalShipping += unit.shipping_set_price || 0;

      // Count models for summary
      const modelName = unit.model_name || 'Unknown Model';
      modelCounts[modelName] = (modelCounts[modelName] || 0) + 1;
    }

    // Build unit model summary like "2x Carmel, 1x Trinity"
    unitModelSummary = Object.entries(modelCounts)
      .map(([name, count]) => `${count}x ${name}`)
      .join(', ');

    // Add additional site work / buffer from financials
    totalOnsite += additionalSiteWork;

    // Design fee is project-level from financials, not summed from per-model design_fee
    totalDesignFee = financial?.designFee || 0;

    console.log(`[PricingEngine] Project ${projectId}: Calculated from ${unitCount} units - designFee=${totalDesignFee} (from financials), offsite=${totalOffsite}, shipping=${totalShipping}, onsite=${totalOnsite} (includes ${additionalSiteWork} additional site work)`);
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

  // projectBudget = full cost of the project (design + offsite + shipping + onsite)
  const projectBudget = totalDesignFee + totalOffsite + totalShipping + totalOnsite;
  
  // contractValue = what Dvele charges the client
  // CRC: excludes onsite (client handles their own GC)
  // CMOS: includes everything (Dvele manages onsite)
  const contractValue = serviceModel === 'CRC' 
    ? totalDesignFee + totalOffsite + totalShipping
    : totalDesignFee + totalOffsite + totalShipping + totalOnsite;
  
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
  };
}
