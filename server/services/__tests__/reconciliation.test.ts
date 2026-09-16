import { describe, expect, it } from "vitest";
import { reconcilePhases } from "../pricingMath";

describe("reconcilePhases", () => {
  it("reconciles when every unit is phased", () => {
    const r = reconcilePhases({
      phaseValues: [600_000_00, 400_000_00],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 0,
    });
    expect(r.reconciles).toBe(true);
    expect(r.shortfall).toBe(0);
  });

  it("reconciles when the shortfall is exactly the unphased units", () => {
    const r = reconcilePhases({
      phaseValues: [600_000_00],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 400_000_00,
    });
    expect(r.reconciles).toBe(true);
    expect(r.shortfall).toBe(400_000_00);
    expect(r.explainedByUnphased).toBe(true);
  });

  it("does not reconcile when the shortfall exceeds the unphased units", () => {
    const r = reconcilePhases({
      phaseValues: [600_000_00],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 100_000_00,
    });
    expect(r.reconciles).toBe(false);
    expect(r.unexplained).toBe(300_000_00);
  });

  it("does not reconcile when the phases exceed the contract", () => {
    const r = reconcilePhases({
      phaseValues: [900_000_00, 900_000_00],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 0,
    });
    expect(r.reconciles).toBe(false);
    expect(r.unexplained).toBe(-800_000_00);
  });

  it("reconciles a project with no phases at all", () => {
    // Nothing to contradict: phases:[] is the documented legacy shape.
    const r = reconcilePhases({
      phaseValues: [],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 1_000_000_00,
    });
    expect(r.reconciles).toBe(true);
  });

  it("tolerates no rounding slack — a cent is a discrepancy", () => {
    const r = reconcilePhases({
      phaseValues: [1_000_000_01],
      contractValue: 1_050_000_00,
      designFee: 50_000_00,
      unphasedUnitValue: 0,
    });
    expect(r.reconciles).toBe(false);
  });
});
