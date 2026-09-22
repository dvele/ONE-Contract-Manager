import { google } from "googleapis";
import { readFileSync } from "node:fs";
import { Readable } from "node:stream";
import { resolveContractFolder, type ContractFolder } from "./contractFolder";
import { planDocumentFormatting, type DocParagraph, type DocTable } from "./docsFormatting";

/**
 * Exports generated contract HTML to a Google Doc.
 *
 * Drive performs the conversion: `files.create` names the **target** MIME type
 * in the request body while the uploaded bytes carry the **source** type.
 *
 * A second pass over the Docs API then lays the document out. That pass is the
 * only reason this module needs more than the `drive` scope: the conversion
 * discards CSS page breaks, so nothing else can place them.
 */

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
/**
 * Needed for the layout pass below. Drive alone cannot place a page break:
 * its HTML-to-Docs conversion discards CSS breaks entirely, so the exported
 * agreement breaks wherever the text runs out.
 */
const DOCS_SCOPE = "https://www.googleapis.com/auth/documents";
const SCOPES = [DRIVE_SCOPE, DOCS_SCOPE];
const GOOGLE_DOC = "application/vnd.google-apps.document";
const FOLDER = "application/vnd.google-apps.folder";
/**
 * Where exports go when the project has nowhere to file them — a hand-entered
 * project with no Onedot record, or one whose Drive folder has no sales
 * subfolder. Lives in the service account's own Drive, which is the only place
 * it owns what it creates.
 */
const UNFILED_FOLDER_NAME = "ONE Contract Manager - Unfiled Contracts";
/**
 * Unfiled contracts are shared with the whole company, not just whoever ran the
 * export — a colleague opening the contract would otherwise follow the stored
 * "View Google Doc" link into a permission error.
 *
 * Granted on the folder rather than each document: Drive files inherit their
 * parent's permissions, so one grant covers every export, including those made
 * before the grant existed.
 */
const SHARE_DOMAIN = "dvele.com";

/** Configuration is missing — the caller should hide the feature, not fail. */
export class NotConfigured extends Error {}
/** Google refused or the upload failed — the caller should surface it. */
export class ExportFailed extends Error {}

type ServiceAccountKey = { client_email: string; private_key: string };

function parseKey(raw: string, source: string): ServiceAccountKey | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.client_email !== "string" || typeof parsed?.private_key !== "string") {
      return null;
    }
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    // A malformed key is indistinguishable from an unset one to the caller:
    // both mean the feature cannot run. The difference is logged, not thrown —
    // and never with the contents, which are a private key either way.
    console.error(`[googleDrive] ${source} is not valid JSON`);
    return null;
  }
}

/**
 * The service account key, from the inline JSON or from a file.
 *
 * Inline wins when both are set: it is the only shape a deployed container has,
 * so a stray local path must not be able to displace it.
 */
function credentials(): ServiceAccountKey | null {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline) return parseKey(inline, "GOOGLE_SERVICE_ACCOUNT_JSON");

  const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (!keyFilePath) return null;

  let contents: string;
  try {
    contents = readFileSync(keyFilePath, "utf8");
  } catch (error) {
    // The likeliest local misconfiguration, so name the path — it is not a
    // secret, and a wrong one is otherwise silent.
    console.error(
      `[googleDrive] could not read GOOGLE_SERVICE_ACCOUNT_KEY_FILE at ${keyFilePath}:`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }

  return parseKey(contents, `GOOGLE_SERVICE_ACCOUNT_KEY_FILE (${keyFilePath})`);
}

export function isConfigured(): boolean {
  return credentials() !== null;
}

/** A Google Doc has no file extension; leaving one on invites a re-download. */
export function documentTitle(name: string): string {
  return name.trim().replace(/\.(pdf|docx?|html?|zip)$/i, "");
}

/**
 * The contract subfolder inside a project's Drive folder, or null when the
 * project uses a layout that has none.
 *
 * Onedot names the project root; contracts belong in a sales subfolder beneath
 * it. See contractFolder.ts for the conventions and why matching is by pattern.
 */
export async function resolveProjectContractFolder(
  projectFolderId: string,
): Promise<ContractFolder | null> {
  const creds = credentials();
  if (!creds) throw new NotConfigured("Google Drive export is not configured");

  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: SCOPES });
  const drive = google.drive({ version: "v3", auth });

  return resolveContractFolder(projectFolderId, async (parentId) => {
    const listed = await drive.files.list({
      q: `'${parentId}' in parents and trashed=false and mimeType='${FOLDER}'`,
      fields: "files(id,name)",
      // Project folders live on a shared drive; without both of these the list
      // comes back empty and every project looks like it has no subfolders.
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 100,
    });
    return (listed.data.files ?? [])
      .filter((f): f is { id: string; name: string } => !!f.id && !!f.name)
      .map((f) => ({ id: f.id, name: f.name }));
  }, async (parentId, name) => {
    const created = await drive.files.create({
      requestBody: { name, mimeType: FOLDER, parents: [parentId] },
      fields: "id, name",
      supportsAllDrives: true,
    });
    if (!created.data.id) {
      throw new ExportFailed(`Drive created "${name}" but returned no id`);
    }
    console.log(`[googleDrive] created contract folder "${name}" under ${parentId}`);
    return { id: created.data.id, name: created.data.name ?? name };
  });
}


/**
 * Places the page breaks and groups headings with what follows.
 *
 * Runs after the upload because the conversion is what produces the paragraphs
 * this reads. Failure is deliberately swallowed: the document is already in
 * Drive and correct apart from where it breaks, so refusing the export over a
 * layout pass would throw away a generation that succeeded.
 */
async function applyDocumentLayout(
  auth: InstanceType<typeof google.auth.GoogleAuth>,
  documentId: string,
): Promise<number> {
  const docs = google.docs({ version: "v1", auth });
  try {
    const doc = await docs.documents.get({ documentId });
    const paragraphs: DocParagraph[] = (doc.data.body?.content ?? [])
      .filter((el) => el.paragraph && el.startIndex != null && el.endIndex != null)
      .map((el) => ({
        startIndex: el.startIndex!,
        endIndex: el.endIndex!,
        text: (el.paragraph!.elements ?? []).map((e) => e.textRun?.content ?? "").join(""),
        namedStyleType: el.paragraph!.paragraphStyle?.namedStyleType ?? undefined,
      }));

    const tableText = (t: any): string =>
      (t.tableRows ?? [])
        .flatMap((r: any) => r.tableCells ?? [])
        .flatMap((cell: any) => cell.content ?? [])
        .flatMap((el: any) => el.paragraph?.elements ?? [])
        .map((e: any) => e.textRun?.content ?? "")
        .join("");

    const tables: DocTable[] = (doc.data.body?.content ?? [])
      .filter((el) => el.table && el.startIndex != null)
      .map((el) => ({
        startIndex: el.startIndex!,
        rowCount: el.table!.tableRows?.length ?? 0,
        text: tableText(el.table),
      }));

    const requests = planDocumentFormatting(paragraphs, tables);
    if (requests.length === 0) return 0;
    await docs.documents.batchUpdate({ documentId, requestBody: { requests: requests as any } });
    return requests.length;
  } catch (error) {
    console.error(
      "[googleDrive] layout pass failed; the document is exported but breaks where the text runs out:",
      error instanceof Error ? error.message : String(error),
    );
    return 0;
  }
}

/**
 * The unfiled folder in the service account's own Drive, created on first use.
 *
 * Found by name rather than stored, so no configuration has to be kept in step
 * and a deleted folder simply comes back.
 */
export async function resolveUnfiledFolder(): Promise<string> {
  const creds = credentials();
  if (!creds) throw new NotConfigured("Google Drive export is not configured");
  const drive = google.drive({ version: "v3", auth: new google.auth.GoogleAuth({ credentials: creds, scopes: SCOPES }) });

  const existing = await drive.files.list({
    q: `name='${UNFILED_FOLDER_NAME}' and mimeType='${FOLDER}' and trashed=false and 'me' in owners`,
    fields: "files(id)",
  });
  let folderId = existing.data.files?.[0]?.id;

  if (!folderId) {
    const made = await drive.files.create({
      requestBody: { name: UNFILED_FOLDER_NAME, mimeType: FOLDER },
      fields: "id",
    });
    if (!made.data.id) throw new ExportFailed("Drive created the unfiled folder but returned no id");
    folderId = made.data.id;
    console.log(`[googleDrive] created "${UNFILED_FOLDER_NAME}" in the service account's Drive`);
  }

  // Idempotent: re-granting an existing domain permission returns the same one,
  // so this needs no "has it already" check and self-heals if the grant is
  // removed. A failure here is not fatal — the export still works, it is just
  // only visible to the service account, which the log says plainly.
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { type: "domain", domain: SHARE_DOMAIN, role: "writer" },
      sendNotificationEmail: false,
    });
  } catch (error) {
    console.error(
      `[googleDrive] could not share "${UNFILED_FOLDER_NAME}" with ${SHARE_DOMAIN}; ` +
      `unfiled exports will not be visible to colleagues:`,
      error instanceof Error ? error.message : String(error),
    );
  }

  return folderId;
}

/**
 * Grants someone write access to a document.
 *
 * An unfiled export lives in the service account's Drive, where nobody else can
 * see it. Without this the export would succeed and return a link that its
 * recipient cannot open. No notification mail: the service account is not a
 * mailbox anyone should receive from, and the document shows under "Shared with
 * me" regardless.
 */
export async function shareDocumentWith(documentId: string, email: string): Promise<void> {
  const creds = credentials();
  if (!creds) throw new NotConfigured("Google Drive export is not configured");
  const drive = google.drive({ version: "v3", auth: new google.auth.GoogleAuth({ credentials: creds, scopes: SCOPES }) });
  await drive.permissions.create({
    fileId: documentId,
    requestBody: { type: "user", role: "writer", emailAddress: email },
    sendNotificationEmail: false,
    supportsAllDrives: true,
  });
}

export async function exportHtmlToGoogleDoc(options: {
  html: string;
  title: string;
  folderId: string;
}): Promise<{ docId: string; webViewLink: string }> {
  const creds = credentials();
  if (!creds) throw new NotConfigured("Google Drive export is not configured");

  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: SCOPES });
  const drive = google.drive({ version: "v3", auth });

  try {
    const created = await drive.files.create({
      requestBody: {
        name: documentTitle(options.title),
        mimeType: GOOGLE_DOC, // the TARGET — this is the conversion
        parents: [options.folderId],
      },
      // The bytes are UTF-8, and the historical default for text/* is
      // ISO-8859-1. The clause library is not ASCII — §, en-dashes and curly
      // quotes — so an undeclared charset mojibakes the legal text.
      media: { mimeType: "text/html; charset=utf-8", body: Readable.from(options.html) },
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
    const applied = await applyDocumentLayout(auth, docId);
    if (applied > 0) console.log(`[googleDrive] layout: ${applied} page-break/keep-with-next edits applied`);

    return { docId, webViewLink };
  } catch (error: any) {
    if (error instanceof ExportFailed) throw error;
    // A googleapis failure is typically a GaxiosError, which carries
    // response.config — including the Authorization header, a live bearer
    // token. Never pass the raw error to console.error: `error?.message ??
    // error` only guards null/undefined, so a non-Error rejection would print
    // the live object. Stringify first; client_email is safe and is what
    // identifies which service account needs access to the folder.
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[googleDrive] export failed as ${creds.client_email}:`, detail);
    throw new ExportFailed(detail);
  }
}
