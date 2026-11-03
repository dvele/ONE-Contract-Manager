import { describe, expect, it } from "vitest";
import { buildPhaseRollups, sumUnphasedUnitValue, type PropertyRow, type UnitRow } from "../pricingMath";

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
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, []);
    expect(phase1.breakdown.offsite).toBe(1_000_000_00);
    expect(phase1.properties.map((p) => p.propertyCode)).toEqual(["P-1", "P-2"]);
  });

  it("excludes on-site from phase value under CRC and includes it under CMOS", () => {
    const crc = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, [])[0];
    const cmos = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS", 0, [])[0];
    expect(crc.phaseValue).toBe(1_000_000_00);
    expect(cmos.phaseValue).toBe(1_200_000_00);
  });

  it("bills the same six percentages under either model", () => {
    const crc = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, [])[0];
    const cmos = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS", 0, [])[0];
    expect(crc.milestones.map((m) => m.percentage)).toEqual([20, 20, 20, 20, 15, 5]);
    expect(cmos.milestones.map((m) => m.percentage)).toEqual([20, 20, 20, 20, 15, 5]);
  });

  it("carries retainage under CRC, against the CRC phase value", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, []);
    const retainage = phase1.milestones.find((m) => m.name === "Retainage");
    // 5% of the CRC phase value (1,000,000 — on-site excluded), not of on-site.
    expect(retainage?.amount).toBe(50_000_00);
  });

  it("bills a larger retainage under CMOS because on-site is in the base", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS", 0, []);
    const retainage = phase1.milestones.find((m) => m.name === "Retainage");
    // 5% of 1,200,000 — the same percentage against a base that includes on-site.
    expect(retainage?.amount).toBe(60_000_00);
  });

  it("yields an empty array when no phases exist, preserving legacy behaviour", () => {
    expect(buildPhaseRollups([], [], UNITS, "CRC", 0, [])).toEqual([]);
  });

  it("ignores units whose property is not attached to any phase", () => {
    const orphan = [...UNITS, unit({ id: 200, propertyId: null, offsiteBasePrice: 999_000_00 })];
    const total = buildPhaseRollups(PHASES, PROPERTIES, orphan, "CRC", 0, []).reduce((s, p) => s + p.breakdown.offsite, 0);
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

    const rollups = buildPhaseRollups(PHASES, propertiesWithOrphan, unitsWithOrphan, "CRC", 0, []);

    expect(rollups.some((p) => p.properties.some((prop) => prop.propertyCode === "P-UNPHASED"))).toBe(false);
    const total = rollups.reduce((s, p) => s + p.breakdown.offsite, 0);
    expect(total).toBe(1_500_000_00);
  });

  it("pro-rates additional site work across phases by their share of on-site cost", () => {
    // Phase 1's units carry 200,000.00 on-site (2 x 100,000.00), phase 2's carry
    // 100,000.00 — a 2:1 split, so 300,000.00 of additional site work lands as
    // 200,000.00 / 100,000.00, on top of each phase's own on-site total.
    const [phase1, phase2] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CMOS", 300_000_00, []);
    expect(phase1.breakdown.onsite).toBe(400_000_00); // 200,000 units + 200,000 share
    expect(phase2.breakdown.onsite).toBe(200_000_00); // 100,000 units + 100,000 share
    expect(phase1.phaseValue).toBe(1_400_000_00);
    expect(phase2.phaseValue).toBe(700_000_00);
  });

  it("does not add additional site work to phaseValue under CRC, even though it still lands in the on-site breakdown", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 300_000_00, []);
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

    const rollups = buildPhaseRollups(threePhases, threeProperties, threeUnits, "CMOS", additionalSiteWork, []);
    const siteWorkShares = rollups.map((p) => p.breakdown.onsite - 1);

    expect(siteWorkShares.reduce((sum, s) => sum + s, 0)).toBe(additionalSiteWork);
    expect(siteWorkShares[2]).not.toBe(siteWorkShares[0]); // the residual landed somewhere
  });

  it("bills customizations in phase value while still reporting them separately", () => {
    // Every unit-table path adds customization_total to the Unit Price column,
    // and the project side bills it in `contractValue`; a phase that left it
    // out would bill less than the same document's unit table charges.
    const withCustomizations = [
      unit({ id: 400, propertyId: 10, offsiteBasePrice: 600_000_00, onsiteEstPrice: 100_000_00, customizationTotal: 75_000_00 }),
      unit({ id: 401, propertyId: 11, offsiteBasePrice: 400_000_00, onsiteEstPrice: 100_000_00, customizationTotal: 25_000_00 }),
    ];
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, withCustomizations, "CRC", 0, []);

    expect(phase1.breakdown.customizations).toBe(100_000_00);
    expect(phase1.phaseValue).toBe(1_100_000_00);
    expect(phase1.milestones.find((m) => m.name === "Retainage")?.amount).toBe(55_000_00);
  });

  it("multiplies customizations by quantity before billing them", () => {
    const legacyQuantityUnit = [
      unit({ id: 500, propertyId: 10, quantity: 3, offsiteBasePrice: 100_000_00, customizationTotal: 10_000_00 }),
    ];
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, legacyQuantityUnit, "CRC", 0, []);

    expect(phase1.breakdown.customizations).toBe(30_000_00);
    expect(phase1.phaseValue).toBe(330_000_00);
  });

  it("reconciles to contractValue minus the design fee when every property is phased", () => {
    // contractValue under CRC is designFee + offsite + customizations +
    // shipping; under CMOS it also carries on-site, including the
    // project-level additional site work.
    const additionalSiteWork = 300_000_00;
    const offsite = 1_500_000_00;
    const shipping = 0;
    const onsite = 300_000_00 + additionalSiteWork;
    const customizations = 150_000_00;
    const customized = UNITS.map((u, i) =>
      unit({ ...u, customizationTotal: [75_000_00, 25_000_00, 50_000_00][i] })
    );

    const crc = buildPhaseRollups(PHASES, PROPERTIES, customized, "CRC", additionalSiteWork, []);
    expect(crc.reduce((s, p) => s + p.phaseValue, 0)).toBe(offsite + customizations + shipping);

    const cmos = buildPhaseRollups(PHASES, PROPERTIES, customized, "CMOS", additionalSiteWork, []);
    expect(cmos.reduce((s, p) => s + p.phaseValue, 0)).toBe(offsite + customizations + shipping + onsite);
  });

  it("carries the property address and per-unit detail Exhibits A.2 and B.1 render", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, []);
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
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, [UNITS[0]], "CRC", 0, []);
    expect(phase1.properties.map((p) => p.propertyCode)).toEqual(["P-1", "P-2"]);
    expect(phase1.properties[1].units).toEqual([]);
  });

  it("matches phaseDates to each phase by phaseNumber, not by array position", () => {
    // Deliberately out of order and offset from PHASES's own [1, 2] ordering,
    // so a position-based join would either misattribute or throw.
    const phaseDates = [
      { phaseNumber: 2, factoryStart: "2027-06-01", factoryComplete: "2027-07-01", deliveryWindow: "2027-07-08", targetCO: "2027-08-01" },
      { phaseNumber: 1, factoryStart: "2027-01-01", factoryComplete: "2027-02-01", deliveryWindow: "2027-02-08", targetCO: "2027-03-01" },
    ];

    const [phase1, phase2] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, phaseDates);

    expect(phase1.dates.factoryStart).toBe("2027-01-01");
    expect(phase2.dates.factoryStart).toBe("2027-06-01");
  });

  it("gives a phase with no matching phaseDates entry all-null dates rather than throwing", () => {
    const phaseDates = [
      { phaseNumber: 1, factoryStart: "2027-01-01", factoryComplete: "2027-02-01", deliveryWindow: "2027-02-08", targetCO: "2027-03-01" },
    ];

    const [phase1, phase2] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, phaseDates);

    expect(phase1.dates.factoryStart).toBe("2027-01-01");
    expect(phase2.dates).toEqual({
      phaseNumber: 2,
      factoryStart: null,
      factoryComplete: null,
      deliveryWindow: null,
      targetCO: null,
    });
  });

  it("gives every phase all-null dates when phaseDates is an empty array", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, []);
    expect(phase1.dates).toEqual({
      phaseNumber: 1,
      factoryStart: null,
      factoryComplete: null,
      deliveryWindow: null,
      targetCO: null,
    });
  });

  it("prefers a phase's stored milestones over the default template", () => {
    const storedMilestones = new Map([
      [1, [
        { name: "Deposit", trigger: "Execution", percentage: 50 },
        { name: "Balance", trigger: "Delivery", percentage: 50 },
      ]],
    ]);

    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, [], { storedMilestones });

    expect(phase1.milestones.map((m) => m.name)).toEqual(["Deposit", "Balance"]);
    expect(phase1.milestones.map((m) => m.amount)).toEqual([500_000_00, 500_000_00]);
  });

  it("falls back to the template for a phase with no stored milestones", () => {
    const storedMilestones = new Map([
      [1, [{ name: "Deposit", trigger: "Execution", percentage: 100 }]],
    ]);

    const [, phase2] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, [], { storedMilestones });

    expect(phase2.milestones.map((m) => m.name)).toEqual([
      "Signing Deposit",
      "Green Light",
      "Production Start",
      "Production Midpoint",
      "Delivery",
      "Retainage",
    ]);
  });

  it("uses stored percentages as given when they do not total 100", () => {
    // The route validates the set; the math reports what is stored rather than
    // silently normalising it, so a bad set stays visible instead of looking correct.
    const storedMilestones = new Map([
      [1, [
        { name: "Deposit", trigger: "Execution", percentage: 40 },
        { name: "Balance", trigger: "Delivery", percentage: 50 },
      ]],
    ]);

    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, [], { storedMilestones });

    expect(phase1.milestones.map((m) => m.percentage)).toEqual([40, 50]);
  });

  it("still makes stored milestone amounts sum to the phase value exactly", () => {
    // A phase value that does not divide evenly, so there is a real residual to
    // place — a round one leaves nothing to test.
    const odd = [unit({ id: 100, propertyId: 10, offsiteBasePrice: 1_000_000_07 })];
    const storedMilestones = new Map([
      [1, [
        { name: "A", trigger: "t", percentage: 33.33 },
        { name: "B", trigger: "t", percentage: 33.33 },
        { name: "C", trigger: "t", percentage: 33.34 },
      ]],
    ]);

    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, odd, "CRC", 0, [], { storedMilestones });

    expect(phase1.phaseValue).toBe(1_000_000_07);
    expect(phase1.milestones.reduce((s, m) => s + m.amount, 0)).toBe(1_000_000_07);
  });

  it("leaves a stored retainage exact and puts the residual on the last row before it", () => {
    const odd = [unit({ id: 100, propertyId: 10, offsiteBasePrice: 1_000_000_07 })];
    const storedMilestones = new Map([
      [1, [
        { name: "Deposit", trigger: "Execution", percentage: 33.33 },
        { name: "Balance", trigger: "Delivery", percentage: 61.67 },
        { name: "Retainage", trigger: "CO", percentage: 5 },
      ]],
    ]);

    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, odd, "CRC", 0, [], { storedMilestones });
    const [, balance, retainage] = phase1.milestones;

    expect(retainage.amount).toBe(Math.round((1_000_000_07 * 5) / 100));
    expect(balance.amount).not.toBe(Math.round((1_000_000_07 * 61.67) / 100));
    expect(phase1.milestones.reduce((s, m) => s + m.amount, 0)).toBe(1_000_000_07);
  });

  it("pro-rates the offsite adjustment across phases by their share of offsite cost", () => {
    // Phase 1's units carry 1,000,000.00 offsite, phase 2's carry 500,000.00 —
    // a 2:1 split, so 300,000.00 lands as 200,000.00 / 100,000.00.
    const [phase1, phase2] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, [], {
      additionalOffsite: 300_000_00,
    });

    expect(phase1.breakdown.offsite).toBe(1_200_000_00);
    expect(phase2.breakdown.offsite).toBe(600_000_00);
    expect(phase1.phaseValue).toBe(1_200_000_00);
  });

  it("pro-rates the delivery adjustment across phases by their share of shipping cost", () => {
    const shipped = [
      unit({ id: 100, propertyId: 10, offsiteBasePrice: 600_000_00, shippingSetPrice: 20_000_00 }),
      unit({ id: 101, propertyId: 11, offsiteBasePrice: 400_000_00, shippingSetPrice: 10_000_00 }),
      unit({ id: 102, propertyId: 12, offsiteBasePrice: 500_000_00, shippingSetPrice: 15_000_00 }),
    ];

    const [phase1, phase2] = buildPhaseRollups(PHASES, PROPERTIES, shipped, "CRC", 0, [], {
      additionalDelivery: 90_000_00,
    });

    expect(phase1.breakdown.shipping).toBe(90_000_00); // 30,000 units + 60,000 share
    expect(phase2.breakdown.shipping).toBe(45_000_00); // 15,000 units + 30,000 share
  });

  it("gives the last phase the residual of an offsite adjustment that does not divide evenly", () => {
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
      unit({ id: 300, propertyId: 10, offsiteBasePrice: 1 }),
      unit({ id: 301, propertyId: 11, offsiteBasePrice: 1 }),
      unit({ id: 302, propertyId: 12, offsiteBasePrice: 1 }),
    ];

    const rollups = buildPhaseRollups(threePhases, threeProperties, threeUnits, "CRC", 0, [], {
      additionalOffsite: 100,
    });
    const shares = rollups.map((p) => p.breakdown.offsite - 1);

    expect(shares.reduce((sum, s) => sum + s, 0)).toBe(100);
  });

  it("bills both offsite adjustments in phase value under either model", () => {
    const shipped = [
      unit({ id: 100, propertyId: 10, offsiteBasePrice: 600_000_00, onsiteEstPrice: 100_000_00, shippingSetPrice: 20_000_00 }),
      unit({ id: 101, propertyId: 11, offsiteBasePrice: 400_000_00, onsiteEstPrice: 100_000_00, shippingSetPrice: 10_000_00 }),
      unit({ id: 102, propertyId: 12, offsiteBasePrice: 500_000_00, onsiteEstPrice: 100_000_00, shippingSetPrice: 15_000_00 }),
    ];
    const options = { additionalOffsite: 300_000_00, additionalDelivery: 90_000_00 };
    const [crc] = buildPhaseRollups(PHASES, PROPERTIES, shipped, "CRC", 0, [], options);
    const [cmos] = buildPhaseRollups(PHASES, PROPERTIES, shipped, "CMOS", 0, [], options);

    // Phase 1 takes 2/3 of each adjustment: 200,000 offsite and 60,000 delivery,
    // on top of its 1,000,000 offsite and 30,000 shipping. On-site (200,000) is
    // billed only under CMOS.
    expect(crc.phaseValue).toBe(1_290_000_00);
    expect(cmos.phaseValue).toBe(1_490_000_00);
  });

  it("puts an adjustment entirely on the last phase when there is no cost to divide by", () => {
    // Every phase carries zero shipping, so no proportion exists. Dropping the
    // adjustment would bill less than the project total, so the last phase takes
    // it whole — the behaviour already accepted for the on-site buffer.
    const [phase1, phase2] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, [], {
      additionalDelivery: 60_000_00,
    });

    expect(phase1.breakdown.shipping).toBe(0);
    expect(phase2.breakdown.shipping).toBe(60_000_00);
  });
});

describe("FOB Delivery Model", () => {
  // One unit carrying every price component, so each model's total shows which
  // components it bills.
  const full = [
    unit({
      id: 200,
      propertyId: 10,
      offsiteBasePrice: 100_000_00,
      shippingSetPrice: 10_000_00,
      onsiteEstPrice: 50_000_00,
      customizationTotal: 5_000_00,
    }),
  ];

  it("FOB phaseValue excludes shipping and on-site", () => {
    const value = (m: "FOB" | "CRC" | "CMOS") =>
      buildPhaseRollups(PHASES, PROPERTIES, full, m, 0, [])[0].phaseValue;

    expect(value("FOB")).toBe(105_000_00);
    // Regression guards: the existing models are unchanged.
    expect(value("CRC")).toBe(115_000_00);
    expect(value("CMOS")).toBe(165_000_00);
  });

  it("FOB drops the project-level delivery adjustment along with shipping", () => {
    const [phase1] = buildPhaseRollups(PHASES, PROPERTIES, full, "FOB", 0, [], {
      additionalDelivery: 20_000_00,
    });
    expect(phase1.phaseValue).toBe(105_000_00);
  });

  it("FOB sumUnphasedUnitValue excludes shipping", () => {
    const unphased = (m: "FOB" | "CRC" | "CMOS") =>
      sumUnphasedUnitValue([], [{ ...full[0], propertyId: null }], m);

    expect(unphased("FOB")).toBe(105_000_00);
    expect(unphased("CRC")).toBe(115_000_00);
    expect(unphased("CMOS")).toBe(165_000_00);
  });

  it("milestoneSource reports stored vs default", () => {
    const storedMilestones = new Map([
      [1, [{ name: "Deposit", trigger: "Signing", percentage: 100 }]],
    ]);
    const [phase1, phase2] = buildPhaseRollups(PHASES, PROPERTIES, UNITS, "CRC", 0, [], {
      storedMilestones,
    });

    expect(phase1.milestoneSource).toBe("stored");
    expect(phase2.milestoneSource).toBe("default");
  });
});
