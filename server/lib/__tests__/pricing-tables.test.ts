import { describe, expect, it } from "vitest";
import { generatePricingTableHtml, generateExhibitA4TableHtml } from "../tableGenerators";

const SUMMARY = {
  breakdown: {
    totalDesignFee: 200_000_00,
    totalOffsite: 10_000_000_00,
    totalOnsite: 2_000_000_00,
    totalCustomizations: 500_000_00,
    totalShipping: 1_500_000_00,
  },
  grandTotal: 14_200_000_00,
  projectBudget: 14_200_000_00,
  // CRC excludes on-site: 200,000 + 10,000,000 + 500,000 + 1,500,000
  contractValue: 12_200_000_00,
  serviceModel: "CRC",
};

/** Every currency figure in the rendered table, in order. */
function amounts(html: string): string[] {
  return html.match(/\$[\d,]+/g) ?? [];
}

describe("generateExhibitA4TableHtml", () => {
  it("states the contract value as the total, not a recomputation of it", () => {
    const html = generateExhibitA4TableHtml(SUMMARY, "CRC");
    expect(html).toContain("$12,200,000");
  });

  it("carries a Customizations line, so the items sum to the stated total", () => {
    // The issued Zaca agreement's A.4 listed items summing to $12,509,500
    // against its own total of $14,596,900. Nothing on the page explained the
    // difference, because the customizations line was never rendered.
    const html = generateExhibitA4TableHtml(SUMMARY, "CRC");
    expect(html).toContain("Customizations");
    expect(html).toContain("$500,000");
  });

  it("bills on-site under CMOS and not under CRC", () => {
    expect(generateExhibitA4TableHtml(SUMMARY, "CRC")).not.toContain("On-site Services");
    const cmos = generateExhibitA4TableHtml({ ...SUMMARY, contractValue: 14_200_000_00 }, "CMOS");
    expect(cmos).toContain("On-site Services");
    expect(cmos).toContain("$14,200,000");
  });

  it("omits the customizations line when there are none, rather than printing $0", () => {
    const none = { ...SUMMARY, breakdown: { ...SUMMARY.breakdown, totalCustomizations: 0 } };
    expect(generateExhibitA4TableHtml(none, "CRC")).not.toContain("Customizations");
  });
});

describe("generatePricingTableHtml", () => {
  it("shows Shipping on a ONE contract, which its total already includes", () => {
    const html = generatePricingTableHtml(SUMMARY, "ONE");
    expect(html).toContain("Shipping");
    expect(html).toContain("$1,500,000");
  });

  it("includes customizations in the MANUFACTURING total it prints them against", () => {
    // MANUFACTURING renders a Customizations row but totalled without it, so
    // the table was one line item long against its own total.
    const html = generatePricingTableHtml(SUMMARY, "MANUFACTURING");
    expect(html).toContain("Customizations");
    expect(html).toContain("$10,700,000"); // 200,000 + 10,000,000 + 500,000
  });

  it("makes the ONE line items sum to the stated contract total", () => {
    const figures = amounts(generatePricingTableHtml(SUMMARY, "ONE"))
      .map((f) => Number(f.replace(/[$,]/g, "")));
    const total = figures.pop();
    expect(figures.reduce((sum, f) => sum + f, 0)).toBe(total);
  });
});
