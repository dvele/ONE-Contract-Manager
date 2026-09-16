# Phase & Property Model — Plan D (Editable Payment Schedule)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each phase's payment schedule editable and persisted, add the two offsite pricing inputs, and refuse to generate a contract whose phase values do not reconcile with its total.

**Architecture:** `milestones` gains a `phaseId`, so a stored row belongs to a phase rather than a project. `buildPhaseRollups` prefers stored milestones over the default template, exactly as the project-level `paymentSchedule` already prefers stored rows. One route replaces a project's whole phase-keyed milestone set in a single transaction, validating that each phase totals 100%. A pure reconciliation function — the one thing here with real tests — decides whether generation may proceed.

**Tech Stack:** Express 5, Drizzle ORM, PostgreSQL, zod, React 18 + TanStack Query v5, Shadcn UI, Tailwind, vitest.

**Spec:** [`docs/superpowers/specs/2026-09-10-phase-property-model-design.md`](../specs/2026-09-10-phase-property-model-design.md) — the **Milestones & Payment Schedule** section.

**Predecessors:** A landed properties and phases; B landed configurations, per-phase pricing and `buildMilestoneSchedule`; C landed the timeline. **Read [`docs/phase-property-model-open-items.md`](../../phase-property-model-open-items.md) before starting.**

## Global Constraints

These are the repo's rules plus the ones the last three plans paid for. Every one of them exists because something went wrong.

- **Money is integers in cents.** Only `percentage` is stored on a milestone; **amounts are always derived**. A stored amount is a second source of truth that goes stale the moment pricing changes.
- **A missing input yields null, never a substituted default.** A fabricated figure in an executed agreement is worse than a blank, and the exhibits render blanks as `TBD`.
- **Never write `parseInt(x) || 0` in an input handler.** That single idiom has produced three separate defects on this branch, because it turns "cleared" into "zero" and zero then reads as an assertion. Clearing a field commits `null`.
- **Coerce a legacy zero to null wherever a column could hold one.** `design_duration`, `production_duration` and `delivery_duration` carried a `DEFAULT 0` until recently and existing rows still hold it. Any new fallback reading a nullable numeric column needs `|| null`, not bare `??`.
- **Validate at the commit point, not in `validateStep`.** `updateProjectData` clears the entire `validationErrors` map on every field change, so step-scoped error slots are dead. A `validateStep` entry produces a disabled Next button and a toast naming no field. Use a local draft that only commits in-range values, the way `handleProductionChange` does.
- **The autosave is ungated.** `performAutosave`'s only preconditions are an in-flight guard and a project-name check; it fires two seconds after any change and PATCHes the whole project. Anything reaching wizard state reaches the database.
- `requireAuth` on every route file; errors are `res.status(4xx).json({ error })`, never `{ message }`; every query filters on `req.organizationId`; a client-supplied foreign key is verified against the caller's organization **and** project — use the helpers in `server/lib/unit-attachment.ts`.
- ESM only. Shadcn primitives only; TanStack Query v5; wouter.
- **`npm run check` must stay at 12.** **`env -u DATABASE_URL npm test` must pass and stay hermetic** — never import a database-bound module into a test. `scheduleMath.ts` and `pricingMath.ts` import nothing, deliberately.
- **Test files are not type-checked by anything.** `tsconfig.json` excludes `**/*.test.ts` and vitest does no type-checking, so a wrong argument type in a test fails no gate.
- **Commit messages carry no AI attribution.** Imperative-mood subjects.
- Comment policy: only a suppression with its reason, an external fact, a deviation where the obvious version breaks, a measurement with provenance, or `TODO: <ticket> - <what>`.

## Prerequisites

- Postgres running, `dvele` at Plan C's schema. `scripts/seed_mvp.ts` is broken — see the open-items file.
- **`.agents/skills/web-design-guidelines/SKILL.md` is installed but untracked**, and Task 6 needs it. Read it as a file; discovery reads `.claude/skills/` so it is not loadable as a skill.
- Browser verification is impossible for an agent — every `/api` route is Cognito-gated.

---

## Task 1: Schema

**Files:** Modify `shared/schema.ts`

**Interfaces:** Produces `milestones.phaseId`; `financials.additionalOffsite`, `financials.additionalDelivery`.

- [ ] **Step 1: Enter plan mode** — `CLAUDE.md` requires it for schema changes. Present the columns and get approval.

- [ ] **Step 2: Add `phaseId` to `milestones`**

```ts
  phaseId: integer("phase_id").references(() => phases.id),
```

Nullable. A null `phaseId` is a legacy project-level milestone; the project-level `paymentSchedule` keeps reading those, so nothing existing breaks.

**`milestones` has no `organizationId`** — `AGENTS.md`'s claim that every table has one is wrong here. Do not add it. Tenancy is enforced one hop up on the owning project, which is the pattern Plan A established and every route on this branch follows.

- [ ] **Step 3: Add the two offsite adjustments to `financials`**

```ts
  additionalOffsite: integer("additional_offsite"),   // cents
  additionalDelivery: integer("additional_delivery"), // cents
```

**Nullable with no default.** These mirror `prelimOnsite`, which the wizard surfaces as "Additional Site Work / Buffer" and the pricing engine adds to `totalOnsite`. Do **not** give them `DEFAULT 0` — that is precisely what made "never set" indistinguishable from "asserted zero" on the duration columns and cost two fix rounds.

- [ ] **Step 4: Verify and commit**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 12
env -u DATABASE_URL npm test
npm run db:push
psql -d dvele -c "\d milestones" -c "\d financials"
```

Confirm `phase_id` and both new columns exist with **no default**.

```bash
git add shared/schema.ts
git commit -m "Add phase scoping to milestones and two offsite adjustments"
```

---

## Task 2: Reconciliation

**Files:** Create `server/services/__tests__/reconciliation.test.ts`; modify `server/services/pricingMath.ts`

**Interfaces:** Produces `reconcilePhases(input): ReconciliationResult`, consumed by Tasks 3 and 5.

The spec requires generation to **fail loudly** rather than emit a contract whose phase tables and total disagree. This is the function that decides it, which is why it is pure and tested and the rest of this plan is not.

**The identity is conditional, and encoding a bare equality would be wrong.** `Σ phaseValue` equals `contractValue − designFee` only when every unit sits on a property that belongs to a phase. Units on unphased properties, or attached to no property at all, count into the project totals and into no phase. That is correct behaviour, not drift — so the function reports the shortfall *and* what explains it.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { reconcilePhases } from "../pricingMath";

describe("reconcilePhases", () => {
  it("reconciles when every unit is phased", () => {
    const r = reconcilePhases({
      phaseValues: [600_000_00, 400_000_00],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 0,
    });
    expect(r.reconciles).toBe(true);
    expect(r.shortfall).toBe(0);
  });

  it("reconciles when the shortfall is exactly the unphased units", () => {
    const r = reconcilePhases({
      phaseValues: [600_000_00],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 400_000_00,
    });
    expect(r.reconciles).toBe(true);
    expect(r.shortfall).toBe(400_000_00);
    expect(r.explainedByUnphased).toBe(true);
  });

  it("does not reconcile when the shortfall exceeds the unphased units", () => {
    const r = reconcilePhases({
      phaseValues: [600_000_00],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 100_000_00,
    });
    expect(r.reconciles).toBe(false);
    expect(r.unexplained).toBe(300_000_00);
  });

  it("does not reconcile when the phases exceed the contract", () => {
    const r = reconcilePhases({
      phaseValues: [900_000_00, 900_000_00],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 0,
    });
    expect(r.reconciles).toBe(false);
    expect(r.unexplained).toBe(-800_000_00);
  });

  it("reconciles a project with no phases at all", () => {
    // Nothing to contradict: phases:[] is the documented legacy shape.
    const r = reconcilePhases({
      phaseValues: [],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 1_000_000_00,
    });
    expect(r.reconciles).toBe(true);
  });

  it("tolerates no rounding slack — a cent is a discrepancy", () => {
    const r = reconcilePhases({
      phaseValues: [1_000_000_01],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 0,
    });
    expect(r.reconciles).toBe(false);
  });
});
```

- [ ] **Step 2: Run them, confirm RED, record the output.**

- [ ] **Step 3: Implement it** in `pricingMath.ts`, which imports nothing and must stay that way. Return `{ reconciles, shortfall, unexplained, explainedByUnphased }`, all in cents.

Every figure is an integer, so **do not add a rounding tolerance** — `buildMilestoneSchedule` and the site-work pro-ration both reconcile to the cent by construction, and a tolerance would hide exactly the drift this exists to catch.

- [ ] **Step 4: Confirm GREEN, gates at 12, commit.**

```bash
git commit -m "Add phase reconciliation to the pricing math"
```

---

## Task 3: Stored milestones and the offsite adjustments

**Files:** Modify `server/services/pricingEngine.ts`, `server/services/pricingMath.ts`, `server/services/__tests__/phase-rollup.test.ts`

**Interfaces:** Consumes Task 1's columns and Task 2's `reconcilePhases`. Produces `PhaseRollup.milestones` sourced from storage when present; `PricingSummary.reconciliation`.

- [ ] **Step 1: Prefer stored milestones per phase**

`buildPhaseRollups` currently always calls `buildMilestoneSchedule(phaseValue)`. Give it a `storedMilestones: Map<number, StoredMilestone[]>` keyed by `phaseId`: when a phase has stored rows, derive amounts from their percentages against that phase's value; otherwise fall back to the template.

**Amounts are derived here, never read from `milestones.amount`.** That column exists and is stale by design — the same reasoning that keeps `derivedOffsitePrice` server-computed.

Apply the same residual discipline `buildMilestoneSchedule` uses: percentages to two decimals, the rounding residual on the last non-retainage milestone, amounts summing to `phaseValue` exactly.

- [ ] **Step 2: Fold the offsite adjustments into the phase breakdown**

`additionalOffsite` and `additionalDelivery` are project-level, like `prelimOnsite`. Pro-rate each across phases by that phase's share of `offsite` and `shipping` respectively, giving the last phase any residual so the parts sum to the whole — the same shape `prelimOnsite` already uses.

**Coerce a zero to null on read** (`financials.additionalOffsite || null`), per the global constraint. These columns are new and carry no default, but the habit is what prevents the next occurrence.

- [ ] **Step 3: Expose the reconciliation**

Add `reconciliation: ReconciliationResult` to `PricingSummary`, computed from the phase values, `contractValue`, `designFee`, and the value of units whose property is unphased or absent. Nothing consumes it yet; Task 5 does.

- [ ] **Step 4: Test and verify**

Extend `phase-rollup.test.ts`: stored milestones override the template; a phase with none still gets the template; stored percentages not summing to 100 are used as given (the route validates, not the math); amounts still reconcile to `phaseValue`.

Then against the database: a project with stored milestones for one phase and none for another produces the stored set and the template respectively, and `Σ phaseValue` still equals `contractValue − designFee` for a fully-phased project.

```bash
git commit -m "Source phase milestones from storage and pro-rate the offsite adjustments"
```

---

## Task 4: The milestones route

**Files:** Create `server/routes/milestones.ts`; modify `server/routes/index.ts`

**Interfaces:** `GET|PUT /api/projects/:projectId/milestones`.

This seam was probed once, early, and thrown away — the probe assumed project-scoped milestones, which the per-phase design invalidated. Build it phase-keyed.

- [ ] **Step 1: Write the route**

```
GET  /api/projects/:projectId/milestones
PUT  /api/projects/:projectId/milestones
     { "<phaseId>": [{ name, trigger, percentage }, …], … }
```

**PUT replaces the project's whole phase-keyed set in one transaction.** Per-row CRUD cannot work here: "each phase totals 100%" is a property of the set, so there is no single request at which it is checkable.

Follow `server/routes/properties.ts` exactly — strict `parseId` (`/^[1-9]\d*$/`), project-ownership check before any write, empty-body 400, the organization predicate inside the statement, `{ error }` throughout.

Validation, all server-side:
- every `phaseId` in the payload belongs to this project (use a helper in `server/lib/unit-attachment.ts`, one implementation)
- each phase's percentages total exactly 100
- at most 50 milestones per phase
- `percentage` is a number in 0–100; `name` and `trigger` are non-empty trimmed strings
- `milestoneNumber` is assigned server-side from array order; a client never sends it
- `amount` is never accepted from the client

Only `percentage`, `name` and `dueUpon` are stored. `milestoneType` carries the phase label for the existing project-level reader.

- [ ] **Step 2: Register it**, verify gates, and prove with a throwaway script: a set totalling 99 is rejected; a `phaseId` from another project is rejected; a successful PUT replaces rather than appends; a failed PUT leaves the prior set intact (transaction rolled back); and `amount` sent in the body is ignored.

```bash
git commit -m "Add the phase-keyed milestones route"
```

---

## Task 5: Refuse to generate an unreconciled contract

**Files:** Modify `server/routes/contracts.ts`

**Interfaces:** Consumes `PricingSummary.reconciliation`.

- [ ] **Step 1: Gate every generation entry point**

`contracts.ts` has several — `POST /contracts`, `download-pdf`, `download-all-zip`, preview, regenerate. Each already calls `calculateProjectPricing`. Where `reconciliation.reconciles` is false, refuse with a 409 and a message naming the unexplained amount and the units responsible.

**Refuse, do not warn.** The spec's decision is explicit: a contract whose phase tables and total disagree must not be produced. A warning in a log is not a decision anyone sees.

- [ ] **Step 2: Do not gate a project with no phases.** `phases: []` is the documented legacy shape and `reconcilePhases` returns `reconciles: true` for it. Every existing project must still generate exactly as it does today — verify this explicitly rather than assuming it.

- [ ] **Step 3: Verify**

Gates at 12 and the suite passing. Then: a fully-phased project generates; a project with an unphased unit generates (the shortfall is explained); a project whose phase values were corrupted directly in the database is refused with a 409 naming the amount; a project with no phases generates unchanged.

```bash
git commit -m "Refuse to generate a contract whose phases do not reconcile"
```

---

## Task 6: Step 7 — the editor and the two inputs

**Files:** Create `client/src/components/wizard/PhasePaymentEditor.tsx`; modify `client/src/components/wizard/steps/Step7Pricing.tsx`

**Read `.agents/skills/web-design-guidelines/SKILL.md` first.** Where its rules conflict with this plan, **the skill wins and you record the deviation**. Read `PhaseScheduleEditor.tsx` too — it is the newest component on this branch and carries the patterns: named export, commit-point validation with a local draft, `role="alert"` on field errors, pending flags scoped with `mutation.variables`, and a derived-versus-asserted distinction carried by **text** rather than colour.

- [ ] **Step 1: The payment editor**

One table per phase: milestone name, trigger, percentage, and a derived amount shown read-only. A running total per phase that makes "must equal 100%" visible **before** the user tries to save, not after the server rejects it. Add, remove and reorder rows.

Amounts are derived and must never be editable — if a user could type an amount, it would disagree with the percentage beside it.

Save posts the whole phase-keyed set to the Task 4 route.

- [ ] **Step 2: The two offsite inputs**

Alongside the existing Design Fee and Additional Site Work inputs: **Offsite Services (Factory)** and **Offsite Services (Delivery/Assembly)**, writing `additionalOffsite` and `additionalDelivery`. Label each as an adjustment on top of the model-derived figure, and show the derived figure beside it so the sum is legible.

Clearing either commits `null`, not `0`.

- [ ] **Step 3: Surface the reconciliation**

If `reconciliation.reconciles` is false, say so in Step 7 with the unexplained amount — **before** the user reaches Step 9 and a refused generation. A blocked generation with no explanation upstream is the dead-end pattern this branch has already produced twice.

- [ ] **Step 4: Verify**

Gates. You cannot click this — read the data flow twice: do the query keys resolve, does the save invalidate the pricing key, does a cleared adjustment send `null`, and does the running total compute from the same percentages the server will validate?

```bash
git commit -m "Add the per-phase payment editor and offsite inputs to step 7"
```

---

## Deliverable

Each phase's payment schedule is editable and persisted, the two offsite figures have inputs, and a contract whose phases do not reconcile cannot be generated.

**This plan still does not change the generated document.** The exhibit bodies carry literal `<td></td>` and `[TBD]` text rather than `{{VARIABLE}}` placeholders — Plan E wires them. A regeneration diff should show no change, and that remains worth running.

## Deferred to Plan E

| Item |
|---|
| Exhibit rewiring, the twelve document defects, signature entities |
| The three defects inside the dormant generators — A.4 and A.5 recomputing totals without customizations, `generatePricingTableHtml` missing a Shipping row |
| Which variable owns D-4, and the `GREEN_LIGHT_DATE` collision |
| `formatDateWritten`'s west-of-UTC off-by-one, across ~15 variables |
| Exhibit rows already seeded into the deployed database, which editing `seed-data.json` does not change |
| The `0 → NULL` backfill on the three duration columns, if not already run |
