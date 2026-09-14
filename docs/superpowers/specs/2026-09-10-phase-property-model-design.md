# Phase & Property Model — Design Spec

**Date:** 2026-09-10
**Status:** Draft — awaiting review

## Overview

The MASTER_EF contract templates are written against a Property/Phase structure that
does not exist in the data model. `grep` for `phase` or `property_id` in
`shared/schema.ts` returns nothing; the exhibit generators fake it by hardcoding
`'P-1'` / `'Phase 1'` (`server/lib/tableGenerators.ts:301`) or deriving `P-N` from an
array index (`:474`). Exhibits A.2, A.5, B.1 and D.1 therefore render a single
collapsed row regardless of the real project.

This spec introduces properties and phases, makes pricing, milestones and the schedule
phase-aware, adds unpriced unit configurations, and rewires the MASTER_EF exhibit
bodies onto the dynamic generators.

Reference case (Zaca Preserve, project 2026-864): 7 properties, each with one home and
one ADU (14 units), built in three phases — Phase 1 = {P-1, P-2}, Phase 2 = {P-3, P-4},
Phase 3 = {P-5, P-6, P-7}. Completion Model is CRC.

---

## Data Model

All monetary values are integers in cents (per `CLAUDE.md`). Dates are `text` in
`YYYY-MM-DD`, matching the existing `project_details` convention.

### New: `phases`

```ts
phases = pgTable("phases", {
  id, organizationId, projectId,
  phaseNumber: integer().notNull(),
  name: text(),
  startOffsetDays: integer().default(0),
  manufacturingDays: integer(),
  onsiteDays: integer(),
  deliveryLagDays: integer().default(0),
  factoryStartOverride: text(),
  factoryCompleteOverride: text(),
  deliveryWindowOverride: text(),
  targetCoOverride: text(),
  createdAt,
}, (t) => [unique().on(t.projectId, t.phaseNumber)]);
```

### New: `properties`

```ts
properties = pgTable("properties", {
  id, organizationId, projectId,
  phaseId: integer().references(() => phases.id),   // nullable during entry
  propertyCode: text().notNull(),                   // "P-1"
  apn: text(), lotNumber: text(),
  address: text(), city: text(), state: text(), zip: text(),
  createdAt,
}, (t) => [unique().on(t.projectId, t.propertyCode)]);
```

`propertyCode` auto-generates as `P-1`…`P-n` on insert. `apn`, `lotNumber` and the
address fields are optional and exist so real identifiers can be attached later.

### New: `unit_configurations`

```ts
unit_configurations = pgTable("unit_configurations", {
  id, organizationId, projectId,
  name: text().notNull(),
  sqFt: integer().notNull(),
  pricePerSqFtLow: integer().notNull(),    // cents per sq ft
  pricePerSqFtHigh: integer().notNull(),   // cents per sq ft
  derivedOffsitePrice: integer().notNull(), // cents; sqFt * pricePerSqFtHigh
  createdAt,
});
```

`derivedOffsitePrice` is recomputed on every save, following the existing
`basePriceSnapshot` pattern. All downstream math uses the **high** end of the range;
the range itself is displayed in A.2 and B.1.

### Changed: `project_units`

```ts
+ propertyId: integer().references(() => properties.id)     // nullable
+ unitRole: text()                                          // 'home' | 'adu'
+ configurationId: integer().references(() => unitConfigurations.id)
```

`modelId` is already nullable. Exactly one of `modelId` / `configurationId` must be
set — enforced by zod in the route, not a DB check constraint, because
`drizzle-kit push` is the deploy path.

A property holds at most two units: one `home` and one `adu`. Enforced in the route.

**`quantity` is retained.** For a property-attached unit it is always 1, but the column
stays because the pricing rollup multiplies by it and so does B.1's second table. Legacy
projects keep their existing rows (Zaca's current contract has two rows at quantity 14
and 7) and continue to work untouched.

### Changed: `milestones`

```ts
+ phaseId: integer().references(() => phases.id)   // nullable for legacy rows
```

---

## Pricing Engine

`calculateProjectPricing` is extended **additively**. `server/lib/mapper.ts`,
`server/lib/tableGenerators.ts` and the override block in `server/routes/contracts.ts`
all read `breakdown.*` and `paymentSchedule`; those keys survive as project rollups.

```ts
calculateProjectPricing(projectId) → {
  phases: [{
    phaseId, phaseNumber, name,
    properties: [{ id, propertyCode, address, units: [
      { id, unitLabel, sourceName, squareFootage, bedrooms, bathrooms, quantity },
    ] }],
    breakdown: { offsite, shipping, onsite, customizations },
    phaseValue,
    milestones: [{ name, trigger, percentage, amount }],
    dates: { factoryStart, factoryComplete, deliveryWindow, targetCO },
  }],
  designFee,
  breakdown, paymentSchedule,        // existing keys, now project rollups
  projectBudget, contractValue, serviceModel, unitCount, unitModelSummary,
}
```

A project with no phases returns `phases: []` and behaves exactly as it does today.

### Phase value

```
phaseOffsite        = Σ (offsiteBasePrice ?? configuration.derivedOffsitePrice) × quantity
phaseShipping       = Σ shippingSetPrice × quantity
phaseOnsite         = Σ onsiteEstPrice × quantity
phaseCustomizations = Σ customizationTotal × quantity

phaseValue = phaseOffsite + phaseCustomizations + phaseShipping
           + (serviceModel === 'CMOS' ? phaseOnsite : 0)
```

`phaseCustomizations` is billed in `phaseValue` and is also reported separately in the
phase's `breakdown`. It is billed because every display path that renders a unit table
already added `customization_total` to the Unit Price the client signs against — the
document has been charging for customizations all along — and the project-level
`contractValue` now bills `totalCustomizations` to match. Customizations are a property
of the unit, not of the on-site scope, so they are billed under both completion models.

Summed over the units of the phase's properties. `financials.prelimOnsite`
(additional site work) is project-level and pro-rates across phases by each phase's
share of `phaseOnsite`; under CRC it does not reach contract value at all.

---

## Milestones & Payment Schedule

Milestones are **phase-scoped**. Each phase's percentages total 100% of that phase's
`phaseValue`. Only `percentage` is stored; amounts are always derived.

**The design fee is excluded from the milestone base.** It stays project-level and
appears once in A.5 as its own row at Execution. This is what fixes today's
double-count, where the $14,596,900 base already contained the $200,000 design fee and
Signing Deposit billed 20% of it on top of the separate Design Fee row.

### Default template

One schedule, the same under both completion models. Defaults only — once a user
edits, the sole rule is that the phase totals 100%.

| Milestone | Trigger | % |
|---|---|---|
| Signing Deposit | Contract Execution | 20 |
| Green Light | Green Light Notice | 20 |
| Production Start | First module fabrication | 20 |
| Production Midpoint | Midpoint certification | 20 |
| Delivery | Delivery and set complete | 15 |
| Retainage | CO/Equivalent | 5 |

Taken from the payment schedule in the September 2026 Zaca Preserve agreement, which
is the shape the business already issues. Retainage is a flat 5% of phase value and is
present under **both** CRC and CMOS — Zaca is a CRC project and carries it.

**This supersedes an earlier decision** that retainage should be withheld against
on-site scope only (`5% × phaseOnsite ÷ phaseValue`, yielding 0 and no row under CRC).
The issued contract shows otherwise. The earlier rule also produced a small non-round
retainage percentage under CMOS — 0.70% in the worked example it carried — which the
flat 5% avoids.

The percentages are model-independent; **`phaseValue` is not**, since it includes
on-site cost only under CMOS. So a CRC and a CMOS phase with identical units bill the
same percentages against different bases, which is the correct behaviour.

Amounts are `phaseValue × percentage`, with the rounding residual applied to the
Delivery milestone so amounts sum to `phaseValue` exactly — the same reconciliation
`pricingEngine.ts:186` already performs. Retainage's amount stays exact.

Note the Zaca table's own amounts are 20% of $14,596,900, a figure that **includes**
the $200,000 design fee. Those percentages are adopted; that base is not. The design
fee is excluded from the milestone base and billed once on its own Execution row, per
the section above — otherwise it is collected twice.

### Partially-attached projects

**Decision, open to revision before Plan B is written.** Step 4 now renders the
property editor directly above the legacy quantity-based unit list on the same screen,
so a project can hold both legacy quantity-based units and property-attached units at
once — not an edge case but the default path this branch creates. In that state the
project-level rollup (which sums every unit row × quantity) and Plan B's per-phase
rollup (which will sum only units reachable through phase → properties → units)
disagree, and `Σ phaseValue ≠ contractValue` with nothing reconciling them.

Generation must fail loudly rather than silently produce a contract with inconsistent
totals. Plan B adds a reconciliation check that refuses to generate when
`Σ phaseValue ≠ contractValue − designFee`, naming the unattached units in the error.

**The identity and its one exception.** `Σ phaseValue = contractValue − designFee`
holds under **both** completion models, but only when every unit sits on a property
that carries a phase. Customizations are billed in `phaseValue` exactly as they are in
`contractValue`, and `financials.prelimOnsite` pro-rates across phases, so neither
is a source of divergence. Units on an unphased property — or on no property at all —
are the sole exception: they are excluded from every phase while still counting at the
project level, which is precisely the state this check exists to refuse. The check to
encode is therefore the bare equality **plus** an enumeration of the unattached and
unphased units that explain any shortfall; it must not tolerate a difference on the
grounds that customizations or site work "always differ", because after Plan B they do
not.

The alternative considered — falling back to the project-level rollup whenever any
unit is unattached — was rejected because it would quietly emit a contract whose phase
tables and total disagree.

### Route

```
GET  /api/projects/:projectId/milestones
PUT  /api/projects/:projectId/milestones
     { "<phaseId>": [{ name, trigger, percentage }, …], … }
```

One phase-keyed payload, replaced in a single transaction. `milestoneNumber` is
assigned server-side from array order. Users may add, remove, reorder and rename
milestones; the only validation is that each phase's percentages total 100%.

`milestones` carries no `organizationId`, so tenancy is enforced one hop up on the
owning project. `projects.organizationId` is nullable and pre-multi-tenancy rows have
it unset; those stay reachable, matching the delete guard at
`server/routes/project-units.ts:132`.

---

## Timeline

One derivation chain, phases sequenced by default:

```
projectStart             = effectiveDate
designComplete           = projectStart + designDurationDays
phase[1].factoryStart    = designComplete + phase[1].startOffsetDays
phase[n].factoryStart    = phase[n-1].factoryComplete + phase[n].startOffsetDays
phase[n].factoryComplete = phase[n].factoryStart + phase[n].manufacturingDays
phase[n].deliveryWindow  = phase[n].factoryComplete + deliveryLagDays
phase[n].targetCO        = phase[n].deliveryWindow + phase[n].onsiteDays
```

`designDurationDays` is the existing `projects.designDuration` column (the wizard's
`designPhaseDays`). Manufacturing and on-site durations **move to the phase**: today
`manufacturingDurationDays` persists as `projects.productionDuration`, and on-site
duration has no column of its own at all — it survives only inside
`projects.completionDuration`, which stores design + manufacturing + on-site as a
single sum. `phases.manufacturingDays` and `phases.onsiteDays` give both a real home.

`startOffsetDays` defaults to 0, giving consecutive production runs; a positive value
inserts a gap and a negative one overlaps phases. Setting explicit offsets reproduces
either of the rejected alternatives (all phases concurrent, or fixed per-phase starts).

Every derived date has a nullable override column on `phases`; rendering is
`override ?? derived`.

**D.1 requires no new columns.** The four dates the wizard already collects —
`designKickoffDate`, `schematicDesignDate`, `permitSubmittalDate`,
`designDevelopmentDate` — become the override layer over dates derived from
`projectStart` plus D.1's review periods (5 / 10 / 10 / 5 business days, already in the
exhibit body). Same fields, same save path, now actually rendered.

**D.2 stays project-level**, rolling up as the earliest `factoryStart` and latest
`targetCO` across phases, because its table has one row per milestone rather than per
phase.

**C.4** renders the day counts the wizard already collects, so
`[TBD] days before delivery` becomes `14 days before delivery`. It does not resolve to
per-phase dates. Note the exhibit's table has only three rows — foundation ready,
utility stub, crane mobilization — while the wizard collects five;
`siteAccessReadyDays` and `permitsScheduledDays` have no row to render into and stay
unused until C.4 gains one.

### Wizard changes

- **Step 4 (Home Models)** gains property and phase entry. Properties are added as
  `P-1`…`P-n`, each taking up to a home and an ADU (catalog model or configuration),
  and each assigned to a phase. This is where phase membership is decided.
- **Step 6 (Dates & Schedule)** becomes purely the timeline: project start (read-only
  from Step 1), design duration and D.1 review periods, then one card per phase for
  manufacturing days, on-site days and start offset, each showing its derived dates
  with an override field.
- **Step 7 (Pricing)** gains the editable payment schedule (one table per phase) and
  separate inputs for offsite factory and offsite delivery/assembly.

---

## Exhibit Rewiring

The generators largely exist; the exhibit bodies never call them.

| Exhibit | Change |
|---|---|
| A.2 | → `{{EXHIBIT_A2_TABLE}}`. Generator rewritten: one row per property with its phase, its home and ADU, and the owning phase's four derived dates. |
| A.4 | → `{{EXHIBIT_A4_TABLE}}`, broken out per phase. `LOGISTICS_PRICE` wired to `breakdown.totalShipping`; `{{DESIGN_FEE}}` replaced by `{{DESIGN_FEE_WRITTEN}}`. Under CMOS the on-site scope renders as three rows: site prep, transport and setup, stitching and completion. |
| A.5 | → `{{EXHIBIT_A5_TABLE}}`: the project-level Design Fee row, then each phase's milestones with derived amounts. **The trailing `{{PAYMENT_SCHEDULE_TABLE}}` is removed.** |
| B.1 | First table → `{{EXHIBIT_B1_TABLE}}`, one row per property. Second table retained but grouped by model, so it still reads `14× Lumina` rather than 14 rows. |
| C.2 | → `{{RESPONSIBILITY_MATRIX_TABLE}}`, inheriting the inline-SVG checkmarks. Three columns (Task / Company / Client-GC); the Notes / Acceptance Standard column is dropped to match the wizard. |
| C.4 | Day counts rendered. |
| D.1 / D.2 | Target Date cells wired to derived dates. |
| Signatures | Exhibit A's hardcoded `DVELE, INC.` → `{{EXHIBIT_A_SIGNATURE_TABLE}}`, so both signature blocks resolve from one source. |

### Delivery mechanism

Exhibit bodies are `exhibits.content` database rows, editable through
`/admin/exhibits`. Hand-editing would leave environments silently divergent — and they
already are: seeded Lumina is 2053 sq ft at $587,840 while the September contract
renders 2033 sq ft at $645,800.

Rewiring therefore ships as a versioned script, `scripts/rewire_master_ef_exhibits.ts`,
runnable against any environment and idempotent. `server/seed-data.json` is refreshed
from the same source so a fresh checkout matches production.

---

## Defects Fixed

Confirmed against `2026-864_Zaca_Preserve_Master_Purchase_Agreement.pdf`.

| Defect | Cause |
|---|---|
| A.4 line items sum to $12,509,500 against a stated total of $14,596,900 — $2,087,400 unexplained on the face of the document | `LOGISTICS_PRICE: formatCurrency(0)` hardcoded at `mapper.ts:1004` |
| Design fee renders as `200000` beside `$12,309,500.00` | `{{DESIGN_FEE}}` resolves to a raw number (`mapper.ts:887`) |
| Design fee billed twice in A.5 | Milestone base includes the design fee, which also has its own row |
| A.2 and B.1 read "21 Units: 1x Gabriel, 1x Lumina" | Counts line items, not quantities (14 and 7) |
| C.2 checkmarks render as missing glyphs | The inline-SVG fix lives in `generateResponsibilityMatrixHtml`, which static C.2 never calls |
| C.4 reads `[TBD] days before delivery` | Collected values never referenced |
| D.1 / D.2 Target Date columns empty | `DESIGN_KICKOFF_DATE` and siblings resolve but are never referenced |
| A.2's four date columns empty | Generator passes empty strings |
| Company signs as `DP PO Box 953 Zaca Preserve LLC LLC` | Doubled suffix; entity name generated from a PO Box address |
| Client signature reads `Title: LLC` | `client.entityType` passed as the signer's title (`mapper.ts:1126`) |
| Master page names the child LLC as Company; Exhibit A names `DVELE, INC.` | Exhibit A's signature block is hardcoded |
| A.1 `Site(s)` prints the address twice | `buildFullAddress` re-appends city/state/zip already present in the address field |

---

## Implementation Order

The pieces interlock — exhibits cannot break out by phase before phases exist, and
pricing cannot subtotal per phase before properties hang off them — but they stage
cleanly:

1. **Schema + property/phase CRUD routes.** Additive tables; nothing reads them yet.
2. **Step 4 property & phase entry.** Makes the data enterable; Zaca becomes
   representable.
3. **Pricing engine `phases[]`.** Additive to the return shape; existing consumers
   untouched.
4. **`unit_configurations`** and the New Configuration entry path.
5. **Timeline derivation + Step 6 restructure.**
6. **Milestones route + Step 7 per-phase editor.**
7. **Exhibit rewiring script**, plus the pricing/formatting and signature-entity fixes.

Stages 1–3 are invisible in the generated contract. Stage 7 is where the document
changes, which makes it the right point to regenerate the Zaca contract and diff it
against the September PDF.

**As built, stages 3 and 4 were reversed.** Plan B landed `unit_configurations` and its
entry path *before* the pricing engine's `phases[]`, because a configuration changes how
a unit's offsite price resolves and the per-phase rollup reads that same resolution —
writing the rollup first would have meant rewriting it one task later. Nothing else
about this order changed.

---

## Migration & Back-Compat

- Every new table and column is additive. No existing column changes type or nullability.
- Schema ships by committing `shared/schema.ts` and pushing to `dev`;
  `docker-entrypoint.sh` runs `drizzle-kit push` on container start.
- Existing projects have no properties or phases. They return `phases: []`, keep their
  `quantity`-based rollups, and render exactly as they do today.
- No backfill. Properties and phases are entered going forward; a legacy project can be
  migrated by hand through the wizard if wanted.

---

## Assumptions

Recorded because they were not explicitly confirmed:

1. Under CMOS, A.4's on-site scope renders as three rows — site prep, transport and
   setup, stitching and completion — matching the categories named during design. Under
   CRC no on-site rows appear.
2. `financials.prelimOnsite` pro-rates across phases by on-site share rather than
   staying a single project-level line.
3. A property must be assigned to a phase before a contract can be generated, but may
   exist unassigned while the wizard is being filled in.

## Known Gaps

- `web-design-guidelines` is now installed locally at
  `.agents/skills/web-design-guidelines` but **not** committed — both `.agents/` and
  `skills-lock.json` are untracked, so a fresh checkout will not have the skill.
  Committing `skills-lock.json` and `.agents/skills/` is a prerequisite for Plans C and
  D, which both need it for their wizard surfaces. Note that skill discovery in this
  project reads `.claude/skills/`, so the skill may need symlinking there — or
  reinstalling with `-g` — before an agent can actually load it.

## Out of Scope

- **Google Docs export.** Replacing the PDF download with a generated Google Doc is a
  separate change, still blocked on which Google account, service account and Drive
  folder to use, and whether PDF download survives alongside it.
- Properties belonging to more than one phase, or a home and its ADU sitting in
  different phases. Moving `phaseId` from `properties` to `project_units` is a contained
  migration if this becomes real.
- Per-phase completion models. `Completion Model` is a single project-level election
  (Exhibit A.1).
- Backfilling phases onto historical projects.
- The 12 pre-existing `tsc` errors in the repository — 13 when this spec was written, one fewer since the dead `server/services/variable-mapper.ts` was deleted. They are unrelated to this work
  and this spec does not change their count.
