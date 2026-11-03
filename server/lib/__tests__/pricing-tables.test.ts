import { describe, expect, it } from "vitest";
import {
  generatePricingTableHtml,
  generateExhibitA4TableHtml,
  generateExhibitA4CostTableHtml,
} from "../tableGenerators";

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

  it("states the rate of the admin fee it charges on reimbursables", () => {
    // "At cost plus admin fee" with no rate is an uncapped markup; the issued
    // agreement read "of 10%".
    expect(generateExhibitA4TableHtml(SUMMARY, "CRC", 10)).toContain(
      "At cost plus admin fee of 10%"
    );
  });

  it("omits the rate clause rather than stating one the project never agreed", () => {
    for (const noRate of [undefined, null, 0]) {
      const html = generateExhibitA4TableHtml(SUMMARY, "CRC", noRate);
      expect(html).toContain("At cost plus admin fee");
      expect(html).not.toContain("admin fee of");
    }
  });

  it("makes the CMOS line items sum to the printed Total Project Price", () => {
    const html = generateExhibitA4TableHtml({ ...SUMMARY, contractValue: 14_200_000_00 }, "CMOS");
    const figures = amounts(html).map((f) => Number(f.replace(/[$,]/g, "")));
    const total = figures.pop();
    expect(figures.reduce((sum, f) => sum + f, 0)).toBe(total);
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

  it("makes the MANUFACTURING line items sum to the printed total", () => {
    const figures = amounts(generatePricingTableHtml(SUMMARY, "MANUFACTURING"))
      .map((f) => Number(f.replace(/[$,]/g, "")));
    const total = figures.pop();
    expect(figures.reduce((sum, f) => sum + f, 0)).toBe(total);
  });

  it("makes the ONSITE line items sum to the printed total, with Shipping appearing once", () => {
    const html = generatePricingTableHtml(SUMMARY, "ONSITE");
    const shippingMentions = html.match(/Shipping/g) ?? [];
    expect(shippingMentions.length).toBe(1);

    const figures = amounts(html).map((f) => Number(f.replace(/[$,]/g, "")));
    const total = figures.pop();
    expect(figures.reduce((sum, f) => sum + f, 0)).toBe(total);
  });
});

describe("generateExhibitA4CostTableHtml", () => {
  // Odd cents so whole-dollar rounding has something to reconcile.
  const BREAKDOWN = {
    totalDesignFee: 200_000_50,
    totalOffsite: 10_000_000_50,
    totalOnsite: 2_000_000_50,
    totalCustomizations: 500_000_50,
    totalShipping: 1_500_000_50,
  };
  const base = BREAKDOWN.totalDesignFee + BREAKDOWN.totalOffsite + BREAKDOWN.totalCustomizations;
  const CONTRACT_VALUE = {
    FOB: base,
    CRC: base + BREAKDOWN.totalShipping,
    CMOS: base + BREAKDOWN.totalShipping + BREAKDOWN.totalOnsite,
  } as const;

  function summary(model: "FOB" | "CRC" | "CMOS") {
    return {
      breakdown: BREAKDOWN,
      grandTotal: 0,
      projectBudget: 0,
      contractValue: CONTRACT_VALUE[model],
      serviceModel: model,
    };
  }

  /** The Price cell of the row whose Component cell is `label`, as dollars. */
  function price(html: string, label: string): number | null {
    for (const row of html.match(/<tr>(?:(?!<\/tr>).)*<\/tr>/g) ?? []) {
      const cells = (row.match(/<td[^>]*>(.*?)<\/td>/g) ?? []).map((c) => c.replace(/<[^>]*>/g, "").trim());
      if (cells[0] === label) return Number(cells[1].replace(/[$,]/g, ""));
    }
    return null;
  }

  const LABELS = [
    "Design / Pre-Production Fee",
    "Factory-Built Home(s)",
    "Customizations",
    "Delivery & Set",
    "On-Site Work (GC Affiliate)",
  ];

  for (const model of ["FOB", "CRC", "CMOS"] as const) {
    for (const itemize of [false, true]) {
      it(`${model}, itemizeDesignFee=${itemize}: rows sum to the Purchase Price`, () => {
        const html = generateExhibitA4CostTableHtml(summary(model), 3000, itemize);
        const expected = new Set([
          "Factory-Built Home(s)",
          "Customizations",
          "Purchase Price",
          ...(itemize ? ["Design / Pre-Production Fee"] : []),
          ...(model !== "FOB" ? ["Delivery & Set"] : []),
          ...(model === "CMOS" ? ["On-Site Work (GC Affiliate)"] : []),
        ]);
        for (const label of [...LABELS, "Purchase Price"]) {
          expect(price(html, label) !== null, label).toBe(expected.has(label));
        }
        const items = LABELS.map((l) => price(html, l) ?? 0).reduce((a, b) => a + b, 0);
        const total = price(html, "Purchase Price");
        expect(items).toBe(total);
        expect(total).toBe(Math.round(CONTRACT_VALUE[model] / 100));
      });
    }
  }

  it("shows the same Purchase Price whether or not the design fee is itemized", () => {
    const off = generateExhibitA4CostTableHtml(summary("CMOS"), 3000, false);
    const on = generateExhibitA4CostTableHtml(summary("CMOS"), 3000, true);
    expect(price(off, "Purchase Price")).toBe(price(on, "Purchase Price"));
  });

  it("folds the design fee into the Factory row, with no Design text, when not itemized", () => {
    const html = generateExhibitA4CostTableHtml(summary("CRC"), 3000, false);
    expect(html).not.toContain("Design");
    expect(price(html, "Factory-Built Home(s)")).toBe(
      Math.round((BREAKDOWN.totalOffsite + BREAKDOWN.totalDesignFee) / 100)
    );
  });

  it("itemizes the design fee on exactly one row and keeps it out of the Factory row", () => {
    const html = generateExhibitA4CostTableHtml(summary("CRC"), 3000, true);
    expect(html.match(/Design \/ Pre-Production Fee/g)).toHaveLength(1);
    expect(price(html, "Design / Pre-Production Fee")).toBe(Math.round(BREAKDOWN.totalDesignFee / 100));
    expect(price(html, "Factory-Built Home(s)")).toBe(Math.round(BREAKDOWN.totalOffsite / 100));
    expect(html).toContain("Included in Purchase Price");
  });

  it("prints Cost/sqft per row, or a dash with no square footage", () => {
    const withSqft = generateExhibitA4CostTableHtml(summary("CRC"), 3000, false);
    expect(withSqft).toContain("Cost/sqft");
    expect(withSqft).toContain(`$${Math.round(Math.round(CONTRACT_VALUE.CRC / 100) / 3000).toLocaleString("en-US")}`);
    for (const sqft of [null, 0]) {
      const html = generateExhibitA4CostTableHtml(summary("CRC"), sqft, false);
      expect(html).toContain("—");
      expect(html).not.toMatch(/<td[^>]*>\$[\d,]+<\/td>\s*<td[^>]*>\$[\d,]+<\/td>/);
    }
  });

  it("prints the notes and the binding-pricing footnote", () => {
    const html = generateExhibitA4CostTableHtml(summary("CMOS"), 3000, false);
    for (const note of ["Per Exhibit B", "Per Exhibit C", "Dvele GC only"]) expect(html).toContain(note);
    expect(html).toContain(
      "*Except as expressly provided under the Feasibility Adjustment provisions of Section 3(d) of the Agreement, the pricing set forth herein is binding and shall not be modified without a written Change Order or Exhibit A amendment executed by both Parties."
    );
  });

  it("says so when there is no pricing", () => {
    expect(generateExhibitA4CostTableHtml(null, 3000, false)).toBe("No pricing data available.");
  });
});
