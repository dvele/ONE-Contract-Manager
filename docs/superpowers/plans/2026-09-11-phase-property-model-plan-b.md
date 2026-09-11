# Phase & Property Model — Plan B (Configurations, Per-Phase Pricing)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Price a project by phase, and let a unit be an unpriced configuration (name, sqft, $/ft range) rather than a catalog model.

**Architecture:** A `unit_configurations` table sits beside `home_models` as a second source for a unit's price, joined by COALESCE in the two places that read unit pricing. `calculateProjectPricing` gains a `phases[]` array alongside its existing flat fields, which survive unchanged as project rollups. The per-phase milestone math — retainage against on-site scope, percentages normalised to 100 — is extracted as pure functions and is the only code in this branch with real tests.

**Tech Stack:** Express 5, Drizzle ORM (`drizzle-orm/node-postgres`), PostgreSQL, zod, React 18 + TanStack Query v5, Shadcn UI, Tailwind, **vitest** (introduced by Task 1).

**Spec:** [`docs/superpowers/specs/2026-09-10-phase-property-model-design.md`](../specs/2026-09-10-phase-property-model-design.md)

**Predecessor:** [`2026-09-10-phase-property-model-plan-a.md`](2026-09-10-phase-property-model-plan-a.md) — landed `phases`, `properties`, `project_units.propertyId`/`unitRole`, their CRUD routes, and the Step 4 property/phase editor. Read its "Deferred to later plans" table; two of its rows are Tasks 6 and 7 here.

## Deviation from the spec's implementation order

The spec orders this work as stage 3 (per-phase pricing) then stage 4 (configurations). **This plan reverses them.** Configurations change how a unit's offsite price is resolved, and the per-phase rollup reads that same resolution — doing pricing first means writing the rollup against models only, then rewriting it for configurations one task later. Configurations land first so the rollup is written once against the final shape. Nothing else about the spec's order changes.

## Global Constraints

- **Money is integers in cents.** `pricePerSqFtLow`/`High` are cents per square foot; `derivedOffsitePrice` is cents. Never store or calculate in dollars.
- **All math uses the HIGH end of a configuration's range.** The range is displayed; the high value is what every total, milestone and contract figure is computed from. This is a product decision recorded in the spec, not an implementation preference.
- **Dates are `text` in `YYYY-MM-DD`.**
- **`requireAuth` on every route file.** Route errors are `res.status(4xx).json({ error: "message" })`, never `{ message }`.
- **Every table carries `organizationId`**, every query filters on `req.organizationId`, and a client-supplied foreign key is verified to belong to the caller's organization *and* project before use. Plan A's `propertyAccessible` / `phaseAccessible` helpers are the shape to follow.
- **ESM only.** Shadcn UI primitives only on the client; no new UI libraries.
- **Plan mode is mandatory for schema changes** (`CLAUDE.md`). Task 2 edits `shared/schema.ts`.
- **`npm run check` (bare `tsc`) must stay at 13 pre-existing errors.** Check with `npm run check 2>&1 | grep -c "error TS"`. From Task 1 onward `npm test` must also pass with pristine output.
- **Commit messages carry no AI attribution.** No `Co-Authored-By`, no mention of Claude, Claude Code or Anthropic (`CLAUDE.md`, and a plugin hook blocks the common forms). Imperative-mood subjects.
- **Comment policy:** a comment is allowed only for a suppression with its reason, an external fact, a deviation where the obvious version breaks, a measurement with provenance, or `TODO: <ticket> - <what>`.

## Prerequisites

- Local Postgres running with the `dvele` database at Plan A's schema (`brew services start postgresql@14`; `npm run db:push`).
- `organizations` row with `id = 1` present. `scripts/seed_mvp.ts` is broken — it references a dropped `users` table and never loads dotenv — so insert it directly if starting fresh.
- Browser verification is not possible for an agent: every `/api` route is Cognito-gated. UI tasks gate on `tsc`, `npm test` and review; the human walks the click-through.

---

## Task 1: Test harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `server/services/__tests__/pricing-math.test.ts`
- Create: `server/services/pricingMath.ts`

**Interfaces:**
- Produces: `npm test`; `server/services/pricingMath.ts` exporting `buildMilestoneSchedule` and the `ScheduledMilestone` type, consumed by Task 5.

This repo has no test suite and `tsc` has been its only gate. Tasks 5's milestone math decides money on a signed contract, which is why it gets real tests and the rest of this plan does not.

- [ ] **Step 1: Add vitest**

```bash
npm install --save-dev vitest
```

Add to `package.json` scripts, beside the existing `check`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Add the config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@shared": new URL("./shared", import.meta.url).pathname },
  },
});
```

- [ ] **Step 3: Write the failing tests**

Create `server/services/__tests__/pricing-math.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildMilestoneSchedule } from "../pricingMath";

describe("buildMilestoneSchedule", () => {
  it("issues the six milestones from the Zaca agreement, totalling 100%", () => {
    const result = buildMilestoneSchedule(12_500_000_00);
    expect(result.map((m) => m.name)).toEqual([
      "Signing Deposit",
      "Green Light",
      "Production Start",
      "Production Midpoint",
      "Delivery",
      "Retainage",
    ]);
    expect(result.map((m) => m.percentage)).toEqual([20, 20, 20, 20, 15, 5]);
    expect(result.reduce((s, m) => s + m.percentage, 0)).toBe(100);
  });

  it("includes retainage regardless of completion model", () => {
    // The percentages are model-independent; only phaseValue differs by model,
    // and that is computed before this function is called. Zaca is CRC and its
    // issued schedule carries retainage, so there is no CRC-specific variant.
    expect(buildMilestoneSchedule(1_000_000_00).some((m) => m.name === "Retainage")).toBe(true);
  });

  it("makes amounts sum to the phase value exactly, with no lost cent", () => {
    const phaseValue = 14_300_000_01;
    const result = buildMilestoneSchedule(phaseValue);
    expect(result.reduce((s, m) => s + m.amount, 0)).toBe(phaseValue);
  });

  it("leaves retainage's amount exact and puts the rounding residual on Delivery", () => {
    const phaseValue = 14_300_000_01;
    const result = buildMilestoneSchedule(phaseValue);
    const delivery = result[4];
    const retainage = result[5];

    expect(retainage.amount).toBe(Math.round((phaseValue * 5) / 100));
    expect(delivery.amount).not.toBe(Math.round((phaseValue * 15) / 100));
  });

  it("reproduces the issued Zaca figures for a phase worth its contract total", () => {
    // Sanity-check against the real agreement: 20% of $14,596,900 is $2,919,380
    // and 5% is $729,845. Guards the percentages against a silent edit.
    const result = buildMilestoneSchedule(14_596_900_00);
    expect(result[0].amount).toBe(2_919_380_00);
    expect(result[4].amount).toBe(2_189_535_00);
    expect(result[5].amount).toBe(729_845_00);
  });

  it("returns no milestones for a phase worth nothing", () => {
    expect(buildMilestoneSchedule(0)).toEqual([]);
  });
});
```

- [ ] **Step 4: Run them and watch them fail**

```bash
npm test
```

Expected: failures resolving `../pricingMath` — the module does not exist yet. That is the RED state; record the output.

- [ ] **Step 5: Write the module**

Create `server/services/pricingMath.ts`:

```ts
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
```

- [ ] **Step 6: Run them and watch them pass**

```bash
npm test
```

Expected: all tests pass, output pristine — no warnings, no stray logging. Record the output.

- [ ] **Step 7: Confirm the type gate held**

```bash
npm run check 2>&1 | grep -c "error TS"
```

Expected: `13`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts server/services/pricingMath.ts server/services/__tests__/pricing-math.test.ts
git commit -m "Add vitest and extract pure milestone math"
```

---

## Task 2: `unit_configurations` schema

**Files:**
- Modify: `shared/schema.ts`

**Interfaces:**
- Produces: `unitConfigurations` table; `project_units.configurationId`; types `UnitConfiguration`, `NewUnitConfiguration`.

- [ ] **Step 1: Enter plan mode**

`CLAUDE.md` requires it for schema changes. Present the definition and get approval before editing.

- [ ] **Step 2: Add the table**

After the `properties` definition in `shared/schema.ts`:

```ts
export const unitConfigurations = pgTable("unit_configurations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  name: text("name").notNull(),
  sqFt: integer("sq_ft").notNull(),
  pricePerSqFtLow: integer("price_per_sq_ft_low").notNull(),
  pricePerSqFtHigh: integer("price_per_sq_ft_high").notNull(),
  derivedOffsitePrice: integer("derived_offsite_price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

`pricePerSqFtLow`/`High` are cents per square foot. `derivedOffsitePrice` is `sqFt * pricePerSqFtHigh`, recomputed on every write — never trusted from the client.

- [ ] **Step 3: Add the column to `projectUnits`**

Beside the existing `propertyId`:

```ts
  configurationId: integer("configuration_id").references(() => unitConfigurations.id),
```

Exactly one of `modelId` / `configurationId` is set. Enforced in the route by zod, not by a DB constraint — `drizzle-kit push` is the deploy path and check constraints do not survive it cleanly.

- [ ] **Step 4: Add relations and types**

```ts
export const unitConfigurationsRelations = relations(unitConfigurations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [unitConfigurations.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [unitConfigurations.projectId],
    references: [projects.id],
  }),
  projectUnits: many(projectUnits),
}));
```

Extend `projectUnitsRelations` with:

```ts
  configuration: one(unitConfigurations, {
    fields: [projectUnits.configurationId],
    references: [unitConfigurations.id],
  }),
```

And the exports:

```ts
export type UnitConfiguration = typeof unitConfigurations.$inferSelect;
export type NewUnitConfiguration = typeof unitConfigurations.$inferInsert;
```

- [ ] **Step 5: Verify and push**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 13
npm test                                   # expect Task 1's tests still passing
npm run db:push
psql -d dvele -c "\d unit_configurations" -c "\d project_units"
```

Expected: the table exists with all seven columns; `project_units` shows `configuration_id` with its FK.

- [ ] **Step 6: Commit**

```bash
git add shared/schema.ts
git commit -m "Add unit configurations table"
```

---

## Task 3: Configuration CRUD route

**Files:**
- Create: `server/routes/unit-configurations.ts`
- Modify: `server/routes/index.ts`

**Interfaces:**
- Consumes: `unitConfigurations` from Task 2.
- Produces: `GET|POST /api/projects/:projectId/unit-configurations`, `PATCH|DELETE /api/unit-configurations/:id`. Every write recomputes `derivedOffsitePrice` server-side.

- [ ] **Step 1: Write the route**

Follow `server/routes/properties.ts` exactly — same `parseId` strictness (`/^[1-9]\d*$/`), same project-ownership check before insert, same empty-PATCH 400, same `and(eq(id), eq(organizationId))` predicate inside the `UPDATE`, same `{ error }` shape.

```ts
import { Router, Request, Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { projectUnits, projects, unitConfigurations } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";

/**
 * Unpriced unit configurations — a named square-footage and price-per-square-foot
 * range standing in for a catalog model that does not exist yet.
 *
 * `derivedOffsitePrice` is always computed here from sqFt x the HIGH end of the
 * range and never accepted from the client: it is what every downstream total,
 * milestone and contract figure is calculated from.
 */

const router = Router();

router.use(requireAuth);

const ConfigurationInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    sqFt: z.number().int().positive().max(100_000),
    pricePerSqFtLow: z.number().int().nonnegative(),
    pricePerSqFtHigh: z.number().int().nonnegative(),
  })
  .refine((c) => c.pricePerSqFtHigh >= c.pricePerSqFtLow, {
    message: "pricePerSqFtHigh must be greater than or equal to pricePerSqFtLow",
  });

function parseId(raw: string | string[]): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return /^[1-9]\d*$/.test(value) ? parseInt(value, 10) : null;
}

function derivePrice(sqFt: number, pricePerSqFtHigh: number): number {
  return sqFt * pricePerSqFtHigh;
}

router.get("/projects/:projectId/unit-configurations", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) return res.status(400).json({ error: "Invalid project id" });

    const rows = await db
      .select()
      .from(unitConfigurations)
      .where(
        and(
          eq(unitConfigurations.projectId, projectId),
          eq(unitConfigurations.organizationId, req.organizationId),
        ),
      )
      .orderBy(asc(unitConfigurations.id));

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch unit configurations:", error);
    res.status(500).json({ error: "Failed to fetch unit configurations" });
  }
});

router.post("/projects/:projectId/unit-configurations", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) return res.status(400).json({ error: "Invalid project id" });

    const parsed = ConfigurationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const [project] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) return res.status(404).json({ error: "Project not found" });
    // `projects.organizationId` is nullable and pre-multi-tenancy rows have it unset.
    if (project.organizationId !== null && project.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Project not found" });
    }

    const [created] = await db
      .insert(unitConfigurations)
      .values({
        organizationId: req.organizationId,
        projectId,
        ...parsed.data,
        derivedOffsitePrice: derivePrice(parsed.data.sqFt, parsed.data.pricePerSqFtHigh),
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error("Failed to create unit configuration:", error);
    res.status(500).json({ error: "Failed to create unit configuration" });
  }
});

router.patch("/unit-configurations/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid configuration id" });

    const parsed = ConfigurationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const [updated] = await db
      .update(unitConfigurations)
      .set({
        ...parsed.data,
        derivedOffsitePrice: derivePrice(parsed.data.sqFt, parsed.data.pricePerSqFtHigh),
      })
      .where(
        and(
          eq(unitConfigurations.id, id),
          eq(unitConfigurations.organizationId, req.organizationId),
        ),
      )
      .returning();

    if (!updated) return res.status(404).json({ error: "Unit configuration not found" });

    res.json(updated);
  } catch (error) {
    console.error("Failed to update unit configuration:", error);
    res.status(500).json({ error: "Failed to update unit configuration" });
  }
});

router.delete("/unit-configurations/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid configuration id" });

    const [configuration] = await db
      .select()
      .from(unitConfigurations)
      .where(eq(unitConfigurations.id, id));

    if (!configuration || configuration.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Unit configuration not found" });
    }

    const attached = await db
      .select({ id: projectUnits.id })
      .from(projectUnits)
      .where(eq(projectUnits.configurationId, id));

    if (attached.length > 0) {
      return res.status(409).json({
        error: "Remove the units using this configuration before deleting it",
      });
    }

    await db.delete(unitConfigurations).where(eq(unitConfigurations.id, id));

    res.json({ message: "Unit configuration deleted" });
  } catch (error) {
    console.error("Failed to delete unit configuration:", error);
    res.status(500).json({ error: "Failed to delete unit configuration" });
  }
});

export default router;
```

`PATCH` takes the full object rather than a partial, because `derivedOffsitePrice` depends on two fields at once — a partial update would have to re-read the row to recompute it, and the editor sends the whole configuration anyway.

- [ ] **Step 2: Register it**

In `server/routes/index.ts`, beside the Plan A routers:

```ts
import unitConfigurationsRouter from "./unit-configurations";
```
```ts
router.use(unitConfigurationsRouter);
```

- [ ] **Step 3: Verify**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 13
npm test                                   # expect passing
```

Then prove the derivation and the guard rail with a throwaway script (export `DATABASE_URL="postgresql://postgres@localhost:5432/dvele"`; delete the script afterwards):

1. A configuration of 4000 sqft at 45000 cents/sqft high stores `derivedOffsitePrice = 180_000_000` cents ($1.8M).
2. A client-supplied `derivedOffsitePrice` in the body is ignored — the stored value is still the computed one.
3. `pricePerSqFtHigh < pricePerSqFtLow` is rejected with 400.
4. Deleting a configuration a unit still references returns 409.

- [ ] **Step 4: Commit**

```bash
git add server/routes/unit-configurations.ts server/routes/index.ts
git commit -m "Add unit configuration CRUD routes"
```

---

## Task 4: Resolve a unit's price from either source

**Files:**
- Modify: `server/services/pricingEngine.ts:52-68`
- Modify: `server/routes/helpers.ts:62-87`

**Interfaces:**
- Consumes: `unit_configurations` from Task 2.
- Produces: both readers return a unit's offsite price and specs regardless of whether it points at a model or a configuration. Task 5 depends on this.

These are the only two places that read a unit's pricing. Both currently `LEFT JOIN home_models` alone, so a configuration-backed unit prices at zero and renders as "Unknown Model".

- [ ] **Step 1: Extend the pricing engine's query**

In `server/services/pricingEngine.ts`, replace the units query with:

```sql
SELECT
  pu.id as unit_id,
  pu.quantity,
  pu.base_price_snapshot,
  pu.customization_total,
  pu.property_id,
  hm.id as model_id,
  COALESCE(hm.name, uc.name) as model_name,
  COALESCE(hm.offsite_base_price, uc.derived_offsite_price) as offsite_base_price,
  hm.onsite_est_price,
  hm.shipping_set_price
FROM project_units pu
LEFT JOIN home_models hm ON pu.model_id = hm.id
LEFT JOIN unit_configurations uc ON pu.configuration_id = uc.id
WHERE pu.project_id = $1
```

`onsite_est_price` and `shipping_set_price` stay model-only and resolve to NULL for a configuration — a configuration prices offsite work only, which the existing `|| 0` guards already handle. `property_id` is selected here for Task 5.

- [ ] **Step 2: Extend the mapper's query**

In `server/routes/helpers.ts`, replace the units query and its mapping:

```sql
SELECT pu.id, pu.project_id, pu.model_id, pu.configuration_id, pu.unit_label, pu.quantity,
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
ORDER BY pu.id
```

```ts
  const projectUnitsList = unitsWithModels.rows.map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    homeModelId: row.model_id,
    unitLabel: row.unit_label || '',
    quantity: row.quantity || 1,
    basePriceSnapshot: row.base_price_snapshot || 0,
    onsiteEstimateSnapshot: row.customization_total || 0,
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
```

The two price-per-foot fields are null for a catalog model and populated for a configuration, which is how the exhibit generators in Plan E will know to render a range instead of a single figure. Nothing reads them yet.

- [ ] **Step 3: Verify**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 13
npm test                                   # expect passing
```

Then, with a throwaway script: create a project with one model-backed unit and one configuration-backed unit, call `calculateProjectPricing`, and confirm `breakdown.totalOffsite` equals the model's price plus the configuration's `derivedOffsitePrice`. Confirm `getProjectWithRelations` returns a populated `homeModel` for both, with the price-per-foot fields null on the model-backed one.

- [ ] **Step 4: Commit**

```bash
git add server/services/pricingEngine.ts server/routes/helpers.ts
git commit -m "Resolve unit pricing from models or configurations"
```

---

## Task 5: Per-phase rollup

**Files:**
- Modify: `server/services/pricingEngine.ts`
- Create: `server/services/__tests__/phase-rollup.test.ts`

**Interfaces:**
- Consumes: `pricingMath.ts` from Task 1; the extended query from Task 4.
- Produces: `phases[]` on `PricingSummary`. Plans C, D and E all read it.

Additive only. `breakdown`, `paymentSchedule`, `projectBudget`, `contractValue` and every other existing key keeps its current meaning as a project rollup, because `mapper.ts`, `tableGenerators.ts` and the override block in `routes/contracts.ts` all read them.

- [ ] **Step 1: Write the failing test**

Create `server/services/__tests__/phase-rollup.test.ts`. Test `buildPhaseRollups` — a pure function taking already-fetched rows, so it needs no database:

```ts
import { describe, expect, it } from "vitest";
import { buildPhaseRollups } from "../pricingEngine";

const PHASES = [
  { id: 1, phaseNumber: 1, name: "Phase 1" },
  { id: 2, phaseNumber: 2, name: "Phase 2" },
];
const PROPERTIES = [
  { id: 10, phaseId: 1, propertyCode: "P-1" },
  { id: 11, phaseId: 1, propertyCode: "P-2" },
  { id: 12, phaseId: 2, propertyCode: "P-3" },
];
const UNITS = [
  { propertyId: 10, quantity: 1, offsiteBasePrice: 600_000_00, onsiteEstPrice: 100_000_00, shippingSetPrice: 0, customizationTotal: 0 },
  { propertyId: 11, quantity: 1, offsiteBasePrice: 400_000_00, onsiteEstPrice: 100_000_00, shippingSetPrice: 0, customizationTotal: 0 },
  { propertyId: 12, quantity: 1, offsiteBasePrice: 500_000_00, onsiteEstPrice: 100_000_00, shippingSetPrice: 0, customizationTotal: 0 },
];

describe("buildPhaseRollups", () => {
  it("sums a phase from the units of all its properties", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC");
    expect(phase1.breakdown.offsite).toBe(1_000_000_00);
    expect(phase1.properties.map((p) => p.propertyCode)).toEqual(["P-1", "P-2"]);
  });

  it("excludes on-site from phase value under CRC and includes it under CMOS", () => {
    const crc = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC")[0];
    const cmos = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS")[0];
    expect(crc.phaseValue).toBe(1_000_000_00);
    expect(cmos.phaseValue).toBe(1_200_000_00);
  });

  it("bills the same six percentages under either model", () => {
    const crc = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC")[0];
    const cmos = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS")[0];
    expect(crc.milestones.map((m) => m.percentage)).toEqual([20, 20, 20, 20, 15, 5]);
    expect(cmos.milestones.map((m) => m.percentage)).toEqual([20, 20, 20, 20, 15, 5]);
  });

  it("carries retainage under CRC, against the CRC phase value", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC");
    const retainage = phase1.milestones.find((m) => m.name === "Retainage");
    // 5% of the CRC phase value (1,000,000 — on-site excluded), not of on-site.
    expect(retainage?.amount).toBe(50_000_00);
  });

  it("bills a larger retainage under CMOS because on-site is in the base", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS");
    const retainage = phase1.milestones.find((m) => m.name === "Retainage");
    // 5% of 1,200,000 — the same percentage against a base that includes on-site.
    expect(retainage?.amount).toBe(60_000_00);
  });

  it("yields an empty array when no phases exist, preserving legacy behaviour", () => {
    expect(buildPhaseRollups([], [], UNITS, "CRC")).toEqual([]);
  });

  it("ignores units whose property is not attached to any phase", () => {
    const orphan = [...UNITS, { propertyId: null, quantity: 1, offsiteBasePrice: 999_000_00, onsiteEstPrice: 0, shippingSetPrice: 0, customizationTotal: 0 }];
    const total = buildPhaseRollups(PHASES, PROPERTIES, orphan, "CRC").reduce((s, p) => s + p.breakdown.offsite, 0);
    expect(total).toBe(1_500_000_00);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

```bash
npm test
```

Expected: `buildPhaseRollups` is not exported. Record the RED output.

- [ ] **Step 3: Implement `buildPhaseRollups`**

Export it from `server/services/pricingEngine.ts`, above `calculateProjectPricing`:

The milestone percentages are the same under both completion models — that is settled
in `pricingMath.ts` and needs no branching here. What *does* differ by model is
`phaseValue`, which includes on-site cost only under CMOS, so the same percentages
bill against different bases.

```ts

export function buildPhaseRollups(
  phaseRows: PhaseRow[],
  propertyRows: PropertyRow[],
  unitRows: UnitRow[],
  serviceModel: "CRC" | "CMOS"
): PhaseRollup[] {
  return phaseRows.map((phase) => {
    const properties = propertyRows.filter((p) => p.phaseId === phase.id);
    const propertyIds = new Set(properties.map((p) => p.id));
    const units = unitRows.filter((u) => u.propertyId !== null && propertyIds.has(u.propertyId));

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

    const phaseValue =
      breakdown.offsite +
      breakdown.shipping +
      breakdown.customizations +
      (serviceModel === "CMOS" ? breakdown.onsite : 0);

    return {
      phaseId: phase.id,
      phaseNumber: phase.phaseNumber,
      name: phase.name,
      properties: properties.map((p) => ({ propertyCode: p.propertyCode })),
      breakdown,
      phaseValue,
      milestones: buildMilestoneSchedule(phaseValue),
    };
  });
}
```

Declare `PhaseRow`, `PropertyRow`, `UnitRow` and `PhaseRollup` as exported interfaces above it, and import `buildMilestoneSchedule` and `ScheduledMilestone` from `./pricingMath`.

- [ ] **Step 4: Run and watch it pass**

```bash
npm test
```

Expected: all tests pass, output pristine.

- [ ] **Step 5: Wire it into `calculateProjectPricing`**

Fetch phases and properties for the project, call `buildPhaseRollups` with the unit rows already loaded, and add `phases` to the returned object. Add `phases: PhaseRollup[]` to the `PricingSummary` interface. Change nothing else in the return.

A project with no phases gets `phases: []` and every existing field keeps its current value — that is the back-compat guarantee the spec makes and it must hold.

- [ ] **Step 6: Verify**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 13
npm test
```

Then, with a throwaway script against a real project: build Zaca's shape — 3 phases, 7 properties assigned 2/2/3, two units per property — and confirm that `Σ phases[].phaseValue` equals `contractValue − designFee`, and that a project with no phases returns `phases: []` with its other fields unchanged from before this task.

- [ ] **Step 7: Commit**

```bash
git add server/services/pricingEngine.ts server/services/__tests__/phase-rollup.test.ts
git commit -m "Add per-phase pricing rollups"
```

---

## Task 6: Step 4 unit entry — configurations and property attachment

**Files:**
- Create: `client/src/components/wizard/UnitAttachmentEditor.tsx`
- Modify: `client/src/components/wizard/steps/Step4SiteAndHome.tsx`
- Modify: `server/routes/projects.ts:555` and `:587`

**Interfaces:**
- Consumes: Tasks 3 and 4; Plan A's `POST /api/project-units` role guard.
- Produces: the first UI that attaches a unit to a property and the first that creates a configuration.

**Read `.agents/skills/web-design-guidelines/SKILL.md` before writing the component** — it is installed but not loadable as a skill here, so read the file. Where its rules conflict with code in this plan, **the skill wins**; record the deviation in your report. Plan A had a finding here precisely because that tie-break was not applied.

**The route detail that Plan A recorded:** the wizard does *not* create units through `POST /api/project-units`. It uses `POST /api/projects/:projectId/units` (`server/routes/projects.ts:587`) and reads through `GET /api/projects/:projectId/units` (`:555`), and neither knows about `property_id`, `unit_role` or `configuration_id` — the GET's explicit column list omits them.

- [ ] **Step 1: Extend the two project-scoped unit handlers**

`GET /api/projects/:projectId/units` must return `property_id`, `unit_role` and `configuration_id`, plus the configuration's name and sqft when present, so the editor can render what a unit is attached to.

`POST /api/projects/:projectId/units` must accept `propertyId`, `unitRole` and `configurationId`, applying the same guards Plan A built into `POST /api/project-units`: `unitRole` validated against `home`/`adu` whenever present, the property verified to belong to the caller's organization **and** this project, and the one-home-one-ADU conflict rejected with 409. Reuse the helpers rather than reimplementing them — extract `propertyAccessible` and `roleConflict` from `server/routes/project-units.ts` into `server/lib/unit-attachment.ts` and import from both.

Exactly one of `modelId` / `configurationId` must be set; reject a body with both or neither with 400.

- [ ] **Step 2: Write the component**

`UnitAttachmentEditor` renders, per property, its home and ADU slots, each either empty or showing the attached unit. Adding a unit to a slot offers two sources: a catalog model from `/api/home-models`, or **New Configuration** — a small form taking name, square footage, and low and high price per square foot, which POSTs to `/api/projects/:projectId/unit-configurations` and then attaches the resulting unit.

Show the configuration's range wherever its price appears — `$450–$520/sqft · 4,000 sqft · $1,800,000` — with the high-derived total labelled so nobody reads it as a quote. Named export, no default. Query keys follow the repo convention: `["/api/projects", projectId, "units"]`.

- [ ] **Step 3: Mount it**

In `Step4SiteAndHome.tsx`, render `<UnitAttachmentEditor projectId={draftProjectId} />` directly beneath `PropertyPhaseEditor`, so the page reads: properties and phases, then what sits on each property, then the legacy quantity-based list.

- [ ] **Step 4: Verify**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 13
npm test
```

The click-through is the human's. In your report, state which accessibility rules you applied, and confirm by reading: does the configuration form send cents (not dollars), does the range render low-to-high, and is `derivedOffsitePrice` never sent from the client?

- [ ] **Step 5: Commit**

```bash
git add server/lib/unit-attachment.ts server/routes/projects.ts server/routes/project-units.ts client/src/components/wizard/UnitAttachmentEditor.tsx client/src/components/wizard/steps/Step4SiteAndHome.tsx
git commit -m "Add unit attachment and configuration entry to step 4"
```

---

## Task 7: Phase delete and rename

**Files:**
- Modify: `client/src/components/wizard/PropertyPhaseEditor.tsx`

**Interfaces:**
- Consumes: `DELETE /api/phases/:id` and `PATCH /api/phases/:id`, both built in Plan A and unreachable from the UI until now.

A misclick on "Add Phase" is currently unrecoverable, and by Plan D a stray empty phase becomes a milestone block billing 100% of $0 in Exhibit A.5.

- [ ] **Step 1: Add rename**

An editable phase name, saving on blur through `PATCH /api/phases/:id`. Leave it blank and the existing `phase.name || \`Phase ${phase.phaseNumber}\`` fallback renders the server-assigned number — so clearing a name is how you return to the default, not a validation error.

- [ ] **Step 2: Add delete**

Behind `DeleteConfirmDialog`, matching the property delete Plan A added. The confirmation must say what happens to the phase's properties: they are unassigned, not deleted — that is what `DELETE /api/phases/:id` does, and a user who expects a cascade would otherwise be guessing.

- [ ] **Step 3: Verify**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 13
npm test
```

Confirm by reading that both mutations invalidate the phases and properties keys, and that the delete's error path surfaces through the existing `aria-live` region rather than a second one.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/wizard/PropertyPhaseEditor.tsx
git commit -m "Add phase rename and delete to the property editor"
```

---

## Deliverable

A project prices by phase, and a unit can be an unpriced configuration. Zaca's three phases each carry their own value and milestone set, and the 1,200 sqft ADU and 4,000 sqft home — neither of which exists in the catalog — are enterable at a price-per-foot range.

**The generated contract still does not change.** `mapper.ts` and `tableGenerators.ts` are untouched by this plan; `phases[]` exists and nothing reads it. Exhibit rewiring is Plan E.

## Deferred to later plans

| Item | Plan |
|---|---|
| Timeline derivation, phase date overrides becoming live, Step 6 restructure | C |
| `milestones.phaseId`, the milestones route, per-phase editor in Step 7 | D |
| Exhibit rewiring script, the twelve document defects, signature entities | E |
| Reconciliation check refusing generation when `Σ phaseValue ≠ contractValue − designFee` | D, with the milestone work |
| Rendering the configuration range in Exhibits A.2 and B.1 (the fields land in Task 4, unread) | E |
| Detaching a unit from a property without deleting it — `COALESCE` cannot express it | not yet scoped |
| Committing `.agents/` and `skills-lock.json` so Plans C and D have the design skill | prerequisite for C |
