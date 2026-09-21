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
        mimeType: GOOGLE_DOC, // the TARGET — this is the conversion
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
