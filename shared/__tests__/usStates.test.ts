import { describe, expect, it } from "vitest";
import { stateName } from "../usStates";

describe("stateName", () => {
  it("expands a code", () => expect(stateName("AZ")).toBe("Arizona"));
  it("is case-insensitive for codes", () => expect(stateName("az")).toBe("Arizona"));
  it("passes a full name through", () => expect(stateName("Delaware")).toBe("Delaware"));
  it("canonicalizes the capitalization of a name", () => expect(stateName("arizona")).toBe("Arizona"));
  it("handles DC", () => expect(stateName("DC")).toBe("District of Columbia"));
  it("returns empty for null, undefined and blanks", () => {
    expect(stateName(null)).toBe("");
    expect(stateName(undefined)).toBe("");
    expect(stateName("  ")).toBe("");
  });
  it("returns an unknown input trimmed", () => expect(stateName(" Narnia ")).toBe("Narnia"));
  it("covers 50 states plus DC", () => {
    const codes = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" ");
    expect(codes).toHaveLength(51);
    for (const c of codes) expect(stateName(c)).not.toBe(c);
  });
});
