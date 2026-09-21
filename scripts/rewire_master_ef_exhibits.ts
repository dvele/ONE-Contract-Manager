import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { pool } from "../server/db";

/**
 * Rewires the MASTER_EF exhibit bodies onto the dynamic generators.
 *
 * Idempotent: a section already carrying its placeholder is left alone, so the
 * script can be run against any environment repeatedly and in any order.
 *
 * The bodies are database rows. Editing server/seed-data.json changes only what
 * a fresh checkout seeds — `--write-seed` keeps the two in step.
 */

interface Rewiring {
  /** Exact heading text as it appears in the stored HTML, entities included. */
  heading: string;
  placeholder: string;
}

const REWIRINGS: Rewiring[] = [
  { heading: "A.2 Property &amp; Phase Matrix", placeholder: "{{EXHIBIT_A2_TABLE}}" },
  { heading: "A.4 Pricing Summary", placeholder: "{{EXHIBIT_A4_TABLE}}" },
  { heading: "A.5 Milestones &amp; Payment Schedule (Per Property/Phase)", placeholder: "{{EXHIBIT_A5_TABLE}}" },
  { heading: "B.1 Plan Set Index", placeholder: "{{EXHIBIT_B1_TABLE}}" },
  { heading: "C.2 Responsibility Allocation Matrix", placeholder: "{{RESPONSIBILITY_MATRIX_TABLE}}" },
];

// D.1, D.2 and C.4 are NOT in this list. Their tables carry the agreement's own
// deliverable and review-period text in the other columns; replacing them
// wholesale would delete that text to fill one cell. Task 8 fills the cells
// instead.

/** Replaces the first <table>…</table> after `heading` with `placeholder`. */
function rewire(content: string, { heading, placeholder }: Rewiring): { content: string; changed: boolean; found: boolean } {
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) return { content, changed: false, found: false };

  const after = content.slice(headingIndex);
  if (after.slice(0, 400).includes(placeholder)) {
    return { content, changed: false, found: true }; // already rewired
  }

  const tableStart = after.indexOf("<table");
  const tableEnd = after.indexOf("</table>");
  if (tableStart === -1 || tableEnd === -1 || tableEnd < tableStart) {
    throw new Error(`No table follows "${heading}" — inspect the body by hand`);
  }

  const rewired =
    after.slice(0, tableStart) + placeholder + after.slice(tableEnd + "</table>".length);
  return { content: content.slice(0, headingIndex) + rewired, changed: true, found: true };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const writeSeed = process.argv.includes("--write-seed");

  const { rows } = await pool.query(`SELECT id, title, content FROM exhibits ORDER BY id`);
  let changedRows = 0;

  for (const row of rows) {
    let content: string = row.content || "";
    const applied: string[] = [];

    for (const rewiring of REWIRINGS) {
      const result = rewire(content, rewiring);
      if (result.found && result.changed) applied.push(rewiring.heading);
      content = result.content;
    }

    if (applied.length === 0) continue;
    changedRows++;
    console.log(`${dryRun ? "[dry-run] " : ""}exhibit ${row.id} (${row.title}): ${applied.length} section(s)`);
    for (const heading of applied) console.log(`    ${heading}`);

    if (!dryRun) {
      await pool.query(`UPDATE exhibits SET content = $1 WHERE id = $2`, [content, row.id]);
    }
  }

  console.log(`${changedRows} row(s) ${dryRun ? "would change" : "changed"}`);

  if (writeSeed && !dryRun) {
    const path = "server/seed-data.json";
    const seed = JSON.parse(readFileSync(path, "utf8"));
    for (const exhibit of seed.exhibits) {
      let content: string = exhibit.content || "";
      for (const rewiring of REWIRINGS) content = rewire(content, rewiring).content;
      exhibit.content = content;
    }
    writeFileSync(path, `${JSON.stringify(seed, null, 2)}\n`);
    console.log(`${path} refreshed`);
  }

  await pool.end();
}

main();
