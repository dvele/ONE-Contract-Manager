import { describe, expect, it } from "vitest";
import { centsToDollarsInput, dollarsInputToCents, splitCents } from "../money";

describe("splitCents", () => {
  it("splits in proportion and sums to the total exactly", () => {
    expect(splitCents(100, [1, 1, 1])).toEqual([34, 33, 33]);
    // 1,139,327.78 and 360,672.22 exactly: floors, then the one leftover cent to the larger fraction.
    expect(splitCents(1_500_000, [52_880_000, 16_740_000])).toEqual([1_139_328, 360_672]);
    expect(splitCents(1_500_000, [52_880_000, 16_740_000]).reduce((a, b) => a + b, 0)).toBe(1_500_000);
  });
  it("gives every share zero when there is nothing to weight by", () => {
    expect(splitCents(100, [])).toEqual([]);
    expect(splitCents(100, [0, 0])).toEqual([0, 0]);
  });
  it("splits a phase base by milestone percentages the way A.5 prints them", () => {
    // 10 / 40 / 40 / 10 of $8,204.00 — the Ziherle draft's single phase.
    expect(splitCents(820_400, [10, 40, 40, 10])).toEqual([82_040, 328_160, 328_160, 82_040]);
  });
});

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
