/**
 * Brings a local database to the point where the 9-step wizard is actually usable.
 *
 * `server/seed.ts` (`seedProductionData`) seeds clauses, exhibits, state disclosures,
 * the component library, table definitions, contract templates and template clauses —
 * but **not** `home_models` and **not** the `template_exhibits` junction. Without those
 * two a clean checkout reaches a dead end that looks like a bug in the app:
 *
 *   - no home models  -> Step 1 has nothing to select, so no project can be priced and
 *     Steps 4, 6 and 7 are unreachable
 *   - no template_exhibits -> `fetchExhibitsForContract` keys off that junction, so a
 *     generated contract silently contains **no exhibits at all**
 *
 * This script fills both, and is idempotent: re-running it changes nothing. It never
 * overwrites an existing home model, so a price you edited locally survives.
 *
 * Run:  npm run seed:dev
 *
 * It does not create projects. Create those through the wizard — exercising that path
 * is the point.
 */
import "dotenv/config";
import { pool } from "../server/db";
import { seedProductionData } from "../server/seed";
import { MASTER_EF_2026_TEMPLATE_NAME } from "../server/lib/masterEf2026Install";
import { installMasterEf2026 } from "./lib/masterEf2026Installer";
import { loadMasterEf2026Content } from "./lib/masterEf2026Content";

/**
 * `requireAuth` hardcodes `req.organizationId` to 1, so every fixture must belong to
 * org 1 or the wizard will not see it.
 */
const ORG_ID = 1;

interface HomeModelFixture {
  name: string;
  modelCode: string;
  sqFt: number;
  bedrooms: number;
  bathrooms: number;
  /** cents */
  offsiteBasePrice: number;
  /** cents */
  onsiteEstPrice: number;
  /** cents */
  shippingSetPrice: number;
}

/**
 * Two models, named after the ones in the issued September 2026 Zaca Preserve
 * agreement so a wizard run resembles a real project.
 *
 * **Only Lumina's square footage and offsite price are documented figures** — 2033 sq ft
 * at $645,800 is what that agreement renders (recorded in the design spec, which also
 * notes the seeded catalog disagreed with it at 2053 sq ft / $587,840). Everything else
 * here is a fixture: Gabriel's offsite price is Lumina's rate per square foot applied to
 * 1200 sq ft, and all four on-site and shipping figures are invented round numbers. They
 * are plausible, not authoritative — do not cite them as agreement figures.
 *
 * Per-model `design_fee` is deliberately left null: the pricing engine takes the design
 * fee from `financials`, project-level, and never sums it from the catalog.
 */
const HOME_MODELS: HomeModelFixture[] = [
  {
    name: "Lumina",
    modelCode: "LUMINA",
    sqFt: 2033,
    bedrooms: 3,
    bathrooms: 2,
    offsiteBasePrice: 645_800_00,
    onsiteEstPrice: 120_000_00,
    shippingSetPrice: 45_000_00,
  },
  {
    name: "Gabriel",
    modelCode: "GABRIEL",
    sqFt: 1200,
    bedrooms: 2,
    bathrooms: 1,
    offsiteBasePrice: 381_200_00,
    onsiteEstPrice: 80_000_00,
    shippingSetPrice: 32_000_00,
  },
];

async function ensureOrganization(): Promise<void> {
  const { rows } = await pool.query(`SELECT id FROM organizations WHERE id = $1`, [ORG_ID]);
  if (rows.length > 0) {
    console.log(`  org ${ORG_ID}: already present`);
    return;
  }

  // Explicit id, not the sequence: org 1 is what requireAuth resolves to, and the
  // seeded rows below reference it.
  await pool.query(
    `INSERT INTO organizations (id, name, slug) VALUES ($1, 'Dvele', 'dvele')`,
    [ORG_ID],
  );
  console.log(`  org ${ORG_ID}: created`);
}

async function seedHomeModels(): Promise<number> {
  let created = 0;

  for (const model of HOME_MODELS) {
    // (organization_id, model_code) is unique, so this is the idempotency point.
    // DO NOTHING rather than DO UPDATE: a local price edit should survive a re-run.
    const { rowCount } = await pool.query(
      `INSERT INTO home_models
         (organization_id, name, model_code, sq_ft, bedrooms, bathrooms,
          offsite_base_price, onsite_est_price, shipping_set_price, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       ON CONFLICT (organization_id, model_code) DO NOTHING`,
      [
        ORG_ID,
        model.name,
        model.modelCode,
        model.sqFt,
        model.bedrooms,
        model.bathrooms,
        model.offsiteBasePrice,
        model.onsiteEstPrice,
        model.shippingSetPrice,
      ],
    );

    if (rowCount && rowCount > 0) {
      created++;
      console.log(`  ${model.modelCode}: created`);
    } else {
      console.log(`  ${model.modelCode}: already present, left alone`);
    }
  }

  return created;
}

/**
 * Links every active template to the exhibits that declare its contract type.
 *
 * Nothing is keyed by id: `exhibits.contract_types` is the JSONB array that says which
 * agreements an exhibit belongs to, and `exhibits.sort_order` is the document order.
 * Ids differ between environments, so hardcoding them would seed one database and
 * corrupt the next.
 */
async function seedTemplateExhibits(): Promise<{ linked: number; problems: string[] }> {
  const problems: string[] = [];
  let linked = 0;

  const { rows: templates } = await pool.query(
    `SELECT id, name, contract_type, organization_id
     FROM contract_templates
     WHERE is_active = true
     ORDER BY id`,
  );

  if (templates.length === 0) {
    problems.push("no active contract_templates — run seedProductionData first");
    return { linked, problems };
  }

  for (const template of templates) {
    // The installer links the 2026-10 template to its own six exhibits. The
    // contract_types match below would also link the superseded MASTER_EF
    // exhibits to it, so leave it to the installer.
    const ownsItsExhibits = template.name === MASTER_EF_2026_TEMPLATE_NAME;
    const { rows: inserted } = ownsItsExhibits ? { rows: [] } : await pool.query(
      `INSERT INTO template_exhibits (template_id, exhibit_id, order_index, organization_id)
       SELECT $1, e.id, COALESCE(e.sort_order, e.id), $2
       FROM exhibits e
       WHERE e.contract_types @> $3::jsonb
         AND COALESCE(e.is_active, true)
         AND NOT EXISTS (
           SELECT 1 FROM template_exhibits te
           WHERE te.template_id = $1 AND te.exhibit_id = e.id
         )
       RETURNING exhibit_id`,
      [template.id, template.organization_id ?? ORG_ID, JSON.stringify([template.contract_type])],
    );

    const { rows: [{ total }] } = await pool.query(
      `SELECT count(*)::int AS total FROM template_exhibits WHERE template_id = $1`,
      [template.id],
    );

    linked += inserted.length;
    console.log(
      `  ${template.contract_type} (template ${template.id}): ` +
        `${inserted.length} linked, ${total} total`,
    );

    // A template with no exhibits generates a document with none, silently. That is
    // the failure this script exists to prevent, so say so rather than exit 0.
    if (total === 0) {
      problems.push(
        `template ${template.id} (${template.contract_type}) resolved no exhibits — ` +
          `no exhibit row declares "${template.contract_type}" in contract_types`,
      );
    }
  }

  return { linked, problems };
}

async function main(): Promise<void> {
  console.log("Seeding dev fixtures\n");

  console.log("Organization");
  await ensureOrganization();

  // Skips any table that already has rows, so this is safe to call every time.
  console.log("\nBase data (clauses, exhibits, templates, …)");
  await seedProductionData();

  console.log("\nHome models");
  const modelsCreated = await seedHomeModels();

  console.log("\nTemplate → exhibit junction");
  const { linked, problems } = await seedTemplateExhibits();

  // After seedTemplateExhibits, so the superseded MASTER_EF template is linked to
  // its exhibits before the installer deactivates it.
  console.log("\nMaster EF 2026-10 agreement");
  await installMasterEf2026(pool, loadMasterEf2026Content());

  console.log(
    `\nDone: ${modelsCreated} model(s) created, ${linked} exhibit link(s) created.`,
  );

  if (problems.length > 0) {
    console.error("\nProblems that will break generation:");
    for (const problem of problems) console.error(`  - ${problem}`);
    await pool.end();
    process.exit(1);
  }

  console.log("The wizard should now be usable: npm run dev, then sign in.");
  await pool.end();
}

main().catch(async (error) => {
  console.error("Failed to seed dev fixtures:", error);
  await pool.end();
  process.exit(1);
});
