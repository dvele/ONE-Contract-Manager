import { describe, expect, it } from "vitest";
import { buildPhaseRollups } from "../pricingEngine";

const PHASES = [
  { id: 1, phaseNumber: 1, name: "Phase 1" },
  { id: 2, phaseNumber: 2, name: "Phase 2" },
];
const PROPERTIES = [
  { id: 10, phaseId: 1, propertyCode: "P-1" },
  { id: 11, phaseId: 1, propertyCode: "P-2" },
  { id: 12, phaseId: 2, propertyCode: "P-3" },
];
const UNITS = [
  { propertyId: 10, quantity: 1, offsiteBasePrice: 600_000_00, onsiteEstPrice: 100_000_00, shippingSetPrice: 0, customizationTotal: 0 },
  { propertyId: 11, quantity: 1, offsiteBasePrice: 400_000_00, onsiteEstPrice: 100_000_00, shippingSetPrice: 0, customizationTotal: 0 },
  { propertyId: 12, quantity: 1, offsiteBasePrice: 500_000_00, onsiteEstPrice: 100_000_00, shippingSetPrice: 0, customizationTotal: 0 },
];

describe("buildPhaseRollups", () => {
  it("sums a phase from the units of all its properties", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC");
    expect(phase1.breakdown.offsite).toBe(1_000_000_00);
    expect(phase1.properties.map((p) => p.propertyCode)).toEqual(["P-1", "P-2"]);
  });

  it("excludes on-site from phase value under CRC and includes it under CMOS", () => {
    const crc = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC")[0];
    const cmos = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS")[0];
    expect(crc.phaseValue).toBe(1_000_000_00);
    expect(cmos.phaseValue).toBe(1_200_000_00);
  });

  it("bills the same six percentages under either model", () => {
    const crc = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC")[0];
    const cmos = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS")[0];
    expect(crc.milestones.map((m) => m.percentage)).toEqual([20, 20, 20, 20, 15, 5]);
    expect(cmos.milestones.map((m) => m.percentage)).toEqual([20, 20, 20, 20, 15, 5]);
  });

  it("carries retainage under CRC, against the CRC phase value", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC");
    const retainage = phase1.milestones.find((m) => m.name === "Retainage");
    // 5% of the CRC phase value (1,000,000 — on-site excluded), not of on-site.
    expect(retainage?.amount).toBe(50_000_00);
  });

  it("bills a larger retainage under CMOS because on-site is in the base", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS");
    const retainage = phase1.milestones.find((m) => m.name === "Retainage");
    // 5% of 1,200,000 — the same percentage against a base that includes on-site.
    expect(retainage?.amount).toBe(60_000_00);
  });

  it("yields an empty array when no phases exist, preserving legacy behaviour", () => {
    expect(buildPhaseRollups([], [], UNITS, "CRC")).toEqual([]);
  });

  it("ignores units whose property is not attached to any phase", () => {
    const orphan = [...UNITS, { propertyId: null, quantity: 1, offsiteBasePrice: 999_000_00, onsiteEstPrice: 0, shippingSetPrice: 0, customizationTotal: 0 }];
    const total = buildPhaseRollups(PHASES, PROPERTIES, orphan, "CRC").reduce((s, p) => s + p.breakdown.offsite, 0);
    expect(total).toBe(1_500_000_00);
  });
});
