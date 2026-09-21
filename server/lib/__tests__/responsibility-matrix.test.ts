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
