import { pgTable, text, integer, real, serial, boolean, jsonb, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// MULTI-TENANT CORE
// =============================================================================

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  email: text("email").unique().notNull(),
  name: text("name"),
  role: text("role").default("user"), // admin, user
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// =============================================================================
// HOME MODELS (Multi-Tenant)
// =============================================================================

export const homeModels = pgTable("home_models", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  name: text("name").notNull(),
  modelCode: text("model_code").notNull(),
  description: text("description"),
  sqFt: integer("sq_ft"),
  bedrooms: integer("bedrooms"),
  bathrooms: real("bathrooms"),
  stories: integer("stories"),
  designFee: integer("design_fee"), // cents
  offsiteBasePrice: integer("offsite_base_price"), // cents
  onsiteEstPrice: integer("onsite_est_price"), // cents
  shippingSetPrice: integer("shipping_set_price"), // cents - offsite delivery/crane setting cost
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (t) => [
  unique().on(t.organizationId, t.modelCode),
]);

// =============================================================================
// PROJECT UNITS (Multi-Tenant)
// =============================================================================

export const projectUnits = pgTable("project_units", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  modelId: integer("model_id")
    .references(() => homeModels.id),
  unitLabel: text("unit_label"), // "Unit A", "Main Home", etc.
  quantity: integer("quantity").default(1).notNull(),
  basePriceSnapshot: integer("base_price_snapshot"), // cents - locked price
  customizationTotal: integer("customization_total").default(0), // cents
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// LLCs (Multi-Tenant)
// =============================================================================

export const llcs = pgTable("llcs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  name: text("name").notNull().unique(),
  projectName: text("project_name"),
  projectAddress: text("project_address"),
  status: text("status").default("forming"), // forming, active, closed
  stateOfFormation: text("state_of_formation").default("Delaware"),
  entityType: text("entity_type").default("LLC"),
  formationDate: text("formation_date"),
  ein: text("ein"),
  address: text("address"),
  city: text("city"),
  stateAddress: text("state_address"),
  zip: text("zip"),
  registeredAgent: text("registered_agent"),
  registeredAgentAddress: text("registered_agent_address"),
  members: text("members"),
  annualReportDueDate: text("annual_report_due_date"),
  annualReportStatus: text("annual_report_status").default("pending"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// =============================================================================
// CONTRACT TEMPLATES (Multi-Tenant)
// =============================================================================

export const contractTemplates = pgTable("contract_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  name: text("name").notNull(),
  displayName: text("display_name"),
  contractType: text("contract_type").notNull(), // one_agreement, manufacturing_sub, onsite_sub
  version: integer("version").default(1),
  status: text("status").default("active"),
  content: text("content"), // HTML/template content
  baseClauseIds: jsonb("base_clause_ids"), // integer[] stored as jsonb
  conditionalRules: jsonb("conditional_rules"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// =============================================================================
// TEMPLATE CLAUSES (Junction table linking templates to clauses)
// =============================================================================

export const templateClauses = pgTable("template_clauses", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id")
    .references(() => contractTemplates.id)
    .notNull(),
  clauseId: integer("clause_id")
    .references(() => clauses.id)
    .notNull(),
  orderIndex: integer("order_index").notNull(),
  organizationId: integer("organization_id")
    .references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// TEMPLATE EXHIBITS (Junction table linking templates to exhibits)
// =============================================================================

export const templateExhibits = pgTable("template_exhibits", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id")
    .references(() => contractTemplates.id)
    .notNull(),
  exhibitId: integer("exhibit_id")
    .references(() => exhibits.id)
    .notNull(),
  orderIndex: integer("order_index").notNull(),
  organizationId: integer("organization_id")
    .references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// CONTRACT VARIABLES (Multi-Tenant)
// =============================================================================

export const contractVariables = pgTable("contract_variables", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  variableName: text("variable_name").notNull(),
  displayName: text("display_name"),
  category: text("category"), // client, project, financial, legal
  dataType: text("data_type").default("text"), // text, number, date, currency
  defaultValue: text("default_value"),
  description: text("description"),
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// EXHIBITS (Multi-Tenant)
// =============================================================================

export const exhibits = pgTable("exhibits", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id),
  letter: text("letter"), // A, B, C, D, E, F, G
  title: text("title"),
  exhibitCode: text("exhibit_code"), // EXHIBIT_A, EXHIBIT_B (legacy)
  name: text("name"),
  description: text("description"),
  content: text("content"), // HTML content
  isDynamic: boolean("is_dynamic").default(false),
  disclosureCode: text("disclosure_code"),
  contractTypes: jsonb("contract_types"), // Array of applicable contract types
  sortOrder: integer("sort_order"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// =============================================================================
// STATE DISCLOSURES (Multi-Tenant)
// =============================================================================

export const stateDisclosures = pgTable("state_disclosures", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id),
  code: text("code"), // Disclosure code identifier
  state: text("state"), // CA, TX, AZ
  content: text("content"), // HTML content
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// =============================================================================
// CONTRACTOR ENTITIES (Multi-Tenant - Master List)
// =============================================================================

export const contractorEntities = pgTable("contractor_entities", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  legalName: text("legal_name").notNull(),
  contractorType: text("contractor_type").notNull(), // manufacturer, onsite_general, onsite_sub
  entityType: text("entity_type"), // LLC, Corporation
  state: text("state"),
  address: text("address"),
  city: text("city"),
  stateAddress: text("state_address"),
  zip: text("zip"),
  licenseNumber: text("license_number"),
  licenseState: text("license_state"),
  licenseExpiration: text("license_expiration"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  bondAmount: integer("bond_amount"),
  insuranceAmount: integer("insurance_amount"),
  insuranceExpiration: text("insurance_expiration"),
  insuranceCarrier: text("insurance_carrier"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// =============================================================================
// CORE TABLES (Updated with organizationId)
// =============================================================================

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id),
  llcId: integer("llc_id"), // Reference to child LLC (auto-generated if not provided)
  projectNumber: text("project_number").unique().notNull(),
  name: text("name").notNull(),
  status: text("status").default("Draft").notNull(), // Draft, Design, GreenLight, Production, Delivered, Complete
  state: text("state"), // Project state (CA, TX, AZ, etc.)
  onSiteSelection: text("on_site_selection").default("CRC"), // CRC or CMOS
  odooProjectId: integer("odoo_project_id"), // Link to Odoo
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  // Schedule Durations (in days)
  designDuration: integer("design_duration").default(0),
  permittingDuration: integer("permitting_duration").default(0),
  productionDuration: integer("production_duration").default(0),
  deliveryDuration: integer("delivery_duration").default(0),
  completionDuration: integer("completion_duration").default(0),
  estimatedDeliveryDate: text("estimated_delivery_date"),
  estimatedCompletionDate: text("estimated_completion_date"),
  // MASTER_EF Agreement Fields
  contractType: text("contract_type").default("MASTER_EF"), // 'MASTER_EF' (primary) | 'ONE' (archived)
  buyerType: text("buyer_type"), // 'end_customer' | 'developer'
  storageFeePerDay: integer("storage_fee_per_day"), // cents per day
  storageFreedays: integer("storage_free_days"), // number of free days
  adminFeePercent: integer("admin_fee_percent"), // percentage (5 = 5%)
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  
  // Primary Client
  legalName: text("legal_name").notNull(),
  entityType: text("entity_type"), // Individual, LLC, Corporation, Trust
  formationState: text("formation_state"), // State where client entity was formed
  
  // Address
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  
  // Contact
  email: text("email"),
  phone: text("phone"),
  
  // For Trusts
  trustDate: text("trust_date"),
  trusteeName: text("trustee_name"),
  trusteeTitle: text("trustee_title"),
  
  // Secondary Client (if applicable)
  client2LegalName: text("client2_legal_name"),
  client2EntityType: text("client2_entity_type"),
  ownershipSplit: text("ownership_split"), // e.g., "50/50", "60/40"
});

// =============================================================================
// PROJECT DETAILS
// =============================================================================

export const projectDetails = pgTable("project_details", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  
  // Site/Delivery Information
  deliveryAddress: text("delivery_address"),
  deliveryCity: text("delivery_city"),
  deliveryState: text("delivery_state"),
  deliveryZip: text("delivery_zip"),
  deliveryCounty: text("delivery_county"),
  deliveryApn: text("delivery_apn"), // Assessor's Parcel Number
  siteAcreage: text("site_acreage"),
  siteZoning: text("site_zoning"),
  
  // Home Specifications
  homeModel: text("home_model"),
  homeSqFt: integer("home_sq_ft"),
  homeBedrooms: integer("home_bedrooms"),
  homeBathrooms: real("home_bathrooms"),
  homeStories: integer("home_stories"),
  homeGarage: text("home_garage"), // "2-car attached", "none", etc.
  totalUnits: integer("total_units").default(1),
  moduleCount: integer("module_count"),
  
  // Building Code & Engineering
  buildingCodeReference: text("building_code_reference"),
  climateZone: text("climate_zone"),
  windSpeed: text("wind_speed"),
  snowLoad: text("snow_load"),
  seismicZone: text("seismic_zone"),
  
  // Key Dates
  agreementExecutionDate: text("agreement_execution_date"),
  designStartDate: text("design_start_date"),
  designCompleteDate: text("design_complete_date"),
  greenLightDate: text("green_light_date"),
  productionStartDate: text("production_start_date"),
  estimatedDeliveryDate: text("estimated_delivery_date"),
  actualDeliveryDate: text("actual_delivery_date"),
  
  // Exhibit C.4 - Interface Deadlines (days before delivery)
  foundationReadyDays: integer("foundation_ready_days").default(14),
  utilityStubbedDays: integer("utility_stubbed_days").default(14),
  siteAccessReadyDays: integer("site_access_ready_days").default(7),
  permitsScheduledDays: integer("permits_scheduled_days").default(30),
  craneAccessReadyDays: integer("crane_access_ready_days").default(7),

  // Exhibit D.1/D.2 - Target Dates
  designKickoffDate: text("design_kickoff_date"),
  schematicDesignDate: text("schematic_design_date"),
  designDevelopmentDate: text("design_development_date"),
  permitSubmittalDate: text("permit_submittal_date"),
  productionMidpointDate: text("production_midpoint_date"),
  productionCompleteDate: text("production_complete_date"),

  // Exhibit C.2 - Responsibility Matrix
  responsibilityMatrix: text("responsibility_matrix"),

  // Legal
  governingLawState: text("governing_law_state"),
  arbitrationLocation: text("arbitration_location"),
});

// =============================================================================
// FINANCIALS
// =============================================================================

export const financials = pgTable("financials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  
  // Design Phase
  designFee: integer("design_fee"), // Store in cents
  designRevisionRounds: integer("design_revision_rounds").default(3),
  designRevisionCostOverage: integer("design_revision_cost_overage"),
  
  // Preliminary Pricing (at Design Agreement)
  prelimOffsite: integer("prelim_offsite"),
  prelimOnsite: integer("prelim_onsite"),
  prelimContractPrice: integer("prelim_contract_price"), // Total preliminary
  
  // Final Pricing (at Green Light)
  homeBasePrice: integer("home_base_price"),
  homeCustomizations: integer("home_customizations").default(0),
  finalOffsite: integer("final_offsite"), // Locked at Green Light
  refinedOnsite: integer("refined_onsite"), // Refined estimate
  finalContractPrice: integer("final_contract_price"),
  
  // Price Lock Status
  isLocked: boolean("is_locked").default(false),
  lockedAt: text("locked_at"),
  lockedBy: text("locked_by"),
  
  // Inflation/Adjustment Triggers
  inflationTriggerDate: text("inflation_trigger_date"),
  inflationAdjustmentPercent: real("inflation_adjustment_percent").default(5.0),
  materialIncreaseThreshold: real("material_increase_threshold").default(10.0),
  
  // Liquidated Damages
  liquidatedDamagesPerDay: integer("liquidated_damages_per_day"),
  liquidatedDamagesCap: integer("liquidated_damages_cap"),
  onsiteLiquidatedDamagesPerDay: integer("onsite_liquidated_damages_per_day"),
  onsiteLiquidatedDamagesCap: integer("onsite_liquidated_damages_cap"),
});

// =============================================================================
// MILESTONES
// =============================================================================

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  
  // Milestone Identity
  milestoneType: text("milestone_type").notNull(), // 'client', 'manufacturing', 'onsite'
  milestoneNumber: integer("milestone_number").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Payment Details
  percentage: real("percentage"),
  amount: integer("amount"), // Store in cents
  
  // Timing
  dueUpon: text("due_upon"), // Description of trigger (e.g., "Contract Execution", "Green Light")
  targetDate: text("target_date"),
  completedDate: text("completed_date"),
  
  // Status
  status: text("status").default("Pending"), // Pending, Due, Paid, Overdue
  paidDate: text("paid_date"),
  paidAmount: integer("paid_amount"),
  invoiceNumber: text("invoice_number"),
  
  // Notes
  notes: text("notes"),
});

// =============================================================================
// WARRANTY TERMS
// =============================================================================

export const warrantyTerms = pgTable("warranty_terms", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  
  // Dvele (Off-Site) Warranties
  dveleFitFinishMonths: integer("dvele_fit_finish_months").default(12),
  dveleStructuralMonths: integer("dvele_structural_months").default(120), // 10 years
  dveleSystemsMonths: integer("dvele_systems_months").default(24),
  dveleBuildingEnvelopeMonths: integer("dvele_building_envelope_months").default(60), // 5 years
  
  // On-Site Warranties (Company Managed)
  onsiteFitFinishMonths: integer("onsite_fit_finish_months").default(12),
  onsiteStructuralMonths: integer("onsite_structural_months").default(120),
  onsiteSystemsMonths: integer("onsite_systems_months").default(24),
  
  // Client-Retained Contractor Warranties (CRC)
  clientFitFinishMonths: integer("client_fit_finish_months").default(12),
  clientStructuralMonths: integer("client_structural_months").default(120),
  clientBuildingEnvelopeMonths: integer("client_building_envelope_months").default(60),
  
  // Custom Terms
  customWarrantyTerms: text("custom_warranty_terms"), // JSON for any non-standard terms
  warrantyStartDate: text("warranty_start_date"),
});

// =============================================================================
// CONTRACTORS (Project-Level - links to master contractorEntities)
// =============================================================================

export const contractors = pgTable("contractors", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  
  // Contractor Type
  contractorType: text("contractor_type").notNull(), // 'manufacturer', 'onsite_general', 'onsite_sub'
  
  // Entity Info
  legalName: text("legal_name").notNull(),
  state: text("state"),
  entityType: text("entity_type"), // LLC, Corporation, etc.
  
  // Address
  address: text("address"),
  city: text("city"),
  stateAddress: text("state_address"),
  zip: text("zip"),
  
  // Licensing
  licenseNumber: text("license_number"),
  licenseState: text("license_state"),
  licenseExpiration: text("license_expiration"),
  
  // Contact
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  
  // Insurance & Bonding
  bondAmount: integer("bond_amount"),
  insuranceAmount: integer("insurance_amount"),
  insuranceExpiration: text("insurance_expiration"),
  insuranceCarrier: text("insurance_carrier"),
  
  // Status
  isActive: boolean("is_active").default(true),
});

// =============================================================================
// GENERATED CONTRACTS (Updated with organizationId)
// =============================================================================

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  
  // Contract Identity
  contractType: text("contract_type").notNull(), // 'one_agreement', 'manufacturing_sub', 'onsite_sub'
  version: integer("version").default(1),
  
  // Status Tracking
  status: text("status").default("Draft"), // Draft, PendingReview, Approved, Sent, Executed, Amended
  
  // Generation Info
  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: text("generated_by"),
  templateId: integer("template_id").references(() => contractTemplates.id),
  templateVersion: integer("template_version"),
  
  // File Storage
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileHash: text("file_hash"), // For integrity verification
  
  // Variable Snapshot
  variablesSnapshot: text("variables_snapshot"), // JSON of all variables at generation time
  
  // Execution
  sentAt: text("sent_at"),
  sentTo: text("sent_to"),
  executedAt: text("executed_at"),
  executedFilePath: text("executed_file_path"),
  
  // Notes
  notes: text("notes"),
});

// =============================================================================
// CLAUSE LIBRARY (Atomic Structure - Postgres Optimized)
// =============================================================================

export const clauses = pgTable("clauses", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id),
  
  // Identification
  slug: text("slug").unique(), // Optional: Human readable ID (e.g. OFFSITE_SERVICES_HEADER)
  
  // The Atomic Split (Phase A)
  headerText: text("header_text"), // Styled heading (e.g., "4.1 Offsite Services")
  bodyHtml: text("body_html"),     // Body content (e.g., "<ul><li>Design...</li></ul>")
  
  // Hierarchy
  level: integer("level").notNull(), // 1-8 based on Hierarchy Chart
  parentId: integer("parent_id"),    // Self-reference for Nested Tree
  order: integer("order").notNull(), // Global sort order
  
  // Filtering & Logic
  // Using native Postgres JSONB for array storage
  contractTypes: jsonb("contract_types"), // Array: ["ONE", "CRC"]
  tags: jsonb("tags"), // Array for logic flags: ["OFF_SITE_ONLY"]
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// =============================================================================
// CONTRACT CLAUSES (Instance-level clause snapshots)
// =============================================================================

export const contractClauses = pgTable("contract_clauses", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id")
    .references(() => contracts.id)
    .notNull(),
  clauseId: integer("clause_id")
    .references(() => clauses.id), // Reference to original clause (nullable for custom)
  
  // Snapshot of clause at generation time (immutable)
  headerText: text("header_text"),
  bodyHtml: text("body_html"),
  level: integer("level").notNull(),
  order: integer("order").notNull(),
  
  // Overrides
  customContent: text("custom_content"), // Optional override content
  isExcluded: boolean("is_excluded").default(false), // Clause excluded from contract
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// DYNAMIC TABLES (Phase 13/15 - Postgres Optimized)
// =============================================================================

export const tableDefinitions = pgTable("table_definitions", {
  id: serial("id").primaryKey(),
  variableName: text("variable_name").unique().notNull(), // {{CUSTOMER_ACKNOWLEDGE_TABLE}}
  displayName: text("display_name").notNull(),
  columns: jsonb("columns").notNull(), // JSONB definition of columns/types
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// =============================================================================
// VARIABLE MAPPINGS (Multi-Tenant - Dynamic Variable Configuration)
// =============================================================================

export const variableMappings = pgTable("variable_mappings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  variableName: text("variable_name").notNull(), // e.g., "{{CLIENT_ADDRESS}}"
  sourcePath: text("source_path").notNull(), // e.g., "project.client.address"
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// =============================================================================
// COMPONENT LIBRARY (Multi-Tenant - Dynamic Text Blocks)
// =============================================================================

export const componentLibrary = pgTable("component_library", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  tagName: text("tag_name").notNull(), // e.g., "BLOCK_ON_SITE_SCOPE"
  content: text("content").notNull(), // The HTML content block
  description: text("description"),
  serviceModel: text("service_model"), // "CRC", "CMOS", or null for all
  isSystem: boolean("is_system").default(false), // True for system-managed blocks
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// =============================================================================
// RELATIONS
// =============================================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  homeModels: many(homeModels),
  llcs: many(llcs),
  contractTemplates: many(contractTemplates),
  contractVariables: many(contractVariables),
  exhibits: many(exhibits),
  stateDisclosures: many(stateDisclosures),
  contractorEntities: many(contractorEntities),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));

export const homeModelsRelations = relations(homeModels, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [homeModels.organizationId],
    references: [organizations.id],
  }),
  projectUnits: many(projectUnits),
}));

export const projectUnitsRelations = relations(projectUnits, ({ one }) => ({
  organization: one(organizations, {
    fields: [projectUnits.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [projectUnits.projectId],
    references: [projects.id],
  }),
  model: one(homeModels, {
    fields: [projectUnits.modelId],
    references: [homeModels.id],
  }),
}));

export const llcsRelations = relations(llcs, ({ one }) => ({
  organization: one(organizations, {
    fields: [llcs.organizationId],
    references: [organizations.id],
  }),
}));

export const contractTemplatesRelations = relations(contractTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [contractTemplates.organizationId],
    references: [organizations.id],
  }),
}));

export const contractVariablesRelations = relations(contractVariables, ({ one }) => ({
  organization: one(organizations, {
    fields: [contractVariables.organizationId],
    references: [organizations.id],
  }),
}));

export const exhibitsRelations = relations(exhibits, ({ one }) => ({
  organization: one(organizations, {
    fields: [exhibits.organizationId],
    references: [organizations.id],
  }),
}));

export const stateDisclosuresRelations = relations(stateDisclosures, ({ one }) => ({
  organization: one(organizations, {
    fields: [stateDisclosures.organizationId],
    references: [organizations.id],
  }),
}));

export const contractorEntitiesRelations = relations(contractorEntities, ({ one }) => ({
  organization: one(organizations, {
    fields: [contractorEntities.organizationId],
    references: [organizations.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [projects.id],
    references: [clients.projectId],
  }),
  projectDetails: one(projectDetails, {
    fields: [projects.id],
    references: [projectDetails.projectId],
  }),
  financials: one(financials, {
    fields: [projects.id],
    references: [financials.projectId],
  }),
  warrantyTerms: one(warrantyTerms, {
    fields: [projects.id],
    references: [warrantyTerms.projectId],
  }),
  milestones: many(milestones),
  contractors: many(contractors),
  contracts: many(contracts),
  projectUnits: many(projectUnits),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  project: one(projects, {
    fields: [clients.projectId],
    references: [projects.id],
  }),
}));

export const projectDetailsRelations = relations(projectDetails, ({ one }) => ({
  project: one(projects, {
    fields: [projectDetails.projectId],
    references: [projects.id],
  }),
}));

export const financialsRelations = relations(financials, ({ one }) => ({
  project: one(projects, {
    fields: [financials.projectId],
    references: [projects.id],
  }),
}));

export const warrantyTermsRelations = relations(warrantyTerms, ({ one }) => ({
  project: one(projects, {
    fields: [warrantyTerms.projectId],
    references: [projects.id],
  }),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
}));

export const contractorsRelations = relations(contractors, ({ one }) => ({
  project: one(projects, {
    fields: [contractors.projectId],
    references: [projects.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  organization: one(organizations, {
    fields: [contracts.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [contracts.projectId],
    references: [projects.id],
  }),
}));

export const clausesRelations = relations(clauses, ({ one, many }) => ({
  parent: one(clauses, {
    fields: [clauses.parentId],
    references: [clauses.id],
    relationName: "clause_children",
  }),
  children: many(clauses, {
    relationName: "clause_children",
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type HomeModel = typeof homeModels.$inferSelect;
export type NewHomeModel = typeof homeModels.$inferInsert;

export type ProjectUnit = typeof projectUnits.$inferSelect;
export type NewProjectUnit = typeof projectUnits.$inferInsert;

export type Llc = typeof llcs.$inferSelect;
export type NewLlc = typeof llcs.$inferInsert;

export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type NewContractTemplate = typeof contractTemplates.$inferInsert;

export type TemplateClause = typeof templateClauses.$inferSelect;
export type NewTemplateClause = typeof templateClauses.$inferInsert;

export type TemplateExhibit = typeof templateExhibits.$inferSelect;
export type NewTemplateExhibit = typeof templateExhibits.$inferInsert;

export type ContractVariable = typeof contractVariables.$inferSelect;
export type NewContractVariable = typeof contractVariables.$inferInsert;

export type Exhibit = typeof exhibits.$inferSelect;
export type NewExhibit = typeof exhibits.$inferInsert;

export type StateDisclosure = typeof stateDisclosures.$inferSelect;
export type NewStateDisclosure = typeof stateDisclosures.$inferInsert;

export type ContractorEntity = typeof contractorEntities.$inferSelect;
export type NewContractorEntity = typeof contractorEntities.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type ProjectDetails = typeof projectDetails.$inferSelect;
export type NewProjectDetails = typeof projectDetails.$inferInsert;

export type Financial = typeof financials.$inferSelect;
export type NewFinancial = typeof financials.$inferInsert;

export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;

export type WarrantyTerm = typeof warrantyTerms.$inferSelect;
export type NewWarrantyTerm = typeof warrantyTerms.$inferInsert;

export type Contractor = typeof contractors.$inferSelect;
export type NewContractor = typeof contractors.$inferInsert;

export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;

export type Clause = typeof clauses.$inferSelect;
export type NewClause = typeof clauses.$inferInsert;

export type TableDefinition = typeof tableDefinitions.$inferSelect;
export type NewTableDefinition = typeof tableDefinitions.$inferInsert;

export type VariableMapping = typeof variableMappings.$inferSelect;
export type NewVariableMapping = typeof variableMappings.$inferInsert;

export type ComponentLibraryItem = typeof componentLibrary.$inferSelect;
export type NewComponentLibraryItem = typeof componentLibrary.$inferInsert;

// =============================================================================
// INSERT SCHEMAS
// =============================================================================

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertHomeModelSchema = createInsertSchema(homeModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertHomeModel = z.infer<typeof insertHomeModelSchema>;

export const insertProjectUnitSchema = createInsertSchema(projectUnits).omit({
  id: true,
  createdAt: true,
});
export type InsertProjectUnit = z.infer<typeof insertProjectUnitSchema>;

export const insertLlcSchema = createInsertSchema(llcs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLlc = z.infer<typeof insertLlcSchema>;

export const insertContractTemplateSchema = createInsertSchema(contractTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;

export const insertContractVariableSchema = createInsertSchema(contractVariables).omit({
  id: true,
  createdAt: true,
});
export type InsertContractVariable = z.infer<typeof insertContractVariableSchema>;

export const insertExhibitSchema = createInsertSchema(exhibits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExhibit = z.infer<typeof insertExhibitSchema>;

export const insertStateDisclosureSchema = createInsertSchema(stateDisclosures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStateDisclosure = z.infer<typeof insertStateDisclosureSchema>;

export const insertContractorEntitySchema = createInsertSchema(contractorEntities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertContractorEntity = z.infer<typeof insertContractorEntitySchema>;

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
});
export type InsertClient = z.infer<typeof insertClientSchema>;

export const insertProjectDetailsSchema = createInsertSchema(projectDetails).omit({
  id: true,
});
export type InsertProjectDetails = z.infer<typeof insertProjectDetailsSchema>;

export const insertFinancialSchema = createInsertSchema(financials).omit({
  id: true,
});
export type InsertFinancial = z.infer<typeof insertFinancialSchema>;

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
});
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

export const insertWarrantyTermSchema = createInsertSchema(warrantyTerms).omit({
  id: true,
});
export type InsertWarrantyTerm = z.infer<typeof insertWarrantyTermSchema>;

export const insertContractorSchema = createInsertSchema(contractors).omit({
  id: true,
});
export type InsertContractor = z.infer<typeof insertContractorSchema>;

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  generatedAt: true,
});
export type InsertContract = z.infer<typeof insertContractSchema>;

export const insertClauseSchema = createInsertSchema(clauses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClause = z.infer<typeof insertClauseSchema>;

export const insertTableDefinitionSchema = createInsertSchema(tableDefinitions).omit({
  id: true,
  createdAt: true,
});
export type InsertTableDefinition = z.infer<typeof insertTableDefinitionSchema>;

// Column type definition for table_definitions.columns
export const tableColumnSchema = z.object({
  header: z.string(),
  type: z.enum(["text", "data_field", "signature"]),
  width: z.string().optional(),
  value: z.string(),
});
export type TableColumn = z.infer<typeof tableColumnSchema>;

export const insertVariableMappingSchema = createInsertSchema(variableMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVariableMapping = z.infer<typeof insertVariableMappingSchema>;

export const insertComponentLibraryItemSchema = createInsertSchema(componentLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertComponentLibraryItem = z.infer<typeof insertComponentLibraryItemSchema>;
