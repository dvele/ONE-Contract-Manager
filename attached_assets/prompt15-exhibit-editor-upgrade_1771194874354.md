# REPLIT AGENT PROMPT — EXHIBIT EDITOR UPGRADE

## Context

We are working on the ONE Contract Manager. The Exhibit Library page (`client/src/pages/exhibits.tsx`) currently has basic CRUD functionality but the content editing experience is poor — raw HTML in a `<Textarea>` inside a cramped dialog modal. The Clause Library page (`client/src/pages/clause-library.tsx`) has a much better editor with a split-panel layout, rich text editing via TipTap, live preview, and variable highlighting. We want to bring the Exhibit Editor up to the same quality level.

**Current state of `exhibits.tsx` (518 lines):**
- Card grid showing exhibits with letter badge, title, content preview snippet
- Click card → view dialog with rendered HTML preview
- Edit button → edit dialog with form (letter, sort order, title, contract types, active/dynamic toggles, disclosure code, raw HTML textarea)
- Create/Delete functionality works
- Content is edited as RAW HTML in a `<Textarea>` — no rich text toolbar, no preview while editing

**Current state of `admin/exhibits.tsx` (351 lines):**
- Simpler table-based list (code, name, contract types)
- Edit dialog only has code, name, description — NO content editing at all
- This page should be REMOVED or redirected to the main exhibits page

**Goal:** Rebuild the exhibits page to match the clause library's UX quality, using the existing `RichTextEditor` component (`client/src/components/ui/rich-text-editor.tsx`) which is TipTap-based.

---

## IMPLEMENTATION

### Phase 1: Replace exhibits.tsx with Split-Panel Layout

Rebuild `client/src/pages/exhibits.tsx` using a layout similar to the clause library:

**Left Panel (sidebar, ~30% width):**
- List of exhibits sorted by letter (A, B, C, D, E, F, G)
- Each item shows: letter badge, title, contract type badges, active/inactive indicator
- Click to select → loads in right panel
- "New Exhibit" button at top
- Filter by contract type (ONE, MASTER_EF, MANUFACTURING, ONSITE)

**Right Panel (main content, ~70% width):**
- **View Mode (default):** 
  - Header: Exhibit letter + title + Edit/Delete buttons
  - Metadata bar: contract types, active status, dynamic flag, disclosure code
  - Rendered HTML preview of content (using `dangerouslySetInnerHTML`)
  - Show variable tags highlighted (e.g., `{{DESIGN_FEE}}` shown in a colored badge)
  
- **Edit Mode (after clicking Edit):**
  - Split vertically: top = editor, bottom = live preview
  - **Top section (editor):**
    - Metadata fields: letter (select), title (input), sort order (number)
    - Contract type toggle badges
    - Active / Dynamic switches
    - Disclosure code (if dynamic)
    - Content editing: **Use the existing `RichTextEditor` component** for rich text, PLUS a "Source" toggle to switch to raw HTML `<Textarea>` for power users (the content includes `{{VARIABLE}}` tags and `<table>` elements that need raw HTML access)
  - **Bottom section (preview):**
    - Live rendered preview of the content as it would appear in the contract
    - Updates as user types
  - Save / Cancel buttons

### Phase 2: Editor Features

#### 2A. Dual-Mode Content Editor

Since exhibit content includes HTML tables, variable tags (`{{DESIGN_FEE}}`), block tags (`{{BLOCK_GC_INFO_SECTION}}`), and table tags (`{{TABLE_WHAT_HAPPENS_NEXT}}`), the editor needs both modes:

1. **Rich Text mode** (default): Use `RichTextEditor` component for basic formatting (bold, italic, underline, lists, headings)
2. **Source HTML mode**: Toggle to raw `<Textarea>` with monospace font for editing HTML tables, variable tags, and complex structure

Add a toggle button (e.g., "Source" / "Visual") in the editor toolbar area.

#### 2B. Variable Tag Highlighting in Preview

In the preview panel, highlight unresolved variable tags:
- `{{VARIABLE_NAME}}` → show in a colored pill/badge (e.g., blue background)
- `{{BLOCK_*}}` and `{{TABLE_*}}` → show in a different color (e.g., purple)

Simple implementation: regex replace in the preview HTML before rendering:
```typescript
function highlightVariables(html: string): string {
  return html
    .replace(/\{\{(BLOCK_[A-Z_]+)\}\}/g, '<span class="bg-purple-100 text-purple-800 px-1 rounded text-xs font-mono">{{$1}}</span>')
    .replace(/\{\{(TABLE_[A-Z_]+)\}\}/g, '<span class="bg-purple-100 text-purple-800 px-1 rounded text-xs font-mono">{{$1}}</span>')
    .replace(/\{\{([A-Z_]+)\}\}/g, '<span class="bg-blue-100 text-blue-800 px-1 rounded text-xs font-mono">{{$1}}</span>');
}
```

#### 2C. Resizable Split Panel

Use the same drag-to-resize pattern as the clause library (line 1099 in `clause-library.tsx`). The editor and preview panels should be vertically split with a draggable divider.

### Phase 3: Remove Admin Exhibits Page Duplication

The `admin/exhibits.tsx` page is redundant and less capable than `exhibits.tsx`. Options:

**Option A (preferred):** Remove the admin exhibits route and redirect `/admin/exhibits` to the main `/exhibits` page. Update the admin sidebar to link to `/exhibits` instead.

**Option B:** Keep admin page but add a link/button that says "Open Full Editor" pointing to `/exhibits`.

### Phase 4: API Verification

Verify the exhibits API endpoints support all needed operations:

- `GET /api/exhibits` — list all exhibits (should return content, letter, title, contractTypes, isActive, isDynamic, disclosureCode, sortOrder)
- `GET /api/exhibits/:id` — get single exhibit with full content
- `POST /api/exhibits` — create new exhibit
- `PATCH /api/exhibits/:id` — update exhibit (including content)
- `DELETE /api/exhibits/:id` — delete exhibit

Check `server/routes/` for the exhibits route file and ensure all fields are handled in the PATCH endpoint.

---

## REFERENCE: Clause Library Patterns to Reuse

From `client/src/pages/clause-library.tsx`:

1. **Split panel layout** with resizable divider (~line 1099)
2. **Edit mode toggle** with Save/Cancel buttons
3. **Live preview** rendering with `dangerouslySetInnerHTML`
4. **Badge-based filtering** for contract types
5. **Sidebar list** with search and selection state

From `client/src/components/ui/rich-text-editor.tsx`:

1. **TipTap editor** with toolbar (bold, italic, underline, lists, headings, undo/redo)
2. Props: `content: string`, `onChange: (content: string) => void`

---

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `client/src/pages/exhibits.tsx` | Complete rebuild with split-panel layout, rich text + source toggle, live preview |
| `client/src/pages/admin/exhibits.tsx` | Remove or simplify to redirect |
| `client/src/components/app-sidebar.tsx` | Update admin sidebar link if redirecting |
| `client/src/App.tsx` | Update route if removing admin exhibits page |

---

## VERIFICATION CHECKLIST

- [ ] Exhibit list shows in left sidebar with letter badges, sorted A-G
- [ ] Clicking an exhibit shows rendered preview in right panel
- [ ] Edit mode shows rich text editor with toolbar
- [ ] "Source" toggle switches to raw HTML textarea
- [ ] Variable tags (`{{DESIGN_FEE}}`) highlighted in preview
- [ ] Block/Table tags (`{{BLOCK_*}}`, `{{TABLE_*}}`) highlighted differently
- [ ] Live preview updates as user types
- [ ] Can edit all metadata: letter, title, sort order, contract types, active, dynamic, disclosure code
- [ ] Save persists changes to database
- [ ] Create new exhibit works
- [ ] Delete exhibit works with confirmation
- [ ] No duplicate admin page confusion
- [ ] Responsive layout works on smaller screens (stack panels vertically)
