import { describe, expect, it } from "vitest";
import { generateExhibitA5TableHtml } from "../tableGenerators";

const PAYMENT_SCHEDULE = [
  { name: "Signing Deposit", percentage: 20, amount: 2_040_000_00, phase: "Design" },
  { name: "Green Light", percentage: 20, amount: 2_040_000_00, phase: "Production" },
  { name: "Production Start", percentage: 20, amount: 2_040_000_00, phase: "Production" },
  { name: "Production Midpoint", percentage: 20, amount: 2_040_000_00, phase: "Production" },
  { name: "Delivery", percentage: 15, amount: 1_530_000_00, phase: "Delivery" },
  { name: "Retainage", percentage: 5, amount: 510_000_00, phase: "Completion" },
];

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
  paymentSchedule: PAYMENT_SCHEDULE,
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

/** Every currency figure in the rendered table, in order. */
function figures(html: string): number[] {
  return (html.match(/\$[\d,]+/g) ?? []).map((f) => Number(f.replace(/[$,]/g, "")));
}

/** The line items and the Total row's figure, which is always the last one. */
function rowsAndTotal(html: string): { rows: number[]; total: number } {
  const all = figures(html);
  const total = all.pop();
  expect(total).toBeDefined();
  return { rows: all, total: total as number };
}

/** The Total row's cell text, tags stripped. */
function totalRowCells(html: string): string[] {
  const rows = html.match(/<tr>(?:(?!<\/tr>).)*<\/tr>/g) ?? [];
  const last = rows[rows.length - 1] ?? "";
  return (last.match(/<td[^>]*>(.*?)<\/td>/g) ?? []).map((cell) =>
    cell.replace(/<[^>]*>/g, "").trim()
  );
}

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

  it("reports missing pricing rather than rendering an empty table", () => {
    expect(generateExhibitA5TableHtml(PHASES, null, "CRC")).toBe("No pricing data available.");
  });

  describe("the Total states the sum of the rows above it", () => {
    it("for a fully phased project", () => {
      const { rows, total } = rowsAndTotal(generateExhibitA5TableHtml(PHASES, SUMMARY, "CRC"));
      expect(rows.reduce((sum, f) => sum + f, 0)).toBe(total);
      expect(total).toBe(10_200_000);
    });

    it("for a project with no phases", () => {
      // Every project created before the phase model has phases: []. Its A.5
      // printed one $200,000 design fee row under a $10,200,000 Total.
      const { rows, total } = rowsAndTotal(generateExhibitA5TableHtml([], SUMMARY, "CRC"));
      expect(rows.reduce((sum, f) => sum + f, 0)).toBe(total);
      expect(total).toBe(10_200_000);
    });

    it("for a project whose phases do not account for the whole contract value", () => {
      // Units on a property with no phase: reconcilePhases permits this, so
      // generation proceeds with money in the total that no row represents.
      const partial = [phase(1, "P-1", 6_000_000_00)];
      const { rows, total } = rowsAndTotal(generateExhibitA5TableHtml(partial, SUMMARY, "CRC"));
      expect(rows.reduce((sum, f) => sum + f, 0)).toBe(total);
      // 200,000 design fee + 6,000,000 of phased milestones — not the
      // 10,200,000 contract value, because no row carries the difference.
      expect(total).toBe(6_200_000);
    });
  });

  describe("a project with no phases", () => {
    it("still states payment terms, from the project-level schedule", () => {
      const html = generateExhibitA5TableHtml([], SUMMARY, "CRC");
      for (const milestone of PAYMENT_SCHEDULE) {
        expect(html).toContain(milestone.name);
      }
    });

    it("prices those milestones against the contract value less the design fee", () => {
      // Task 4's invariant: the design fee is billed once, on its own row, and
      // is never inside the base the milestones divide.
      const { rows } = rowsAndTotal(generateExhibitA5TableHtml([], SUMMARY, "CRC"));
      const [designFee, ...milestones] = rows;
      expect(designFee).toBe(200_000);
      expect(milestones.reduce((sum, f) => sum + f, 0)).toBe(10_000_000);
    });

    it("renders the design fee alone when there is no schedule either", () => {
      const noSchedule = { ...SUMMARY, paymentSchedule: [] };
      const { rows, total } = rowsAndTotal(generateExhibitA5TableHtml([], noSchedule, "CRC"));
      expect(rows).toEqual([200_000]);
      expect(total).toBe(200_000);
    });
  });

  describe("the percentage column", () => {
    it("names the denominator each phased percentage is taken against", () => {
      const html = generateExhibitA5TableHtml(PHASES, SUMMARY, "CRC");
      expect(html).toContain("% of Phase");
    });

    it("claims no percentage for the Total, which the rows are not percentages of", () => {
      // "Total ... 100%" beside the contract value invited the reader to take
      // 20% of it and expect the Signing Deposit, which is 20% of one phase.
      const cells = totalRowCells(generateExhibitA5TableHtml(PHASES, SUMMARY, "CRC"));
      expect(cells[2]).toBe("Total");
      expect(cells[4]).toBe("—");
    });
  });
});
