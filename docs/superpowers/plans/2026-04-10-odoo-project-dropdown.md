# Odoo Project Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual project number and project name fields in Step 1 of the contract wizard with a searchable Odoo project dropdown that auto-populates both fields, with a manual-entry fallback.

**Architecture:** A new server-side proxy route (`GET /api/odoo/projects`) fetches from the Odoo API using the server-stored API key and returns a shaped list. Step 1 owns a `useQuery` for that endpoint and conditionally renders either an `OdooProjectCombobox` (a pure presentational component using shadcn Command + Popover) or the existing manual text fields, depending on a `mode` state that auto-switches on error.

**Tech Stack:** Express 5, TanStack Query v5, shadcn Command + Popover, TypeScript

---

## File Map

| Action | File                                                      | Responsibility                                                                                                       |
| ------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Create | `server/routes/odoo.ts`                                   | Proxy route — fetches Odoo projects, parses names, returns shaped JSON                                               |
| Modify | `server/routes/index.ts`                                  | Register the new odoo router                                                                                         |
| Create | `client/src/components/wizard/OdooProjectCombobox.tsx`    | Pure presentational combobox — receives projects as props, emits selection                                           |
| Modify | `client/src/components/wizard/steps/Step1ProjectInfo.tsx` | Own the query + mode state, conditionally render combobox or manual fields; fix `data.exists` → `!data.isUnique` bug |

---

## Task 1: Backend — Odoo Proxy Route

**Files:**

- Create: `server/routes/odoo.ts`

- [ ] **Step 1: Create the route file**

```ts
// server/routes/odoo.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

interface OdooProject {
  id: number;
  name: string;
  company_id: boolean | number;
  tag_ids: number[];
}

interface OdooProjectShaped {
  id: number;
  projectNumber: string;
  projectName: string;
  displayName: string;
}

function parseOdooProjectName(name: string): {
  projectNumber: string;
  projectName: string;
} {
  const separatorIndex = name.indexOf(" - ");
  if (separatorIndex === -1) {
    return { projectNumber: name, projectName: "" };
  }
  return {
    projectNumber: name.slice(0, separatorIndex),
    projectName: name.slice(separatorIndex + 3),
  };
}

router.get("/odoo/projects", async (req, res) => {
  const apiKey = process.env.ONEDOT_API_KEY;
  if (!apiKey) {
    console.error("[OdooProxy] ONEDOT_API_KEY is not set");
    return res.status(500).json({ error: "Odoo API key not configured" });
  }

  try {
    const response = await fetch("https://one-api.dvele.com/odoo/projects", {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      console.error(`[OdooProxy] Odoo API returned ${response.status}`);
      return res
        .status(500)
        .json({ error: "Failed to fetch projects from Odoo" });
    }

    const raw: OdooProject[] = await response.json();
    const projects: OdooProjectShaped[] = raw.map((p) => {
      const { projectNumber, projectName } = parseOdooProjectName(p.name);
      return { id: p.id, projectNumber, projectName, displayName: p.name };
    });

    res.json(projects);
  } catch (err) {
    console.error("[OdooProxy] Fetch failed:", err);
    res.status(500).json({ error: "Failed to reach Odoo API" });
  }
});

export default router;
```

- [ ] **Step 2: Run the TypeScript check to verify no errors**

```bash
cd ONE-Contract-Manager && npm run check 2>&1 | grep "odoo.ts"
```

Expected: no output (no errors in the new file).

- [ ] **Step 3: Commit**

```bash
git add server/routes/odoo.ts
git commit -m "feat: add Odoo projects proxy route"
```

---

## Task 2: Register the Route

**Files:**

- Modify: `server/routes/index.ts`

- [ ] **Step 1: Add the import and `router.use()` call**

In `server/routes/index.ts`, add the import after the last existing import:

```ts
import odooRouter from "./odoo";
```

Add `router.use(odooRouter);` after the last `router.use(...)` line (currently `router.use(variableMappingsRouter);`):

```ts
router.use(variableMappingsRouter);
router.use(odooRouter); // ← add this line
```

- [ ] **Step 2: Run the TypeScript check**

```bash
npm run check 2>&1 | grep -E "(odoo|index)"
```

Expected: no new errors.

- [ ] **Step 3: Smoke-test the endpoint (with the dev server running)**

```bash
curl -s http://localhost:5000/api/odoo/projects | head -c 200
```

Expected: a JSON array starting with `[{"id":` or `[]`, not an HTML error page. If `VITE_ONEDOT_API_KEY` is not in `.env` yet, you'll get `{"error":"Odoo API key not configured"}` — that's the correct error shape.

- [ ] **Step 4: Commit**

```bash
git add server/routes/index.ts
git commit -m "feat: register Odoo proxy router"
```

---

## Task 3: OdooProjectCombobox Component

**Files:**

- Create: `client/src/components/wizard/OdooProjectCombobox.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/wizard/OdooProjectCombobox.tsx
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OdooProject {
  id: number;
  projectNumber: string;
  projectName: string;
  displayName: string;
}

interface Props {
  projects: OdooProject[];
  isLoading: boolean;
  onSelect: (projectNumber: string, projectName: string) => void;
  onManualEntry: () => void;
}

export function OdooProjectCombobox({
  projects,
  isLoading,
  onSelect,
  onManualEntry,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedId);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={isLoading}
            data-testid="combobox-odoo-project">
            {isLoading
              ? "Loading projects..."
              : selectedProject
                ? selectedProject.displayName
                : "Search projects..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start">
          <Command>
            <CommandInput placeholder="Search by number or name..." />
            <CommandList>
              <CommandEmpty>No projects found.</CommandEmpty>
              <CommandGroup>
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.displayName}
                    onSelect={() => {
                      setSelectedId(project.id);
                      setOpen(false);
                      onSelect(project.projectNumber, project.projectName);
                    }}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedId === project.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {project.displayName}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-xs underline"
        onClick={onManualEntry}
        data-testid="link-manual-entry">
        Enter manually instead
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run the TypeScript check**

```bash
npm run check 2>&1 | grep "OdooProjectCombobox"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/wizard/OdooProjectCombobox.tsx
git commit -m "feat: add OdooProjectCombobox presentational component"
```

---

## Task 4: Wire Up Step1ProjectInfo.tsx

**Files:**

- Modify: `client/src/components/wizard/steps/Step1ProjectInfo.tsx`

This task:

1. Adds the `OdooProject` type import and `OdooProjectCombobox` import
2. Adds `mode` and `fallbackNotice` state
3. Adds the `useQuery` for `/api/odoo/projects` with auto-fallback on error
4. Fixes the existing `data.exists` bug (line 83) — the API returns `{ isUnique: boolean }`, not `{ exists: boolean }`
5. Replaces the project number and project name JSX sections with mode-conditional rendering

- [ ] **Step 1: Update imports at the top of the file**

Replace the existing import block (lines 1–13) with:

```ts
import { useState, useEffect, useRef } from "react";
import { useWizard, US_STATES } from "../WizardContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HelpCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Home,
  MapPin,
} from "lucide-react";
import { OdooProjectCombobox, type OdooProject } from "../OdooProjectCombobox";
```

- [ ] **Step 2: Add mode and fallback state inside the component, and add the Odoo query**

After the existing state declarations (after line 40 — `const checkTimeoutRef = ...`), add:

```ts
const [mode, setMode] = useState<"dropdown" | "manual">("dropdown");
const [fallbackNotice, setFallbackNotice] = useState<string | undefined>();

const {
  data: odooProjects = [],
  isLoading: odooLoading,
  isError: odooError,
} = useQuery<OdooProject[]>({
  queryKey: ["/api/odoo/projects"],
  enabled: mode === "dropdown",
  retry: false,
});

useEffect(() => {
  if (odooError) {
    setMode("manual");
    setFallbackNotice("Could not load projects — enter manually");
  }
}, [odooError]);
```

- [ ] **Step 3: Fix the `data.exists` bug**

On the line that reads (currently line 83):

```ts
setProjectNumberStatus(data.exists ? "exists" : "available");
```

Change it to:

```ts
setProjectNumberStatus(!data.isUnique ? "exists" : "available");
```

- [ ] **Step 4: Replace the project number and project name JSX sections**

Replace the entire project number block (lines 107–169) and project name block (lines 171–189) with:

```tsx
{
  /* Project selection: dropdown or manual */
}
{
  mode === "dropdown" ? (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        Project <span className="text-red-500">*</span>
      </Label>
      <OdooProjectCombobox
        projects={odooProjects}
        isLoading={odooLoading}
        onSelect={(projectNumber, projectName) => {
          updateProjectData({ projectNumber, projectName });
        }}
        onManualEntry={() => setMode("manual")}
      />
      {validationErrors.projectNumber && (
        <p className="text-sm text-red-500">{validationErrors.projectNumber}</p>
      )}
      {validationErrors.projectName && (
        <p className="text-sm text-red-500">{validationErrors.projectName}</p>
      )}
    </div>
  ) : (
    <div className="space-y-4">
      {fallbackNotice && (
        <p className="text-muted-foreground text-sm">{fallbackNotice}</p>
      )}
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-xs underline"
        onClick={() => {
          setMode("dropdown");
          setFallbackNotice(undefined);
        }}
        data-testid="link-select-from-list">
        Select from project list
      </button>

      {/* Project Number */}
      <div className="space-y-2">
        <Label htmlFor="projectNumber" className="flex items-center gap-2">
          Project Number <span className="text-red-500">*</span>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="text-muted-foreground h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Format: YYYY-### (e.g., 2025-042)</p>
            </TooltipContent>
          </Tooltip>
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="projectNumber"
              value={projectData.projectNumber}
              onChange={(e) =>
                updateProjectData({ projectNumber: e.target.value })
              }
              placeholder="2025-042"
              className={`${validationErrors.projectNumber || projectNumberStatus === "exists" ? "border-red-500" : projectNumberStatus === "available" ? "border-green-500" : ""} pr-10`}
              data-testid="input-project-number"
            />
            {projectNumberStatus === "checking" && (
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                <RefreshCw className="text-muted-foreground h-4 w-4 animate-spin" />
              </div>
            )}
            {projectNumberStatus === "exists" && (
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
            )}
            {projectNumberStatus === "available" && (
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              updateProjectData({ projectNumber: generateProjectNumber() })
            }
            data-testid="button-regenerate-number">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {projectNumberStatus === "exists" && (
          <p className="flex items-center gap-1 text-sm text-red-500">
            <AlertTriangle className="h-3 w-3" />
            This project number already exists. Please use a different number or
            resume the existing draft.
          </p>
        )}
        {projectNumberStatus === "available" && (
          <p className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle className="h-3 w-3" />
            Project number is available
          </p>
        )}
        {validationErrors.projectNumber && (
          <p className="text-sm text-red-500">
            {validationErrors.projectNumber}
          </p>
        )}
      </div>

      {/* Project Name */}
      <div className="space-y-2">
        <Label htmlFor="projectName" className="flex items-center gap-2">
          Project Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="projectName"
          value={projectData.projectName}
          onChange={(e) => updateProjectData({ projectName: e.target.value })}
          placeholder="e.g., Smith Residence"
          className={validationErrors.projectName ? "border-red-500" : ""}
          data-testid="input-project-name"
        />
        {validationErrors.projectName && (
          <p className="text-sm text-red-500">{validationErrors.projectName}</p>
        )}
        <p className="text-muted-foreground text-xs">
          A descriptive name for the project
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the TypeScript check**

```bash
npm run check 2>&1 | grep "Step1ProjectInfo"
```

Expected: no output.

- [ ] **Step 6: Manual smoke test**

Start the dev server (`npm run dev`) and open Step 1 of the wizard. Verify:

- [ ] The combobox renders and shows "Loading projects..." while fetching
- [ ] Projects appear in the dropdown and are searchable
- [ ] Selecting a project populates both fields (check wizard state via React DevTools or proceed to Step 2 and verify the values are pre-filled)
- [ ] "Enter manually instead" shows the two text fields
- [ ] "Select from project list" brings back the combobox
- [ ] If you temporarily remove `VITE_ONEDOT_API_KEY` from `.env` and restart, the combobox auto-switches to manual mode with the notice

- [ ] **Step 7: Commit**

```bash
git add client/src/components/wizard/steps/Step1ProjectInfo.tsx
git commit -m "feat: wire Odoo project dropdown into Step 1, fix isUnique check"
```

---

## Self-Review Notes

**Spec coverage check:**

- ✅ Server proxy route with `VITE_ONEDOT_API_KEY` — Task 1
- ✅ Route registered — Task 2
- ✅ Parse on first `-`, take everything after as project name — Task 1 `parseOdooProjectName`
- ✅ Searchable combobox — Task 3
- ✅ `onSelect` populates both fields via `updateProjectData` — Task 4 Step 4
- ✅ "Enter manually instead" escape hatch — Task 3 Step 1 + Task 4 Step 4
- ✅ Auto-fallback to manual on error — Task 4 Step 2 (`useEffect` on `odooError`)
- ✅ Fallback notice text — Task 4 Step 4
- ✅ "Select from project list" link back — Task 4 Step 4
- ✅ Pre-populated fields after dropdown selection — `updateProjectData` writes to wizard state; fields read from `projectData`
- ✅ Empty list → "No projects found" — Task 3 `CommandEmpty`
- ✅ API key missing → 500 → client falls back — Task 1 + Task 4 `isError` handler
- ✅ Name with no separator degrades safely — Task 1 `parseOdooProjectName` edge case

**Type consistency:** `OdooProject` interface is defined and exported from `OdooProjectCombobox.tsx` and imported by name in `Step1ProjectInfo.tsx`. Consistent across all tasks.

**Bug fix included:** The pre-existing `data.exists` → `!data.isUnique` fix is in Task 4 Step 3, which is the only file where it appears.
