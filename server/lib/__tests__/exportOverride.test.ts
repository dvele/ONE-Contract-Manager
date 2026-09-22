import { describe, expect, it } from "vitest";
import { exportFolderOverride } from "../contractFolder";

/**
 * Iterating on document formatting means creating and discarding many drafts,
 * and the service account cannot delete from the shared drive — `canDelete` and
 * `canTrash` are both false there, so every test export would be litter in a
 * client folder that only a human can clear.
 *
 * The override redirects exports to a folder we can delete from. It is ignored
 * in production, so it cannot quietly send real agreements to the wrong place.
 */
describe("exportFolderOverride", () => {
  it("returns the folder id when set outside production", () => {
    expect(
      exportFolderOverride({ NODE_ENV: "development", GOOGLE_DRIVE_EXPORT_FOLDER_OVERRIDE: "abc123" }),
    ).toBe("abc123");
  });

  it("is ignored in production, however it is set", () => {
    // The guard is the whole point: a stray value in a deployed task
    // definition would otherwise file every client's agreement together.
    expect(
      exportFolderOverride({ NODE_ENV: "production", GOOGLE_DRIVE_EXPORT_FOLDER_OVERRIDE: "abc123" }),
    ).toBeNull();
  });

  it("returns null when unset", () => {
    expect(exportFolderOverride({ NODE_ENV: "development" })).toBeNull();
  });

  it("treats an empty or whitespace-only value as unset", () => {
    expect(exportFolderOverride({ NODE_ENV: "development", GOOGLE_DRIVE_EXPORT_FOLDER_OVERRIDE: "" })).toBeNull();
    expect(exportFolderOverride({ NODE_ENV: "development", GOOGLE_DRIVE_EXPORT_FOLDER_OVERRIDE: "   " })).toBeNull();
  });

  it("trims a value that arrived with whitespace", () => {
    expect(
      exportFolderOverride({ NODE_ENV: "development", GOOGLE_DRIVE_EXPORT_FOLDER_OVERRIDE: "  abc123 " }),
    ).toBe("abc123");
  });
});
