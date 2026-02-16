# REPLIT AGENT PROMPT — VARIABLE CRUD EDITOR (Admin)

## Context

The ONE Contract Manager uses `{{VARIABLE_NAME}}` tags in clause and exhibit HTML content. At contract generation time, `server/lib/mapper.ts` builds a flat key-value map (`mapProjectToVariables()`) that replaces these tags with project data.

### Current State — Three Disconnected Systems

There are currently THREE separate systems dealing with variables, and none of them talk to each other:

**1. `mapper.ts` — The Source of Truth (275 variables)**
- `VARIABLE_CATEGORIES` object lists ~199 variable names grouped by category (project, client, pricing, etc.)
- `mapProjectToVariables()` actually assigns ~275 variables (76 more than registered in VARIABLE_CATEGORIES)
- `ALL_VARIABLES` / `SUPPORTED_VARIABLES` exports the flat list
- This is what actually runs at generation time — the only system that matters

**2. `contract_variables` DB table + `contract-variables.ts` route**
- Has `variable_name`, `display_name`, `category`, `data_type`, `default_value`, `is_required`, `description`
- Used by the `system.ts` enriched API endpoint which cross-references clause usage
- May or may not be populated — disconnected from mapper.ts

**3. `variable_mappings` DB table + `variable-mappings.ts` route**
- Has `variable_name`, `source_path`, `description`
- Used by the current admin Variables page (`admin/variables.tsx`)
- Completely disconnected from both mapper.ts and contract_variables

**4. Admin Variables Page (`client/src/pages/admin/variables.tsx` — 353 lines)**
- Simple table of variable_name + source_path + description
- Uses `/api/variable-mappings` (the wrong/disconnected table)
- No search, no category filtering, no clause usage display, no validation
- Dialog-based CRUD in a cramped modal

### What Actually Works

The `system.ts` route at `GET /variable-mappings` (lines 131-248) has the BEST logic:
- Queries `contract_variables` table
- Scans ALL clauses for `{{VAR}}` patterns in `body_html`
- Cross-references to produce enriched results with `clauseUsage` and `clauseCount`
- Identifies **unregistered variables** (used in clauses but not in the registry)
- Returns search filtering and stats

But this endpoint does NOT scan exhibits or component_library content.

### The Goal

Rebuild the admin Variables page into a proper **Variable Registry** that:
1. Shows ALL variables — from mapper.ts categories, from DB, and discovered in clause/exhibit content
2. Shows where each variable is used (which clauses, which exhibits, which components)
3. Allows CRUD operations on the `contract_variables` table (category, display name, data type, required flag, description)
4. Highlights orphaned variables (in registry but not used anywhere) and unregistered variables (used in content but not in registry)
5. Provides search, category filtering, and usage statistics

---

## IMPLEMENTATION

### Phase 1: Consolidate the Backend API

#### 1A. Enhance the `system.ts` variable-mappings endpoint

Modify `GET /variable-mappings` in `server/routes/system.ts` (around line 131) to ALSO scan exhibits and component_library for variable usage.

Currently it only scans `clauses.body_html`. Add:

```typescript
// EXISTING: Scan clauses for variable usage
const clauseUsageQuery = `
  SELECT id, slug, header_text, body_html, contract_types, level
  FROM clauses
  WHERE body_html LIKE '%{{%'
`;

// ADD: Scan exhibits for variable usage
const exhibitUsageQuery = `
  SELECT id, letter, title, content
  FROM exhibits
  WHERE content LIKE '%{{%'
`;
const exhibitsResult = await pool.query(exhibitUsageQuery);
const exhibitsWithVariables = exhibitsResult.rows;

// ADD: Scan component_library for variable usage
const componentUsageQuery = `
  SELECT id, tag_name, content, description, service_model
  FROM component_library
  WHERE content LIKE '%{{%'
`;
const componentsResult = await pool.query(componentUsageQuery);
const componentsWithVariables = componentsResult.rows;
```

Build three separate usage maps:

```typescript
// variableToClausesMap — already exists (keep as-is)

// ADD: variableToExhibitsMap
const variableToExhibitsMap: Record<string, any[]> = {};
for (const exhibit of exhibitsWithVariables) {
  const variablePattern = /\{\{([A-Z0-9_]+)\}\}/gi;
  let match;
  const content = exhibit.content || '';
  while ((match = variablePattern.exec(content)) !== null) {
    const varName = match[1];
    if (!variableToExhibitsMap[varName]) {
      variableToExhibitsMap[varName] = [];
    }
    if (!variableToExhibitsMap[varName].some((e: any) => e.id === exhibit.id)) {
      variableToExhibitsMap[varName].push({
        id: exhibit.id,
        letter: exhibit.letter,
        title: exhibit.title,
      });
    }
  }
}

// ADD: variableToComponentsMap
const variableToComponentsMap: Record<string, any[]> = {};
for (const comp of componentsWithVariables) {
  const variablePattern = /\{\{([A-Z0-9_]+)\}\}/gi;
  let match;
  const content = comp.content || '';
  while ((match = variablePattern.exec(content)) !== null) {
    const varName = match[1];
    if (!variableToComponentsMap[varName]) {
      variableToComponentsMap[varName] = [];
    }
    if (!variableToComponentsMap[varName].some((c: any) => c.id === comp.id)) {
      variableToComponentsMap[varName].push({
        id: comp.id,
        tagName: comp.tag_name,
        description: comp.description,
        serviceModel: comp.service_model,
      });
    }
  }
}
```

Update the enriched variables output to include exhibit and component usage:

```typescript
const enrichedVariables = variables.map((v: any) => ({
  ...existingFields,
  clauseUsage: variableToClausesMap[v.variable_name] || [],
  clauseCount: (variableToClausesMap[v.variable_name] || []).length,
  exhibitUsage: variableToExhibitsMap[v.variable_name] || [],
  exhibitCount: (variableToExhibitsMap[v.variable_name] || []).length,
  componentUsage: variableToComponentsMap[v.variable_name] || [],
  componentCount: (variableToComponentsMap[v.variable_name] || []).length,
  totalUsageCount: (variableToClausesMap[v.variable_name] || []).length
    + (variableToExhibitsMap[v.variable_name] || []).length
    + (variableToComponentsMap[v.variable_name] || []).length,
  isRegistered: true,
}));
```

Do the same for the unregistered variables — also check exhibits and components for unregistered vars:

```typescript
// Combine all discovered variable names from clauses + exhibits + components
const allDiscoveredVarNames = new Set([
  ...Object.keys(variableToClausesMap),
  ...Object.keys(variableToExhibitsMap),
  ...Object.keys(variableToComponentsMap),
]);

for (const varName of allDiscoveredVarNames) {
  if (!registeredVarNames.has(varName)) {
    unregisteredVariables.push({
      id: null,
      variableName: varName,
      // ... same structure as existing
      clauseUsage: variableToClausesMap[varName] || [],
      clauseCount: (variableToClausesMap[varName] || []).length,
      exhibitUsage: variableToExhibitsMap[varName] || [],
      exhibitCount: (variableToExhibitsMap[varName] || []).length,
      componentUsage: variableToComponentsMap[varName] || [],
      componentCount: (variableToComponentsMap[varName] || []).length,
      totalUsageCount: (variableToClausesMap[varName] || []).length
        + (variableToExhibitsMap[varName] || []).length
        + (variableToComponentsMap[varName] || []).length,
      isRegistered: false,
    });
  }
}
```

#### 1B. Add mapper categories to the API response

Import `VARIABLE_CATEGORIES` from mapper.ts and include it in the response so the UI can show which variables exist in the mapper even if they're not in the DB registry:

```typescript
const { VARIABLE_CATEGORIES, ALL_VARIABLES } = await import("../lib/mapper");

// Add to response:
res.json({
  variables: enrichedVariables,
  unregisteredVariables: filteredUnregistered,
  mapperCategories: VARIABLE_CATEGORIES,
  mapperVariableCount: ALL_VARIABLES.length,
  stats: {
    totalRegistered: enrichedVariables.length,
    totalUnregistered: unregisteredVariables.length,
    totalInMapper: ALL_VARIABLES.length,
    usedInClauses: Object.keys(variableToClausesMap).length,
    usedInExhibits: Object.keys(variableToExhibitsMap).length,
    usedInComponents: Object.keys(variableToComponentsMap).length,
    erpMapped: enrichedVariables.filter((v: any) => v.erpSource).length,
    required: enrichedVariables.filter((v: any) => v.isRequired).length,
  }
});
```

#### 1C. Update stats to include "in mapper but not in content" (orphaned)

```typescript
// Variables that are in ALL_VARIABLES but NOT found in any clause/exhibit/component
const usedVarNames = allDiscoveredVarNames;
const orphanedMapperVars = ALL_VARIABLES.filter(v => !usedVarNames.has(v));
// Add to stats:
stats.orphanedInMapper = orphanedMapperVars.length;
```

### Phase 2: Rebuild the Admin Variables Page

Replace `client/src/pages/admin/variables.tsx` with a full-featured Variable Registry page.

#### 2A. Layout: Split Panel (like Clause Library and Exhibit Editor)

**Left Panel (~35% width):**
- Search input at top (filters by variable name, display name, category)
- Stats summary bar: "275 total | 22 unregistered | 8 orphaned"
- Category filter dropdown or tab bar
- Three filter sections via tabs or toggle:
  - **All Variables** — everything combined
  - **Unregistered** — used in content but not in DB registry (warning state)
  - **Orphaned** — in mapper/registry but not used in any content
- Scrollable list of variables, each showing:
  - Variable name in monospace (e.g., `CLIENT_LEGAL_NAME`)
  - Category badge (e.g., "client" in blue)
  - Usage count badge (e.g., "5 uses")
  - Status indicator: green = registered + used, yellow = unregistered, gray = orphaned
  - Click to select → loads in right panel

**Right Panel (~65% width):**

**View Mode (default on click):**
- Variable name as header
- Metadata: display name, category, data type, required flag, description
- **Usage Section** — three collapsible lists:
  - **Clauses (N):** List of clause slugs/names where this variable appears, with hierarchy level and contract type badges. Each item clickable to navigate to Clause Library.
  - **Exhibits (N):** List of exhibit letters/titles where this variable appears
  - **Components (N):** List of component tag names where this variable appears
- **Mapper Status:** Whether this variable is in `VARIABLE_CATEGORIES` and which category

**Edit Mode (click Edit button):**
- Form fields:
  - `variableName` — text input, monospace (e.g., `CLIENT_LEGAL_NAME`). If editing an existing variable, show warning that renaming won't update clause/exhibit content.
  - `displayName` — text input (e.g., "Client Legal Name")
  - `category` — select dropdown with options from `VARIABLE_CATEGORIES` keys: project, client, childLlc, site, home, specifications, dates, pricing, milestones, warranty, manufacturer, onsiteContractor, liquidatedDamages, schedule, legal, insurance, tables, conditional
  - `dataType` — select: text, number, date, currency, boolean
  - `isRequired` — checkbox
  - `description` — textarea
- Save / Cancel buttons
- For unregistered variables: show a "Register" button that creates a `contract_variables` DB entry

#### 2B. Use the correct API endpoint

The page should call `GET /api/variable-mappings` from `system.ts` (the enriched endpoint), NOT from `variable-mappings.ts`.

Since both routes are mounted at the same path (`/variable-mappings`), and system.ts is mounted first (line 23 in routes/index.ts vs line 34 for variableMappingsRouter), the system.ts handler should take priority. **Verify this** — if there's a conflict, rename one of them.

If there IS a conflict, rename the system.ts endpoints to:
- `GET /api/system/variables` — enriched list with usage scanning
- `POST /api/system/variables` — create/update in contract_variables
- `PATCH /api/system/variables/:id` — update
- `DELETE /api/system/variables/:id` — delete

And update the admin page to use these paths.

#### 2C. Key UI Components

**VariableListItem component:**
```tsx
// Each item in the left sidebar
<div className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-muted/50">
  <div>
    <span className="font-mono text-sm">{variable.variableName}</span>
    <div className="flex gap-1 mt-0.5">
      {variable.category && <Badge variant="outline" className="text-xs">{variable.category}</Badge>}
      <Badge variant="secondary" className="text-xs">{variable.totalUsageCount} uses</Badge>
    </div>
  </div>
  <StatusDot status={variable.isRegistered ? (variable.totalUsageCount > 0 ? 'active' : 'orphaned') : 'unregistered'} />
</div>
```

**Usage list with clickable clause links:**
```tsx
// In the right panel detail view
<h4>Clauses ({variable.clauseCount})</h4>
{variable.clauseUsage.map(clause => (
  <div key={clause.id} className="flex items-center gap-2 py-1 text-sm">
    <span className="font-mono text-xs text-muted-foreground">{clause.clauseCode}</span>
    <span>{clause.name}</span>
    {clause.contractType?.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
  </div>
))}
```

### Phase 3: Auto-Sync from Mapper

Add a "Sync from Mapper" button that populates `contract_variables` from `VARIABLE_CATEGORIES` in mapper.ts. This is a one-time or periodic operation.

#### 3A. Add API endpoint

In `system.ts`, add:

```typescript
router.post("/system/sync-variables-from-mapper", async (req, res) => {
  try {
    const { VARIABLE_CATEGORIES } = await import("../lib/mapper");
    
    let created = 0;
    let skipped = 0;
    
    for (const [category, vars] of Object.entries(VARIABLE_CATEGORIES)) {
      for (const varName of vars as string[]) {
        // Check if already exists
        const existing = await pool.query(
          `SELECT id FROM contract_variables WHERE variable_name = $1 AND organization_id = $2`,
          [varName, req.organizationId]
        );
        
        if (existing.rows.length === 0) {
          // Infer data type from name
          let dataType = 'text';
          if (varName.endsWith('_WRITTEN') || varName.includes('PRICE') || varName.includes('FEE') || varName.includes('AMOUNT') || varName.includes('COST')) dataType = 'currency';
          else if (varName.endsWith('_DATE')) dataType = 'date';
          else if (varName.startsWith('IS_') || varName.startsWith('HAS_')) dataType = 'boolean';
          else if (varName.endsWith('_MONTHS') || varName.endsWith('_YEARS') || varName.endsWith('_DAYS') || varName.endsWith('_PERCENT') || varName.includes('COUNT') || varName.includes('UNITS')) dataType = 'number';
          else if (varName.endsWith('_TABLE')) dataType = 'text'; // HTML tables
          
          // Generate display name from variable name
          const displayName = varName
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/Llc/g, 'LLC')
            .replace(/Mep/g, 'MEP')
            .replace(/Gc/g, 'GC')
            .replace(/Sq Ft/g, 'Sq Ft');
          
          await pool.query(
            `INSERT INTO contract_variables (organization_id, variable_name, display_name, category, data_type)
             VALUES ($1, $2, $3, $4, $5)`,
            [req.organizationId, varName, displayName, category, dataType]
          );
          created++;
        } else {
          skipped++;
        }
      }
    }
    
    res.json({ created, skipped, total: created + skipped });
  } catch (error) {
    console.error("Failed to sync variables from mapper:", error);
    res.status(500).json({ error: "Failed to sync variables" });
  }
});
```

#### 3B. Add "Sync from Mapper" button in the UI

In the admin Variables page header:

```tsx
<Button variant="outline" onClick={handleSyncFromMapper}>
  <RefreshCw className="h-4 w-4 mr-2" />
  Sync from Mapper ({mapperVariableCount} vars)
</Button>
```

This calls `POST /api/system/sync-variables-from-mapper` and then refetches the variable list.

### Phase 4: Cleanup

#### 4A. Deprecate the `variable_mappings` table and `variable-mappings.ts` route

The `variable_mappings` table is redundant now that `contract_variables` has all the fields. The `source_path` concept from `variable_mappings` doesn't actually drive anything in the system — the mapper function handles all source mapping in code.

Don't delete the table/route yet, but:
- Remove `variableMappingsRouter` from `server/routes/index.ts` if the system.ts endpoints handle everything
- Or rename to avoid path conflicts

#### 4B. Resolve the route path conflict

Both `system.ts` and `variable-mappings.ts` register routes at `/variable-mappings`. Fix this:

Option A: Remove `variable-mappings.ts` import from `routes/index.ts` since `system.ts` handles the same paths with better logic.

Option B: Keep both but namespace them differently:
- `system.ts` → `/system/variable-registry` (the new enriched endpoint)
- `variable-mappings.ts` → `/variable-mappings` (legacy, can deprecate later)

**Recommended: Option A** — remove the `variable-mappings.ts` router from `index.ts`. The system.ts versions are strictly better.

---

## FILES TO CREATE

None — this is a rebuild of an existing page.

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `client/src/pages/admin/variables.tsx` | Complete rebuild: split-panel layout, search, category filter, usage display, edit form, sync button |
| `server/routes/system.ts` | Enhance `GET /variable-mappings` to scan exhibits + components, add mapper categories to response, add `POST /system/sync-variables-from-mapper` endpoint |
| `server/routes/index.ts` | Remove `variableMappingsRouter` import and `router.use(variableMappingsRouter)` to eliminate route conflict |

## FILES TO POTENTIALLY REMOVE

| File | Reason |
|------|--------|
| `server/routes/variable-mappings.ts` | Redundant — system.ts has better versions of all these endpoints |

---

## VERIFICATION CHECKLIST

- [ ] Admin Variables page loads with split-panel layout
- [ ] Left sidebar shows all variables with search filtering
- [ ] Category filter works (project, client, pricing, dates, etc.)
- [ ] "All / Unregistered / Orphaned" tabs filter correctly
- [ ] Clicking a variable shows detail in right panel with usage lists
- [ ] Clause usage shows which clauses use the variable, with slug and contract type
- [ ] Exhibit usage shows which exhibits use the variable, with letter and title
- [ ] Component usage shows which components use the variable, with tag name and service model
- [ ] Stats bar shows correct counts (total, unregistered, orphaned)
- [ ] Edit mode allows changing display name, category, data type, required, description
- [ ] Creating a new variable works
- [ ] Deleting a variable works (with confirmation)
- [ ] "Register" button on unregistered variables creates a DB entry
- [ ] "Sync from Mapper" button populates contract_variables from VARIABLE_CATEGORIES
- [ ] No route path conflicts between system.ts and variable-mappings.ts
- [ ] Variable names render in monospace font throughout
- [ ] Status indicators: green (registered + used), yellow (unregistered), gray (orphaned)
