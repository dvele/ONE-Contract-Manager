# Dvele Contract Manager

## Overview

Dvele Contract Manager is a full-stack application designed to streamline the management of construction projects and their associated child LLCs for a modular home company. Its primary purpose is to automate contract generation, manage LLC lifecycles, and ensure compliance and efficiency in construction operations. The system reduces manual overhead in legal and project administration by integrating project management with legal document generation, aiming to enhance the overall efficiency and compliance of Dvele's construction projects.

## User Preferences

The user prefers an iterative development approach, with clear communication about changes and progress. They value detailed explanations for complex features and architectural decisions. The user expects the agent to ask for confirmation before implementing significant changes or making irreversible modifications to the codebase or database schema. They prioritize maintainability and clean code practices.

## System Architecture

The application employs a modern full-stack architecture with a focus on modularity, robust data management, and user-friendly interfaces.

**Frontend**:
- **Technology Stack**: React (Vite), Tailwind CSS, Shadcn UI, TanStack Query v5, `wouter`, `react-hook-form` with `zod`.
- **UI/UX Design**:
    - **Dashboard**: Provides an overview of key project metrics, recent contracts, and quick access to templates.
    - **Contract Generation Wizard**: A multi-step wizard (9 steps) featuring autosave, validation, dynamic input fields, and a review process. Includes features like automated child LLC naming ("DP + Project_Address + LLC") and dynamic pricing integration.
    - **LLC Management**: Tabbed interface for managing LLC details, including formation date, EIN, registered agent, annual report tracking, and compliance status indicators.
    - **Admin Interfaces**: CRUD operations for Exhibit Library, Variable Mappings, Component Library, and State Disclosure Library.
    - **Clause Explorer**: Two-pane UI for hierarchical clause management with live HTML preview, multi-select tagging, and drag-and-drop reordering.

**Backend**:
- **Technology Stack**: Express.js with TypeScript.
- **API**: RESTful API supporting management of contracts, projects, LLCs, clauses, variables, and contractors.
- **Architecture**: Modular route structure organized by domain (e.g., `projects.ts`, `contracts.ts`).

**Database**:
- **Primary Database**: PostgreSQL, utilized for all persistent data including `contracts`, `clauses`, `projects`, `clients`, `financials`, `projectDetails`, `milestones`, `warrantyTerms`, `contractors`, and `contract_variables`.
- **Schema Design**: Utilizes `snake_case` for column names. Clause table includes fields like `slug`, `header_text`, `body_html`, `level`, `parent_id`, `order`, `contract_types` (JSONB), and `tags` (JSONB).

**Core Features & Design Patterns**:
- **Automated Contract Ingestion**: Intelligent, regex-powered ingestion script (`scripts/ingest_standard_contracts.ts`) automatically processes `.docx` templates, extracts content based on Word styles, detects patterns, and builds a hierarchical clause structure. Supports state-specific provision filtering.
- **Atomic Clause Architecture**: Clauses are stored in an atomic structure (header and body separate) for flexibility, with system restoration ensuring backward compatibility by reconstructing legacy `content` fields for the frontend.
- **Dynamic Variable Resolution**: A unified variable mapping system (`server/lib/mapper.ts`) serves as a single source of truth for variable definitions, supporting dynamic data injection into contracts. Includes dynamic HTML table generation (e.g., `PRICING_BREAKDOWN_TABLE`).
- **State Disclosure System**: Manages state-specific legal disclosures with a dedicated library and dynamic resolution of `[STATE_DISCLOSURE:XXXX]` tags within clauses based on `PROJECT_STATE`.
- **Exhibit Management**: CRUD functionality for contract exhibits, supporting dynamic content, variable placeholders, and contract type associations. `{{EXHIBIT_A}}` to `{{EXHIBIT_G}}` tags are resolved dynamically.
- **Component Library**: A unified system for managing reusable contract components (text blocks, table components, data-driven tables) stored in the `component_library` table, with support for service model variants and system protection.
- **Multi-Contract Type Support**: System supports various contract types (ONE, MANUFACTURING, ONSITE, MASTER_EF), each with its own clause library, exhibits, and state disclosures.
- **Dynamic Cross-Referencing (XREF)**: XREF tags (e.g., `XREF_FEES_PAYMENT_SECTION`) are dynamically resolved from the clause hierarchy after numbering, providing accurate section references.
- **Pricing Engine**: Integrates a 6-phase pricing enhancement system, accounting for design fees, shipping breakouts, and project-level pricing.
- **Responsibility Matrix**: Configurable on-site task allocation between the Company and Client/GC, rendered dynamically in Exhibit C with default settings for different service models.

## External Dependencies

- **PostgreSQL**: Primary relational database.
- **Vite**: Frontend build tool.
- **React**: Frontend JavaScript library.
- **Express.js**: Backend web application framework.
- **Tailwind CSS**: Utility-first CSS framework.
- **Shadcn UI**: Reusable UI components.
- **TanStack Query v5**: Data fetching and caching library.
- **wouter**: Small routing library for React.
- **react-hook-form**: Performant, flexible, and extensible forms with easy-to-use validation.
- **zod**: TypeScript-first schema declaration and validation library.