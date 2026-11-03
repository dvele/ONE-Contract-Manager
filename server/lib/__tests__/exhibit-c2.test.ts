import { describe, expect, it } from "vitest";
import { generateExhibitC2TableHtml, generateResponsibilityMatrixHtml } from "../tableGenerators";
import {
  C2_WORK_CATEGORIES,
  getC2DefaultMatrix,
  getDefaultMatrix,
  isC2Matrix,
} from "../../../shared/responsibilityMatrix";
import { mapProjectToVariables, VARIABLE_CATEGORIES, type ProjectWithRelations } from "../mapper";

const companyIds = (model: "FOB" | "CRC" | "CMOS") =>
  getC2DefaultMatrix(model)
    .filter((i) => i.assignedTo === "company")
    .map((i) => i.id);

describe("C.2 work categories", () => {
  it("are the agreement's 19 rows, in order", () => {
    expect(C2_WORK_CATEGORIES.map((c) => c.label)).toEqual([
      "Factory fabrication",
      "Transport coordination",
      "Transport cost",
      "Route surveys / escorts",
      "Crane / rigging",
      "Site access & staging",
      "Clearing / grading",
      "Foundation / footings / slab",
      "Utility stubs (water/sewer/power/gas)",
      "Set / placement on foundation",
      "Stitching / sealing / weatherproofing",
      "MEP reconnections",
      "Interior finish out (site)",
      "Exterior tie-ins / decks / stairs",
      "Inspections scheduling",
      "CO/Equivalent responsibility",
      "Site safety and security",
      "Debris removal / cleanup",
      "Damage remediation from delivery activities",
    ]);
  });
});

describe("getC2DefaultMatrix", () => {
  it("gives FOB only factory fabrication", () => {
    expect(companyIds("FOB")).toEqual(["factory_fabrication"]);
  });

  it("gives Delivered to Site the delivery and set work", () => {
    expect(companyIds("CRC")).toEqual([
      "factory_fabrication",
      "transport_coordination",
      "transport_cost",
      "route_surveys",
      "crane_rigging",
      "set_placement",
    ]);
  });

  it("gives Dvele GC everything", () => {
    expect(companyIds("CMOS")).toHaveLength(19);
  });

  it("tags rows C.2 and carries the notes", () => {
    const items = getC2DefaultMatrix("CRC");
    expect(items.every((i) => i.category === "C.2")).toBe(true);
    expect(items.find((i) => i.id === "foundation")?.note).toBe("Must meet Dvele tolerances");
  });
});

describe("isC2Matrix", () => {
  it("rejects the old item list and accepts the new one", () => {
    expect(isC2Matrix(getDefaultMatrix("CRC"))).toBe(false);
    expect(isC2Matrix(getC2DefaultMatrix("CRC"))).toBe(true);
  });
});

describe("generateExhibitC2TableHtml", () => {
  const html = generateExhibitC2TableHtml(getC2DefaultMatrix("CRC"));

  it("has the agreement's columns", () => {
    for (const h of ["Work Category", "Dvele", "Buyer/GC", "Notes / Acceptance Standard"]) {
      expect(html).toContain(`>${h}</th>`);
    }
  });

  it("renders every note verbatim and one check per row", () => {
    for (const c of C2_WORK_CATEGORIES.filter((c) => c.note)) {
      expect(html).toContain(c.note);
    }
    expect(html.match(/✔/g)).toHaveLength(19);
    expect(html.match(/☐/g)).toHaveLength(19);
  });

  it("puts the check under the assigned party", () => {
    const fob = generateExhibitC2TableHtml(getC2DefaultMatrix("FOB"));
    const row = fob.match(/<tr><td[^>]*>Transport cost<\/td>(.*?)<\/tr>/)![1];
    const cells = (row.match(/<td[^>]*>(.*?)<\/td>/g) ?? []).map((c) => c.replace(/<[^>]*>/g, ""));
    expect(cells).toEqual(["☐", "✔", "Per Exhibit A"]);
  });
});

describe("EXHIBIT_C2_TABLE", () => {
  it("is a mapper variable, and the old matrix variable is kept", () => {
    expect(VARIABLE_CATEGORIES.tables).toContain("EXHIBIT_C2_TABLE");
    expect(VARIABLE_CATEGORIES.tables).toContain("RESPONSIBILITY_MATRIX_TABLE");
  });

  const base = (matrix: unknown, onSite: string) =>
    ({
      project: { projectNumber: "P", name: "N", status: "draft", onSiteSelection: onSite, createdAt: null },
      client: null,
      childLlc: null,
      projectDetails: matrix === undefined ? null : { responsibilityMatrix: JSON.stringify(matrix) },
      financials: null,
      milestones: [],
      warrantyTerms: null,
      contractors: [],
    }) as unknown as ProjectWithRelations;

  it("falls back to the agreement defaults for a project saved with the old list", () => {
    const vars = mapProjectToVariables(base(getDefaultMatrix("CRC"), "CMOS"));
    expect(vars.EXHIBIT_C2_TABLE).toBe(generateExhibitC2TableHtml(getC2DefaultMatrix("CMOS")));
  });

  it("uses a stored C.2 matrix", () => {
    const stored = getC2DefaultMatrix("CRC").map((i) =>
      i.id === "foundation" ? { ...i, assignedTo: "company" as const } : i,
    );
    const vars = mapProjectToVariables(base(stored, "CRC"));
    expect(vars.EXHIBIT_C2_TABLE).toBe(generateExhibitC2TableHtml(stored));
  });

  it("uses the model's defaults when nothing is stored", () => {
    const vars = mapProjectToVariables(base(undefined, "FOB"));
    expect(vars.EXHIBIT_C2_TABLE).toBe(generateExhibitC2TableHtml(getC2DefaultMatrix("FOB")));
  });
});

describe("the old matrix renderer", () => {
  it("is unchanged", () => {
    expect(generateResponsibilityMatrixHtml(getDefaultMatrix("CRC"), "CRC")).toMatchSnapshot();
  });
});
