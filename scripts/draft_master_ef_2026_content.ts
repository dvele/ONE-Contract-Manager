/**
 * First-draft generator for the 2026-10 Master EF agreement content.
 *
 * Usage: npx tsx scripts/draft_master_ef_2026_content.ts <source.docx> <outDir>
 *
 * Reads the agreement through mammoth and writes clauses.json and
 * exhibit-{a..f}.html into outDir, which should be outside the repo (a scratch
 * folder). The output is a starting point only: the committed files
 * in server/templates/master-ef-2026-10/ are hand-edited from it (variable
 * substitutions, heading/body splits, Exhibit E numbering and nesting).
 */
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

interface DraftClause {
  slug: string;
  headerText: string;
  bodyHtml: string;
  level: number;
  parentSlug: string | null;
  order: number;
}

// Same style map as scripts/ingest_master_ef.ts.
const STYLE_MAP = [
  "p[style-name='Heading 1'] => h1.heading1:fresh",
  "p[style-name='Heading 2'] => h2.heading2:fresh",
  "p[style-name='Heading 3'] => h3.heading3:fresh",
  "p[style-name='Title'] => h1.title:fresh",
];

const STOPWORDS = new Set(["A", "AN", "AND", "IS", "OF", "ON", "THE", "TO"]);
const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];

function slugWords(text: string, max = 2): string {
  return text
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .slice(0, max)
    .join("_");
}

/**
 * Splits "Heading.  Body…" into its parts; returns an empty heading when there
 * is none. A bare heading over a nested list ("Change Orders; Substitutions")
 * is all heading. The heading is plain text (the generator escapes it).
 */
function splitHeading(html: string, hasList: boolean): { header: string; body: string } {
  const decode = (h: string) => cheerio.load(`<p>${h}</p>`)("p").text().replace(/\u00a0/g, " ").trim();
  if (hasList && !/[.:]/.test(decode(html)) && decode(html).split(/\s+/).length <= 10) {
    return { header: decode(html), body: "" };
  }
  const match = html.match(/^\s*([A-Z][^.<:]{1,80}?)\.(?:\s|&nbsp;)+([\s\S]+)$/);
  if (match && match[1].split(/\s+/).length <= 10) {
    return { header: decode(match[1]), body: match[2].trim() };
  }
  return { header: "", body: html.trim() };
}

function cleanHtml(html: string): string {
  return html
    .replace(/<a id="[^"]*"><\/a>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const [docxPath, outDir] = process.argv.slice(2);
  if (!docxPath || !outDir) {
    console.error("Usage: npx tsx scripts/draft_master_ef_2026_content.ts <source.docx> <outDir>");
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const { value: html } = await mammoth.convertToHtml({ path: docxPath }, { styleMap: STYLE_MAP });
  const $ = cheerio.load(html);
  const nodes = $("body").children().toArray();

  const clauses: DraftClause[] = [];
  let order = 0;
  const add = (c: Omit<DraftClause, "order">) => clauses.push({ ...c, order: ++order });

  // Everything before the first top-level list is the title, preamble and recitals.
  const firstList = nodes.findIndex((n) => (n as Element).tagName === "ol");
  const intro = nodes.slice(0, firstList);
  const title = $(intro[0]).text().trim();
  add({ slug: "MEF26_PREAMBLE", headerText: title.toUpperCase(), bodyHtml: `<p>${cleanHtml($(intro[1]).html() ?? "")}</p>`, level: 1, parentSlug: null });
  add({ slug: "MEF26_RECITALS", headerText: "RECITALS", bodyHtml: "", level: 1, parentSlug: null });
  let recital = 0;
  for (const node of intro.slice(3)) {
    const text = cleanHtml($(node).html() ?? "");
    if (/^NOW, THEREFORE/.test($(node).text())) {
      add({ slug: "MEF26_RECITAL_THEREFORE", headerText: "", bodyHtml: `<p>${text}</p>`, level: 5, parentSlug: "MEF26_RECITALS" });
    } else {
      recital++;
      add({ slug: `MEF26_RECITAL_${recital}`, headerText: `Recital ${recital}`, bodyHtml: `<p>${text}</p>`, level: 2, parentSlug: "MEF26_RECITALS" });
    }
  }

  // The numbered sections: ol > li (1), li > ol > li (a), and one more level (i).
  const ownHtml = (li: Element) => {
    const copy = $(li).clone();
    copy.children("ol").remove();
    return cleanHtml(copy.html() ?? "");
  };
  $(nodes[firstList])
    .children("li")
    .each((si, li) => {
      const n = si + 1;
      const strong = $(li).children("strong").first().text().trim().replace(/\.$/, "");
      const sectionSlug = `MEF26_${n}_${slugWords(strong)}`;
      const rest = ownHtml(li).replace(/^<strong>[\s\S]*?<\/strong>/, "").trim();
      add({ slug: sectionSlug, headerText: strong, bodyHtml: rest ? `<p>${rest}</p>` : "", level: 1, parentSlug: null });
      $(li)
        .children("ol")
        .children("li")
        .each((ai, sub) => {
          const letter = String.fromCharCode(97 + ai).toUpperCase();
          const { header, body } = splitHeading(ownHtml(sub), $(sub).children("ol").length > 0);
          const subSlug = `MEF26_${n}_${letter}_${slugWords(header || $(sub).text())}`;
          add({ slug: subSlug, headerText: header, bodyHtml: body ? `<p>${body}</p>` : "", level: 2, parentSlug: sectionSlug });
          $(sub)
            .children("ol")
            .children("li")
            .each((ri, item) => {
              const { header: h, body: b } = splitHeading(ownHtml(item), false);
              add({
                slug: `${subSlug}_${ROMAN[ri].toUpperCase()}`,
                headerText: h,
                bodyHtml: `<p>${b}</p>`,
                level: 3,
                parentSlug: subSlug,
              });
            });
        });
    });
  fs.writeFileSync(path.join(outDir, "clauses.json"), JSON.stringify(clauses, null, 2) + "\n");

  // Exhibits: split at "EXHIBIT X —" paragraphs after the agreement's signature table.
  const exhibits = new Map<string, AnyNode[]>();
  let current: string | null = null;
  for (const node of nodes.slice(firstList + 1)) {
    const m = $(node).text().trim().match(/^EXHIBIT ([A-F]) —/);
    if (m) {
      current = m[1].toLowerCase();
      exhibits.set(current, []);
    }
    if (current) exhibits.get(current)!.push(node);
  }
  for (const [letter, parts] of exhibits) {
    let eHeading = 0;
    const out = parts.map((node, i) => {
      const el = $(node);
      const text = el.text().trim();
      if (i === 0) return `<h2>${cleanHtml(el.html() ?? "").replace(/<\/?strong>/g, "").replace(" — ", " &mdash; ")}</h2>`;
      if (node.type === "tag" && (node as Element).tagName === "h3") {
        eHeading++;
        return `<h3>${eHeading}. ${text}</h3>`;
      }
      if (/^[A-F]\.\d/.test(text) && text.length < 90) return `<h3>${text}</h3>`;
      if (node.type === "tag" && (node as Element).tagName === "table") {
        el.attr("class", "exhibit-table");
        el.find("td > p:only-child").each((_, p) => {
          $(p).replaceWith($(p).html() ?? "");
        });
      }
      return cleanHtml($.html(node));
    });
    fs.writeFileSync(path.join(outDir, `exhibit-${letter}.html`), out.join("\n") + "\n");
  }
  console.log(`Wrote ${clauses.length} clauses and ${exhibits.size} exhibits to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
