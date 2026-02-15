# REPLIT AGENT PROMPT — C.2 RESPONSIBILITY MATRIX (Exhibit C)

## Context

The ONE Contract Manager generates contracts for Dvele, Inc. The Master Purchase Agreement (MASTER_EF) has an Exhibit C titled "GC / On-Site Scope & Responsibility Matrix" which allocates responsibility for on-site construction tasks between Dvele ("Company") and the Client/GC.

Currently, Exhibit C has:
- **C.1** — A `{{BLOCK_GC_INFO_SECTION}}` component that conditionally renders CRC or CMOS intro text (already working via `component_library` DB table)
- **C.2** — A static paragraph about site readiness (placeholder text)
- **C.3** — Nothing (interface deadlines from Prompt 14 may have been added as C.4)

The DOCX source (old Exhibit F) defines 5 responsibility categories with line items, each assigned to `{{VAR_ON_SITE_SELECTION_NAME}}`. But the real requirement is a **matrix UI in the wizard** where users can see all line items with checkboxes indicating who's responsible (Dvele vs Client/GC), with smart defaults based on CRC/CMOS selection.

---

## WHAT TO BUILD

### The Responsibility Matrix

5 categories, each containing 3–7 line items. For each line item, the user assigns responsibility to either "Company (Dvele)" or "Client / GC". The service model selection (Step 2) sets defaults:

- **CRC** (Client-Retained Contractor): Client/GC is responsible for most items
- **CMOS** (Company-Managed On-Site): Company is responsible for most items

Users can override individual items regardless of the default preset.

### Categories and Line Items

```
CATEGORY 1: Site Preparation & Readiness
  - Clearing, grading, excavation, soil preparation
  - Foundation work (footings, slab, or crawlspace)
  - Underground utilities (water, sewer, electric, gas)
  - Site access and staging areas for delivery
  - Zoning, building code, and permit compliance
  - Temporary site facilities (fencing, sanitation, security)

CATEGORY 2: Delivery Coordination
  - Scheduling delivery appointments per Manufacturer windows
  - Safe/clear access routes for delivery trucks
  - Crane/heavy equipment for unloading and setting
  - Traffic control, street closures, neighbor notifications
  - On-site personnel and equipment during delivery

CATEGORY 3: Module Installation
  - Setting and securing modules onto foundation
  - MEP connections between modules and site utilities
  - Sealing, weatherproofing, and site connections
  - Inspections, punch list, and warranty walk-throughs
  - Finish carpentry and site-specific work

CATEGORY 4: Inspections & Approvals
  - Building department inspections (foundation, framing, MEP, final)
  - Manufacturer/third-party quality control inspections
  - Utility connection certification and environmental compliance

CATEGORY 5: Site Maintenance & Cleanup
  - Construction debris and packaging removal
  - Site restoration and landscaping
  - Remediation of delivery/installation damage
```

### Default Assignments

| Line Item | CRC Default | CMOS Default |
|-----------|-------------|--------------|
| All Category 1 items | Client/GC | Company |
| All Category 2 items | Client/GC | Company |
| All Category 3 items | Client/GC | Company |
| Category 3: "Inspections, punch list..." | Company | Company |
| All Category 4 items | Client/GC | Company |
| Category 4: "Manufacturer/third-party QC..." | Company | Company |
| All Category 5 items | Client/GC | Company |

Note: A few items default to "Company" even under CRC because Dvele always retains certain quality control responsibilities.

---

## IMPLEMENTATION

### Phase 1: Data Model

#### 1A. Add responsibility matrix JSON field to `projectDetails` table

In `shared/schema.ts`, add to the `projectDetails` table:

```typescript
responsibilityMatrix: text("responsibility_matrix"), // JSON string of responsibility assignments
```

The JSON structure stored in this field:

```typescript
interface ResponsibilityItem {
  id: string;           // e.g., "site_prep_clearing"
  category: string;     // e.g., "Site Preparation & Readiness"
  label: string;        // e.g., "Clearing, grading, excavation, soil preparation"
  assignedTo: 'company' | 'client_gc';  // who is responsible
}

// Stored as JSON.stringify(ResponsibilityItem[])
```

#### 1B. Add to ProjectData interface in WizardContext

In `client/src/components/wizard/WizardContext.tsx`, add to `ProjectData`:

```typescript
responsibilityMatrix: ResponsibilityItem[];
```

Add the type definition at the top of the file:

```typescript
export interface ResponsibilityItem {
  id: string;
  category: string;
  label: string;
  assignedTo: 'company' | 'client_gc';
}
```

Add default in `initialProjectData`:
```typescript
responsibilityMatrix: [],
```

#### 1C. Define the default matrix data

Create a new file `client/src/components/wizard/data/responsibilityDefaults.ts`:

```typescript
import { ResponsibilityItem } from '../WizardContext';

export interface ResponsibilityCategory {
  name: string;
  items: { id: string; label: string; crcDefault: 'company' | 'client_gc'; cmosDefault: 'company' | 'client_gc' }[];
}

export const RESPONSIBILITY_CATEGORIES: ResponsibilityCategory[] = [
  {
    name: 'Site Preparation & Readiness',
    items: [
      { id: 'site_prep_clearing', label: 'Clearing, grading, excavation, and soil preparation', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'site_prep_foundation', label: 'Foundation work (footings, slab, or crawlspace)', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'site_prep_utilities', label: 'Underground utilities (water, sewer, electric, gas)', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'site_prep_access', label: 'Site access and staging areas for delivery', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'site_prep_compliance', label: 'Zoning, building code, and permit compliance', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'site_prep_temp', label: 'Temporary site facilities (fencing, sanitation, security)', crcDefault: 'client_gc', cmosDefault: 'company' },
    ],
  },
  {
    name: 'Delivery Coordination',
    items: [
      { id: 'delivery_scheduling', label: 'Scheduling delivery appointments per Manufacturer windows', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'delivery_access', label: 'Safe and clear access routes for delivery trucks', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'delivery_crane', label: 'Crane/heavy equipment for unloading and setting modules', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'delivery_traffic', label: 'Traffic control, street closures, neighbor notifications', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'delivery_personnel', label: 'On-site personnel and equipment during delivery', crcDefault: 'client_gc', cmosDefault: 'company' },
    ],
  },
  {
    name: 'Module Installation',
    items: [
      { id: 'install_setting', label: 'Setting and securing modules onto foundation', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'install_mep', label: 'MEP connections between modules and site utilities', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'install_sealing', label: 'Sealing, weatherproofing, and site connections', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'install_inspections', label: 'Coordination with manufacturer for inspections and punch list', crcDefault: 'company', cmosDefault: 'company' },
      { id: 'install_finish', label: 'Finish carpentry and site-specific work', crcDefault: 'client_gc', cmosDefault: 'company' },
    ],
  },
  {
    name: 'Inspections & Approvals',
    items: [
      { id: 'inspect_building', label: 'Building department inspections (foundation, framing, MEP, final)', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'inspect_manufacturer', label: 'Manufacturer/third-party quality control inspections', crcDefault: 'company', cmosDefault: 'company' },
      { id: 'inspect_utility', label: 'Utility connection certification and environmental compliance', crcDefault: 'client_gc', cmosDefault: 'company' },
    ],
  },
  {
    name: 'Site Maintenance & Cleanup',
    items: [
      { id: 'cleanup_debris', label: 'Construction debris and packaging removal', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'cleanup_restoration', label: 'Site restoration and landscaping', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'cleanup_remediation', label: 'Remediation of delivery/installation damage', crcDefault: 'client_gc', cmosDefault: 'company' },
    ],
  },
];

/**
 * Generate default responsibility matrix based on service model
 */
export function getDefaultMatrix(serviceModel: 'CRC' | 'CMOS'): ResponsibilityItem[] {
  const items: ResponsibilityItem[] = [];
  for (const category of RESPONSIBILITY_CATEGORIES) {
    for (const item of category.items) {
      items.push({
        id: item.id,
        category: category.name,
        label: item.label,
        assignedTo: serviceModel === 'CRC' ? item.crcDefault : item.cmosDefault,
      });
    }
  }
  return items;
}
```

### Phase 2: Wizard UI — New Step or Section in Step 8

The responsibility matrix should be its own card/section. It fits naturally in **Step 8 (Schedule & Warranty)** since that step handles completion-related configuration, OR it could be a section within **Step 5 (Site & Home)** since it's site-related. Best option: add it to **Step 8** as a new card after the warranty section, since the user has already selected CRC/CMOS in Step 2 and configured the site in Step 5.

#### 2A. Create the ResponsibilityMatrix component

Create `client/src/components/wizard/ResponsibilityMatrix.tsx`:

This component renders:
1. A header explaining the matrix with the current service model shown as a badge
2. A "Reset to Defaults" button that resets all items to the CRC/CMOS preset
3. For each category:
   - Category name as a collapsible section header
   - A table/grid with columns: Line Item | Company (Dvele) | Client/GC
   - Each row has the label and two radio buttons (or a toggle) for assignment
   - Items that differ from the default should be visually highlighted (e.g., amber/yellow background)

```tsx
import { useWizard, ResponsibilityItem } from '../WizardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  RESPONSIBILITY_CATEGORIES, 
  getDefaultMatrix 
} from '../data/responsibilityDefaults';
import { RotateCcw, ClipboardCheck } from 'lucide-react';

export const ResponsibilityMatrix: React.FC = () => {
  const { wizardState, updateProjectData } = useWizard();
  const { projectData } = wizardState;
  const serviceModel = projectData.serviceModel;
  
  // Initialize matrix if empty
  const matrix = projectData.responsibilityMatrix.length > 0
    ? projectData.responsibilityMatrix
    : getDefaultMatrix(serviceModel);
  
  // If matrix was empty, save the defaults
  if (projectData.responsibilityMatrix.length === 0) {
    updateProjectData({ responsibilityMatrix: matrix });
  }
  
  const handleToggle = (itemId: string, assignTo: 'company' | 'client_gc') => {
    const updated = matrix.map(item =>
      item.id === itemId ? { ...item, assignedTo: assignTo } : item
    );
    updateProjectData({ responsibilityMatrix: updated });
  };
  
  const handleResetDefaults = () => {
    updateProjectData({ responsibilityMatrix: getDefaultMatrix(serviceModel) });
  };
  
  // Check if any items differ from defaults
  const defaults = getDefaultMatrix(serviceModel);
  const hasOverrides = matrix.some(item => {
    const defaultItem = defaults.find(d => d.id === item.id);
    return defaultItem && defaultItem.assignedTo !== item.assignedTo;
  });
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Responsibility Matrix (Exhibit C.2)
            </CardTitle>
            <CardDescription>
              Assign responsibility for each on-site task. Defaults are based on your
              {' '}<Badge variant="outline">{serviceModel}</Badge>{' '}service model selection.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetDefaults}
            className="gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to {serviceModel} Defaults
          </Button>
        </div>
        {hasOverrides && (
          <p className="text-xs text-amber-600 mt-1">
            Some items have been manually overridden from the {serviceModel} defaults.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {RESPONSIBILITY_CATEGORIES.map(category => {
          const categoryItems = matrix.filter(item => item.category === category.name);
          
          return (
            <div key={category.name} className="space-y-2">
              <h4 className="font-semibold text-sm border-b pb-1">{category.name}</h4>
              <div className="space-y-1">
                {categoryItems.map(item => {
                  const defaultItem = defaults.find(d => d.id === item.id);
                  const isOverridden = defaultItem && defaultItem.assignedTo !== item.assignedTo;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center py-1.5 px-2 rounded text-sm
                        ${isOverridden ? 'bg-amber-50 border border-amber-200' : 'hover:bg-muted/50'}`}
                    >
                      <span className={isOverridden ? 'text-amber-900' : ''}>
                        {item.label}
                      </span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={item.assignedTo === 'company'}
                          onCheckedChange={() => handleToggle(item.id, 'company')}
                        />
                        <span className="text-xs text-muted-foreground">Dvele</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={item.assignedTo === 'client_gc'}
                          onCheckedChange={() => handleToggle(item.id, 'client_gc')}
                        />
                        <span className="text-xs text-muted-foreground">Client/GC</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
```

**Important UI behavior:** The two checkboxes per row should act as radio buttons (mutually exclusive). When one is checked, the other unchecks. The `handleToggle` function already handles this by setting `assignedTo` directly. But if using shadcn `Checkbox`, wrap the behavior so checking "Dvele" unchecks "Client/GC" and vice versa.

#### 2B. Add to Step 8

In `client/src/components/wizard/steps/Step8ScheduleWarranty.tsx`, import and render the matrix component:

```tsx
import { ResponsibilityMatrix } from '../ResponsibilityMatrix';
```

Add `<ResponsibilityMatrix />` as a new card section in Step 8. Place it AFTER the warranty section.

#### 2C. Auto-initialize when service model changes

In `WizardContext.tsx`, when the service model changes in Step 2, auto-reset the responsibility matrix to the new defaults. Find where `serviceModel` is updated (likely in the `updateProjectData` handler or a `useEffect`):

```typescript
// When service model changes, reset responsibility matrix to new defaults
if (updates.serviceModel && updates.serviceModel !== projectData.serviceModel) {
  updates.responsibilityMatrix = getDefaultMatrix(updates.serviceModel);
}
```

This ensures switching from CRC to CMOS (or vice versa) in Step 2 resets the matrix. Add a confirmation dialog if the user has manual overrides:

```typescript
// Optional: warn if overriding custom changes
if (projectData.responsibilityMatrix.length > 0) {
  const defaults = getDefaultMatrix(projectData.serviceModel);
  const hasCustomizations = projectData.responsibilityMatrix.some(item => {
    const d = defaults.find(def => def.id === item.id);
    return d && d.assignedTo !== item.assignedTo;
  });
  if (hasCustomizations) {
    // Show confirmation or just reset silently — your choice
  }
}
```

### Phase 3: Mapper & Contract Rendering

#### 3A. Add mapper variable for the responsibility matrix table

In `server/lib/mapper.ts`, add a new function and variable:

```typescript
import { RESPONSIBILITY_CATEGORIES } from '../../client/src/components/wizard/data/responsibilityDefaults';
```

Wait — the mapper runs server-side and can't import from client. Instead, define the category structure inline in the mapper or in a shared file. Best approach: move the `RESPONSIBILITY_CATEGORIES` data to a **shared** location.

**Option A (recommended):** Create `shared/responsibilityMatrix.ts` with the category definitions and default generator. Import from both client wizard and server mapper.

**Option B:** Just parse the JSON from the database in the mapper and generate the table HTML.

Go with **Option B** — simpler, no shared import complexity. The mapper reads `projectDetails.responsibilityMatrix` (a JSON string) and generates an HTML table.

In `server/lib/mapper.ts`, add:

```typescript
function generateResponsibilityMatrixHtml(matrixJson: string | null, serviceModel: string): string {
  if (!matrixJson) return '<p>Responsibility matrix not configured.</p>';
  
  let items: { id: string; category: string; label: string; assignedTo: string }[];
  try {
    items = JSON.parse(matrixJson);
  } catch {
    return '<p>Responsibility matrix data invalid.</p>';
  }
  
  if (items.length === 0) return '<p>Responsibility matrix not configured.</p>';
  
  // Group by category
  const categories = new Map<string, typeof items>();
  for (const item of items) {
    if (!categories.has(item.category)) {
      categories.set(item.category, []);
    }
    categories.get(item.category)!.push(item);
  }
  
  let html = '';
  
  for (const [categoryName, categoryItems] of categories) {
    html += `<h4 style="margin-top: 16px; margin-bottom: 8px; font-weight: bold;">${categoryName}</h4>`;
    html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">`;
    html += `<thead><tr style="background-color: #3b82f6; color: white;">`;
    html += `<th style="text-align: left; padding: 6px 10px; border: 1px solid #ddd;">Task</th>`;
    html += `<th style="text-align: center; padding: 6px 10px; border: 1px solid #ddd; width: 100px;">Company</th>`;
    html += `<th style="text-align: center; padding: 6px 10px; border: 1px solid #ddd; width: 100px;">Client/GC</th>`;
    html += `</tr></thead><tbody>`;
    
    for (const item of categoryItems) {
      const companyCheck = item.assignedTo === 'company' ? '✓' : '';
      const clientCheck = item.assignedTo === 'client_gc' ? '✓' : '';
      html += `<tr>`;
      html += `<td style="padding: 6px 10px; border: 1px solid #ddd;">${item.label}</td>`;
      html += `<td style="text-align: center; padding: 6px 10px; border: 1px solid #ddd; font-weight: bold;">${companyCheck}</td>`;
      html += `<td style="text-align: center; padding: 6px 10px; border: 1px solid #ddd; font-weight: bold;">${clientCheck}</td>`;
      html += `</tr>`;
    }
    
    html += `</tbody></table>`;
  }
  
  return html;
}
```

Or better yet, use the existing `buildStyledTable()` from `tableStyles.ts` for consistent formatting:

```typescript
import { buildStyledTable } from './tableStyles';

function generateResponsibilityMatrixHtml(matrixJson: string | null): string {
  if (!matrixJson) return '<p>Responsibility matrix not configured.</p>';
  
  let items: { id: string; category: string; label: string; assignedTo: string }[];
  try {
    items = JSON.parse(matrixJson);
  } catch {
    return '<p>Responsibility matrix data invalid.</p>';
  }
  
  if (items.length === 0) return '<p>Responsibility matrix not configured.</p>';
  
  // Group by category
  const categories = new Map<string, typeof items>();
  for (const item of items) {
    if (!categories.has(item.category)) {
      categories.set(item.category, []);
    }
    categories.get(item.category)!.push(item);
  }
  
  let html = '';
  
  for (const [categoryName, categoryItems] of categories) {
    html += `<h4 style="margin-top: 16px; margin-bottom: 8px; font-weight: bold;">${categoryName}</h4>`;
    
    const rows = categoryItems.map(item => ({
      cells: [
        item.label,
        item.assignedTo === 'company' ? '✓' : '',
        item.assignedTo === 'client_gc' ? '✓' : '',
      ],
    }));
    
    html += buildStyledTable({
      columns: [
        { header: 'Task / Responsibility', align: 'left' as const },
        { header: 'Company (Dvele)', align: 'center' as const },
        { header: 'Client / GC', align: 'center' as const },
      ],
      rows,
    });
  }
  
  return html;
}
```

#### 3B. Add the variable to the mapper output

In the exhibit variable section of `mapProjectToVariables()` (or wherever exhibit table variables are set), add:

```typescript
RESPONSIBILITY_MATRIX_TABLE: generateResponsibilityMatrixHtml(
  projectDetails?.responsibilityMatrix || null
),
```

#### 3C. Update Exhibit C content

Update the Exhibit C content in the database (via admin UI or the ingest script) to include the matrix table tag:

Replace the current C.2 section:
```html
<h3>C.2 Site Readiness Requirements</h3>
<p>Client/GC must provide written confirmation that foundation meets tolerances, utility stubs are placed, access routes are ready, permits are scheduled, and site is safe and secured.</p>
```

With:
```html
<h3>C.2 Responsibility Matrix</h3>
<p>The following matrix allocates responsibility for on-site tasks between Company and Client/GC. Items marked with ✓ indicate the responsible party.</p>
{{RESPONSIBILITY_MATRIX_TABLE}}

<h3>C.3 Site Readiness Requirements</h3>
<p>Client/GC must provide written confirmation that foundation meets tolerances, utility stubs are placed, access routes are ready, permits are scheduled, and site is safe and secured.</p>
```

This inserts C.2 as the matrix, bumps the old C.2 down to C.3, and keeps the existing C.4 Interface Deadlines in place.

### Phase 4: Save/Load

#### 4A. Save the matrix to the database

In `WizardContext.tsx`, in the `saveDraft()` function, include `responsibilityMatrix` when saving to project details. It should be serialized as a JSON string:

```typescript
responsibilityMatrix: JSON.stringify(projectData.responsibilityMatrix),
```

Search for where other `projectDetails` fields are saved (like `foundationReadyDays`, `designKickoffDate`) and add `responsibilityMatrix` alongside them.

#### 4B. Load the matrix from the database

In the `loadDraft()` function, parse the JSON string back:

```typescript
responsibilityMatrix: loadedData.responsibilityMatrix 
  ? JSON.parse(loadedData.responsibilityMatrix) 
  : [],
```

If the matrix is empty on load and the project has a service model, auto-populate with defaults.

---

## FILES TO CREATE

| File | Purpose |
|------|---------|
| `client/src/components/wizard/data/responsibilityDefaults.ts` | Category/item definitions, default generator function |
| `client/src/components/wizard/ResponsibilityMatrix.tsx` | Matrix UI component with checkboxes |

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add `responsibilityMatrix` text field to `projectDetails` |
| `client/src/components/wizard/WizardContext.tsx` | Add `ResponsibilityItem` interface, `responsibilityMatrix` to ProjectData, save/load, auto-reset on service model change |
| `client/src/components/wizard/steps/Step8ScheduleWarranty.tsx` | Import and render `<ResponsibilityMatrix />` |
| `server/lib/mapper.ts` | Add `generateResponsibilityMatrixHtml()` function, add `RESPONSIBILITY_MATRIX_TABLE` variable |
| Exhibit C content in DB | Add `{{RESPONSIBILITY_MATRIX_TABLE}}` tag, renumber C.2→C.3 |

## SCHEMA MIGRATION

Single addition:
```sql
ALTER TABLE project_details ADD COLUMN responsibility_matrix TEXT;
```

---

## VERIFICATION CHECKLIST

- [ ] New "Responsibility Matrix" card appears in Step 8
- [ ] CRC selection shows Client/GC checked for most items
- [ ] CMOS selection shows Company checked for most items
- [ ] Quality control items (manufacturer inspections, punch list coordination) default to Company for both CRC and CMOS
- [ ] Toggling a checkbox switches assignment (mutually exclusive per row)
- [ ] Overridden items are visually highlighted (amber/yellow)
- [ ] "Reset to Defaults" button restores all items to CRC or CMOS preset
- [ ] Changing service model in Step 2 resets the matrix
- [ ] Matrix saves with project and reloads correctly
- [ ] Generated contract Exhibit C.2 shows the matrix table with ✓ marks in correct columns
- [ ] Table uses consistent styling (blue headers from `buildStyledTable`)
- [ ] Existing C.2 content moved to C.3, C.4 Interface Deadlines unchanged
