---
name: add-variable
description: Add a new template variable to mapper.ts. Use when asked to add a contract variable, expose a new data field in contract templates, or wire a DB field to a template placeholder.
version: 1.0.0
---

# Add Variable to mapper.ts

Guides safe addition of a new `{{VARIABLE_NAME}}` to the contract variable system.

## Step 1 — Read the full file

Before making any edit, read `server/lib/mapper.ts` in its entirety. It is 1500+ lines. Do not skip sections. Partial reads cause duplicate or conflicting variable definitions.

## Step 2 — Check whether a schema change is needed

Does the data for this variable already exist on one of these interfaces in `ProjectWithRelations`?

- `project` → `shared/schema.ts` `projects` table
- `client` → `clients` table
- `childLlc` → `llcs` table (via `ChildLlc` interface in mapper.ts)
- `projectDetails` → `project_details` table
- `financials` → `financials` table
- `milestones` → `milestones` table
- `warrantyTerms` → `warranty_terms` table
- `contractors` → `contractors` table
- `units` → `project_units` table

If the field does not exist on any of these, **stop and switch to plan mode**. Schema changes require `shared/schema.ts` edits followed by `npm run db:push`. CLAUDE.md mandates plan mode for all schema changes.

If the data already exists on one of the interfaces, continue.

## Step 3 — Determine variable type and naming

Apply these rules strictly:

| Variable type | Naming convention | Variants required |
|---|---|---|
| Money (DB cents) | `UPPER_SNAKE_CASE` | `VAR_NAME` (numeric dollars) + `VAR_NAME_WRITTEN` (formatted "$X.XX") |
| Date (DB string) | `UPPER_SNAKE_CASE` | `VAR_NAME` (short MM/DD/YYYY or raw) + `VAR_NAME_WRITTEN` (long "Month D, YYYY") |
| Boolean flag | `IS_` or `HAS_` prefix | Single variable, type `boolean` |
| Address (full) | `_FULL_ADDRESS` suffix | Use `buildFullAddress()` helper |
| Plain string/number | `UPPER_SNAKE_CASE` | Single variable |

## Step 4 — Identify the correct category section

Add the variable name(s) to the correct array in `VARIABLE_CATEGORIES`. Categories: `project`, `client`, `childLlc`, `site`, `home`, `specifications`, `dates`, `pricing`, `milestones`, `warranty`, `manufacturer`, `onsiteContractor`, `liquidatedDamages`, `schedule`, `legal`, `insurance`, `tables`, `conditional`.

If no existing category fits, create a new one and add it to `VARIABLE_CATEGORIES`.

## Step 5 — Write the implementation

Add to **both** locations in the file:

**Location A: `VARIABLE_CATEGORIES`** (lines ~89–338)
```ts
"YOUR_VAR_NAME",
"YOUR_VAR_NAME_WRITTEN",  // if money or date
```

**Location B: `mapProjectToVariables()` return object** (lines ~719–1487)

Add under the matching `// ===` section comment. Use the correct pattern:

---

### Money from DB (stored as cents integer)
```ts
YOUR_VAR_NAME: centsToDollars(financials?.yourDbField),
YOUR_VAR_NAME_WRITTEN: formatCentsAsCurrency(financials?.yourDbField),
```
Never use `formatCurrency()` on a DB field — it expects dollars, not cents.

---

### Money from pricingSummary (already in cents, use priority chain)
```ts
YOUR_VAR_NAME: pricingSummary
  ? pricingSummary.breakdown.yourValue / 100
  : centsToDollars(financials?.yourDbField),
YOUR_VAR_NAME_WRITTEN: pricingSummary
  ? formatCurrency(pricingSummary.breakdown.yourValue / 100)
  : formatCentsAsCurrency(financials?.yourDbField),
```

---

### Date (DB stores as string "YYYY-MM-DD")
```ts
YOUR_DATE_VAR: projectDetails?.yourDateField || "",
YOUR_DATE_VAR_WRITTEN: formatDateWritten(projectDetails?.yourDateField),
```
Use `formatDateOrTBD()` instead of `formatDateWritten()` if the date should show "TBD" when absent.

---

### Boolean / conditional flag
```ts
IS_YOUR_CONDITION: someField === "expectedValue",
HAS_YOUR_THING: !!someRelation?.someField,
```
Add to the `conditional` category in `VARIABLE_CATEGORIES`.

---

### Full address
```ts
YOUR_FULL_ADDRESS: buildFullAddress(
  source?.address,
  source?.city,
  source?.state,
  source?.zip
),
```

---

### Plain string or number
```ts
YOUR_VAR_NAME: source?.fieldName || "",
YOUR_VAR_NAME: source?.fieldName || 0,  // for numbers
```

---

## Step 6 — Run TypeScript check

```bash
npm run check
```

There is no test suite. This is the only automated safety net. Fix any errors before finishing.

## Step 7 — Confirm both locations were updated

- [ ] Variable name(s) appear in `VARIABLE_CATEGORIES` under the correct category key
- [ ] Variable name(s) appear in the `mapProjectToVariables()` return object under the correct `// ===` section

Missing either one is the most common failure mode.

---

## Common mistakes to avoid

- Using `formatCurrency(financials?.field)` when the field is cents — use `formatCentsAsCurrency()`
- Adding only `_WRITTEN` and forgetting the numeric variant (or vice versa)
- Reading only part of mapper.ts and introducing a duplicate variable key
- Adding a variable whose source data field doesn't exist on any DB table without doing a schema change in plan mode first
- Skipping `npm run check` at the end
