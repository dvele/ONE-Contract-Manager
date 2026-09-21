# Google Doc Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export a generated contract to a Google Doc in that project's own Drive folder, instead of downloading a file.

**Architecture:** Drive converts an uploaded file to a Google-native type when `files.create` names the **target** MIME type. The contract generator already returns assembled HTML (`format: 'html'`), so one `files.create` call with source `text/html` and target `application/vnd.google-apps.document` is the whole conversion — no Docs API, no index arithmetic. The destination folder comes from Onedot: every project carries a `google_drive_folder`, matched on `project_number`.

**Tech Stack:** Express 5, TypeScript, Node 20, Drizzle ORM, PostgreSQL, React 18 + TanStack Query v5, vitest, `googleapis` (new dependency).

**Reference:** *Google Doc Generator — Portable Implementation Spec* (Kurt Goodjohn, 2026-09-18), a claude.ai doc. It describes two approaches — **Build** (assemble Docs API requests from markdown, ~1,200 lines) and **Convert** (upload bytes, let Drive convert, ~310 lines). **This plan takes Convert.** Read the Decisions section below before departing from it; several points here deliberately differ from that spec because this repo differs.

## Decisions, and why

Settled 2026-09-21. Each of these was a real fork.

| Decision | Why |
|---|---|
| **Convert, not Build** | `generateContract({ format: 'html' })` already returns the assembled HTML (precedent at `server/routes/contracts.ts:1734`). The PDF and the Doc then come from one source of truth, which is what a legal document needs. |
| **Source is `text/html`, not `.docx`** | The reference spec converts a `.docx`. This app produces **no** `.docx` — `docxtemplater` is in `package.json` but nothing under `server/` uses it; the outputs are PDF via Puppeteer and a zip. Drive converts HTML to a Doc by the same mechanism. |
| **Service account, `drive` scope only** | Nothing here edits through the Docs API, so `documents` would be a larger grant than the work requires. The `.env` already holds OAuth *user* credentials (client id/secret, refresh token) — those are a different auth model: files would be owned by a person rather than the drive, and the grant dies on a password change. Not used. |
| **Never call `.with_subject()`** | Domain-wide delegation is not needed and widens the blast radius. Straight from the reference spec. |
| **Folder comes from Onedot, keyed on `project_number`** | `GET https://one-api.dvele.com/projects` returns 44 projects; `google_drive_folder` is populated on **42**. `project_number` is populated on **44/44 and unique**. `odoo_id` is populated on **2/44** — do not key on it, and note that `projects.odoo_project_id` (which nothing writes) is therefore the wrong key too. |
| **Folders live in a shared drive** | Confirmed with the user. One Content manager grant on that drive covers all 42 folders. If this ever changes to per-user My Drive folders, this design stops working and the ownership question reopens. |
| **No images** | Decided in scope discussion. The Convert path sidesteps the reference spec's public-window trade-off entirely. |
| **One service account, inline execution** | Decided. One contract at a time; no worker, no queue. |
| **Always create a new document** | Never overwrite. Re-export produces a new Doc, which suits contract versioning. |

## Global Constraints

- **`requireAuth` on every route file.** Errors are `res.status(4xx).json({ error })`, never `{ message }`.
- **`npm run check` must stay at 12.** `env -u DATABASE_URL npm test` must pass and stay hermetic — never import a database-bound module into a test. `npm run test:tz` runs the same suite under `TZ=America/Los_Angeles`.
- **Test files are not type-checked by anything** — `tsconfig.json` excludes `**/*.test.ts` and vitest does no type-checking, so a wrong argument type in a test fails no gate.
- **Never log a secret.** The service-account JSON holds a private key. Log the `client_email` when diagnosing, never the key, and never the whole parsed object.
- **A missing input yields null, never a substituted default.**
- ESM only. Shadcn primitives only; TanStack Query v5; wouter.
- **Commit messages carry no AI attribution.** Imperative-mood subjects.
- Comment policy: only a suppression with its reason, an external fact, a deviation where the obvious version breaks, a measurement with provenance, or `TODO: <ticket> - <what>`.

## Configuration

One new secret:

```
GOOGLE_SERVICE_ACCOUNT_JSON=   # the whole key JSON, one line
```

> **`GOOGLE_DRIVE_FALLBACK_FOLDER_ID` was removed by ruling during the fix wave.** It was a substituted default for the one input that decides where a legal agreement is filed, which this plan's own Global Constraints forbid; the export now refuses instead of misfiling.

`GOOGLE_DRIVE_ID` is **not** needed — `files.create` with `parents: [folderId]` and `supportsAllDrives: true` writes into a known folder without the drive id.

> **Deployment note, decide before this reaches `dev`.** This project injects config as plain ECS task-def environment variables with no Secrets Manager, because the deploy user lacks that permission. A Google service-account **private key** in a plain task definition is readable by anyone with `ecs:DescribeTaskDefinition`. The clean fix is SSM Parameter Store or Secrets Manager with the *task role* granted access, set up by an admin the way ACM and Route53 were. The code reads an env var either way, so switching is a task-def change and no code change.

## File Structure

| File | Responsibility |
|---|---|
| `server/lib/onedot.ts` | Fetch the Onedot project list; resolve a project number to its Drive folder. |
| `server/lib/googleDrive.ts` | Service-account auth, `isConfigured()`, upload-and-convert. Nothing else. |
| `server/routes/odoo.ts` | Modify: proxy `/projects` instead of `/odoo/projects`. |
| `server/routes/contracts.ts` | Modify: add the export route. |
| `client/src/components/wizard/steps/Step9ReviewGenerate.tsx` | Modify: the export button. |
| `shared/schema.ts` | Modify: two columns on `contracts`. |

---

## Task 1: Point the Onedot proxy at the right endpoint

**Files:** Modify `server/routes/odoo.ts`

**Interfaces:** Produces `GET /api/odoo/projects` returning `{ id, projectNumber, projectName, displayName, googleDriveFolder }[]` — the first four unchanged, so `OdooProjectCombobox.tsx` and `Step1ProjectInfo.tsx` keep working untouched.

This is a live bug independent of Google Docs. The route proxies `https://one-api.dvele.com/odoo/projects`, which returns **3 records with 4 fields**. The real endpoint is `/projects`: **44 records with 27 fields**, including the one this plan needs. Step 1's dropdown is currently showing a three-item list.

- [ ] **Step 1: Repoint the fetch and map the richer shape**

```ts
interface OnedotProject {
  id: number;
  project_number: string;
  project_name: string;
  google_drive_folder: string | null;
}

interface OdooProjectShaped {
  id: number;
  projectNumber: string;
  projectName: string;
  displayName: string;
  googleDriveFolder: string | null;
}
```

Replace the fetch URL with `https://one-api.dvele.com/projects` and the mapping with:

```ts
    const raw: OnedotProject[] = await response.json();
    const projects: OdooProjectShaped[] = raw.map((p) => ({
      id: p.id,
      projectNumber: p.project_number,
      projectName: p.project_name,
      displayName: `${p.project_number} - ${p.project_name}`,
      // Populated on 42 of 44 projects; null is a real answer, not an error.
      googleDriveFolder: p.google_drive_folder || null,
    }));
```

Delete `parseOdooProjectName` and the `OdooProject` interface — `/projects` supplies `project_number` and `project_name` as separate fields, so splitting `"NUMBER - Name"` by hand is no longer needed. Confirm with `grep -rn "parseOdooProjectName" server client` that nothing else calls it.

The route path stays `/api/odoo/projects` so the client is unaffected. It is now a misnomer — the upstream is Onedot, not Odoo — but renaming the path, the file and the client query key is churn this plan does not need. Leave a one-line comment saying so.

- [ ] **Step 2: Verify against the live API**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 12
```

Then, with the server running and signed in, confirm the dropdown lists far more than three projects. If `ONEDOT_API_KEY` is unset the route already returns a 500 with `{ error }` — leave that behaviour.

- [ ] **Step 3: Commit**

```bash
git add server/routes/odoo.ts
git commit -m "Proxy the Onedot projects endpoint that carries the drive folder"
```

---

## Task 2: Resolve a project's Drive folder

**Files:** Create `server/lib/onedot.ts`, `server/lib/__tests__/onedot.test.ts`

**Interfaces:** Produces `findFolderId(projects, projectNumber): string | null` (pure) and `fetchOnedotProjects(): Promise<OnedotProject[]>`, consumed by Task 5.

The lookup is pure and gets tests; the fetch is not and does not.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { findFolderId, type OnedotProject } from "../onedot";

function project(fields: Partial<OnedotProject> & { project_number: string }): OnedotProject {
  return { id: 1, project_name: "Example", google_drive_folder: null, ...fields };
}

const PROJECTS: OnedotProject[] = [
  project({ id: 10, project_number: "25-002", project_name: "Mariposa - Giordani", google_drive_folder: "1Ph22vuz" }),
  project({ id: 11, project_number: "24-012", project_name: "No folder here", google_drive_folder: null }),
  project({ id: 12, project_number: "24-017", project_name: "Empty string folder", google_drive_folder: "" }),
];

describe("findFolderId", () => {
  it("finds the folder for a known project number", () => {
    expect(findFolderId(PROJECTS, "25-002")).toBe("1Ph22vuz");
  });

  it("returns null for a project that has no folder", () => {
    // 2 of 44 real projects are in this state; it is not an error.
    expect(findFolderId(PROJECTS, "24-012")).toBeNull();
  });

  it("treats an empty-string folder as absent, not as a folder id", () => {
    expect(findFolderId(PROJECTS, "24-017")).toBeNull();
  });

  it("returns null for a project number Onedot does not know", () => {
    expect(findFolderId(PROJECTS, "99-999")).toBeNull();
  });

  it("ignores surrounding whitespace on the project number", () => {
    expect(findFolderId(PROJECTS, "  25-002 ")).toBe("1Ph22vuz");
  });

  it("returns null rather than throwing when given no project number", () => {
    expect(findFolderId(PROJECTS, "")).toBeNull();
    expect(findFolderId(PROJECTS, null)).toBeNull();
  });

  it("returns null for an empty project list", () => {
    expect(findFolderId([], "25-002")).toBeNull();
  });
});
```

- [ ] **Step 2: Run them, confirm RED, record the output**

```bash
env -u DATABASE_URL ./node_modules/.bin/vitest run server/lib/__tests__/onedot.test.ts
```

- [ ] **Step 3: Implement**

```ts
/**
 * The Onedot project list. Only the fields this app reads are declared; the
 * endpoint returns 27.
 *
 * Matching is on `project_number`, which is populated and unique across all 44
 * projects. `odoo_id` is populated on 2 of 44 — it is not a usable key, and
 * neither is `projects.odoo_project_id`, which nothing writes.
 */
export interface OnedotProject {
  id: number;
  project_number: string;
  project_name: string;
  google_drive_folder: string | null;
}

/** The project's Drive folder, or null when Onedot has no folder for it. */
export function findFolderId(
  projects: OnedotProject[],
  projectNumber: string | null | undefined,
): string | null {
  const wanted = (projectNumber || "").trim();
  if (wanted === "") return null;

  const match = projects.find((p) => (p.project_number || "").trim() === wanted);
  // An empty string is how the API reports "no folder" for 2 of 44 projects;
  // passing it to Drive as a parent would be a 404 with a confusing message.
  return match?.google_drive_folder?.trim() || null;
}

export async function fetchOnedotProjects(): Promise<OnedotProject[]> {
  const apiKey = process.env.ONEDOT_API_KEY;
  if (!apiKey) throw new Error("ONEDOT_API_KEY is not set");

  const response = await fetch("https://one-api.dvele.com/projects", {
    headers: { Authorization: `Api-Key ${apiKey}` },
  });
  if (!response.ok) {
    throw new Error(`Onedot returned ${response.status}`);
  }
  return (await response.json()) as OnedotProject[];
}
```

- [ ] **Step 4: Make the proxy route use this fetch**

Task 1 repointed `server/routes/odoo.ts` with its own inline `fetch`. Now that
`fetchOnedotProjects()` exists, replace that inline call so there is one place that knows
the URL, the header shape and the API key:

```ts
import { fetchOnedotProjects } from "../lib/onedot";
```

Keep the route's own try/catch and its `{ error }` responses — `fetchOnedotProjects`
throws, and the route is what turns a throw into a 500 for the client. Confirm afterwards
that `grep -n "one-api.dvele.com" server` returns exactly one hit.

- [ ] **Step 5: Confirm GREEN, gates at 12, commit**

```bash
env -u DATABASE_URL npm test
npm run check 2>&1 | grep -c "error TS"
git add server/lib/onedot.ts server/lib/__tests__/onedot.test.ts server/routes/odoo.ts
git commit -m "Resolve a project's drive folder from the Onedot project list"
```

---

## Task 3: Schema

**Files:** Modify `shared/schema.ts`

**Interfaces:** Produces `contracts.googleDocId`, `contracts.googleDocUrl`.

- [ ] **Step 1: Enter plan mode** — `CLAUDE.md` requires it for schema changes. Present the two columns and get approval.

- [ ] **Step 2: Add the columns to `contracts`**

```ts
  googleDocId: text("google_doc_id"),
  googleDocUrl: text("google_doc_url"),
```

Nullable, no default. A contract that has never been exported has no Doc, and that must stay distinguishable from one exported to an empty string. Place them beside `filePath` / `fileName` / `fileHash`, which they parallel.

- [ ] **Step 3: Verify and commit**

```bash
npm run check 2>&1 | grep -c "error TS"   # expect 12
env -u DATABASE_URL npm test
npm run db:push
psql -d dvele -c "\d contracts" | grep google
```

Confirm both columns exist with no default.

```bash
git add shared/schema.ts
git commit -m "Record the exported google doc on the contract"
```

---

## Task 4: The Drive export module

**Files:** Create `server/lib/googleDrive.ts`, `server/lib/__tests__/googleDrive.test.ts`; modify `package.json`

**Interfaces:** Produces `isConfigured(): boolean`, `documentTitle(name): string`, `exportHtmlToGoogleDoc({ html, title, folderId }): Promise<{ docId, webViewLink }>`, and the error classes. Consumed by Task 5.

- [ ] **Step 1: Add the dependency**

```bash
npm install googleapis
```

- [ ] **Step 2: Write the failing tests for the pure part**

Only the title derivation and the configuration predicate are testable without Google. Do not mock the Drive client — a test asserting on a mock proves nothing about Drive.

```ts
import { afterEach, describe, expect, it } from "vitest";
import { documentTitle, isConfigured } from "../googleDrive";

const ORIGINAL = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  else process.env.GOOGLE_SERVICE_ACCOUNT_JSON = ORIGINAL;
});

describe("documentTitle", () => {
  it("strips a file extension", () => {
    // A Google Doc has no extension, and leaving one on is how someone
    // concludes it is a Word file and downloads it again.
    expect(documentTitle("Zaca Preserve MASTER_EF.pdf")).toBe("Zaca Preserve MASTER_EF");
    expect(documentTitle("contract.docx")).toBe("contract");
  });

  it("leaves a name with no extension alone", () => {
    expect(documentTitle("25-002 MASTER_EF")).toBe("25-002 MASTER_EF");
  });

  it("does not mistake a dotted project number for an extension", () => {
    expect(documentTitle("25-002 v1.2 MASTER_EF")).toBe("25-002 v1.2 MASTER_EF");
  });

  it("trims surrounding whitespace", () => {
    expect(documentTitle("  contract.pdf  ")).toBe("contract");
  });
});

describe("isConfigured", () => {
  it("is false when the service account key is absent", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    expect(isConfigured()).toBe(false);
  });

  it("is false when the key is present but not valid JSON", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = "not json";
    expect(isConfigured()).toBe(false);
  });

  it("is false when the JSON carries no private key", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: "a@b.com" });
    expect(isConfigured()).toBe(false);
  });

  it("is true for a key JSON with both fields", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "svc-export@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n",
    });
    expect(isConfigured()).toBe(true);
  });
});
```

- [ ] **Step 3: Run them, confirm RED, record the output**

- [ ] **Step 4: Implement**

```ts
import { google } from "googleapis";
import { Readable } from "node:stream";

/**
 * Exports generated contract HTML to a Google Doc.
 *
 * Drive performs the conversion: `files.create` names the **target** MIME type
 * in the request body while the uploaded bytes carry the **source** type. No
 * Docs API call is involved, so `drive` is the only scope needed.
 */

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const GOOGLE_DOC = "application/vnd.google-apps.document";

/** Configuration is missing — the caller should hide the feature, not fail. */
export class NotConfigured extends Error {}
/** Google refused or the upload failed — the caller should surface it. */
export class ExportFailed extends Error {}

function credentials(): { client_email: string; private_key: string } | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.client_email || !parsed?.private_key) return null;
    return parsed;
  } catch {
    // A malformed key is indistinguishable from an unset one to the caller:
    // both mean the feature cannot run. The difference is logged, not thrown.
    console.error("[googleDrive] GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
    return null;
  }
}

export function isConfigured(): boolean {
  return credentials() !== null;
}

/** A Google Doc has no file extension; leaving one on invites a re-download. */
export function documentTitle(name: string): string {
  return name.trim().replace(/\.(pdf|docx?|html?|zip)$/i, "");
}

export async function exportHtmlToGoogleDoc(options: {
  html: string;
  title: string;
  folderId: string;
}): Promise<{ docId: string; webViewLink: string }> {
  const creds = credentials();
  if (!creds) throw new NotConfigured("Google Drive export is not configured");

  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: [DRIVE_SCOPE] });
  const drive = google.drive({ version: "v3", auth });

  try {
    const created = await drive.files.create({
      requestBody: {
        name: documentTitle(options.title),
        mimeType: GOOGLE_DOC,        // the TARGET — this is the conversion
        parents: [options.folderId],
      },
      media: { mimeType: "text/html", body: Readable.from(options.html) },
      fields: "id, webViewLink",
      // Required for a shared drive. Without it the call fails or lands in the
      // wrong place, and the service account has no My Drive to fall back on.
      supportsAllDrives: true,
    });

    const docId = created.data.id;
    const webViewLink = created.data.webViewLink;
    if (!docId || !webViewLink) {
      throw new ExportFailed("Drive created the document but returned no id or link");
    }
    return { docId, webViewLink };
  } catch (error: any) {
    if (error instanceof ExportFailed) throw error;
    // Never log the parsed credentials; client_email is safe and is what
    // identifies which service account needs access to the folder.
    console.error(
      `[googleDrive] export failed as ${creds.client_email}:`,
      error?.message ?? error,
    );
    throw new ExportFailed(error?.message ?? "Google Drive rejected the export");
  }
}
```

- [ ] **Step 5: Confirm GREEN, gates at 12, commit**

```bash
env -u DATABASE_URL npm test
npm run check 2>&1 | grep -c "error TS"
git add server/lib/googleDrive.ts server/lib/__tests__/googleDrive.test.ts package.json package-lock.json
git commit -m "Add the google drive export module"
```

---

## Task 5: The export route

**Files:** Modify `server/routes/contracts.ts`

**Interfaces:** `POST /api/contracts/export-google-doc` with `{ projectId, contractType, templateId? }` — the same request shape as `download-pdf`, so Step 9 can call it the same way.

- [ ] **Step 1: Write the route**

Place it beside `download-pdf`. It mirrors that route's opening: resolve the project, resolve `templateId`, calculate pricing, **apply `reconciliationRefusal`** — an unreconciled project must not reach a Google Doc either — then generate with `format: 'html'` instead of rendering a PDF.

Order of operations, each failing with its own message:

1. `isConfigured()` false → **503** `{ error: "Google Doc export is not configured" }`. Not a 500: nothing is broken, the feature is off.
2. Project not found → 404.
3. `reconciliationRefusal` → 409, unchanged from the other entry points.
4. Folder resolution:

Superseded by the fix wave — see `server/routes/contracts.ts`. The project number is normalized with `onedotProjectNumber()` first, a number that is only a draft placeholder and a project Onedot has no folder for get distinct 409s, and a failure to reach Onedot returns 502 rather than falling through to the outer 500. There is no fallback folder.

5. Generate the HTML, export, persist, return `{ docId, webViewLink }`.

Persist onto the newest `contracts` row for this project and contract type when one exists:

```ts
    await db
      .update(contracts)
      .set({ googleDocId: docId, googleDocUrl: webViewLink })
      .where(eq(contracts.id, contractRow.id));
```

A project with no saved contract row still exports — the link is returned and simply not stored. Do not create a contract row as a side effect of exporting.

Catch `NotConfigured` → 503 and `ExportFailed` → 502 (`{ error }`), so a Google outage is not reported as our bug.

- [ ] **Step 2: Prove it with a throwaway script**

Every `/api` route is Cognito-gated, so drive the handler directly as the other plans in this repo did: import the router, walk `router.stack` for the path, call it with a fake `req`/`res`. Assert:

- unset `GOOGLE_SERVICE_ACCOUNT_JSON` → 503, and **no Drive call is attempted**
- a project whose number is not in Onedot → 409 naming the project number
- an unreconciled project → 409 from the reconciliation gate, before any Drive call
- a good project → 200 with a `webViewLink`, and the `contracts` row carries both new columns

The last one needs real credentials and writes a real document. Do it once, then trash the created file in Drive (**trash, not delete** — a contributor cannot delete, and `files.delete` returns 404).

- [ ] **Step 3: Verify and commit**

```bash
npm run check 2>&1 | grep -c "error TS"
env -u DATABASE_URL npm test
git add server/routes/contracts.ts
git commit -m "Add the google doc export route"
```

---

## Task 6: The Step 9 button

**Files:** Modify `server/routes/contracts.ts`, `client/src/components/wizard/steps/Step9ReviewGenerate.tsx`

**Interfaces:** Produces `GET /api/contracts/google-doc-export/status` → `{ configured: boolean }`. Consumes `POST /api/contracts/export-google-doc`.

- [ ] **Step 1: Expose whether the feature is configured**

The button must not appear when the server has no key. There is **no capabilities endpoint in this repo** — `server/routes/system.ts` carries only dashboard stats and variable mappings, and no client code reads server capabilities — so add a small one beside the export route rather than inventing a general mechanism:

```ts
router.get("/contracts/google-doc-export/status", async (_req, res) => {
  res.json({ configured: isConfigured() });
});
```

It reports only a boolean: never the `client_email`, never any part of the key.

Register nothing new — `contracts.ts` is already mounted. In Step 9, read it with TanStack Query, keyed `['/api/contracts/google-doc-export/status']`, which the default query function resolves from the key itself.

- [ ] **Step 2: Add the button**

Beside the existing per-contract Download control in `handleDownload`'s row. Follow the file's existing pending pattern (`isDownloading` holds the contract type being worked on):

- label **Export to Google Doc**, hidden entirely when not configured
- while in flight: a spinner and `Saving…` — real ellipsis, matching the repo's other pending copy
- on success: the contract row shows an **Open in Google Docs** link to `webViewLink`, `target="_blank"` with `rel="noreferrer"`
- on 409 or 503: show the server's `error` string verbatim — it names the project number or says the feature is off, and both are actionable
- icon-only controls need `aria-label`; the error needs `role="alert"`

Do not disable the button while the pricing query is loading; disable it only while its own request is in flight.

- [ ] **Step 3: Verify**

Gates, then a browser pass: sign in, reach Step 9, export, and confirm the Doc appears **in that project's Onedot folder**. Open it and check the contract renders as a document rather than as one long HTML blob.

```bash
npm run check 2>&1 | grep -c "error TS"
./node_modules/.bin/vite build
git add client/src/components/wizard/steps/Step9ReviewGenerate.tsx
git commit -m "Add the export to google doc control to step 9"
```

---

## Task 7: End to end, and write down what the conversion actually did

**Files:** Modify `docs/phase-property-model-open-items.md` (or a new `docs/google-doc-export-notes.md` if that file feels wrong to extend)

**Interfaces:** Consumes everything above.

The conversion is Google's, so its fidelity **cannot be asserted in a test**. The only way to know what it does to this app's HTML is to look.

- [ ] **Step 1: Export a full MASTER_EF and read it**

Use project `25-002` (Onedot: "Mariposa - Giordani", folder already attached). Check each exhibit against the PDF of the same contract:

| Check | Why it might not survive |
|---|---|
| Exhibit tables keep their columns and borders | Drive's HTML importer re-flows tables |
| C.2's inline SVG checkmarks | SVG may be dropped entirely — this is the most likely casualty |
| Page breaks between exhibits | `<!-- EXHIBIT_PAGE_BREAK -->` and CSS page breaks have no Docs equivalent |
| Headings keep their hierarchy | Inline styles may not map to Docs heading styles |
| Currency and dates | Plain text, should be safe — confirm anyway |
| Signature blocks | Table-based layout, same risk as the exhibit tables |

- [ ] **Step 2: Record the result**

Write down what survived and what did not, with the same honesty the phase-property-model notes use. If SVG checkmarks vanish, that is a finding worth its own follow-up — C.2 already lost content in Plan E and a second loss in the Doc path compounds it.

- [ ] **Step 3: Commit**

```bash
git commit -m "Record what the google doc conversion preserves"
```

## Deliverable

A contract generated in the wizard can be exported to a Google Doc in that project's own Drive folder, with the link recorded on the contract.

## Deferred

| Item | Why |
|---|---|
| Exporting the whole package (`download-all-zip`) | A zip has no Google-native equivalent; it would mean unpacking and converting each member separately. |
| Replacing PDF download | The ask was to add a Google Doc path, not remove the PDF. Both stay until someone decides otherwise. |
| Renaming `/api/odoo/projects` to `/api/onedot/projects` | The upstream is Onedot; the path, file and client query key are all misnamed. Churn without benefit today. |
| Moving the service-account key out of plain task-def env | Needs an admin to grant the task role SSM or Secrets Manager access. Decide before this ships to `dev`. |
