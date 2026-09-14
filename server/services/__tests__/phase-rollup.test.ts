import { describe, expect, it } from "vitest";
import { buildPhaseRollups } from "../pricingMath";

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

  it("ignores units of a real property row that exists but has no phase", () => {
    // This is what the database actually produces for an unphased property:
    // a real row in `properties` with `phaseId: null`, not a missing row.
    const unphasedProperty = { id: 99, phaseId: null, propertyCode: "P-UNPHASED" };
    const propertiesWithOrphan = [...PROPERTIES, unphasedProperty];
    const unitsWithOrphan = [
      ...UNITS,
      { propertyId: 99, quantity: 1, offsiteBasePrice: 999_000_00, onsiteEstPrice: 999_000_00, shippingSetPrice: 0, customizationTotal: 0 },
    ];

    const rollups = buildPhaseRollups(PHASES, propertiesWithOrphan, unitsWithOrphan, "CRC");

    expect(rollups.some((p) => p.properties.some((prop) => prop.propertyCode === "P-UNPHASED"))).toBe(false);
    const total = rollups.reduce((s, p) => s + p.breakdown.offsite, 0);
    expect(total).toBe(1_500_000_00);
  });

  it("pro-rates additional site work across phases by their share of on-site cost", () => {
    // Phase 1's units carry 200,000.00 on-site (2 x 100,000.00), phase 2's carry
    // 100,000.00 — a 2:1 split, so 300,000.00 of additional site work lands as
    // 200,000.00 / 100,000.00, on top of each phase's own on-site total.
    const [phase1, phase2] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS", 300_000_00);
    expect(phase1.breakdown.onsite).toBe(400_000_00); // 200,000 units + 200,000 share
    expect(phase2.breakdown.onsite).toBe(200_000_00); // 100,000 units + 100,000 share
    expect(phase1.phaseValue).toBe(1_400_000_00);
    expect(phase2.phaseValue).toBe(700_000_00);
  });

  it("does not add additional site work to phaseValue under CRC, even though it still lands in the on-site breakdown", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 300_000_00);
    expect(phase1.breakdown.onsite).toBe(400_000_00);
    expect(phase1.phaseValue).toBe(1_000_000_00); // unchanged: on-site excluded under CRC
  });

  it("gives the last phase the rounding residual so shares sum to the whole exactly", () => {
    // 100 split 2:1:1 across three equal-on-site... use uneven on-site shares
    // that don't divide evenly to force a residual.
    const threePhases = [
      { id: 1, phaseNumber: 1, name: "Phase 1" },
      { id: 2, phaseNumber: 2, name: "Phase 2" },
      { id: 3, phaseNumber: 3, name: "Phase 3" },
    ];
    const threeProperties = [
      { id: 10, phaseId: 1, propertyCode: "P-1" },
      { id: 11, phaseId: 2, propertyCode: "P-2" },
      { id: 12, phaseId: 3, propertyCode: "P-3" },
    ];
    const threeUnits = [
      { propertyId: 10, quantity: 1, offsiteBasePrice: 0, onsiteEstPrice: 1, shippingSetPrice: 0, customizationTotal: 0 },
      { propertyId: 11, quantity: 1, offsiteBasePrice: 0, onsiteEstPrice: 1, shippingSetPrice: 0, customizationTotal: 0 },
      { propertyId: 12, quantity: 1, offsiteBasePrice: 0, onsiteEstPrice: 1, shippingSetPrice: 0, customizationTotal: 0 },
    ];
    const additionalSiteWork = 100; // 100 / 3 does not divide evenly

    const rollups = buildPhaseRollups(threePhases, threeProperties, threeUnits, "CMOS", additionalSiteWork);
    const siteWorkShares = rollups.map((p) => p.breakdown.onsite - 1);

    expect(siteWorkShares.reduce((sum, s) => sum + s, 0)).toBe(additionalSiteWork);
    expect(siteWorkShares[2]).not.toBe(siteWorkShares[0]); // the residual landed somewhere
  });
});
