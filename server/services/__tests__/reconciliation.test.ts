import { describe, expect, it } from "vitest";
import { reconcilePhases, sumUnphasedUnitValue, type PropertyRow, type UnitRow } from "../pricingMath";

function unit(overrides: Partial<UnitRow> & Pick<UnitRow, "id" | "propertyId">): UnitRow {
  return {
    unitLabel: null,
    sourceName: null,
    squareFootage: null,
    bedrooms: null,
    bathrooms: null,
    quantity: 1,
    offsiteBasePrice: 0,
    onsiteEstPrice: 0,
    shippingSetPrice: 0,
    customizationTotal: 0,
    ...overrides,
  };
}

const PHASED: PropertyRow = { id: 10, phaseId: 1, propertyCode: "P-1", address: null };
const UNPHASED: PropertyRow = { id: 99, phaseId: null, propertyCode: "P-99", address: null };

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

describe("sumUnphasedUnitValue", () => {
  it("counts a unit whose property carries no phase", () => {
    const value = sumUnphasedUnitValue(
      [PHASED, UNPHASED],
      [unit({ id: 1, propertyId: 99, offsiteBasePrice: 400_000_00 })],
      "CRC"
    );
    expect(value).toBe(400_000_00);
  });

  it("counts a unit attached to no property at all", () => {
    const value = sumUnphasedUnitValue(
      [PHASED],
      [unit({ id: 1, propertyId: null, offsiteBasePrice: 400_000_00 })],
      "CRC"
    );
    expect(value).toBe(400_000_00);
  });

  it("counts a unit whose property row is missing entirely", () => {
    const value = sumUnphasedUnitValue(
      [PHASED],
      [unit({ id: 1, propertyId: 12345, offsiteBasePrice: 400_000_00 })],
      "CRC"
    );
    expect(value).toBe(400_000_00);
  });

  it("excludes a unit sitting on a phased property", () => {
    const value = sumUnphasedUnitValue(
      [PHASED],
      [unit({ id: 1, propertyId: 10, offsiteBasePrice: 400_000_00 })],
      "CRC"
    );
    expect(value).toBe(0);
  });

  it("carries on-site only under CMOS, matching how phaseValue is built", () => {
    const units = [unit({ id: 1, propertyId: null, offsiteBasePrice: 400_000_00, onsiteEstPrice: 100_000_00 })];
    expect(sumUnphasedUnitValue([], units, "CRC")).toBe(400_000_00);
    expect(sumUnphasedUnitValue([], units, "CMOS")).toBe(500_000_00);
  });

  it("bills shipping and customizations, multiplied by quantity", () => {
    const value = sumUnphasedUnitValue(
      [],
      [unit({
        id: 1,
        propertyId: null,
        quantity: 3,
        offsiteBasePrice: 100_000_00,
        shippingSetPrice: 10_000_00,
        customizationTotal: 5_000_00,
      })],
      "CRC"
    );
    expect(value).toBe(345_000_00);
  });
});
