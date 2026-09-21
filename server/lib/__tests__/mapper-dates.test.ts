import { describe, expect, it } from "vitest";
import { formatDateWritten, formatDateOrTBD } from "../mapper";

describe("formatDateWritten", () => {
  it("renders the date it was given, not the day before", () => {
    // A YYYY-MM-DD string parses as UTC midnight. Formatted in a zone behind
    // UTC it prints the previous day — a date one day early in an executed
    // agreement, which nobody notices until a deadline is disputed.
    expect(formatDateWritten("2026-03-02")).toBe("March 2, 2026");
  });

  it("agrees with formatDateOrTBD, which was already fixed", () => {
    expect(formatDateWritten("2026-01-01")).toBe(formatDateOrTBD("2026-01-01"));
  });

  it("returns an empty string for a missing date, unlike formatDateOrTBD's TBD", () => {
    expect(formatDateWritten(null)).toBe("");
    expect(formatDateWritten(undefined)).toBe("");
    expect(formatDateWritten("")).toBe("");
  });
});
