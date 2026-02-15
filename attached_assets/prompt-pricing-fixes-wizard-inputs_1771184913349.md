# REPLIT AGENT PROMPT — PRICING FIXES (A.4/A.5) + WIZARD INPUT FIELDS + DESIGN COST

## Context

We are working on the ONE Contract Manager — a contract generation system for Dvele, Inc. (factory-built modular homes). The system has a 9-step wizard that collects project data and generates legal contracts (MASTER_EF type).

This prompt addresses 6 issues grouped into two priorities:

**PRIORITY A — Pricing Bugs (fix first):**
1. **A.4 Pricing Summary table is missing On-Site row for CMOS projects** — The root cause is a bug in `server/lib/mapper.ts` lines 910 and 915 where `(project as any).serviceModel` is used but the project table stores service model as `project.onSiteSelection`. Since `serviceModel` doesn't exist on the project object, it's `undefined`, falls back to `'CRC'`, and the CMOS On-Site row is never included.
2. **A.5 Payment Schedule uses wrong base for CMOS** — Same root cause as #1. Because `serviceModel` is passed as `'CRC'`, the `totalBase` in `generateExhibitA5TableHtml()` excludes `totalOnsite`, so the payment schedule only covers the offsite portion.
3. **A.4 Delivery/Assembly row always shows $0** — The pricing engine doesn't calculate `totalShipping` separately. The `home_models` table doesn't have a shipping/delivery column. `breakdown.totalShipping` is always `undefined`, so A.4 shows "$0" for "Offsite Services (Delivery/Assembly)".

**PRIORITY B — Wizard Input Fields:**
4. **Design Cost should be user-defined** — Currently `totalDesignFee` sums `design_fee` from `home_models` per unit. Need a manual override input in Step 7.
5. **Additional Site Work / Buffer should default to $0** — Currently initializes from `projectData.preliminaryOnsiteCost`.
6. **Exhibit C.4 Interface Deadlines** — `[TBD] days before delivery` placeholders need editable number inputs.
7. **Exhibit D.1/D.2 Target Dates** — Empty "Target Date" columns need date picker inputs.

---

## PHASE 1: Fix Service Model Bug in Mapper (CRITICAL)

### Root Cause

In `server/lib/mapper.ts` around lines 908-916:

```typescript
EXHIBIT_A4_TABLE: generateExhibitA4TableHtml(
  pricingSummary || null,
  (project as any).serviceModel || 'CRC'     // BUG: project.serviceModel doesn't exist
),
EXHIBIT_A5_TABLE: generateExhibitA5TableHtml(
  pricingSummary?.paymentSchedule || null,
  pricingSummary || null,
  (project as any).serviceModel || 'CRC'     // BUG: same issue
),
```

The project DB record uses `onSiteSelection` (column `on_site_selection`), not `serviceModel`. Since `(project as any).serviceModel` is `undefined`, it always falls back to `'CRC'`.

### Fix

Replace both occurrences of `(project as any).serviceModel || 'CRC'` with the correct resolution. The best source is `pricingSummary.serviceModel` (which IS correctly set from the pricing engine), falling back to `project.onSiteSelection`:

```typescript
EXHIBIT_A4_TABLE: generateExhibitA4TableHtml(
  pricingSummary || null,
  pricingSummary?.serviceModel || project.onSiteSelection || 'CRC'
),
EXHIBIT_A5_TABLE: generateExhibitA5TableHtml(
  pricingSummary?.paymentSchedule || null,
  pricingSummary || null,
  pricingSummary?.serviceModel || project.onSiteSelection || 'CRC'
),
```

### Expected Result
- For CMOS projects: A.4 now includes "On-site Services (CMOS)" row with the onsite amount
- For CMOS projects: A.5 payment schedule is based on design + offsite + onsite (full project value)
- For CRC projects: No change (onsite excluded as before)

---

## PHASE 2: Add Shipping/Setting Breakout to Home Models and Pricing

### Problem

The Dvele pricing structure breaks Offsite costs into two parts:
1. **Offsite — Modules (Factory)** = the factory build cost per model
2. **Offsite — Shipping/Setting** = delivery + crane setting per model

These are BOTH Offsite costs. The contract's A.4 Pricing Summary table needs to show them as separate line items under Offsite.

Currently the `home_models` table only has `offsite_base_price` (which is Modules only) and `onsite_est_price` (which is the true on-site construction costs — does NOT include shipping). There is no column for Shipping/Setting.

The `tableGenerators.ts` code already references `breakdown.totalShipping` in the A.4 generator but the pricing engine never populates it, so it's always $0.

### Authoritative Pricing Data Per Model

From Dvele's pricing spreadsheet — these are the correct values:

| Model | Modules (Factory) | Shipping/Setting | Total Offsite | On-Site Estimate |
|-------|-------------------|-----------------|---------------|-----------------|
| Fernie | $206,066.67 | $18,975.00 | $225,041.67 | $85,514.00 |
| Baffin 1 | $265,466.67 | $18,975.00 | $284,441.67 | $86,836.50 |
| Baffin 2 | $321,200.00 | $18,975.00 | $340,175.00 | $95,289.00 |
| Gabriel | $434,426.67 | $74,750.00 | $509,176.67 | $289,300.90 |
| Sierra | $476,080.00 | $74,750.00 | $550,830.00 | $295,912.25 |
| Catalina | $545,600.00 | $74,750.00 | $620,350.00 | $315,148.88 |
| Solara | $545,600.00 | $74,750.00 | $620,350.00 | $321,983.33 |
| Lumina | $587,840.00 | $74,750.00 | $662,590.00 | $320,406.10 |

**Key: Shipping/Setting is an OFFSITE cost, NOT an Onsite cost.** The `onsite_est_price` values are correct and separate — no double-counting risk.

### Implementation

#### 2A. Add `shippingSetPrice` column to `home_models` table

In `shared/schema.ts`, add to the `homeModels` table (after `onsiteEstPrice`):

```typescript
shippingSetPrice: integer("shipping_set_price"), // cents - offsite delivery/crane setting cost
```

Run migration.

#### 2B. Update Pricing Engine

In `server/services/pricingEngine.ts`:

1. Add to the SQL query (around line 53), add `hm.shipping_set_price` to the SELECT:
```sql
SELECT 
  pu.id as unit_id,
  pu.base_price_snapshot,
  pu.customization_total,
  hm.id as model_id,
  hm.name as model_name,
  hm.design_fee,
  hm.offsite_base_price,
  hm.onsite_est_price,
  hm.shipping_set_price
 FROM project_units pu
 LEFT JOIN home_models hm ON pu.model_id = hm.id
 WHERE pu.project_id = $1
```

2. Add tracking variable (after line 73, alongside other totals):
```typescript
let totalShipping = 0;
```

3. In the unit loop (after line 85, alongside other accumulations):
```typescript
totalShipping += unit.shipping_set_price || 0;
```

4. **NO subtraction needed** — `onsite_est_price` does NOT include shipping. These are independent values. Do NOT subtract totalShipping from totalOnsite.

5. Update `projectBudget` calculation (around line 121) to include shipping:
```typescript
const projectBudget = totalDesignFee + totalOffsite + totalShipping + totalOnsite;
```

6. Update `contractValue` calculation (around line 126):
```typescript
// CRC: client handles onsite, Dvele charges design + offsite + shipping
// CMOS: Dvele manages everything
const contractValue = serviceModel === 'CRC' 
  ? totalDesignFee + totalOffsite + totalShipping
  : totalDesignFee + totalOffsite + totalShipping + totalOnsite;
```

7. Update the `PricingBreakdown` interface (top of file):
```typescript
export interface PricingBreakdown {
  totalDesignFee: number;
  totalOffsite: number;
  totalOnsite: number;
  totalCustomizations: number;
  totalShipping: number;  // NEW - offsite shipping/setting
}
```

8. Add `totalShipping` to the return breakdown object:
```typescript
breakdown: {
  totalDesignFee,
  totalOffsite,
  totalOnsite,
  totalCustomizations,
  totalShipping,
},
```

9. Update `grandTotal` (line 131):
```typescript
const grandTotal = projectBudget;
```
(This already references projectBudget which now includes shipping.)

#### 2C. Update A.4 Table Generator — Verify Only

The `generateExhibitA4TableHtml()` in `tableGenerators.ts` line 324 already has:
```typescript
const logisticsPrice = breakdown.totalShipping ? formatCurrency(breakdown.totalShipping) : '$0';
```

And line 334:
```typescript
{ cells: ['Offsite Services (Delivery/Assembly)', logisticsPrice, '', 'Delivery/transport'] },
```

This will now work correctly with the real `totalShipping` value. **No code change needed here.** But verify the `totalProjectPrice` calculation on line 326 includes shipping:
```typescript
const totalProjectPrice = formatCurrency(
  breakdown.totalDesignFee + breakdown.totalOffsite + (breakdown.totalShipping || 0) +
  (isCMOS ? breakdown.totalOnsite : 0)
);
```
This already includes `totalShipping` — good.

#### 2D. Update A.5 Table Generator — Add Shipping to Base

In `generateExhibitA5TableHtml()` (line 369), update `totalBase`:
```typescript
const totalBase = breakdown.totalDesignFee + breakdown.totalOffsite +
  (breakdown.totalShipping || 0) + (isCMOS ? breakdown.totalOnsite : 0);
```
This line already includes `totalShipping` — verify it's there. If so, no change needed.

#### 2E. Update Wizard Pricing Dashboard

In `Step7Pricing.tsx`, the pricing dashboard currently shows 4 boxes: Design Fee, Offsite Manufacturing, Onsite Estimate, Grand Total. Consider adding a 5th box or combining: show "Offsite (Factory)" and "Shipping/Setting" separately, or show "Total Offsite" as a combined number. Recommendation: keep it simple for now — the 4 boxes are fine as-is. The "Offsite Manufacturing" box can show `totalOffsite + totalShipping` combined. Just make sure `grandTotal` includes shipping.

Verify that `pricingSummary.grandTotal` (which flows to the wizard display) now correctly includes shipping via the updated `projectBudget` calculation.

#### 2F. Seed shipping data for existing models

**For the real Dvele models** (if they exist in the production DB), run UPDATE queries:

```sql
-- Shipping/Setting prices in cents
UPDATE home_models SET shipping_set_price = 1897500 WHERE name = 'Fernie';
UPDATE home_models SET shipping_set_price = 1897500 WHERE name = 'Baffin 1';
UPDATE home_models SET shipping_set_price = 1897500 WHERE name = 'Baffin 2';
UPDATE home_models SET shipping_set_price = 7475000 WHERE name = 'Gabriel';
UPDATE home_models SET shipping_set_price = 7475000 WHERE name = 'Sierra';
UPDATE home_models SET shipping_set_price = 7475000 WHERE name = 'Catalina';
UPDATE home_models SET shipping_set_price = 7475000 WHERE name = 'Solara';
UPDATE home_models SET shipping_set_price = 7475000 WHERE name = 'Lumina';
```

**For the dev/seed models** (Trinity, Salt Point, Sonoma, Carmel), add reasonable shipping values. Update `scripts/seed_mvp.ts` to include `shippingSetPrice` in the model data:
```typescript
{ name: 'Trinity', ..., shippingSetPrice: 2500000 },   // $25,000
{ name: 'Salt Point', ..., shippingSetPrice: 5000000 }, // $50,000
{ name: 'Sonoma', ..., shippingSetPrice: 7500000 },     // $75,000
{ name: 'Carmel', ..., shippingSetPrice: 7500000 },     // $75,000
```

Also update the SQL INSERT in seed_mvp.ts to include `shipping_set_price` in the column list and values.

#### 2G. Update Home Models admin page

In the admin page that manages home models (check `client/src/pages/admin/` or `client/src/pages/settings.tsx`), add a "Shipping/Set Price" input field alongside the existing design_fee, offsite_base_price, and onsite_est_price fields. Use the same currency input pattern (dollars displayed, stored as cents).

#### 2H. Update PricingBreakdown interface in tableGenerators.ts

The `PricingBreakdown` interface at the top of `tableGenerators.ts` (line 15) also needs `totalShipping`:
```typescript
interface PricingBreakdown {
  totalDesignFee: number;
  totalOffsite: number;
  totalOnsite: number;
  totalCustomizations?: number;
  totalShipping?: number;   // already exists but verify
  totalInstallation?: number;
}
```
This interface already has `totalShipping` as optional — verify it matches.

---

## PHASE 3: Design Fee as User-Defined Project-Level Input

### Problem
The design fee is currently calculated by summing `home_models.design_fee` across all project units in the pricing engine (line 82). But in reality, the design fee is a project-level amount determined during the sales process — it's NOT derived from per-model pricing. The per-model `design_fee` column in `home_models` can stay in the schema (no need to remove it), but the pricing engine should stop using it. Instead, the design fee should come from a user-entered value stored in `financials.design_fee`.

### Implementation

#### 3A. Update Pricing Engine — Stop Summing Per-Model Design Fee

In `server/services/pricingEngine.ts`, remove the per-model design fee accumulation.

**In the unit loop (around line 82), REMOVE this line:**
```typescript
totalDesignFee += unit.design_fee || 0;
```

**Replace the `totalDesignFee` logic entirely.** After the unit loop (or before the projectBudget calculation), set design fee from financials:

```typescript
// Design fee is a project-level amount entered by the user, NOT summed from models
totalDesignFee = financial?.designFee || 0;
```

This means:
- `financial.designFee` (the `design_fee` column in the `financials` table) is the single source of truth
- The per-model `design_fee` in `home_models` is ignored by the pricing engine
- No new `designFeeOverride` column needed — just use the existing `financials.designFee` field directly

**Also update the fallback block (no units, around line 108):**
```typescript
totalDesignFee = financial?.designFee || 0;
```
(This is already correct — no change needed here.)

#### 3B. Update Step 7 Pricing UI — Add Design Fee Input

In `client/src/components/wizard/steps/Step7Pricing.tsx`, add a new Card section **ABOVE** the "Additional Site Work / Buffer" card:

- Title: "Design Fee" with a DollarSign icon
- Description: "Total design/pre-production fee for this project (set during sales process)"
- Contains a single dollar input field (same pattern as the Additional Site Work input)
- Has a "Save & Recalculate" button that PATCHes to the financials endpoint

Add state:
```typescript
const [designFeeAmount, setDesignFeeAmount] = useState<number>(0);
```

Initialize from financials query:
```typescript
useEffect(() => {
  if (financialsData?.designFee !== undefined && financialsData.designFee !== null) {
    setDesignFeeAmount(financialsData.designFee);
  }
}, [financialsData?.designFee]);
```

The save mutation should PATCH to `/api/projects/${draftProjectId}/financials` with `{ designFee: designFeeAmount }`.

The input field should display dollars (divide stored cents by 100) and convert back to cents on save (multiply by 100), same pattern as the Additional Site Work field.

#### 3C. No Schema Change Needed

The `financials` table already has a `designFee` column (integer, cents). No new `designFeeOverride` column is needed — we're simply making `financials.designFee` the primary source and adding a wizard UI to set it.

#### 3D. Ensure financials record is created

When a project is first saved, make sure a `financials` row is created (or upserted). The PATCH endpoint at `/api/projects/:projectId/financials` already handles upsert (line 45-58 of `server/routes/financials.ts`), so this should work as-is.

#### 3E. Update the Pricing Dashboard Display

The Pricing Dashboard in Step 7 shows "Total Design Fee" from `pricingSummary.breakdown.totalDesignFee`. This will now show the user-entered amount (or $0 if not yet entered). Consider adding a visual hint if design fee is $0:

```typescript
{pricingSummary.breakdown.totalDesignFee === 0 && (
  <p className="text-xs text-amber-500">Enter design fee below</p>
)}
```

#### 3F. What about the per-model design_fee column?

Leave `home_models.design_fee` in the schema — don't remove it. It may be useful for:
- Reference/suggested pricing in the admin panel
- Future white-label SaaS where other companies use per-model design fees
- Historical data

Just don't use it in the pricing engine calculation. The admin Home Models page can still show it as "Suggested Design Fee" or similar.

---

## PHASE 4: Default Additional Site Work to $0

### Fix

In `Step7Pricing.tsx` line 45, change:
```typescript
const [additionalSiteWork, setAdditionalSiteWork] = useState<number>(projectData.preliminaryOnsiteCost || 0);
```
To:
```typescript
const [additionalSiteWork, setAdditionalSiteWork] = useState<number>(0);
```

The `useEffect` that loads from `financialsData.prelimOnsite` (lines 67-71) still hydrates saved values for existing projects. This change only affects initial render before the API response arrives.

---

## PHASE 5: Exhibit C.4 Interface Deadlines

### Implementation

#### 5A. Add deadline fields to ProjectData interface

In `WizardContext.tsx`, add to the `ProjectData` interface:

```typescript
// Exhibit C.4 - Interface Deadlines (days before delivery)
foundationReadyDays: number;
utilityStubbedDays: number;
siteAccessReadyDays: number;
permitsScheduledDays: number;
craneAccessReadyDays: number;
```

Add defaults in `initialProjectData`:
```typescript
foundationReadyDays: 14,
utilityStubbedDays: 14,
siteAccessReadyDays: 7,
permitsScheduledDays: 30,
craneAccessReadyDays: 7,
```

#### 5B. Add deadline fields to `projectDetails` table

In `shared/schema.ts`, add to `projectDetails`:

```typescript
foundationReadyDays: integer("foundation_ready_days").default(14),
utilityStubbedDays: integer("utility_stubbed_days").default(14),
siteAccessReadyDays: integer("site_access_ready_days").default(7),
permitsScheduledDays: integer("permits_scheduled_days").default(30),
craneAccessReadyDays: integer("crane_access_ready_days").default(7),
```

#### 5C. Add UI section in Step 6 (Dates & Schedule)

Add a new Card at the bottom of `Step6DatesSchedule.tsx`:

- Title: "Interface Deadlines (Exhibit C.4)" with a Clock icon
- Description: "Days before delivery that each site condition must be met"
- Grid of 5 number inputs (2 columns on desktop):

| Label | Field | Default |
|-------|-------|---------|
| Foundation Ready | foundationReadyDays | 14 |
| Utilities Stubbed Out | utilityStubbedDays | 14 |
| Site Access Ready | siteAccessReadyDays | 7 |
| Permits Scheduled | permitsScheduledDays | 30 |
| Crane/Equipment Access | craneAccessReadyDays | 7 |

Each input: `type="number"`, `min={1}`, `max={90}`, uses `updateProjectData()`.

Helper text: "These values populate the C.4 Interface Deadline table in the generated contract."

#### 5D. Add mapper variables

In `server/lib/mapper.ts`, add in the contract variable mapping section:

```typescript
FOUNDATION_READY_DAYS: projectDetails?.foundationReadyDays || 14,
UTILITY_STUBBED_DAYS: projectDetails?.utilityStubbedDays || 14,
SITE_ACCESS_READY_DAYS: projectDetails?.siteAccessReadyDays || 7,
PERMITS_SCHEDULED_DAYS: projectDetails?.permitsScheduledDays || 30,
CRANE_ACCESS_READY_DAYS: projectDetails?.craneAccessReadyDays || 7,
```

#### 5E. Update Exhibit C content in database

Update Exhibit C's content to include a C.4 section. Either via seed script or admin UI:

```html
<h3>C.4 Interface Deadlines</h3>
<table class="exhibit-table">
  <tr><th>Condition</th><th>Required By</th></tr>
  <tr><td>Foundation complete & inspected</td><td>{{FOUNDATION_READY_DAYS}} days before delivery</td></tr>
  <tr><td>Utility stubs placed</td><td>{{UTILITY_STUBBED_DAYS}} days before delivery</td></tr>
  <tr><td>Site access route cleared</td><td>{{SITE_ACCESS_READY_DAYS}} days before delivery</td></tr>
  <tr><td>Building permits scheduled</td><td>{{PERMITS_SCHEDULED_DAYS}} days before delivery</td></tr>
  <tr><td>Crane / heavy equipment access</td><td>{{CRANE_ACCESS_READY_DAYS}} days before delivery</td></tr>
</table>
```

#### 5F. Save/Load in wizard context

Ensure `saveDraft()` and `loadDraft()` in `WizardContext.tsx` include these 5 fields. Search for where `designPhaseDays` is saved/loaded — add these fields in the same pattern.

---

## PHASE 6: Exhibit D.1 / D.2 Target Dates

### Implementation

#### 6A. Add target date fields to ProjectData interface

In `WizardContext.tsx`, add to `ProjectData`:

```typescript
// Exhibit D.1 - Design/Pre-Production Milestone Target Dates
designKickoffDate: string;
schematicDesignDate: string;
designDevelopmentDate: string;
permitSubmittalDate: string;
// greenLightDate already exists in projectDetails schema

// Exhibit D.2 - Production Milestone Target Dates
// productionStartDate already exists in projectDetails schema
productionMidpointDate: string;
productionCompleteDate: string;
// estimatedDeliveryDate already exists in projectDetails schema
```

Check which fields already exist before adding duplicates. Add only new ones. Add empty string defaults in `initialProjectData`.

#### 6B. Add new date fields to `projectDetails` table

In `shared/schema.ts`, add to `projectDetails` (only fields that don't already exist):

```typescript
designKickoffDate: text("design_kickoff_date"),
schematicDesignDate: text("schematic_design_date"),
designDevelopmentDate: text("design_development_date"),
permitSubmittalDate: text("permit_submittal_date"),
productionMidpointDate: text("production_midpoint_date"),
productionCompleteDate: text("production_complete_date"),
```

Note: `greenLightDate`, `productionStartDate`, `estimatedDeliveryDate` already exist.

#### 6C. Add UI in Step 6 (Dates & Schedule)

Add two new Cards in `Step6DatesSchedule.tsx` between the Phase Durations card and the calculated dates display:

**D.1 Design / Pre-Production Milestones:**

Title: "Design Milestones (Exhibit D.1)" with Calendar icon

Grid of date inputs:
| Label | Field |
|-------|-------|
| Design Kickoff | designKickoffDate |
| Schematic Design Complete | schematicDesignDate |
| Design Development Complete | designDevelopmentDate |
| Permit Submittal | permitSubmittalDate |
| Green Light (Proceed to Production) | greenLightDate |

**D.2 Production Milestones:**

Title: "Production Milestones (Exhibit D.2)" with Calendar icon

Grid of date inputs:
| Label | Field |
|-------|-------|
| Production Start | manufacturingStartDate (existing field) |
| Production Midpoint | productionMidpointDate |
| Production Complete | productionCompleteDate |
| Delivery | targetDeliveryDate (existing field) |

Each date input: `type="date"`, uses `updateProjectData()`.

Helper text: "Leave blank for 'TBD' in the contract. Manual entries override calculated dates."

#### 6D. Add mapper variables

In `server/lib/mapper.ts`:

```typescript
DESIGN_KICKOFF_DATE: formatDateOrTBD(projectDetails?.designKickoffDate),
SCHEMATIC_DESIGN_DATE: formatDateOrTBD(projectDetails?.schematicDesignDate),
DESIGN_DEVELOPMENT_DATE: formatDateOrTBD(projectDetails?.designDevelopmentDate),
PERMIT_SUBMITTAL_DATE: formatDateOrTBD(projectDetails?.permitSubmittalDate),
GREEN_LIGHT_DATE: formatDateOrTBD(projectDetails?.greenLightDate),
PRODUCTION_START_DATE: formatDateOrTBD(projectDetails?.productionStartDate),
PRODUCTION_MIDPOINT_DATE: formatDateOrTBD(projectDetails?.productionMidpointDate),
PRODUCTION_COMPLETE_DATE: formatDateOrTBD(projectDetails?.productionCompleteDate),
DELIVERY_DATE: formatDateOrTBD(projectDetails?.estimatedDeliveryDate),
```

Add a helper function near the top of mapper.ts (or alongside existing `formatDate`):
```typescript
function formatDateOrTBD(dateStr: string | null | undefined): string {
  if (!dateStr) return 'TBD';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'TBD';
  }
}
```

#### 6E. Update Exhibit D content in database

Update Exhibit D's HTML content:

```html
<h2>EXHIBIT D — MILESTONES & SCHEDULE</h2>
<h3>D.1 Design / Pre-Production Milestones</h3>
<table class="exhibit-table">
  <tr><th>Milestone</th><th>Target Date</th></tr>
  <tr><td>Design Kickoff</td><td>{{DESIGN_KICKOFF_DATE}}</td></tr>
  <tr><td>Schematic Design Complete</td><td>{{SCHEMATIC_DESIGN_DATE}}</td></tr>
  <tr><td>Design Development Complete</td><td>{{DESIGN_DEVELOPMENT_DATE}}</td></tr>
  <tr><td>Permit Submittal</td><td>{{PERMIT_SUBMITTAL_DATE}}</td></tr>
  <tr><td>Green Light (Proceed to Production)</td><td>{{GREEN_LIGHT_DATE}}</td></tr>
</table>
<p>Design Duration: {{DESIGN_DURATION}} days</p>
<p>Permitting Duration: {{PERMITTING_DURATION}} days</p>

<h3>D.2 Production Milestones</h3>
<table class="exhibit-table">
  <tr><th>Milestone</th><th>Target Date</th></tr>
  <tr><td>Production Start</td><td>{{PRODUCTION_START_DATE}}</td></tr>
  <tr><td>Production Midpoint</td><td>{{PRODUCTION_MIDPOINT_DATE}}</td></tr>
  <tr><td>Production Complete</td><td>{{PRODUCTION_COMPLETE_DATE}}</td></tr>
  <tr><td>Delivery</td><td>{{DELIVERY_DATE}}</td></tr>
</table>
<p>Production Duration: {{PRODUCTION_DURATION}} days</p>

<h3>D.3 Schedule Dependencies</h3>
<p>Schedule adjustments occur for: permitting timelines, production slot changes, supply constraints, Client approvals, GC readiness, site readiness, and force majeure.</p>
```

#### 6F. Save/Load in wizard context

Same pattern as Phase 5F.

---

## MIGRATION PLAN

All schema changes should be in a SINGLE migration:

1. `home_models`: Add `shipping_set_price` column (integer, nullable, cents)
2. `project_details`: Add `foundation_ready_days`, `utility_stubbed_days`, `site_access_ready_days`, `permits_scheduled_days`, `crane_access_ready_days`, `design_kickoff_date`, `schematic_design_date`, `design_development_date`, `permit_submittal_date`, `production_midpoint_date`, `production_complete_date`

Note: No `financials` schema change needed — `financials.designFee` already exists and will be used directly.

After migration:
- Run UPDATE queries to populate `shipping_set_price` for real Dvele models (Fernie, Baffin, etc.) — see Phase 2F
- Update `scripts/seed_mvp.ts` to include `shippingSetPrice` for dev/seed models (Trinity, Salt Point, etc.)
- Update Home Models admin page to show the new field

---

## VERIFICATION CHECKLIST

### Phase 1 (Service Model Bug):
- [ ] Generate a CMOS project contract
- [ ] A.4 table shows "On-site Services (CMOS)" row with the onsite amount
- [ ] A.4 "Total Project Price" includes design + offsite + shipping + onsite
- [ ] A.5 payment schedule total matches A.4 total
- [ ] CRC projects still work correctly (no onsite row in A.4)

### Phase 2 (Shipping Breakout):
- [ ] Home models admin page shows shipping/set price field
- [ ] Existing models have shipping prices populated (seed models + real models if present)
- [ ] A.4 "Offsite Services (Delivery/Assembly)" shows actual shipping amount (not $0)
- [ ] A.4 "Total Project Price" = Design + Factory + Shipping + Onsite (CMOS) or Design + Factory + Shipping (CRC)
- [ ] A.5 payment schedule total matches A.4 total
- [ ] Wizard Pricing Dashboard Grand Total includes shipping
- [ ] `contractValue` in pricing engine includes shipping for both CRC and CMOS

### Phase 3 (Design Fee — User Input):
- [ ] New "Design Fee" card appears in Step 7 above Additional Site Work
- [ ] Can enter a dollar amount and save
- [ ] "Save & Recalculate" updates pricing dashboard to show the entered design fee
- [ ] Generated contract uses the user-entered design fee from `financials.designFee`
- [ ] Per-model `design_fee` is NOT summed — only `financials.designFee` is used
- [ ] If design fee is $0 / not entered, pricing shows $0 (with hint to enter it)

### Phase 4 (Site Work Default):
- [ ] New project shows $0 in Additional Site Work field
- [ ] Existing projects still load their saved value

### Phase 5 (Interface Deadlines):
- [ ] Five number inputs appear in Step 6 with correct defaults
- [ ] Values save with project
- [ ] Generated contract Exhibit C.4 shows entered values

### Phase 6 (Target Dates):
- [ ] Date pickers appear in Step 6 for D.1 and D.2 milestones
- [ ] Empty dates show "TBD" in contract
- [ ] Entered dates show formatted (e.g., "June 15, 2026")

---

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add `shippingSetPrice` to homeModels, add deadline + date fields to projectDetails (NO financials change needed) |
| `server/lib/mapper.ts` | **FIX** serviceModel bug on lines 910/915, add C.4 + D.1/D.2 variables, add `formatDateOrTBD` helper |
| `server/services/pricingEngine.ts` | Add `totalShipping` tracking + SQL column, REMOVE per-model design fee sum, use `financials.designFee` directly, update `projectBudget`/`contractValue` to include shipping |
| `server/lib/tableGenerators.ts` | Verify `PricingBreakdown` interface has `totalShipping` (should already) |
| `client/src/components/wizard/WizardContext.tsx` | Add new fields to interface, defaults, save/load |
| `client/src/components/wizard/steps/Step7Pricing.tsx` | Add Design Fee card, fix site work default |
| `client/src/components/wizard/steps/Step6DatesSchedule.tsx` | Add Interface Deadlines card, D.1/D.2 date cards |
| Home Models admin page | Add shipping/set price field |

**DB exhibit content updates** (via admin UI or seed script):
- Exhibit C: Add C.4 Interface Deadlines table
- Exhibit D: Update D.1 and D.2 with target date variables

---

## IMPLEMENTATION ORDER

1. **Phase 1** — Fix serviceModel bug in mapper (2-line fix, biggest impact)
2. **Phase 4** — Default site work to $0 (1-line fix)
3. Schema migration (all new columns at once)
4. **Phase 2** — Shipping breakout (pricing engine + seed data)
5. **Phase 3** — Design fee override (Step 7 UI + pricing engine)
6. **Phase 5** — Interface deadlines (Step 6 UI + mapper + exhibit)
7. **Phase 6** — Target dates (Step 6 UI + mapper + exhibit)
8. Verification against checklist
