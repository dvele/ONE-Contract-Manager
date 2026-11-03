import { describe, expect, it } from "vitest";
import { getC2DefaultMatrix, getDefaultMatrix, parseStoredMatrix } from "@shared/responsibilityMatrix";
import { matrixFromStored, matrixToStored } from "../storedMatrix";

const legacy = getDefaultMatrix("CRC").map((i) =>
  i.id === "site_prep_clearing" ? { ...i, assignedTo: "company" as const } : i,
);

describe("the wizard's stored-matrix round trip", () => {
  it("loads a legacy-only project into the C.2 editor without losing its legacy matrix", () => {
    const loaded = matrixFromStored(JSON.stringify(legacy));
    expect(loaded.responsibilityMatrix).toEqual([]); // the editor seeds C.2 defaults
    expect(loaded.legacyResponsibilityMatrix).toEqual(legacy);

    // The editor seeds and the user flips one row, then the wizard saves.
    const edited = getC2DefaultMatrix("CRC").map((i) =>
      i.id === "foundation" ? { ...i, assignedTo: "company" as const } : i,
    );
    const saved = matrixToStored({ ...loaded, responsibilityMatrix: edited });
    expect(parseStoredMatrix(saved)).toEqual({ legacy, c2: edited });

    // Reloading the saved value gives back both, unchanged.
    expect(matrixFromStored(saved)).toEqual({
      responsibilityMatrix: edited,
      legacyResponsibilityMatrix: legacy,
    });
  });

  it("loads the C.2 rows of an object-form value into the editor", () => {
    const c2 = getC2DefaultMatrix("FOB");
    expect(matrixFromStored(JSON.stringify({ c2 }))).toEqual({
      responsibilityMatrix: c2,
      legacyResponsibilityMatrix: null,
    });
  });

  it("treats a malformed value as empty", () => {
    expect(matrixFromStored("[null]")).toEqual({ responsibilityMatrix: [], legacyResponsibilityMatrix: null });
  });
});
