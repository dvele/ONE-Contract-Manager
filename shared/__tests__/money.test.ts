import { describe, expect, it } from "vitest";
import { centsToDollarsInput, dollarsInputToCents } from "../money";

describe("dollarsInputToCents", () => {
  it("stores the wizard's dollar amounts as cents", () => {
    expect(dollarsInputToCents("2500000")).toBe(250_000_000);
    expect(dollarsInputToCents("1,000,000.50")).toBe(100_000_050);
    expect(dollarsInputToCents("$12.34")).toBe(1234);
    expect(dollarsInputToCents("0.1")).toBe(10);
  });
  it("is undefined for an empty or unparsable field, so the column is left alone", () => {
    expect(dollarsInputToCents("")).toBeUndefined();
    expect(dollarsInputToCents(undefined)).toBeUndefined();
    expect(dollarsInputToCents("abc")).toBeUndefined();
  });
});

describe("centsToDollarsInput", () => {
  it("round-trips a stored amount back into the input", () => {
    expect(centsToDollarsInput(250_000_000)).toBe("2500000");
    expect(centsToDollarsInput(1234)).toBe("12.34");
    expect(centsToDollarsInput(null)).toBe("");
    expect(dollarsInputToCents(centsToDollarsInput(100_000_050))).toBe(100_000_050);
  });
});
