/**
 * Where a generated contract belongs inside a project's Drive folder.
 *
 * Onedot's `google_drive_folder` names the project root. Dropping the document
 * there is a misfile: contracts live in a sales subfolder, and two conventions
 * are in use across the 42 projects that have a folder.
 *
 *   A — 39 of 42:  <project>/02 SALES INFO - CONTRACT, SPECS, BUDGETS, INVOICES
 *   B —  3 of 42:  <project>/01 Sales & Commercial/02. Sales Contract
 *
 * Matching is by pattern, not by exact name: the numeric prefix carries a dot
 * on some projects ("01. Sales & Commercial" on 26-001) and not on others, and
 * casing is inconsistent. The patterns are anchored so that a loose file named
 * "Old Sales Contract superseded" cannot win.
 *
 * This module holds no Drive client. It takes a lister, so the walk is a pure
 * function of what Drive returned and is tested without network access.
 */

export interface DriveFolder {
  id: string;
  name: string;
}

/** Lists the *folders* directly inside a parent. */
export type ListFolders = (parentId: string) => Promise<DriveFolder[]>;

/** Creates a folder inside a parent and returns it. */
export type CreateFolder = (parentId: string, name: string) => Promise<DriveFolder>;

/**
 * The name given to a contract folder this module creates.
 *
 * Spelled as convention B already spells it on 25-002, dot included, so a
 * created folder is indistinguishable from a hand-made one.
 */
export const CONTRACT_FOLDER_NAME = "02. Sales Contract";

/**
 * A destination override for local testing, or null.
 *
 * The service account cannot delete from the shared drive (`canDelete` and
 * `canTrash` are both false on files it creates there), so every export while
 * iterating on formatting would be permanent litter in a client folder. Setting
 * `GOOGLE_DRIVE_EXPORT_FOLDER_OVERRIDE` sends exports somewhere deletable
 * instead — the service account's own Drive, where it owns what it creates.
 *
 * Ignored when `NODE_ENV=production`, so a value left in a deployed task
 * definition cannot file real agreements into one folder.
 */
export function exportFolderOverride(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.NODE_ENV === "production") return null;
  const id = env.GOOGLE_DRIVE_EXPORT_FOLDER_OVERRIDE?.trim();
  return id ? id : null;
}

export interface ContractFolder {
  folderId: string;
  /** The folder names walked from the project root, for logs and refusals. */
  path: string[];
}

/** `01 Sales & Commercial`, with or without the dot. */
const SALES_AND_COMMERCIAL = /^0?1\.?\s+sales\s*&\s*commercial$/i;
/** `02. Sales Contract`, with or without the dot. */
const SALES_CONTRACT = /^0?2\.?\s+sales\s+contract$/i;
/** `02 SALES INFO - CONTRACT, SPECS, BUDGETS, INVOICES`, however it continues. */
const SALES_INFO = /^0?2\.?\s+sales\s+info\b/i;

function find(folders: DriveFolder[], pattern: RegExp): DriveFolder | undefined {
  return folders.find((f) => pattern.test((f.name ?? "").trim()));
}

/**
 * The folder a contract should be written to, or null when neither convention
 * is present — in which case the caller refuses rather than filing it at the
 * root, which is what `2896bf6` established for unresolvable inputs.
 */
export async function resolveContractFolder(
  projectFolderId: string,
  listFolders: ListFolders,
  createFolder?: CreateFolder,
): Promise<ContractFolder | null> {
  const top = await listFolders(projectFolderId);

  // B first: it is the more specific shape. A project carrying B's outer
  // folder but not its inner one (26-001's is empty) still gets A's chance.
  const salesAndCommercial = find(top, SALES_AND_COMMERCIAL);
  if (salesAndCommercial) {
    const contract = find(await listFolders(salesAndCommercial.id), SALES_CONTRACT);
    if (contract) {
      return {
        folderId: contract.id,
        path: [salesAndCommercial.name.trim(), contract.name.trim()],
      };
    }
  }

  const salesInfo = find(top, SALES_INFO);
  if (salesInfo) {
    return { folderId: salesInfo.id, path: [salesInfo.name.trim()] };
  }

  // Last resort, and only for the newest layout: a sales folder with no
  // contract folder under it (25-003, 26-001). Creating is deliberately ranked
  // below convention A so a project that already files contracts somewhere
  // never gains a second, empty home — and it needs a sensible parent, so the
  // legacy layouts with no sales folder still refuse rather than inventing one.
  if (salesAndCommercial && createFolder) {
    const created = await createFolder(salesAndCommercial.id, CONTRACT_FOLDER_NAME);
    return {
      folderId: created.id,
      path: [salesAndCommercial.name.trim(), created.name.trim()],
    };
  }

  return null;
}

/** Where an export should be written. */
export type ExportDestination =
  | { kind: "project"; folderId: string; path: string[] }
  | { kind: "fallback"; reason: string };

/**
 * Picks the destination, preferring the project's own contract folder.
 *
 * Two cases have nowhere to file: a project entered by hand, which has no
 * Onedot record and so no Drive folder, and a project whose folder uses a
 * layout with no sales subfolder (the legacy 01 ADMIN / 02 DESIGN shape, 13 of
 * 42 projects). Refusing those would withhold the export from exactly the
 * projects that need somewhere to put the document, so they fall back to the
 * service account's own Drive — the one place it owns what it creates, and can
 * therefore also share and clean up.
 */
export function chooseExportDestination(
  projectFolderId: string | null,
  contractFolder: ContractFolder | null,
): ExportDestination {
  if (!projectFolderId) {
    return {
      kind: "fallback",
      reason: "the project has no Google Drive folder in Onedot",
    };
  }
  if (!contractFolder) {
    return {
      kind: "fallback",
      reason: "the project's Drive folder has no contract subfolder",
    };
  }
  return { kind: "project", folderId: contractFolder.folderId, path: contractFolder.path };
}
