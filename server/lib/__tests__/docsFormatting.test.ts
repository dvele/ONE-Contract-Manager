import { describe, expect, it } from "vitest";
import { planDocumentFormatting, type DocParagraph, type DocTable } from "../docsFormatting";

/**
 * Drive's HTML-to-Docs conversion ignores every form of CSS page break —
 * `page-break-before` on an empty div, on a div with content, on `<p>`, `<hr>`,
 * `<br>`, on a wrapper, and the modern `break-before: page` were all probed
 * against real conversions and every one produced a single-page document.
 *
 * So the breaks in an exported agreement are accidental, falling wherever the
 * content happens to run out, which is why an exhibit title strands itself on
 * the previous page. The Docs API places them deliberately instead.
 *
 * This plans the edits; it holds no API client so the rules are tested without
 * network access.
 */
function para(text: string, startIndex: number, namedStyleType = "NORMAL_TEXT"): DocParagraph {
  return { text, startIndex, endIndex: startIndex + text.length + 1, namedStyleType };
}

const DOC: DocParagraph[] = [
  para("Master Purchase Agreement", 1),
  para("This Agreement is entered into…", 30),
  para("EXHIBIT A", 100),
  para("EXHIBIT A — PROJECT SCOPE AND COMMERCIAL TERMS", 120),
  para("A.1 Project Overview", 180, "HEADING_3"),
  para("EXHIBIT B", 240),
  para("Exhibit C.2 — On-Site Responsibility Matrix", 300),
  para("EXHIBIT C", 360),
];

const breaks = (rs: any[]) => rs.filter((r) => r.insertPageBreak);
const styles = (rs: any[]) => rs.filter((r) => r.updateParagraphStyle);

describe("planDocumentFormatting", () => {
  it("breaks the page before each exhibit cover title", () => {
    const at = breaks(planDocumentFormatting(DOC)).map((r) => r.insertPageBreak.location.index);
    expect(at.sort((a: number, b: number) => a - b)).toEqual([100, 240, 360]);
  });

  it("does not break before a numbered caption that merely starts with 'Exhibit'", () => {
    // "Exhibit C.2 — On-Site Responsibility Matrix" is a table caption inside
    // Exhibit C, not the start of a new exhibit.
    const at = breaks(planDocumentFormatting(DOC)).map((r) => r.insertPageBreak.location.index);
    expect(at).not.toContain(300);
  });

  it("does not break before the exhibit's own full title line", () => {
    // "EXHIBIT A — PROJECT SCOPE…" follows the cover title; breaking here would
    // put the cover on a page of its own and the title on the next.
    const at = breaks(planDocumentFormatting(DOC)).map((r) => r.insertPageBreak.location.index);
    expect(at).not.toContain(120);
  });

  it("never breaks before the first paragraph, which would open with a blank page", () => {
    const at = breaks(planDocumentFormatting([para("EXHIBIT A", 1), para("body", 20)]))
      .map((r) => r.insertPageBreak.location.index);
    expect(at).toEqual([]);
  });

  it("orders page breaks back to front so earlier inserts do not shift later indices", () => {
    const at = breaks(planDocumentFormatting(DOC)).map((r) => r.insertPageBreak.location.index);
    expect(at).toEqual([...at].sort((a: number, b: number) => b - a));
  });

  it("keeps every heading with the content beneath it", () => {
    const kept = styles(planDocumentFormatting(DOC)).map((r) => r.updateParagraphStyle.range.startIndex);
    expect(kept).toContain(180); // HEADING_3
  });

  it("keeps an exhibit title with what follows it", () => {
    const kept = styles(planDocumentFormatting(DOC)).map((r) => r.updateParagraphStyle.range.startIndex);
    expect(kept).toContain(120);
  });

  it("asks only for keepWithNext, leaving every other paragraph property alone", () => {
    for (const r of styles(planDocumentFormatting(DOC))) {
      expect(r.updateParagraphStyle.fields).toBe("keepWithNext");
      expect(r.updateParagraphStyle.paragraphStyle).toEqual({ keepWithNext: true });
    }
  });

  it("applies the style changes before the inserts, which move indices", () => {
    const rs = planDocumentFormatting(DOC);
    const lastStyle = rs.map((r) => !!(r as any).updateParagraphStyle).lastIndexOf(true);
    const firstBreak = rs.map((r) => !!(r as any).insertPageBreak).indexOf(true);
    expect(lastStyle).toBeLessThan(firstBreak);
  });

  it("returns nothing for a document with no exhibits or headings", () => {
    expect(planDocumentFormatting([para("just a sentence", 1)])).toEqual([]);
  });

  it("returns nothing for an empty document", () => {
    expect(planDocumentFormatting([])).toEqual([]);
  });
});

describe("keeping a signature block on one page", () => {
  /**
   * Both signature blocks are two-column tables, and a Docs table row splits
   * across a page boundary by default — so "COMPANY:" and the party name sat at
   * the foot of one page with the Signature / Name / Title / Date lines on the
   * next. `preventOverflow` moves the whole row instead of splitting it.
   *
   * Only signature tables get this: forcing it on a long table — A.5's payment
   * schedule, B.1's plan set index — that genuinely exceeds a page would be
   * asking for something impossible.
   */
  const SIG: DocTable = {
    startIndex: 500,
    rowCount: 1,
    text: "COMPANY: DP Example LLC Signature Name (Print) Title Date CLIENT:",
  };
  const PRICING: DocTable = {
    startIndex: 900,
    rowCount: 19,
    text: "Property ID Phase Payment Trigger % of Phase Amount Due Signing Deposit",
  };
  const rowStyles = (rs: any[]) => rs.filter((r) => r.updateTableRowStyle);

  it("prevents a signature table's rows from splitting", () => {
    const rs = rowStyles(planDocumentFormatting([], [SIG]));
    expect(rs).toHaveLength(1);
    expect(rs[0].updateTableRowStyle.tableStartLocation.index).toBe(500);
    expect(rs[0].updateTableRowStyle.tableRowStyle).toEqual({ preventOverflow: true });
    expect(rs[0].updateTableRowStyle.fields).toBe("preventOverflow");
  });

  it("covers every row of the table", () => {
    const rs = rowStyles(planDocumentFormatting([], [{ ...SIG, rowCount: 3 }]));
    expect(rs[0].updateTableRowStyle.rowIndices).toEqual([0, 1, 2]);
  });

  it("leaves ordinary data tables alone", () => {
    // A.5 runs to 19 rows and must be free to flow across pages.
    expect(rowStyles(planDocumentFormatting([], [PRICING]))).toEqual([]);
  });

  it("applies row styles before the page breaks, which move indices", () => {
    const rs = planDocumentFormatting([para("a", 1), para("EXHIBIT B", 700)], [SIG]);
    const lastRowStyle = rs.map((r) => !!(r as any).updateTableRowStyle).lastIndexOf(true);
    const firstBreak = rs.map((r) => !!(r as any).insertPageBreak).indexOf(true);
    expect(lastRowStyle).toBeLessThan(firstBreak);
  });
});
