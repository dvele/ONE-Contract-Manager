# Phase & Property Model — Open Items and Findings

**Last updated:** 2026-09-14
**Branch:** `feat/phase-property-model` (unmerged)
**Covers:** Plans A and B of five. See
[`docs/superpowers/specs/2026-09-10-phase-property-model-design.md`](superpowers/specs/2026-09-10-phase-property-model-design.md)
for the design, and the plan documents beside it for what was built.

This file exists because the execution ledgers for both plans live under
`.superpowers/sdd/`, which is git-ignored. Everything below cost real effort to
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
the whole buffer lands on the last phase. Accepted for now. Plan D should encode this
behaviour rather than treat it as undecided.

---

## 2. Plan E prerequisites

Plan E rewires the MASTER_EF exhibit bodies onto the dynamic generators. **Three
defects live in those generators today.** They are invisible because no exhibit body
calls them — which is the original defect Plan E exists to fix — so wiring them up
without fixing them would ship a contract that contradicts itself.

| Where | Defect |
|---|---|
| `generateExhibitA4TableHtml` | Recomputes the total as `designFee + offsite + shipping (+onsite)` from `breakdown` instead of reading `contractValue`, and has no Customizations row. Once wired, A.4's Total Project Price prints below the payment schedule beside it on the same page. |
| `generateExhibitA5TableHtml` | Same recomputation, same omission. |
| `generatePricingTableHtml` | Emits no **Shipping** row although `contractValue` includes shipping, and its MANUFACTURING total excludes customizations. So the table is short one line item and long another against its own total. |

That is the same failure shape as the $2,087,400 gap in the issued September 2026 Zaca
Preserve agreement, where A.4's line items did not sum to A.4's own total.

Also for Plan E: `PhaseRollup.properties` carries property `id`, `propertyCode`,
`address` and per-unit detail specifically so A.2 and B.1 can be built without
re-querying the phase→property→unit join. Use it.

---

## 3. Findings that cost effort to establish

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
- **Three separate `pg.Pool` instances** (`server/db.ts`, `server/db/index.ts`,
  `server/routes/project-units.ts`), so a transaction cannot span a `project-units.ts`
  write and a shared-pool write.

---

## 5. Repo defects found while setting up

Unrelated to this work, but they cost a day and will cost the next person the same.

- **The documented dev setup fails on a clean machine.** `AGENTS.md` says to run
  `npx tsx scripts/seed_mvp.ts`. That script reads `process.env.DATABASE_URL` without
  importing dotenv, so `pg` falls back to a database named after the OS user; and it
  references a `users` table that no longer exists in `shared/schema.ts`. Work around
  it by exporting `DATABASE_URL` and inserting the `organizations` row by hand.
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
- 22 tests across 2 files, vitest 4 (v5 requires `@types/node` ≥22; this repo pins 20).
- **Nothing on this branch has been exercised through a browser or over HTTP.** Every
  `/api` route sits behind Cognito JWT validation. Verification was `tsc`, the vitest
  suite, and throwaway scripts driving the route handlers directly.

---

## 7. What to exercise first

1. **Regenerate a contract for an existing project and diff it against a pre-branch
   generation.** Both plans claim the document does not change. That claim is supported
   statically — no consumer reads `phases[]`, and `mapper.ts` and `tableGenerators.ts`
   are untouched — but it has never been confirmed empirically.
2. Step 4 end to end: properties, phases, unit attachment, a New Configuration, phase
   rename and delete.
3. Step 4 with the legacy quantity-based list and the new editor both populated. This
   is the default state the spec predicted and it has never been seen.
4. First `dev` deploy: `drizzle-kit push` runs on container start and will create
   `phases`, `properties`, `unit_configurations` and new columns on `project_units`.
   Watch the entrypoint log — a push failure means the API does not boot.

---

## 8. Deferred cleanups

- Extract `<ConfigurationForm>` (~150 lines, one `onCreate` dependency) from the
  611-line `UnitAttachmentEditor`. Deferred because refactoring UI nobody can
  click-test is risk without reward.
- No UI reaches `PATCH`/`DELETE /api/unit-configurations/:id`, so a mistyped
  configuration cannot be corrected and an orphaned one cannot be removed.
- `GET /project-units` still sorts by `unit_label`, which puts every ADU before its
  home and `P-10` before `P-2`.
- `.agents/skills/web-design-guidelines/` and `skills-lock.json` are untracked. Plans C
  and D both need that skill for their wizard surfaces, and a fresh checkout will not
  have it.
