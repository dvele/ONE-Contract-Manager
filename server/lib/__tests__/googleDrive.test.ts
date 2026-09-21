import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { documentTitle, isConfigured } from "../googleDrive";

const ORIGINAL_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const ORIGINAL_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;

/** Temp directories made by a test, removed after it. */
const scratch: string[] = [];

function restore(name: string, original: string | undefined) {
  if (original === undefined) delete process.env[name];
  else process.env[name] = original;
}

afterEach(() => {
  restore("GOOGLE_SERVICE_ACCOUNT_JSON", ORIGINAL_JSON);
  restore("GOOGLE_SERVICE_ACCOUNT_KEY_FILE", ORIGINAL_FILE);
  while (scratch.length > 0) rmSync(scratch.pop()!, { recursive: true, force: true });
});

/** Writes a real file rather than mocking fs: the point is that the read works. */
function keyFile(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), "gdrive-key-"));
  scratch.push(dir);
  const path = join(dir, "servicecreds.json");
  writeFileSync(path, contents, "utf8");
  return path;
}

const VALID_KEY = JSON.stringify({
  client_email: "svc-export@project.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n",
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

  it("is false when client_email is present but not a string", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: 12345,
      private_key: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n",
    });
    expect(isConfigured()).toBe(false);
  });
});

describe("isConfigured with a key file", () => {
  it("is true for a path to a valid key file", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE = keyFile(VALID_KEY);
    expect(isConfigured()).toBe(true);
  });

  it("is false when the path points at no file", () => {
    // The likeliest local mistake: a typo, or a relative path resolved from a
    // different working directory than expected.
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE = join(tmpdir(), "does-not-exist-9e3f.json");
    expect(isConfigured()).toBe(false);
  });

  it("is false when the file is not valid JSON", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE = keyFile("not json at all");
    expect(isConfigured()).toBe(false);
  });

  it("is false when the file is valid JSON but carries no private key", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE = keyFile(
      JSON.stringify({ client_email: "svc@project.iam.gserviceaccount.com" }),
    );
    expect(isConfigured()).toBe(false);
  });

  it("is false when neither variable is set", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
    expect(isConfigured()).toBe(false);
  });

  it("prefers the inline JSON when both are set, so a stray local path cannot displace deployed config", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = VALID_KEY;
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE = keyFile("not json at all");
    expect(isConfigured()).toBe(true);
  });

  it("does not fall back to the file when the inline JSON is malformed", () => {
    // Inline is the deployed shape. If it is set and broken, that is the fault
    // to surface — silently using a local file would hide a broken deploy.
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = "not json at all";
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE = keyFile(VALID_KEY);
    expect(isConfigured()).toBe(false);
  });
});
