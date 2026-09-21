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
