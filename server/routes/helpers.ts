import { db } from "../db/index";
import { pool } from "../db";
import {
  projects,
  clients,
  projectDetails,
  financials,
  milestones,
  warrantyTerms,
  contractors,
  projectUnits,
  homeModels,
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import type { ProjectWithRelations } from "../lib/mapper";

export async function getProjectWithRelations(projectId: number): Promise<ProjectWithRelations | null> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return null;

  const [client] = await db.select().from(clients).where(eq(clients.projectId, projectId));
  const [projectDetail] = await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId));
  const [financial] = await db.select().from(financials).where(eq(financials.projectId, projectId));
  const [warranty] = await db.select().from(warrantyTerms).where(eq(warrantyTerms.projectId, projectId));
  const projectMilestones = await db.select().from(milestones).where(eq(milestones.projectId, projectId));
  const projectContractors = await db.select().from(contractors).where(eq(contractors.projectId, projectId));

  // Fetch LLC data if project has llc_id
  let childLlc = null;
  if (project.llcId) {
    const llcResult = await pool.query(
      `SELECT id, name, project_name, state_of_formation, entity_type, ein, address, city, 
              state_address, zip, registered_agent, registered_agent_address, formation_date,
              annual_report_due_date, annual_report_status, is_active
       FROM llcs WHERE id = $1`,
      [project.llcId]
    );
    if (llcResult.rows.length > 0) {
      const llc = llcResult.rows[0];
      childLlc = {
        id: llc.id,
        projectId: null,
        legalName: llc.name,
        formationState: llc.state_of_formation || 'Delaware',
        entityType: llc.entity_type || 'LLC',
        ein: llc.ein || '',
        address: llc.address || '',
        city: llc.city || '',
        state: llc.state_address || '',
        zip: llc.zip || '',
        registeredAgent: llc.registered_agent || '',
        registeredAgentAddress: llc.registered_agent_address || '',
        formationDate: llc.formation_date || '',
        annualReportDue: llc.annual_report_due_date || '',
        status: llc.is_active ? 'active' : 'inactive',
        insuranceStatus: null,
        insuranceExpiration: null,
      };
    }
  }

  // Units are scoped to the project's own organization, not a caller's — this
  // function has no caller identity and feeds every contract variable through
  // mapper.ts. A plain `pu.organization_id = $2` would hand a pre-multi-tenancy
  // project, whose organization is null, a contract with no units at all.
  const unitsWithModels = await pool.query(
    `SELECT pu.id, pu.project_id, pu.model_id, pu.configuration_id, pu.unit_label, pu.quantity,
            pu.base_price_snapshot, pu.customization_total,
            COALESCE(hm.id, uc.id) as source_id,
            COALESCE(hm.name, uc.name) as source_name,
            COALESCE(hm.sq_ft, uc.sq_ft) as sq_ft,
            hm.bedrooms, hm.bathrooms,
            uc.price_per_sq_ft_low, uc.price_per_sq_ft_high
     FROM project_units pu
     LEFT JOIN home_models hm ON pu.model_id = hm.id
     LEFT JOIN unit_configurations uc ON pu.configuration_id = uc.id
     WHERE pu.project_id = $1
       AND ($2::int IS NULL OR pu.organization_id = $2)
     ORDER BY pu.id`,
    [projectId, project.organizationId]
  );
  const projectUnitsList = unitsWithModels.rows.map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    homeModelId: row.model_id,
    unitLabel: row.unit_label || '',
    quantity: row.quantity || 1,
    basePriceSnapshot: row.base_price_snapshot || 0,
    customizationTotal: row.customization_total || 0,
    homeModel: row.source_id ? {
      id: row.source_id,
      modelName: row.source_name || 'Unknown',
      squareFootage: row.sq_ft || 0,
      bedrooms: row.bedrooms || 0,
      bathrooms: row.bathrooms || 0,
      pricePerSqFtLow: row.price_per_sq_ft_low ?? null,
      pricePerSqFtHigh: row.price_per_sq_ft_high ?? null,
    } : undefined,
  }));

  return {
    project: project as any,
    client: client || null,
    childLlc,
    projectDetails: projectDetail || null,
    financials: financial as any || null,
    warrantyTerms: warranty || null,
    milestones: projectMilestones,
    contractors: projectContractors,
    units: projectUnitsList,
  };
}
