# Template Versioning Design

**Date:** 2026-03-27
**Status:** Approved

## Summary

Add an integer version counter to contract templates. When a contract is generated, capture the template's current version. On the contracts list and contract edit page, show a badge indicating whether the contract is current or stale (generated with an older template version), with a Regenerate button on stale contracts.

---

## Section 1: Data Layer

### Schema changes

**`contract_templates.version`**
- Change type from `text` (currently `"1.0"`) to `integer`.
- Default value: `1`.
- Managed exclusively by the server — never set by the client.
- Increments by 1 on every successful Save in the template editor.

**`contracts.template_version`**
- Change type from `text nullable` to `integer nullable`.
- Populated at contract generation time from `contract_templates.version`.
- Never mutated after generation (except when Regenerate replaces the contract).
- Remains `null` for contracts generated before this feature ships (legacy contracts — no badge shown).

### Stale check

A contract is stale when: `template.version > contract.template_version`

A contract is current when: `template.version === contract.template_version`

A contract is legacy (no badge) when: `contract.template_version IS NULL`

---

## Section 2: Version Bump Mechanics

### Endpoint

```
PATCH /api/contract-templates/:id/version
```

- Executes: `UPDATE contract_templates SET version = version + 1, updated_at = now() WHERE id = $1 RETURNING version`
- Returns `{ version: number }`
- Protected by `requireAdmin`

### When it fires

The template editor's `handleSave` function calls this endpoint as its **final step**, after all deletes, adds, and reorders have succeeded. If any earlier step fails, the save is aborted with an error toast and the version is not bumped. If the PATCH itself fails, the user sees an error toast and the draft remains dirty — they can retry.

### Concurrent edits

If two users save the same template simultaneously, each save increments independently (v3 → v4 → v5). This is acceptable — both saves are valid, and stale detection only compares version numbers.

---

## Section 3: UI

### `/contracts` list view

| Contract state | Badge | Regenerate button |
|---|---|---|
| Stale (`template.version > contract.template_version`) | Amber · "Template v3 → v5" | Yes — inline in row |
| Current (`template.version === contract.template_version`) | Green · "Template v5" | No |
| Legacy (`contract.template_version` is null) | None | No |

### `/contracts/:id/edit` page

**Header area:**
- Same badge as list view (amber or green).
- When stale: "Regenerate with latest template" button in the header action area.

**Below header (stale only):**
- Amber banner with plain-English explanation:
  > "This contract was generated with template v3. The template has since been updated to v5. Regenerating will apply the latest clauses and mark this contract as current."

**When current:** No banner, no Regenerate button — no noise.

### Regenerate action

Clicking Regenerate (from either surface):
1. Calls the existing contract generation endpoint (same as initial generation).
2. Replaces the existing PDF in place.
3. Updates `contracts.template_version` to the current `contract_templates.version`.
4. Badge flips from amber to green; banner disappears.

---

## Section 4: API Changes Summary

| Change | Type |
|---|---|
| `contract_templates.version`: `text "1.0"` → `integer 1` | Schema migration |
| `contracts.template_version`: `text nullable` → `integer nullable` | Schema migration |
| `PATCH /api/contract-templates/:id/version` | New endpoint |
| Contract generation: populate `contracts.template_version` from template | Existing endpoint update |
| `GET /api/contracts` response: include `templateVersion` + `template.version` for stale check | Existing endpoint update |
| `GET /api/contracts/:id` response: include same fields | Existing endpoint update |

---

## Out of Scope

- Diffing what changed between template versions (showing which clauses were added/removed).
- Blocking contract download when stale (user can still download the old PDF).
- Version history or rollback.
- Automatic regeneration on template save.
