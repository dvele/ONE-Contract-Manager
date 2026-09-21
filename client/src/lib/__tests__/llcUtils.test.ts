import { describe, expect, it } from "vitest";
import { generateLLCName } from "../llcUtils";

describe("generateLLCName", () => {
  it("names the entity after the site address", () => {
    expect(generateLLCName("1234 Zaca Station Rd", "Zaca Preserve")).toBe("DP 1234 Zaca Station Rd LLC");
  });

  it("does not double a suffix the source already carries", () => {
    // The issued Zaca agreement has the company signing as
    // "DP PO Box 953 Zaca Preserve LLC LLC".
    expect(generateLLCName("Zaca Preserve LLC", "Zaca Preserve")).toBe("DP Zaca Preserve LLC");
  });

  it("ignores a suffix's casing and trailing period", () => {
    expect(generateLLCName("Zaca Preserve, L.L.C.", "Zaca Preserve")).toBe("DP Zaca Preserve LLC");
    expect(generateLLCName("Zaca Preserve Inc.", "Zaca Preserve")).toBe("DP Zaca Preserve Inc");
  });

  it("falls back to the project name when the address is a PO box", () => {
    // A PO box is a mailing address, not a site — an entity named after one
    // identifies nothing, and this is how the Zaca entity got its name.
    expect(generateLLCName("PO Box 953", "Zaca Preserve")).toBe("DP Zaca Preserve LLC");
    expect(generateLLCName("P.O. Box 953, Los Olivos CA", "Zaca Preserve")).toBe("DP Zaca Preserve LLC");
  });

  it("uses the PO box rather than nothing when there is no project name", () => {
    expect(generateLLCName("PO Box 953", "")).toBe("DP PO Box 953 LLC");
  });

  it("returns an empty string when it has no source at all", () => {
    expect(generateLLCName("", "")).toBe("");
    expect(generateLLCName("   ", undefined)).toBe("");
  });
});
