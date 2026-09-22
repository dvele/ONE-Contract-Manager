import { describe, expect, it } from "vitest";
import { generateResponsibilityMatrixHtml } from "../tableGenerators";
import { getDefaultMatrix, RESPONSIBILITY_CATEGORIES } from "../../../shared/responsibilityMatrix";

/** The rendered <td> text of every row, tags stripped. */
function labels(html: string): string[] {
  return (html.match(/<td[^>]*>(.*?)<\/td>/g) ?? [])
    .map((cell) => cell.replace(/<[^>]*>/g, "").trim())
    .filter((text) => text !== "");
}

describe("the default responsibility matrix", () => {
  it("covers every category and item the wizard would have seeded", () => {
    const items = getDefaultMatrix("CRC");
    const expected = RESPONSIBILITY_CATEGORIES.flatMap((c) => c.items);
    expect(items).toHaveLength(expected.length);
    expect(items.map((i) => i.id)).toEqual(expected.map((i) => i.id));
  });

  it("allocates differently under CRC and CMOS", () => {
    // CRC leaves the on-site work with the client's GC; CMOS brings it in.
    const crc = getDefaultMatrix("CRC");
    const cmos = getDefaultMatrix("CMOS");
    expect(crc.map((i) => i.assignedTo)).not.toEqual(cmos.map((i) => i.assignedTo));
    expect(cmos.every((i) => i.assignedTo === "company")).toBe(true);
  });

  it("renders a C.2 with every row, not the unconfigured sentence", () => {
    // C.5 allocates responsibilities "exclusively as set forth in this Exhibit
    // C", so C.2 must never render as a single sentence and no rows.
    const html = generateResponsibilityMatrixHtml(getDefaultMatrix("CRC"), "CRC");
    expect(html).not.toContain("not configured");
    for (const category of RESPONSIBILITY_CATEGORIES) {
      expect(labels(html)).toContain(category.name);
      for (const item of category.items) {
        expect(labels(html)).toContain(item.label);
      }
    }
  });
});

describe("C.2's allocation marks", () => {
  /**
   * The mark has to clear two different bars. An inline SVG rendered in the
   * PDF but Drive's HTML-to-Docs conversion drops `<svg>` outright, leaving an
   * exported Doc whose matrix allocates nothing — under a C.5 that says
   * responsibilities are allocated "exclusively as set forth in this Exhibit
   * C". A probe through a real conversion found text characters survive and
   * SVG does not, so the mark is a character again; the PDF container gets the
   * glyph from fonts-dejavu-core, named in the font stack below.
   */
  const CHECK = "✓";

  it("marks the responsible party with a character, not an SVG", () => {
    const html = generateResponsibilityMatrixHtml(getDefaultMatrix("CRC"), "CRC");
    expect(html).toContain(CHECK);
    expect(html).not.toContain("<svg");
  });

  it("names a font that carries the glyph, so the PDF does not print tofu", () => {
    // fonts-liberation, the container's only font package before this, has no
    // U+2713 — which is why the mark became an SVG in the first place.
    const html = generateResponsibilityMatrixHtml(getDefaultMatrix("CRC"), "CRC");
    expect(html).toMatch(/DejaVu Sans/);
  });

  it("marks exactly one of the two columns for each item", () => {
    const html = generateResponsibilityMatrixHtml(getDefaultMatrix("CRC"), "CRC");
    const bodyRows = (html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []).slice(1);
    const marked = bodyRows
      .map((row) => (row.match(/<td[^>]*>[\s\S]*?<\/td>/g) ?? []).slice(1))
      .filter((cells) => cells.length === 2)
      .map((cells) => cells.filter((c) => c.includes(CHECK)).length);
    // Category header rows carry no mark; every item row carries exactly one.
    expect(marked.filter((n) => n === 1).length).toBe(getDefaultMatrix("CRC").length);
    expect(marked.some((n) => n > 1)).toBe(false);
  });
});
