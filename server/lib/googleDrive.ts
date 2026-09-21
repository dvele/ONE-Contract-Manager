import { google } from "googleapis";
import { readFileSync } from "node:fs";
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
