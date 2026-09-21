# Google Doc Export — Notes and Open Items

**Last updated:** 2026-09-21
**Branch:** `feat/phase-property-model` (unmerged)
**Plan:** [`docs/superpowers/plans/2026-09-21-google-doc-export.md`](superpowers/plans/2026-09-21-google-doc-export.md)

Tasks 1–6 are built and reviewed. **Task 7 — the end-to-end check — has not run**, because it needs a
Google service account that does not exist yet. Everything below says what is known and what is not,
so the next session does not have to re-derive it.

---

## 1. The export has never run against Google

`GOOGLE_SERVICE_ACCOUNT_JSON` is absent from `.env`, so the success path of
`POST /api/contracts/export-google-doc` has **never executed**. What has been proven, by driving the
route handler directly:

| Proven | How |
|---|---|
| Unconfigured → 503, and no Drive call attempted | throwaway script, Task 5 |
| A project with no Onedot folder → 409 naming the project number | same |
| An unreconciled project → 409 from the reconciliation gate, before any Drive call | same |
| A draft-suffixed project number resolves the base project's folder | throwaway script, fix wave: project 46 (`25-002-DRAFT-SAVAP7`) reached `files.create` with `parents: ["1Ph22vuz16cQ8pVfyRcUZ0ueuSVf5UBMb"]`, the same folder project 42 (`25-002`) resolves |
| A project number that is only a draft placeholder → 409, distinct from the no-folder 409 | same |
| A contract type with no active template → 409 before anything is generated | same |
| Onedot unreachable → 502 naming Onedot | same, with `ONEDOT_API_KEY` unset |
| The HTML/Buffer plumbing is correct | code trace: `generateContract({format:'html'})` returns `Buffer.from(html,'utf-8')`, and the route's `.toString('utf-8')` reconstructs it |
| `exportHtmlToGoogleDoc`'s `{ docId, webViewLink }` matches its destructuring | code trace |

**Not proven:** that Drive accepts the upload, that the document lands in the right folder, and —
most importantly — **what Google's HTML importer does to a generated contract**.

## 2. What someone has to do before this works

1. In the GCP project: create a **service account**, enable the **Drive API**, download the key JSON.
2. Add the service account as **Content manager** on the shared drive holding the project folders.
   Files are owned by the drive, not by a person, which is the whole point of using a service account
   rather than the OAuth credentials already in `.env` — those would make contracts the property of
   one individual's account.
3. Put the key in `.env` as `GOOGLE_SERVICE_ACCOUNT_JSON` (whole JSON, one line).

`GOOGLE_DRIVE_ID` is present in `.env` but **this design does not use it** — `files.create` with
`parents: [folderId]` and `supportsAllDrives: true` writes into a known folder without the drive id.
There is no fallback folder: when no folder resolves, the export refuses. A project genuinely absent
from Onedot gets its folder added there.

**Before this ships to `dev`, decide where the key lives.** This project injects config as plain ECS
task-def environment variables with no Secrets Manager, because the deploy user lacks that permission.
A service-account **private key** in a plain task definition is readable by anyone with
`ecs:DescribeTaskDefinition`, and it signs write access to the shared drive. The clean fix is SSM
Parameter Store or Secrets Manager with the *task role* granted access, set up by an admin the way ACM
and Route53 were. The code reads an env var either way, so switching is a task-def change and no code
change.

**Also decide, before deploying: the Google packages want Node 22 and the image is Node 20.**
`googleapis@181.0.0`, `google-auth-library@11.1.0`, `googleapis-common@9.1.0`, `gcp-metadata@9.0.4`
and `google-logging-utils@2.0.1` all declare `engines: { node: ">=22" }` (`>=22.0.0` for `googleapis`).
Both `Dockerfile` stages are Node 20 — `node:20-bookworm` for the builder, `node:20-bookworm-slim` for
the runtime. There is no `.npmrc`, so `engine-strict` is off: `npm ci` prints `EBADENGINE` and
proceeds, the build does not fail, and the deploy looks clean. A grep of the installed builds found no
Node-22-only APIs, so it will probably work — but "probably" is not a deploy plan. The two options are
to bump the runtime to `node:22-bookworm`, or to pin `googleapis` to the last version declaring
`>=18`. **This decision has not been taken and no change has been made.**

## 3. Task 7's checklist, to run when credentials exist

Export a full MASTER_EF for project `25-002` (Onedot: "Mariposa - Giordani", which already has a
folder) and compare it against the PDF of the same contract. **The conversion is Google's, so none of
this can be asserted in a test** — it has to be looked at.

| Check | Why it might not survive |
|---|---|
| Exhibit tables keep their columns and borders | Drive's HTML importer re-flows tables |
| **C.2's inline SVG checkmarks** | SVG may be dropped entirely — the most likely casualty |
| Page breaks between exhibits | `<!-- EXHIBIT_PAGE_BREAK -->` and CSS page breaks have no Docs equivalent |
| Headings keep their hierarchy | inline styles may not map to Docs heading styles |
| Currency and dates | plain text, should be safe — confirm anyway |
| Signature blocks | table-based layout, same risk as the exhibit tables |
| **Non-ASCII characters — `§`, en-dashes, curly quotes** | the upload now declares `text/html; charset=utf-8`, but `text/*` historically defaults to ISO-8859-1. If Drive ignores the declared charset, `§ 7.2` arrives as mojibake in an executed agreement. Check a clause with a section sign, an en-dash and a curly quote. |

If the SVG checkmarks vanish, that is worth its own follow-up: C.2 already lost its
`Notes / Acceptance Standard` column and its `Factory fabrication` row in Plan E, and a second loss in
the Doc path compounds it.

Whatever is created during this check should be **trashed, not deleted** — a contributor cannot delete,
and `files.delete` returns 404.

## 4. Findings from building it

- **The app was calling the wrong Onedot endpoint.** `/odoo/projects` returns **3 records with 4
  fields**; `/projects` returns **44 with 27**, including `google_drive_folder`. Step 1's dropdown was
  showing a three-item list. Fixed in Task 1.
- **`project_number` is the join key, not `odoo_id`.** Populated on 44/44 and unique, against 2/44 for
  `odoo_id`. Which also means `projects.odoo_project_id` — a column nothing writes — was never the
  right key.
- **`google_drive_folder` is populated on 42 of 44 projects.** `24-012` and `24-017` have none. An
  empty string is how the API reports absence; `findFolderId` maps it to `null`, because passing `""`
  to Drive as a parent produces a confusing 404 much later.
- **`getProjectWithRelations` has no organization filter** — a bare `WHERE id = $1`. `download-pdf`
  therefore has no org scoping at all. The export route deliberately adds `projectAccessible()`, which
  tolerates the nullable pre-multi-tenancy `organizationId` the way the repo's other guards do. Inert
  while `req.organizationId` is hardcoded to 1; a real gap when it is not. **The fix belongs in
  `download-pdf`, not in removing it from the export route.**
- **The folder lookup key is a project number the wizard has usually mangled.** `WizardContext.tsx`
  creates every autosaved draft as `${projectNumber}-DRAFT-${uniqueId}` (`:1176`, and `:1765` in
  `saveDraft`); only `generateContracts()` at `:1985` restores the clean number, and
  `projects.project_number` is UNIQUE with `PATCH /projects` silently dropping a colliding number. So
  the clean number is written exactly once per number and every later package keeps the suffix. The
  dev database shows it: project 42 is `25-002`, project 46 is `25-002-DRAFT-SAVAP7`. `onedotProjectNumber`
  in `server/lib/onedot.ts` now strips the suffix before the lookup. **The fix is at the lookup, not at
  the source** — the wizard still stores mangled numbers, and the generated document's *filename* still
  carries the suffix (project 46 exports as `25-002-DRAFT-SAVAP7_MaiaMariposa_...`), because the name
  comes from `mapper.ts`'s `PROJECT_NUMBER`. Fixing the wizard's naming is a separate piece of work.
- **An Onedot outage used to look like our bug.** `fetchOnedotProjects()` throwing fell through to a
  bare 500, which undercut the 503/502 split the rest of the route is careful about. The export route
  now wraps that call and returns 502 naming Onedot; `GET /api/odoo/projects` still returns 500.
- **Nothing reads `googleDocId` / `googleDocUrl`.** The export writes both onto the newest `contracts`
  row for the project and type, and no query, route or component selects either column. The link the
  operator sees lives only in `Step9ReviewGenerate`'s `googleDocLinks` React state, so it is gone on
  reload and there is no way to find the Doc again from the app. The columns are staged for a later
  consumer, not wired to one.
- **The Doc is regenerated at export time.** The route runs the full pipeline against live project
  data — the same path as `download-pdf` — and only then attaches the id and URL to a `contracts` row.
  It is not rendered from that row's `variablesSnapshot` (a column nothing writes, either). So the
  stored link is **not an attestation of the version that row records**: exporting twice after a
  pricing change gives two different documents against one row, and the row keeps only the last link.
- **`properties.phase_id` is not constrained to a phase in the same project**, so a property can be
  attached to another project's phase. Found while building a test fixture. A candidate schema
  tightening, unrelated to this work.
- **`googleapis` roughly doubles the test suite's duration** (~214 ms → ~400–460 ms) because it is
  imported at module top level. `isConfigured()` and `documentTitle()` — and the status endpoint,
  which never exports anything — all pay for it. A lazy `await import("googleapis")` inside
  `exportHtmlToGoogleDoc` would keep the cheap paths cheap. Acceptable today; revisit if more
  Google-touching modules land.

## 5. Deliberately not built

| Item | Why |
|---|---|
| Exporting the whole package (`download-all-zip`) | A zip has no Google-native equivalent, so it would mean unpacking and converting each member separately. |
| Replacing the PDF download | The ask was to add a Google Doc path, not remove the PDF. Both stay until someone decides otherwise. |
| Renaming `/api/odoo/projects` to `/api/onedot/projects` | The upstream is Onedot; the path, the file and the client's query key are all misnamed. Churn without benefit today. |
| Using the OAuth credentials already in `.env` | They are a user grant, not a service account: files would be owned by a person, the scope is unknown, and the token dies on a password change. |
