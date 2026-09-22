import { describe, expect, it } from "vitest";
import { addDays, addMonths, formatProjectDate, parseProjectDate } from "../projectDates";

/**
 * The fourth copy of a defect fixed three times on the server. A `YYYY-MM-DD`
 * string parses as UTC midnight, so formatting it in the viewer's own zone
 * prints the previous day anywhere west of UTC. Step 8 showed a project
 * starting 2026-09-21 as "Sep 20, 2026" and every date derived from it a day
 * early, against a Step 6 that had already been fixed.
 *
 * These assertions only bite outside UTC: `npm run test:tz`.
 */
describe("parseProjectDate + formatProjectDate", () => {
  it("renders the date it was given, not the day before", () => {
    expect(formatProjectDate(parseProjectDate("2026-09-21"))).toBe("Sep 21, 2026");
  });

  it("renders a date that is the first of a month", () => {
    expect(formatProjectDate(parseProjectDate("2026-01-01"))).toBe("Jan 1, 2026");
  });
});

describe("addDays", () => {
  it("keeps the calendar date it lands on", () => {
    // 2026-09-21 + 60 days is the design completion Step 8 prints. It showed
    // Nov 19 while Step 6 derived Nov 20 from the same two inputs.
    expect(formatProjectDate(addDays(parseProjectDate("2026-09-21"), 60))).toBe("Nov 20, 2026");
  });

  it("chains without drifting across a DST boundary", () => {
    // US DST ends 2026-11-01. Adding across it in local time loses an hour,
    // which a UTC-midnight date cannot absorb.
    const start = parseProjectDate("2026-09-21");
    const chained = addDays(addDays(start, 60), 120);
    expect(formatProjectDate(chained)).toBe("Mar 20, 2027");
  });

  it("does not mutate the date it is given", () => {
    const start = parseProjectDate("2026-09-21");
    addDays(start, 60);
    expect(formatProjectDate(start)).toBe("Sep 21, 2026");
  });
});

describe("addMonths", () => {
  it("keeps the calendar date it lands on", () => {
    // The warranty expirations on the same step: project completion plus 24,
    // 60 and 120 months. `setMonth` works in local time, so west of UTC each
    // one printed a day early too.
    const completion = parseProjectDate("2027-06-18");
    expect(formatProjectDate(addMonths(completion, 24))).toBe("Jun 18, 2029");
    expect(formatProjectDate(addMonths(completion, 60))).toBe("Jun 18, 2032");
    expect(formatProjectDate(addMonths(completion, 120))).toBe("Jun 18, 2037");
  });

  it("does not mutate the date it is given", () => {
    const completion = parseProjectDate("2027-06-18");
    addMonths(completion, 24);
    expect(formatProjectDate(completion)).toBe("Jun 18, 2027");
  });
});
