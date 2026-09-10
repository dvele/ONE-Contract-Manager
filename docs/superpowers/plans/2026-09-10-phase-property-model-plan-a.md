# Phase & Property Model — Plan A (Schema, CRUD, Step 4 Entry)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a project's properties and phases representable — Zaca Preserve's 7 properties, each with a home and an ADU, grouped into 3 phases.

**Architecture:** Two additive tables (`phases`, `properties`) plus two nullable columns on `project_units`. A property belongs to one phase; a phase holds any number of properties. Units attach to a property with a role of `home` or `adu`, at most one of each. Nothing reads the new tables yet — the generated contract is byte-identical after this plan.

**Tech Stack:** Express 5, Drizzle ORM (`drizzle-orm/node-postgres`), PostgreSQL, zod, React 18 + TanStack Query v5, Shadcn UI, Tailwind.

**Spec:** [`docs/superpowers/specs/2026-09-10-phase-property-model-design.md`](../specs/2026-09-10-phase-property-model-design.md)

## Global Constraints

- **Money is integers in cents.** Never store or calculate in dollars (`CLAUDE.md`). No monetary columns in this plan, but the rule holds for any that appear.
- **Dates are `text` in `YYYY-MM-DD`**, matching `project_details`.
- **Plan mode is mandatory for schema changes** (`CLAUDE.md`). Task 1 edits `shared/schema.ts`; the executor must be in plan mode for it and get approval before writing.
- **`requireAuth` on every new route file** — `router.use(requireAuth)` from `server/middleware/auth.ts`. Never hand-roll auth in a handler.
- **Route-level errors are `res.status(4xx).json({ error: "message" })`.** Do not use `{ message }` in a route file.
- **ESM only.** `import`/`export`; never `require()`.
- **Every table carries `organizationId`** and every query filters on `req.organizationId`.
- **The gate is `npm run check` (bare `tsc`). There is no test suite.** The repo currently has **13 pre-existing errors** — that count must not increase. `grep -c "error TS"` is the check.
- **Commit messages carry no AI attribution.** `CLAUDE.md` forbids `Co-Authored-By` trailers and any mention of Claude, Claude Code or Anthropic in git history. This conflicts with the session's default attribution instruction; the repo's own rule wins. Commit messages below follow `CLAUDE.md`.
- **Use Drizzle for new route files**, following `server/routes/financials.ts`. Do **not** copy the raw `pg.Pool` + hand-aliased SQL style of `server/routes/project-units.ts`; that file predates the Drizzle convention and its column aliasing is a recurring source of drift.

---

## Prerequisite: local dev is currently non-functional

`npm run dev` crashes on startup with `ECONNREFUSED 127.0.0.1:5432` — Postgres 14 is installed via Homebrew but not running, so no manual verification step in this plan can be performed until it is. Confirmed identical on a clean checkout, so this is environmental, not a regression.

- [ ] **Step 1: Start Postgres and create the database**

```bash
brew services start postgresql@14
createdb dvele
```

- [ ] **Step 2: Push the current schema and seed**

```bash
npm run db:push
npx tsx scripts/seed_mvp.ts
npx tsx scripts/seed_variables.ts
npx tsx scripts/seed-components.ts
```

- [ ] **Step 3: Confirm the server boots**

```bash
npm run dev
```

Expected: `serving on port 5000`, no `ECONNREFUSED`. Sign in through the app at `http://localhost:5000` — every `/api` route requires a valid Cognito Bearer token, so an unauthenticated `curl` returns `401` and is not a useful check.

---

## Task 1: Schema — `phases` and `properties`

**Files:**
- Modify: `shared/schema.ts` (new tables after `projectUnits`, ~line 66; relations near `projectUnitsRelations` ~line 707; type exports ~line 866)

**Interfaces:**
- Consumes: nothing.
- Produces: `phases`, `properties` table objects; types `Phase`, `NewPhase`, `Property`, `NewProperty`; columns `projectUnits.propertyId`, `projectUnits.unitRole`.

- [ ] **Step 1: Enter plan mode**

`CLAUDE.md` requires plan mode for schema changes. Present the table definitions below and get approval before editing.

- [ ] **Step 2: Add the two tables**

Insert after the `projectUnits` definition in `shared/schema.ts`:

```ts
// =============================================================================
// PHASES & PROPERTIES (Multi-Tenant)
// =============================================================================

export const phases = pgTable("phases", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  phaseNumber: integer("phase_number").notNull(),
  name: text("name"),
  startOffsetDays: integer("start_offset_days").default(0),
  manufacturingDays: integer("manufacturing_days"),
  onsiteDays: integer("onsite_days"),
  deliveryLagDays: integer("delivery_lag_days").default(0),
  factoryStartOverride: text("factory_start_override"),
  factoryCompleteOverride: text("factory_complete_override"),
  deliveryWindowOverride: text("delivery_window_override"),
  targetCoOverride: text("target_co_override"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  unique().on(t.projectId, t.phaseNumber),
]);

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  phaseId: integer("phase_id").references(() => phases.id),
  propertyCode: text("property_code").notNull(),
  apn: text("apn"),
  lotNumber: text("lot_number"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  unique().on(t.projectId, t.propertyCode),
]);
```

The date override columns are `text` rather than `date`, matching `project_details`. They are unused until Plan C but ship now so the schema pushes once.

- [ ] **Step 3: Add the two columns to `projectUnits`**

Inside the existing `projectUnits` definition, after `customizationTotal`:

```ts
  propertyId: integer("property_id").references(() => properties.id),
  unitRole: text("unit_role"), // 'home' | 'adu'
```

`projectUnits` is declared *before* `properties`, so this is a forward reference. That is safe — Drizzle's `.references()` takes a thunk which is not evaluated until schema construction completes.

- [ ] **Step 4: Add relations**

Next to `projectUnitsRelations`:

```ts
export const phasesRelations = relations(phases, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [phases.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [phases.projectId],
    references: [projects.id],
  }),
  properties: many(properties),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [properties.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [properties.projectId],
    references: [projects.id],
  }),
  phase: one(phases, {
    fields: [properties.phaseId],
    references: [phases.id],
  }),
  projectUnits: many(projectUnits),
}));
```

Extend `projectUnitsRelations` with:

```ts
  property: one(properties, {
    fields: [projectUnits.propertyId],
    references: [properties.id],
  }),
```

- [ ] **Step 5: Add type exports**

Beside the existing `ProjectUnit` exports:

```ts
export type Phase = typeof phases.$inferSelect;
export type NewPhase = typeof phases.$inferInsert;

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
```

- [ ] **Step 6: Verify the gate did not move**

```bash
npm run check 2>&1 | grep -c "error TS"
```

Expected: `13`. Any higher number is a regression introduced by this task.

- [ ] **Step 7: Push the schema**

```bash
npm run db:push
```

Then confirm both tables exist:

```bash
psql dvele -c "\d phases" -c "\d properties" -c "\d project_units"
```

Expected: `phases` and `properties` present; `project_units` shows `property_id` and `unit_role`.

- [ ] **Step 8: Commit**

```bash
git add shared/schema.ts
git commit -m "Add phases and properties tables"
```

---

## Task 2: Phase CRUD route

**Files:**
- Create: `server/routes/phases.ts`
- Modify: `server/routes/index.ts`

**Interfaces:**
- Consumes: `phases` from Task 1.
- Produces: `GET|POST /api/projects/:projectId/phases`, `PATCH|DELETE /api/phases/:id`. A created phase returns the full row including its server-assigned `phaseNumber`.

- [ ] **Step 1: Write the route file**

```ts
import { Router, Request, Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { phases, properties } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";

/**
 * Project phases — the grouping that drives per-phase pricing, scheduling and
 * milestones. A phase holds any number of properties; a property belongs to one
 * phase. `phaseNumber` is assigned by the server, never by the client.
 */

const router = Router();

router.use(requireAuth);

const PhaseInputSchema = z.object({
  name: z.string().trim().max(120).optional(),
  startOffsetDays: z.number().int().min(-365).max(365).optional(),
  manufacturingDays: z.number().int().min(0).max(1095).optional(),
  onsiteDays: z.number().int().min(0).max(1095).optional(),
  deliveryLagDays: z.number().int().min(0).max(365).optional(),
});

function parseId(raw: string | string[]): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

router.get("/projects/:projectId/phases", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const rows = await db
      .select()
      .from(phases)
      .where(
        and(
          eq(phases.projectId, projectId),
          eq(phases.organizationId, req.organizationId),
        ),
      )
      .orderBy(asc(phases.phaseNumber));

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch phases:", error);
    res.status(500).json({ error: "Failed to fetch phases" });
  }
});

router.post("/projects/:projectId/phases", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const parsed = PhaseInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const existing = await db
      .select({ phaseNumber: phases.phaseNumber })
      .from(phases)
      .where(eq(phases.projectId, projectId));

    const nextNumber =
      existing.reduce((max, row) => Math.max(max, row.phaseNumber), 0) + 1;

    const [created] = await db
      .insert(phases)
      .values({
        organizationId: req.organizationId,
        projectId,
        phaseNumber: nextNumber,
        ...parsed.data,
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error("Failed to create phase:", error);
    res.status(500).json({ error: "Failed to create phase" });
  }
});

router.patch("/phases/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid phase id" });

    const parsed = PhaseInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const [updated] = await db
      .update(phases)
      .set(parsed.data)
      .where(eq(phases.id, id))
      .returning();

    if (!updated || updated.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Phase not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Failed to update phase:", error);
    res.status(500).json({ error: "Failed to update phase" });
  }
});

router.delete("/phases/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid phase id" });

    const [phase] = await db.select().from(phases).where(eq(phases.id, id));
    if (!phase || phase.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Phase not found" });
    }

    // Properties outlive their phase; unassigning keeps them editable rather
    // than cascading a delete through the units attached to them.
    await db
      .update(properties)
      .set({ phaseId: null })
      .where(eq(properties.phaseId, id));

    await db.delete(phases).where(eq(phases.id, id));

    res.json({ message: "Phase deleted" });
  } catch (error) {
    console.error("Failed to delete phase:", error);
    res.status(500).json({ error: "Failed to delete phase" });
  }
});

export default router;
```

- [ ] **Step 2: Register the router**

In `server/routes/index.ts`, add the import beside `financialsRouter`:

```ts
import phasesRouter from "./phases";
```

and the mount beside `router.use(financialsRouter);`:

```ts
router.use(phasesRouter);
```

- [ ] **Step 3: Verify the gate**

```bash
npm run check 2>&1 | grep -c "error TS"
```

Expected: `13`.

- [ ] **Step 4: Verify by hand**

With `npm run dev` running and signed in, from the browser console on `localhost:5000`:

```js
await (await fetch('/api/projects/1/phases', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json',
             Authorization: `Bearer ${localStorage.getItem('idToken')}` },
  body: JSON.stringify({ name: 'Phase 1', manufacturingDays: 120 }),
})).json()
```

Expected: a row with `phaseNumber: 1`. Repeat and expect `phaseNumber: 2`. Then `GET /api/projects/1/phases` returns both, ordered. Replace the token lookup if the app stores it under a different key — check `client/src/lib/queryClient.ts` for how `apiRequest` builds the header.

- [ ] **Step 5: Commit**

```bash
git add server/routes/phases.ts server/routes/index.ts
git commit -m "Add phase CRUD routes"
```

---

## Task 3: Property CRUD route

**Files:**
- Create: `server/routes/properties.ts`
- Modify: `server/routes/index.ts`

**Interfaces:**
- Consumes: `properties`, `phases` from Task 1.
- Produces: `GET|POST /api/projects/:projectId/properties`, `PATCH|DELETE /api/properties/:id`. `POST` assigns `propertyCode` as `P-1`…`P-n`; the client never sends it.

- [ ] **Step 1: Write the route file**

```ts
import { Router, Request, Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { properties, projectUnits } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";

/**
 * Project properties — the lots a project builds on, identified as P-1..P-n.
 * `propertyCode` is server-assigned. APN, lot number and address are optional
 * and exist so real identifiers can be attached once they are known.
 */

const router = Router();

router.use(requireAuth);

const PropertyInputSchema = z.object({
  phaseId: z.number().int().positive().nullable().optional(),
  apn: z.string().trim().max(60).optional(),
  lotNumber: z.string().trim().max(60).optional(),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(2).optional(),
  zip: z.string().trim().max(10).optional(),
});

function parseId(raw: string | string[]): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

router.get("/projects/:projectId/properties", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const rows = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.projectId, projectId),
          eq(properties.organizationId, req.organizationId),
        ),
      )
      .orderBy(asc(properties.id));

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch properties:", error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

router.post("/projects/:projectId/properties", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const parsed = PropertyInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const existing = await db
      .select({ propertyCode: properties.propertyCode })
      .from(properties)
      .where(eq(properties.projectId, projectId));

    // Codes are P-<n>; derive the next n from the highest existing suffix so a
    // deleted P-3 does not cause the next property to reuse its code.
    const highest = existing.reduce((max, row) => {
      const suffix = parseInt((row.propertyCode || "").replace(/^P-/, ""), 10);
      return Number.isNaN(suffix) ? max : Math.max(max, suffix);
    }, 0);

    const [created] = await db
      .insert(properties)
      .values({
        organizationId: req.organizationId,
        projectId,
        propertyCode: `P-${highest + 1}`,
        ...parsed.data,
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error("Failed to create property:", error);
    res.status(500).json({ error: "Failed to create property" });
  }
});

router.patch("/properties/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid property id" });

    const parsed = PropertyInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const [updated] = await db
      .update(properties)
      .set(parsed.data)
      .where(eq(properties.id, id))
      .returning();

    if (!updated || updated.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Failed to update property:", error);
    res.status(500).json({ error: "Failed to update property" });
  }
});

router.delete("/properties/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid property id" });

    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id));

    if (!property || property.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Property not found" });
    }

    const attached = await db
      .select({ id: projectUnits.id })
      .from(projectUnits)
      .where(eq(projectUnits.propertyId, id));

    if (attached.length > 0) {
      return res.status(409).json({
        error: "Remove the units attached to this property before deleting it",
      });
    }

    await db.delete(properties).where(eq(properties.id, id));

    res.json({ message: "Property deleted" });
  } catch (error) {
    console.error("Failed to delete property:", error);
    res.status(500).json({ error: "Failed to delete property" });
  }
});

export default router;
```

- [ ] **Step 2: Register the router**

In `server/routes/index.ts`:

```ts
import propertiesRouter from "./properties";
```

```ts
router.use(propertiesRouter);
```

- [ ] **Step 3: Verify the gate**

```bash
npm run check 2>&1 | grep -c "error TS"
```

Expected: `13`.

- [ ] **Step 4: Verify by hand**

Create three properties against project 1 and confirm they come back as `P-1`, `P-2`, `P-3`. Delete `P-2`, create another, and confirm the new one is `P-4` rather than a reused `P-2`. Then `PATCH` one with `{ "phaseId": <id from Task 2> }` and confirm it persists.

- [ ] **Step 5: Commit**

```bash
git add server/routes/properties.ts server/routes/index.ts
git commit -m "Add property CRUD routes"
```

---

## Task 4: Attach units to properties

**Files:**
- Modify: `server/routes/project-units.ts:70-124` (`returningFields`, `POST`, `PATCH`)

**Interfaces:**
- Consumes: `properties` from Task 1; the property routes from Task 3.
- Produces: `POST /api/project-units` and `PATCH /api/project-units/:id` accept `propertyId` and `unitRole`. A property may hold at most one `home` and one `adu`.

This file uses raw `pg.Pool` SQL rather than Drizzle. Do not rewrite it — extend it in place, matching its existing style, so the diff stays reviewable.

- [ ] **Step 1: Extend `returningFields` and `selectFields`**

Add to both string constants (`selectFields` uses the `pu.` prefix, `returningFields` does not):

```
  pu.property_id as "propertyId", pu.unit_role as "unitRole",
```

```
  property_id as "propertyId", unit_role as "unitRole",
```

- [ ] **Step 2: Add the role guard**

Above the `POST` handler:

```ts
const UNIT_ROLES = ["home", "adu"] as const;
type UnitRole = (typeof UNIT_ROLES)[number];

/**
 * A property holds at most one home and one ADU. Returns an error message when
 * the requested role is already taken, or null when the attachment is allowed.
 *
 * @param excludeUnitId - unit being updated, so it does not conflict with itself
 */
async function roleConflict(
  propertyId: number,
  unitRole: UnitRole,
  excludeUnitId: number | null,
): Promise<string | null> {
  const result = await pool.query(
    `SELECT id FROM project_units
     WHERE property_id = $1 AND unit_role = $2 AND ($3::int IS NULL OR id <> $3)`,
    [propertyId, unitRole, excludeUnitId],
  );
  return result.rows.length > 0
    ? `This property already has a ${unitRole}`
    : null;
}
```

- [ ] **Step 3: Replace the `POST` handler body**

The existing handler takes 8 parameters; this adds `$9` and `$10`.

```ts
router.post("/project-units", async (req: Request, res: Response) => {
  try {
    const { projectId, modelId, unitLabel, quantity, basePriceSnapshot,
            customizationTotal, notes, propertyId, unitRole } = req.body;

    if (propertyId != null) {
      if (!UNIT_ROLES.includes(unitRole)) {
        return res.status(400).json({ error: "unitRole must be 'home' or 'adu'" });
      }
      const conflict = await roleConflict(propertyId, unitRole, null);
      if (conflict) return res.status(409).json({ error: conflict });
    }

    const result = await pool.query(
      `INSERT INTO project_units (organization_id, project_id, model_id, unit_label, quantity, base_price_snapshot, customization_total, notes, property_id, unit_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${returningFields}`,
      [req.organizationId, projectId, modelId, unitLabel, quantity || 1,
       basePriceSnapshot, customizationTotal, notes,
       propertyId ?? null, unitRole ?? null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating project unit:", error);
    res.status(500).json({ error: "Failed to create project unit" });
  }
});
```

- [ ] **Step 4: Replace the `PATCH` handler body**

```ts
router.patch("/project-units/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { modelId, unitLabel, quantity, basePriceSnapshot,
            customizationTotal, notes, propertyId, unitRole } = req.body;

    if (propertyId != null) {
      if (!UNIT_ROLES.includes(unitRole)) {
        return res.status(400).json({ error: "unitRole must be 'home' or 'adu'" });
      }
      const conflict = await roleConflict(
        propertyId, unitRole, parseInt(String(id), 10)
      );
      if (conflict) return res.status(409).json({ error: conflict });
    }

    const result = await pool.query(
      `UPDATE project_units SET 
       model_id = COALESCE($3, model_id),
       unit_label = COALESCE($4, unit_label),
       quantity = COALESCE($5, quantity),
       base_price_snapshot = COALESCE($6, base_price_snapshot),
       customization_total = COALESCE($7, customization_total),
       notes = COALESCE($8, notes),
       property_id = COALESCE($9, property_id),
       unit_role = COALESCE($10, unit_role)
       WHERE id = $1 AND organization_id = $2
       RETURNING ${returningFields}`,
      [id, req.organizationId, modelId, unitLabel, quantity,
       basePriceSnapshot, customizationTotal, notes,
       propertyId ?? null, unitRole ?? null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project unit not found" });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating project unit:", error);
    res.status(500).json({ error: "Failed to update project unit" });
  }
});
```

`COALESCE` means passing `null` cannot *detach* a unit from its property — detaching is out of scope for this plan; delete and recreate the unit instead.

- [ ] **Step 5: Verify the gate**

```bash
npm run check 2>&1 | grep -c "error TS"
```

Expected: `13`.

- [ ] **Step 6: Verify by hand**

Attach a unit to `P-1` with `unitRole: "home"`. Attach a second with `"adu"` — expect success. Attach a third with `"home"` — expect `409` and `"This property already has a home"`. Then `GET /api/project-units?projectId=1` and confirm `propertyId` and `unitRole` come back populated.

- [ ] **Step 7: Commit**

```bash
git add server/routes/project-units.ts
git commit -m "Allow units to attach to a property with a home or adu role"
```

---

## Task 5: Property & phase editor component

**Files:**
- Create: `client/src/components/wizard/PropertyPhaseEditor.tsx`

**Interfaces:**
- Consumes: the routes from Tasks 2–4.
- Produces: `<PropertyPhaseEditor projectId={number} />`, default export absent — named export only, matching `ResponsibilityMatrix.tsx`.

`Step4SiteAndHome.tsx` is already 310 lines; putting this inline would roughly double it. A separate component keeps both focused, following the `ResponsibilityMatrix.tsx` precedent of a wizard sub-component in `components/wizard/`.

> **Invoke `web-design-guidelines` before writing this component.** It is installed at `.agents/skills/web-design-guidelines` (see `skills-lock.json`) and owns the DOM accessibility rules for user-facing web UI, which this component is. If it does not appear in your loadable skill list, the install location is the reason — this project discovers skills from `.claude/skills/`, so symlink or move it there, or reinstall with `-g`. Do not write this component without it; say which rules you could not apply if you must.

- [ ] **Step 1: Write the component**

```tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Phase {
  id: number;
  phaseNumber: number;
  name: string | null;
}

interface Property {
  id: number;
  propertyCode: string;
  phaseId: number | null;
  apn: string | null;
  lotNumber: string | null;
  address: string | null;
}

export const PropertyPhaseEditor: React.FC<{ projectId: number }> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);

  const phasesKey = ["/api/projects", projectId, "phases"];
  const propertiesKey = ["/api/projects", projectId, "properties"];

  const { data: phases = [] } = useQuery<Phase[]>({ queryKey: phasesKey });
  const { data: propertyRows = [] } = useQuery<Property[]>({ queryKey: propertiesKey });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: phasesKey });
    queryClient.invalidateQueries({ queryKey: propertiesKey });
  };

  const addPhase = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/projects/${projectId}/phases`, {
        name: `Phase ${phases.length + 1}`,
      }),
    onSuccess: invalidate,
  });

  const addProperty = useMutation({
    mutationFn: () => apiRequest("POST", `/api/projects/${projectId}/properties`, {}),
    onSuccess: invalidate,
  });

  const assignPhase = useMutation({
    mutationFn: ({ propertyId, phaseId }: { propertyId: number; phaseId: number | null }) =>
      apiRequest("PATCH", `/api/properties/${propertyId}`, { phaseId }),
    onSuccess: invalidate,
  });

  const patchProperty = useMutation({
    mutationFn: ({ propertyId, field, value }: { propertyId: number; field: string; value: string }) =>
      apiRequest("PATCH", `/api/properties/${propertyId}`, { [field]: value }),
    onSuccess: invalidate,
  });

  const removeProperty = useMutation({
    mutationFn: (propertyId: number) => apiRequest("DELETE", `/api/properties/${propertyId}`),
    onSuccess: invalidate,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Properties &amp; Phases
            </CardTitle>
            <CardDescription>
              Each property is one lot, holding up to a home and an ADU. Phases group
              properties for pricing, scheduling and payment milestones.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addPhase.mutate()}
              disabled={addPhase.isPending}
              data-testid="button-add-phase"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Phase
            </Button>
            <Button
              size="sm"
              onClick={() => addProperty.mutate()}
              disabled={addProperty.isPending}
              data-testid="button-add-property"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Property
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {propertyRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No properties yet. Add one for each lot in the project.
          </p>
        ) : (
          propertyRows.map((property) => (
            <div key={property.id} className="rounded-lg border p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{property.propertyCode}</Badge>
                  <Select
                    value={property.phaseId ? String(property.phaseId) : "unassigned"}
                    onValueChange={(value) =>
                      assignPhase.mutate({
                        propertyId: property.id,
                        phaseId: value === "unassigned" ? null : parseInt(value, 10),
                      })
                    }
                  >
                    <SelectTrigger className="w-44" data-testid={`select-phase-${property.id}`}>
                      <SelectValue placeholder="Assign a phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {phases.map((phase) => (
                        <SelectItem key={phase.id} value={String(phase.id)}>
                          {phase.name || `Phase ${phase.phaseNumber}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(expanded === property.id ? null : property.id)}
                    data-testid={`button-details-${property.id}`}
                  >
                    {expanded === property.id ? "Hide details" : "Details"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProperty.mutate(property.id)}
                    disabled={removeProperty.isPending}
                    data-testid={`button-delete-property-${property.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {expanded === property.id && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
                  {(["apn", "lotNumber", "address"] as const).map((field) => (
                    <div key={field} className="space-y-1">
                      <Label htmlFor={`${field}-${property.id}`} className="text-xs">
                        {field === "apn" ? "APN" : field === "lotNumber" ? "Lot Number" : "Address"}
                      </Label>
                      <Input
                        id={`${field}-${property.id}`}
                        defaultValue={property[field] || ""}
                        onBlur={(e) =>
                          patchProperty.mutate({
                            propertyId: property.id,
                            field,
                            value: e.target.value,
                          })
                        }
                        data-testid={`input-${field}-${property.id}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {removeProperty.isError && (
          <p className="text-sm text-destructive" data-testid="text-delete-property-error">
            Remove the units attached to this property before deleting it.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
```

The optional fields save on blur rather than on every keystroke, so a `PATCH` fires once per edited field.

- [ ] **Step 2: Verify the gate**

```bash
npm run check 2>&1 | grep -c "error TS"
```

Expected: `13`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/wizard/PropertyPhaseEditor.tsx
git commit -m "Add property and phase editor component"
```

---

## Task 6: Mount the editor in Step 4

**Files:**
- Modify: `client/src/components/wizard/steps/Step4SiteAndHome.tsx`

**Interfaces:**
- Consumes: `PropertyPhaseEditor` from Task 5.
- Produces: nothing consumed by later tasks. This is the last task in Plan A.

- [ ] **Step 1: Import and render the editor**

Add the import:

```tsx
import { PropertyPhaseEditor } from '../PropertyPhaseEditor';
```

Render it above the existing Home Models card, inside the outer `<div className="space-y-6">`, guarded on the draft project existing:

```tsx
{draftProjectId && <PropertyPhaseEditor projectId={draftProjectId} />}
```

It goes first because properties and phases are the structure that units attach to — the spec puts phase membership here, at "product selection and property ID typing".

- [ ] **Step 2: Verify the gate**

```bash
npm run check 2>&1 | grep -c "error TS"
```

Expected: `13`.

- [ ] **Step 3: Verify Zaca end to end**

With the app running, open the wizard, reach Step 4, and reproduce the reference case:

1. Add 3 phases — expect "Phase 1", "Phase 2", "Phase 3".
2. Add 7 properties — expect `P-1` through `P-7`.
3. Assign `P-1`, `P-2` to Phase 1; `P-3`, `P-4` to Phase 2; `P-5`, `P-6`, `P-7` to Phase 3.
4. Reload the page and confirm every assignment persisted.
5. Expand `P-1`, enter a lot number, blur, reload, confirm it persisted.

- [ ] **Step 4: Confirm the generated contract is unchanged**

Nothing in this plan is read by the generator, so the document must be byte-identical. Generate the MASTER_EF contract for a project that has phases and properties and confirm A.2 still renders its single collapsed row. A *changed* document here means something was wired up early and Plan A's isolation is broken.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/wizard/steps/Step4SiteAndHome.tsx
git commit -m "Mount property and phase editor in wizard step 4"
```

---

## Deliverable

Zaca Preserve's 7 properties in 3 phases are representable and persist. The generated contract is unchanged — every consumer of this data arrives in Plans B through E.

## Deferred to later plans

| Item | Plan |
|---|---|
| `unit_configurations` table and `project_units.configurationId` | B |
| Per-phase pricing subtotals (`phases[]` on `calculateProjectPricing`) | B |
| Timeline derivation, `phases` date overrides becoming live, Step 6 restructure | C |
| `milestones.phaseId`, the milestones route, per-phase editor in Step 7 | D |
| Exhibit rewiring script and the twelve document defects | E |
| Detaching a unit from a property without deleting it | not yet scoped |
