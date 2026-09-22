/**
 * Page breaks and heading grouping for an exported Google Doc.
 *
 * Drive's HTML-to-Docs conversion ignores CSS page breaks. Every form was
 * probed against a real conversion — `page-break-before: always` on an empty
 * div (what contractGenerator emits), on a div with content, on `<p>`, `<hr>`,
 * `<br>`, on a wrapper div, and the modern `break-before: page` — and all eight
 * produced a one-page document where three were expected. The ~21 page-break
 * rules in contractGenerator.ts therefore apply to the PDF only.
 *
 * Left alone, an exported agreement breaks wherever the text happens to run
 * out, which strands exhibit titles at the foot of the previous page. The Docs
 * API places the breaks instead, and marks headings `keepWithNext` so one
 * cannot be separated from the content it introduces.
 *
 * This module plans the edits and holds no API client, so the rules are tested
 * without network access.
 */

/** A paragraph of the converted document, as `documents.get` reports it. */
export interface DocParagraph {
  startIndex: number;
  endIndex: number;
  /** The paragraph's plain text, already joined from its runs. */
  text: string;
  namedStyleType?: string;
}

/**
 * An exhibit's cover title: "EXHIBIT A" and nothing else.
 *
 * Anchored deliberately. "EXHIBIT A — PROJECT SCOPE AND COMMERCIAL TERMS" is
 * the exhibit's own title line and follows the cover immediately, so breaking
 * there would put the two on separate pages. "Exhibit C.2 — On-Site
 * Responsibility Matrix" is a table caption in the middle of Exhibit C.
 */
const EXHIBIT_COVER = /^EXHIBIT\s+[A-G]$/;

/** A table of the converted document. */
export interface DocTable {
  startIndex: number;
  rowCount: number;
  /** All text inside the table, joined. */
  text: string;
}

/**
 * A signature block: labelled ruled lines for a party to sign against.
 *
 * Both blocks are two-column tables, and a Docs table row splits across a page
 * boundary by default — which put "COMPANY:" and the party name at the foot of
 * one page and the Signature / Name / Title / Date lines on the next.
 *
 * Matched on its labels rather than on size, because only these tables should
 * be held together. Forcing it on A.5's payment schedule or B.1's plan set
 * index, which legitimately run past a page, would ask for the impossible.
 */
const SIGNATURE_TABLE = /\bSignature\b[\s\S]*\bName \(Print\)/;

/** Any line that titles an exhibit, cover or full form. */
const EXHIBIT_TITLE = /^EXHIBIT\s+[A-G]\b/i;

function isHeading(p: DocParagraph): boolean {
  return /^HEADING_[1-6]$/.test(p.namedStyleType ?? "") || EXHIBIT_TITLE.test(p.text.trim());
}

/**
 * The `batchUpdate` requests that lay out the document.
 *
 * Style changes come first because they do not move indices; the page breaks
 * follow back to front, so inserting one cannot invalidate the index of
 * another still to be applied.
 */
export function planDocumentFormatting(
  paragraphs: DocParagraph[],
  tables: DocTable[] = [],
): unknown[] {
  const keepWithNext = paragraphs
    .filter(isHeading)
    .map((p) => ({
      updateParagraphStyle: {
        range: { startIndex: p.startIndex, endIndex: p.endIndex },
        paragraphStyle: { keepWithNext: true },
        // Named explicitly so nothing else about the paragraph is touched.
        fields: "keepWithNext",
      },
    }));

  // Also index-stable, so it joins the style pass ahead of the inserts.
  const keepTogether = tables
    .filter((t) => SIGNATURE_TABLE.test(t.text))
    .map((t) => ({
      updateTableRowStyle: {
        tableStartLocation: { index: t.startIndex },
        rowIndices: Array.from({ length: t.rowCount }, (_, i) => i),
        tableRowStyle: { preventOverflow: true },
        fields: "preventOverflow",
      },
    }));

  const pageBreaks = paragraphs
    // Never the first paragraph: a break there opens the document with a blank
    // page.
    .filter((p, i) => i > 0 && EXHIBIT_COVER.test(p.text.trim()))
    .map((p) => p.startIndex)
    .sort((a, b) => b - a)
    .map((index) => ({ insertPageBreak: { location: { index } } }));

  return [...keepWithNext, ...keepTogether, ...pageBreaks];
}
