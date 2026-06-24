# Template Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track an integer version counter on contract templates so users can see whether a generated contract used an outdated template, and regenerate it with the latest clauses in one click.

**Architecture:** `contract_templates.version` is a server-managed integer that increments on every Save in the template editor. At generation time `contracts.template_version` captures the template's current version. The frontend compares the two numbers to show stale/current badges and a Regenerate button. Regeneration replaces the contract's clause snapshot in-place (same contract ID, same DB row) and updates `template_version`.

**Tech Stack:** PostgreSQL + Drizzle ORM (schema), Express 5 (API), React 18 + TanStack Query (UI), Shadcn UI + Tailwind (components)

---

## Files

| File | Change |
|------|--------|
| `shared/schema.ts` | `contractTemplates.version`: text → integer; `contracts.templateVersion`: text → integer |
| `server/routes/contract-templates.ts` | Add `PATCH /:id/version` endpoint |
| `server/routes/contracts.ts` | Populate `templateVersion` at generation; add `POST /:id/regenerate`; add template JOIN to GET list and GET single |
| `client/src/pages/admin/template-editor.tsx` | Call version-bump endpoint at end of `handleSave` |
| `client/src/pages/contracts.tsx` | Add `templateVersion`/`currentTemplateVersion` to `ContractInfo`; render stale badge + Regenerate button |
| `client/src/pages/contract-detail.tsx` | Update `Contract` interface; render stale badge, amber banner, Regenerate button |

---

## Task 1: Migrate schema — version columns to integer

**Files:**
- Modify: `shared/schema.ts` (lines 122, 569)

The existing `contract_templates.version` column stores `"1.0"` as text. We must update existing rows to `"1"` before Drizzle can cast them to integer. `contracts.template_version` is always NULL so it migrates cleanly.

- [ ] **Step 1: Update existing text data**

Connect to the database and run:

```sql
UPDATE contract_templates SET version = '1' WHERE version IS NOT NULL;
```

- [ ] **Step 2: Update `shared/schema.ts`**

Change line 122 in `shared/schema.ts`:
```typescript
// Before
version: text("version").default("1.0"),

// After
version: integer("version").default(1),
```

Change line 569 in `shared/schema.ts`:
```typescript
// Before
templateVersion: text("template_version"),

// After
templateVersion: integer("template_version"),
```

- [ ] **Step 3: Push schema and type-check**

```bash
cd /Users/work/Documents/dev/contract-manager/ONE-Contract-Manager
npm run db:push
npm run check
```

Expected: `db:push` detects type change and applies it. `npm run check` outputs 0 new errors introduced by these changes (pre-existing errors in other files are acceptable).

- [ ] **Step 4: Commit**

```bash
git add shared/schema.ts
git commit -m "feat: change template version columns to integer"
```

---

## Task 2: Add PATCH /api/contract-templates/:id/version endpoint

**Files:**
- Modify: `server/routes/contract-templates.ts`

Add the endpoint immediately before the final `export default router` line (or at the end of the route definitions).

- [ ] **Step 1: Add the endpoint**

In `server/routes/contract-templates.ts`, before `export default router`, add:

```typescript
// Bump version counter — called by template editor Save
router.patch("/:id/version", requireAdmin, async (req, res) => {
  const templateId = parseInt(req.params.id);
  if (isNaN(templateId)) {
    return res.status(400).json({ error: "Invalid template id" });
  }

  const result = await pool.query(
    `UPDATE contract_templates
     SET version = version + 1, updated_at = now()
     WHERE id = $1 AND organization_id = $2
     RETURNING version`,
    [templateId, req.organizationId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Template not found" });
  }

  res.json({ version: result.rows[0].version });
});
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add server/routes/contract-templates.ts
git commit -m "feat: add PATCH /api/contract-templates/:id/version endpoint"
```

---

## Task 3: Wire handleSave to bump template version

**Files:**
- Modify: `client/src/pages/admin/template-editor.tsx` (around line 471)

After all reorder jobs succeed and before invalidating queries, call the new version-bump endpoint.

- [ ] **Step 1: Add version bump call in handleSave**

In `template-editor.tsx`, find the block starting at line 471:

```typescript
      await Promise.all(reorderJobs);

      // Step 4: Invalidate + reset draft
```

Replace it with:

```typescript
      await Promise.all(reorderJobs);

      // Step 4: Bump template version
      await apiRequest("PATCH", `/api/contract-templates/${id}/version`);

      // Step 5: Invalidate + reset draft
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 3: Manual smoke test**

1. Open the template editor for any template.
2. Make any change (add or remove a clause).
3. Click Save — toast "Template saved successfully" appears.
4. Open the browser network tab and confirm the PATCH `.../version` call returned `{ version: N }` where N > 1.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/template-editor.tsx
git commit -m "feat: bump template version on editor save"
```

---

## Task 4: Populate templateVersion at contract generation time

**Files:**
- Modify: `server/routes/contracts.ts` (around line 790)

`POST /api/contracts` currently inserts `template_version` as `contractData.templateVersion || null` which is always null. We need to fetch the template's current version and store it.

- [ ] **Step 1: Fetch template version before INSERT**

In `server/routes/contracts.ts`, find the block that starts around line 792:

```typescript
      // Fetch playlist from template_clauses
      const playlistResult = await client.query(
```

Add a template version fetch immediately before it:

```typescript
      // Fetch current template version for snapshot
      const templateVersionResult = await client.query(
        `SELECT version FROM contract_templates WHERE id = $1`,
        [templateId]
      );
      const templateVersionAtGeneration: number | null =
        templateVersionResult.rows[0]?.version ?? null;

      // Fetch playlist from template_clauses
      const playlistResult = await client.query(
```

- [ ] **Step 2: Use templateVersionAtGeneration in the INSERT**

Find the INSERT at line ~841:

```typescript
        `INSERT INTO contracts (project_id, contract_type, version, status, generated_at, generated_by, template_id, template_version, file_path, file_name, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          contractData.projectId,
          contractData.contractType,
          contractData.version || 1,
          contractData.status || 'Draft',
          contractData.generatedAt || new Date(),
          contractData.generatedBy || null,
          templateId,
          contractData.templateVersion || null,   // <-- this line
          contractData.filePath || null,
          contractData.fileName || null,
          contractData.notes || null
        ]
```

Change the `contractData.templateVersion || null` parameter to `templateVersionAtGeneration`:

```typescript
        `INSERT INTO contracts (project_id, contract_type, version, status, generated_at, generated_by, template_id, template_version, file_path, file_name, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          contractData.projectId,
          contractData.contractType,
          contractData.version || 1,
          contractData.status || 'Draft',
          contractData.generatedAt || new Date(),
          contractData.generatedBy || null,
          templateId,
          templateVersionAtGeneration,
          contractData.filePath || null,
          contractData.fileName || null,
          contractData.notes || null
        ]
```

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add server/routes/contracts.ts
git commit -m "feat: capture template version at contract generation time"
```

---

## Task 5: Add POST /api/contracts/:id/regenerate endpoint

**Files:**
- Modify: `server/routes/contracts.ts`

This endpoint re-snapshots the contract's clauses from the current template and updates `template_version`. The contract ID, project, and status are preserved.

- [ ] **Step 1: Add the endpoint**

In `server/routes/contracts.ts`, after the `router.patch("/contracts/:id", ...)` endpoint (around line 1027), add:

```typescript
router.post("/contracts/:id/regenerate", requireAuth, async (req, res) => {
  const contractId = parseInt(req.params.id);
  if (isNaN(contractId)) {
    return res.status(400).json({ error: "Invalid contract id" });
  }

  const client = await pool.connect();
  try {
    // 1. Fetch the contract to get templateId
    const contractResult = await client.query(
      `SELECT id, template_id, project_id, contract_type
       FROM contracts
       WHERE id = $1 AND organization_id = $2`,
      [contractId, req.organizationId]
    );
    if (contractResult.rowCount === 0) {
      return res.status(404).json({ error: "Contract not found" });
    }
    const contract = contractResult.rows[0];

    if (!contract.template_id) {
      return res.status(400).json({ error: "Contract has no linked template" });
    }

    // 2. Fetch the template's current version
    const templateResult = await client.query(
      `SELECT version FROM contract_templates
       WHERE id = $1 AND organization_id = $2`,
      [contract.template_id, req.organizationId]
    );
    if (templateResult.rowCount === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    const currentVersion: number = templateResult.rows[0].version;

    // 3. Fetch the template's current clause playlist
    const playlistResult = await client.query(
      `SELECT tc.clause_id, tc.order_index, c.header_text, c.body_html, c.level
       FROM template_clauses tc
       JOIN clauses c ON c.id = tc.clause_id
       WHERE tc.template_id = $1
       ORDER BY tc.order_index ASC`,
      [contract.template_id]
    );
    if (playlistResult.rowCount === 0) {
      return res.status(400).json({ error: "Template has no clauses" });
    }

    await client.query("BEGIN");

    // 4. Replace clause snapshot
    await client.query(
      `DELETE FROM contract_clauses WHERE contract_id = $1`,
      [contractId]
    );
    for (const row of playlistResult.rows) {
      await client.query(
        `INSERT INTO contract_clauses (contract_id, clause_id, header_text, body_html, level, "order")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [contractId, row.clause_id, row.header_text, row.body_html, row.level, row.order_index]
      );
    }

    // 5. Update contract metadata
    const updateResult = await client.query(
      `UPDATE contracts
       SET template_version = $1, generated_at = now()
       WHERE id = $2
       RETURNING *`,
      [currentVersion, contractId]
    );

    await client.query("COMMIT");

    res.json(updateResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to regenerate contract:", err);
    res.status(500).json({ error: "Failed to regenerate contract" });
  } finally {
    client.release();
  }
});
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add server/routes/contracts.ts
git commit -m "feat: add POST /api/contracts/:id/regenerate endpoint"
```

---

## Task 6: Return current template version from GET /api/contracts

**Files:**
- Modify: `server/routes/contracts.ts` (lines 631–772)

The list endpoint needs to include each contract's `templateVersion` (from `contracts`) and `currentTemplateVersion` (from `contract_templates`) so the client can compute the stale state without a second request.

- [ ] **Step 1: Add contractTemplates import**

At the top of `contracts.ts`, verify `contractTemplates` is imported from `../../shared/schema`. Find the existing import line (it should already import various tables). If `contractTemplates` is missing, add it:

```typescript
import {
  contracts,
  projects,
  contractTemplates,
  // ... other imports already present
} from "../../shared/schema";
```

- [ ] **Step 2: Add LEFT JOIN to the list query**

Find the Drizzle query at line ~633:

```typescript
    const allContracts = await db
      .select({
        id: contracts.id,
        projectId: contracts.projectId,
        contractType: contracts.contractType,
        version: contracts.version,
        status: contracts.status,
        generatedAt: contracts.generatedAt,
        generatedBy: contracts.generatedBy,
        templateVersion: contracts.templateVersion,
        fileName: contracts.fileName,
        notes: contracts.notes,
        projectName: projects.name,
        projectNumber: projects.projectNumber,
      })
      .from(contracts)
      .leftJoin(projects, eq(contracts.projectId, projects.id))
      .orderBy(contracts.generatedAt);
```

Replace with:

```typescript
    const allContracts = await db
      .select({
        id: contracts.id,
        projectId: contracts.projectId,
        contractType: contracts.contractType,
        version: contracts.version,
        status: contracts.status,
        generatedAt: contracts.generatedAt,
        generatedBy: contracts.generatedBy,
        templateId: contracts.templateId,
        templateVersion: contracts.templateVersion,
        fileName: contracts.fileName,
        notes: contracts.notes,
        projectName: projects.name,
        projectNumber: projects.projectNumber,
        currentTemplateVersion: contractTemplates.version,
      })
      .from(contracts)
      .leftJoin(projects, eq(contracts.projectId, projects.id))
      .leftJoin(contractTemplates, eq(contracts.templateId, contractTemplates.id))
      .orderBy(contracts.generatedAt);
```

- [ ] **Step 3: Update packageMap type and contractInfo builder**

Find the `packageMap` type definition at line ~686. Update the `contracts` array element type to include the new fields:

```typescript
    const packageMap = new Map<number, {
      packageId: number;
      projectId: number;
      projectName: string;
      projectNumber: string;
      status: string;
      contractValue: number;
      generatedAt: string;
      isDraft: boolean;
      contracts: Array<{
        id: number;
        contractType: string;
        fileName: string;
        status: string;
        generatedAt: string;
        templateVersion: number | null;
        currentTemplateVersion: number | null;
      }>;
    }>();
```

Find the `contractInfo` builder at line ~725:

```typescript
      const contractInfo = {
        id: c.id,
        contractType: c.contractType || '',
        fileName: c.fileName || '',
        status: normalizeStatus(c.status),
        generatedAt: c.generatedAt?.toISOString() || '',
      };
```

Replace with:

```typescript
      const contractInfo = {
        id: c.id,
        contractType: c.contractType || '',
        fileName: c.fileName || '',
        status: normalizeStatus(c.status),
        generatedAt: c.generatedAt?.toISOString() || '',
        templateVersion: c.templateVersion ?? null,
        currentTemplateVersion: c.currentTemplateVersion ?? null,
      };
```

- [ ] **Step 4: Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add server/routes/contracts.ts
git commit -m "feat: include template version data in GET /api/contracts"
```

---

## Task 7: Return current template version from GET /api/contracts/:id

**Files:**
- Modify: `server/routes/contracts.ts` (lines 898–928)

- [ ] **Step 1: Add LEFT JOIN to the single-contract query**

Find the query at line ~901:

```typescript
    const [contract] = await db
      .select({
        id: contracts.id,
        projectId: contracts.projectId,
        contractType: contracts.contractType,
        version: contracts.version,
        status: contracts.status,
        generatedAt: contracts.generatedAt,
        generatedBy: contracts.generatedBy,
        templateVersion: contracts.templateVersion,
        fileName: contracts.fileName,
        filePath: contracts.filePath,
        notes: contracts.notes,
        projectName: projects.name,
        projectNumber: projects.projectNumber,
      })
      .from(contracts)
      .leftJoin(projects, eq(contracts.projectId, projects.id))
      .where(eq(contracts.id, contractId));
```

Replace with:

```typescript
    const [contract] = await db
      .select({
        id: contracts.id,
        projectId: contracts.projectId,
        contractType: contracts.contractType,
        version: contracts.version,
        status: contracts.status,
        generatedAt: contracts.generatedAt,
        generatedBy: contracts.generatedBy,
        templateId: contracts.templateId,
        templateVersion: contracts.templateVersion,
        fileName: contracts.fileName,
        filePath: contracts.filePath,
        notes: contracts.notes,
        projectName: projects.name,
        projectNumber: projects.projectNumber,
        currentTemplateVersion: contractTemplates.version,
      })
      .from(contracts)
      .leftJoin(projects, eq(contracts.projectId, projects.id))
      .leftJoin(contractTemplates, eq(contracts.templateId, contractTemplates.id))
      .where(eq(contracts.id, contractId));
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add server/routes/contracts.ts
git commit -m "feat: include template version data in GET /api/contracts/:id"
```

---

## Task 8: Stale badge + Regenerate button on /contracts list

**Files:**
- Modify: `client/src/pages/contracts.tsx`

- [ ] **Step 1: Update ContractInfo interface**

Find the `ContractInfo` interface at line 45:

```typescript
interface ContractInfo {
  id: number;
  contractType: string;
  fileName: string;
  status: string;
  generatedAt: string;
}
```

Replace with:

```typescript
interface ContractInfo {
  id: number;
  contractType: string;
  fileName: string;
  status: string;
  generatedAt: string;
  templateVersion: number | null;
  currentTemplateVersion: number | null;
}
```

- [ ] **Step 2: Add RotateCcw to lucide imports**

Find the existing lucide import at line 30:

```typescript
import {
  FileCheck,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Package,
  Pencil,
  Download,
  Code,
  Trash2,
} from "lucide-react";
```

Replace with:

```typescript
import {
  FileCheck,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Package,
  Pencil,
  Download,
  Code,
  Trash2,
  RotateCcw,
} from "lucide-react";
```

- [ ] **Step 3: Add handleRegenerate function**

After the `handleDownloadPdf` function (around line 173), add:

```typescript
  const handleRegenerate = async (contractId: number) => {
    setGeneratingContract(contractId);
    try {
      await apiRequest("POST", `/api/contracts/${contractId}/regenerate`);
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract regenerated with latest template" });
    } catch {
      toast({
        title: "Regeneration failed",
        description: "Could not regenerate contract.",
        variant: "destructive",
      });
    } finally {
      setGeneratingContract(null);
    }
  };
```

- [ ] **Step 4: Add stale helper**

After `handleRegenerate`, add:

```typescript
  const isStale = (contract: ContractInfo): boolean =>
    contract.templateVersion !== null &&
    contract.currentTemplateVersion !== null &&
    contract.currentTemplateVersion > contract.templateVersion;
```

- [ ] **Step 5: Render stale badge and Regenerate button in the contract row**

Find the entire contract row block at line ~381 (from `<div key={contract.id}` through its closing `</div>`):

```tsx
                              <div
                                key={contract.id}
                                className="flex items-center justify-between gap-4 rounded-md bg-background px-3 py-2"
                                data-testid={`row-contract-${contract.id}`}>
                                <div className="flex min-w-0 items-center gap-3">
                                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                      {formatContractType(
                                        contract.contractType
                                      )}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {contract.fileName}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <StatusBadge
                                    status={contract.status}
                                    size="sm"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleHtmlPreview(
                                        pkg.projectId,
                                        contract.contractType,
                                        contract.id
                                      );
                                    }}
                                    disabled={
                                      generatingContract === contract.id
                                    }
                                    data-testid={`button-html-preview-${contract.id}`}
                                    title="View HTML">
                                    <Code className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadPdf(
                                        pkg.projectId,
                                        contract.contractType,
                                        contract.id,
                                        pkg.projectNumber
                                      );
                                    }}
                                    disabled={
                                      generatingContract === contract.id
                                    }
                                    data-testid={`button-download-${contract.id}`}
                                    title="Download PDF">
                                    <Download className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    data-testid={`button-edit-contract-${contract.id}`}>
                                    <Link
                                      href={`/contracts/${contract.id}/edit`}>
                                      Open
                                    </Link>
                                  </Button>
                                </div>
                              </div>
```

Replace with (stale badge added to name area, Regenerate button added before Open):

```tsx
                              <div
                                key={contract.id}
                                className="flex items-center justify-between gap-4 rounded-md bg-background px-3 py-2"
                                data-testid={`row-contract-${contract.id}`}>
                                <div className="flex min-w-0 items-center gap-3">
                                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium">
                                        {formatContractType(contract.contractType)}
                                      </p>
                                      {isStale(contract) && (
                                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                          Template v{contract.templateVersion} → v{contract.currentTemplateVersion}
                                        </span>
                                      )}
                                      {!isStale(contract) && contract.currentTemplateVersion !== null && (
                                        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                          Template v{contract.currentTemplateVersion}
                                        </span>
                                      )}
                                    </div>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {contract.fileName}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <StatusBadge
                                    status={contract.status}
                                    size="sm"
                                  />
                                  {isStale(contract) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRegenerate(contract.id);
                                      }}
                                      disabled={generatingContract === contract.id}
                                      data-testid={`button-regenerate-${contract.id}`}>
                                      <RotateCcw className="mr-1 h-3 w-3" />
                                      Regenerate
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleHtmlPreview(
                                        pkg.projectId,
                                        contract.contractType,
                                        contract.id
                                      );
                                    }}
                                    disabled={
                                      generatingContract === contract.id
                                    }
                                    data-testid={`button-html-preview-${contract.id}`}
                                    title="View HTML">
                                    <Code className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadPdf(
                                        pkg.projectId,
                                        contract.contractType,
                                        contract.id,
                                        pkg.projectNumber
                                      );
                                    }}
                                    disabled={
                                      generatingContract === contract.id
                                    }
                                    data-testid={`button-download-${contract.id}`}
                                    title="Download PDF">
                                    <Download className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    data-testid={`button-edit-contract-${contract.id}`}>
                                    <Link
                                      href={`/contracts/${contract.id}/edit`}>
                                      Open
                                    </Link>
                                  </Button>
                                </div>
                              </div>
```

- [ ] **Step 6: Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/contracts.tsx
git commit -m "feat: show stale badge and regenerate button on contracts list"
```

---

## Task 9: Stale badge, banner, and Regenerate button on /contracts/:id/edit

**Files:**
- Modify: `client/src/pages/contract-detail.tsx`

- [ ] **Step 1: Update Contract interface**

Find the `Contract` interface at line 166:

```typescript
interface Contract {
  id: number;
  projectId: number;
  contractType: string;
  version: number;
  status: string;
  generatedAt: string;
  generatedBy: string;
  templateVersion: string;
  fileName: string;
  filePath: string;
  notes: string;
  projectName?: string;
  projectNumber?: string;
}
```

Replace with:

```typescript
interface Contract {
  id: number;
  projectId: number;
  contractType: string;
  version: number;
  status: string;
  generatedAt: string;
  generatedBy: string;
  templateId: number | null;
  templateVersion: number | null;
  currentTemplateVersion: number | null;
  fileName: string;
  filePath: string;
  notes: string;
  projectName?: string;
  projectNumber?: string;
}
```

- [ ] **Step 2: Add RotateCcw to lucide imports**

Find the existing lucide import at line 21:

```typescript
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileCheck,
  Edit3,
  Code,
} from "lucide-react";
```

Replace with:

```typescript
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileCheck,
  Edit3,
  Code,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
```

- [ ] **Step 3: Add handleRegenerate and isStale**

In `contract-detail.tsx`, after the `updateStatusMutation` block (around line 327), add:

```typescript
  const isStale =
    contract.templateVersion !== null &&
    contract.currentTemplateVersion !== null &&
    contract.currentTemplateVersion > contract.templateVersion;

  const handleRegenerate = async () => {
    try {
      await apiRequest("POST", `/api/contracts/${contractId}/regenerate`);
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", contractId] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract regenerated with latest template" });
    } catch {
      toast({
        title: "Regeneration failed",
        description: "Could not regenerate contract.",
        variant: "destructive",
      });
    }
  };
```

Note: `isStale` must be declared after the `contract` loading guard (`if (contractLoading || !contract)`) so `contract` is guaranteed non-null. Place it inside the return block or after the guard at line ~484.

- [ ] **Step 4: Add stale badge and Regenerate button to the header**

Find the header action area at line ~510:

```tsx
        <div className="flex items-center gap-2">
          <Badge
            variant={getStatusBadgeVariant(contract.status)}
            data-testid="badge-status">
            {getStatusDisplayLabel(contract.status)}
          </Badge>
          <Button
            variant="outline"
            onClick={handleHtmlPreview}
```

Replace with:

```tsx
        <div className="flex items-center gap-2">
          <Badge
            variant={getStatusBadgeVariant(contract.status)}
            data-testid="badge-status">
            {getStatusDisplayLabel(contract.status)}
          </Badge>
          {isStale && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
              Template v{contract.templateVersion} → v{contract.currentTemplateVersion}
            </span>
          )}
          {!isStale && contract.currentTemplateVersion !== null && (
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
              Template v{contract.currentTemplateVersion}
            </span>
          )}
          {isStale && (
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              onClick={handleRegenerate}
              data-testid="button-regenerate">
              <RotateCcw className="mr-2 h-4 w-4" />
              Regenerate with latest template
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleHtmlPreview}
```

- [ ] **Step 5: Add amber banner below the header**

Find the closing `</div>` of the main header flex at line ~540 (just after the button group), then find the `<Card>` that follows (the "Contract Details" card at line ~542). Insert the banner between them:

```tsx
      {isStale && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p className="text-sm text-amber-800">
            This contract was generated with template{" "}
            <strong>v{contract.templateVersion}</strong>. The template has since
            been updated to{" "}
            <strong>v{contract.currentTemplateVersion}</strong>. Regenerating
            will apply the latest clauses.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
```

- [ ] **Step 6: Move isStale and handleRegenerate past the loading guard**

The declarations from Step 3 reference `contract` which may be undefined before the loading guard. Move them to be inside the main return body, or restructure using optional chaining. The safest fix is to define them just before `return (` using nullish coalescing:

Replace the declarations from Step 3 with:

```typescript
  const isStale =
    (contract?.templateVersion ?? null) !== null &&
    (contract?.currentTemplateVersion ?? null) !== null &&
    (contract?.currentTemplateVersion ?? 0) > (contract?.templateVersion ?? 0);

  const handleRegenerate = async () => {
    try {
      await apiRequest("POST", `/api/contracts/${contractId}/regenerate`);
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", contractId] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract regenerated with latest template" });
    } catch {
      toast({
        title: "Regeneration failed",
        description: "Could not regenerate contract.",
        variant: "destructive",
      });
    }
  };
```

Place these declarations after all hooks and before any early returns.

- [ ] **Step 7: Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 8: End-to-end smoke test**

1. Generate a contract via the wizard.
2. Open the template editor, make a small change (add then remove a clause), and click Save — version should increment.
3. Open `/contracts` — the contract row should show an amber "Template v1 → v2" badge and Regenerate button.
4. Click Regenerate — toast "Contract regenerated with latest template" appears, badge turns green "Template v2".
5. Open `/contracts/:id/edit` — no amber banner, no Regenerate button.
6. Save the template again (version → v3) and refresh the detail page — amber banner and Regenerate button appear.

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/contract-detail.tsx
git commit -m "feat: show stale badge, banner and regenerate button on contract detail"
```
