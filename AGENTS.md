# ONE Contract Manager — Agent Guide

## What This App Does

Enterprise contract management platform for modular home construction (Dvele). Automates generation of legal contracts (MASTER_EF, ONE, MANUFACTURING, ONSITE) from project data through a 9-step wizard. Handles state-specific legal compliance, dynamic pricing, child LLC management, and exhibit generation.

## Tech Stack

- **Frontend:** React 18 + Vite, TypeScript, Tailwind CSS, Shadcn UI, TanStack Query v5, wouter, react-hook-form + zod
- **Backend:** Express 5, TypeScript, Node.js 20
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** AWS Cognito (JWT/JWKS); enforced on every `/api` request (sign in through the app, including in dev)
- **PDF:** Puppeteer Core
- **Docs:** docxtemplater, mammoth (DOCX ingestion)
- **Port:** 5000 (serves both API and client)
- **Deployment (staging):** Backend → AWS ECS Fargate (`us-west-1`) via GitHub Actions on push to `dev`; Frontend → AWS Amplify Hosting (`dev` branch). See [Deployment & CI/CD](#deployment--cicd).

## Key Files

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Drizzle ORM schema — single source of truth for all DB types |
| `server/index.ts` | Express app entry, auth middleware, route registration |
| `server/routes/index.ts` | Aggregates all route modules |
| `server/lib/contractGenerator.ts` | Core contract generation engine |
| `server/lib/mapper.ts` | Variable resolution — **single source of truth** for all template variables |
| `server/lib/tableGenerators.ts` | Dynamic exhibit table generation |
| `server/services/pricingEngine.ts` | 6-phase pricing calculations |
| `server/services/component-library.ts` | Reusable text block CRUD |
| `server/middleware/auth.ts` | JWT validation, sets `req.organizationId` and `req.user` |
| `client/src/App.tsx` | wouter router and app shell |
| `client/src/components/wizard/` | 9-step contract generation wizard |
| `client/src/pages/admin/` | Admin CRUD interfaces |

## Development Setup

```bash
npm install
cp .env.example .env        # set DATABASE_URL (required)
npm run db:push             # push schema to DB
npx tsx scripts/seed_mvp.ts
npx tsx scripts/seed_variables.ts
npx tsx scripts/seed-components.ts
npm run dev                 # starts on port 5000
```

Key env vars: `DATABASE_URL`, `NODE_ENV`, `PORT` (default 5000), `AWS_S3_BUCKET`, `AWS_REGION`, `ENABLE_SCHEDULED_JOBS`, `PUPPETEER_EXECUTABLE_PATH`

## Database

Schema lives in `shared/schema.ts`. Use Drizzle Kit for migrations:

```bash
npm run db:push        # push schema changes (dev)
npm run db:generate    # generate migration files
npm run db:migrate     # run migrations
```

All tables have `organizationId` for multi-tenancy. Currently hardcoded to org 1.

**On deploy, schema is applied automatically.** The container entrypoint
(`docker-entrypoint.sh`) runs `drizzle-kit push` against `DATABASE_URL` on startup,
reconciling the deployed DB to `shared/schema.ts`. So a schema change ships to staging
by committing `shared/schema.ts` and pushing to `dev` — there is **no manual production
migration step**. (`drizzle-kit` is therefore a runtime dependency, not dev-only.)
Locally, run `npm run db:push` yourself to sync your dev DB. `shared/schema.ts` is the
source of truth on deploy; the files in `migrations/` are stale and not used by `push`.

## Critical Business Logic

### 1. Service Model (CRC vs CMOS)
Most of the app branches on `project.onSiteSelection`:
- **CRC** — Company handles onsite; excludes onsite charges from pricing
- **CMOS** — Client manages onsite; includes all phases in pricing

Conditional contract content uses `[IF CRC]...[/IF]` and `[IF CMOS]...[/IF]` tags.

### 2. Variable Mapping (`server/lib/mapper.ts`)
`mapper.ts` is the **single source of truth** for resolving template variables. All `{{VARIABLE_NAME}}` placeholders in contracts are resolved here. Do not resolve variables anywhere else. Variable categories: project, client, childLlc, site, home, specifications, financial, legal, dates.

### 3. Contract Generation Data Flow
```
Project Data → Variable Mapper → Contract Generator
  → Table Generators (dynamic exhibits)
  → Clause Library (atomic header/body clauses)
  → Conditional processing ([IF CRC/CMOS], [STATE_DISCLOSURE:CODE])
  → Exhibit injection ({{EXHIBIT_A}} through {{EXHIBIT_G}})
  → PDF via Puppeteer → File storage
```

**Exhibits require a `templateId`.** `fetchExhibitsForContract` selects exhibits via
the `template_exhibits` junction keyed by `templateId` (contract types no longer drive
inclusion). Every generation entry point — `POST /contracts`, `download-pdf`,
`download-all-zip`, preview, regenerate — MUST pass `templateId` or the document is
produced with **no exhibits**. There is one active `contract_templates` row per
contract type, so resolve it from `contractType` when no explicit id is available
(see `resolveTemplateId` in `server/routes/contracts.ts`).

### 4. Atomic Clause Architecture
Clauses have separate `headerText` and `bodyHtml` fields. They are hierarchical (level 1–8, parentId for nesting) and tagged with contract types and tags (JSONB). This enables flexible composition — never merge header and body into a single field.

### 5. Pricing Engine
6-phase pricing: design fee → offsite base → onsite estimate → customizations → shipping → site work. Quantity from `project_units.quantity` cascades through all phases. CRC omits onsite phases.

### 6. State Disclosures
`[STATE_DISCLOSURE:CODE]` tags in contract content are resolved at generation time based on the project's state. The disclosure content comes from the `state_disclosures` table.

## API Conventions

- All routes are prefixed with `/api` (verify in `server/routes/index.ts`)
- Auth middleware runs on all routes; `req.user` and `req.organizationId` are always set
- Standard response shape: `{ data: ... }` for success, `{ error: string }` for errors
- Use `organizationId` in all DB queries — never query across orgs

## Frontend Conventions

- State management: TanStack Query v5 for server state, React hooks for local state
- Forms: react-hook-form with zod validation
- Routing: wouter (not react-router)
- UI: Shadcn UI primitives only — do not add new component libraries
- Styling: Tailwind CSS classes; see `design_guidelines.md` for the design system

## Deployment & CI/CD

Staging runs on AWS (account `522879564192`, region `us-west-1`). Full runbook and
concrete resource names: [`docs/aws-ecs-amplify-deploy.md`](docs/aws-ecs-amplify-deploy.md).

- **Backend → ECS Fargate.** `.github/workflows/deploy-backend.yml` builds the
  API-only Docker image, pushes to ECR, and deploys a new ECS task-def revision on
  **push to `dev`**. The job is scoped to the `development` GitHub Environment, where
  its `AWS_DEPLOY_ROLE_ARN` secret and the `AWS_*` / `ECS_*` / `ECR_*` variables live.
- **Frontend → Amplify Hosting** (`dev` branch), built via `amplify.yml`
  (`vite build` → `dist/public`). `VITE_*` vars are inlined at build time (set in the
  Amplify console); changing one requires a rebuild. Needs an SPA rewrite (regex `200`
  rule → `/index.html`).
- **Production = committed code.** Pushing to `dev` IS the deploy. Manual ECS image
  pushes get overwritten by the next CI run — ship by commit + push, not by hand.
- **Schema migrates on container start** via `drizzle-kit push` (see Database above).
- **Config is plain task-def env** (no Secrets Manager). `DATABASE_URL` must include
  `?sslmode=no-verify` (RDS enforces TLS). `FRONTEND_ORIGIN` is the CORS allowlist and
  must equal the Amplify origin exactly (scheme + host, no trailing slash).
- The deployed API and SPA are **different origins**; the SPA calls the API via
  `VITE_API_URL`, the API allows it via `FRONTEND_ORIGIN`. Auth is JWT Bearer (no cookies).

## Common Patterns

**Adding a new route:**
1. Create handler in `server/routes/your-domain.ts`
2. Register in `server/routes/index.ts`
3. Add schema types to `shared/schema.ts` if needed

**Adding a new template variable:**
1. Add to `server/lib/mapper.ts` — this is the only place
2. Update `shared/schema.ts` if the source data needs a new DB field
3. Document the variable in `server/routes/variable-mappings.ts`

**Adding a new wizard step:**
- Steps live in `client/src/components/wizard/steps/`
- Wizard state is managed in `client/src/components/wizard/data/`

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/ingest_standard_contracts.ts` | Parse DOCX templates → clause library |
| `scripts/seed_mvp.ts` | Seed home models, sample project, clauses |
| `scripts/seed_variables.ts` | Seed variable definitions |
| `scripts/seed-components.ts` | Seed signature blocks, responsibility matrix |
| `scripts/sync-to-production.ts` | Sync dev DB to production |

Nightly catalog sync runs at 2am via `server/services/catalogSync.ts`.

## What to Avoid

- Do not bypass `organizationId` filtering in DB queries
- Do not resolve template variables outside `server/lib/mapper.ts`
- Do not merge clause `headerText` and `bodyHtml` — keep them separate
- Do not add new UI component libraries; extend Shadcn UI
- Do not hardcode organization IDs except in dev seed scripts
