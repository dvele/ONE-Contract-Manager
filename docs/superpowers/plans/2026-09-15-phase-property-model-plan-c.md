# Phase & Property Model — Plan C (Connected Timeline)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enter a start date and some durations, and have every date in the contract derive from them — with an override anywhere you disagree.

**Architecture:** A pure `scheduleMath.ts` module, importing nothing, turns a project start plus per-phase durations into per-phase factory, delivery and completion dates. `calculateProjectPricing` carries those onto each `PhaseRollup` so a later plan can build Exhibit A.2 from one structure. The mapper gains the D.1, D.2 and C.4 variables the exhibits have been rendering blank since they were written. Step 6 becomes one card per phase.

**Tech Stack:** Express 5, Drizzle ORM, PostgreSQL, zod, React 18 + TanStack Query v5, Shadcn UI, Tailwind, vitest.

**Spec:** [`docs/superpowers/specs/2026-09-10-phase-property-model-design.md`](../specs/2026-09-10-phase-property-model-design.md) — the **Timeline** section is what this plan implements.

**Predecessors:** Plan A landed `phases` with `startOffsetDays`, `manufacturingDays`, `onsiteDays`, `deliveryLagDays` and four nullable `*Override` date columns, all unused to date. Plan B landed `buildPhaseRollups`. **Read [`docs/phase-property-model-open-items.md`](../../phase-property-model-open-items.md) before starting** — it carries decisions, latent issues and baseline facts that are not obvious from the code.

## Global Constraints

- **Dates are `text` in `YYYY-MM-DD`.** Never a `Date` in the database, never an ISO timestamp. The override columns and `project_details`' date fields are all text.
- **A missing input yields a null date, never a guessed one.** A phase with no `manufacturingDays` has no `factoryComplete`. Nulls render as `TBD` in the contract, which is what the exhibit bodies already say. Substituting a default would put a fabricated date in a signed document.
- **`override ?? derived`** everywhere. An override is a text date on the phase row; it wins, and it also becomes the base for everything downstream of it in the chain.
- **Money is integers in cents** (nothing in this plan touches money, but the rule holds).
- `requireAuth` on every route file; errors are `res.status(4xx).json({ error })`, never `{ message }`; every query filters on `req.organizationId`, and a client-supplied foreign key is verified against the caller's organization **and** project. Use the helpers in `server/lib/unit-attachment.ts`.
- ESM only. Shadcn primitives only on the client; TanStack Query v5; wouter.
- **`npm run check` must stay at 12 pre-existing errors** — 12 is correct, down from 13 when a dead file was deleted. **`env -u DATABASE_URL npm test` must pass and stay hermetic**; never import a database-bound module into a test. `server/services/pricingMath.ts` imports nothing, deliberately — `scheduleMath.ts` must match.
- **Commit messages carry no AI attribution.** No `Co-Authored-By`, no mention of Claude, Claude Code or Anthropic. Imperative-mood subjects.
- Comment policy: only a suppression with its reason, an external fact, a deviation where the obvious version breaks, a measurement with provenance, or `TODO: <ticket> - <what>`.

## Prerequisites

- Local Postgres running with `dvele` at Plan B's schema. `scripts/seed_mvp.ts` is broken — see the open-items file — so insert the `organizations` row directly if starting fresh.
- **`.agents/skills/web-design-guidelines/SKILL.md` is installed but untracked**, and Task 5 needs it. If it is missing from your checkout, that is why; it is readable as a file, not loadable as a skill, because discovery reads `.claude/skills/`.
- Browser verification is not possible for an agent — every `/api` route is Cognito-gated. UI tasks gate on `tsc`, `npm test` and review.

---

## Task 1: Pure schedule math

**Files:**
- Create: `server/services/scheduleMath.ts`
- Create: `server/services/__tests__/schedule-math.test.ts`

**Interfaces:**
- Produces: `addDays`, `addBusinessDays`, `derivePhaseDates`, `deriveDesignMilestones`, and the types `PhaseDurations`, `PhaseDates`, `ReviewPeriods`, `DesignMilestones`. Consumed by Tasks 3 and 4.

This module decides the dates printed in a signed contract, which is why it gets tests and the rest of this plan does not. It imports nothing — no database, no clock, no config — so the suite stays hermetic.

- [ ] **Step 1: Write the failing tests**

Create `server/services/__tests__/schedule-math.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  addDays,
  derivePhaseDates,
  deriveDesignMilestones,
  type PhaseDurations,
} from "../scheduleMath";

describe("addDays", () => {
  it("adds calendar days across a month boundary", () => {
    expect(addDays("2026-01-28", 5)).toBe("2026-02-02");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("returns null for a null date, so a missing input propagates", () => {
    expect(addDays(null, 5)).toBeNull();
  });

  it("returns null for a null duration rather than treating it as zero", () => {
    expect(addDays("2026-01-01", null)).toBeNull();
  });
});

describe("addBusinessDays", () => {
  it("skips a weekend", () => {
    // 2026-01-01 is a Thursday. Five business days lands on the following Thursday.
    expect(addBusinessDays("2026-01-01", 5)).toBe("2026-01-08");
  });

  it("does not move a zero-day period", () => {
    expect(addBusinessDays("2026-01-01", 0)).toBe("2026-01-01");
  });

  it("counts from a Friday into the next week", () => {
    // 2026-01-02 is a Friday; one business day is the following Monday.
    expect(addBusinessDays("2026-01-02", 1)).toBe("2026-01-05");
  });

  it("propagates null", () => {
    expect(addBusinessDays(null, 5)).toBeNull();
  });
});

describe("derivePhaseDates", () => {
  const DESIGN_COMPLETE = "2026-03-01";

  const phase = (n: number, over: Partial<PhaseDurations> = {}): PhaseDurations => ({
    phaseNumber: n,
    startOffsetDays: 0,
    manufacturingDays: 100,
    onsiteDays: 60,
    deliveryLagDays: 10,
    factoryStartOverride: null,
    factoryCompleteOverride: null,
    deliveryWindowOverride: null,
    targetCoOverride: null,
    ...over,
  });

  it("starts the first phase at design complete", () => {
    const [p1] = derivePhaseDates(DESIGN_COMPLETE, [phase(1)]);
    expect(p1.factoryStart).toBe("2026-03-01");
    expect(p1.factoryComplete).toBe(addDays("2026-03-01", 100));
  });

  it("chains each phase from the previous phase's factory completion", () => {
    const [p1, p2] = derivePhaseDates(DESIGN_COMPLETE, [phase(1), phase(2)]);
    expect(p2.factoryStart).toBe(p1.factoryComplete);
  });

  it("inserts a gap for a positive start offset", () => {
    const [p1, p2] = derivePhaseDates(DESIGN_COMPLETE, [phase(1), phase(2, { startOffsetDays: 14 })]);
    expect(p2.factoryStart).toBe(addDays(p1.factoryComplete, 14));
  });

  it("overlaps phases for a negative start offset", () => {
    const [p1, p2] = derivePhaseDates(DESIGN_COMPLETE, [phase(1), phase(2, { startOffsetDays: -30 })]);
    expect(p2.factoryStart).toBe(addDays(p1.factoryComplete, -30));
  });

  it("derives delivery and CO from factory completion", () => {
    const [p1] = derivePhaseDates(DESIGN_COMPLETE, [phase(1)]);
    expect(p1.deliveryWindow).toBe(addDays(p1.factoryComplete, 10));
    expect(p1.targetCO).toBe(addDays(p1.deliveryWindow, 60));
  });

  it("returns nulls rather than guesses when a duration is missing", () => {
    const [p1] = derivePhaseDates(DESIGN_COMPLETE, [phase(1, { manufacturingDays: null })]);
    expect(p1.factoryStart).toBe("2026-03-01");
    expect(p1.factoryComplete).toBeNull();
    expect(p1.deliveryWindow).toBeNull();
    expect(p1.targetCO).toBeNull();
  });

  it("lets a later phase recover from an earlier phase's missing duration via an override", () => {
    const [, p2] = derivePhaseDates(DESIGN_COMPLETE, [
      phase(1, { manufacturingDays: null }),
      phase(2, { factoryStartOverride: "2026-06-01" }),
    ]);
    expect(p2.factoryStart).toBe("2026-06-01");
    expect(p2.factoryComplete).toBe(addDays("2026-06-01", 100));
  });

  it("makes an override win and become the base for everything downstream", () => {
    const [p1] = derivePhaseDates(DESIGN_COMPLETE, [
      phase(1, { factoryCompleteOverride: "2026-09-09" }),
    ]);
    expect(p1.factoryComplete).toBe("2026-09-09");
    expect(p1.deliveryWindow).toBe(addDays("2026-09-09", 10));
  });

  it("chains the next phase from an overridden factory completion", () => {
    const [, p2] = derivePhaseDates(DESIGN_COMPLETE, [
      phase(1, { factoryCompleteOverride: "2026-09-09" }),
      phase(2),
    ]);
    expect(p2.factoryStart).toBe("2026-09-09");
  });

  it("returns an empty array for no phases", () => {
    expect(derivePhaseDates(DESIGN_COMPLETE, [])).toEqual([]);
  });

  it("returns null dates throughout when the project has no start", () => {
    const [p1] = derivePhaseDates(null, [phase(1)]);
    expect(p1.factoryStart).toBeNull();
    expect(p1.targetCO).toBeNull();
  });
});

describe("deriveDesignMilestones", () => {
  it("chains the four D.1 milestones through their review periods", () => {
    const d = deriveDesignMilestones("2026-01-01", {
      kickoffReviewDays: 5,
      schematicReviewDays: 10,
      permitSetReviewDays: 10,
      greenLightReviewDays: 5,
    });
    expect(d.kickoff).toBe("2026-01-01");
    expect(d.schematic).toBe(addBusinessDays("2026-01-01", 5));
    expect(d.permitSet).toBe(addBusinessDays(d.schematic, 10));
    expect(d.greenLightPackage).toBe(addBusinessDays(d.permitSet, 10));
  });

  it("propagates null when the project has no start", () => {
    const d = deriveDesignMilestones(null, {
      kickoffReviewDays: 5,
      schematicReviewDays: 10,
      permitSetReviewDays: 10,
      greenLightReviewDays: 5,
    });
    expect(d.kickoff).toBeNull();
    expect(d.greenLightPackage).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

```bash
env -u DATABASE_URL npm test
```

Expected: failures resolving `../scheduleMath`. That is RED; record the output.

- [ ] **Step 3: Write the module**

Create `server/services/scheduleMath.ts`. It must import nothing.

```ts
/**
 * Pure date arithmetic for the project schedule.
 *
 * Kept free of imports so it can be tested without a database: these functions
 * decide the dates printed in a signed contract. A missing input yields null
 * rather than a substituted default — a fabricated date in an executed
 * agreement is worse than a blank one, and the exhibit bodies already render
 * a blank as "TBD".
 *
 * Dates are `YYYY-MM-DD` strings throughout, matching the database columns.
 */

export interface PhaseDurations {
  phaseNumber: number;
  startOffsetDays: number | null;
  manufacturingDays: number | null;
  onsiteDays: number | null;
  deliveryLagDays: number | null;
  factoryStartOverride: string | null;
  factoryCompleteOverride: string | null;
  deliveryWindowOverride: string | null;
  targetCoOverride: string | null;
}

export interface PhaseDates {
  phaseNumber: number;
  factoryStart: string | null;
  factoryComplete: string | null;
  deliveryWindow: string | null;
  targetCO: string | null;
}

export interface ReviewPeriods {
  kickoffReviewDays: number | null;
  schematicReviewDays: number | null;
  permitSetReviewDays: number | null;
  greenLightReviewDays: number | null;
}

export interface DesignMilestones {
  kickoff: string | null;
  schematic: string | null;
  permitSet: string | null;
  greenLightPackage: string | null;
}

/** Adds calendar days. Null in, null out — a missing duration is not zero. */
export function addDays(date: string | null, days: number | null): string | null {
  if (date === null || days === null) return null;
  const parsed = parseDate(date);
  if (parsed === null) return null;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatDate(parsed);
}

/**
 * Adds business days, skipping Saturdays and Sundays.
 *
 * Public holidays are not modelled — the exhibit's review periods are stated in
 * business days and no holiday calendar exists in this system.
 */
export function addBusinessDays(date: string | null, days: number | null): string | null {
  if (date === null || days === null) return null;
  const parsed = parseDate(date);
  if (parsed === null) return null;

  let remaining = days;
  while (remaining > 0) {
    parsed.setUTCDate(parsed.getUTCDate() + 1);
    const day = parsed.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return formatDate(parsed);
}

/**
 * Derives each phase's four dates, chaining phase n from phase n-1's factory
 * completion.
 *
 * @param designComplete - when production may begin; null yields null throughout
 * @param phases - ordered by `phaseNumber` ascending; order is load-bearing
 */
export function derivePhaseDates(
  designComplete: string | null,
  phases: PhaseDurations[]
): PhaseDates[] {
  const result: PhaseDates[] = [];
  let previousComplete: string | null = designComplete;

  for (const phase of phases) {
    const factoryStart =
      phase.factoryStartOverride ?? addDays(previousComplete, phase.startOffsetDays ?? 0);
    const factoryComplete =
      phase.factoryCompleteOverride ?? addDays(factoryStart, phase.manufacturingDays);
    const deliveryWindow =
      phase.deliveryWindowOverride ?? addDays(factoryComplete, phase.deliveryLagDays ?? 0);
    const targetCO = phase.targetCoOverride ?? addDays(deliveryWindow, phase.onsiteDays);

    result.push({
      phaseNumber: phase.phaseNumber,
      factoryStart,
      factoryComplete,
      deliveryWindow,
      targetCO,
    });
    previousComplete = factoryComplete;
  }

  return result;
}

/** Chains the four Exhibit D.1 milestones through their review periods. */
export function deriveDesignMilestones(
  projectStart: string | null,
  periods: ReviewPeriods
): DesignMilestones {
  const kickoff = projectStart;
  const schematic = addBusinessDays(kickoff, periods.kickoffReviewDays);
  const permitSet = addBusinessDays(schematic, periods.schematicReviewDays);
  const greenLightPackage = addBusinessDays(permitSet, periods.permitSetReviewDays);
  return { kickoff, schematic, permitSet, greenLightPackage };
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
```

Note `greenLightReviewDays` is accepted but unused in the chain — the fourth review period follows the Green Light package rather than preceding it. Keep it in the type; a later plan may render it.

- [ ] **Step 4: Run them and watch them pass**

```bash
env -u DATABASE_URL npm test
```

Expected: all pass, pristine output. Record it.

- [ ] **Step 5: Confirm the gate and commit**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 12
git add server/services/scheduleMath.ts server/services/__tests__/schedule-math.test.ts
git commit -m "Add pure schedule math for the project timeline"
```

---

## Task 2: Accept date overrides on a phase

**Files:**
- Modify: `server/routes/phases.ts`

**Interfaces:**
- Consumes: the `phases` table's four override columns, landed in Plan A and unused since.
- Produces: `PATCH /api/phases/:id` accepting `factoryStartOverride`, `factoryCompleteOverride`, `deliveryWindowOverride`, `targetCoOverride`.

- [ ] **Step 1: Extend the input schema**

`PhaseInputSchema` currently accepts `name` and the four duration fields. Add the four override dates, validated as `YYYY-MM-DD` and **nullable** — clearing an override is how a user returns to the derived value, exactly as clearing a name returns to `Phase N`:

```ts
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be YYYY-MM-DD")
  .nullable()
  .optional();
```

Apply it to all four. Change nothing else — the empty-body 400 guard, the organization predicate inside the `UPDATE`, and the strict `parseId` all stay as they are.

- [ ] **Step 2: Verify**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 12
env -u DATABASE_URL npm test
```

Then with a throwaway script (export `DATABASE_URL`, delete it afterwards, leave `dvele` empty): set an override, read it back, clear it with an explicit `null`, and confirm the column is null rather than the string `"null"`. Confirm a malformed date is rejected with 400.

- [ ] **Step 3: Commit**

```bash
git add server/routes/phases.ts
git commit -m "Accept schedule date overrides on a phase"
```

---

## Task 3: Carry dates onto the phase rollup

**Files:**
- Modify: `server/services/pricingEngine.ts`
- Modify: `server/services/pricingMath.ts`
- Modify: `server/services/__tests__/phase-rollup.test.ts`

**Interfaces:**
- Consumes: `derivePhaseDates` from Task 1.
- Produces: `PhaseRollup.dates` — `{ factoryStart, factoryComplete, deliveryWindow, targetCO }`, all `string | null`. Plan E builds Exhibit A.2 from this.

The spec's `PricingSummary` shape has always shown `dates` on each phase; Plan B built everything except that field. This closes it, so A.2's four date columns and its property rows come from one structure rather than two queries.

- [ ] **Step 1: Widen the rollup**

Add `dates: PhaseDates` to `PhaseRollup` in `pricingMath.ts`, and a `phaseDates: PhaseDates[]` parameter to `buildPhaseRollups`, matched to each phase by `phaseNumber`. **Keep `buildPhaseRollups` pure** — it receives the dates, it does not derive them. Deriving needs the project start, which is a database read.

- [ ] **Step 2: Derive and pass them**

In `calculateProjectPricing`, the phase rows are already fetched and ordered by `phaseNumber`. Compute `designComplete` as `addDays(projectStart, project.designDuration)` where `projectStart` is `projectDetails.agreementExecutionDate ?? projects.createdAt` rendered as `YYYY-MM-DD`, call `derivePhaseDates`, and pass the result in.

**A phase whose `manufacturingDays` is null falls back to `projects.productionDuration`** before derivation — that column is where the wizard's manufacturing duration has always been stored, and without the fallback every existing project's phases would derive null dates. Do the fallback at the call site, not inside the pure function.

- [ ] **Step 3: Test it**

Extend `phase-rollup.test.ts` with cases proving dates land on the right phase by `phaseNumber` rather than by array position, and that a phase with no matching date entry gets all-null dates rather than throwing.

- [ ] **Step 4: Verify and commit**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 12
env -u DATABASE_URL npm test
```

Then prove against the database that a project with three phases produces three non-null `factoryStart` values in ascending order, and that a project with no phases still returns `phases: []` with every other field unchanged.

```bash
git add server/services/pricingEngine.ts server/services/pricingMath.ts server/services/__tests__/phase-rollup.test.ts
git commit -m "Carry derived schedule dates onto the phase rollup"
```

---

## Task 4: Render the dates in the contract

**Files:**
- Modify: `server/lib/mapper.ts`

**Interfaces:**
- Consumes: Task 1's `deriveDesignMilestones`, Task 3's `PhaseRollup.dates`.
- Produces: D.1, D.2 and C.4 variables, resolved rather than blank.

This is where the exhibits stop saying `[TBD]`. **Read all of `server/lib/mapper.ts` before editing it** — `CLAUDE.md` requires it, the file is the single source of truth for every template variable, and partial reads produce duplicate definitions. The repo also has an `add-variable` skill at `.claude/skills/add-variable/SKILL.md` describing exactly this change; follow it.

- [ ] **Step 1: D.1 — derived, with the existing fields as overrides**

The four dates the wizard already collects become the override layer:

| D.1 milestone | Derived | Override |
|---|---|---|
| D-1 Kickoff | `projectStart` | `projectDetails.designKickoffDate` |
| D-2 Schematic | +5 business days | `projectDetails.schematicDesignDate` |
| D-3 Permit Set | +10 business days | `projectDetails.permitSubmittalDate` |
| D-4 Green Light Package | +10 business days | `projectDetails.designDevelopmentDate` |

The existing variables `DESIGN_KICKOFF_DATE`, `SCHEMATIC_DESIGN_DATE`, `PERMIT_SUBMITTAL_DATE` and `DESIGN_DEVELOPMENT_DATE` keep their names and change only their resolution: `override ?? derived`, formatted through the existing `formatDateOrTBD` so a null still renders `TBD`.

- [ ] **Step 2: D.2 — a project-level rollup**

D.2's table has one row per milestone, not per phase, so roll the phases up: `PRODUCTION_START_DATE` is the earliest non-null `factoryStart`, `PRODUCTION_COMPLETE_DATE` the latest non-null `factoryComplete`, `DELIVERY_SET_DATE` the latest `deliveryWindow`, `CO_EQUIVALENT_DATE` the latest `targetCO`. All through `formatDateOrTBD`. A project with no phases yields TBD for all four rather than an error.

- [ ] **Step 3: C.4 — render the day counts**

C.4 currently reads `[TBD] days before delivery` on all three rows while the wizard collects five values. Add `FOUNDATION_READY_DAYS`, `UTILITY_STUBBED_DAYS` and `CRANE_ACCESS_READY_DAYS` from `projectDetails`, defaulting to the schema defaults (14, 14, 7) when null.

`siteAccessReadyDays` and `permitsScheduledDays` have no row in C.4's table. Add their variables anyway so the exhibit can gain rows without another mapper change, and note in your report that they are unrendered.

- [ ] **Step 4: Verify and commit**

`npm run check` at 12; `env -u DATABASE_URL npm test` passing. Then generate a contract for a project with phases and confirm D.1, D.2 and C.4 render dates and day counts rather than blanks — and that a project with no phases renders `TBD` throughout rather than erroring.

```bash
git add server/lib/mapper.ts
git commit -m "Resolve the schedule variables the exhibits render"
```

---

## Task 5: Step 6 becomes the timeline

**Files:**
- Create: `client/src/components/wizard/PhaseScheduleEditor.tsx`
- Modify: `client/src/components/wizard/steps/Step6DatesSchedule.tsx`

**Interfaces:**
- Consumes: `PATCH /api/phases/:id` from Task 2; `GET /api/projects/:projectId/phases`.
- Produces: the UI that makes any of this reachable.

**Read `.agents/skills/web-design-guidelines/SKILL.md` before writing.** It is installed but not loadable as a skill here, so read the file. **Where its rules conflict with anything in this plan, the skill wins and you record the deviation in your report.** Also read `client/src/components/wizard/UnitAttachmentEditor.tsx` — it carries the newer patterns: inline per-field errors with focus-first-error, pending flags scoped with `mutation.variables`, and `client/src/lib/money.ts` as the single formatter.

- [ ] **Step 1: Write the phase schedule editor**

One card per phase, ordered by `phaseNumber`. Each card takes `startOffsetDays`, `manufacturingDays` and `onsiteDays`, and shows the four derived dates read-only beside an override field for each. An override field with a value visibly supersedes the derived date rather than sitting next to it ambiguously — the user must be able to see at a glance which dates are computed and which are asserted.

Clearing an override returns to the derived value. That is the same affordance as clearing a phase name, and it must not validate as required.

Named export, no default. Query key `["/api/projects", projectId, "phases"]`.

- [ ] **Step 2: Restructure Step 6**

Step 6 currently holds three unconnected groups: phase durations that compute dates nothing reads, C.4 interface deadlines, and hand-typed D.1/D.2 dates. Rebuild it as:

1. **Project start** — read-only, from Step 1, with a line saying every date below derives from it.
2. **Design** — duration, plus the four D.1 review periods.
3. **Phases** — `<PhaseScheduleEditor />`.
4. **Site readiness** — the five C.4 day counts, unchanged in behaviour.

The project-level `manufacturingDurationDays` and `onsiteDurationDays` inputs come out: those durations now live on the phase. **Keep writing `projects.productionDuration`** from the design section or leave it untouched — Task 3 falls back to it for phases with no `manufacturingDays`, and a project saved with it cleared would lose that fallback.

The D.1/D.2 date inputs stay, relabelled as overrides rather than primary entry, since Task 4 makes them exactly that.

- [ ] **Step 3: Verify and commit**

`npm run check` at 12; `env -u DATABASE_URL npm test` passing. You cannot click this — read the data flow twice instead: do the query keys resolve, do mutations invalidate the phases key, does an override send `null` rather than `""` when cleared, and does a cleared duration send `null` rather than `0`?

State in your report which accessibility rules you applied and any that conflicted with this plan.

```bash
git add client/src/components/wizard/PhaseScheduleEditor.tsx client/src/components/wizard/steps/Step6DatesSchedule.tsx
git commit -m "Rebuild step 6 around the derived timeline"
```

---

## Deliverable

Entering a start date and durations derives every date the contract needs — per-phase factory, delivery and completion dates, and the four D.1 design milestones — with an override available at any point, and resolves them all as template variables.

**Corrected 2026-09-15, mid-execution: this plan does *not* change the generated document.** The original text here claimed it did. It cannot. The exhibit bodies are database rows whose Target Date cells are literal empty `<td></td>` and whose C.4 rows carry the literal text `[TBD] days before delivery` — **not** `{{VARIABLE}}` placeholders. A search of the seeded exhibit content finds zero occurrences of `DESIGN_KICKOFF_DATE`, `PRODUCTION_START_DATE`, `FOUNDATION_READY_DAYS` or any of the other eleven. No mapper change can alter a document that never references the variable.

Wiring the exhibit bodies is **Plan E**, which the spec has always assigned it ("D.1 / D.2 — Target Date cells wired to derived dates"). Plan C makes the values exist and be correct; Plan E makes them appear. Plan E must also decide what to do about exhibit rows already seeded into the deployed database, since editing `server/seed-data.json` alone does not change them.

So Plans A, B and C are all inert with respect to the generated contract, and a regeneration diff should show **no change at all**. That is the verification, and it is still worth running.

## Deferred to later plans

| Item | Plan |
|---|---|
| `milestones.phaseId`, the milestones route, per-phase payment editor in Step 7, the two offsite pricing inputs | D |
| Reconciliation check refusing generation when `Σ phaseValue ≠ contractValue − designFee` | D |
| Exhibit rewiring, the twelve document defects, signature entities, and the three generator defects in the open-items file | E |
| A holiday calendar for business-day arithmetic | not scoped |
| C.4 gaining rows for `siteAccessReadyDays` and `permitsScheduledDays` | E, with the exhibit bodies |
