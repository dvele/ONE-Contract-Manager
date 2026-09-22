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

/**
 * The project number Onedot would know, or null when there is none.
 *
 * The wizard suffixes every draft it creates — `${projectNumber}-DRAFT-${id}`
 * when the user has entered a number, `DRAFT-${Date.now()}-${id}` when they
 * have not (WizardContext.tsx:1174-1176 and :1765-1766). `projects.
 * project_number` is UNIQUE and `PATCH /projects` silently drops a colliding
 * number, so only the first package for a project ever stores the clean one.
 * Onedot knows the base number and nothing else.
 */
export function onedotProjectNumber(n: string | null | undefined): string | null {
  // Trim before stripping, not after: the suffix is anchored to the end of the
  // string, so trailing whitespace would hide it from the pattern. The suffix
  // can appear more than once — resuming a draft loads the stored suffixed
  // number back into the wizard and saveDraft re-suffixes it.
  const base = (n ?? "").trim().replace(/(-DRAFT-[A-Z0-9]+)+$/i, "");
  // `DRAFT-<timestamp>-<id>` carries no project number at all.
  return base === "" || /^DRAFT-/i.test(base) ? null : base;
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

/** The folder for the Onedot record with this id, or null. */
export function findFolderByOnedotId(
  projects: OnedotProject[],
  odooProjectId: number | null | undefined,
): string | null {
  if (odooProjectId == null) return null;
  const match = projects.find((p) => p.id === odooProjectId);
  return match?.google_drive_folder?.trim() || null;
}

/**
 * The project's Drive folder, by the strongest key available.
 *
 * `projects.odooProjectId` is written when the user picks a project from the
 * Onedot combobox, so it names the record they actually chose. The project
 * number is the fallback, and a weak one: the wizard suffixes it with
 * `-DRAFT-…`, it collides under a UNIQUE constraint so only the first package
 * keeps the clean value, and a generated number (`2026-001`, four-digit year)
 * matches no Onedot row at all — Onedot's own numbers are `25-002`.
 *
 * The fallback still runs when the id is absent (every project created before
 * the id was persisted), stale, or points at one of the projects Onedot has no
 * folder for.
 */
export function resolveFolderId(
  projects: OnedotProject[],
  odooProjectId: number | null | undefined,
  projectNumber: string | null | undefined,
): string | null {
  return (
    findFolderByOnedotId(projects, odooProjectId) ??
    findFolderId(projects, onedotProjectNumber(projectNumber))
  );
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
