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

/** A row identified by its first cell, whose trailing empty cell takes a variable. */
interface CellRewiring {
  rowLabel: string;
  variable: string;
}

// D.1 and D.2's Target Date column is the last cell of each row and is
// literally `<td></td>`. Every variable here already exists in mapper.ts, each
// commented there with the row it serves — do not add new ones.
const CELL_REWIRINGS: CellRewiring[] = [
  { rowLabel: "D-1 Kickoff", variable: "{{DESIGN_KICKOFF_DATE}}" },
  { rowLabel: "D-2 Schematic", variable: "{{SCHEMATIC_DESIGN_DATE}}" },
  { rowLabel: "D-3 Permit Set", variable: "{{PERMIT_SUBMITTAL_DATE}}" },
  // D-4 resolves DESIGN_DEVELOPMENT_DATE, which already has a three-term
  // precedence chain (wizard field, then green-light column, then derivation)
  // from Task 6. One variable in this cell, never two.
  { rowLabel: "D-4 Green Light Package", variable: "{{DESIGN_DEVELOPMENT_DATE}}" },
  { rowLabel: "P-1 Factory Start", variable: "{{PRODUCTION_START_DATE}}" },
  { rowLabel: "P-2 Factory Completion", variable: "{{PRODUCTION_COMPLETE_DATE}}" },
  { rowLabel: "P-3 Delivery/Set", variable: "{{DELIVERY_SET_DATE}}" },
  { rowLabel: "P-4 CO/Equivalent (if Dvele model)", variable: "{{CO_EQUIVALENT_DATE}}" },
];

/** Fills the empty trailing <td></td> of the row whose first cell is `rowLabel`. */
function rewireCell(content: string, { rowLabel, variable }: CellRewiring): string {
  const rowStart = content.indexOf(`<td>${rowLabel}</td>`);
  if (rowStart === -1) return content;

  const rowEnd = content.indexOf("</tr>", rowStart);
  if (rowEnd === -1) throw new Error(`Row "${rowLabel}" has no closing tag`);

  const row = content.slice(rowStart, rowEnd);
  if (row.includes(variable)) return content; // already rewired

  if (!row.includes("<td></td>")) {
    throw new Error(`Row "${rowLabel}" has no empty cell to fill — inspect it by hand`);
  }

  return content.slice(0, rowStart) + row.replace("<td></td>", `<td>${variable}</td>`) + content.slice(rowEnd);
}

/** Exact-string replacements. Each is idempotent: absent means already applied. */
const LITERAL_REWIRINGS: { from: string; to: string; note: string }[] = [
  {
    // C.4's three deadlines. Each row's day count is already collected in the
    // wizard and resolved in mapper.ts; only the body never referenced them.
    from: "<tr><td>Foundation ready certification</td><td>Client/GC</td><td>Dvele</td><td>[TBD] days before delivery</td></tr>",
    to: "<tr><td>Foundation ready certification</td><td>Client/GC</td><td>Dvele</td><td>{{FOUNDATION_READY_DAYS}} days before delivery</td></tr>",
    note: "C.4 foundation",
  },
  {
    from: "<tr><td>Utility stub verification</td><td>Client/GC</td><td>Dvele</td><td>[TBD] days before delivery</td></tr>",
    to: "<tr><td>Utility stub verification</td><td>Client/GC</td><td>Dvele</td><td>{{UTILITY_STUBBED_DAYS}} days before delivery</td></tr>",
    note: "C.4 utility stub",
  },
  {
    from: "<tr><td>Crane mobilization plan</td><td>Client/GC</td><td>Dvele</td><td>[TBD] days before delivery</td></tr>",
    to: "<tr><td>Crane mobilization plan</td><td>Client/GC</td><td>Dvele</td><td>{{CRANE_ACCESS_READY_DAYS}} days before delivery</td></tr>",
    note: "C.4 crane",
  },
  {
    // A.5's own table now carries every phase's milestones, so the project-level
    // schedule that followed it billed the same money a second time.
    from: "\n\n{{PAYMENT_SCHEDULE_TABLE}}\n\n<h3>A.6 Green Light Conditions (Phase-Specific)</h3>",
    to: "\n\n<h3>A.6 Green Light Conditions (Phase-Specific)</h3>",
    note: "A.5 trailing project-level schedule removed",
  },
  {
    from: "<p><em>(Add rows for each Property and Phase.)</em></p>",
    to: "",
    note: "A.5 manual-entry note, obsolete once the table is generated",
  },
  {
    // SITE_ADDRESS already resolves to a complete address through
    // buildFullAddress, so A.1's Site(s) row printed the city, state and zip
    // twice. The duplication is the template's, not the variable's — other
    // callers depend on SITE_ADDRESS resolving exactly as it does.
    from: "<td>{{SITE_ADDRESS}}, {{SITE_CITY}}, {{SITE_STATE}} {{SITE_ZIP}}</td>",
    to: "<td>{{SITE_ADDRESS}}</td>",
    note: "A.1 site address printed twice",
  },
];

/**
 * Holds after a row is processed, in every environment: A.5's generated table
 * carries every phase's milestones, so a body keeping the project-level
 * schedule as well bills the same money twice. The literal rewirings match
 * exactly, and a production body differing by one newline would no-op that
 * removal silently while A.5 was rewired around it.
 */
function assertScheduleBilledOnce(id: number, title: string, content: string): void {
  if (content.includes("{{EXHIBIT_A5_TABLE}}") && content.includes("{{PAYMENT_SCHEDULE_TABLE}}")) {
    throw new Error(
      `exhibit ${id} (${title}) carries {{EXHIBIT_A5_TABLE}} and {{PAYMENT_SCHEDULE_TABLE}}: ` +
        `the trailing project-level schedule did not match and was left in place. ` +
        `Its surrounding whitespace differs from LITERAL_REWIRINGS — inspect the body by hand.`
    );
  }
}

/**
 * Replaces Exhibit A's hardcoded signature table with the resolved block.
 *
 * Deviates from the task brief's sketch, which replaced only the first <td>
 * (the "Accepted and agreed:" cell). The actual body's signature table has
 * TWO columns — "Accepted and agreed:" and "Post Design Approval
 * (Greenlight):" — and both hardcode DVELE, INC. Replacing only the first
 * would leave the second column's DVELE, INC. in place (and nest a rendered
 * table inside one <td> of the original, breaking the markup).
 * EXHIBIT_A_SIGNATURE_TABLE already renders both columns from one source
 * (see buildExhibitASignatureBlock in mapper.ts), so the whole outer
 * <table>...</table> is replaced, not just the cell containing the marker.
 */
function rewireSignature(content: string): string {
  const marker = "<p><strong>Accepted and agreed:</strong></p>";
  const start = content.indexOf(marker);
  if (start === -1) return content;

  const tableStart = content.lastIndexOf("<table", start);
  if (tableStart === -1) throw new Error("Exhibit A's signature block has no enclosing table");

  const tableEnd = content.indexOf("</table>", start);
  if (tableEnd === -1) throw new Error("Exhibit A's signature block has no closing table tag");

  return content.slice(0, tableStart) + "{{EXHIBIT_A_SIGNATURE_TABLE}}" + content.slice(tableEnd + "</table>".length);
}

/** Applies every cell, literal and signature rewiring, returning the labels that actually changed something. */
function applyRowRules(content: string): { content: string; applied: string[] } {
  const applied: string[] = [];

  for (const cellRewiring of CELL_REWIRINGS) {
    const next = rewireCell(content, cellRewiring);
    if (next !== content) applied.push(`cell: ${cellRewiring.rowLabel}`);
    content = next;
  }

  for (const literal of LITERAL_REWIRINGS) {
    if (content.includes(literal.from)) {
      content = content.split(literal.from).join(literal.to);
      applied.push(`literal: ${literal.note}`);
    }
  }

  const withSignature = rewireSignature(content);
  if (withSignature !== content) applied.push("signature: Exhibit A");
  content = withSignature;

  return { content, applied };
}

/**
 * Index where the next `<h3` or `<h2` heading begins at or after `from`, or
 * `content.length` if there is none — the boundary a matched section's table
 * search must not cross, so a missing/relocated table is caught rather than
 * silently satisfied by a later section's table.
 */
function nextHeadingBoundary(content: string, from: number): number {
  const candidates = [content.indexOf("<h3", from), content.indexOf("<h2", from)].filter((i) => i !== -1);
  return candidates.length > 0 ? Math.min(...candidates) : content.length;
}

/** Replaces the first <table>…</table> after `heading` with `placeholder`. */
function rewire(content: string, { heading, placeholder }: Rewiring): { content: string; changed: boolean; found: boolean } {
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) return { content, changed: false, found: false };

  // Bound the section to before the next heading so the table search can't
  // wander into a later section (or the trailing signature table).
  const sectionEnd = nextHeadingBoundary(content, headingIndex + heading.length);
  const section = content.slice(headingIndex, sectionEnd);

  if (section.includes(placeholder)) {
    return { content, changed: false, found: true }; // already rewired
  }

  const tableStart = section.indexOf("<table");
  const tableEnd = section.indexOf("</table>");
  if (tableStart === -1 || tableEnd === -1 || tableEnd < tableStart) {
    throw new Error(`No table follows "${heading}" — inspect the body by hand`);
  }

  const rewiredSection =
    section.slice(0, tableStart) + placeholder + section.slice(tableEnd + "</table>".length);
  return {
    content: content.slice(0, headingIndex) + rewiredSection + content.slice(sectionEnd),
    changed: true,
    found: true,
  };
}

/**
 * Whether this body is one the script knows — it carries a heading, a row or
 * the signature marker some rewiring targets, whether or not that rewiring has
 * already been applied. Distinguishes "nothing here to do" (the Limited
 * Warranty and State-Specific Provisions exhibits have no such section) from
 * "this environment's bodies no longer look like the ones this script matches".
 */
function recognises(content: string): boolean {
  return (
    REWIRINGS.some((r) => content.includes(r.heading)) ||
    CELL_REWIRINGS.some((c) => content.includes(`<td>${c.rowLabel}</td>`)) ||
    content.includes("<p><strong>Accepted and agreed:</strong></p>") ||
    content.includes("{{EXHIBIT_A_SIGNATURE_TABLE}}")
  );
}

/** Every rewiring applied to one body, in the order the rules run. */
function rewireBody(content: string): { content: string; applied: string[]; recognised: boolean } {
  const recognised = recognises(content);
  const applied: string[] = [];

  for (const rewiring of REWIRINGS) {
    const result = rewire(content, rewiring);
    if (result.found && result.changed) applied.push(rewiring.heading);
    content = result.content;
  }

  const rowRules = applyRowRules(content);
  applied.push(...rowRules.applied);

  return { content: rowRules.content, applied, recognised };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const writeSeed = process.argv.includes("--write-seed");

  // Scoped to MASTER_EF: these headings and literals are this agreement's, and
  // an unscoped UPDATE could rewrite a similarly-worded body belonging to
  // another contract type in an environment whose library has diverged.
  const { rows } = await pool.query(
    `SELECT id, title, content FROM exhibits
      WHERE contract_types @> '["MASTER_EF"]'::jsonb
      ORDER BY id`
  );
  let changedRows = 0;
  let recognisedRows = 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const row of rows) {
      const { content, applied, recognised } = rewireBody(row.content || "");
      assertScheduleBilledOnce(row.id, row.title, content);
      if (recognised) recognisedRows++;

      // One line per exhibit, listing what applied — the old per-heading "not
      // found" logging printed ~60 lines per dry run, under which a genuine
      // miss was invisible.
      const summary = applied.length > 0 ? applied.join("; ") : recognised ? "already rewired" : "nothing to rewire";
      console.log(`${dryRun ? "[dry-run] " : ""}exhibit ${row.id} (${row.title}): ${summary}`);

      if (applied.length === 0) continue;
      changedRows++;

      if (!dryRun) {
        await client.query(`UPDATE exhibits SET content = $1 WHERE id = $2`, [content, row.id]);
      }
    }

    await client.query(dryRun ? "ROLLBACK" : "COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  console.log(`${rows.length} MASTER_EF exhibit(s) read, ${changedRows} ${dryRun ? "would change" : "changed"}`);

  if (writeSeed && !dryRun) {
    const path = "server/seed-data.json";
    const seed = JSON.parse(readFileSync(path, "utf8"));
    for (const exhibit of seed.exhibits) {
      const { content } = rewireBody(exhibit.content || "");
      assertScheduleBilledOnce(exhibit.id ?? -1, exhibit.title ?? path, content);
      exhibit.content = content;
    }
    writeFileSync(path, `${JSON.stringify(seed, null, 2)}\n`);
    console.log(`${path} refreshed`);
  }

  // Deliberately not per-exhibit: the Limited Warranty and State-Specific
  // Provisions exhibits carry no section any rewiring targets and never will,
  // so failing on those would make the exit code permanently non-zero. What is
  // an error is recognising nothing at all — the environment's bodies no
  // longer look like the ones this script matches, and every UPDATE above was
  // a silent no-op.
  if (recognisedRows === 0) {
    console.error(`No MASTER_EF exhibit carried any section this script rewires — bodies have diverged.`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("Rewiring failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
