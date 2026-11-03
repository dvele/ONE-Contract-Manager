import { describe, it, expect, beforeAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import * as cheerio from "cheerio";
import { mapProjectToVariables, VARIABLE_CATEGORIES, type ProjectWithRelations } from "../mapper";

const MINIMAL_PROJECT = {
  project: { projectNumber: "P", name: "N", status: "draft", onSiteSelection: "CRC", state: "AZ", createdAt: null },
  client: { legalName: "Buyer Co" },
  childLlc: { legalName: "Seller, LLC", formationState: "AZ", entityType: "LLC" },
  projectDetails: null,
  financials: null,
  milestones: [],
  warrantyTerms: null,
  contractors: [],
} as unknown as ProjectWithRelations;

// contractGenerator imports the DB pool, which throws without DATABASE_URL.
vi.mock("../../db", () => ({ pool: {} }));
const { isUnnumberedMasterEfSlug } = await import("../contractGenerator");

const DIR = path.resolve(__dirname, "../../templates/master-ef-2026-10");
const LETTERS = ["a", "b", "c", "d", "e", "f"] as const;

interface ContentClause {
  slug: string;
  headerText: string;
  bodyHtml: string;
  level: number;
  parentSlug: string | null;
  order: number;
}

function readClauses(): ContentClause[] {
  return JSON.parse(fs.readFileSync(path.join(DIR, "clauses.json"), "utf8"));
}

function readExhibit(letter: string): string {
  return fs.readFileSync(path.join(DIR, `exhibit-${letter}.html`), "utf8");
}

function allContent(): string {
  const clauseText = readClauses()
    .map((c) => `${c.headerText}\n${c.bodyHtml}`)
    .join("\n");
  return [clauseText, ...LETTERS.map(readExhibit)].join("\n");
}

const BLOCK_TAGS =
  /<\/?(p|li|ol|ul|h[1-6]|div|table|thead|tbody|tr|td|th|br)\b[^>]*>/gi;

/** Tags stripped (block tags become spaces), entities decoded, quotes straightened, whitespace collapsed. */
function normalize(text: string): string {
  return text
    .replace(BLOCK_TAGS, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&sect;/g, "§")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The authored rendering of the main agreement: each clause's header joined to
 * its body by ". ", as the generator renders level 2 and 3 clauses.
 */
function authoredPlainText(): string {
  const clauseText = readClauses()
    .map((c) => (c.headerText ? `${c.headerText}. ${c.bodyHtml}` : c.bodyHtml))
    .join("\n");
  const joined = [clauseText, ...LETTERS.map(readExhibit)].join("\n");
  return normalize(
    joined
      .replace(/\{\{[A-Z0-9_]+\}\}/g, " ")
      .replace(/\[STATE_DISCLOSURE:[A-Z0-9_]+\]/g, " ")
  );
}

// Literal phrases the substitution table replaces (Ruling 3). Each is removed
// from the source like a blank before the comparison.
const SUBSTITUTED_PHRASES = [
  "Dvele AZ, LLC, an Arizona limited liability company",
  "_______(__)", // the unit count, whose "(__)" is too short to read as a blank
  "[IF REQUIRED BY SITE-STATE LAW: PURSUANT TO [STATE STATUTE CITATION],]",
  "$______/day per Home after ______ days free (if left blank, $250/day per Home after ten (10) business days)",
  // C.1's bullet is replaced whole by {{GC_INFORMATION_LINE}}.
  "Buyer GC name / license no. / contact: ____________________ (not applicable if Dvele GC is elected, in which case all site work allocated to Dvele is performed by the GC Affiliate or its subcontractors; GC Affiliate name / license no. / contact: ____________________).",
];

/** Source paragraphs, with the replaced tables, election cells and A.4 footnote removed. */
async function sourceParagraphs(): Promise<string[]> {
  const { value } = await mammoth.convertToHtml({
    path: path.join(DIR, "source.docx"),
  });
  const $ = cheerio.load(value);
  $("table").each((_, table) => {
    const text = $(table).text();
    const replaced =
      /Signed:/.test(text) || // both signature tables
      (/Home ID/.test(text) && /Site Address/.test(text)) || // A.2
      /Purchase Price\*/.test(text) || // A.4
      /Payment Schedule/.test(text) || // A.5
      /Plan Set Version/.test(text) || // B.1
      /Work Category/.test(text); // C.2
    if (replaced) $(table).remove();
  });
  // A.1's Buyer Type and Delivery Model election cells.
  $("td").each((_, td) => {
    if (/^\s*☐/.test($(td).text())) $(td).remove();
  });
  $("p").each((_, p) => {
    if (/^\*Except as expressly provided/.test($(p).text())) $(p).remove();
  });
  const html = $("body").html() ?? "";
  return html
    .replace(/<\/(p|li|td|h[1-6])>|<br\s*\/?>|<(ol|ul)>/gi, "\n")
    .split("\n")
    .map((p) => p.replace(/<[^>]+>/g, ""))
    .map((p) =>
      p
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
    )
    .filter((p) => p.trim().length > 0);
}

describe("Master EF 2026 authored content", () => {
  let clauses: ContentClause[];
  let content: string;

  beforeAll(() => {
    clauses = readClauses();
    content = allContent();
  });

  it("every {{VAR}} is a registered variable", () => {
    const registered = new Set<string>(Object.values(VARIABLE_CATEGORIES).flat());
    // SITE_ADDRESS, EXHIBIT_A2_TABLE and EXHIBIT_B1_TABLE predate this branch:
    // mapProjectToVariables resolves them but VARIABLE_CATEGORIES never listed
    // them. They are accepted as long as the mapper resolves them.
    const resolved = new Set(Object.keys(mapProjectToVariables(MINIMAL_PROJECT)));
    const used = Array.from(new Set(Array.from(content.matchAll(/\{\{([A-Z0-9_]+)\}\}/g), (m) => m[1])));
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((v) => !resolved.has(v))).toEqual([]);
    expect(used.filter((v) => !registered.has(v)).sort()).toEqual([
      "EXHIBIT_A2_TABLE",
      "EXHIBIT_B1_TABLE",
      "SITE_ADDRESS",
    ]);
  });

  it("no doc blanks survive outside the allow-list", () => {
    // Literal blanks left for hand completion, and the initials line kept verbatim.
    const allowList = [
      "Delivery window, crane day, and Site access assumptions: ____________________ (if blank, as stated in Exhibit C)",
      "please initial here: __________",
      "State Factory-Built Housing Program &amp; Approval No.: ____________________",
    ];
    let rest = content;
    for (const allowed of allowList) {
      expect(rest).toContain(allowed);
      rest = rest.split(allowed).join("");
    }
    for (const pattern of [/_{4,}/, /\[State/, /\[County/, /\[BUYER\]/, /\[●\]/, /\[SITE STATE\]/]) {
      expect(rest, String(pattern)).not.toMatch(pattern);
    }
  });

  it("agreement text is preserved", async () => {
    const authored = authoredPlainText();
    const missing: string[] = [];
    for (const paragraph of await sourceParagraphs()) {
      let text = paragraph;
      for (const phrase of SUBSTITUTED_PHRASES) text = text.split(phrase).join("\u0000");
      const fragments = text
        .replace(/_{3,}/g, "\u0000")
        .replace(/\[[^\]]*\]/g, "\u0000")
        .split("\u0000")
        .map(normalize);
      for (const fragment of fragments) {
        if (fragment.length >= 25 && !authored.includes(fragment)) missing.push(fragment);
      }
    }
    expect(missing).toEqual([]);
  });

  it("slugs are unique and never mention CRC or CMOS", () => {
    const slugs = clauses.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^MEF26_[A-Z0-9_]+$/);
      expect(slug).not.toMatch(/CRC|CMOS/);
    }
  });

  it("every parentSlug exists and comes earlier", () => {
    const seen = new Set<string>();
    for (const c of [...clauses].sort((a, b) => a.order - b.order)) {
      if (c.parentSlug !== null) expect(seen.has(c.parentSlug), c.slug).toBe(true);
      seen.add(c.slug);
    }
  });

  it("numbers Section 1 AGREEMENT CONSTRUCTION first and Section 15 last", () => {
    const numbered = clauses
      .filter((c) => c.parentSlug === null && !isUnnumberedMasterEfSlug(c.slug))
      .sort((a, b) => a.order - b.order);
    expect(numbered).toHaveLength(15);
    expect(numbered[0].headerText).toBe("AGREEMENT CONSTRUCTION");
    expect(numbered[2].headerText).toBe("FEES; PAYMENT; FINANCEABILITY");
    expect(numbered[11].headerText).toBe("DISPUTE RESOLUTION; GOVERNING LAW");
    expect(numbered[14].headerText).toBe("SIGNATURES; COUNTERPARTS; AUTHORITY");
    expect(numbered[14].bodyHtml).toContain("{{MASTER_EF_SIGNATURE_TABLE}}");
    // The preamble, recitals and NOW THEREFORE are unnumbered and precede Section 1.
    const firstOrder = numbered[0].order;
    const before = clauses.filter((c) => c.order < firstOrder).map((c) => c.slug);
    expect(before.every(isUnnumberedMasterEfSlug)).toBe(true);
    expect(before).toContain("MEF26_PREAMBLE");
    expect(before).toContain("MEF26_RECITALS");
  });

  it("numbers sub-clauses so the cross-references resolve", () => {
    const childrenOf = (slug: string) =>
      clauses.filter((c) => c.parentSlug === slug).sort((a, b) => a.order - b.order);
    const numbered = clauses
      .filter((c) => c.parentSlug === null && !isUnnumberedMasterEfSlug(c.slug))
      .sort((a, b) => a.order - b.order);
    const section = (n: number) => numbered[n - 1];
    // Section 2(b)(iii) is Dvele GC; 3(d) Binding Commitment; 3(h) Assignment;
    // 3(i) Financing Party Cure; 4(b) FOB Factory Pickup; 8(b) Limited Project
    // License; 11(f) Effect of Termination; 11(g) Work Product Upon Termination.
    const sub = (n: number, letter: string) =>
      childrenOf(section(n).slug)[letter.charCodeAt(0) - 97];
    expect(childrenOf(sub(2, "b").slug)[2].headerText).toBe("Dvele GC");
    expect(sub(3, "d").headerText).toBe("Binding Commitment; Limited Feasibility Adjustment");
    expect(sub(3, "h").headerText).toBe("Assignment; Financing; Payment Directions");
    expect(sub(3, "i").headerText).toBe("Financing Party Cure Rights (Non-Operator)");
    expect(sub(4, "b").headerText).toBe("FOB Factory Pickup");
    expect(sub(5, "b").headerText).toBe("Production");
    expect(sub(8, "b").headerText).toBe("Limited Project License");
    expect(sub(9, "a").headerText).toBe("Exclusion of Consequential Damages");
    expect(sub(11, "f").headerText).toBe("Effect of Termination; Survival of Payment Obligations");
    expect(sub(11, "g").headerText).toBe("Work Product Upon Termination");
    expect(childrenOf(section(3).slug)).toHaveLength(9);
    for (const c of clauses) {
      if (c.parentSlug === null) expect(c.level, c.slug).toBe(1);
      else {
        const parent = clauses.find((p) => p.slug === c.parentSlug)!;
        if (!isUnnumberedMasterEfSlug(c.slug)) expect(c.level, c.slug).toBe(parent.level + 1);
      }
    }
  });

  it("Exhibit E headings are numbered 1–8 in order", () => {
    const e = readExhibit("e");
    const headings = Array.from(e.matchAll(/<h3>(.*?)<\/h3>/g), (m) => normalize(m[1]));
    expect(headings).toEqual([
      "1. Definitions",
      "2. Warranty Commencement",
      "3. Warranty Scope",
      "4. Systems Coverage (2 Years)",
      "5. Appliance and Fixture Coverage (Pass-Through)",
      "6. Exclusions",
      "7. Claims and Remedies",
      "8. Limits of Liability",
    ]);
    // Both "Section 5" references (light fixtures; energy/smart-home
    // technology) mean heading 5, the manufacturer pass-through.
    const refs = normalize(e).match(/Section 5(?!\(b\) of the Agreement)/g) ?? [];
    expect(refs).toHaveLength(2);
    expect(normalize(e)).toContain("(light fixtures are covered under Section 5)");
    expect(normalize(e)).toContain("manufacturer warranties passed through under Section 5");
    // Plumbing, Electrical and HVAC are nested under Systems Coverage's (a).
    const systems = e.slice(e.indexOf("4. Systems Coverage"), e.indexOf("5. Appliance"));
    expect(systems).toMatch(/<ol type="a">\s*<li>Dvele warrants[\s\S]*?<ol type="i">[\s\S]*Plumbing System[\s\S]*Electrical System[\s\S]*HVAC System[\s\S]*<\/ol>\s*<\/li>\s*<\/ol>/);
    expect(e).toContain('class="statutory-notice"');
    expect(e).toContain("{{WARRANTY_STATUTE_PREFIX}}THIS SECTION");
  });

  it("each exhibit opens with its h2 title", () => {
    const titles: Record<string, string> = {
      a: "EXHIBIT A &mdash; PROJECT SCOPE AND COMMERCIAL TERMS",
      b: "EXHIBIT B &mdash; HOME PLANS, SPECIFICATIONS &amp; FINISHES",
      c: "EXHIBIT C &mdash; GENERAL CONTRACTOR / ON-SITE SCOPE &amp; RESPONSIBILITY MATRIX",
      d: "EXHIBIT D &mdash; MILESTONES &amp; SCHEDULE",
      e: "EXHIBIT E &mdash; LIMITED WARRANTY",
      f: "EXHIBIT F &mdash; STATE-SPECIFIC PROVISIONS ({{PROJECT_STATE_NAME}})",
    };
    for (const letter of LETTERS) {
      expect(readExhibit(letter).trimStart().startsWith(`<h2>${titles[letter]}</h2>`), letter).toBe(true);
    }
    expect(readExhibit("f")).toContain("[STATE_DISCLOSURE:MASTER_EF_2026_STATE_NOTICES]");
  });

  it("no seller literal", () => {
    expect(content).not.toMatch(/Dvele AZ/i);
  });
});
