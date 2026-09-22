import { describe, expect, it } from "vitest";
import { CONTRACT_FOLDER_NAME, resolveContractFolder, type DriveFolder } from "../contractFolder";

/**
 * Two folder conventions are in use across the 42 Onedot projects that have a
 * Drive folder, so the target cannot be a fixed path.
 *
 *   A — 39 of 42:  <project>/02 SALES INFO - CONTRACT, SPECS, BUDGETS, INVOICES
 *   B —  3 of 42:  <project>/01 Sales & Commercial/02. Sales Contract
 *
 * B is checked first because it is the more specific shape; a project that has
 * B's outer folder but not its inner one still gets A's chance before the
 * export refuses.
 */
function lister(tree: Record<string, DriveFolder[]>) {
  return async (parentId: string) => tree[parentId] ?? [];
}

const CONVENTION_A: Record<string, DriveFolder[]> = {
  root: [
    { id: "f0", name: "00 PHOTOS" },
    { id: "f1", name: "01 ADMIN & PROJECT MANAGEMENT" },
    { id: "f2", name: "02 SALES INFO - CONTRACT, SPECS, BUDGETS, INVOICES" },
    { id: "f3", name: "03 DESIGN" },
  ],
};

const CONVENTION_B: Record<string, DriveFolder[]> = {
  root: [{ id: "s1", name: "01 Sales & Commercial" }],
  s1: [
    { id: "s2", name: "02. Sales Contract" },
    { id: "s9", name: "01. Proposals" },
  ],
  s2: [{ id: "s3", name: "01 New Dvele Agreement" }],
};

describe("resolveContractFolder", () => {
  it("finds convention B's '02. Sales Contract'", async () => {
    const r = await resolveContractFolder("root", lister(CONVENTION_B));
    expect(r?.folderId).toBe("s2");
  });

  it("stops at '02. Sales Contract' rather than descending into '01 New Dvele Agreement'", async () => {
    // The agreements already in Drive sit one level deeper, but the contract
    // folder is the agreed target.
    const r = await resolveContractFolder("root", lister(CONVENTION_B));
    expect(r?.folderId).not.toBe("s3");
  });

  it("reports the path it walked, for the refusal message and the log", async () => {
    const r = await resolveContractFolder("root", lister(CONVENTION_B));
    expect(r?.path).toEqual(["01 Sales & Commercial", "02. Sales Contract"]);
  });

  it("finds convention A's sales folder", async () => {
    const r = await resolveContractFolder("root", lister(CONVENTION_A));
    expect(r?.folderId).toBe("f2");
    expect(r?.path).toEqual(["02 SALES INFO - CONTRACT, SPECS, BUDGETS, INVOICES"]);
  });

  it("tolerates the dot after the number", async () => {
    // 26-001 really is named "01. Sales & Commercial".
    const tree = {
      root: [{ id: "a", name: "01. Sales & Commercial" }],
      a: [{ id: "b", name: "02 Sales Contract" }],
    };
    expect((await resolveContractFolder("root", lister(tree)))?.folderId).toBe("b");
  });

  it("ignores case and surrounding whitespace", async () => {
    const tree = {
      root: [{ id: "a", name: "  01 SALES & COMMERCIAL  " }],
      a: [{ id: "b", name: "02. sales contract" }],
    };
    expect((await resolveContractFolder("root", lister(tree)))?.folderId).toBe("b");
  });

  it("falls through to convention A when B's outer folder has no contract folder", async () => {
    // 26-001's "01. Sales & Commercial" is empty.
    const tree = {
      root: [
        { id: "a", name: "01. Sales & Commercial" },
        { id: "f2", name: "02 SALES INFO - CONTRACT, SPECS, BUDGETS, INVOICES" },
      ],
      a: [],
    };
    expect((await resolveContractFolder("root", lister(tree)))?.folderId).toBe("f2");
  });

  it("returns null when neither convention is present", async () => {
    const tree = { root: [{ id: "x", name: "03 DESIGN" }, { id: "y", name: "00 PHOTOS" }] };
    expect(await resolveContractFolder("root", lister(tree))).toBeNull();
  });

  it("returns null for a project folder with nothing in it", async () => {
    expect(await resolveContractFolder("root", lister({ root: [] }))).toBeNull();
  });

  it("does not match a folder that merely mentions the words", async () => {
    // "superseded" siblings and loose notes must not win.
    const tree = {
      root: [
        { id: "x", name: "Old Sales Contract superseded" },
        { id: "z", name: "notes about 02 SALES INFO" },
      ],
    };
    expect(await resolveContractFolder("root", lister(tree))).toBeNull();
  });
});

describe("creating the contract folder when a project has none", () => {
  /**
   * The newest layout (25-003, 26-001) carries `01. Sales & Commercial` with
   * loose files and no contract subfolder beneath it. Those are current
   * projects, so refusing would block export exactly where it is wanted.
   *
   * Creation is a last resort: a project that already files contracts under
   * convention A has a home, and must not gain a second empty one.
   */
  function recorder() {
    const created: { parentId: string; name: string }[] = [];
    const createFolder = async (parentId: string, name: string) => {
      created.push({ parentId, name });
      return { id: `new-${created.length}`, name };
    };
    return { created, createFolder };
  }

  const B_OUTER_ONLY = { root: [{ id: "a", name: "01. Sales & Commercial" }], a: [] };

  it("creates the contract folder under an existing sales folder", async () => {
    const { created, createFolder } = recorder();
    const r = await resolveContractFolder("root", lister(B_OUTER_ONLY), createFolder);
    expect(created).toEqual([{ parentId: "a", name: CONTRACT_FOLDER_NAME }]);
    expect(r?.folderId).toBe("new-1");
  });

  it("names the created folder to match the convention", async () => {
    expect(CONTRACT_FOLDER_NAME).toBe("02. Sales Contract");
  });

  it("reports the created folder in the path", async () => {
    const { createFolder } = recorder();
    const r = await resolveContractFolder("root", lister(B_OUTER_ONLY), createFolder);
    expect(r?.path).toEqual(["01. Sales & Commercial", CONTRACT_FOLDER_NAME]);
  });

  it("does not create when convention A already gives the project a home", async () => {
    // Creating here would add an empty folder beside the one actually in use.
    const { created, createFolder } = recorder();
    const tree = {
      root: [
        { id: "a", name: "01. Sales & Commercial" },
        { id: "f2", name: "02 SALES INFO - CONTRACT, SPECS, BUDGETS, INVOICES" },
      ],
      a: [],
    };
    const r = await resolveContractFolder("root", lister(tree), createFolder);
    expect(created).toEqual([]);
    expect(r?.folderId).toBe("f2");
  });

  it("does not create when the contract folder already exists", async () => {
    const { created, createFolder } = recorder();
    await resolveContractFolder("root", lister(CONVENTION_B), createFolder);
    expect(created).toEqual([]);
  });

  it("does not create when the project has no sales folder at all", async () => {
    // The legacy layouts (01 ADMIN / 02 DESIGN / 03 PRE SALES). There is no
    // sensible parent, so this still refuses rather than inventing a tree.
    const { created, createFolder } = recorder();
    const tree = { root: [{ id: "x", name: "01 ADMIN" }, { id: "y", name: "02 DESIGN" }] };
    expect(await resolveContractFolder("root", lister(tree), createFolder)).toBeNull();
    expect(created).toEqual([]);
  });

  it("still refuses, without creating, when no creator is supplied", async () => {
    expect(await resolveContractFolder("root", lister(B_OUTER_ONLY))).toBeNull();
  });
});
