import "dotenv/config";
import { Pool } from "pg";

// One-off, idempotent data migration: re-tag the legacy manufacturing
// contract-type value "MFG" to the canonical "MANUFACTURING" used everywhere
// else in the app (clause filtering, generation, the AGENTS.md type set).
//
// Run once per environment that may hold MFG data:
//   npx tsx scripts/migrate-mfg-to-manufacturing.ts
//
// Safe to re-run: each statement only touches rows still tagged "MFG".

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function count(sql: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(sql);
  return parseInt(rows[0]?.count ?? "0", 10);
}

const CLAUSES_MFG = `SELECT count(*)::text AS count FROM clauses WHERE contract_types @> '["MFG"]'::jsonb`;
const TEMPLATES_MFG = `SELECT count(*)::text AS count FROM contract_templates WHERE contract_type = 'MFG'`;
const CONTRACTS_MFG = `SELECT count(*)::text AS count FROM contracts WHERE contract_type = 'MFG'`;

async function migrate(): Promise<void> {
  const before = {
    clauses: await count(CLAUSES_MFG),
    templates: await count(TEMPLATES_MFG),
    contracts: await count(CONTRACTS_MFG),
  };
  console.log("Rows tagged MFG before migration:", before);

  if (before.clauses + before.templates + before.contracts === 0) {
    console.log("Nothing to migrate. ✅");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // clauses.contract_types is a JSONB array — swap the "MFG" element only.
    const clauses = await client.query(`
      UPDATE clauses
      SET contract_types = (
        SELECT jsonb_agg(
          CASE WHEN e = '"MFG"'::jsonb THEN '"MANUFACTURING"'::jsonb ELSE e END
        )
        FROM jsonb_array_elements(contract_types) e
      )
      WHERE contract_types @> '["MFG"]'::jsonb
    `);

    const templates = await client.query(
      `UPDATE contract_templates SET contract_type = 'MANUFACTURING' WHERE contract_type = 'MFG'`
    );

    const contracts = await client.query(
      `UPDATE contracts SET contract_type = 'MANUFACTURING' WHERE contract_type = 'MFG'`
    );

    await client.query("COMMIT");
    console.log("Rows updated:", {
      clauses: clauses.rowCount,
      templates: templates.rowCount,
      contracts: contracts.rowCount,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const after = {
    clauses: await count(CLAUSES_MFG),
    templates: await count(TEMPLATES_MFG),
    contracts: await count(CONTRACTS_MFG),
  };
  console.log("Rows tagged MFG after migration:", after);
  if (after.clauses + after.templates + after.contracts === 0) {
    console.log("Migration complete. ✅");
  } else {
    console.warn("⚠️ Some MFG rows remain — investigate.");
  }
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
