# Dvele Contract Manager

## Overview

Dvele Contract Manager is a full-stack application designed to streamline the management of construction projects and their associated child LLCs for a modular home company. The system facilitates the creation and administration of specific child LLCs for each project (e.g., "Dvele Partners [Project] LLC") and automates contract generation based on these entities. The project aims to reduce manual overhead in legal and project administration, ensuring compliance and efficiency in construction operations by integrating project management with legal document generation and offering robust tools for contract and LLC lifecycle management.

## User Preferences

The user prefers an iterative development approach, with clear communication about changes and progress. They value detailed explanations for complex features and architectural decisions. The user expects the agent to ask for confirmation before implementing significant changes or making irreversible modifications to the codebase or database schema. They prioritize maintainability and clean code practices.

## System Architecture

The application is built on a modern full-stack architecture.

**Frontend**:
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **State Management**: TanStack Query v5
- **Routing**: `wouter`
- **Forms**: `react-hook-form` with `zod`
- **UI/UX Decisions**:
    - **Dashboard**: Features key stats, recent contracts, quick start templates, and contract value overview.
    - **Multi-step Wizard**: A 9-step wizard for contract generation with autosave, validation, and review steps.
    - **Theme**: Supports Dark Mode.
    - **LLC Naming**: Automated child LLC naming convention "DP + Project_Address + LLC".
    - **Wizard Enhancements**: Site Address moved to Step 1, optional Billing Address, renamed steps (e.g., "Home Models", "Company Entity"), enhanced Step 9 with project type and company entity display.
    - **Admin UI**: CRUD for Exhibit Library.
    - **LLC Lifecycle Management**: Tabbed edit dialog (General/Corporate/Compliance) with formation date, EIN, registered agent, annual report tracking, and compliance status badges (Overdue=red, Pending=yellow, Filed=green).

**Backend**:
- **Framework**: Express.js
- **Language**: TypeScript
- **API**: RESTful API for managing contracts, projects, LLCs, clauses, variables, contractors, and system data.
- **Modular Route Architecture**: Routes are organized into domain-focused modules (e.g., `projects.ts`, `contracts.ts`, `llc.ts`).

**Database**:
- **Primary Database**: PostgreSQL for all persistent data including `contracts`, `clauses`, `projects`, `clients`, `financials`, `projectDetails`, `milestones`, `warrantyTerms`, `contractors`, `contractor_entities`, `contract_variables`.
- **Phase A (Complete)**: Atomic Clauses Architecture - clauses table refactored to use `slug`, `header_text`, `body_html`, `level`, `parent_id`, `order`, `contract_types` (JSONB), `tags` (JSONB). Database uses snake_case column names.
- **Phase B (Complete)**: Smart Ingestor with regex-powered hierarchy detection for Roman numeral lists and automatic body paragraph appending.
- **Phase C (Complete)**: System Restoration - API backward compatibility with `content` field reconstruction from header+body, table_definitions seeded for Variable Library.
- **Phase D (Complete)**: Atomic UI & HTML Preview Upgrade - Editor UI with separate Header/Body fields, hierarchy-based styling (L1-L4 blue, L6 amber conspicuous, L7-L8 indented). Reorder endpoint fixed to use snake_case columns. All SQL queries use snake_case: `header_text`, `body_html`, `parent_id`, `updated_at`, `contract_types`.
- **Phase E (Complete)**: Contract Viewer & Preview Logic updated - Endpoints reconstructing legacy `content` field from atomic `header_text`/`body_html` for frontend compatibility. Preview rendering with level-based CSS classes.
- **Phase F (Complete)**: Smart Merge Ingestion - Heading 5 paragraphs >60 chars without list markers are merged into previous clause's bodyHtml instead of creating new tree nodes. Reduced clause count from 174 to 137. UI cleanup removed debug labels and added title truncation.
- **Phase F-2 (Complete)**: Aggressive Smart Merge - Extended smart merge logic to H3, H4, H5 tags. Any heading >60 chars without list markers now merges into previous clause. Reduced clause count from 137 to 129 (45 total smart merges).
- **Phase G (Complete)**: Hydrated table_definitions with column configurations for PRICING_TABLE (3 cols), PAYMENT_SCHEDULE_TABLE (3 cols), SIGNATURE_BLOCK_TABLE (3 cols), EXHIBIT_LIST_TABLE (2 cols). Script: `npx tsx scripts/update_tables.ts`.

**Core Features & Design Patterns**:
- **Autosave System**: Debounced 2-second autosave for draft projects.
- **Contract Generation Wizard**: Structured, multi-step process for creating contract packages with dynamic pricing.
- **Unit Builder**: Allows adding home models (from `project_units` table) during contract generation.
- **Clause Library**: Comprehensive, searchable library of contract clauses with filtering and editing.
- **Variable Mappings**: System for configuring and mapping contract variables.
- **LLC Administration**: CRUD operations for child LLC entities.
- **Pricing Engine Integration**: Dynamic injection of pricing data into contracts.
- **Dynamic HTML Tables**: Contract variables like `{{PRICING_BREAKDOWN_TABLE}}` and `{{PAYMENT_SCHEDULE_TABLE}}` render as styled HTML tables in generated contracts.
- **Schedule Duration Variables**: Project-level schedule fields populate contract variables for Exhibit D schedules.
- **Unified Variable Mapping**: `server/lib/mapper.ts` serves as the single source of truth for variable definitions.
- **Intelligent Discovery-Based Contract Ingestor**: Script (`scripts/ingest_standard_contracts.ts`) automatically ingests .docx contract templates, derives contract types, extracts content based on Word styles, detects patterns, extracts variables, and builds a hierarchical clause structure. Supports single-file ingestion and appending.
- **State-Specific Provision Filtering**: Ingestor detects state-specific sections (e.g., "CALIFORNIA PROVISIONS") and tags clauses with conditions. The contract generator filters blocks based on `PROJECT_STATE`.
- **Contract Template Upload & Auto-Ingest**: UI and API for uploading .docx templates with automatic ingestion into the clause library.
- **Variable Registry Sync**: Script (`scripts/sync_variables.ts`) synchronizes variables used in clauses with a central registry, inferring data types and marking required fields.
- **8-Level Smart Logic Ingestor**: Maps Word styles to an 8-level hierarchy, detects smart tags like `[STATE_DISCLOSURE:XXXX]`, and handles service model conditions.
- **State Disclosure Double-Lookup System**: Uses a `state_disclosures` table for dynamic lookup of state-specific content based on `disclosure_code` and `PROJECT_STATE`.
- **Inline State Disclosure Tag Resolution**: Supports `[STATE_DISCLOSURE:XXXX]` tags embedded in clause content and exhibits. These tags are automatically resolved during contract generation by looking up the disclosure content from the state_disclosures table based on the tag code and project state. Tags are preloaded for performance and replaced with actual disclosure text.
- **Exhibit Tag Resolution**: Supports `{{EXHIBIT_A}}` through `{{EXHIBIT_G}}` tags in clause content. Exhibits are preloaded from the exhibits table at contract generation start, filtered by contract type (ONE/MANUFACTURING/ONSITE), and resolved with formatted HTML including exhibit letter and title headers.
- **4-Level Hierarchical Styling**: PDF contracts apply dynamic CSS styling for 4 hierarchy levels based on clause structure.
- **Exhibit Library**: Manages contract exhibits with CRUD functionality, supporting dynamic content, variable placeholders, and contract type associations.
- **State Disclosure Library Management**: Full CRUD UI for managing state-specific legal disclosures, with state/code filtering, accessible via Configuration menu. Supports 16 states (AZ, CA, CO, FL, GA, ID, IL, MA, MI, NV, NY, OR, PA, TX, UT, WA).
- **Universal Template Ingestor**: Enhanced UI for uploading various template types (Contract Agreement, Exhibit Library, State Disclosure Library) with intelligent ingestion logic for each.
- **Clause Explorer UI (Phase 10)**: Two-pane layout with 35% hierarchical tree panel and 65% editor+preview. Features L1-L8 nesting visualization with position-based numbering (e.g., 1, 1.1, 1.2), multi-select contract type tagging (ONE, CMOS, CRC, ONSITE), live HTML preview with hierarchy-aware styling, and drag-and-drop reordering with cycle detection.
- **Component Library (Consolidated Feb 2026)**: Unified management page for all contract components. Three-group sidebar: Text Blocks (BLOCK_ tags), Table Components (TABLE_ tags for signature blocks, what-happens-next), and Data-Driven Tables (PRICING_BREAKDOWN_TABLE, PAYMENT_SCHEDULE_TABLE, UNIT_SPEC_TABLE with live project data preview). Shared styling via `server/lib/tableStyles.ts` with consistent #2c3e50 header color. Components stored in `component_library` table with `is_active` toggle and `is_system` protection. Resolution priority: mapper variables (data-driven) -> component_library TABLE_ tags -> BLOCK_ tags.
- **Multi-Contract Type Tagging**: Clauses support array of contract_types for flexible many-to-many associations. API filters with `ANY(contract_types)` for backward compatibility.
- **Admin Variable Mappings**: CRUD admin page at `/admin/variables` for managing contract variable-to-source mappings stored in `variable_mappings` table.
- **Admin Component Library**: CRUD admin page at `/admin/components` for managing dynamic text blocks stored in `component_library` table. Supports service model variants (CRC/CMOS) and system-protected components. DB-first lookup with hardcoded fallbacks.
- **Multi-Contract Type Support**: System now supports multiple contract types: ONE (standard agreement), MANUFACTURING, ONSITE, and MASTER_EF (exhibit-first master purchase agreement). Each contract type has its own clause library, exhibits, and state disclosures.
- **MASTER_EF Agreement (Feb 2026)**: New exhibit-first master purchase agreement with 138 clauses and 6 exhibits (A-F). Ingestion script: `scripts/ingest_master_ef.ts`. Features:
    - Exhibit A: Project Scope and Commercial Terms (pricing, schedule, buyer type)
    - Exhibit B: Home Plans, Specifications & Finishes
    - Exhibit C: GC/On-Site Scope & Responsibility Matrix (with BLOCK_GC_INFO_SECTION for CRC/CMOS variants)
    - Exhibit D: Milestones & Schedule
    - Exhibit E: Limited Warranty
    - Exhibit F: State-Specific Provisions (with [STATE_DISCLOSURE:MASTER_EF_NOTICES])
    - 14 new variables in mapper.ts: BUYER_TYPE, PROJECT_TYPE, PRODUCTION_PRICE, LOGISTICS_PRICE, ONSITE_PRICE, TOTAL_PROJECT_PRICE, AD_FEE, STORAGE_FEE_PER_DAY, STORAGE_FREE_DAYS, CLIENT_PRIMARY_CONTACT, COMPANY_CONTACT, COMPANY_EMAIL, XREF_FEES_PAYMENT_SECTION, XREF_BANKABILITY_SUBSECTIONS
- **6-Phase Pricing Enhancement (Feb 2026)**:
    - Phase 1+4: serviceModel bug fix (mapper.ts uses project.serviceModel), additionalSiteWork defaults to $0
    - Phase 2: Shipping breakout - shipping_set_price in home_models, totalShipping tracked separately in pricing engine, projectBudget/contractValue include shipping
    - Phase 3: Design fee uses financials.designFee (project-level) instead of per-model sum, Design Fee input in Step7
    - Phase 5: Exhibit C.4 Interface Deadlines - 5 fields (foundationReadyDays, utilityStubbedDays, siteAccessReadyDays, permitsScheduledDays, craneAccessReadyDays) with defaults
    - Phase 6: Exhibit D.1/D.2 Target Dates - 6 date fields (designKickoffDate, schematicDesignDate, designDevelopmentDate, permitSubmittalDate, productionMidpointDate, productionCompleteDate) with formatDateOrTBD helper
    - 11 new mapper variables: FOUNDATION_READY_DAYS, UTILITY_STUBBED_DAYS, SITE_ACCESS_READY_DAYS, PERMITS_SCHEDULED_DAYS, CRANE_ACCESS_READY_DAYS, DESIGN_KICKOFF_DATE, SCHEMATIC_DESIGN_DATE, DESIGN_DEVELOPMENT_DATE, PERMIT_SUBMITTAL_DATE, PRODUCTION_MIDPOINT_DATE, PRODUCTION_COMPLETE_DATE

## External Dependencies

- **PostgreSQL**: Primary database.
- **Vite**: Frontend build tool.
- **React**: Frontend library.
- **Express.js**: Backend framework.
- **Tailwind CSS**: Styling framework.
- **Shadcn UI**: UI components.
- **TanStack Query v5**: Data fetching.
- **wouter**: Routing.
- **react-hook-form**: Form management.
- **zod**: Schema validation.
- **JAMS/AAA**: Referenced arbitration providers.
- **Odoo ERP**: Planned future integration.