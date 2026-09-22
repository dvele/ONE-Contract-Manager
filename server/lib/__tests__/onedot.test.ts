import { describe, expect, it } from "vitest";
import { findFolderId, onedotProjectNumber, resolveFolderId, type OnedotProject } from "../onedot";

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

describe("onedotProjectNumber", () => {
  it("leaves a clean project number unchanged", () => {
    expect(onedotProjectNumber("25-002")).toBe("25-002");
    expect(onedotProjectNumber("2026-001")).toBe("2026-001");
  });

  it("strips the wizard's draft suffix", () => {
    // WizardContext.tsx:1176 and :1765 build `${projectNumber}-DRAFT-${uniqueId}`,
    // where uniqueId is Math.random().toString(36).slice(2, 8).toUpperCase().
    expect(onedotProjectNumber("25-002-DRAFT-SAVAP7")).toBe("25-002");
    expect(onedotProjectNumber("24-017-DRAFT-9")).toBe("24-017");
  });

  it("strips a lowercase or mixed-case suffix", () => {
    expect(onedotProjectNumber("25-002-draft-savap7")).toBe("25-002");
    expect(onedotProjectNumber("25-002-Draft-Savap7")).toBe("25-002");
  });

  it("strips a suffix applied twice", () => {
    // Resuming a draft loads the stored, already-suffixed number into
    // projectData, and saveDraft re-suffixes it without the autosave path's
    // `includes('DRAFT')` guard.
    expect(onedotProjectNumber("25-002-DRAFT-ABC123-DRAFT-XYZ789")).toBe("25-002");
  });

  it("ignores surrounding whitespace", () => {
    expect(onedotProjectNumber("  25-002-DRAFT-SAVAP7  ")).toBe("25-002");
    expect(onedotProjectNumber(" 25-002 ")).toBe("25-002");
  });

  it("returns null for a draft that never carried a project number", () => {
    // WizardContext.tsx:1174 and :1766 build `DRAFT-${Date.now()}-${uniqueId}`.
    expect(onedotProjectNumber("DRAFT-1758412345678-SAVAP7")).toBeNull();
    expect(onedotProjectNumber("draft-1758412345678-savap7")).toBeNull();
    expect(onedotProjectNumber("DRAFT-1758412345678-SAVAP7-DRAFT-XYZ789")).toBeNull();
  });

  it("returns null for empty, whitespace-only, null and undefined input", () => {
    expect(onedotProjectNumber("")).toBeNull();
    expect(onedotProjectNumber("   ")).toBeNull();
    expect(onedotProjectNumber(null)).toBeNull();
    expect(onedotProjectNumber(undefined)).toBeNull();
    expect(onedotProjectNumber("-DRAFT-SAVAP7")).toBeNull();
  });

  it("does not strip a draft suffix that is not at the end", () => {
    expect(onedotProjectNumber("25-002-DRAFT-SAVAP7-PHASE2")).toBe("25-002-DRAFT-SAVAP7-PHASE2");
    expect(onedotProjectNumber("25-DRAFT-X-002")).toBe("25-DRAFT-X-002");
  });

  it("feeds findFolderId so a suffixed draft resolves the base project's folder", () => {
    expect(findFolderId(PROJECTS, onedotProjectNumber("25-002-DRAFT-SAVAP7"))).toBe("1Ph22vuz");
  });
});

describe("resolveFolderId", () => {
  /**
   * The project number is the weaker of the two keys. It is mangled by the
   * wizard's draft suffix, it collides under a UNIQUE constraint so only the
   * first package for a project keeps the clean value, and a hand-typed or
   * generated number (`2026-001`) matches no Onedot row at all. The Onedot
   * record id is established once, when the user picks the project, and
   * survives all of that — so it is tried first.
   */
  it("resolves by the stored Onedot id", () => {
    expect(resolveFolderId(PROJECTS, 10, null)).toBe("1Ph22vuz");
  });

  it("prefers the stored id over the project number when they disagree", () => {
    // The id records which project the user actually picked. A number that
    // points elsewhere was typed or regenerated afterwards.
    expect(resolveFolderId(PROJECTS, 10, "24-012")).toBe("1Ph22vuz");
  });

  it("falls back to the project number when no id is stored", () => {
    // Every project created before the id was persisted is in this state.
    expect(resolveFolderId(PROJECTS, null, "25-002")).toBe("1Ph22vuz");
    expect(resolveFolderId(PROJECTS, undefined, "25-002")).toBe("1Ph22vuz");
  });

  it("falls back to the project number when the stored id is unknown to Onedot", () => {
    // A project deleted or re-keyed in Onedot leaves a stale id behind.
    expect(resolveFolderId(PROJECTS, 999, "25-002")).toBe("1Ph22vuz");
  });

  it("falls back to the project number when the id resolves to no folder", () => {
    // 2 of 44 real projects have no folder; the number must still get a chance.
    expect(resolveFolderId(PROJECTS, 11, "25-002")).toBe("1Ph22vuz");
  });

  it("strips the wizard's draft suffix on the fallback", () => {
    expect(resolveFolderId(PROJECTS, null, "25-002-DRAFT-SAVAP7")).toBe("1Ph22vuz");
  });

  it("returns null when neither key resolves a folder", () => {
    expect(resolveFolderId(PROJECTS, 999, "2026-001")).toBeNull();
    expect(resolveFolderId(PROJECTS, null, null)).toBeNull();
    expect(resolveFolderId([], 10, "25-002")).toBeNull();
  });

  it("treats an empty-string folder on an id match as absent", () => {
    expect(resolveFolderId(PROJECTS, 12, null)).toBeNull();
  });
});
