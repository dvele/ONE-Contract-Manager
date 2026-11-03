import { describe, expect, it } from "vitest";
import {
  AGREEMENT_MILESTONES,
  generateExhibitA5PaymentTableHtml,
} from "../tableGenerators";
import { mapProjectToVariables, type ProjectWithRelations } from "../mapper";

function summary(contractValue: number, totalDesignFee = 0) {
  return {
    breakdown: {
      totalDesignFee,
      totalOffsite: contractValue - totalDesignFee,
      totalOnsite: 0,
      totalCustomizations: 0,
      totalShipping: 0,
    },
    grandTotal: contractValue,
    projectBudget: contractValue,
    contractValue,
    serviceModel: "FOB",
    paymentSchedule: [],
  } as any;
}

function phase(
  phaseNumber: number,
  propertyCode: string,
  phaseValue: number,
  source: "stored" | "default" = "default",
  milestones: { name: string; trigger: string; percentage: number; amount: number }[] = []
) {
  return {
    phaseNumber,
    properties: [{ propertyCode, address: null, units: [] }],
    dates: { phaseNumber, factoryStart: null, factoryComplete: null, deliveryWindow: null, targetCO: null },
    phaseValue,
    milestoneSource: source,
    milestones,
  };
}

function figures(html: string): number[] {
  return (html.match(/\$[\d,]+/g) ?? []).map((f) => Number(f.replace(/[$,]/g, "")));
}

function bodyRows(html: string): string[][] {
  const rows = html.match(/<tr>(?:(?!<\/tr>).)*<\/tr>/g) ?? [];
  return rows
    .map((r) => (r.match(/<td[^>]*>(.*?)<\/td>/g) ?? []).map((c) => c.replace(/<[^>]*>/g, "").trim()))
    .filter((cells) => cells.length > 0);
}

describe("generateExhibitA5PaymentTableHtml", () => {
  it("splits an unphased contract value 10/40/40/10", () => {
    const html = generateExhibitA5PaymentTableHtml([], summary(10_200_000_00));
    expect(figures(html)).toEqual([1_020_000, 4_080_000, 4_080_000, 1_020_000, 10_200_000]);
    for (const h of ["Home ID", "Phase", "Payment", "Trigger", "% payment", "Price", "Due"]) {
      expect(html).toContain(h);
    }
    expect(html).toContain("Upon execution of Exhibit A");
    expect(AGREEMENT_MILESTONES.map((m) => m.percentage)).toEqual([10, 40, 40, 10]);
  });

  it("folds the design fee into two default phases", () => {
    const html = generateExhibitA5PaymentTableHtml(
      [phase(1, "P-1", 6_000_000_00), phase(2, "P-2", 4_000_000_00)],
      summary(10_200_000_00, 200_000_00)
    );
    const all = figures(html);
    expect(all.pop()).toBe(10_200_000);
    // phase 1 base is 6,120,000: 10% / 40% / 40% / 10%
    expect(all.slice(0, 4)).toEqual([612_000, 2_448_000, 2_448_000, 612_000]);
    expect(all.slice(4)).toEqual([408_000, 1_632_000, 1_632_000, 408_000]);
    expect(bodyRows(html)[0][0]).toBe("P-1");
  });

  it("keeps a stored phase's 20/80 over its base, with no Due text", () => {
    const stored = phase(1, "P-1", 10_000_000_00, "stored", [
      { name: "Signing Deposit", trigger: "Contract Execution", percentage: 20, amount: 0 },
      { name: "Retainage", trigger: "CO/Equivalent", percentage: 80, amount: 0 },
    ]);
    const html = generateExhibitA5PaymentTableHtml([stored], summary(10_200_000_00, 200_000_00));
    expect(figures(html)).toEqual([2_040_000, 8_160_000, 10_200_000]);
    const rows = bodyRows(html);
    expect(rows[0][4]).toBe("20%");
    expect(rows[1][4]).toBe("80%");
    expect(rows[0][6]).toBe("");
  });

  it("has no Design Fee row", () => {
    const html = generateExhibitA5PaymentTableHtml(
      [phase(1, "P-1", 6_000_000_00), phase(2, "P-2", 4_000_000_00)],
      summary(10_200_000_00, 200_000_00)
    );
    expect(html).not.toContain("Design Fee");
    expect(generateExhibitA5PaymentTableHtml([], summary(10_200_000_00, 200_000_00))).not.toContain("Design Fee");
  });

  it("rows always sum to the Total, on odd cents", () => {
    for (const phases of [
      [],
      [phase(1, "A", 3_333_333_33), phase(2, "B", 3_333_333_33), phase(3, "C", 3_333_333_71)],
    ]) {
      const all = figures(generateExhibitA5PaymentTableHtml(phases, summary(10_000_001_37, 1_37)));
      const total = all.pop() as number;
      expect(all.reduce((s, f) => s + f, 0)).toBe(total);
    }
  });

  it("reports missing pricing", () => {
    expect(generateExhibitA5PaymentTableHtml([], null)).toBe("No pricing data available.");
  });
});

describe("EXHIBIT_A5_PAYMENT_TABLE", () => {
  it("is identical with itemizeDesignFee false and true", () => {
    const build = (itemizeDesignFee: boolean) =>
      mapProjectToVariables(
        {
          project: {
            projectNumber: "P", name: "N", status: "draft", onSiteSelection: "FOB",
            state: "AZ", createdAt: null, itemizeDesignFee,
          },
          client: { legalName: "Buyer Co" },
          childLlc: { legalName: "Dvele AZ, LLC", formationState: "AZ", entityType: "LLC" },
          projectDetails: null, financials: null, milestones: [], warrantyTerms: null, contractors: [],
        } as unknown as ProjectWithRelations,
        {
          ...summary(10_200_000_00, 200_000_00),
          unitCount: 2,
          unitModelSummary: "",
          phases: [phase(1, "P-1", 6_000_000_00), phase(2, "P-2", 4_000_000_00)],
        }
      ).EXHIBIT_A5_PAYMENT_TABLE;
    const off = build(false);
    expect(off).toContain("$10,200,000");
    expect(build(true)).toBe(off);
  });
});
