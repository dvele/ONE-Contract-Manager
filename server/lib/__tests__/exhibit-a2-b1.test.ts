import { describe, expect, it } from "vitest";
import { generateExhibitA2TableHtml, generateExhibitB1TableHtml } from "../tableGenerators";

const PHASES = [
  {
    phaseId: 1,
    phaseNumber: 1,
    name: "Phase 1",
    properties: [
      {
        id: 10,
        propertyCode: "P-1",
        address: "1 Zaca Station Rd",
        units: [
          { id: 100, unitLabel: "P-1 Home", sourceName: "Lumina", squareFootage: 2033, bedrooms: 3, bathrooms: 2, quantity: 14 },
        ],
      },
      {
        id: 11,
        propertyCode: "P-2",
        address: null,
        units: [
          { id: 101, unitLabel: "P-2 Home", sourceName: "Gabriel", squareFootage: 1200, bedrooms: 2, bathrooms: 1, quantity: 7 },
        ],
      },
    ],
    breakdown: { offsite: 0, onsite: 0, shipping: 0, customizations: 0 },
    phaseValue: 0,
    milestones: [],
    dates: {
      phaseNumber: 1,
      factoryStart: "2027-01-04",
      factoryComplete: "2027-05-03",
      deliveryWindow: "2027-05-10",
      targetCO: "2027-08-01",
    },
  },
];

describe("generateExhibitA2TableHtml", () => {
  it("gives every property its own row, not a hardcoded P-1", () => {
    const html = generateExhibitA2TableHtml(PHASES, "");
    expect(html).toContain("P-1");
    expect(html).toContain("P-2");
  });

  it("fills the four date columns from the owning phase", () => {
    const html = generateExhibitA2TableHtml(PHASES, "");
    expect(html).toContain("January 4, 2027");
    expect(html).toContain("August 1, 2027");
  });

  it("renders TBD for a date the phase has not derived", () => {
    const undated = [{ ...PHASES[0], dates: { phaseNumber: 1, factoryStart: null, factoryComplete: null, deliveryWindow: null, targetCO: null } }];
    expect(generateExhibitA2TableHtml(undated, "")).toContain("TBD");
  });

  it("counts quantities, not line items", () => {
    // The issued agreement read "21 Units: 1x Gabriel, 1x Lumina".
    const html = generateExhibitA2TableHtml(PHASES, "");
    expect(html).toContain("14");
    expect(html).toContain("7");
  });

  it("falls back to the project address for a property with none", () => {
    const html = generateExhibitA2TableHtml(PHASES, "1234 Fallback Rd");
    expect(html).toContain("1 Zaca Station Rd");
    expect(html).toContain("1234 Fallback Rd");
  });

  it("says so plainly when there are no phases", () => {
    expect(generateExhibitA2TableHtml([], "")).toContain("No properties configured");
  });
});

describe("generateExhibitB1TableHtml", () => {
  it("numbers rows by the stored property code, not by array position", () => {
    const html = generateExhibitB1TableHtml(PHASES);
    expect(html).toContain("P-1");
    expect(html).toContain("P-2");
  });

  it("totals the unit quantities", () => {
    expect(generateExhibitB1TableHtml(PHASES)).toContain("21");
  });

  it("carries each unit's specs", () => {
    const html = generateExhibitB1TableHtml(PHASES);
    expect(html).toContain("2,033 sqft");
    expect(html).toContain("3 Bed");
  });
});
