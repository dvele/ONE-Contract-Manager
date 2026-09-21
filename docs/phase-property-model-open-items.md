# Phase & Property Model — Open Items and Findings

**Last updated:** 2026-09-21
**Branch:** `feat/phase-property-model` (unmerged)
**Covers:** all five plans, A through E — the arc is complete. See
[`docs/superpowers/specs/2026-09-10-phase-property-model-design.md`](superpowers/specs/2026-09-10-phase-property-model-design.md)
for the design, and the plan documents beside it for what was built.

**What is left is not more plans.** Nothing on this branch has been exercised through a
browser (§6), two product decisions are outstanding (§9), and the deployed database
needs `template_exhibits` populated and the rewire script run against it before a
generated contract carries any exhibits at all (§7).

This file exists because the execution ledgers live under `.superpowers/sdd/`, which is
git-ignored and deleted when a plan finishes. Everything below cost real effort to
establish and would otherwise be re-derived from scratch by the next session.

---

## 1. Decisions made, with their reasoning

### Customizations bill (decided 2026-09-14)

`project_units.customization_total` is now included in `projectBudget`,
`contractValue` and `phaseValue`.

The reasoning matters, because the field looked dead and is not. Every display path
that renders a unit table already added it to the unit price:

- `server/lib/mapper.ts:1069` → `{{UNIT_DETAILS_TABLE}}` → Exhibit B.1's second table
- `server/routes/contracts.ts:2188` and `:2306` → the same generator
- `server/lib/tableGenerators.ts` already emitted a Customizations row

Three independent places said the client pays it; only the totals disagreed. The
totals were changed to match the document, not the reverse.

**This is inert until something writes the field.** Nothing in the application does —
`customization_total` is writable only through `POST`/`PATCH /api/project-units` from
the request body, and no client code sends it. `financials.home_customizations` is
never written at all. Verified byte-identical output before and after on a
zero-customization project.

The column was previously aliased as `onsiteEstimateSnapshot` in `helpers.ts`, which
is why this took a full trace to find. That alias is gone.

### On-site buffer distribution (accepted as-is 2026-09-14)

When a CMOS project's phases collectively carry **zero** on-site cost but
`financials.prelimOnsite` is nonzero, every proportional share computes to zero and
the whole buffer lands on the last phase. Accepted, and **encoded** in Plan D: `proRate`
in `server/services/pricingMath.ts` gives the last phase the whole figure when every
weight is zero, with a comment pointing here. Dropping it instead would bill less than
the project total. The same rule now governs the two offsite adjustments.

---

## 2. Plan E's prerequisites, and how they resolved

### The dormant generator defects — all fixed

**Historical, kept for the lesson.** Before Plan E, three defects sat in generators that
no exhibit body called. They were invisible precisely *because* nothing called them, and
wiring them up unfixed would have shipped a contract that contradicts itself — which is
why Plan E fixed them in tasks 3-5, before task 7 wired anything.

| Where | Defect | Fixed |
|---|---|---|
| `generateExhibitA4TableHtml` | Recomputed the total as `designFee + offsite + shipping (+onsite)` from `breakdown` instead of reading `contractValue`, and had no Customizations row | `ba7ea56` |
| `generateExhibitA5TableHtml` | Same recomputation, same omission | `75ed7a3`, and again in the fix wave (`19064b5`) once it emerged that the Total still ignored which rows were rendered |
| `generatePricingTableHtml` | Emitted no **Shipping** row although `contractValue` includes shipping, and its MANUFACTURING total excluded customizations — short one line item and long another against its own total | `ba7ea56` |

That was the same failure shape as the $2,087,400 gap in the issued September 2026 Zaca
Preserve agreement, where A.4's line items did not sum to A.4's own total.

**The lesson:** dead code in this repo is not inert, it is *pending*. A generator nothing
calls accumulates defects no test and no document will reveal, and the moment something
calls it the defects ship. `generateUnitDetailsHtml`, `generatePaymentScheduleHtml` and
`renderUnitPricingTable` (§3) are all still in that state.

`PhaseRollup.properties` carries property `id`, `propertyCode`, `address` and per-unit
detail specifically so A.2 and B.1 can be built without re-querying the
phase→property→unit join.

### What fills D.1's D-4 cell (raised 2026-09-16, decided 2026-09-21, wired in Plan E)

**The bindings are correct — do not "fix" them.** Verified against the seeded exhibit
body: D.1's rows are D-1 Kickoff, D-2 Schematic, D-3 Permit Set, D-4 Green Light
Package, and `mapper.ts` binds `PERMIT_SUBMITTAL_DATE` to the permit-set milestone
(D-3) and `DESIGN_DEVELOPMENT_DATE` to the green-light package (D-4). They print in
ascending order. An earlier ledger entry claiming the two were transposed is wrong.

**Decided 2026-09-21, and as shipped D-4's cell is `{{DESIGN_DEVELOPMENT_DATE}}`,
resolving a three-term chain** (`mapper.ts`):

```ts
asCalendarDate(projectDetails?.designDevelopmentDate) ??   // the wizard's own D-4 field
  asCalendarDate(projectDetails?.greenLightDate) ??        // the older hand-entered column
  designMilestones.greenLightPackage                       // the derivation
```

A hand-entered date wins over a derived one — the same asserted-overrides-derived rule
Plan C established for the four phase dates — and the derivation keeps the cell from
printing TBD where nobody filled the field in, which is most projects.

**The first decision was two-term (`greenLightDate` then the derivation) and was wrong.**
It dropped `designDevelopmentDate`, which is not dead: `Step6DatesSchedule.tsx:38` writes
it from a field labelled "Green Light Package (D-4)". Shipping that would have silently
discarded exactly what a user typed into the D-4 field. Caught while dispatching the task,
because the implementer was told to check the column's writers before deleting a term.

Exactly one variable fills the cell. Wiring both would print two dates for one milestone.
Renaming `design_development_date` was **not** in Plan E; the variable stays misnamed and
the two paragraphs below stay true.

The reasoning that was unresolved until then:

1. **`DESIGN_DEVELOPMENT_DATE` is misnamed.** It derives ten business days *after*
   `PERMIT_SUBMITTAL_DATE`, which the two names imply backwards — design development
   normally precedes permit submittal. The column is
   `project_details.design_development_date` and the variable is public in
   `VARIABLE_CATEGORIES`, so renaming it is a migration plus a variable-library change,
   not a one-line edit. Step 6 now labels the field "Green Light Package (D-4)" to
   match what it actually holds; the variable still reads the other way.
2. **`GREEN_LIGHT_DATE` already exists**, over `project_details.greenLightDate` — a
   hand-entered column with no derivation. So two variables plausibly belong in D-4's
   Target Date cell. Settled by the chain above, which reads both in precedence order
   rather than binding either variable to the cell on its own.

---

## 3. Findings that cost effort to establish

### A `YYYY-MM-DD` date renders one day early west of UTC — four copies, three now fixed

`new Date("2026-03-02")` is UTC midnight, so formatting it in the host's local zone prints
"March 1, 2026". Invisible on ECS, where `TZ=UTC`. Wrong on any developer machine in the
Americas, and wrong anywhere the deployment timezone changes. It puts a date one day early
into an executed agreement — the kind of error nobody notices until a deadline is disputed.

The defect was **copied four times**, and each copy had to be found separately:

| Where | Fixed |
|---|---|
| `mapper.ts` `formatDateOrTBD` | Plan C |
| `mapper.ts` `formatDateWritten` (~12 variables) | Plan E task 2, `97e6b08` |
| `contractGenerator.ts` `formatDate` — the cover page's Effective Date | Plan E fix wave, `2c28102` |
| `mapper.ts`'s *other* `formatDate` — latent, feeds `DELIVERY_DATE`, `COMPLETION_DATE`, `PROJECT_START_DATE`, `PROJECT_END_DATE`, `PRICE_LOCKED_AT` | Plan E fix wave, `2c28102` |

A fifth lives at `tableBuilders.ts:87` (`TODAY_DATE`); it formats "now" rather than parsing
a date string, so it is arguably correct and was left alone.

**The lesson worth keeping:** the fix is one line, but finding every copy took three
separate discoveries across two plans, and the tests guarding it passed trivially under
`TZ=UTC` — which is what let copies two and three survive a green suite. `npm run test:tz`
now runs the suite under `TZ=America/Los_Angeles`. Use it before believing a date is right.

### The exhibit bodies did not reference the schedule variables at all — fixed in Plan E

Resolving a variable in `mapper.ts` does not make it appear in a contract. The MASTER_EF
exhibit bodies are `exhibits.content` database rows, and until Plan E D.1's and D.2's
Target Date cells were literal empty `<td></td>` while C.4 carried the literal text
`[TBD] days before delivery` — a search of the seeded content found **zero** occurrences
of `DESIGN_KICKOFF_DATE`, `PRODUCTION_START_DATE`, `FOUNDATION_READY_DAYS` or any of the
other eleven. Plan C was written as though the mapper alone would fill them and had to be
corrected mid-execution.

Plan E wired them through `scripts/rewire_master_ef_exhibits.ts`, which is idempotent,
scoped to MASTER_EF rows, and throws rather than guessing when a body diverges from what
it expects. It replaces five whole tables with `{{…}}` placeholders and fills D.1/D.2/C.4
cell by cell, because those tables carry the agreement's own deliverable and
review-period text in their other columns.

**This has been run against the local database only.** Editing `server/seed-data.json`
changes what a fresh checkout seeds and nothing else, so the deployed rows keep their
hardcoded tables until the script is run there.

### `renderUnitPricingTable` has never executed successfully

`server/services/component-library.ts:129-131` selects `hm.model_name` and
`hm.square_footage`. Neither column exists — they are `name` and `sq_ft`. Any contract
containing `{{UNIT_PRICING_TABLE}}` or `{{UNIT_SPEC_TABLE}}` raises Postgres `42703`.

This is a fourth contract-content unit read, beyond the three that were scoped during
Plan B. It is also filtered on the **caller's** organization rather than the
**project's**, the opposite convention from everywhere else. Safe today only because
`project_units.organizationId` is `.notNull()`.

### Unit reads and their organization convention

Four places read `project_units` for contract content. Three now scope to the
**project's own** organization, using this shape:

```sql
WHERE pu.project_id = $1 AND ($2::int IS NULL OR pu.organization_id = $2)
```

The `$2::int IS NULL` disjunct is load-bearing: `projects.organizationId` is nullable
for pre-multi-tenancy rows, and without it a legacy project generates a contract with
**no units at all** — blank exhibits, zero totals, a document that looks complete and
is empty. Preserve it in any new read.

`component-library.ts` is the fourth and does not follow this.

### `milestones` has no `organizationId`

`AGENTS.md` states every table has one. `milestones` does not. Tenancy for it must be
enforced one hop up, on the owning project.

---

### Web Interface Guidelines deviations in the payment editor (recorded 2026-09-16)

`PhasePaymentEditor.tsx` departs from two rules in
`.agents/skills/web-design-guidelines`, deliberately:

- **Destructive actions need a confirmation or an undo window.** Removing a
  milestone row has neither. The row is draft state until Save, and
  *Discard Changes* restores the whole set from the server — the undo exists, it
  is just not per-row. A modal per row deletion in a table people restructure
  freely would cost more than it protects.
- **Amounts are derived in the client**, duplicating `priceSchedule` in
  `server/services/pricingMath.ts`. `PhaseScheduleEditor` deliberately reads its
  dates back from the server instead; that is not possible here, because the
  amounts shown belong to percentages the user has typed and not yet saved. The
  residual rule is mirrored exactly so the figure on screen equals the figure
  that reaches the contract. **If either rule changes, both must change.**

## 4. Known latent issues, no live data path

None of these are reachable through the application today. All are recorded rather
than fixed because fixing them unverified buys nothing.

- **`POST /api/project-units` takes `basePriceSnapshot` from the request body** for
  model-priced units. The wizard route and PATCH both derive it. That value reaches
  the unit-details table's per-unit price, so a caller could make one line item
  disagree with the pricing table on the same contract.
- **Bad-id 500s.** `POST /api/project-units` validates none of its body ids, and PATCH
  does not validate `propertyId`, so a non-numeric value reaches Postgres and surfaces
  as a 500 rather than a 400.
- **Null-organization projects are writable cross-tenant.** `projectAccessible` admits
  them and the pricing filter retains all their units — both deliberate, to keep legacy
  projects working. Composed, any authenticated caller can write a unit into a
  pre-multi-tenancy project and have it priced. Backfilling `projects.organization_id`
  would close it.
- **Every money column is `int4`**, ceiling $21,474,836.47 per row. Per-unit values sit
  well under it and totals are summed in JavaScript rather than stored, so nothing is
  broken — but a single unit above that has nowhere to go and no constraint says so.
  `unit_configurations` guards its own product explicitly; nothing else does.
- **`POST /contracts/:id/regenerate` leaks an open transaction.** It issues
  `BEGIN` and then returns early on two paths — "Template not found" (404) and
  "Template has no clauses" (400) — without `ROLLBACK`. The `finally` releases
  the client back to the pool still **idle in transaction**, so the next caller
  to borrow it runs inside a transaction that is never committed. Found while
  verifying Plan D Task 5: a throwaway script's cleanup `DELETE`s silently
  vanished when the pool closed. Pre-existing, unrelated to the reconciliation
  gate (which returns before `BEGIN`). The fix is a `ROLLBACK` on both paths, or
  moving `BEGIN` below them.
- **Three separate `pg.Pool` instances** (`server/db.ts`, `server/db/index.ts`,
  `server/routes/project-units.ts`), so a transaction cannot span a `project-units.ts`
  write and a shared-pool write.

---

## 5. Repo defects found while setting up

Unrelated to this work, but they cost a day and will cost the next person the same.

- **The documented dev setup failed on a clean machine — fixed 2026-09-21.**
  `scripts/seed_mvp.ts` reads `process.env.DATABASE_URL` without importing dotenv, so
  `pg` falls back to a database named after the OS user, and it references a `users`
  table that no longer exists in `shared/schema.ts`. `npm run seed:dev`
  (`scripts/seed_dev_fixtures.ts`) replaces it and `AGENTS.md` now points there.

  The deeper gap it closes: `seedProductionData` covers clauses, exhibits, templates and
  template clauses but **not `home_models` and not `template_exhibits`**. With no home
  models Step 1 has nothing to select, so no project can be priced and Steps 4, 6 and 7
  are unreachable; with no junction rows `fetchExhibitsForContract` returns nothing and a
  generated contract silently carries **no exhibits at all**. Both failures look like app
  bugs rather than missing fixtures, which is what made them expensive. The new script
  resolves the junction from `exhibits.contract_types` and `exhibits.sort_order` rather
  than by id, so it seeds any environment; it is idempotent; and it exits non-zero when a
  template resolves no exhibits.

  `scripts/seed_mvp.ts` is left in place but should not be used.
- Homebrew Postgres names its superuser after the OS user, not `postgres`, which the
  committed `.env` expects. `createuser -s postgres` fixes it.

---

## 6. Facts a future session needs

- **The `npm run check` baseline is 12**, not 13. It fell when the dead
  `server/services/variable-mapper.ts` was deleted — that file carried one of the
  thirteen. Twelve is correct; do not treat it as a regression.
- **Test files are not type-checked by anything.** `tsconfig.json` excludes
  `**/*.test.ts`, and vitest does no type-checking of its own, so a type error in a test
  never fails `npm run check`. Verified by injecting one and watching the count stay at
  12. Do not assume a wrong argument type or a stale signature in a test will be caught
  by a gate — it will not.
- **The test suite must stay hermetic.** Run it as `env -u DATABASE_URL npm test`.
  A test that imports a database-bound module passes only in a polluted shell; this
  happened once and was caught only by running the gate outside the subagent's
  environment. `server/services/pricingMath.ts` imports nothing, deliberately.
- **153 tests across 11 files**, vitest 4 (v5 requires `@types/node` ≥22; this repo pins
  20). Vitest's `include` now reaches `client/src/**/__tests__/**/*.test.ts` as well as
  `server/**` — widened in Plan E for `shared/llcName.ts`'s tests. Do not widen it
  further without adding a DOM environment; a test that reached a React component would
  fail on this config.
- **`npm run test:tz` runs the whole suite under `TZ=America/Los_Angeles`.** Added in
  Plan E because the UTC date tests pass trivially under `TZ=UTC`, which is how two
  copies of the same date defect survived a green suite. Run it before believing a date
  is right.
- **`server/lib/mapper.ts` and `server/lib/tableGenerators.ts` are import-hermetic** —
  their chain (`tableStyles`, `scheduleMath`, type-only schema imports) touches no
  database module. That is what makes the document code testable, and it is why the
  twelve document defects could be locked down by tests rather than eyeballed in a PDF.
  Keep it true.
- **Almost nothing on this branch has been exercised through a browser.** Every `/api`
  route sits behind Cognito JWT validation, so verification was `tsc`, the vitest suite,
  throwaway scripts driving the route handlers directly, and — for the generated document
  — one end-to-end regeneration diffed against the issued Zaca Preserve PDF.
  **One browser run has now happened**: Step 4's property, phase and unit-attachment path,
  on project 42, with the pricing identity confirmed to the cent (§7 item 2). Everything
  else is still unclicked — Step 6's timeline, Step 7's payment editor and offsite inputs,
  and generation from the wizard. That remains the largest unretired risk on the branch.

---

## 7. What to exercise first

1. **Done (2026-09-21, Plan E task 9).** The MASTER_EF document was regenerated from a
   local reconstruction of the issued 2026-864 Zaca Preserve project (21 units: 14×
   Lumina, 7× Gabriel; `$200,000` design fee; `$14,596,900` contract value, reproducing
   the issued figures to the cent) and diffed both against the issued PDF and against a
   pre-rewire generation. Plan D's reconciliation gate did not fire. The before/after
   diff contains ten hunks and every one maps to a named defect — no unexplained change.
   Seventeen of twenty checked conditions are fixed: A.2's quantities and four dates,
   A.4's sum and currency formatting and non-zero Delivery/Assembly, A.5's single
   design-fee row and priced per-phase milestones, B.1's per-unit rows, C.2's checkmarks
   (inline SVG, no more `&#10004;` tofu), C.4's day counts, D.1/D.2's eight target dates
   including D-4's green-light date, and all three signature-block defects. What the
   comparison found still broken, **and what the fix wave that followed it did about
   each** — the comparison ran before that wave, so read the two together:

   - **A.1 printed the site address twice.** Exhibit 78's `Site(s)` row was
     `{{SITE_ADDRESS}}, {{SITE_CITY}}, {{SITE_STATE}} {{SITE_ZIP}}`, and `SITE_ADDRESS`
     is already a full address, so `buildFullAddress`'s dedup guard could not see the
     template's trailing three variables. **Fixed** (`8539cdb`): the cell is now
     `{{SITE_ADDRESS}}` alone, applied to the database and `seed-data.json` through the
     rewire script. Still true that nothing tests `buildFullAddress` or `SITE_ADDRESS`.
   - **The cover page printed the Effective Date one day early** west of UTC:
     `September 2, 2026` on the cover against `2026-09-03` in the body. **Fixed**
     (`2c28102`): `contractGenerator.ts`'s `formatDate` now delegates to
     `formatDateWritten`, and a *second* offender found at the same time —
     `mapper.ts`'s other `formatDate`, latent but feeding `DELIVERY_DATE`,
     `COMPLETION_DATE`, `PROJECT_START_DATE`, `PROJECT_END_DATE`, `PRICE_LOCKED_AT` —
     got `timeZone: "UTC"` too. `npm run test:tz` now runs the suite under
     `TZ=America/Los_Angeles`, because the UTC tests pass trivially under `TZ=UTC` and
     this defect class had by then appeared three times.
   - **The doubled-LLC-suffix / PO-box fix reached only the client generator.**
     **Fixed** (`6030745`): the corrected implementation moved to `shared/llcName.ts`,
     `client/src/lib/llcUtils.ts` re-exports it, and `POST /projects` calls it instead
     of its own inline regex. A *third* generator exists at
     `server/services/llc-service.ts:77` using a different convention entirely and
     imported by nothing — dead code, and exactly the divergence that let this defect
     survive half-fixed.
   - **C.2's rewiring deleted the exhibit's `Notes / Acceptance Standard` column** (20
     rows of per-row legal text: `Per Exhibit B`, `Must meet Dvele tolerances`, …) and
     its `Factory fabrication — Dvele` row. The generated matrix is three columns from
     the wizard defaults; the regenerated Exhibit C.2 no longer allocates factory
     fabrication to Dvele. **Still open, deliberately** — it needs a product decision,
     not a patch. See §9. What *was* fixed (`1acd43a`) is the separate problem that C.2
     rendered entirely empty when no matrix was stored, under a C.5 that says
     responsibilities are "allocated exclusively as set forth in this Exhibit C".
   - **A.4 dropped the admin-fee percentage**: `At cost plus admin fee of 10%` became
     `At cost plus admin fee` — an uncapped markup with no stated rate. **Fixed**
     (`3b1ce1c`): the generator takes `project.adminFeePercent` and omits the clause
     entirely when there is no percentage.
   - A.5's `%` column mixed denominators. **Fixed** (`19064b5`): the header reads
     `% of Phase` when phases render and `% of Balance` for the phase-less fallback,
     and the Total row's cell is `—`.
   - **`BUYER_TYPE` compares `buyerType === "developer"` case-sensitively** against an
     unconstrained `text` column, so a stored `Developer` labels a developer agreement
     `End Customer`. **Still open** — never in any fix wave's scope.

   The fix wave also closed two defects the comparison could not see, because its
   fixture was fully phased: A.5's Total printed `contractValue` regardless of which
   rows it rendered (a phase-less project showed one `$200,000` row under a
   `$14,596,900` Total), and phase-less projects had lost their payment schedule
   entirely, breaking the spec's back-compat promise. Both fixed in `19064b5`; the
   Total is now derived from the rows rendered, and the fallback re-prices
   `paymentSchedule` against `contractValue − designFee` so the design fee stays billed
   once. See §9 for what remains open after that.

   Two prerequisites the comparison had to supply, both absent from `seedProductionData`:
   `template_exhibits`, without which `fetchExhibitsForContract` returns nothing and a
   generated contract carries **no exhibits at all**; and `home_models`, without which no
   project can be priced. **Both are now seeded by `npm run seed:dev`** (§5) — but that
   only fixes environments where it has been run. **Check both in staging before trusting
   any deployed generation**, because nothing in the deploy path runs it. Separately,
   `POST /contracts/draft-preview` ignores `req.body.templateId` and never calls
   `resolveTemplateId` — it reads `template_id` only off the newest saved `contracts`
   row, so the first preview of a project renders with no exhibits.
2. **Step 4 — partly done (2026-09-21), the first browser exercise on this branch.**
   Project 42 `25-002 Maia/Mariposa`, CRC, created by hand through the wizard. The rows
   it wrote were inspected and the pricing engine run over them:

   | Figure | Value | Check |
   |---|---|---|
   | 2× Lumina offsite | $1,291,600.00 | 645,800 × 2 |
   | shipping | $90,000.00 | 45,000 × 2 |
   | onsite | $240,000.00 | correctly excluded from `contractValue` under CRC |
   | `contractValue` | $1,386,600.00 | fee + offsite + shipping |
   | **Σ `phaseValue`** | **$1,381,600.00** | **= `contractValue` − `designFee`, exactly** |
   | Phase 1's six milestones | 276,320×4 + 207,240 + 69,080 | **= $1,381,600.00, to the cent** |

   `reconciliation` came back `{reconciles: true, shortfall: 0, unexplained: 0}`. This is
   the first empirical confirmation of the identity Plans B through D were built around —
   everything before it was `tsc`, vitest and handler-driving scripts.

   Four things this established that nothing had:

   - **The null discipline survives a real wizard save.** `prelim_onsite`,
     `additional_offsite` and `additional_delivery` are all `NULL`, not `0`. Three
     separate defects on this branch came from that distinction collapsing.
   - **Plan C's duration fallback works.** Neither phase has `manufacturing_days` or
     `onsite_days`, yet all four dates derived from the project's 60/120/90, and Phase 2
     starts where Phase 1's factory completes.
   - **An empty phase behaves.** Phase 2 has no properties: $0 value, zero milestones, no
     fabricated rows.
   - **One home plus one ADU on a single property** is accepted, per the rule in
     `server/lib/unit-attachment.ts`.

   Exercised: property create (3) and **delete** (property 18 was created and removed —
   the id gap is the evidence), phase create (2), unit attachment.
   **Still not exercised:** a **New Configuration** (`unit_configurations` has no rows and
   its sequence never advanced), **phase delete** (`phases_id_seq` is 46 and both 45 and 46
   survive), and **phase rename** (Phase 1 is named "Phase 1", Phase 2 is unnamed, so a
   rename cannot be distinguished from the default).

   Also still unexercised on this project: Step 7's payment editor (no stored milestones,
   so Phase 1 renders the default template), both Offsite Services inputs (still `NULL`),
   and generation (no `contracts` row).

   **A correction worth recording, because it is an easy mistake to repeat:** attaching a
   unit to an unphased property does **not** trip Plan D's reconciliation gate. Such a
   unit is *explained* — `reconcilePhases` returns `reconciles: true` with
   `explainedByUnphased: true`, and Plan D has a test asserting exactly that. For a
   unit-priced project the identity holds by construction, because both sides derive from
   the same unit rows, so the gate is close to unreachable from the browser. It guards
   against future drift, not user error. The reachable divergence is the
   financials-fallback path (phases but no units, with `prelim_offsite` set).

   What a browser run *can* usefully show instead: attach a unit to the already-unphased
   P-3 and generate. A.4 prints the full contract price while A.5 prints only the phased
   subtotal — the parked decision in §9, made visible on a page.

   Cosmetic, noticed in passing: Phase 1's `deliveryWindow` and `factoryComplete` are the
   same date, because `deliveryLagDays` defaults to 0, so Exhibit A.2 prints one date in
   two adjacent columns.

3. Step 4 with the legacy quantity-based list and the new editor both populated. **Still
   never seen** — project 42's units are both property-attached, so this remains the state
   the spec predicted and nobody has looked at.
4. First `dev` deploy: `drizzle-kit push` runs on container start and will create
   `phases`, `properties`, `unit_configurations` and new columns on `project_units`.
   Watch the entrypoint log — a push failure means the API does not boot. Remember that
   nothing in the deploy path seeds `home_models` or `template_exhibits` (§5), and that
   the deployed `exhibits` rows keep their hardcoded tables until
   `scripts/rewire_master_ef_exhibits.ts` is run there (§3).

---

## 8. Deferred cleanups

- Extract `<ConfigurationForm>` (~150 lines, one `onCreate` dependency) from the
  611-line `UnitAttachmentEditor`. Deferred because refactoring UI nobody can
  click-test is risk without reward.
- No UI reaches `PATCH`/`DELETE /api/unit-configurations/:id`, so a mistyped
  configuration cannot be corrected and an orphaned one cannot be removed.
- `GET /project-units` still sorts by `unit_label`, which puts every ADU before its
  home and `P-10` before `P-2`.
- `.agents/skills/web-design-guidelines/` and `skills-lock.json` are still untracked, so
  a fresh checkout will not have the skill Plans C and D used for their wizard surfaces.
  Both plans have landed, so nothing is blocked — but the next wizard change will want
  it, and note that skill discovery in this project reads `.claude/skills/`.

---

## 9. Left open by Plan E (2026-09-21)

Plan E rewired the MASTER_EF exhibit bodies onto the dynamic generators and fixed
eleven of the twelve documented defects. These were found during it and deliberately
not fixed. Each is recorded with the reasoning, because the reasoning is the expensive
part.

### Decisions that are yours, not the implementation's

- **C.2 lost its `Notes / Acceptance Standard` column and its `Factory fabrication —
  Dvele` row.** The column drop is sanctioned by the design spec ("the Notes /
  Acceptance Standard column is dropped to match the wizard"). The row loss follows as
  an unstated consequence: `responsibilityDefaults.ts` has no factory-fabrication item,
  the wizard UI cannot add one, and `ResponsibilityMatrixItem` has no notes field — so
  **every** contract loses both, not just a test fixture. Restoring either means
  reverting a spec decision or extending the wizard's data model, and there is a real
  argument that an offsite row does not belong in Exhibit C's *on-site* matrix at all.
  C.2 can no longer render empty (a server-side default now backs it), but it renders
  the wizard's five categories and nothing else.

- **A.4 and A.5 now state different totals for a partially-attached project** — units on
  properties with no phase. A.4 prints the contract price; A.5 prints only the phased
  subtotal. Both figures are honest and `reconcilePhases` deliberately permits
  generation in this shape. Previously the inconsistency was hidden *inside* A.5, which
  asserted a total its own rows did not support; it is now visible *between* two
  exhibits. Whether such a project should generate a MASTER_EF at all is a decision
  about what the document may say.

### A real defect, contained, worth its own task

- **The printed Amount column does not sum to the printed Total** for roughly three
  quarters of whole-dollar inputs, by $1–$3, on both A.5 paths. `formatCurrency` rounds
  each row to whole dollars independently while the Total is derived from exact cents.
  **Pre-existing** — the old code printed the identical string, and
  `generatePaymentScheduleHtml` has the same structure — so Plan E did not worsen it.
  But `exhibit-a5.test.ts` now asserts this exact invariant and passes only because its
  fixture splits cleanly, so the suite carries a claim that does not hold in general.
  The fix is at the display layer: round each row, then derive the Total from the
  rounded figures.

### Smaller items

- `--write-seed` iterates every exhibit in `seed-data.json` unscoped, while the database
  query is correctly scoped to MASTER_EF. Latent: no seed exhibit matches a rewiring.
- `repriceAgainst` divides by the sum of the stored percentages rather than by 100, so a
  stored set not totalling 100 misstates its own denominator. House behaviour — it
  mirrors `generatePaymentScheduleHtml`.
- A **fourth** `toLocaleDateString` without `timeZone` at `tableBuilders.ts:87`. It
  formats "now", so it is arguably correct, but it is the same copy-count problem.
- A **third** `generateLLCName` at `server/services/llc-service.ts:77`, using a different
  naming convention entirely and imported by nothing. Dead code, and exactly the
  divergence that left the doubled-suffix defect half-fixed until the final review.
- `PROJECT_START_DATE` substitutes `new Date()` for a missing execution date — a
  fabricated default for a missing input, which the rest of this branch spent four plans
  removing.
- `{{DESIGN_FEE}}` (a bare number, not currency) appears three times in `seed-data.json`'s
  **clauses** array, none supplying its own `$`. Out of scope for an exhibits-only
  script; needs its own task.
- `POST /contracts/draft-preview` ignores `req.body.templateId` and never calls
  `resolveTemplateId`, so a first preview renders with zero exhibits — the hazard
  `AGENTS.md` warns about.
