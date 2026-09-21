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

  it("is false when client_email is present but not a string", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: 12345,
      private_key: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n",
    });
    expect(isConfigured()).toBe(false);
  });
});
