import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  addDays,
  derivePhaseDates,
  deriveDesignMilestones,
  type PhaseDurations,
} from "../scheduleMath";

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
