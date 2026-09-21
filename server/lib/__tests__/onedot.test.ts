import { describe, expect, it } from "vitest";
import { findFolderId, type OnedotProject } from "../onedot";

function project(fields: Partial<OnedotProject> & { project_number: string }): OnedotProject {
  return { id: 1, project_name: "Example", google_drive_folder: null, ...fields };
}

const PROJECTS: OnedotProject[] = [
  project({ id: 10, project_number: "25-002", project_name: "Mariposa - Giordani", google_drive_folder: "1Ph22vuz" }),
  project({ id: 11, project_number: "24-012", project_name: "No folder here", google_drive_folder: null }),
  project({ id: 12, project_number: "24-017", project_name: "Empty string folder", google_drive_folder: "" }),
];

describe("findFolderId", () => {
  it("finds the folder for a known project number", () => {
    expect(findFolderId(PROJECTS, "25-002")).toBe("1Ph22vuz");
  });

  it("returns null for a project that has no folder", () => {
    // 2 of 44 real projects are in this state; it is not an error.
    expect(findFolderId(PROJECTS, "24-012")).toBeNull();
  });

  it("treats an empty-string folder as absent, not as a folder id", () => {
    expect(findFolderId(PROJECTS, "24-017")).toBeNull();
  });

  it("returns null for a project number Onedot does not know", () => {
    expect(findFolderId(PROJECTS, "99-999")).toBeNull();
  });

  it("ignores surrounding whitespace on the project number", () => {
    expect(findFolderId(PROJECTS, "  25-002 ")).toBe("1Ph22vuz");
  });

  it("returns null rather than throwing when given no project number", () => {
    expect(findFolderId(PROJECTS, "")).toBeNull();
    expect(findFolderId(PROJECTS, null)).toBeNull();
  });

  it("returns null for an empty project list", () => {
    expect(findFolderId([], "25-002")).toBeNull();
  });
});
