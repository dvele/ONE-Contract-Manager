import { describe, expect, it } from "vitest";
import { buildMilestoneSchedule } from "../pricingMath";

describe("buildMilestoneSchedule", () => {
  it("issues the six milestones from the Zaca agreement, totalling 100%", () => {
    const result = buildMilestoneSchedule(12_500_000_00);
    expect(result.map((m) => m.name)).toEqual([
      "Signing Deposit",
      "Green Light",
      "Production Start",
      "Production Midpoint",
      "Delivery",
      "Retainage",
    ]);
    expect(result.map((m) => m.percentage)).toEqual([20, 20, 20, 20, 15, 5]);
    expect(result.reduce((s, m) => s + m.percentage, 0)).toBe(100);
  });

  it("includes retainage regardless of completion model", () => {
    // The percentages are model-independent; only phaseValue differs by model,
    // and that is computed before this function is called. Zaca is CRC and its
    // issued schedule carries retainage, so there is no CRC-specific variant.
    expect(buildMilestoneSchedule(1_000_000_00).some((m) => m.name === "Retainage")).toBe(true);
  });

  it("makes amounts sum to the phase value exactly, with no lost cent", () => {
    const phaseValue = 14_300_000_01;
    const result = buildMilestoneSchedule(phaseValue);
    expect(result.reduce((s, m) => s + m.amount, 0)).toBe(phaseValue);
  });

  it("leaves retainage's amount exact and puts the rounding residual on Delivery", () => {
    const phaseValue = 14_300_000_01;
    const result = buildMilestoneSchedule(phaseValue);
    const delivery = result[4];
    const retainage = result[5];

    expect(retainage.amount).toBe(Math.round((phaseValue * 5) / 100));
    expect(delivery.amount).not.toBe(Math.round((phaseValue * 15) / 100));
  });

  it("reproduces the issued Zaca figures for a phase worth its contract total", () => {
    // Sanity-check against the real agreement: 20% of $14,596,900 is $2,919,380
    // and 5% is $729,845. Guards the percentages against a silent edit.
    const result = buildMilestoneSchedule(14_596_900_00);
    expect(result[0].amount).toBe(2_919_380_00);
    expect(result[4].amount).toBe(2_189_535_00);
    expect(result[5].amount).toBe(729_845_00);
  });

  it("returns no milestones for a phase worth nothing", () => {
    expect(buildMilestoneSchedule(0)).toEqual([]);
  });
});
