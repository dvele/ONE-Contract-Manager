import { describe, expect, it } from "vitest";
import { chooseExportDestination } from "../contractFolder";

/**
 * Not every project can be filed. A project entered by hand has no Onedot
 * record to link to, and 2 of 44 Onedot projects carry no Drive folder at all —
 * so refusing the export in those cases would withhold the feature from exactly
 * the projects that have nowhere to put the document.
 *
 * Those exports go to the service account's own Drive instead, where it owns
 * what it creates. The caller shares the result with the person who asked for
 * it, because a document in that Drive is invisible to everyone else.
 */
describe("chooseExportDestination", () => {
  const FOLDER = { folderId: "contract-folder", path: ["01 Sales & Commercial", "02. Sales Contract"] };

  it("files into the project's contract folder when there is one", () => {
    const d = chooseExportDestination("project-root", FOLDER);
    expect(d).toEqual({ kind: "project", folderId: "contract-folder", path: FOLDER.path });
  });

  it("falls back when the project has no Drive folder", () => {
    // A hand-entered project, or one of the Onedot projects with no folder.
    const d = chooseExportDestination(null, null);
    expect(d.kind).toBe("fallback");
  });

  it("falls back when the project folder has no contract subfolder", () => {
    // A legacy layout: 01 ADMIN / 02 DESIGN / 03 PRE SALES, nowhere to file.
    const d = chooseExportDestination("project-root", null);
    expect(d.kind).toBe("fallback");
  });

  it("says why it fell back, so the reason reaches the log and the caller", () => {
    expect((chooseExportDestination(null, null) as any).reason).toMatch(/no Google Drive folder/i);
    expect((chooseExportDestination("project-root", null) as any).reason).toMatch(/no contract subfolder/i);
  });

  it("never reports a fallback as a project filing", () => {
    for (const d of [chooseExportDestination(null, null), chooseExportDestination("root", null)]) {
      expect(d).not.toHaveProperty("folderId");
    }
  });
});
