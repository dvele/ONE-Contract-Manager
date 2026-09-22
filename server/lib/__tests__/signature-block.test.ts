import { describe, expect, it } from "vitest";
import { buildSignatureBlock } from "../tableStyles";
import { buildExhibitASignatureBlock } from "../mapper";

/**
 * Drive's HTML-to-Docs conversion turns block elements into paragraphs, and an
 * empty paragraph cannot carry a border — so a signature line drawn as an
 * empty `<div>` with `border-bottom` disappears from the exported Doc. Every
 * one of the eight lines was missing, leaving "Signature", "Name (Print)",
 * "Title" and "Date" labelling nothing.
 *
 * A probe through a real conversion, each candidate in its own document, found
 * the same div survives as a horizontal rule as soon as it has any content.
 * The PDF is unaffected: a non-breaking space in a 20pt-tall bordered div
 * renders exactly as the empty one did.
 */
const OPTIONS = {
  leftTitle: "COMPANY",
  rightTitle: "CLIENT",
  companyName: "DP 1 Example Road LLC",
  clientName: "Example Holdings, LLC",
};

/** Every element carrying the signature-line border. */
function lineElements(html: string): string[] {
  return (html.match(/<div[^>]*border-bottom[^>]*>.*?<\/div>/g) ?? []);
}

describe("buildSignatureBlock", () => {
  it("draws eight signature lines — four for each party", () => {
    expect(lineElements(buildSignatureBlock(OPTIONS))).toHaveLength(8);
  });

  it("gives every line content, so the conversion keeps it", () => {
    // The defect: `<div style="border-bottom: …"></div>` converts to an empty
    // paragraph and the rule is lost.
    for (const line of lineElements(buildSignatureBlock(OPTIONS))) {
      expect(line).not.toMatch(/>\s*<\/div>$/);
    }
  });

  it("labels each line", () => {
    const html = buildSignatureBlock(OPTIONS);
    for (const label of ["Signature", "Name (Print)", "Title", "Date"]) {
      expect(html).toContain(label);
    }
  });

  it("names both parties", () => {
    const html = buildSignatureBlock(OPTIONS);
    expect(html).toContain("DP 1 Example Road LLC");
    expect(html).toContain("Example Holdings, LLC");
  });

  it("appends the client's signer name and title to their labels when known", () => {
    const html = buildSignatureBlock({ ...OPTIONS, clientSignerName: "Dana Ruiz", clientTitle: "Managing Member" });
    expect(html).toContain("Name (Print): Dana Ruiz");
    expect(html).toContain("Title: Managing Member");
  });
});

describe("buildExhibitASignatureBlock", () => {
  /**
   * A near-duplicate of the block above, with its own copy of the line markup —
   * so fixing one left Exhibit A's two approval columns ("Accepted and agreed:"
   * and "Post Design Approval (Greenlight):") still blank in the exported Doc.
   * Both now render through the same `signatureLine`, so the next change cannot
   * fix one and miss the other.
   */
  it("draws sixteen lines — four per party, two parties, two columns", () => {
    const html = buildExhibitASignatureBlock("DP Example LLC", "Example Client");
    expect(lineElements(html)).toHaveLength(16);
  });

  it("gives every line content, so the conversion keeps it", () => {
    for (const line of lineElements(buildExhibitASignatureBlock("DP Example LLC", "Example Client"))) {
      expect(line).not.toMatch(/>\s*<\/div>$/);
    }
  });

  it("heads both approval columns", () => {
    const html = buildExhibitASignatureBlock("DP Example LLC", "Example Client");
    expect(html).toContain("Accepted and agreed:");
    expect(html).toContain("Post Design Approval (Greenlight):");
  });

  it("names both parties in each column", () => {
    const html = buildExhibitASignatureBlock("DP Example LLC", "Example Client");
    expect(html.match(/DP Example LLC/g)).toHaveLength(2);
    expect(html.match(/Example Client/g)).toHaveLength(2);
  });
});
