import { describe, expect, it } from "vitest";
import { generateExhibitA5TableHtml } from "../tableGenerators";

const SUMMARY = {
  breakdown: {
    totalDesignFee: 200_000_00,
    totalOffsite: 10_000_000_00,
    totalOnsite: 2_000_000_00,
    totalCustomizations: 0,
    totalShipping: 0,
  },
  grandTotal: 12_200_000_00,
  projectBudget: 12_200_000_00,
  contractValue: 10_200_000_00,
  serviceModel: "CRC",
};

function phase(phaseNumber: number, propertyCode: string, phaseValue: number) {
  return {
    phaseId: phaseNumber,
    phaseNumber,
    name: `Phase ${phaseNumber}`,
    properties: [{ id: phaseNumber, propertyCode, address: null, units: [] }],
    breakdown: { offsite: phaseValue, onsite: 0, shipping: 0, customizations: 0 },
    phaseValue,
    milestones: [
      { name: "Signing Deposit", trigger: "Contract Execution", percentage: 20, amount: phaseValue * 0.2 },
      { name: "Retainage", trigger: "CO/Equivalent", percentage: 80, amount: phaseValue * 0.8 },
    ],
    dates: { phaseNumber, factoryStart: null, factoryComplete: null, deliveryWindow: null, targetCO: null },
  };
}

const PHASES = [phase(1, "P-1", 6_000_000_00), phase(2, "P-2", 4_000_000_00)];

describe("generateExhibitA5TableHtml", () => {
  it("bills the design fee on exactly one row", () => {
    // The milestone base excludes the design fee by construction, so a design
    // fee row plus a base that contained it billed the client twice.
    const html = generateExhibitA5TableHtml(PHASES, SUMMARY, "CRC");
    expect(html.match(/Design Fee/g)?.length).toBe(1);
  });

  it("totals the design fee plus every phase's milestones, and that equals the contract value", () => {
    const html = generateExhibitA5TableHtml(PHASES, SUMMARY, "CRC");
    expect(html).toContain("$10,200,000");
  });

  it("names each phase's property beside its milestones", () => {
    const html = generateExhibitA5TableHtml(PHASES, SUMMARY, "CRC");
    expect(html).toContain("P-1");
    expect(html).toContain("P-2");
  });

  it("renders every phase's milestones, not only the first phase's", () => {
    const html = generateExhibitA5TableHtml(PHASES, SUMMARY, "CRC");
    expect(html.match(/Signing Deposit/g)?.length).toBe(2);
  });

  it("renders the design fee alone for a project with no phases", () => {
    // phases: [] is the documented legacy shape; it must still produce a table.
    const html = generateExhibitA5TableHtml([], SUMMARY, "CRC");
    expect(html).toContain("Design Fee");
    expect(html).toContain("$200,000");
  });

  it("reports missing pricing rather than rendering an empty table", () => {
    expect(generateExhibitA5TableHtml(PHASES, null, "CRC")).toBe("No pricing data available.");
  });
});
