import { pool } from "./db";
import seedData from "./seed-data.json";

const JSONB_COLUMNS: Record<string, Set<string>> = {
  clauses: new Set(["contract_types", "tags"]),
  contract_templates: new Set(["conditional_rules", "base_clause_ids"]),
  table_definitions: new Set(["columns", "rows"]),
};

const SQL_RESERVED_WORDS = new Set([
  "order", "level", "column", "group", "table", "type", "user", "select",
  "where", "from", "to", "index", "check", "default", "key", "limit",
  "offset", "position", "row", "rows", "values", "references",
]);

function quoteCol(col: string): string {
  return SQL_RESERVED_WORDS.has(col.toLowerCase()) ? `"${col}"` : col;
}

export async function seedProductionData() {
  const tables = [
    { name: "contractor_entities", data: seedData.contractor_entities },
    { name: "clauses", data: seedData.clauses },
    { name: "exhibits", data: seedData.exhibits },
    { name: "state_disclosures", data: seedData.state_disclosures },
    { name: "component_library", data: seedData.component_library },
    { name: "table_definitions", data: seedData.table_definitions },
    { name: "contract_templates", data: seedData.contract_templates },
    { name: "template_clauses", data: seedData.template_clauses },
    { name: "contractors", data: seedData.contractors },
    { name: "warranty_terms", data: seedData.warranty_terms },
  ];

  for (const table of tables) {
    if (!table.data || table.data.length === 0) continue;

    const client = await pool.connect();
    try {
      const countRes = await client.query(`SELECT count(*) as cnt FROM ${table.name}`);
      if (parseInt(countRes.rows[0].cnt) > 0) {
        continue;
      }

      console.log(`Seeding ${table.name}: ${table.data.length} rows...`);
      const jsonbCols = JSONB_COLUMNS[table.name] || new Set();
      const cols = Object.keys(table.data[0]);

      await client.query("BEGIN");

      for (const row of table.data) {
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        const values = cols.map(col => {
          const val = (row as any)[col];
          if (jsonbCols.has(col) && val !== null) {
            return JSON.stringify(val);
          }
          return val;
        });

        const quotedCols = cols.map(quoteCol).join(", ");
        await client.query(
          `INSERT INTO ${table.name} (${quotedCols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
      }

      try {
        await client.query(
          `SELECT setval(pg_get_serial_sequence('${table.name}', 'id'), COALESCE((SELECT MAX(id) FROM ${table.name}), 1), true)`
        );
      } catch {
      }

      await client.query("COMMIT");
      console.log(`  Done: ${table.name} (${table.data.length} rows)`);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.warn(`  Warning: Failed to seed ${table.name}:`, err instanceof Error ? err.message : err);
    } finally {
      client.release();
    }
  }
}
