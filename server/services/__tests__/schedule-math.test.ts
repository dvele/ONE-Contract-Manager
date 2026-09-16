import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  addDays,
  asCalendarDate,
  derivePhaseDates,
  deriveDesignMilestones,
  earliestDate,
  latestDate,
  toDateOnly,
  ISO_DATE,
  type PhaseDurations,
} from "../scheduleMath";

describe("asCalendarDate", () => {
  it("returns a usable YYYY-MM-DD date unchanged", () => {
    expect(asCalendarDate("2026-03-02")).toBe("2026-03-02");
    expect(asCalendarDate("2026-01-01")).toBe("2026-01-01");
    expect(asCalendarDate("2026-12-31")).toBe("2026-12-31");
  });

  it("rejects a calendar-impossible date that passes the ISO shape", () => {
    // new Date() silently rolls these over rather than failing, which is the
    // whole reason the calendar check exists alongside the pattern.
    expect(asCalendarDate("2027-02-30")).toBeNull();
    expect(asCalendarDate("2026-02-29")).toBeNull();
    expect(asCalendarDate("2026-04-31")).toBeNull();
    expect(asCalendarDate("2026-13-01")).toBeNull();
    expect(asCalendarDate("2026-00-10")).toBeNull();
  });

  it("rejects a real date that fails the ISO shape", () => {
    // Unpadded values name a real day but parse in the host's zone rather than
    // UTC, shifting the date west of UTC — so the shape check is load-bearing
    // too, not redundant with the calendar check.
    expect(ISO_DATE.test("2026-3-5")).toBe(false);
    expect(asCalendarDate("2026-3-5")).toBeNull();
    expect(asCalendarDate("2026-3-05")).toBeNull();
    expect(asCalendarDate("03/15/2026")).toBeNull();
  });

  it("treats absent and blank input as absent", () => {
    expect(asCalendarDate(null)).toBeNull();
    expect(asCalendarDate(undefined)).toBeNull();
    expect(asCalendarDate("")).toBeNull();
  });

  it("accepts a real leap day and rejects a fake one", () => {
    expect(asCalendarDate("2028-02-29")).toBe("2028-02-29");
    expect(asCalendarDate("2024-02-29")).toBe("2024-02-29");
    expect(asCalendarDate("2026-02-29")).toBeNull();
    // 2100 is divisible by 4 but not a leap year under the century rule.
    expect(asCalendarDate("2100-02-29")).toBeNull();
  });
});

describe("addDays", () => {
  it("adds calendar days across a month boundary", () => {
    expect(addDays("2026-01-28", 5)).toBe("2026-02-02");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("returns null for a null date, so a missing input propagates", () => {
    expect(addDays(null, 5)).toBeNull();
  });

  it("returns null for a null duration rather than treating it as zero", () => {
    expect(addDays("2026-01-01", null)).toBeNull();
  });

  it("rejects a calendar-impossible day rather than letting Date roll it over", () => {
    // Date("2026-02-30T00:00:00Z") silently rolls over to 2026-03-02 in V8.
    // A rolled-over date is worse than a missing one, so this must null out.
    expect(addDays("2026-02-30", 1)).toBeNull();
  });

  it("still adds correctly across a real month-end, unlike the impossible case above", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("still accepts a leap day two years out, so the calendar check isn't collateral damage", () => {
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
  });
});

describe("addBusinessDays", () => {
  it("skips a weekend", () => {
    // 2026-01-01 is a Thursday. Five business days lands on the following Thursday.
    expect(addBusinessDays("2026-01-01", 5)).toBe("2026-01-08");
  });

  it("does not move a zero-day period", () => {
    expect(addBusinessDays("2026-01-01", 0)).toBe("2026-01-01");
  });

  it("counts from a Friday into the next week", () => {
    // 2026-01-02 is a Friday; one business day is the following Monday.
    expect(addBusinessDays("2026-01-02", 1)).toBe("2026-01-05");
  });

  it("propagates null", () => {
    expect(addBusinessDays(null, 5)).toBeNull();
  });

  it("returns null for a null duration rather than treating it as zero", () => {
    expect(addBusinessDays("2026-01-01", null)).toBeNull();
  });

  it("rejects a calendar-impossible day the same way addDays does", () => {
    expect(addBusinessDays("2026-02-30", 1)).toBeNull();
  });

  it("returns the input unchanged for a negative count", () => {
    // Pins the documented precondition rather than endorsing it: the loop
    // counts forward only. Unreachable today — every caller passes one of
    // D.1's positive review periods.
    expect(addBusinessDays("2026-01-08", -5)).toBe("2026-01-08");
  });
});

describe("formatting a derived date", () => {
  it("returns null rather than a truncated expanded year past 9999", () => {
    // toISOString() switches to "+010002-12-31T…" beyond year 9999, which
    // slicing to ten characters turns into "+010002-12".
    expect(addDays("9999-12-31", 1095)).toBeNull();
    expect(addDays("9999-01-01", 365)).toBeNull();
  });

  it("returns null rather than throwing on a duration Date cannot represent", () => {
    // toISOString() raises RangeError on an invalid Date; an unbounded int4
    // duration column can reach one.
    expect(addDays("2026-01-01", 100_000_000)).toBeNull();
    expect(addDays("2026-01-01", -100_000_000)).toBeNull();
  });

  it("still renders a date just inside the representable range", () => {
    expect(addDays("9999-12-30", 1)).toBe("9999-12-31");
  });
});

describe("earliestDate / latestDate", () => {
  it("yields null for an empty list, so a project with no phases renders TBD", () => {
    expect(earliestDate([])).toBeNull();
    expect(latestDate([])).toBeNull();
  });

  it("yields null when every entry is null", () => {
    expect(earliestDate([null, null, null])).toBeNull();
    expect(latestDate([null, null, null])).toBeNull();
  });

  it("ignores nulls among real dates rather than being swallowed by them", () => {
    expect(earliestDate([null, "2026-05-02", null, "2026-03-11"])).toBe("2026-03-11");
    expect(latestDate([null, "2026-05-02", null, "2026-03-11"])).toBe("2026-05-02");
  });

  it("orders across a month boundary, where string length would not", () => {
    // Zero-padding is what makes the lexicographic comparison chronological:
    // "2026-09-30" precedes "2026-10-01" as text and as a date.
    expect(earliestDate(["2026-10-01", "2026-09-30"])).toBe("2026-09-30");
    expect(latestDate(["2026-10-01", "2026-09-30"])).toBe("2026-10-01");
    expect(earliestDate(["2027-01-01", "2026-12-31"])).toBe("2026-12-31");
    expect(latestDate(["2027-01-01", "2026-12-31"])).toBe("2027-01-01");
  });

  it("returns the single date when the list holds one", () => {
    expect(earliestDate(["2026-03-01"])).toBe("2026-03-01");
    expect(latestDate(["2026-03-01"])).toBe("2026-03-01");
  });
});

describe("derivePhaseDates", () => {
  const DESIGN_COMPLETE = "2026-03-01";

  const phase = (n: number, over: Partial<PhaseDurations> = {}): PhaseDurations => ({
    phaseNumber: n,
    startOffsetDays: 0,
    manufacturingDays: 100,
    onsiteDays: 60,
    deliveryLagDays: 10,
    factoryStartOverride: null,
    factoryCompleteOverride: null,
    deliveryWindowOverride: null,
    targetCoOverride: null,
    ...over,
  });

  it("starts the first phase at design complete", () => {
    const [p1] = derivePhaseDates(DESIGN_COMPLETE, [phase(1)]);
    expect(p1.factoryStart).toBe("2026-03-01");
    expect(p1.factoryComplete).toBe(addDays("2026-03-01", 100));
  });

  it("chains each phase from the previous phase's factory completion", () => {
    const [p1, p2] = derivePhaseDates(DESIGN_COMPLETE, [phase(1), phase(2)]);
    expect(p2.factoryStart).toBe(p1.factoryComplete);
  });

  it("inserts a gap for a positive start offset", () => {
    const [p1, p2] = derivePhaseDates(DESIGN_COMPLETE, [phase(1), phase(2, { startOffsetDays: 14 })]);
    expect(p2.factoryStart).toBe(addDays(p1.factoryComplete, 14));
  });

  it("overlaps phases for a negative start offset", () => {
    const [p1, p2] = derivePhaseDates(DESIGN_COMPLETE, [phase(1), phase(2, { startOffsetDays: -30 })]);
    expect(p2.factoryStart).toBe(addDays(p1.factoryComplete, -30));
  });

  it("derives delivery and CO from factory completion", () => {
    const [p1] = derivePhaseDates(DESIGN_COMPLETE, [phase(1)]);
    expect(p1.deliveryWindow).toBe(addDays(p1.factoryComplete, 10));
    expect(p1.targetCO).toBe(addDays(p1.deliveryWindow, 60));
  });

  it("returns nulls rather than guesses when a duration is missing", () => {
    const [p1] = derivePhaseDates(DESIGN_COMPLETE, [phase(1, { manufacturingDays: null })]);
    expect(p1.factoryStart).toBe("2026-03-01");
    expect(p1.factoryComplete).toBeNull();
    expect(p1.deliveryWindow).toBeNull();
    expect(p1.targetCO).toBeNull();
  });

  it("lets a later phase recover from an earlier phase's missing duration via an override", () => {
    const [, p2] = derivePhaseDates(DESIGN_COMPLETE, [
      phase(1, { manufacturingDays: null }),
      phase(2, { factoryStartOverride: "2026-06-01" }),
    ]);
    expect(p2.factoryStart).toBe("2026-06-01");
    expect(p2.factoryComplete).toBe(addDays("2026-06-01", 100));
  });

  it("makes an override win and become the base for everything downstream", () => {
    const [p1] = derivePhaseDates(DESIGN_COMPLETE, [
      phase(1, { factoryCompleteOverride: "2026-09-09" }),
    ]);
    expect(p1.factoryComplete).toBe("2026-09-09");
    expect(p1.deliveryWindow).toBe(addDays("2026-09-09", 10));
  });

  it("chains the next phase from an overridden factory completion", () => {
    const [, p2] = derivePhaseDates(DESIGN_COMPLETE, [
      phase(1, { factoryCompleteOverride: "2026-09-09" }),
      phase(2),
    ]);
    expect(p2.factoryStart).toBe("2026-09-09");
  });

  it("returns an empty array for no phases", () => {
    expect(derivePhaseDates(DESIGN_COMPLETE, [])).toEqual([]);
  });

  it("returns null dates throughout when the project has no start", () => {
    const [p1] = derivePhaseDates(null, [phase(1)]);
    expect(p1.factoryStart).toBeNull();
    expect(p1.targetCO).toBeNull();
  });

  it("treats a calendar-impossible override as absent and derives the date instead of printing it verbatim", () => {
    // A row written before the zod refinement existed could already hold an
    // override like this. An unparseable override is bad data, not a missing
    // input — the chain can still legitimately compute factoryStart from
    // designComplete, so that computed date wins rather than the schedule
    // going null or the impossible string reaching a generated contract.
    const [p1] = derivePhaseDates(DESIGN_COMPLETE, [
      phase(1, { factoryStartOverride: "2026-02-30" }),
    ]);
    expect(p1.factoryStart).toBe(addDays(DESIGN_COMPLETE, 0));
    expect(p1.factoryStart).not.toBe("2026-02-30");
    expect(p1.factoryComplete).toBe(addDays(p1.factoryStart, 100));
    expect(p1.deliveryWindow).not.toBeNull();
    expect(p1.targetCO).not.toBeNull();
  });

  it("falls through the same way for each of the other three overrides", () => {
    const [p1] = derivePhaseDates(DESIGN_COMPLETE, [
      phase(1, {
        factoryCompleteOverride: "2026-02-30",
        deliveryWindowOverride: "2026-04-31",
        targetCoOverride: "2026-06-31",
      }),
    ]);
    expect(p1.factoryComplete).toBe(addDays(p1.factoryStart, 100));
    expect(p1.deliveryWindow).toBe(addDays(p1.factoryComplete, 10));
    expect(p1.targetCO).toBe(addDays(p1.deliveryWindow, 60));
  });

  it("still lets a valid override win over the derived value and rebase everything downstream", () => {
    // Guards against the fallback logic accidentally swallowing legitimate
    // overrides along with the invalid ones.
    const [p1, p2] = derivePhaseDates(DESIGN_COMPLETE, [
      phase(1, { factoryStartOverride: "2026-06-01" }),
      phase(2),
    ]);
    expect(p1.factoryStart).toBe("2026-06-01");
    expect(p1.factoryComplete).toBe(addDays("2026-06-01", 100));
    expect(p2.factoryStart).toBe(p1.factoryComplete);
  });

  it("accepts a leap day as an override, so the calendar check isn't collateral damage here either", () => {
    const [p1] = derivePhaseDates(DESIGN_COMPLETE, [
      phase(1, { factoryStartOverride: "2028-02-29" }),
    ]);
    expect(p1.factoryStart).toBe("2028-02-29");
  });

  describe("null day-count fields default to zero, unlike missing durations", () => {
    it("treats a null startOffsetDays the same as zero", () => {
      const withNull = derivePhaseDates(DESIGN_COMPLETE, [phase(1), phase(2, { startOffsetDays: null })]);
      const withZero = derivePhaseDates(DESIGN_COMPLETE, [phase(1), phase(2, { startOffsetDays: 0 })]);
      expect(withNull[1].factoryStart).toBe(withZero[1].factoryStart);
    });

    it("treats a null deliveryLagDays the same as zero", () => {
      const [withNull] = derivePhaseDates(DESIGN_COMPLETE, [phase(1, { deliveryLagDays: null })]);
      const [withZero] = derivePhaseDates(DESIGN_COMPLETE, [phase(1, { deliveryLagDays: 0 })]);
      expect(withNull.deliveryWindow).toBe(withZero.deliveryWindow);
    });

    it("still returns a null factoryComplete for a null manufacturingDays, by contrast", () => {
      const [p1] = derivePhaseDates(DESIGN_COMPLETE, [phase(1, { manufacturingDays: null })]);
      expect(p1.factoryComplete).toBeNull();
    });
  });
});

describe("toDateOnly", () => {
  it("renders the local calendar date from local components, not through UTC", () => {
    // Built from local (year, month, day, hour, minute) components, so this is
    // late evening on the process's own clock regardless of which host runs
    // the suite. toISOString() would report the UTC date instead, which is a
    // day ahead of this one on any host west of UTC at this hour.
    const lateEvening = new Date(2027, 0, 31, 23, 30);
    expect(toDateOnly(lateEvening)).toBe("2027-01-31");
  });

  it("zero-pads single-digit months and days", () => {
    const date = new Date(2027, 2, 5);
    expect(toDateOnly(date)).toBe("2027-03-05");
  });

  it("returns null for a null date", () => {
    expect(toDateOnly(null)).toBeNull();
  });

  it("output always matches the shared ISO_DATE shape", () => {
    const rendered = toDateOnly(new Date(2027, 11, 1, 20, 0));
    expect(rendered).not.toBeNull();
    expect(ISO_DATE.test(rendered as string)).toBe(true);
  });
});

describe("deriveDesignMilestones", () => {
  it("chains the four D.1 milestones through their review periods", () => {
    const d = deriveDesignMilestones("2026-01-01", {
      kickoffReviewDays: 5,
      schematicReviewDays: 10,
      permitSetReviewDays: 10,
      greenLightReviewDays: 5,
    });
    expect(d.kickoff).toBe("2026-01-01");
    expect(d.schematic).toBe(addBusinessDays("2026-01-01", 5));
    expect(d.permitSet).toBe(addBusinessDays(d.schematic, 10));
    expect(d.greenLightPackage).toBe(addBusinessDays(d.permitSet, 10));
  });

  it("propagates null when the project has no start", () => {
    const d = deriveDesignMilestones(null, {
      kickoffReviewDays: 5,
      schematicReviewDays: 10,
      permitSetReviewDays: 10,
      greenLightReviewDays: 5,
    });
    expect(d.kickoff).toBeNull();
    expect(d.greenLightPackage).toBeNull();
  });
});
