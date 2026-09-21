import { describe, expect, it } from "vitest";
import { generateLLCName } from "../llcName";

// The wizard's inputs are covered by client/src/lib/__tests__/llcUtils.test.ts,
// which reaches this same function through the re-export. These are the shapes
// POST /projects passes, whose own inline regex produced
// "DP Zaca Preserve LLC LLC" and "DP PO Box 953 LLC" long after the wizard's
// generator was corrected.
describe("generateLLCName, as POST /projects calls it", () => {
  it("does not double the suffix of a project named after an entity", () => {
    expect(generateLLCName("", "Zaca Preserve LLC")).toBe("DP Zaca Preserve LLC");
  });

  it("falls back to the project name when the site address is a PO box", () => {
    expect(generateLLCName("PO Box 953", "Zaca Preserve")).toBe("DP Zaca Preserve LLC");
  });

  it("names the entity after the site address when there is one", () => {
    expect(generateLLCName("1234 Zaca Station Rd", "Zaca Preserve")).toBe(
      "DP 1234 Zaca Station Rd LLC"
    );
  });

  it("takes the project name when the route has no site address at all", () => {
    // The route passes `projectData.siteAddress || ""`, so an absent column
    // arrives as an empty string rather than undefined.
    expect(generateLLCName("", "Zaca Preserve")).toBe("DP Zaca Preserve LLC");
  });

  it("yields nothing when the route has neither, rather than a name built from nothing", () => {
    expect(generateLLCName("", undefined)).toBe("");
  });
});
