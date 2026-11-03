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

// ---------------------------------------------------------------------------
// Word-sequence comparison of the docx against the authored content
// ---------------------------------------------------------------------------

/**
 * The tables the content replaces whole with a generated table. Each becomes
 * one marker word on both sides, so their contents are excluded by section
 * boundary rather than compared.
 */
const TABLE_MARKERS: { marker: string; variable: string; matches: (text: string) => boolean }[] = [
  { marker: "⟦SIGNATURE-TABLE⟧", variable: "MASTER_EF_SIGNATURE_TABLE", matches: (t) => /Signed:/.test(t) },
  { marker: "⟦A2-TABLE⟧", variable: "EXHIBIT_A2_TABLE", matches: (t) => /Home ID/.test(t) && /Site Address/.test(t) },
  // The A.4 footnote paragraph belongs to this section too (Task 6 renders it).
  { marker: "⟦A4-TABLE⟧", variable: "EXHIBIT_A4_COST_TABLE", matches: (t) => /Purchase Price\*/.test(t) },
  { marker: "⟦A5-TABLE⟧", variable: "EXHIBIT_A5_PAYMENT_TABLE", matches: (t) => /Payment Schedule/.test(t) },
  { marker: "⟦B1-TABLE⟧", variable: "EXHIBIT_B1_TABLE", matches: (t) => /Plan Set Version/.test(t) },
  { marker: "⟦C2-TABLE⟧", variable: "EXHIBIT_C2_TABLE", matches: (t) => /Work Category/.test(t) },
];

function words(html: string): string[] {
  return normalize(html.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))))
    .split(" ")
    .filter(Boolean);
}

/** The docx as words, in document order, with the replaced tables as markers. */
async function sourceWords(): Promise<string[]> {
  const { value } = await mammoth.convertToHtml({ path: path.join(DIR, "source.docx") });
  const $ = cheerio.load(value);
  $("table").each((_, table) => {
    const hit = TABLE_MARKERS.find((m) => m.matches($(table).text()));
    if (hit) $(table).replaceWith(`<p>${hit.marker}</p>`);
  });
  $("p").each((_, p) => {
    if (/^\*Except as expressly provided/.test($(p).text())) $(p).remove();
  });
  return words($("body").html() ?? "");
}

/**
 * The authored content as words, in render order: clauses by `order`, then
 * Exhibits A–F. Headers appear as the generator renders them: level 2 and 3
 * headers end with the period the renderer adds, and the recital children's
 * "Recital N" headers are not rendered at all.
 */
function authoredWords(): string[] {
  const parts: string[] = [];
  for (const c of [...readClauses()].sort((a, b) => a.order - b.order)) {
    if (c.headerText && !c.slug.startsWith("MEF26_RECITAL_")) {
      parts.push(c.level === 2 || c.level === 3 ? `${c.headerText}.` : c.headerText);
    }
    parts.push(c.bodyHtml);
  }
  parts.push(...LETTERS.map(readExhibit));
  let joined = parts.join("\n");
  for (const m of TABLE_MARKERS) joined = joined.split(`{{${m.variable}}}`).join(` ${m.marker} `);
  return words(joined);
}

type Op = { kind: "equal" | "delete" | "insert"; word: string; at: number };

/** Myers' O(ND) diff over word arrays. `at` indexes `a` for equal/delete and `b` for insert. */
function diffWords(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const off = max + 1;
  const v = new Int32Array(2 * max + 3);
  // trace[d] is V as it stood before step d, kept only over k in [-d-1, d+1].
  const trace: Int32Array[] = [];
  let done = false;
  for (let d = 0; d <= max && !done; d++) {
    trace.push(v.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[off + k] = x;
      if (x >= n && y >= m) {
        done = true;
        break;
      }
    }
  }
  const ops: Op[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const snap = trace[d];
    const get = (k: number) => snap[k + d + 1];
    const k = x - y;
    const prevK = k === -d || (k !== d && get(k - 1) < get(k + 1)) ? k + 1 : k - 1;
    const prevX = d === 0 ? 0 : get(prevK);
    const prevY = d === 0 ? 0 : prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push({ kind: "equal", word: a[x - 1], at: x - 1 });
      x--;
      y--;
    }
    if (d > 0) {
      if (x === prevX) ops.push({ kind: "insert", word: b[y - 1], at: y - 1 });
      else ops.push({ kind: "delete", word: a[x - 1], at: x - 1 });
    }
    x = prevX;
    y = prevY;
  }
  return ops.reverse();
}

interface Hunk {
  src: string;
  aut: string;
  context: string;
}

/** Runs of consecutive non-equal words: what the docx says, and what the content says instead. */
function hunks(a: string[], b: string[]): Hunk[] {
  const out: Hunk[] = [];
  let src: string[] = [];
  let aut: string[] = [];
  let lastEqual = -1;
  const flush = () => {
    if (src.length || aut.length) {
      const context = a.slice(Math.max(0, lastEqual - 7), lastEqual + 1).join(" ");
      out.push({ src: src.join(" "), aut: aut.join(" "), context });
    }
    src = [];
    aut = [];
  };
  for (const op of diffWords(a, b)) {
    if (op.kind === "equal") {
      flush();
      lastEqual = op.at;
    } else if (op.kind === "delete") src.push(op.word);
    else aut.push(op.word);
  }
  flush();
  return out;
}

/**
 * Every sanctioned difference between the docx and the authored content: the
 * docx words removed (`src`) and the content words put in their place (`aut`).
 * Each must occur exactly once. Anything else the diff finds fails the test.
 */
const SANCTIONED: { src: string; aut: string }[] = [
  // Preamble: the title, upper-cased as the live preamble row stores it
  { src: "Dvele Master Factory Built Home Agreement", aut: "DVELE MASTER FACTORY BUILT HOME AGREEMENT" },
  // Preamble: Effective Date blank
  { src: "___________, ________", aut: "{{AGREEMENT_EXECUTION_DATE_WRITTEN}}" },
  // Preamble: the seller is the project's LLC (Decision 3)
  { src: "Dvele AZ, LLC, an Arizona limited liability company", aut: "{{SELLER_LEGAL_NAME}}, {{SELLER_ENTITY_CLAUSE}}" },
  // Preamble: the Buyer's name and state of formation / entity type (Ruling 18)
  { src: "________________, a [State of Formation] [limited liability company / corporation / other entity type],", aut: "{{CLIENT_LEGAL_NAME}}, {{BUYER_ENTITY_CLAUSE}}," },
  // Preamble: Buyer's principal address blank
  { src: "_____________________________", aut: "{{AGREEMENT_BUYER_ADDRESS}}" },
  // Preamble: unit count blank
  { src: "_______(__)", aut: "{{TOTAL_UNITS_WRITTEN}}" },
  // Preamble: Site address
  { src: "[Site Address, City, County, State],", aut: "{{SITE_ADDRESS}}," },
  // 2(c): the renderer adds a period after a level-2 header the docx leaves bare
  { src: "Substitutions", aut: "Substitutions." },
  // 12(a): mediation seat (Ruling 21)
  { src: "[County], [State]", aut: "{{AGREEMENT_DISPUTE_LOCATION}}" },
  // 12(b): arbitration seat (Ruling 21)
  { src: "[County], [State],", aut: "{{AGREEMENT_DISPUTE_LOCATION}}," },
  // 12(d): governing law state
  { src: "[Governing Law State],", aut: "{{AGREEMENT_GOVERNING_LAW_STATE}}," },
  // 14: level-1 headers render without a trailing period
  { src: "SURVIVAL.", aut: "SURVIVAL" },
  // 15: level-1 headers render without a trailing period
  { src: "AUTHORITY.", aut: "AUTHORITY" },
  // A.1 Buyer Type cell (the A.1 election test checks it reproduces the docx cell)
  { src: "☐ End Customer (owner-occupant) ☐ Developer (for resale or lease)", aut: "{{BUYER_TYPE_ELECTION}}" },
  // A.1 Project Name blank cell
  { src: "", aut: "{{PROJECT_NAME}}" },
  // A.1 Delivery Model cell (Ruling 17; checked by the A.1 election test)
  { src: "☐ FOB Factory (Buyer Pickup/Transport) ☐ Delivered to Site (Dvele Transport; Buyer/GC Site Work) ☐ Dvele GC (Turnkey through CO/Equivalent; GC Affiliate: ____________________; License No. / State: ____________ / [State])", aut: "{{DELIVERY_MODEL_ELECTION}}" },
  // A.1 Jurisdiction blank cell: state name, county, permitting authority, program & approval no. (Ruling 20)
  { src: "", aut: "{{PROJECT_STATE_NAME}} / ____________ / ____________; ____________" },
  // A.1 Site(s) blank cell
  { src: "", aut: "{{SITE_ADDRESS}}" },
  // A.1 Buyer Notice blank cell
  { src: "", aut: "{{CLIENT_FULL_ADDRESS}} / {{CLIENT_EMAIL}}" },
  // A.8 storage fee blanks and their default
  { src: "$______/day per Home after ______ days free (if left blank, $250/day per Home after ten (10) business days)", aut: "{{STORAGE_TERMS}}" },
  // C.1: the docx's literal bullet character is a list item in the content
  { src: "●", aut: "" },
  // C.1 Buyer GC blank (Ruling 16)
  { src: "____________________", aut: "{{BUYER_GC_DETAILS}}" },
  // C.1 GC Affiliate blank (Ruling 16)
  { src: "____________________).", aut: "{{GC_AFFILIATE_DETAILS}})." },
  // C.4 foundation deadline blank
  { src: "[●]", aut: "{{FOUNDATION_READY_DAYS}}" },
  // C.4 utility stub deadline blank
  { src: "[●]", aut: "{{UTILITY_STUBBED_DAYS}}" },
  // C.4 crane deadline blank
  { src: "[●]", aut: "{{CRANE_ACCESS_READY_DAYS}}" },
  // D.1/D.2 D-1 Target Date blank cell
  { src: "", aut: "{{DESIGN_KICKOFF_DATE}}" },
  // D.1/D.2 D-2 Target Date blank cell
  { src: "", aut: "{{SCHEMATIC_DESIGN_DATE}}" },
  // D.1/D.2 D-3 Target Date blank cell
  { src: "", aut: "{{PERMIT_SUBMITTAL_DATE}}" },
  // D.1/D.2 D-4 Target Date blank cell
  { src: "", aut: "{{DESIGN_DEVELOPMENT_DATE}}" },
  // D.1/D.2 P-1 Target Date blank cell
  { src: "", aut: "{{PRODUCTION_START_DATE}}" },
  // D.1/D.2 P-2 Target Date blank cell
  { src: "", aut: "{{PRODUCTION_COMPLETE_DATE}}" },
  // D.1/D.2 P-3 Target Date blank cell
  { src: "", aut: "{{DELIVERY_SET_DATE}}" },
  // D.1/D.2 P-4 Target Date blank cell
  { src: "", aut: "{{CO_EQUIVALENT_DATE}}" },
  // Exhibit E notice: the bracketed statute prefix (Decision 11)
  { src: "[IF REQUIRED BY SITE-STATE LAW: PURSUANT TO [STATE STATUTE CITATION],] THIS", aut: "{{WARRANTY_STATUTE_PREFIX}}THIS" },
  // Exhibit E notice: the Site state
  { src: "[SITE STATE]", aut: "{{PROJECT_STATE_NAME}}" },
  // Exhibit E heading 1: Word's list number, written into the heading (Decision 12)
  { src: "", aut: "1." },
  // Exhibit E heading 2: Word's list number, written into the heading (Decision 12)
  { src: "", aut: "2." },
  // Exhibit E heading 3: Word's list number, written into the heading (Decision 12)
  { src: "", aut: "3." },
  // Exhibit E heading 4: Word's list number, written into the heading (Decision 12)
  { src: "", aut: "4." },
  // Exhibit E heading 5: Word's list number, written into the heading (Decision 12)
  { src: "", aut: "5." },
  // Exhibit E heading 6: Word's list number, written into the heading (Decision 12)
  { src: "", aut: "6." },
  // Exhibit E heading 7: Word's list number, written into the heading (Decision 12)
  { src: "", aut: "7." },
  // Exhibit E heading 8: Word's list number, written into the heading (Decision 12)
  { src: "", aut: "8." },
  // Exhibit F title: the Site state
  { src: "([SITE STATE])", aut: "({{PROJECT_STATE_NAME}})" },
  // F.2: the per-state notices disclosure (Decision 11)
  { src: "[For each Site state, insert the statutory disclosures, cancellation rights, warranty notices, arbitration disclosures, contractor-license disclosures, and mechanics lien / preliminary notice requirements that apply to the Buyer Type elected in Exhibit A.]", aut: "[STATE_DISCLOSURE:MASTER_EF_2026_STATE_NOTICES]" },
];

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
      "{{PROJECT_STATE_NAME}} / ____________ / ____________; ____________",
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
    const found = hunks(await sourceWords(), authoredWords());
    const same = (h: { src: string; aut: string }, e: { src: string; aut: string }) =>
      h.src === e.src && h.aut === e.aut;
    const unsanctioned = found.filter((h) => !SANCTIONED.some((e) => same(h, e)));
    const miscounted = SANCTIONED.filter((e) => found.filter((h) => same(h, e)).length !== 1);
    expect(unsanctioned).toEqual([]);
    expect(miscounted).toEqual([]);
  });

  it("A.1's election variables reproduce the docx cells", async () => {
    const { value } = await mammoth.convertToHtml({ path: path.join(DIR, "source.docx") });
    const $ = cheerio.load(value);
    const a1 = $("table").filter((_, t) => /Buyer Type/.test($(t).text())).first();
    const cells = a1
      .find("td")
      .toArray()
      .map((td) => $(td).text())
      .filter((t) => /^\s*☐/.test(t));
    // Blanks and the bracketed license state compare as one blank; the
    // elected box compares as an empty one.
    const shape = (t: string) =>
      normalize(t.replace(/<br>/g, " ").replace(/☒/g, "☐").replace(/_{3,}|\[State\]/g, "_"));
    const vars = mapProjectToVariables(MINIMAL_PROJECT);
    expect(cells.map(shape)).toEqual([
      shape(String(vars.BUYER_TYPE_ELECTION)),
      shape(String(vars.DELIVERY_MODEL_ELECTION)),
    ]);
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
