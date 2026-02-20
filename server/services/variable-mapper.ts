import { Pool } from "pg";
import { mapProjectToVariables, ProjectWithRelations, ContractVariables, ChildLlc, ProjectUnit } from "../lib/mapper";
import { calculateProjectPricing, PricingSummary } from "./pricingEngine";
import { ContractFilterType } from "../lib/tableGenerators";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface GetContractVariablesOptions {
  contractType?: ContractFilterType;
  includePricing?: boolean;
}

export async function getProjectWithRelations(
  projectId: number,
  organizationId: number
): Promise<ProjectWithRelations | null> {
  const projectResult = await pool.query(
    `SELECT * FROM projects WHERE id = $1 AND organization_id = $2`,
    [projectId, organizationId]
  );

  if (projectResult.rows.length === 0) {
    return null;
  }

  const project = projectResult.rows[0];

  const [clientResult, llcResult, detailsResult, financialsResult, milestonesResult, warrantyResult, contractorsResult, unitsResult] = await Promise.all([
    pool.query(
      `SELECT c.* FROM clients c 
       JOIN projects p ON c.project_id = p.id 
       WHERE c.project_id = $1 AND p.organization_id = $2`,
      [projectId, organizationId]
    ),
    pool.query(
      `SELECT 
        id,
        name as "legalName",
        state_of_formation as "formationState",
        entity_type as "entityType",
        ein,
        formation_date as "formationDate",
        registered_agent as "registeredAgent",
        registered_agent_address as "registeredAgentAddress",
        address,
        city,
        state_address as state,
        zip,
        status
       FROM llcs 
       WHERE organization_id = $1 AND project_name = $2
       LIMIT 1`,
      [organizationId, project.name]
    ),
    pool.query(
      `SELECT pd.* FROM project_details pd
       JOIN projects p ON pd.project_id = p.id
       WHERE pd.project_id = $1 AND p.organization_id = $2`,
      [projectId, organizationId]
    ),
    pool.query(
      `SELECT f.* FROM financials f
       JOIN projects p ON f.project_id = p.id
       WHERE f.project_id = $1 AND p.organization_id = $2`,
      [projectId, organizationId]
    ),
    pool.query(
      `SELECT m.* FROM milestones m
       JOIN projects p ON m.project_id = p.id
       WHERE m.project_id = $1 AND p.organization_id = $2
       ORDER BY m.due_date`,
      [projectId, organizationId]
    ),
    pool.query(
      `SELECT wt.* FROM warranty_terms wt
       JOIN projects p ON wt.project_id = p.id
       WHERE wt.project_id = $1 AND p.organization_id = $2
       LIMIT 1`,
      [projectId, organizationId]
    ),
    pool.query(
      `SELECT c.* FROM contractors c
       JOIN projects p ON c.project_id = p.id
       WHERE c.project_id = $1 AND p.organization_id = $2`,
      [projectId, organizationId]
    ),
    pool.query(
      `SELECT 
        pu.id,
        pu.project_id as "projectId",
        pu.model_id as "homeModelId",
        pu.unit_label as "unitLabel",
        pu.quantity,
        pu.base_price_snapshot as "basePriceSnapshot",
        pu.onsite_estimate_snapshot as "onsiteEstimateSnapshot",
        json_build_object(
          'id', hm.id,
          'modelName', hm.model_name,
          'squareFootage', hm.square_footage,
          'bedrooms', hm.bedrooms,
          'bathrooms', hm.bathrooms
        ) as "homeModel"
       FROM project_units pu
       LEFT JOIN home_models hm ON pu.model_id = hm.id
       WHERE pu.project_id = $1 AND pu.organization_id = $2`,
      [projectId, organizationId]
    )
  ]);

  const client = clientResult.rows[0] || null;
  const childLlc: ChildLlc | null = llcResult.rows[0] ? {
    id: llcResult.rows[0].id,
    projectId: projectId,
    legalName: llcResult.rows[0].legalName,
    formationState: llcResult.rows[0].formationState,
    entityType: llcResult.rows[0].entityType,
    ein: llcResult.rows[0].ein,
    formationDate: llcResult.rows[0].formationDate,
    registeredAgent: llcResult.rows[0].registeredAgent,
    registeredAgentAddress: llcResult.rows[0].registeredAgentAddress,
    address: llcResult.rows[0].address,
    city: llcResult.rows[0].city,
    state: llcResult.rows[0].state,
    zip: llcResult.rows[0].zip,
    status: llcResult.rows[0].status
  } : null;

  const projectDetails = detailsResult.rows[0] || null;
  const financials = financialsResult.rows[0] || null;
  const milestones = milestonesResult.rows || [];
  const warrantyTerms = warrantyResult.rows[0] || null;
  const contractors = contractorsResult.rows || [];
  const units: ProjectUnit[] = unitsResult.rows.map(row => ({
    id: row.id,
    projectId: row.projectId,
    homeModelId: row.homeModelId,
    unitLabel: row.unitLabel,
    quantity: row.quantity || 1,
    basePriceSnapshot: row.basePriceSnapshot,
    onsiteEstimateSnapshot: row.onsiteEstimateSnapshot,
    homeModel: row.homeModel
  }));

  return {
    project: {
      id: project.id,
      organizationId: project.organization_id,
      name: project.name,
      projectNumber: project.project_number,
      status: project.status,
      state: project.state,
      onSiteSelection: project.on_site_selection,
      odooProjectId: project.odoo_project_id,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      designDuration: project.design_duration,
      permittingDuration: project.permitting_duration,
      productionDuration: project.production_duration,
      deliveryDuration: project.delivery_duration,
      completionDuration: project.completion_duration,
      estimatedDeliveryDate: project.estimated_delivery_date,
      estimatedCompletionDate: project.estimated_completion_date
    },
    client,
    childLlc,
    projectDetails,
    financials,
    milestones,
    warrantyTerms,
    contractors,
    units
  };
}

export async function getContractVariables(
  projectId: number,
  organizationId: number,
  options: GetContractVariablesOptions = {}
): Promise<ContractVariables> {
  const { contractType = 'MASTER_EF', includePricing = true } = options;

  const projectData = await getProjectWithRelations(projectId, organizationId);

  if (!projectData) {
    throw new Error(`Project with id ${projectId} not found`);
  }

  let pricingSummary: PricingSummary | undefined;

  if (includePricing) {
    try {
      pricingSummary = await calculateProjectPricing(projectId);
    } catch (error) {
      console.warn(`Could not calculate pricing for project ${projectId}:`, error);
    }
  }

  const pricingSummaryForMapper = pricingSummary ? {
    breakdown: pricingSummary.breakdown,
    grandTotal: pricingSummary.grandTotal,
    projectBudget: pricingSummary.projectBudget,
    contractValue: pricingSummary.contractValue,
    serviceModel: pricingSummary.serviceModel,
    paymentSchedule: pricingSummary.paymentSchedule,
    unitCount: pricingSummary.unitCount,
    unitModelSummary: pricingSummary.unitModelSummary
  } : undefined;

  return mapProjectToVariables(projectData, pricingSummaryForMapper, contractType);
}

export async function getVariableMap(
  projectId: number,
  organizationId: number,
  contractType: ContractFilterType = 'MASTER_EF'
): Promise<Record<string, string>> {
  const variables = await getContractVariables(projectId, organizationId, { contractType });

  const stringMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value === null || value === undefined) {
      stringMap[key] = '';
    } else if (typeof value === 'boolean') {
      stringMap[key] = value ? 'Yes' : 'No';
    } else {
      stringMap[key] = String(value);
    }
  }

  // Add VAR_ prefixed aliases for key variables
  stringMap['VAR_ON_SITE_SELECTION_NAME'] = getOnSiteSelectionName(stringMap['ON_SITE_SELECTION'] || 'CRC');
  stringMap['VAR_PROJECT_ADDRESS'] = stringMap['SITE_ADDRESS'] || stringMap['PROJECT_ADDRESS'] || '';
  stringMap['VAR_CLIENT_NAME'] = stringMap['CLIENT_NAME'] || '';
  stringMap['VAR_TOTAL_PRICE'] = stringMap['TOTAL_CONTRACT_PRICE'] || stringMap['CONTRACT_VALUE'] || '';

  return stringMap;
}

function getOnSiteSelectionName(onSiteType: string): string {
  switch (onSiteType?.toUpperCase()) {
    case 'CMOS':
      return 'Company-Managed On-Site Services (CMOS)';
    case 'CRC':
    default:
      return 'Client-Retained Contractor (CRC)';
  }
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cents / 100);
}
