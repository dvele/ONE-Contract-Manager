# Odoo Project Dropdown — Design Spec

**Date:** 2026-04-10
**Status:** Approved

## Overview

Replace the manual-entry project number and project name fields in Step 1 of the contract wizard with a searchable dropdown populated from the Odoo projects API. Users can also choose to enter values manually.

---

## Backend Route

**New endpoint:** `GET /api/odoo/projects`

- Reads `process.env.VITE_ONEDOT_API_KEY` for the Authorization header
- Fetches from `https://one-api.dvele.com/odoo/projects`
- Parses each project's `name` field by splitting on the **first** ` - ` occurrence:
  - `"23-004 - Robley"` → `{ projectNumber: "23-004", projectName: "Robley" }`
  - `"24-001 - Smith - Phase 2"` → `{ projectNumber: "24-001", projectName: "Smith - Phase 2" }`
  - `"Miscellaneous"` (no separator) → `{ projectNumber: "Miscellaneous", projectName: "" }`
- Returns a shaped array:
  ```ts
  [{ id: number, projectNumber: string, projectName: string, displayName: string }]
  ```
  where `displayName` is the original Odoo `name` string.
- No caching — fresh fetch on each request.
- If `VITE_ONEDOT_API_KEY` is missing or the Odoo call fails, returns HTTP 500. The client handles this gracefully.

---

## Client UI — Step1ProjectInfo.tsx

### Mode State

A `mode` state variable (`'dropdown' | 'manual'`) is added, defaulting to `'dropdown'`.

### Dropdown Mode

- `useQuery` fetches `/api/odoo/projects` on mount.
- A searchable Combobox (using the existing shadcn `Command`/`Popover` pattern) replaces the two text fields.
- The Combobox displays `displayName` values (e.g. "23-004 - Robley") and supports typing to filter by project number or name.
- On selection: calls `updateProjectData({ projectNumber, projectName })` with the parsed values. The existing project-number uniqueness check fires automatically since it watches `projectNumber`.
- A small **"Enter manually instead"** link below the Combobox switches `mode` to `'manual'`.
- **On fetch error or timeout:** `mode` auto-switches to `'manual'` and a small inline notice appears: *"Could not load projects — enter manually"*. No retry button.
- **Empty list:** Combobox shows "No projects found"; "Enter manually instead" link remains visible.

### Manual Mode

- The two existing text fields (`projectNumber`, `projectName`) render exactly as they do today — no visual change.
- A small **"Select from project list"** link above the fields lets the user switch back to dropdown mode (re-triggers the fetch).
- If the user previously selected from the dropdown, the text fields are pre-populated with those values so they can edit rather than re-type.

---

## Error Handling & Edge Cases

| Scenario | Behavior |
|---|---|
| API key not set | Route returns 500 → client falls back to manual mode with inline notice |
| Odoo call fails / times out | Same as above |
| Odoo returns empty list | Combobox shows "No projects found"; escape hatch still visible |
| Project name has no ` - ` separator | `projectNumber` = full name, `projectName` = empty; user fills in manually |
| User selects from dropdown, switches to manual | Text fields pre-populated with selected values, fully editable |
| User edits fields after selection | Uniqueness check runs on every keystroke as today |

---

## Out of Scope

- Caching Odoo project results
- Syncing Odoo project data into the local database
- Using the Odoo project `id` or `tag_ids` for any downstream purpose
