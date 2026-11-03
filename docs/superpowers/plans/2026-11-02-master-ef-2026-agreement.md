# Master EF 2026 Agreement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the October 2026 "Dvele Master Factory Built Home Agreement" (seller is the project's LLC, currently Dvele AZ, LLC; three Delivery Models) the MASTER_EF template every new contract is generated from, without changing how already-issued contracts render.

**Architecture:** The new agreement ships as a **new** `contract_templates` row with its own clauses and exhibits; the old MASTER_EF row is deactivated, not edited, so contracts carrying the old `templateId` keep their clauses and exhibits. The agreement's content is checked in as reviewed HTML/JSON source (not regex-parsed at install time) and installed by one transactional, bundled script. A third delivery model `FOB` joins the existing stored codes `CRC`/`CMOS`, which keep their values and gain new labels. Everything that renders differently under the new agreement (A.4, A.5, signatures, A.1 elections) is a **new** variable or generator, so old exhibits' placeholders resolve exactly as before.

**Tech Stack:** TypeScript (ESM), Express 5, Drizzle/Postgres, React 18 wizard, vitest, mammoth, esbuild (`script/build.ts`).

**Spec:** No separate spec doc. The source of truth is the agreement itself, `/Users/work/Downloads/20261022 Dvele AZ Factory Built Home Agreement.docx` (copied into the repo in Task 8), plus the decisions below, made with the product owner on 2026-11-02.

### Decisions (the spec this plan argues from)

1. The new agreement replaces Master EF everywhere. The ONE contract type is retired.
2. Delivery Models map to stored `projects.on_site_selection` codes: **FOB Factory = `FOB` (new)**, **Delivered to Site = `CRC`**, **Dvele GC = `CMOS`**. Existing CRC/CMOS projects need no migration.
3. **The seller is the project's LLC, chosen in wizard Step 5 as today** (revised 2026-11-03). For now every project selects the existing LLC "Dvele AZ, LLC". Development projects will later create their own LLC per project through the same step. The Step 5 logic, LLC creation and the Generate gate stay unchanged. The agreement's hard-coded "Dvele AZ, LLC, an Arizona limited liability company" becomes variables. "Dvele" remains the defined term whichever LLC sells.
4. The pricing engine's design fee is **folded into the Purchase Price**. The agreement has no separate design-fee line; the 10/40/40/10 milestones split a price that includes it.
5. A.4 Pricing Summary shows **cost components**: factory, delivery & set (not FOB), on-site (Dvele GC only), customizations, total, plus Cost/sqft. A.5 carries the payment milestones.
6. The GC Affiliate (Dvele GC) and the Buyer's GC (FOB, Delivered to Site) are both the project's existing `contractors` row with `contractorType = 'onsite_general'`. No schema change for this.
7. **Design fee checkbox** (requested 2026-11-03), a per-project "Show design fee in A.4" checkbox, default unchecked.
   - Unchecked: A.4 includes the design fee in the Factory-Built Home(s) line (Decision 4).
   - Checked: A.4 shows `Design / Pre-Production Fee` as its own line, and the Factory line excludes it. The Purchase Price total is identical either way.
   - **A.5 never changes**: the design fee is always folded into the four payments.
   - Display only, so no agreement wording changes.
8. **C.2 matches the agreement** (2026-11-03). The matrix uses the agreement's 19 Work Categories and Notes, with Dvele / Buyer/GC columns. The wizard's matrix editor switches to the same list.
9. **The third signature column is the GC Affiliate** (confirmed 2026-11-03; §2(b)(iii)). It is shown only when Dvele GC (`CMOS`) is elected, on both the main agreement and Exhibit A, as in the draft.
10. **Governing law** defaults to **Arizona** when the project sets none. Mediation and arbitration always share `ARBITRATION_LOCATION`.
11. **State notices** (2026-11-03):
    - **The California Song-Beverly waiver (`xWARRANTY_EXCLUSIVITY`) is not used** (confirmed 2026-11-03).
    - **Exhibit E warranty notice:** reuse the existing California notice (old Exhibit E, `PURSUANT TO CAL. COM. CODE § 1201(b)(10)…`) as the statute prefix for CA. Every other state gets the agreement's notice with no prefix.
    - **Exhibit F** (confirmed 2026-11-03) keeps the new agreement's F.1/F.3 text. F.2 is a new per-state code, `MASTER_EF_2026_STATE_NOTICES`, combining what each state already has:
      - its `MASTER_EF_NOTICES` (one-line notices, 16 states)
      - its `EXHIBIT_G_CONTENT` (licensing, liens, right to cancel, from the retired ONE Exhibit G; 9 states)

      The installer composes these from whatever that environment holds, so a DB with the fuller CA/CO sets from `scripts/prod-sync.sql` carries them over. It changes `Company` → `Dvele` and `Client` → `Buyer` (whole words), because the old text uses the old agreement's terms. The source rows are never modified, so old contracts are unchanged. Legal reviews the combined rows on the admin page (Task 11).
12. **Exhibit E numbering.** The headings are numbered by Word (1–8), and the cross-references assume that. The Plumbing/Electrical/HVAC lines sit at the heading level, so in Word they take numbers 5–7 and push Appliance & Fixture Coverage to 8. That breaks both "Section 5" references. The authored content nests the three lines under Systems Coverage (4(a)(i)–(iii)), and legal fixes the Word source to match.

## Global Constraints

- Money is integer cents end to end. Convert to dollars only at render, via the existing `formatCurrency` / `formatCurrencyWhole` / `formatCentsAsCurrency`.
- One DDL change only: `projects.itemize_design_fee` (Task 6). Its implementer enters plan mode first, as CLAUDE.md requires for schema changes. If any other task seems to need a column, stop.
- Template variables are resolved only in `server/lib/mapper.ts`. Every new variable is added to **both** `VARIABLE_CATEGORIES` and the `mapProjectToVariables()` return object (`add-variable` skill).
- Do not change the output of any existing variable or generator that an old exhibit references (`SIGNATURE_BLOCK_TABLE`, `EXHIBIT_A_SIGNATURE_TABLE`, `EXHIBIT_A4_TABLE`, `EXHIBIT_A5_TABLE`, `ON_SITE_SERVICES_SELECTION`, `MILESTONE_TEMPLATE`, `contractValue`). New behavior goes under new names.
- Gates after every task: `npm run check` and `npx vitest run`, both clean. (CLAUDE.md says there is no test suite; there is one, and Task 1 corrects the doc.)
- Commits follow the repo's CLAUDE.md: no `Co-Authored-By`, no AI attribution. Branch and commit naming follow `dvele-standards:git-and-tickets`.
- The seller is never a literal in the new content. It comes from the project's LLC (Decision 3), upper-cased in signature blocks.
- Delivery Model labels are exactly `FOB Factory`, `Delivered to Site`, `Dvele GC`.

## Review Focus

1. **An unknown or legacy `on_site_selection` value** (null, `""`, lowercase `cmos` from the admin template filter) must normalize to a known model. Expected: `CMOS`/`cmos` → `CMOS`, `FOB`/`fob` → `FOB`, anything else → `CRC`, the current default. Pinned in Task 1.
2. **A FOB project hitting a two-way `=== 'CRC' ? … : …` branch** silently gets CMOS behavior, e.g. on-site priced in or a 60-day on-site duration. Expected: every branch goes through `billsOnsite` / `billsShipping`. Pinned by Task 2's FOB pricing tests and Task 3's `[IF CRC]`-left-in-FOB-output test; Task 10 audits the client.
3. **A phased project whose phase has stored milestones** must keep its stored percentages, re-priced to include the design-fee share. Only phases without stored rows get 10/40/40/10. Pinned in Task 7.
4. **The seller LLC's formation state stored as a code (`DE`, `AZ`) or a name (`Delaware`)**. Step 5 defaults to `DE`, while the server defaults to `Delaware`. Both must render "a Delaware limited liability company" / "an Arizona limited liability company", with the right article. Pinned in Task 5.
5. **Re-running the installer**, or running it after an admin edited the new template in the template editor, must not duplicate rows or overwrite edits. Expected: it finds the template by `name` and exits with a no-op. Pinned in Task 9.

---

### Task 1: Delivery model module

**Files:**
- Create: `shared/deliveryModel.ts`
- Test: `shared/__tests__/deliveryModel.test.ts`
- Modify: `AGENTS.md` (§ Critical Business Logic 1: the CRC/CMOS descriptions are inverted; replace with the three-model table from Decisions §2). Also fix `CLAUDE.md` "There is no test suite" → `npx vitest run`.

**Interfaces:**
- Produces:
  - `type DeliveryModel = 'FOB' | 'CRC' | 'CMOS'`
  - `toDeliveryModel(raw: string | null | undefined): DeliveryModel`
  - `DELIVERY_MODEL_LABELS: Record<DeliveryModel, string>`
  - `billsShipping(m: DeliveryModel): boolean`
  - `billsOnsite(m: DeliveryModel): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { toDeliveryModel, DELIVERY_MODEL_LABELS, billsShipping, billsOnsite } from "../deliveryModel";

describe("toDeliveryModel", () => {
  it.each([
    ["FOB", "FOB"], ["fob", "FOB"], ["CMOS", "CMOS"], ["cmos", "CMOS"],
    ["CRC", "CRC"], [null, "CRC"], [undefined, "CRC"], ["", "CRC"], ["garbage", "CRC"],
  ])("%s → %s", (raw, expected) => expect(toDeliveryModel(raw as any)).toBe(expected));
});

it("labels match the agreement", () => {
  expect(DELIVERY_MODEL_LABELS).toEqual({ FOB: "FOB Factory", CRC: "Delivered to Site", CMOS: "Dvele GC" });
});

it("only FOB omits shipping; only Dvele GC bills on-site", () => {
  expect([billsShipping("FOB"), billsShipping("CRC"), billsShipping("CMOS")]).toEqual([false, true, true]);
  expect([billsOnsite("FOB"), billsOnsite("CRC"), billsOnsite("CMOS")]).toEqual([false, false, true]);
});
```

- [ ] **Step 2:** Run `npx vitest run shared/__tests__/deliveryModel.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `shared/deliveryModel.ts`. `toDeliveryModel` trims and upper-cases before matching.
- [ ] **Step 4:** Run the same command. Expected: PASS. Then `npm run check`.
- [ ] **Step 5:** Commit `shared/deliveryModel.ts`, the test, `AGENTS.md`, `CLAUDE.md`.

---

### Task 2: FOB pricing

**Files:**
- Modify: `server/services/pricingEngine.ts:38-39,77-78,211-213`
- Modify: `server/services/pricingMath.ts:132,146,306,367` (signatures and the two value sums)
- Test: `server/services/__tests__/phase-rollup.test.ts`, `server/services/__tests__/pricing-math.test.ts` (add cases; do not change existing CRC/CMOS expectations)

**Interfaces:**
- Consumes: `DeliveryModel`, `toDeliveryModel`, `billsShipping`, `billsOnsite` (Task 1).
- Produces:
  - `PricingSummary.serviceModel: DeliveryModel`
  - `sumUnphasedUnitValue(…, serviceModel: DeliveryModel)`
  - `buildPhaseRollups(…, serviceModel: DeliveryModel, …)`
  - `PhaseRollup.milestoneSource: 'stored' | 'default'` (new field: `'stored'` when the `stored && stored.length > 0` branch at `pricingMath.ts:383` is taken)

- [ ] **Step 1: Write the failing tests.**
  - `"FOB phaseValue excludes shipping and on-site"`: one phase, one unit with offsite 100_000_00, shipping 10_000_00, onsite 50_000_00, customizations 5_000_00. Expect `phaseValue` to be `105_000_00`.
  - The same unit gives `110_000_00` under CRC and `165_000_00` under CMOS (regression guards).
  - `"FOB sumUnphasedUnitValue excludes shipping"`: same unit, unphased. Expect `105_000_00`.
  - `"milestoneSource reports stored vs default"`: a phase with a stored milestone gives `'stored'`; one without gives `'default'`.
- [ ] **Step 2:** Run `npx vitest run server/services/__tests__`. Expected: the new cases FAIL.
- [ ] **Step 3: Implement.**
  - Replace each `serviceModel === "CMOS" ? x : 0` with `billsOnsite(serviceModel) ? x : 0`, and make shipping terms `billsShipping(serviceModel) ? shipping : 0`.
  - In `pricingEngine.ts:78`, use `toDeliveryModel(project.onSiteSelection)`. `contractValue` becomes `totalDesignFee + totalOffsite + totalCustomizations + (billsShipping(m) ? totalShipping : 0) + (billsOnsite(m) ? totalOnsite : 0)`.
  - Add `milestoneSource`.
- [ ] **Step 4:** Run the full `npx vitest run` and `npm run check`. Expected: all PASS, and the existing CRC/CMOS figures are unchanged.
- [ ] **Step 5:** Commit.

---

### Task 3: Generalized conditional tags

`processConditionalTags` (`server/lib/contractGenerator.ts:49-107`) only handles CRC and CMOS. Under FOB neither branch runs, so `[IF CRC]…[/IF]` would print as literal text. Read the whole generation pipeline first (CLAUDE.md).

**Files:**
- Create: `server/lib/conditionalTags.ts` (move the function here, export it)
- Modify: `server/lib/contractGenerator.ts:49-107` (delete, import), `:371`, `:898`, `:1035`, `:3563` (normalize with `toDeliveryModel`)
- Modify: the clause filter at `contractGenerator.ts:922-990` so a FOB project drops clauses conditioned on CRC-only or CMOS-only
- Test: `server/lib/__tests__/conditional-tags.test.ts`

**Interfaces:**
- Consumes: `DeliveryModel`, `toDeliveryModel`.
- Produces: `processConditionalTags(content: string, model: DeliveryModel): string`. It keeps the inner text of `[IF X]…[/IF]` when `X === model`, drops the whole block otherwise, accepts `X ∈ {FOB, CRC, CMOS}`, and keeps today's handling of the verbose `[IF CLIENT HAS ELECTED '…(CRC)':]` headers.

- [ ] **Step 1: Write the failing tests:**
  - `processConditionalTags("a[IF FOB]f[/IF][IF CRC]c[/IF][IF CMOS]m[/IF]z", "FOB")` → `"afz"`; the same input with `"CRC"` → `"acz"`, and with `"CMOS"` → `"amz"`.
  - For a verbose CRC block under FOB, `"[IF CLIENT HAS ELECTED 'CLIENT-RETAINED CONTRACTOR (CRC)':]x"` → `""`.
  - Under FOB, the output never contains `"[IF"`.
- [ ] **Step 2:** Run `npx vitest run server/lib/__tests__/conditional-tags.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement as one pass over a regex for `\[IF\s+(FOB|CRC|CMOS)\]([\s\S]*?)\[\/IF\]`, plus the verbose-header handling moved unchanged and extended so a FOB model drops both verbose kinds.
- [ ] **Step 4:** Run `npx vitest run` and `npm run check`. Expected: PASS.
- [ ] **Step 5:** Commit.

---

### Task 4: C.2 matrix from the agreement

The old `RESPONSIBILITY_CATEGORIES`, `getDefaultMatrix` and `generateResponsibilityMatrixHtml` stay untouched; old exhibits use them through `{{RESPONSIBILITY_MATRIX_TABLE}}`. The new agreement gets its own list and table.

**Files:**
- Modify: `shared/responsibilityMatrix.ts` (add the list and default builder below the existing code)
- Modify: `server/lib/tableGenerators.ts` (new renderer after `generateResponsibilityMatrixHtml`, `:646`)
- Modify: `server/lib/mapper.ts` (`EXHIBIT_C2_TABLE` in `tables`, next to `RESPONSIBILITY_MATRIX_TABLE` at `:1194`)
- Test: `server/lib/__tests__/exhibit-c2.test.ts`

**Interfaces:**
- Consumes: `DeliveryModel`.
- Produces:
  - `type C2Assignee = 'company' | 'client_gc'`
  - `interface C2WorkCategory { id: string; label: string; note: string; defaults: Record<DeliveryModel, C2Assignee> }`
  - `C2_WORK_CATEGORIES: readonly C2WorkCategory[]` (the 19 rows below, in this order)
  - `getC2DefaultMatrix(model: DeliveryModel): ResponsibilityItem[]` (with `category: 'C.2'`; `ResponsibilityItem` gains optional `note?: string`)
  - `isC2Matrix(items: ResponsibilityItem[]): boolean` (true when every id is a `C2_WORK_CATEGORIES` id)
  - `generateExhibitC2TableHtml(items: ResponsibilityItem[]): string`. Columns: `Work Category`, `Dvele`, `Buyer/GC`, `Notes / Acceptance Standard`. Put `✔` in the assigned column and `☐` in the other. Built with `buildStyledTable`.

The rows are verbatim from the agreement's C.2. "D" means `company` and "B" means `client_gc`. The defaults follow C.2's preamble: under FOB, Dvele does fabrication only; under Delivered to Site, Dvele does fabrication, transport coordination and cost, route surveys/escorts and crane/set; under Dvele GC, Dvele does everything (the doc's ✔ column).

| id | Label | Note | FOB | CRC | CMOS |
|---|---|---|---|---|---|
| `factory_fabrication` | Factory fabrication | Per Exhibit B | D | D | D |
| `transport_coordination` | Transport coordination | Per Exhibit A | B | D | D |
| `transport_cost` | Transport cost | Per Exhibit A | B | D | D |
| `route_surveys` | Route surveys / escorts | As required | B | D | D |
| `crane_rigging` | Crane / rigging | Define in Exhibit A | B | D | D |
| `site_access` | Site access & staging | Must meet delivery specs | B | B | D |
| `clearing_grading` | Clearing / grading | | B | B | D |
| `foundation` | Foundation / footings / slab | Must meet Dvele tolerances | B | B | D |
| `utility_stubs` | Utility stubs (water/sewer/power/gas) | Stub locations per drawings | B | B | D |
| `set_placement` | Set / placement on foundation | If Dvele model, Dvele manages via sub | B | D | D |
| `stitching_sealing` | Stitching / sealing / weatherproofing | Allocate clearly | B | B | D |
| `mep_reconnections` | MEP reconnections | Allocate clearly | B | B | D |
| `interior_finish` | Interior finish out (site) | Allocate clearly | B | B | D |
| `exterior_tieins` | Exterior tie-ins / decks / stairs | Allocate clearly | B | B | D |
| `inspections_scheduling` | Inspections scheduling | | B | B | D |
| `co_equivalent` | CO/Equivalent responsibility | Election in Exhibit A | B | B | D |
| `site_safety` | Site safety and security | | B | B | D |
| `debris_cleanup` | Debris removal / cleanup | | B | B | D |
| `damage_remediation` | Damage remediation from delivery activities | Allocate | B | B | D |

The mapper uses the project's stored matrix (`projectDetails.responsibilityMatrix`, parsed as at `mapper.ts:1199-1210`) only when `isC2Matrix(stored)` is true. Otherwise it uses `getC2DefaultMatrix(toDeliveryModel(...))`. A project saved with the old item list therefore gets the agreement's defaults, never a mix.

- [ ] **Step 1: Write the failing tests:**
  - `C2_WORK_CATEGORIES` has 19 rows, and its labels in order equal the table's Label column.
  - FOB gives exactly one `company` row, `factory_fabrication`.
  - CRC gives `company` for exactly `factory_fabrication`, `transport_coordination`, `transport_cost`, `route_surveys`, `crane_rigging`, `set_placement`.
  - CMOS is all `company`.
  - `isC2Matrix(getDefaultMatrix('CRC'))` is false, and `isC2Matrix(getC2DefaultMatrix('CRC'))` is true.
  - The rendered table contains each note verbatim and exactly 19 `✔`.
  - `generateResponsibilityMatrixHtml(getDefaultMatrix('CRC'), 'CRC')` is unchanged (snapshot).
- [ ] **Step 2:** Run `npx vitest run server/lib/__tests__/exhibit-c2.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run` and `npm run check`. Expected: PASS.
- [ ] **Step 5:** Commit.

The wizard's matrix editor switches to this list in Task 10.

---

### Task 5: New agreement variables and signature blocks

Use the `add-variable` skill and read all of `server/lib/mapper.ts` first.

**Files:**
- Create: `shared/usStates.ts`: `stateName(codeOrName: string | null | undefined): string`. It maps all 50 two-letter codes plus DC to full names, passes full names through (case-normalized), and returns `""` for empty input. Test: `shared/__tests__/usStates.test.ts` covering `"AZ"`→`"Arizona"`, `"az"`→`"Arizona"`, `"Delaware"`→`"Delaware"`, `null`→`""`.
- Modify: `server/lib/mapper.ts` (`VARIABLE_CATEGORIES` plus the return object). Signature builders go next to `buildExhibitASignatureBlock` (`:578`).
- Test: `server/lib/__tests__/master-ef-2026-variables.test.ts`, `server/lib/__tests__/signature-block.test.ts` (add cases)

**Interfaces:**
- Consumes: `toDeliveryModel`, `DELIVERY_MODEL_LABELS`, `stateName`; the existing `childLlc` (its `legalName`, `formationState`, `entityType`), `onsiteContractor` (`mapper.ts:780`), `client`, `projectDetails.governingLawState`, `project.state`, `project.buyerType`.
- Produces these variables:

| Variable | Category | Value |
|---|---|---|
| `SELLER_LEGAL_NAME` | `childLlc` | `childLlc?.legalName`, or `"[SELLER]"` when empty |
| `SELLER_ENTITY_CLAUSE` | `childLlc` | `"an Arizona limited liability company"` form: article `an` before a vowel-initial state name, else `a`; `stateName(childLlc?.formationState)`; then `"limited liability company"` (the entity type is always LLC today). With no formation state: `"a limited liability company"`. |
| `AGREEMENT_GOVERNING_LAW_STATE` | `legal` | `stateName(projectDetails?.governingLawState)`, or `"Arizona"` when empty. The existing `GOVERNING_LAW_STATE` (site-state, then California fallback) stays unchanged for old exhibits. |
| `PROJECT_STATE_NAME` | `project` | `stateName(project.state)` |
| `WARRANTY_STATUTE_PREFIX` | `legal` | when `project.state` is `CA`: exactly `"PURSUANT TO CAL. COM. CODE § 1201(b)(10), "`; otherwise `""`. These are the existing old Exhibit E words (Decision 11). Add one entry per state here when legal supplies more. |
| `DELIVERY_MODEL` | `conditional` | `DELIVERY_MODEL_LABELS[model]` |
| `IS_FOB` | `conditional` | `model === 'FOB'` |
| `DELIVERY_MODEL_ELECTION` | `project` | three options in doc order, `☒` before the elected one and `☐` before the others, separated by `<br>`. The Dvele GC option appends `; GC Affiliate: {name}; License No. / State: {licenseNumber} / {licenseState}` from `onsiteContractor`, blanks as `____________________`. |
| `BUYER_TYPE_ELECTION` | `project` | `☒ End Customer (owner-occupant) ☐ Developer (for resale or lease)`, or the reverse when `buyerType === 'developer'` |
| `TOTAL_UNITS_WRITTEN` | `home` | `"two (2)"` form from `TOTAL_UNITS`. Add `numberToWords(n: number): string` for 1–99 in `mapper.ts`; above 99, digits only. |
| `STORAGE_TERMS` | `pricing` | when `project.storageFeePerDay > 0`: `"{fee}/day per Home after {STORAGE_FREE_DAYS} days free"`; otherwise exactly `"$250/day per Home after ten (10) business days"` |
| `GC_INFORMATION_LINE` | `onsiteContractor` | CMOS: `"Not applicable; Dvele GC elected. GC Affiliate name / license no. / contact: {name} / {license} / {contactName}"`. Otherwise: `"Buyer GC name / license no. / contact: {name} / {license} / {contactName}"`. Blanks as `____________________`. |
| `MASTER_EF_SIGNATURE_TABLE` | `tables` | `buildMasterEf2026SignatureBlock(sellerName, buyerName, gcAffiliateName \| null)` |

`buildMasterEf2026SignatureBlock(sellerName: string, buyerName: string, gcAffiliateName: string | null): string`:
- Column 1 is titled with `sellerName` upper-cased, e.g. `DVELE AZ, LLC`.
- Column 2 is the buyer's name, or `[BUYER]` when empty.
- Column 3 appears only when `gcAffiliateName` is non-null. It is titled with that name upper-cased, or `[GC AFFILIATE]` when empty, with the subtitle `GC Affiliate, solely as to on-site work` (Decision 9).
- Each column has Signed / Name / Title / Date lines built with the shared `signatureLine()`.
- The mapper passes `gcAffiliateName = onsiteContractor?.legalName ?? ''` when the model is CMOS, else `null`.
- The same block serves the main agreement and Exhibit A.

- [ ] **Step 1: Write the failing tests** for each row above, including:
  - FOB / CRC / CMOS each produce exactly one `☒`.
  - The CMOS election contains the contractor's license.
  - `STORAGE_TERMS` gives the default text when the fee is `0` and when it is `null`.
  - `numberToWords(2)` → `"two"`, `numberToWords(21)` → `"twenty-one"`.
  - `SELLER_ENTITY_CLAUSE`:
    - formation state `"AZ"` → `"an Arizona limited liability company"`
    - `"Arizona"` → the same
    - `"DE"` → `"a Delaware limited liability company"`
    - `null` → `"a limited liability company"`
  - `AGREEMENT_GOVERNING_LAW_STATE` is `"Arizona"` when unset, and `"Colorado"` when set to `"CO"`. Old `GOVERNING_LAW_STATE` is unchanged for the same fixtures.
  - `WARRANTY_STATUTE_PREFIX` is the CA text for `CA` and `""` for `AZ`.
  - Signature block:
    - 2 columns under FOB and CRC, 3 under CMOS, and still 2 under CRC when the project has a second client.
    - Under CMOS with no on-site contractor, column 3 reads `[GC AFFILIATE]`.
    - Column 1 reads `DVELE AZ, LLC` for an LLC named `Dvele AZ, LLC`.
  - `SIGNATURE_BLOCK_TABLE` output for a fixture project is unchanged (snapshot).
- [ ] **Step 2:** Run the new tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run` and `npm run check`. Expected: PASS.
- [ ] **Step 5:** Commit.

---

### Task 6: A.4 cost-component table and design fee checkbox

**Files:**
- Modify: `shared/schema.ts` (`projects`: add `itemizeDesignFee: boolean("itemize_design_fee").default(false).notNull()`). Enter plan mode for this step, then run `npm run db:push` locally.
- Modify: `server/lib/tableGenerators.ts` (new function after `generateExhibitA4TableHtml`, which stays untouched)
- Modify: `server/lib/mapper.ts` (`EXHIBIT_A4_COST_TABLE` in `tables`)
- Verify: the `PATCH /api/projects/:id` handler in `server/routes/projects.ts` accepts and persists `itemizeDesignFee`. Add it to the handler's accepted fields if they are listed explicitly.
- Test: `server/lib/__tests__/pricing-tables.test.ts` (add a `describe`)

**Interfaces:**
- Consumes: `PricingSummary` (with `serviceModel: DeliveryModel`), `billsShipping`, `billsOnsite`.
- Produces:
  - `generateExhibitA4CostTableHtml(pricingSummary: PricingSummary | null, totalSquareFeet: number | null, itemizeDesignFee: boolean): string`
  - the `projects.itemizeDesignFee` field, which Task 10's checkbox writes
- Columns: `Component`, `Price`, `Cost/sqft`, `Notes`.
- Rows, in order:
  1. `Design / Pre-Production Fee`, only when `itemizeDesignFee`. Amount: `totalDesignFee`. Note: `Included in Purchase Price`.
  2. `Factory-Built Home(s)`. Amount: `totalOffsite`, plus `totalDesignFee` when `itemizeDesignFee` is false. Note: `Per Exhibit B`.
  3. `Customizations`, only when `totalCustomizations > 0`.
  4. `Delivery & Set`, only when `billsShipping`. Note: `Per Exhibit C`.
  5. `On-Site Work (GC Affiliate)`, only when `billsOnsite`. Note: `Dvele GC only`.
  6. `Purchase Price`, bold total, equal to `pricingSummary.contractValue` regardless of `itemizeDesignFee`.
- Cost/sqft is `formatCurrencyWhole(round(amount / totalSquareFeet))`, or `—` when `totalSquareFeet` is falsy.
- Under the table, the exact copy: `*Except as expressly provided under the Feasibility Adjustment provisions of Section 3(d) of the Agreement, the pricing set forth herein is binding and shall not be modified without a written Change Order or Exhibit A amendment executed by both Parties.`

The mapper passes `totalSquareFeet` as the sum of `unit.squareFootage × quantity` across `units`, and `itemizeDesignFee` as `project.itemizeDesignFee ?? false`.

- [ ] **Step 1: Write the failing tests:**
  - For each of FOB, CRC and CMOS, with `itemizeDesignFee` both false and true: the row labels present, and the line items sum to the Purchase Price row, which equals `contractValue`. Use the `figures()` helper pattern from `exhibit-a5.test.ts`.
  - The Purchase Price figure is identical with the flag false and true.
  - With the flag false, the output does not contain `Design`. With it true, there is exactly one `Design / Pre-Production Fee` row, whose amount is `totalDesignFee`, and the Factory row equals `totalOffsite`.
  - Cost/sqft is `—` when there is no square footage.
  - A.5 (Task 7) is unaffected: the mapper's `EXHIBIT_A5_PAYMENT_TABLE` output is identical for one fixture project with the flag false and true.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement, using `allocateWholeDollars` so the rows sum to the total. Export it from the same file if it isn't already reachable.
- [ ] **Step 4:** Run `npx vitest run` and `npm run check`. Expected: PASS.
- [ ] **Step 5:** Commit.

---

### Task 7: A.5 payment schedule with the design fee folded in

**Files:**
- Modify: `server/lib/tableGenerators.ts` (new function; `generateExhibitA5TableHtml` and `repriceAgainst` stay untouched)
- Modify: `server/lib/mapper.ts` (`EXHIBIT_A5_PAYMENT_TABLE` in `tables`)
- Test: `server/lib/__tests__/exhibit-a5-2026.test.ts`

**Interfaces:**
- Consumes: `PhaseRollup.milestoneSource` (Task 2), `allocateWholeDollars`.
- Produces: `generateExhibitA5PaymentTableHtml(phases: A5Phase2026[] | null, pricingSummary: PricingSummary | null): string`, where `A5Phase2026 = A5Phase & { phaseValue: number; milestoneSource: 'stored' | 'default' }`.
- `AGREEMENT_MILESTONES`, exported, exact:

```ts
[
  { name: "1st Payment", trigger: "Agreement Deposit", percentage: 10, due: "Upon execution of Exhibit A" },
  { name: "2nd Payment", trigger: "Production Approved - Manufacturing starts", percentage: 40, due: "Upon Green Light Production Notice" },
  { name: "3rd Payment", trigger: "Manufacturing - Final Module Started", percentage: 40, due: "Upon start of final module" },
  { name: "4th Payment", trigger: "Modules Complete - Before pickup or transport", percentage: 10, due: "Dvele Quality certification complete" },
]
```

Rules:
- **Phased:** the design fee is spread across phases in proportion to `phaseValue` (largest remainder, so the shares sum to the fee exactly). Each phase's base is `phaseValue + share`.
  - `milestoneSource === 'default'`: split the base by `AGREEMENT_MILESTONES`.
  - `'stored'`: split by the phase's stored milestone percentages, re-normalized to the base.
- **Unphased:** split `contractValue` by `AGREEMENT_MILESTONES`.
- There is no separate Design Fee row.
- Columns: `Home ID`, `Phase`, `Payment`, `Trigger`, `% payment`, `Price`, `Due`.
- The Total row is the sum of the rendered rows, and equals `contractValue` whenever every unit is phased.

- [ ] **Step 1: Write the failing tests:**
  - Unphased with `contractValue = 10_200_000_00` gives rows of $1,020,000 / $4,080,000 / $4,080,000 / $1,020,000 and Total $10,200,000.
  - Two default phases (6M and 4M, design fee 200k) give Total $10,200,000, and phase 1's base is 6,120,000.
  - A stored phase with 20/80 keeps 20/80 over its base.
  - The output contains no `Design Fee`.
  - Rows always sum to Total (odd-cents fixture, e.g. `contractValue = 10_000_001_37`).
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run` and `npm run check`. Expected: PASS.
- [ ] **Step 5:** Commit.

---

### Task 8: Authored agreement content

The agreement is checked in as reviewed source, mirroring how the live MASTER_EF rows were hand-curated (slugs like `MASTER_EF_PREAMBLE`, `<h2>`/`<h3>` exhibit HTML). Do not adapt `scripts/ingest_master_ef.ts`: its regexes, stale exhibit config, `text[]` casts and FK-violating deletes make it unusable.

**Files:**
- Create: `server/templates/master-ef-2026-10/source.docx` (verbatim copy of the Downloads file)
- Create: `server/templates/master-ef-2026-10/clauses.json`, an array of `{ slug, headerText, bodyHtml, level, parentSlug, order }`
- Create: `server/templates/master-ef-2026-10/exhibit-{a..f}.html`
- Create: `server/templates/master-ef-2026-10/README.md` (5 lines: what this is, how to revise it when legal sends a new draft)
- Create: `scripts/draft_master_ef_2026_content.ts`, a one-off helper that runs mammoth on `source.docx` with the style map at `ingest_master_ef.ts:306-313` and writes a first-draft `clauses.json` and exhibits for hand editing. It is committed so the next revision repeats the process.
- Test: `server/lib/__tests__/master-ef-2026-content.test.ts`

Content rules:
- Slugs are `MEF26_<SECTION>` (e.g. `MEF26_PREAMBLE`, `MEF26_3_D_BINDING_COMMITMENT`) and never contain `CRC` or `CMOS`. The clause filter at `contractGenerator.ts:959-990` drops clauses by name.
- Clauses cover the title, preamble, recitals, Sections 1–15 with sub-clauses as children (levels as in the doc's nesting), and the signature block body `{{MASTER_EF_SIGNATURE_TABLE}}`.
- Exhibits start with `<h2>EXHIBIT X &mdash; TITLE</h2>` and use `<h3>` for X.N headings, like the live rows.

Blank → placeholder substitutions (everything else verbatim):

| Doc text | Replacement |
|---|---|
| Preamble `___________, ________` (Effective Date) | `{{AGREEMENT_EXECUTION_DATE_WRITTEN}}` |
| Preamble `Dvele AZ, LLC, an Arizona limited liability company` | `{{SELLER_LEGAL_NAME}}, {{SELLER_ENTITY_CLAUSE}}` |
| Preamble `________________, a [State of Formation] [limited liability company / corporation / other entity type], with a principal address at _____________________________` | `{{CLIENT_LEGAL_NAME}}, a {{CLIENT_STATE}} {{CLIENT_ENTITY_TYPE}}, with a principal address at {{CLIENT_FULL_ADDRESS}}` |
| Preamble `_______(__) factory-built home(s)` | `{{TOTAL_UNITS_WRITTEN}} factory-built home(s)` |
| Preamble `[Site Address, City, County, State]` | `{{SITE_ADDRESS}}` |
| §12(a) and §12(b) `[County], [State]` | `{{ARBITRATION_LOCATION}}` |
| §12(d) `[Governing Law State]` | `{{AGREEMENT_GOVERNING_LAW_STATE}}` |
| Both signature tables | `{{MASTER_EF_SIGNATURE_TABLE}}` |
| A.1 Buyer Type / Delivery Model cells | `{{BUYER_TYPE_ELECTION}}` / `{{DELIVERY_MODEL_ELECTION}}` |
| A.1 Project Name; Jurisdiction; Site(s); Buyer Notice | `{{PROJECT_NAME}}`; `{{PROJECT_STATE}}` followed by the doc's remaining label text and a blank line for the program/approval no.; `{{SITE_ADDRESS}}`; `{{CLIENT_FULL_ADDRESS}} / {{CLIENT_EMAIL}}`. Dvele Notice stays `finance@dvele.com`. |
| A.2 table | `{{EXHIBIT_A2_TABLE}}` |
| A.4 table and its `*Except…` footnote | `{{EXHIBIT_A4_COST_TABLE}}` (Task 6 renders the footnote) |
| A.5 table | `{{EXHIBIT_A5_PAYMENT_TABLE}}` |
| A.8 storage bullet `$______/day per Home after ______ days free (if left blank, $250/day per Home after ten (10) business days)` | `{{STORAGE_TERMS}}` |
| B.1 table | `{{EXHIBIT_B1_TABLE}}` |
| C.1 bullet | `{{GC_INFORMATION_LINE}}` |
| C.2 table (preamble paragraph kept) | `{{EXHIBIT_C2_TABLE}}` (Task 4) |
| C.4 `[●] days before delivery` ×3 | `{{FOUNDATION_READY_DAYS}}` / `{{UTILITY_STUBBED_DAYS}}` / `{{CRANE_ACCESS_READY_DAYS}}` days before delivery |
| D.1 / D.2 Target Date cells | `{{DESIGN_KICKOFF_DATE}}`, `{{SCHEMATIC_DESIGN_DATE}}`, `{{PERMIT_SUBMITTAL_DATE}}`, `{{DESIGN_DEVELOPMENT_DATE}}`, `{{PRODUCTION_START_DATE}}`, `{{PRODUCTION_COMPLETE_DATE}}`, `{{DELIVERY_SET_DATE}}`, `{{CO_EQUIVALENT_DATE}}` (same mapping as `rewire_master_ef_exhibits.ts:43-55`) |
| Exhibit E notice `[IF REQUIRED BY SITE-STATE LAW: PURSUANT TO [STATE STATUTE CITATION],] THIS SECTION … UNDER [SITE STATE] LAW, …` | `{{WARRANTY_STATUTE_PREFIX}}THIS SECTION … UNDER {{PROJECT_STATE_NAME}} LAW, …` (the rest verbatim, keeping the old exhibit's bordered `statutory-notice` div; the initials line stays verbatim) |
| Exhibit E Plumbing / Electrical / HVAC lines | Nested one level under Systems Coverage's (a), so Appliance & Fixture Coverage is heading 5 (Decision 12) |
| Exhibit F title `([SITE STATE])` / F.2 bracketed instruction | `({{PROJECT_STATE_NAME}})` / `[STATE_DISCLOSURE:MASTER_EF_2026_STATE_NOTICES]` (F.1 and F.3 verbatim from the new agreement) |

Exhibit E headings are rendered with their numbers (1–8) in the heading text, because the cross-references depend on them and the HTML has no Word list numbering.

Left as literal blanks for hand completion: A.8 delivery-window bullet, B.2 `[attach/ref]` items, A.3 table text.

- [ ] **Step 1: Write the failing content test** (reads the files from disk):
  - `"every {{VAR}} is a registered variable"`: every `{{X}}` in `clauses.json` and the exhibits is a member of the flattened `VARIABLE_CATEGORIES` (export it from `mapper.ts` if it isn't).
  - `"no doc blanks survive outside the allow-list"`: content contains no `_{4,}` and no `[State`, `[County`, `[BUYER]`, `[●]`, `[SITE STATE]`, except inside the three literal-blank items above.
  - `"agreement text is preserved"`: mammoth `source.docx` → plain text, split into paragraphs. For each paragraph not inside a replaced table, remove `_{3,}` runs and `\[[^\]]*\]` groups, then split on those gaps. Every fragment of ≥ 25 normalized characters must appear in the normalized plain text of the authored content (tags stripped, `{{…}}` and `[STATE_DISCLOSURE:…]` removed, whitespace collapsed, curly quotes normalized).
  - `"slugs are unique and never mention CRC or CMOS"`.
  - `"every parentSlug exists"`.
  - `"Exhibit E headings are numbered 1–8 in order"`: Definitions, Warranty Commencement, Warranty Scope, Systems Coverage, Appliance and Fixture Coverage, Exclusions, Claims and Remedies, Limits of Liability. The two `Section 5` references sit in text that refers to heading 5.
  - `"no seller literal"`: the content contains no `Dvele AZ`.
- [ ] **Step 2:** Run it. Expected: FAIL (files absent).
- [ ] **Step 3:** Run `npx tsx scripts/draft_master_ef_2026_content.ts`, then hand-edit the drafts to the table above until the test passes.
- [ ] **Step 4:** Run `npx vitest run` and `npm run check`. Expected: PASS.
- [ ] **Step 5:** Commit.

---

### Task 9: Installer

**Files:**
- Create: `server/lib/masterEf2026Install.ts`, a pure planner: `planMasterEf2026Install(content: MasterEf2026Content, existing: { templateId: number | null; oldTemplateIds: number[] }): InstallPlan`
- Create: `scripts/install_master_ef_2026.ts`, the DB executor with `--dry-run` (rolls back). Pattern: `scripts/rewire_master_ef_exhibits.ts`.
- Modify: `script/build.ts` (third esbuild entry → `dist/scripts/install-master-ef-2026.cjs`, mirroring the rewire entry at `:74-78`)
- Modify: `scripts/seed_dev_fixtures.ts` (call the installer after `seedTemplateExhibits`, so fresh dev DBs get the new template)
- Test: `server/lib/__tests__/master-ef-2026-install.test.ts`

**Interfaces:**
- Consumes: Task 8's files.
- Produces: the DB state, in one transaction:
  1. `contract_templates`: insert `name = display_name = 'Dvele Master Factory Built Home Agreement (2026-10)'`, `contract_type = 'MASTER_EF'`, `version = 1`, `is_active = true`, `status = 'active'`, `organization_id = 1`. Set `is_active = false` on every other MASTER_EF row.
  2. `clauses`: insert all with `contract_types = '["MASTER_EF"]'::jsonb`. Resolve `parentSlug` → `parent_id` in insertion order.
  3. `template_clauses`: `order_index = order × 10`.
  4. `exhibits`: letters A–F, `contract_types` jsonb `["MASTER_EF"]`, `sort_order` 1–6. Link them in `template_exhibits`.
  5. `llcs`: when no row has `name = 'Dvele AZ, LLC'` for org 1, insert one with `state_of_formation = 'Arizona'`, `entity_type = 'LLC'`, `status = 'active'`, so Step 5 can select it. An existing row is never modified.
  6. `state_disclosures`: for each state with an active `MASTER_EF_NOTICES` or `EXHIBIT_G_CONTENT` row (org 1), insert a `MASTER_EF_2026_STATE_NOTICES` row for that state, unless one already exists (an existing row may carry legal's edits). Its content is:
     - `<h3>{State name} Notices</h3>`
     - then the `MASTER_EF_NOTICES` content
     - then the `EXHIBIT_G_CONTENT` content, each omitted when absent
     - with `\bCompany\b` → `Dvele` and `\bClient\b` → `Buyer` applied to the result

     The executor prints each state and whether it was inserted or skipped, for legal's review list.
- Nothing is deleted or updated except the `is_active` flips. Existing disclosure rows are only read. If the template name already exists, it logs and exits 0 with no template writes; the disclosure step still runs, so a state added later gets its combined row on a re-run.

- [ ] **Step 1: Write the failing planner tests:**
  - A fresh DB plans 1 template, N clauses, N links, 6 exhibits, 6 links, 1 LLC, and deactivates `oldTemplateIds`.
  - An existing `Dvele AZ, LLC` plans no LLC.
  - Existing `templateId` → no template, clause, exhibit or LLC writes.
  - Every clause's parent appears earlier in the plan.
  - Combined notices, `composeStateNotices(state: string, notices: string | null, exhibitG: string | null): string | null` (exported from the planner module):
    - AZ with both sources contains the Registrar sentence and `AZ-4: Bonding Requirements`.
    - FL with notices only contains its one line and no empty section.
    - A state with neither gives `null`, and no row is planned.
    - `"Company is registered"` becomes `"Dvele is registered"`, while `"Companyside"` and `"Contractors"` are unchanged.
  - A state that already has `MASTER_EF_2026_STATE_NOTICES` plans no write for it.
  - The plan never updates or deletes a `state_disclosures` row.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the planner, the executor and the build entry.
- [ ] **Step 4:** Run `npx vitest run` and `npm run check`. Then, against local dev, run `npx tsx scripts/install_master_ef_2026.ts --dry-run` (expect the plan counts printed and a rollback), the same without `--dry-run`, then again (expect "already installed", exit 0). Finally `npm run build` and check `dist/scripts/install-master-ef-2026.cjs` exists.
- [ ] **Step 5:** Commit.

---

### Task 10: Wizard and admin UI

**Files** (line refs from the 2026-11-02 survey):
- Modify: `client/src/components/wizard/WizardContext.tsx:139,307,376,500,654,830,848,968,1013-1015,1197,1228,1696,1703,1788,2004,2025,1436`
- Modify: `client/src/components/wizard/steps/Step2ServiceModel.tsx`
  - Three cards, in doc order: `option-fob`, `option-crc`, `option-cmos`.
  - Titles `FOB Factory`, `Delivered to Site`, `Dvele GC`.
  - Badges `Buyer Pickup`, `Dvele Transport`, `Turnkey`.
  - Remove the `Compare CRC vs CMOS` button and its `:192` text.
- Modify: `Step3PartyInfo.tsx` (on-site contractor section titled `GC Affiliate` when CMOS, else `Buyer's General Contractor`; the `:668` ternary goes through `billsOnsite`)
- Step 5 (`Step5ChildLLC.tsx`), its validation, the Step 9 LLC gate and the LLC save paths are **not changed** (Decision 3).
- Modify: `client/src/components/wizard/ResponsibilityMatrix.tsx` and `WizardContext.tsx:848`:
  - The editor renders `C2_WORK_CATEGORIES` as one table: Work Category, Dvele / Buyer/GC radios, and Note shown read-only.
  - Seeding uses `getC2DefaultMatrix(toDeliveryModel(...))`.
  - A loaded project whose stored matrix fails `isC2Matrix` is re-seeded with C2 defaults.
  - The override highlight compares against `getC2DefaultMatrix` for the current model.
  - Re-export the new names from `data/responsibilityDefaults.ts`.
- Modify: `Step7Pricing.tsx`: add a checkbox labelled `Show design fee as a separate line in Exhibit A.4`, unchecked by default, bound to `projectData.itemizeDesignFee: boolean`. Thread it through `WizardContext.tsx` the way `buyerType` is threaded: the type and defaults (`:130-400`), the loader (`:656`), the autosave change-detection hash (`:1088`; without this, edits don't autosave), and the three save paths (`:1199`, `:1790`, `:2006` and their siblings), all writing `itemizeDesignFee` on the project PATCH/POST.
- Modify: `Step6DatesSchedule.tsx:259`, `Step9ReviewGenerate.tsx:65,161-162,214,709,773,892,902,926`, `WizardShell.tsx:42`, `pages/contract-preview.tsx:72,80,114-130,148,208,379-466`, `pages/clause-library.tsx:107-108`, `pages/component-library.tsx:274,391-392,817-818`, `pages/admin/contract-templates.tsx:61-62`

**Interfaces:**
- Consumes: `DeliveryModel`, `toDeliveryModel`, `DELIVERY_MODEL_LABELS`, `billsOnsite`, `billsShipping` via `@shared/deliveryModel`.

Rules:
- `projectData.serviceModel: DeliveryModel`. Every load goes through `toDeliveryModel`.
- Every two-way `=== 'CRC'` / `=== 'CMOS'` branch is replaced with `billsOnsite` / `billsShipping`, or with a three-way lookup where it picks a duration. FOB on-site duration: `0` (Buyer's responsibility).
- Every user-visible CRC/CMOS label shows `DELIVERY_MODEL_LABELS`.
- Step 9's Delivery Model summary text (`:892`, `:902`, `:926`) uses `DELIVERY_MODEL_LABELS`.

- [ ] **Step 1:** Run `rtk proxy grep -rnE "'CRC'|'CMOS'|\"CRC\"|\"CMOS\"" client/src` and save the list. Each hit must be resolved or justified by Step 4.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** Run `npm run check` and `npx vitest run`. Expected: PASS.
- [ ] **Step 4:** Re-run the Step 1 grep. Expected: hits only inside `toDeliveryModel` call sites or value literals passed to `updateProjectData`.
- [ ] **Step 5: End-to-end, using the `run` skill.** Create one project per Delivery Model, each selecting the existing LLC `Dvele AZ, LLC` in Step 5. Make one of them Buyer Type Developer. On the Dvele GC project, enter an on-site contractor as the GC Affiliate. Generate each, open the preview, and check:
  - The preamble reads "Dvele AZ, LLC, an Arizona limited liability company" and names the buyer.
  - §12(d) reads Arizona when no governing law state is set.
  - A.1 shows one ☒ on the right model.
  - C.2 shows the agreement's 19 rows, with ✔ placement matching Task 4's table for that model. Change one row in the wizard's matrix editor, regenerate, and confirm it sticks.
  - A.4's rows match Task 6's table, with no Design row.
  - On one project, check the design fee box, regenerate, and confirm A.4 gains the Design / Pre-Production Fee line with the same Purchase Price and an unchanged A.5. Reload the wizard and confirm the box is still checked.
  - A.5 has four payments that sum to A.4's Purchase Price.
  - The FOB contract shows no Delivery & Set row.
  - Only the Dvele GC contract has the 3-column signature block, with the GC Affiliate's name in column 3, on both the main agreement and Exhibit A.
  - Exhibit E's notice has no statute prefix for AZ and the Cal. Com. Code prefix for a CA project. Its headings are numbered 1–8.
  - Exhibit F shows the AZ notice line followed by AZ-1 to AZ-5, reading "Dvele", not "Company". A Wyoming project shows the missing-disclosure marker.
  - An old MASTER_EF contract's preview is unchanged. Compare against a screenshot taken before Task 9.
- [ ] **Step 6:** Commit.

---

### Task 11: Fix the State Disclosures admin page

`client/src/pages/admin/state-disclosures.tsx` (`/admin/state-disclosures`) was written against fields `state_disclosures` doesn't have (`title`, `disclosure_type`, `requires_initials`). As a result:
- The Type, Title and Initials columns render blank.
- **Add Disclosure posts no `code`, so it creates a row no contract can ever reference.** `POST /api/state-disclosures` inserts `code` as `NULL`.

The table has `id`, `code`, `state`, `content`, `is_active` (`shared/schema.ts:271-281`). The API (`server/routes/state-disclosures.ts`) already reads and writes exactly those, and `PATCH` keeps the existing code when none is sent. The older page at `/state-disclosures` (`client/src/pages/state-disclosures.tsx`) already uses the right fields; follow it.

**Files:**
- Modify: `client/src/pages/admin/state-disclosures.tsx` only. No server or schema change.

**Interfaces:**
- `interface StateDisclosure { id: number; code: string | null; state: string; content: string; is_active: boolean }`
- Form schema: `{ state: z.string().length(2), code: z.string().regex(/^[A-Z0-9_]+$/, "Use capitals, digits and underscores"), content: z.string().min(1), isActive: z.boolean().default(true) }`. The code regex is the one the generator resolves (`\[STATE_DISCLOSURE:([A-Z0-9_]+)\]`, `contractGenerator.ts:210`), so a code the form accepts is always one a contract can reference.

Rules:
- Columns: `State`, `Code` (monospace), `Preview` (content with tags stripped, first 80 characters), `Active` (badge), `Actions`.
- Rows with a `NULL` code show `— no code —` in the Code cell, styled as a warning. They can be edited to add one; there may already be some from earlier Add Disclosure use.
- Inactive rows (soft-deleted by `DELETE`, which sets `is_active = false`) stay listed with an `Inactive` badge, so they can be reactivated by editing.
- The create and edit dialogs have fields State, Code and Content (textarea), plus an Active switch on edit. Remove the Type, Title and Requires Initials fields.
- The delete confirmation names `{state} {code}` instead of the non-existent title.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `npm run check`. Expected: PASS.
- [ ] **Step 3: Using the `run` skill**, on local dev:
  - Open `/admin/state-disclosures`: every row shows its state and code, e.g. `AZ MASTER_EF_NOTICES`.
  - Add `ZZ TEST_PLAN_CHECK` and confirm it appears with that code. Confirm a lowercase code is rejected in the form.
  - Edit its content, then delete it and confirm it shows `Inactive`.
  - Confirm `/state-disclosures` still lists the same rows.
- [ ] **Step 4:** Commit.

---

## Deploy

The exact commands, SQL and the `aws ecs run-task` recipe are in [`docs/aws-ecs-amplify-deploy.md` → Master EF 2026 release](../../aws-ecs-amplify-deploy.md#master-ef-2026-release). Staging: `--profile nick-work --region us-west-1`, cluster `contract-manager-cluster-dev`, service `contract-manager-service`, task family `contract-manager-task`, container `contract-manager`, logs `/ecs/contract-manager`.

Content prerequisite: legal fixes the Word source so Plumbing / Electrical / HVAC sit under Systems Coverage (Decision 12). When the new `source.docx` arrives, replace it and redo Task 8 Step 3; the content test catches drift.

0. Before pushing:
   - Apply `ALTER TABLE projects ADD COLUMN IF NOT EXISTS itemize_design_fee boolean NOT NULL DEFAULT false;` to staging. Staging's drizzle push is stuck on the `project_units_property_id_unit_role_unique` question, and a push that hits a question applies nothing, so the column would never be created and every `projects` select would fail.
   - The stuck constraint still needs its own fix: check for duplicate `(property_id, unit_role)` rows, then add the constraint by hand (SQL in the runbook). Do it once the new image runs.
   - Pre-flight: run the parity query in the runbook. Each active template's `template_clauses` set must equal its `contract_types` clause set (both difference columns 0).
1. Push to `dev`. Wait for the ECS service to be stable and the task healthy, and check that the log says `Schema verified: no pending changes.` (or, while the constraint is unfixed, that the WARNING names only that constraint).
2. Immediately, before announcing the release, run the installer as a one-off `aws ecs run-task` from the service's task definition, overriding the container command: `["node","dist/scripts/install-master-ef-2026.cjs","--dry-run"]`, then without `--dry-run`. Read the subnets and security group from `aws ecs describe-services`. The image's entrypoint runs `drizzle-kit push` first, then the command. Until this step runs, new contracts (FOB included) generate on the old template, which is why it runs immediately.
3. Spot-check one contract per Delivery Model as in Task 10 Step 5, plus one old issued contract's PDF download from its contract page (it must be unchanged).
4. Legal reviews every `MASTER_EF_2026_STATE_NOTICES` row on `/admin/state-disclosures` (Task 11) and edits in place. Staging's `MASTER_EF_NOTICES` are one-liners; the fuller CA/CO sets in `scripts/prod-sync.sql` were never applied there. Flag Idaho in particular: its Exhibit G content mentions warranties, which may overlap Exhibit E.
5. Rollback: if the code is reverted after the install, reactivate the old template and deactivate the new one, and take the new clauses out of the `MASTER_EF` `contract_types` match, because old code fetches clauses by `contract_types` and would render 191 (old 91 + new 100). SQL, and its inverse for a re-release, in the runbook.
