import { describe, expect, it } from "vitest";
import { buildPhaseRollups, type PropertyRow, type UnitRow } from "../pricingMath";

const PHASES = [
  { id: 1, phaseNumber: 1, name: "Phase 1" },
  { id: 2, phaseNumber: 2, name: "Phase 2" },
];
const PROPERTIES: PropertyRow[] = [
  { id: 10, phaseId: 1, propertyCode: "P-1", address: "1 Zaca Station Rd" },
  { id: 11, phaseId: 1, propertyCode: "P-2", address: "2 Zaca Station Rd" },
  { id: 12, phaseId: 2, propertyCode: "P-3", address: null },
];

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

const UNITS: UnitRow[] = [
  unit({ id: 100, propertyId: 10, unitLabel: "P-1 Home", sourceName: "Lumina", squareFootage: 2033, bedrooms: 3, bathrooms: 2, offsiteBasePrice: 600_000_00, onsiteEstPrice: 100_000_00 }),
  unit({ id: 101, propertyId: 11, unitLabel: "P-2 Home", sourceName: "Gabriel", squareFootage: 1200, offsiteBasePrice: 400_000_00, onsiteEstPrice: 100_000_00 }),
  unit({ id: 102, propertyId: 12, unitLabel: "P-3 Home", sourceName: "Lumina", squareFootage: 2033, offsiteBasePrice: 500_000_00, onsiteEstPrice: 100_000_00 }),
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
    const orphan = [...UNITS, unit({ id: 200, propertyId: null, offsiteBasePrice: 999_000_00 })];
    const total = buildPhaseRollups(PHASES, PROPERTIES, orphan, "CRC").reduce((s, p) => s + p.breakdown.offsite, 0);
    expect(total).toBe(1_500_000_00);
  });

  it("ignores units of a real property row that exists but has no phase", () => {
    // This is what the database actually produces for an unphased property:
    // a real row in `properties` with `phaseId: null`, not a missing row.
    const unphasedProperty: PropertyRow = { id: 99, phaseId: null, propertyCode: "P-UNPHASED", address: null };
    const propertiesWithOrphan = [...PROPERTIES, unphasedProperty];
    const unitsWithOrphan = [
      ...UNITS,
      unit({ id: 201, propertyId: 99, offsiteBasePrice: 999_000_00, onsiteEstPrice: 999_000_00 }),
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
    const threePhases = [
      { id: 1, phaseNumber: 1, name: "Phase 1" },
      { id: 2, phaseNumber: 2, name: "Phase 2" },
      { id: 3, phaseNumber: 3, name: "Phase 3" },
    ];
    const threeProperties: PropertyRow[] = [
      { id: 10, phaseId: 1, propertyCode: "P-1", address: null },
      { id: 11, phaseId: 2, propertyCode: "P-2", address: null },
      { id: 12, phaseId: 3, propertyCode: "P-3", address: null },
    ];
    const threeUnits = [
      unit({ id: 300, propertyId: 10, onsiteEstPrice: 1 }),
      unit({ id: 301, propertyId: 11, onsiteEstPrice: 1 }),
      unit({ id: 302, propertyId: 12, onsiteEstPrice: 1 }),
    ];
    const additionalSiteWork = 100; // 100 / 3 does not divide evenly

    const rollups = buildPhaseRollups(threePhases, threeProperties, threeUnits, "CMOS", additionalSiteWork);
    const siteWorkShares = rollups.map((p) => p.breakdown.onsite - 1);

    expect(siteWorkShares.reduce((sum, s) => sum + s, 0)).toBe(additionalSiteWork);
    expect(siteWorkShares[2]).not.toBe(siteWorkShares[0]); // the residual landed somewhere
  });

  it("keeps customizations out of phase value while still reporting them", () => {
    // The project side leaves customizations out of `contractValue`; billing
    // them per phase would make the milestone rows exceed the project total on
    // the same document.
    const withCustomizations = [
      unit({ id: 400, propertyId: 10, offsiteBasePrice: 600_000_00, onsiteEstPrice: 100_000_00, customizationTotal: 75_000_00 }),
      unit({ id: 401, propertyId: 11, offsiteBasePrice: 400_000_00, onsiteEstPrice: 100_000_00, customizationTotal: 25_000_00 }),
    ];
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, withCustomizations, "CRC");

    expect(phase1.breakdown.customizations).toBe(100_000_00);
    expect(phase1.phaseValue).toBe(1_000_000_00);
    expect(phase1.milestones.find((m) => m.name === "Retainage")?.amount).toBe(50_000_00);
  });

  it("multiplies customizations by quantity in the breakdown without billing them", () => {
    const legacyQuantityUnit = [
      unit({ id: 500, propertyId: 10, quantity: 3, offsiteBasePrice: 100_000_00, customizationTotal: 10_000_00 }),
    ];
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, legacyQuantityUnit, "CRC");

    expect(phase1.breakdown.customizations).toBe(30_000_00);
    expect(phase1.phaseValue).toBe(300_000_00);
  });

  it("reconciles to contractValue minus the design fee when every property is phased", () => {
    // contractValue under CRC is designFee + offsite + shipping; under CMOS it
    // also carries on-site, including the project-level additional site work.
    const additionalSiteWork = 300_000_00;
    const offsite = 1_500_000_00;
    const shipping = 0;
    const onsite = 300_000_00 + additionalSiteWork;

    const crc = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", additionalSiteWork);
    expect(crc.reduce((s, p) => s + p.phaseValue, 0)).toBe(offsite + shipping);

    const cmos = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS", additionalSiteWork);
    expect(cmos.reduce((s, p) => s + p.phaseValue, 0)).toBe(offsite + shipping + onsite);
  });

  it("carries the property address and per-unit detail Exhibits A.2 and B.1 render", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC");
    const [firstProperty] = phase1.properties;

    expect(firstProperty).toMatchObject({
      id: 10,
      propertyCode: "P-1",
      address: "1 Zaca Station Rd",
    });
    expect(firstProperty.units).toEqual([
      {
        id: 100,
        unitLabel: "P-1 Home",
        sourceName: "Lumina",
        squareFootage: 2033,
        bedrooms: 3,
        bathrooms: 2,
        quantity: 1,
      },
    ]);
  });

  it("gives a property with no units an empty units array rather than omitting it", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, [UNITS[0]], "CRC");
    expect(phase1.properties.map((p) => p.propertyCode)).toEqual(["P-1", "P-2"]);
    expect(phase1.properties[1].units).toEqual([]);
  });
});
