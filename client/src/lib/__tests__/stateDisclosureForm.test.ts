import { describe, expect, it } from "vitest";
import { contentPreview, stateDisclosureSchema } from "../stateDisclosureForm";

const ok = { state: "AZ", code: "MASTER_EF_2026_STATE_NOTICES", content: "x", isActive: true };

describe("stateDisclosureSchema", () => {
  it("accepts a valid row", () => {
    expect(stateDisclosureSchema.safeParse(ok).success).toBe(true);
  });
  it("rejects lowercase, spaced or empty codes", () => {
    for (const code of ["abc", "A B", "", "A-B"]) {
      expect(stateDisclosureSchema.safeParse({ ...ok, code }).success).toBe(false);
    }
  });
  it("requires a 2-letter state and content", () => {
    expect(stateDisclosureSchema.safeParse({ ...ok, state: "A" }).success).toBe(false);
    expect(stateDisclosureSchema.safeParse({ ...ok, content: "" }).success).toBe(false);
  });
  it("defaults isActive to true", () => {
    const { isActive, ...rest } = ok;
    const r = stateDisclosureSchema.parse(rest);
    expect(r.isActive).toBe(true);
  });
});

describe("contentPreview", () => {
  it("strips tags", () => {
    expect(contentPreview("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });
  it("truncates to 80 chars", () => {
    expect(contentPreview("a".repeat(200))).toHaveLength(80);
  });
  it("handles null", () => {
    expect(contentPreview(null)).toBe("");
  });
});
