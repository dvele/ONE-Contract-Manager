# Phase & Property Model — Plan E (Exhibit Rewiring)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generated MASTER_EF agreement say what the data says — wire the exhibit bodies onto the dynamic generators, and fix the twelve defects confirmed against the issued September 2026 Zaca Preserve agreement.

**Architecture:** The generators already exist and the mapper already resolves `{{EXHIBIT_A2_TABLE}}` and its siblings; the exhibit bodies simply never reference them. Three of those generators are wrong in ways that are invisible only because nothing calls them, so they are fixed **before** anything calls them. The bodies are database rows, so the rewiring ships as an idempotent script rather than a hand edit.

**Tech Stack:** Express 5, Drizzle ORM, PostgreSQL, vitest, Puppeteer Core (PDF).

**Spec:** [`docs/superpowers/specs/2026-09-10-phase-property-model-design.md`](../specs/2026-09-10-phase-property-model-design.md) — the **Exhibit Rewiring** and **Defects Fixed** sections. This plan is stage 7 of its Implementation Order.

**Predecessors:** A landed properties and phases; B configurations and per-phase pricing; C the timeline; D the editable payment schedule and the reconciliation gate. **Read [`docs/phase-property-model-open-items.md`](../../phase-property-model-open-items.md) before starting.**

## What this plan is not

The `0 → NULL` backfill on `design_duration`, `production_duration` and `delivery_duration` is **deferred**. It is a data migration against the deployed database and shares nothing with the document work; mixing them would put a migration inside a plan whose verification is a document diff.

## Global Constraints

These are the repo's rules plus the ones Plans A–D paid for. Every one exists because something went wrong.

- **Money is integers in cents.** Only `percentage` is stored on a milestone; **amounts are always derived**. `formatCurrency(cents)` in `tableGenerators.ts` divides by 100 — `formatCurrencyWhole(dollars)` does not. Passing cents to the second, or dollars to the first, is a 100× error that looks plausible on the page.
- **A missing input yields null, never a substituted default.** Exhibits render a blank as `TBD`; a fabricated figure in an executed agreement is worse than a blank.
- **`server/lib/mapper.ts` must be read in full before it is modified** (`CLAUDE.md`). It is 1713 lines and internally consistent; partial reads produce duplicate or conflicting variable definitions. The same rule applies to `server/lib/contractGenerator.ts`, where the order variable substitution → conditional processing → exhibit injection → PDF is load-bearing.
- **Template variables are resolved only in `mapper.ts`.** Never anywhere else.
- **Exhibit bodies are `exhibits.content` rows in the database.** Editing `server/seed-data.json` changes what a *fresh* checkout seeds and nothing else — the deployed rows are already seeded and keep their old content until a script updates them.
- **Every generation entry point must pass `templateId`** or the document is produced with no exhibits at all.
- **`npm run check` must stay at 12.** **`env -u DATABASE_URL npm test` must pass and stay hermetic.** `mapper.ts`, `tableGenerators.ts`, `tableStyles.ts` and `scheduleMath.ts` import no database module — that is what makes the document code testable, and it must stay true.
- **Test files are not type-checked by anything.** `tsconfig.json` excludes `**/*.test.ts` and vitest does no type-checking, so a wrong argument type in a test fails no gate.
- **Commit messages carry no AI attribution.** Imperative-mood subjects.
- Comment policy: only a suppression with its reason, an external fact, a deviation where the obvious version breaks, a measurement with provenance, or `TODO: <ticket> - <what>`.

## Decisions this plan carries

- **D.1's D-4 Target Date cell resolves `GREEN_LIGHT_DATE` when set, falling back to `DESIGN_DEVELOPMENT_DATE`'s derivation** (decided 2026-09-21, recorded in the open-items file). `design_development_date` stays misnamed; renaming it is a migration plus a variable-library change and is not in this plan.
- **`formatDateWritten`'s UTC fix is in scope** (Task 2). It is one line, but it moves ~12 variables by a day on any host behind UTC.
- **Verification is a diff against the issued agreement.** The PDF is supplied out of band — see Task 8. Do not commit it: it is an executed client agreement, and `git` makes it permanent.

## File Structure

| File | Responsibility |
|---|---|
| `client/src/lib/llcUtils.ts` | Child-LLC name generation. Pure. Task 1. |
| `server/lib/mapper.ts` | `formatDateWritten`, `buildFullAddress`, variable wiring. Tasks 2 and 6. |
| `server/lib/tableGenerators.ts` | All eight table generators. Tasks 3–5. |
| `scripts/rewire_master_ef_exhibits.ts` | Idempotent body rewiring, any environment. Task 7. |
| `server/seed-data.json` | What a fresh checkout seeds. Refreshed by Task 7 from the same source. |
| `vitest.config.ts` | Widened in Task 1 to reach `client/src`. |

---

## Task 1: The child LLC's name

**Files:** Modify `client/src/lib/llcUtils.ts`, `vitest.config.ts`; create `client/src/lib/__tests__/llcUtils.test.ts`

**Interfaces:** Produces `generateLLCName(projectAddress: string, projectName?: string): string`, unchanged signature.

Two of the twelve defects live in twelve lines of pure code. The issued agreement has the company signing as **`DP PO Box 953 Zaca Preserve LLC LLC`** — a doubled suffix, on an entity named after a PO Box.

- [ ] **Step 1: Let vitest see the client**

```ts
    include: ["server/**/__tests__/**/*.test.ts", "client/src/**/__tests__/**/*.test.ts"],
```

`llcUtils.ts` imports nothing, so this does not endanger the suite's hermeticity. Do not widen it further — a test that reaches a component would pull in the React runtime and a DOM environment this config does not provide.

- [ ] **Step 2: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { generateLLCName } from "../llcUtils";

describe("generateLLCName", () => {
  it("names the entity after the site address", () => {
    expect(generateLLCName("1234 Zaca Station Rd", "Zaca Preserve")).toBe("DP 1234 Zaca Station Rd LLC");
  });

  it("does not double a suffix the source already carries", () => {
    // The issued Zaca agreement has the company signing as
    // "DP PO Box 953 Zaca Preserve LLC LLC".
    expect(generateLLCName("Zaca Preserve LLC", "Zaca Preserve")).toBe("DP Zaca Preserve LLC");
  });

  it("ignores a suffix's casing and trailing period", () => {
    expect(generateLLCName("Zaca Preserve, L.L.C.", "Zaca Preserve")).toBe("DP Zaca Preserve LLC");
    expect(generateLLCName("Zaca Preserve Inc.", "Zaca Preserve")).toBe("DP Zaca Preserve Inc");
  });

  it("falls back to the project name when the address is a PO box", () => {
    // A PO box is a mailing address, not a site — an entity named after one
    // identifies nothing, and this is how the Zaca entity got its name.
    expect(generateLLCName("PO Box 953", "Zaca Preserve")).toBe("DP Zaca Preserve LLC");
    expect(generateLLCName("P.O. Box 953, Los Olivos CA", "Zaca Preserve")).toBe("DP Zaca Preserve LLC");
  });

  it("uses the PO box rather than nothing when there is no project name", () => {
    expect(generateLLCName("PO Box 953", "")).toBe("DP PO Box 953 LLC");
  });

  it("returns an empty string when it has no source at all", () => {
    expect(generateLLCName("", "")).toBe("");
    expect(generateLLCName("   ", undefined)).toBe("");
  });
});
```

- [ ] **Step 3: Run them, confirm RED, record the output**

```bash
env -u DATABASE_URL npx vitest run client/src/lib/__tests__/llcUtils.test.ts
```

Expect the suffix, PO-box and casing tests to fail; the first test already passes, which is the point — it pins the behaviour that must not change.

- [ ] **Step 4: Implement**

```ts
/** Entity suffixes the generated name must not double up on. */
const ENTITY_SUFFIX = /[,\s]+(l\.?l\.?c\.?|inc\.?|corp\.?|ltd\.?|l\.?p\.?)$/i;

/** A PO box is a mailing address, not a site: an entity named after one
 * identifies no property, so the project name is the better source. */
const PO_BOX = /^\s*p\.?\s*o\.?\s*box\b/i;

export function generateLLCName(projectAddress: string, projectName?: string): string {
  const address = (projectAddress || "").trim();
  const name = (projectName || "").trim();

  const usable = address !== "" && !PO_BOX.test(address);
  const source = usable ? address : name !== "" ? name : address;

  if (!source || source.trim() === "") return "";

  const suffix = source.match(ENTITY_SUFFIX);
  const base = (suffix ? source.slice(0, suffix.index) : source)
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim();

  if (base === "") return "";

  const tail = suffix
    ? suffix[1].replace(/[^a-zA-Z]/g, "").toUpperCase() === "LLC"
      ? "LLC"
      : suffix[1].replace(/[.,]/g, "")
    : "LLC";

  return `DP ${base} ${tail}`;
}
```

- [ ] **Step 5: Confirm GREEN and that the whole suite still passes**

```bash
env -u DATABASE_URL npm test
npm run check 2>&1 | grep -c "error TS"   # expect 12
```

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/llcUtils.ts client/src/lib/__tests__/llcUtils.test.ts vitest.config.ts
git commit -m "Stop the generated LLC name doubling its suffix or naming a PO box"
```

---

## Task 2: Written dates render in UTC

**Files:** Modify `server/lib/mapper.ts` (one function); create `server/lib/__tests__/mapper-dates.test.ts`

**Interfaces:** Produces `formatDateWritten(dateStr: string | null | undefined): string`, unchanged signature.

`formatDateWritten` parses `YYYY-MM-DD` — which JavaScript reads as UTC midnight — and formats it in the host's local zone, so any host behind UTC renders the previous day. `formatDateOrTBD` had the same defect and was fixed in Plan C by passing `timeZone: "UTC"`; this one was left alone as out of scope. It feeds twelve variables, including the agreement execution date.

Invisible on ECS, where `TZ=UTC`. Wrong on every developer machine in the Americas.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { formatDateWritten, formatDateOrTBD } from "../mapper";

describe("formatDateWritten", () => {
  it("renders the date it was given, not the day before", () => {
    // A YYYY-MM-DD string parses as UTC midnight. Formatted in a zone behind
    // UTC it prints the previous day — a date one day early in an executed
    // agreement, which nobody notices until a deadline is disputed.
    expect(formatDateWritten("2026-03-02")).toBe("March 2, 2026");
  });

  it("agrees with formatDateOrTBD, which was already fixed", () => {
    expect(formatDateWritten("2026-01-01")).toBe(formatDateOrTBD("2026-01-01"));
  });

  it("returns an empty string for a missing date, unlike formatDateOrTBD's TBD", () => {
    expect(formatDateWritten(null)).toBe("");
    expect(formatDateWritten(undefined)).toBe("");
    expect(formatDateWritten("")).toBe("");
  });
});
```

- [ ] **Step 2: Run it under a zone behind UTC, confirm RED**

```bash
env -u DATABASE_URL TZ=America/Los_Angeles npx vitest run server/lib/__tests__/mapper-dates.test.ts
```

Expected: `expected 'March 1, 2026' to be 'March 2, 2026'`. **Under `TZ=UTC` this test passes with the bug still in place** — run it in a west-of-UTC zone or it proves nothing.

- [ ] **Step 3: Implement**

```ts
export function formatDateWritten(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
```

- [ ] **Step 4: Confirm GREEN in both zones**

```bash
env -u DATABASE_URL TZ=America/Los_Angeles npx vitest run server/lib/__tests__/mapper-dates.test.ts
env -u DATABASE_URL TZ=UTC npm test
npm run check 2>&1 | grep -c "error TS"   # expect 12
```

- [ ] **Step 5: Commit**

```bash
git add server/lib/mapper.ts server/lib/__tests__/mapper-dates.test.ts
git commit -m "Render written dates in UTC so they do not print a day early"
```

---

## Task 3: The pricing tables add up

**Files:** Modify `server/lib/tableGenerators.ts`; create `server/lib/__tests__/pricing-tables.test.ts`

**Interfaces:** Consumes `PricingSummary` from `server/services/pricingEngine.ts`. Produces `generatePricingTableHtml(pricingSummary, contractType)` and `generateExhibitA4TableHtml(pricingSummary, serviceModel)`, both with unchanged signatures.

This is the defect that put a **$2,087,400** hole in the issued agreement: A.4's line items summed to $12,509,500 against its own stated total of $14,596,900. Two separate causes, both here.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { generatePricingTableHtml, generateExhibitA4TableHtml } from "../tableGenerators";

const SUMMARY = {
  breakdown: {
    totalDesignFee: 200_000_00,
    totalOffsite: 10_000_000_00,
    totalOnsite: 2_000_000_00,
    totalCustomizations: 500_000_00,
    totalShipping: 1_500_000_00,
  },
  grandTotal: 14_200_000_00,
  projectBudget: 14_200_000_00,
  // CRC excludes on-site: 200,000 + 10,000,000 + 500,000 + 1,500,000
  contractValue: 12_200_000_00,
  serviceModel: "CRC",
};

/** Every currency figure in the rendered table, in order. */
function amounts(html: string): string[] {
  return html.match(/\$[\d,]+/g) ?? [];
}

describe("generateExhibitA4TableHtml", () => {
  it("states the contract value as the total, not a recomputation of it", () => {
    const html = generateExhibitA4TableHtml(SUMMARY, "CRC");
    expect(html).toContain("$12,200,000");
  });

  it("carries a Customizations line, so the items sum to the stated total", () => {
    // The issued Zaca agreement's A.4 listed items summing to $12,509,500
    // against its own total of $14,596,900. Nothing on the page explained the
    // difference, because the customizations line was never rendered.
    const html = generateExhibitA4TableHtml(SUMMARY, "CRC");
    expect(html).toContain("Customizations");
    expect(html).toContain("$500,000");
  });

  it("bills on-site under CMOS and not under CRC", () => {
    expect(generateExhibitA4TableHtml(SUMMARY, "CRC")).not.toContain("On-site Services");
    const cmos = generateExhibitA4TableHtml({ ...SUMMARY, contractValue: 14_200_000_00 }, "CMOS");
    expect(cmos).toContain("On-site Services");
    expect(cmos).toContain("$14,200,000");
  });

  it("omits the customizations line when there are none, rather than printing $0", () => {
    const none = { ...SUMMARY, breakdown: { ...SUMMARY.breakdown, totalCustomizations: 0 } };
    expect(generateExhibitA4TableHtml(none, "CRC")).not.toContain("Customizations");
  });
});

describe("generatePricingTableHtml", () => {
  it("shows Shipping on a ONE contract, which its total already includes", () => {
    const html = generatePricingTableHtml(SUMMARY, "ONE");
    expect(html).toContain("Shipping");
    expect(html).toContain("$1,500,000");
  });

  it("includes customizations in the MANUFACTURING total it prints them against", () => {
    // MANUFACTURING renders a Customizations row but totalled without it, so
    // the table was one line item long against its own total.
    const html = generatePricingTableHtml(SUMMARY, "MANUFACTURING");
    expect(html).toContain("Customizations");
    expect(html).toContain("$10,700,000"); // 200,000 + 10,000,000 + 500,000
  });

  it("makes the ONE line items sum to the stated contract total", () => {
    const figures = amounts(generatePricingTableHtml(SUMMARY, "ONE"))
      .map((f) => Number(f.replace(/[$,]/g, "")));
    const total = figures.pop();
    expect(figures.reduce((sum, f) => sum + f, 0)).toBe(total);
  });
});
```

- [ ] **Step 2: Run them, confirm RED, record the output**

```bash
env -u DATABASE_URL npx vitest run server/lib/__tests__/pricing-tables.test.ts
```

- [ ] **Step 3: Fix `generateExhibitA4TableHtml`**

Replace the total computation and add the customizations row:

```ts
  const designFee = formatCurrency(breakdown.totalDesignFee);
  const productionPrice = formatCurrency(breakdown.totalOffsite);
  const logisticsPrice = breakdown.totalShipping ? formatCurrency(breakdown.totalShipping) : '$0';
  const onsitePrice = formatCurrency(breakdown.totalOnsite);
  // The engine's own figure, not a recomputation of it. Re-deriving the total
  // here is what let A.4's line items disagree with A.4's stated total by
  // $2,087,400 in the issued September 2026 agreement.
  const totalProjectPrice = formatCurrency(pricingSummary.contractValue);

  const rows: { cells: string[]; isBold?: boolean; isTotal?: boolean }[] = [
    { cells: ['Design / Pre-Production Fee', designFee, '', 'Due at signing'] },
    { cells: ['Offsite Services (Factory)', productionPrice, '', 'Per Phase'] },
    { cells: ['Offsite Services (Delivery/Assembly)', logisticsPrice, '', 'Delivery/transport'] },
  ];

  if (breakdown.totalCustomizations && breakdown.totalCustomizations > 0) {
    rows.push({ cells: ['Customizations', formatCurrency(breakdown.totalCustomizations), '', 'Per unit'] });
  }

  if (isCMOS) {
    rows.push({ cells: ['On-site Services (CMOS)', onsitePrice, '', 'CMOS only'] });
  }
```

- [ ] **Step 4: Fix `generatePricingTableHtml`**

Include customizations in the MANUFACTURING total, and render Shipping on a ONE contract:

```ts
  let filteredContractTotal = contractValue;
  if (contractType === 'MANUFACTURING') {
    // Customizations are rendered as a row below, so they belong in this total.
    filteredContractTotal = breakdown.totalDesignFee + breakdown.totalOffsite +
      (breakdown.totalCustomizations || 0);
  } else if (contractType === 'ONSITE') {
    filteredContractTotal = breakdown.totalOnsite +
      (breakdown.totalShipping || 0) +
      (breakdown.totalInstallation || 0);
  }
```

and, after the Customizations row and before the on-site row:

```ts
  // contractValue carries shipping under every model, so a table without this
  // row is one line item short of the total printed beneath it.
  if ((contractType === 'ONE' || contractType === 'ONSITE') &&
      breakdown.totalShipping && breakdown.totalShipping > 0) {
    rows.push({ cells: ['Shipping', formatCurrency(breakdown.totalShipping)] });
  }
```

Delete the now-duplicated Shipping push inside the existing `contractType === 'ONSITE'` block, keeping its Installation row.

- [ ] **Step 5: Confirm GREEN, gates at 12, commit**

```bash
env -u DATABASE_URL npm test
npm run check 2>&1 | grep -c "error TS"
git add server/lib/tableGenerators.ts server/lib/__tests__/pricing-tables.test.ts
git commit -m "Make the pricing tables state the contract total and sum to it"
```

---

## Task 4: A.5 bills the design fee once, from the phases

**Files:** Modify `server/lib/tableGenerators.ts`; create `server/lib/__tests__/exhibit-a5.test.ts`

**Interfaces:** Consumes `PhaseRollup[]` from `server/services/pricingMath.ts` — `{ phaseId, phaseNumber, name, properties, breakdown, phaseValue, milestones: { name, trigger, percentage, amount }[], dates }`. Produces `generateExhibitA5TableHtml(phases: PhaseRollup[] | null, pricingSummary: PricingSummary | null, serviceModel: string)` — **the first parameter changes from `PaymentMilestone[]` to `PhaseRollup[]`**, and Task 6 updates the one call site in `mapper.ts`.

Today A.5 bills the design fee twice: it has its own Execution row *and* sits inside the milestone base. Plan D's `buildMilestoneSchedule` already excludes it — `phaseValue` is exactly what the milestones divide — so taking the rows from `phases[]` fixes the double-billing and the per-phase breakout at once.

The dormant fallback branch also multiplies by 100 twice (`formatCurrency(Math.round(remainingAfterDesign * ms.pct / 100 * 100))` renders a figure 100× too large). It is unreachable — the pricing engine always returns six default milestones — and it is deleted rather than fixed: with `phases[]` the fallback has nothing to fall back to.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { generateExhibitA5TableHtml } from "../tableGenerators";

const SUMMARY = {
  breakdown: {
    totalDesignFee: 200_000_00,
    totalOffsite: 10_000_000_00,
    totalOnsite: 2_000_000_00,
    totalCustomizations: 0,
    totalShipping: 0,
  },
  grandTotal: 12_200_000_00,
  projectBudget: 12_200_000_00,
  contractValue: 10_200_000_00,
  serviceModel: "CRC",
};

function phase(phaseNumber: number, propertyCode: string, phaseValue: number) {
  return {
    phaseId: phaseNumber,
    phaseNumber,
    name: `Phase ${phaseNumber}`,
    properties: [{ id: phaseNumber, propertyCode, address: null, units: [] }],
    breakdown: { offsite: phaseValue, onsite: 0, shipping: 0, customizations: 0 },
    phaseValue,
    milestones: [
      { name: "Signing Deposit", trigger: "Contract Execution", percentage: 20, amount: phaseValue * 0.2 },
      { name: "Retainage", trigger: "CO/Equivalent", percentage: 80, amount: phaseValue * 0.8 },
    ],
    dates: { phaseNumber, factoryStart: null, factoryComplete: null, deliveryWindow: null, targetCO: null },
  };
}

const PHASES = [phase(1, "P-1", 6_000_000_00), phase(2, "P-2", 4_000_000_00)];

describe("generateExhibitA5TableHtml", () => {
  it("bills the design fee on exactly one row", () => {
    // The milestone base excludes the design fee by construction, so a design
    // fee row plus a base that contained it billed the client twice.
    const html = generateExhibitA5TableHtml(PHASES, SUMMARY, "CRC");
    expect(html.match(/Design Fee/g)?.length).toBe(1);
  });

  it("totals the design fee plus every phase's milestones, and that equals the contract value", () => {
    const html = generateExhibitA5TableHtml(PHASES, SUMMARY, "CRC");
    expect(html).toContain("$10,200,000");
  });

  it("names each phase's property beside its milestones", () => {
    const html = generateExhibitA5TableHtml(PHASES, SUMMARY, "CRC");
    expect(html).toContain("P-1");
    expect(html).toContain("P-2");
  });

  it("renders every phase's milestones, not only the first phase's", () => {
    const html = generateExhibitA5TableHtml(PHASES, SUMMARY, "CRC");
    expect(html.match(/Signing Deposit/g)?.length).toBe(2);
  });

  it("renders the design fee alone for a project with no phases", () => {
    // phases: [] is the documented legacy shape; it must still produce a table.
    const html = generateExhibitA5TableHtml([], SUMMARY, "CRC");
    expect(html).toContain("Design Fee");
    expect(html).toContain("$200,000");
  });

  it("reports missing pricing rather than rendering an empty table", () => {
    expect(generateExhibitA5TableHtml(PHASES, null, "CRC")).toBe("No pricing data available.");
  });
});
```

- [ ] **Step 2: Run them, confirm RED, record the output**

- [ ] **Step 3: Replace the generator**

```ts
/** One phase as `buildPhaseRollups` returns it; only the fields A.5 renders. */
export interface A5Phase {
  phaseNumber: number;
  properties: { propertyCode: string }[];
  milestones: { name: string; trigger: string; percentage: number; amount: number }[];
}

export function generateExhibitA5TableHtml(
  phases: A5Phase[] | null,
  pricingSummary: PricingSummary | null,
  serviceModel: string
): string {
  if (!pricingSummary) return 'No pricing data available.';

  const { breakdown } = pricingSummary;

  // The design fee is billed once, on its own Execution row. Every phase's
  // milestones divide that phase's value, which excludes it by construction —
  // so this row and those rows cannot overlap.
  const rows: { cells: string[]; isBold?: boolean; isTotal?: boolean }[] = [
    { cells: ['', '', 'Design Fee', 'Execution', '-', formatCurrency(breakdown.totalDesignFee), 'Immediate'] },
  ];

  for (const phase of phases || []) {
    const propertyCode = phase.properties.map((p) => p.propertyCode).join(', ');
    for (const milestone of phase.milestones) {
      rows.push({
        cells: [
          propertyCode,
          String(phase.phaseNumber),
          milestone.name,
          milestone.trigger,
          `${milestone.percentage}%`,
          formatCurrency(milestone.amount),
          '',
        ],
      });
    }
  }

  rows.push({
    cells: ['', '', 'Total', '', '100%', formatCurrency(pricingSummary.contractValue), ''],
    isBold: true,
    isTotal: true,
  });

  return buildStyledTable({
    columns: [
      { header: 'Property ID', align: 'left' },
      { header: 'Phase', align: 'left' },
      { header: 'Payment', align: 'left' },
      { header: 'Trigger', align: 'left' },
      { header: '%', align: 'center' },
      { header: 'Amount', align: 'right' },
      { header: 'Due', align: 'left' },
    ],
    rows,
  });
}
```

Delete `getMilestoneTrigger` — the trigger now comes from the stored milestone, and nothing else calls it. Confirm with `grep -rn "getMilestoneTrigger" server/` before deleting.

- [ ] **Step 4: Confirm GREEN, gates at 12**

`npm run check` will report the `mapper.ts` call site as an error until Task 6 updates it. **If the count is 13 and the thirteenth is that call site, that is expected** — note it and carry on; Task 6 returns it to 12. Do not "fix" it by casting.

- [ ] **Step 5: Commit**

```bash
git add server/lib/tableGenerators.ts server/lib/__tests__/exhibit-a5.test.ts
git commit -m "Bill the design fee once in A.5 and break its milestones out by phase"
```

---

## Task 5: A.2 and B.1 describe the properties

**Files:** Modify `server/lib/tableGenerators.ts`; create `server/lib/__tests__/exhibit-a2-b1.test.ts`

**Interfaces:** Produces `generateExhibitA2TableHtml(phases, unphasedAddress)` and `generateExhibitB1TableHtml(phases)`, both consuming `PhaseRollup[]`. **Both signatures change**; Task 6 updates the call sites.

A.2 currently hardcodes `P-1` / `Phase 1` with four empty date columns whatever the data says. B.1 numbers properties `P-1..P-n` from array position. Both report "21 Units: 1x Gabriel, 1x Lumina" because they count line items rather than quantities. `PhaseRollup.properties` carries `propertyCode`, `address` and per-unit detail precisely so these two can be built without re-querying.

**Deviation from the spec, deliberate:** the spec says B.1 is "one row per property". This builds **one row per unit**, with the property code repeated down the rows. B.1 is the Plan Set Index, and a plan set belongs to a model — a property holding a home and an ADU has two of them, and two Plan Set Version cells to fill. A.2, where the row genuinely describes the lot, stays one row per property as specced.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { generateExhibitA2TableHtml, generateExhibitB1TableHtml } from "../tableGenerators";

const PHASES = [
  {
    phaseId: 1,
    phaseNumber: 1,
    name: "Phase 1",
    properties: [
      {
        id: 10,
        propertyCode: "P-1",
        address: "1 Zaca Station Rd",
        units: [
          { id: 100, unitLabel: "P-1 Home", sourceName: "Lumina", squareFootage: 2033, bedrooms: 3, bathrooms: 2, quantity: 14 },
        ],
      },
      {
        id: 11,
        propertyCode: "P-2",
        address: null,
        units: [
          { id: 101, unitLabel: "P-2 Home", sourceName: "Gabriel", squareFootage: 1200, bedrooms: 2, bathrooms: 1, quantity: 7 },
        ],
      },
    ],
    breakdown: { offsite: 0, onsite: 0, shipping: 0, customizations: 0 },
    phaseValue: 0,
    milestones: [],
    dates: {
      phaseNumber: 1,
      factoryStart: "2027-01-04",
      factoryComplete: "2027-05-03",
      deliveryWindow: "2027-05-10",
      targetCO: "2027-08-01",
    },
  },
];

describe("generateExhibitA2TableHtml", () => {
  it("gives every property its own row, not a hardcoded P-1", () => {
    const html = generateExhibitA2TableHtml(PHASES, "");
    expect(html).toContain("P-1");
    expect(html).toContain("P-2");
  });

  it("fills the four date columns from the owning phase", () => {
    const html = generateExhibitA2TableHtml(PHASES, "");
    expect(html).toContain("January 4, 2027");
    expect(html).toContain("August 1, 2027");
  });

  it("renders TBD for a date the phase has not derived", () => {
    const undated = [{ ...PHASES[0], dates: { phaseNumber: 1, factoryStart: null, factoryComplete: null, deliveryWindow: null, targetCO: null } }];
    expect(generateExhibitA2TableHtml(undated, "")).toContain("TBD");
  });

  it("counts quantities, not line items", () => {
    // The issued agreement read "21 Units: 1x Gabriel, 1x Lumina".
    const html = generateExhibitA2TableHtml(PHASES, "");
    expect(html).toContain("14");
    expect(html).toContain("7");
  });

  it("falls back to the project address for a property with none", () => {
    const html = generateExhibitA2TableHtml(PHASES, "1234 Fallback Rd");
    expect(html).toContain("1 Zaca Station Rd");
    expect(html).toContain("1234 Fallback Rd");
  });

  it("says so plainly when there are no phases", () => {
    expect(generateExhibitA2TableHtml([], "")).toContain("No properties configured");
  });
});

describe("generateExhibitB1TableHtml", () => {
  it("numbers rows by the stored property code, not by array position", () => {
    const html = generateExhibitB1TableHtml(PHASES);
    expect(html).toContain("P-1");
    expect(html).toContain("P-2");
  });

  it("totals the unit quantities", () => {
    expect(generateExhibitB1TableHtml(PHASES)).toContain("21");
  });

  it("carries each unit's specs", () => {
    const html = generateExhibitB1TableHtml(PHASES);
    expect(html).toContain("2,033 sqft");
    expect(html).toContain("3 Bed");
  });
});
```

- [ ] **Step 2: Run them, confirm RED, record the output**

- [ ] **Step 3: Implement both generators**

Add the shared row type and a date formatter at the top of the file:

```ts
/** One phase as `buildPhaseRollups` returns it; the fields A.2 and B.1 render. */
export interface ExhibitPhase {
  phaseNumber: number;
  properties: {
    propertyCode: string;
    address: string | null;
    units: {
      unitLabel: string | null;
      sourceName: string | null;
      squareFootage: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      quantity: number;
    }[];
  }[];
  dates: {
    factoryStart: string | null;
    factoryComplete: string | null;
    deliveryWindow: string | null;
    targetCO: string | null;
  };
}

/** UTC, matching `formatDateOrTBD` in mapper.ts: a YYYY-MM-DD string is UTC
 * midnight, and formatting it in the host zone prints the day before. */
const EXHIBIT_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
});

function formatExhibitDate(value: string | null): string {
  if (!value) return 'TBD';
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? 'TBD' : EXHIBIT_DATE_FORMAT.format(parsed);
}

function unitSpecs(unit: ExhibitPhase['properties'][number]['units'][number]): string {
  const specs: string[] = [];
  if (unit.bedrooms != null) specs.push(`${unit.bedrooms} Bed`);
  if (unit.bathrooms != null) specs.push(`${unit.bathrooms} Bath`);
  if (unit.squareFootage != null) specs.push(`${unit.squareFootage.toLocaleString()} sqft`);
  return specs.length > 0 ? specs.join(' / ') : '-';
}
```

Then replace both generators:

```ts
export function generateExhibitA2TableHtml(
  phases: ExhibitPhase[] | null,
  fallbackAddress: string
): string {
  const rows: { cells: string[]; isBold?: boolean; isTotal?: boolean }[] = [];

  for (const phase of phases || []) {
    for (const property of phase.properties) {
      const models = property.units
        .map((u) => `${u.quantity}× ${u.sourceName || 'Unknown'}`)
        .join(', ');
      rows.push({
        cells: [
          property.propertyCode,
          property.address || fallbackAddress || 'TBD',
          `Phase ${phase.phaseNumber}`,
          models || 'TBD',
          formatExhibitDate(phase.dates.factoryStart),
          formatExhibitDate(phase.dates.factoryComplete),
          formatExhibitDate(phase.dates.deliveryWindow),
          formatExhibitDate(phase.dates.targetCO),
        ],
      });
    }
  }

  if (rows.length === 0) {
    rows.push({ cells: ['No properties configured', '', '', '', '', '', '', ''] });
  }

  return buildStyledTable({
    columns: [
      { header: 'Property ID', align: 'left' },
      { header: 'Site Address', align: 'left' },
      { header: 'Phase', align: 'left' },
      { header: 'Home/Model', align: 'left' },
      { header: 'Est. Factory Start', align: 'left' },
      { header: 'Est. Factory Complete', align: 'left' },
      { header: 'Est. Delivery Window', align: 'left' },
      { header: 'Target CO/Equivalent', align: 'left' },
    ],
    rows,
  });
}

export function generateExhibitB1TableHtml(phases: ExhibitPhase[] | null): string {
  const rows: { cells: string[]; isBold?: boolean; isTotal?: boolean }[] = [];
  let totalUnits = 0;

  for (const phase of phases || []) {
    for (const property of phase.properties) {
      for (const unit of property.units) {
        totalUnits += unit.quantity;
        rows.push({
          cells: [
            property.propertyCode,
            String(phase.phaseNumber),
            unit.unitLabel || '-',
            unit.sourceName || '-',
            String(unit.quantity),
            unitSpecs(unit),
            '',
            '',
            '',
          ],
        });
      }
    }
  }

  if (rows.length === 0) {
    return '<p style="font-style: italic; color: #666;">No units configured.</p>';
  }

  rows.push({
    cells: ['', '', '', 'Total', String(totalUnits), '', '', '', ''],
    isBold: true,
    isTotal: true,
  });

  return buildStyledTable({
    columns: [
      { header: 'Property ID', align: 'left' },
      { header: 'Phase', align: 'left' },
      { header: 'Unit', align: 'left' },
      { header: 'Model', align: 'left' },
      { header: 'Qty', align: 'center' },
      { header: 'Specs', align: 'center' },
      { header: 'Plan Set Version', align: 'left' },
      { header: 'Date', align: 'left' },
      { header: 'Third-Party Review', align: 'left' },
    ],
    rows,
  });
}
```

The `ProjectUnit` interface becomes unused once `mapper.ts` stops passing it in Task 6; delete it then, not now.

- [ ] **Step 4: Confirm GREEN. The `mapper.ts` call sites are still stale, so `npm run check` stays above 12 until Task 6 — expected.**

- [ ] **Step 5: Commit**

```bash
git add server/lib/tableGenerators.ts server/lib/__tests__/exhibit-a2-b1.test.ts
git commit -m "Build A.2 and B.1 from the phase rollups with real dates and quantities"
```

---

## Task 6: Wire the mapper

**Files:** Modify `server/lib/mapper.ts`

**Interfaces:** Consumes the new generator signatures from Tasks 4 and 5. Produces corrected `LOGISTICS_PRICE`, `SIGNATURE_BLOCK_TABLE` and `DESIGN_DEVELOPMENT_DATE`; returns `npm run check` to 12.

**Read `server/lib/mapper.ts` in full before editing it.** `CLAUDE.md` requires it and the file is 1713 lines.

- [ ] **Step 1: Pass the phases to the three rewritten generators**

`mapProjectToVariables` already receives `pricingSummary`, which now carries `phases`. Replace the four call sites (around lines 1158–1189):

```ts
    EXHIBIT_A2_TABLE: generateExhibitA2TableHtml(
      pricingSummary?.phases || null,
      buildFullAddress(
        projectDetails?.deliveryAddress,
        projectDetails?.deliveryCity,
        projectDetails?.deliveryState,
        projectDetails?.deliveryZip
      )
    ),
    EXHIBIT_A4_TABLE: generateExhibitA4TableHtml(
      pricingSummary || null,
      pricingSummary?.serviceModel || project.onSiteSelection || "CRC"
    ),
    EXHIBIT_A5_TABLE: generateExhibitA5TableHtml(
      pricingSummary?.phases || null,
      pricingSummary || null,
      pricingSummary?.serviceModel || project.onSiteSelection || "CRC"
    ),
    EXHIBIT_B1_TABLE: generateExhibitB1TableHtml(
      pricingSummary?.phases || null
    ),
```

Then delete the now-unused `ProjectUnit as TGProjectUnit` import and the `ProjectUnit` interface in `tableGenerators.ts`.

- [ ] **Step 2: Give `LOGISTICS_PRICE` its figure**

At what is currently line 1077:

```ts
    LOGISTICS_PRICE: formatCentsAsCurrency(
      pricingSummary?.breakdown.totalShipping ?? financials?.prelimOffsite ?? null
    ),
```

The hardcoded `formatCurrency(0)` is the single line that put `$0` on A.4's Delivery/Assembly row while the total counted shipping — $2,087,400 of the issued agreement's gap.

- [ ] **Step 3: Stop the client's entity type signing as a title**

`buildMapperSignatureBlock` receives `client?.entityType || ""` as `clientTitle`, which prints `Title: LLC`. An entity type is not a person's title:

```ts
    SIGNATURE_BLOCK_TABLE: buildMapperSignatureBlock(
      childLlc?.legalName || "Dvele, Inc.",
      client
        ? client.legalName ||
            `${client.firstName || ""} ${client.lastName || ""}`.trim()
        : "",
      // Left blank deliberately: the signer's title is not recorded anywhere,
      // and `client.entityType` is the entity's form ("LLC"), which printed as
      // `Title: LLC` on the issued agreement.
      ""
    ),
```

- [ ] **Step 4: Stop A.1 printing the site address twice**

`buildFullAddress` appends city, state and zip to an address that frequently already contains them:

```ts
export function buildFullAddress(
  address: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
  zip: string | null | undefined
): string {
  const parts = [address, city, state, zip].filter(Boolean);
  if (parts.length === 0) return "";

  // The address field is free text and users routinely paste the whole address
  // into it. Re-appending a city already present prints it twice on A.1.
  const line = (address || "").trim();
  const alreadyComplete =
    !!city && !!zip &&
    line.toLowerCase().includes(city.toLowerCase()) &&
    line.includes(zip);
  if (alreadyComplete) return line;

  if (city && state && zip) {
    return `${line}, ${city}, ${state} ${zip}`.replace(/^, /, "");
  }
  return parts.join(", ");
}
```

- [ ] **Step 5: Give D-4 its date**

`DESIGN_DEVELOPMENT_DATE` derives ten business days after permit submittal; `GREEN_LIGHT_DATE` is hand-entered and usually blank. D.1's D-4 row is the Green Light Package, and a hand-entered date outranks a derived one — the rule Plan C established for the four phase dates:

```ts
    DESIGN_DEVELOPMENT_DATE: formatDateOrTBD(
      asCalendarDate(projectDetails?.greenLightDate) ?? derivedDesignDevelopmentDate
    ),
```

Use whatever local name the existing derivation already binds — find it with `grep -n "DESIGN_DEVELOPMENT_DATE" server/lib/mapper.ts` and read the surrounding block before editing. Do not introduce a second variable for D-4: two variables in one cell print two dates for one milestone.

- [ ] **Step 6: Verify**

```bash
npm run check 2>&1 | grep -c "error TS"   # back to 12
env -u DATABASE_URL npm test
```

The count returning to 12 is the signal that Tasks 4 and 5's signature changes are fully wired. If it is 13, the remaining error names the call site still to fix.

- [ ] **Step 7: Commit**

```bash
git add server/lib/mapper.ts server/lib/tableGenerators.ts
git commit -m "Wire the exhibit tables to the phase rollups and fix the signature and address defects"
```

---

## Task 7: The rewire script

**Files:** Create `scripts/rewire_master_ef_exhibits.ts`; modify `server/seed-data.json`

**Interfaces:** Produces a script runnable against any environment: `DATABASE_URL=… npx tsx scripts/rewire_master_ef_exhibits.ts [--dry-run] [--write-seed]`.

The MASTER_EF exhibit bodies are `exhibits.content` rows. Each rewired section has the same shape — an `<h3>` heading followed immediately by a `<table>`:

```html
<h3>A.2 Property &amp; Phase Matrix</h3>
<table>
  …hardcoded P-1 / Phase 1 / empty date cells…
</table>
```

so the transformation is: **find the heading, replace the `<table>` that follows it with the placeholder.** Hand-editing through `/admin/exhibits` would leave environments silently divergent — and they already are.

- [ ] **Step 1: Read the current bodies before changing them**

```bash
psql -d dvele -c "SELECT id, title, length(content) FROM exhibits ORDER BY id;"
psql -d dvele -At -c "SELECT content FROM exhibits WHERE title LIKE 'Project Scope%';" > /tmp/exhibit-a-before.html
```

Confirm each heading below appears exactly once in the body that carries it. A heading that appears twice, or not at all, means the seeded content differs from `seed-data.json` — stop and report that rather than guessing.

- [ ] **Step 2: Write the script**

```ts
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { pool } from "../server/db";

/**
 * Rewires the MASTER_EF exhibit bodies onto the dynamic generators.
 *
 * Idempotent: a section already carrying its placeholder is left alone, so the
 * script can be run against any environment repeatedly and in any order.
 *
 * The bodies are database rows. Editing server/seed-data.json changes only what
 * a fresh checkout seeds — `--write-seed` keeps the two in step.
 */

interface Rewiring {
  /** Exact heading text as it appears in the stored HTML, entities included. */
  heading: string;
  placeholder: string;
}

const REWIRINGS: Rewiring[] = [
  { heading: "A.2 Property &amp; Phase Matrix", placeholder: "{{EXHIBIT_A2_TABLE}}" },
  { heading: "A.4 Pricing Summary", placeholder: "{{EXHIBIT_A4_TABLE}}" },
  { heading: "A.5 Milestones &amp; Payment Schedule (Per Property/Phase)", placeholder: "{{EXHIBIT_A5_TABLE}}" },
  { heading: "B.1 Plan Set Index", placeholder: "{{EXHIBIT_B1_TABLE}}" },
  { heading: "C.2 Responsibility Allocation Matrix", placeholder: "{{RESPONSIBILITY_MATRIX_TABLE}}" },
];

// D.1, D.2 and C.4 are NOT in this list. Their tables carry the agreement's own
// deliverable and review-period text in the other columns; replacing them
// wholesale would delete that text to fill one cell. Task 8 fills the cells
// instead.

/** Replaces the first <table>…</table> after `heading` with `placeholder`. */
function rewire(content: string, { heading, placeholder }: Rewiring): { content: string; changed: boolean; found: boolean } {
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) return { content, changed: false, found: false };

  const after = content.slice(headingIndex);
  if (after.slice(0, 400).includes(placeholder)) {
    return { content, changed: false, found: true }; // already rewired
  }

  const tableStart = after.indexOf("<table");
  const tableEnd = after.indexOf("</table>");
  if (tableStart === -1 || tableEnd === -1 || tableEnd < tableStart) {
    throw new Error(`No table follows "${heading}" — inspect the body by hand`);
  }

  const rewired =
    after.slice(0, tableStart) + placeholder + after.slice(tableEnd + "</table>".length);
  return { content: content.slice(0, headingIndex) + rewired, changed: true, found: true };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const writeSeed = process.argv.includes("--write-seed");

  const { rows } = await pool.query(`SELECT id, title, content FROM exhibits ORDER BY id`);
  let changedRows = 0;

  for (const row of rows) {
    let content: string = row.content || "";
    const applied: string[] = [];

    for (const rewiring of REWIRINGS) {
      const result = rewire(content, rewiring);
      if (result.found && result.changed) applied.push(rewiring.heading);
      content = result.content;
    }

    if (applied.length === 0) continue;
    changedRows++;
    console.log(`${dryRun ? "[dry-run] " : ""}exhibit ${row.id} (${row.title}): ${applied.length} section(s)`);
    for (const heading of applied) console.log(`    ${heading}`);

    if (!dryRun) {
      await pool.query(`UPDATE exhibits SET content = $1 WHERE id = $2`, [content, row.id]);
    }
  }

  console.log(`${changedRows} row(s) ${dryRun ? "would change" : "changed"}`);

  if (writeSeed && !dryRun) {
    const path = "server/seed-data.json";
    const seed = JSON.parse(readFileSync(path, "utf8"));
    for (const exhibit of seed.exhibits) {
      let content: string = exhibit.content || "";
      for (const rewiring of REWIRINGS) content = rewire(content, rewiring).content;
      exhibit.content = content;
    }
    writeFileSync(path, `${JSON.stringify(seed, null, 2)}\n`);
    console.log(`${path} refreshed`);
  }

  await pool.end();
}

main();
```

- [ ] **Step 3: Dry-run, then apply locally**

```bash
npx tsx scripts/rewire_master_ef_exhibits.ts --dry-run
npx tsx scripts/rewire_master_ef_exhibits.ts --write-seed
psql -d dvele -At -c "SELECT content FROM exhibits WHERE title LIKE 'Project Scope%';" | grep -c "{{EXHIBIT_A2_TABLE}}"
npx tsx scripts/rewire_master_ef_exhibits.ts --dry-run   # expect: 0 rows would change
```

The second dry-run reporting zero changes is the idempotency proof. Run it.

- [ ] **Step 4: Commit**

```bash
git add scripts/rewire_master_ef_exhibits.ts server/seed-data.json
git commit -m "Rewire the MASTER_EF exhibit tables onto the dynamic generators"
```

---

## Task 8: The cells, the day counts and the signatures

**Files:** Modify `scripts/rewire_master_ef_exhibits.ts`, `server/seed-data.json`

**Interfaces:** Consumes the variables `mapper.ts` already resolves. Adds no new ones.

Four rewirings that are not "replace a table". **Every variable below already exists** — Plan C created the eight D.1/D.2 dates and commented each with its row number, and the three C.4 day counts sit at `mapper.ts:1439-1443`. Confirm that before writing any of them:

```bash
grep -n "DESIGN_KICKOFF_DATE\|SCHEMATIC_DESIGN_DATE\|PERMIT_SUBMITTAL_DATE\|DESIGN_DEVELOPMENT_DATE\|PRODUCTION_START_DATE\|PRODUCTION_COMPLETE_DATE\|DELIVERY_SET_DATE\|CO_EQUIVALENT_DATE\|FOUNDATION_READY_DAYS\|UTILITY_STUBBED_DAYS\|CRANE_ACCESS_READY_DAYS" server/lib/mapper.ts
```

If one is missing, stop and report it rather than inventing a second variable for a cell that already has one.

- [ ] **Step 1: Add the cell and literal rules to the script**

```ts
/** A row identified by its first cell, whose trailing empty cell takes a variable. */
interface CellRewiring {
  rowLabel: string;
  variable: string;
}

// D.1 and D.2's Target Date column is the last cell of each row and is
// literally `<td></td>`. Every variable here already exists in mapper.ts, each
// commented there with the row it serves — do not add new ones.
const CELL_REWIRINGS: CellRewiring[] = [
  { rowLabel: "D-1 Kickoff", variable: "{{DESIGN_KICKOFF_DATE}}" },
  { rowLabel: "D-2 Schematic", variable: "{{SCHEMATIC_DESIGN_DATE}}" },
  { rowLabel: "D-3 Permit Set", variable: "{{PERMIT_SUBMITTAL_DATE}}" },
  // D-4 resolves GREEN_LIGHT_DATE when set, falling back to the derivation —
  // see Task 6. One variable in this cell, never two.
  { rowLabel: "D-4 Green Light Package", variable: "{{DESIGN_DEVELOPMENT_DATE}}" },
  { rowLabel: "P-1 Factory Start", variable: "{{PRODUCTION_START_DATE}}" },
  { rowLabel: "P-2 Factory Completion", variable: "{{PRODUCTION_COMPLETE_DATE}}" },
  { rowLabel: "P-3 Delivery/Set", variable: "{{DELIVERY_SET_DATE}}" },
  { rowLabel: "P-4 CO/Equivalent (if Dvele model)", variable: "{{CO_EQUIVALENT_DATE}}" },
];

/** Fills the empty trailing <td></td> of the row whose first cell is `rowLabel`. */
function rewireCell(content: string, { rowLabel, variable }: CellRewiring): string {
  const rowStart = content.indexOf(`<td>${rowLabel}</td>`);
  if (rowStart === -1) return content;

  const rowEnd = content.indexOf("</tr>", rowStart);
  if (rowEnd === -1) throw new Error(`Row "${rowLabel}" has no closing tag`);

  const row = content.slice(rowStart, rowEnd);
  if (row.includes(variable)) return content; // already rewired

  if (!row.includes("<td></td>")) {
    throw new Error(`Row "${rowLabel}" has no empty cell to fill — inspect it by hand`);
  }

  return content.slice(0, rowStart) + row.replace("<td></td>", `<td>${variable}</td>`) + content.slice(rowEnd);
}

/** Exact-string replacements. Each is idempotent: absent means already applied. */
const LITERAL_REWIRINGS: { from: string; to: string; note: string }[] = [
  {
    // C.4's three deadlines. Each row's day count is already collected in the
    // wizard and resolved in mapper.ts; only the body never referenced them.
    from: "<tr><td>Foundation ready certification</td><td>Client/GC</td><td>Dvele</td><td>[TBD] days before delivery</td></tr>",
    to: "<tr><td>Foundation ready certification</td><td>Client/GC</td><td>Dvele</td><td>{{FOUNDATION_READY_DAYS}} days before delivery</td></tr>",
    note: "C.4 foundation",
  },
  {
    from: "<tr><td>Utility stub verification</td><td>Client/GC</td><td>Dvele</td><td>[TBD] days before delivery</td></tr>",
    to: "<tr><td>Utility stub verification</td><td>Client/GC</td><td>Dvele</td><td>{{UTILITY_STUBBED_DAYS}} days before delivery</td></tr>",
    note: "C.4 utility stub",
  },
  {
    from: "<tr><td>Crane mobilization plan</td><td>Client/GC</td><td>Dvele</td><td>[TBD] days before delivery</td></tr>",
    to: "<tr><td>Crane mobilization plan</td><td>Client/GC</td><td>Dvele</td><td>{{CRANE_ACCESS_READY_DAYS}} days before delivery</td></tr>",
    note: "C.4 crane",
  },
  {
    // A.5's own table now carries every phase's milestones, so the project-level
    // schedule that followed it billed the same money a second time.
    from: "\n\n{{PAYMENT_SCHEDULE_TABLE}}\n\n<h3>A.6 Green Light Conditions (Phase-Specific)</h3>",
    to: "\n\n<h3>A.6 Green Light Conditions (Phase-Specific)</h3>",
    note: "A.5 trailing project-level schedule removed",
  },
  {
    from: "<p><em>(Add rows for each Property and Phase.)</em></p>",
    to: "",
    note: "A.5 manual-entry note, obsolete once the table is generated",
  },
];
```

- [ ] **Step 2: Add the Exhibit A signature rule**

Exhibit A ends with a hardcoded block naming `DVELE, INC.` while the master page names the child LLC — one agreement, two companies. `{{EXHIBIT_A_SIGNATURE_TABLE}}` already resolves both blocks from one source.

The block is a run of `<p>` elements, not a table, so it needs its own bounded replacement:

```ts
/** Replaces Exhibit A's hardcoded signature run with the resolved block. */
function rewireSignature(content: string): string {
  const marker = "<p><strong>Accepted and agreed:</strong></p>";
  const start = content.indexOf(marker);
  if (start === -1) return content;
  if (content.slice(start, start + 200).includes("{{EXHIBIT_A_SIGNATURE_TABLE}}")) return content;

  // The run ends at the cell that contains it; replacing to the closing tag
  // keeps the surrounding table structure intact.
  const end = content.indexOf("</td>", start);
  if (end === -1) throw new Error("Exhibit A's signature block has no closing cell");

  return content.slice(0, start) + "{{EXHIBIT_A_SIGNATURE_TABLE}}\n      " + content.slice(end);
}
```

Call `rewireCell`, the literal rules and `rewireSignature` from `main`'s per-row loop alongside `rewire`, counting each as a change so the dry-run reports them.

- [ ] **Step 3: Dry-run, apply, and prove idempotency**

```bash
npx tsx scripts/rewire_master_ef_exhibits.ts --dry-run
npx tsx scripts/rewire_master_ef_exhibits.ts --write-seed
npx tsx scripts/rewire_master_ef_exhibits.ts --dry-run   # expect: 0 rows would change
```

Then confirm nothing was left behind:

```bash
psql -d dvele -At -c "SELECT content FROM exhibits" | grep -c "\[TBD\] days before delivery"   # expect 0
psql -d dvele -At -c "SELECT content FROM exhibits" | grep -c "DVELE, INC."                    # expect 0
psql -d dvele -At -c "SELECT content FROM exhibits" | grep -c "{{PAYMENT_SCHEDULE_TABLE}}"     # expect 1 — Exhibit C keeps its own
grep -c "\[TBD\] days before delivery" server/seed-data.json                                   # expect 0
```

The third check is deliberate: the standalone "Payment Schedule" exhibit legitimately carries `{{PAYMENT_SCHEDULE_TABLE}}`. Only A.5's trailing copy is removed.

- [ ] **Step 4: Check whether `{{DESIGN_FEE}}` still renders raw anywhere**

`DESIGN_FEE` resolves to a number (`200000`), not a currency string; `DESIGN_FEE_WRITTEN` is the formatted one. A.4's body no longer references it — the whole table was replaced in Task 7 — but other bodies may:

```bash
psql -d dvele -At -c "SELECT content FROM exhibits" | grep -c "{{DESIGN_FEE}}"
grep -rn "{{DESIGN_FEE}}" server/seed-data.json | head
```

Where it appears beside other currency, add a literal rewiring swapping it for `{{DESIGN_FEE_WRITTEN}}`. Where it appears in a sentence that supplies its own dollar sign, leave it and say so in the commit message.

- [ ] **Step 5: Commit**

```bash
git add scripts/rewire_master_ef_exhibits.ts server/seed-data.json
git commit -m "Fill the D.1, D.2 and C.4 cells and resolve Exhibit A's signature block"
```

---

## Task 9: Regenerate and diff

**Files:** None — this task changes nothing. It is where the plan finds out whether it worked.

**Interfaces:** Consumes everything above.

Stages 1–6 were invisible in the generated document. This is the first plan in the series that changes it, which is why the spec puts the comparison here.

- [ ] **Step 1: Capture a before**

The bodies are already rewired by the time this task runs, so capture the "before" from the pre-rewire code: check out the commit before Task 7 into a scratch worktree, point it at a database whose `exhibits` rows are still original, and generate. If that is impractical, `scripts/rewire_master_ef_exhibits.ts` was run with `--dry-run` first — the dry-run output names every section that changed, which bounds what the diff should contain.

Generate a MASTER_EF contract for the fixture project below and save the HTML both times. Drive `POST /contracts/draft-preview` directly from a throwaway script, as Plans A–D did: every `/api` route is Cognito-gated and a script has no token.

- [ ] **Step 2: Build the Zaca fixture**

Recreate the issued project: its properties, phases, units and quantities (14× Lumina, 7× Gabriel), design fee and pricing, so the regenerated document is comparable to the issued PDF line for line.

- [ ] **Step 3: Diff against the issued agreement**

The PDF is supplied out of band — it is an executed client agreement, so **do not commit it and do not copy it into the repo**. Read it from wherever it was placed and compare, exhibit by exhibit:

| Check | Expected |
|---|---|
| A.1 `Site(s)` | The address once, not twice |
| A.2 | One row per property, four dates populated, quantities 14 and 7 |
| A.4 | Line items sum to the stated Total Project Price, Delivery/Assembly non-zero, design fee formatted as currency |
| A.5 | One Design Fee row; per-phase milestones; total equals contract value |
| B.1 | One row per property; total units 21 |
| C.2 | Checkmarks render as marks, not tofu boxes |
| C.4 | Day counts, not `[TBD] days before delivery` |
| D.1 / D.2 | Target Date cells populated; D-4 shows the green-light date |
| Signatures | Company signs as the child LLC, once, with no doubled suffix; client's Title is not `LLC`; Exhibit A's block matches the master page |

- [ ] **Step 4: Diff before against after**

Every difference must be explainable by a specific defect above. An unexplained change is a regression — investigate it before reporting the plan complete.

- [ ] **Step 5: Record what the comparison found**

Append the results to [`docs/phase-property-model-open-items.md`](../../phase-property-model-open-items.md) §7, replacing "What to exercise first" item 1 with what actually happened. This is the empirical confirmation that Plans A–D claimed statically and never had.

```bash
git add docs/phase-property-model-open-items.md
git commit -m "Record the regenerated contract's comparison against the issued agreement"
```

---

## Deliverable

The generated MASTER_EF agreement reports what the project data says: properties and phases in A.2 and B.1, a pricing summary whose line items sum to its own total, a payment schedule that bills the design fee once, populated milestone dates, and signature blocks naming the right entities.

## Deferred

| Item | Why |
|---|---|
| `0 → NULL` backfill on the three duration columns | A data migration against the deployed database; shares nothing with the document work |
| Renaming `design_development_date` | Migration plus a variable-library change; D-4's cell is correct without it |
| `POST /contracts/:id/regenerate`'s leaked transaction | Pre-existing; recorded in the open-items file §4 |
| `renderUnitPricingTable`'s `42703` on `hm.model_name` | A fourth unit read, in `component-library.ts`, on a path no exhibit body calls even after this plan |
