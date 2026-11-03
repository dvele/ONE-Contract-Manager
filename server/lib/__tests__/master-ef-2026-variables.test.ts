import { describe, expect, it } from "vitest";
import {
  mapProjectToVariables,
  numberToWords,
  VARIABLE_CATEGORIES,
  type ProjectWithRelations,
} from "../mapper";

const BLANK = "____________________";

function build(opts: {
  model?: string;
  llc?: Record<string, unknown> | null;
  project?: Record<string, unknown>;
  projectDetails?: Record<string, unknown> | null;
  contractors?: Record<string, unknown>[];
  client?: Record<string, unknown> | null;
  unitCount?: number;
} = {}) {
  const data = {
    project: {
      projectNumber: "P",
      name: "N",
      status: "draft",
      onSiteSelection: opts.model ?? "CRC",
      state: "AZ",
      createdAt: null,
      ...opts.project,
    },
    client: opts.client === undefined ? { legalName: "Buyer Co" } : opts.client,
    childLlc:
      opts.llc === undefined
        ? { legalName: "Dvele AZ, LLC", formationState: "AZ", entityType: "LLC" }
        : opts.llc,
    projectDetails: opts.projectDetails ?? null,
    financials: null,
    milestones: [],
    warrantyTerms: null,
    contractors: opts.contractors ?? [],
  } as unknown as ProjectWithRelations;
  const pricing = opts.unitCount
    ? ({ unitCount: opts.unitCount, serviceModel: opts.model ?? "CRC", breakdown: { totalDesignFee: 0, totalOffsite: 0, totalOnsite: 0, totalCustomizations: 0, totalShipping: 0 }, grandTotal: 0, projectBudget: 0, contractValue: 0, paymentSchedule: [], unitModelSummary: "" } as any)
    : undefined;
  return mapProjectToVariables(data, pricing);
}

const gc = {
  contractorType: "onsite_general",
  legalName: "Acme Builders",
  licenseNumber: "ROC-123",
  licenseState: "AZ",
  contactName: "Pat Doe",
};

const NEW_VARS: Record<string, string[]> = {
  childLlc: ["SELLER_LEGAL_NAME", "SELLER_ENTITY_CLAUSE"],
  legal: ["AGREEMENT_GOVERNING_LAW_STATE", "WARRANTY_STATUTE_PREFIX"],
  project: ["PROJECT_STATE_NAME", "DELIVERY_MODEL_ELECTION", "BUYER_TYPE_ELECTION"],
  conditional: ["DELIVERY_MODEL", "IS_FOB"],
  home: ["TOTAL_UNITS_WRITTEN"],
  pricing: ["STORAGE_TERMS"],
  onsiteContractor: ["GC_INFORMATION_LINE"],
  tables: ["MASTER_EF_SIGNATURE_TABLE"],
};

describe("registration", () => {
  it("lists every new variable under its category and returns it", () => {
    const vars = build();
    for (const [cat, names] of Object.entries(NEW_VARS)) {
      for (const n of names) {
        expect((VARIABLE_CATEGORIES as any)[cat]).toContain(n);
        expect(vars).toHaveProperty(n);
      }
    }
  });
});

describe("numberToWords", () => {
  it("spells 1-99", () => {
    expect(numberToWords(2)).toBe("two");
    expect(numberToWords(13)).toBe("thirteen");
    expect(numberToWords(20)).toBe("twenty");
    expect(numberToWords(21)).toBe("twenty-one");
    expect(numberToWords(99)).toBe("ninety-nine");
  });
  it("returns digits for 0 and above 99", () => {
    expect(numberToWords(0)).toBe("0");
    expect(numberToWords(100)).toBe("100");
  });
});

describe("seller", () => {
  it("names the LLC or a placeholder", () => {
    expect(build().SELLER_LEGAL_NAME).toBe("Dvele AZ, LLC");
    expect(build({ llc: null }).SELLER_LEGAL_NAME).toBe("[SELLER]");
  });
  it.each([
    ["AZ", "an Arizona limited liability company"],
    ["Arizona", "an Arizona limited liability company"],
    ["DE", "a Delaware limited liability company"],
    [null, "a limited liability company"],
  ])("entity clause for %s", (state, expected) => {
    const llc = { legalName: "X, LLC", formationState: state, entityType: "LLC" };
    expect(build({ llc }).SELLER_ENTITY_CLAUSE).toBe(expected);
  });
});

describe("governing law and state", () => {
  it("defaults the agreement governing law to Arizona, leaving the old one alone", () => {
    const v = build({ project: { state: "CA" } });
    expect(v.AGREEMENT_GOVERNING_LAW_STATE).toBe("Arizona");
    expect(v.GOVERNING_LAW_STATE).toBe("CA");
  });
  it("expands a set state", () => {
    const v = build({ projectDetails: { governingLawState: "CO" } });
    expect(v.AGREEMENT_GOVERNING_LAW_STATE).toBe("Colorado");
    expect(v.GOVERNING_LAW_STATE).toBe("CO");
  });
  it("names the project state", () => {
    expect(build({ project: { state: "CO" } }).PROJECT_STATE_NAME).toBe("Colorado");
  });
  it("prefixes the warranty notice for CA only", () => {
    expect(build({ project: { state: "CA" } }).WARRANTY_STATUTE_PREFIX).toBe(
      "PURSUANT TO CAL. COM. CODE § 1201(b)(10), "
    );
    expect(build({ project: { state: "AZ" } }).WARRANTY_STATUTE_PREFIX).toBe("");
  });
});

describe("delivery model", () => {
  it.each([
    ["FOB", "FOB Factory", true],
    ["CRC", "Delivered to Site", false],
    ["CMOS", "Dvele GC", false],
  ])("%s", (model, label, isFob) => {
    const v = build({ model, contractors: [gc] });
    expect(v.DELIVERY_MODEL).toBe(label);
    expect(v.IS_FOB).toBe(isFob);
    expect(String(v.DELIVERY_MODEL_ELECTION).match(/☒/g)).toHaveLength(1);
    expect(String(v.DELIVERY_MODEL_ELECTION).match(/☐/g)).toHaveLength(2);
  });
  it("marks the elected option and carries the GC's license under CMOS", () => {
    const el = String(build({ model: "CMOS", contractors: [gc] }).DELIVERY_MODEL_ELECTION);
    expect(el).toContain("☒ Dvele GC");
    expect(el).toContain("GC Affiliate: Acme Builders; License No. / State: ROC-123 / AZ");
    expect(el.split("<br>")).toHaveLength(3);
  });
  it("blanks the GC details when none is recorded", () => {
    const el = String(build({ model: "CMOS" }).DELIVERY_MODEL_ELECTION);
    expect(el).toContain(`GC Affiliate: ${BLANK}; License No. / State: ${BLANK} / ${BLANK}`);
  });
  it("orders the options FOB, Delivered to Site, Dvele GC", () => {
    const el = String(build({ model: "FOB" }).DELIVERY_MODEL_ELECTION);
    expect(el.indexOf("FOB Factory")).toBeLessThan(el.indexOf("Delivered to Site"));
    expect(el.indexOf("Delivered to Site")).toBeLessThan(el.indexOf("Dvele GC"));
    expect(el.startsWith("☒ FOB Factory")).toBe(true);
  });
});

describe("buyer type election", () => {
  it("elects End Customer by default and Developer when set", () => {
    expect(build().BUYER_TYPE_ELECTION).toBe("☒ End Customer (owner-occupant) ☐ Developer (for resale or lease)");
    expect(build({ project: { buyerType: "developer" } }).BUYER_TYPE_ELECTION).toBe(
      "☐ End Customer (owner-occupant) ☒ Developer (for resale or lease)"
    );
  });
});

describe("TOTAL_UNITS_WRITTEN", () => {
  it("writes the unit count", () => {
    expect(build({ unitCount: 2 }).TOTAL_UNITS_WRITTEN).toBe("two (2)");
    expect(build().TOTAL_UNITS_WRITTEN).toBe("one (1)");
    expect(build({ unitCount: 120 }).TOTAL_UNITS_WRITTEN).toBe("120 (120)");
  });
});

describe("STORAGE_TERMS", () => {
  const DEFAULT = "$250/day per Home after ten (10) business days";
  it("uses the default text for 0 and null", () => {
    expect(build({ project: { storageFeePerDay: 0 } }).STORAGE_TERMS).toBe(DEFAULT);
    expect(build({ project: { storageFeePerDay: null } }).STORAGE_TERMS).toBe(DEFAULT);
  });
  it("uses the project's fee and free days", () => {
    expect(build({ project: { storageFeePerDay: 15000, storageFreedays: 30 } }).STORAGE_TERMS).toBe(
      "$150.00/day per Home after 30 days free"
    );
    expect(build({ project: { storageFeePerDay: 15000 } }).STORAGE_TERMS).toBe(
      "$150.00/day per Home after 14 days free"
    );
  });
});

describe("GC_INFORMATION_LINE", () => {
  it("reads for Dvele GC", () => {
    expect(build({ model: "CMOS", contractors: [gc] }).GC_INFORMATION_LINE).toBe(
      "Not applicable; Dvele GC elected. GC Affiliate name / license no. / contact: Acme Builders / ROC-123 / Pat Doe"
    );
  });
  it("reads for the Buyer's GC", () => {
    expect(build({ model: "CRC", contractors: [gc] }).GC_INFORMATION_LINE).toBe(
      "Buyer GC name / license no. / contact: Acme Builders / ROC-123 / Pat Doe"
    );
    expect(build({ model: "FOB" }).GC_INFORMATION_LINE).toBe(
      `Buyer GC name / license no. / contact: ${BLANK} / ${BLANK} / ${BLANK}`
    );
  });
});

describe("MASTER_EF_SIGNATURE_TABLE", () => {
  const cols = (html: unknown) => String(html).match(/vertical-align: top/g)?.length ?? 0;
  it("has two columns for FOB and CRC, three for CMOS", () => {
    expect(cols(build({ model: "FOB" }).MASTER_EF_SIGNATURE_TABLE)).toBe(2);
    expect(cols(build({ model: "CRC" }).MASTER_EF_SIGNATURE_TABLE)).toBe(2);
    expect(cols(build({ model: "CMOS", contractors: [gc] }).MASTER_EF_SIGNATURE_TABLE)).toBe(3);
  });
  it("stays at two under CRC with a second client", () => {
    const v = build({ model: "CRC", client: { legalName: "A", client2LegalName: "B" } });
    expect(cols(v.MASTER_EF_SIGNATURE_TABLE)).toBe(2);
  });
  it("shows a placeholder GC column under CMOS with no contractor", () => {
    expect(String(build({ model: "CMOS" }).MASTER_EF_SIGNATURE_TABLE)).toContain("[GC AFFILIATE]");
  });
});
