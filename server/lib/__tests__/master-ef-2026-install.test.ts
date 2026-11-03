import { describe, it, expect } from "vitest";
import {
  composeStateNotices,
  planMasterEf2026Install,
  renameAgreementTerms,
  type ExistingState,
  type MasterEf2026Content,
} from "../masterEf2026Install";

const content: MasterEf2026Content = {
  clauses: [
    { slug: "MEF26_A", headerText: "A", bodyHtml: "", level: 1, parentSlug: null, order: 1 },
    { slug: "MEF26_A1", headerText: "A1", bodyHtml: "<p>x</p>", level: 2, parentSlug: "MEF26_A", order: 2 },
    { slug: "MEF26_B", headerText: "B", bodyHtml: "", level: 1, parentSlug: null, order: 3 },
  ],
  exhibits: ["A", "B", "C", "D", "E", "F"].map((letter) => ({ letter, title: `Title ${letter}`, content: `<h2>${letter}</h2>` })),
};

const AZ_NOTICES = "<p>The Arizona Registrar of Contractors may be contacted at the number below.</p>";
const AZ_G = "<h4>AZ-4: Bonding Requirements</h4><p>Company must hold a bond.</p>";
const FL_NOTICES = '<p class="conspicuous">FLORIDA NOTICE: Chapter 553 applies.</p>';

const base: ExistingState = {
  templateId: null,
  oldTemplateIds: [26],
  llcExists: false,
  stateSources: [
    { state: "AZ", notices: AZ_NOTICES, exhibitG: AZ_G },
    { state: "FL", notices: FL_NOTICES, exhibitG: null },
    { state: "WY", notices: null, exhibitG: null },
  ],
  existingNoticeStates: [],
};

describe("planMasterEf2026Install", () => {
  it("plans a fresh install", () => {
    const plan = planMasterEf2026Install(content, base);
    expect(plan.template?.name).toBe("Dvele Master Factory Built Home Agreement (2026-10)");
    expect(plan.template?.displayName).toBe(plan.template?.name);
    expect(plan.template).toMatchObject({ contractType: "MASTER_EF", version: 1, status: "active", isActive: true, organizationId: 1 });
    expect(plan.clauses).toHaveLength(3);
    expect(plan.clauses.map((c) => c.orderIndex)).toEqual([10, 20, 30]);
    expect(plan.exhibits).toHaveLength(6);
    expect(plan.exhibits.map((e) => e.sortOrder)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(plan.llc).toMatchObject({ name: "Dvele AZ, LLC", stateOfFormation: "Arizona", entityType: "LLC", status: "active" });
    expect(plan.deactivateTemplateIds).toEqual([26]);
  });

  it("plans no LLC when Dvele AZ, LLC exists", () => {
    expect(planMasterEf2026Install(content, { ...base, llcExists: true }).llc).toBeNull();
  });

  it("plans no template, clause, exhibit, LLC or deactivation writes when the template exists", () => {
    const plan = planMasterEf2026Install(content, { ...base, templateId: 99 });
    expect(plan.template).toBeNull();
    expect(plan.clauses).toEqual([]);
    expect(plan.exhibits).toEqual([]);
    expect(plan.llc).toBeNull();
    expect(plan.deactivateTemplateIds).toEqual([]);
    // the disclosure step still runs
    expect(plan.disclosures.filter((d) => d.action === "insert")).toHaveLength(2);
  });

  it("rejects a clause whose parent comes later", () => {
    const bad = { ...content, clauses: [content.clauses[1], content.clauses[0]] };
    expect(() => planMasterEf2026Install(bad, base)).toThrow(/parent/);
  });

  it("plans combined notices per state, none for a state with neither source", () => {
    const plan = planMasterEf2026Install(content, base);
    expect(plan.disclosures.map((d) => d.state)).toEqual(["AZ", "FL"]);
    expect(plan.disclosures.every((d) => d.action === "insert")).toBe(true);
  });

  it("plans no write for a state that already has the notices row", () => {
    const plan = planMasterEf2026Install(content, { ...base, existingNoticeStates: ["AZ"] });
    const az = plan.disclosures.find((d) => d.state === "AZ");
    expect(az).toMatchObject({ action: "skip" });
    expect(az?.content).toBeUndefined();
    expect(plan.disclosures.find((d) => d.state === "FL")?.action).toBe("insert");
  });

  it("only ever plans inserts for state_disclosures", () => {
    const plan = planMasterEf2026Install(content, base);
    expect(Object.keys(plan)).not.toContain("updateDisclosures");
    expect(plan.disclosures.every((d) => d.action === "insert" || d.action === "skip")).toBe(true);
  });
});

describe("composeStateNotices", () => {
  it("AZ with both sources carries the Registrar sentence and AZ-4", () => {
    const out = composeStateNotices("AZ", AZ_NOTICES, AZ_G)!;
    expect(out.startsWith("<h3>Arizona Notices</h3>")).toBe(true);
    expect(out).toContain("Registrar of Contractors");
    expect(out).toContain("AZ-4: Bonding Requirements");
    expect(out.indexOf("Registrar")).toBeLessThan(out.indexOf("AZ-4"));
  });

  it("FL with notices only has its one line and no empty section", () => {
    expect(composeStateNotices("FL", FL_NOTICES, null)).toBe(`<h3>Florida Notices</h3>\n${FL_NOTICES}`);
    expect(composeStateNotices("FL", FL_NOTICES, "  ")).toBe(`<h3>Florida Notices</h3>\n${FL_NOTICES}`);
  });

  it("gives null when a state has neither source", () => {
    expect(composeStateNotices("WY", null, null)).toBeNull();
    expect(composeStateNotices("WY", "", " ")).toBeNull();
  });

  it("renames whole words only, capitalized only", () => {
    const out = composeStateNotices("AZ", "<p>Company is registered</p>", "<p>Companyside Contractors Client clients company</p>")!;
    expect(out).toContain("Dvele is registered");
    expect(out).toContain("Companyside");
    expect(out).toContain("Contractors");
    expect(out).toContain("Buyer clients company");
  });
});

describe("renameAgreementTerms", () => {
  it("leaves tag names and attributes alone", () => {
    expect(renameAgreementTerms('<p class="Company" data-x="Client">Company and Client</p>')).toBe(
      '<p class="Company" data-x="Client">Dvele and Buyer</p>',
    );
  });
});
