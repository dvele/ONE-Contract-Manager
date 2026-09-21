import { describe, expect, it } from "vitest";
import { formatDate, formatDateWritten, formatDateOrTBD } from "../mapper";

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

describe("formatDate", () => {
  // The third copy of this defect. formatDateWritten was fixed, formatDateOrTBD
  // was fixed, and this one — which feeds DELIVERY_DATE, COMPLETION_DATE,
  // PROJECT_START_DATE, PROJECT_END_DATE and PRICE_LOCKED_AT — was not. These
  // assertions only bite when the suite runs outside UTC: `npm run test:tz`.
  it("renders the date it was given, not the day before", () => {
    expect(formatDate("2026-03-02")).toBe("03/02/2026");
  });

  it("agrees with the written formatter on the same calendar date", () => {
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
    expect(formatDateWritten("2026-01-01")).toBe("January 1, 2026");
  });

  it("renders a Date the same way it renders that date's string", () => {
    expect(formatDate(new Date("2026-03-02T00:00:00Z"))).toBe(formatDate("2026-03-02"));
  });

  it("returns an empty string for a missing date", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });
});
