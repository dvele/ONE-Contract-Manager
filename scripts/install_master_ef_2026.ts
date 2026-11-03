import "dotenv/config";
import { pool } from "../server/db";
import { installMasterEf2026 } from "./lib/masterEf2026Installer";
// script/build.ts swaps this import for the bundled twin, so the deployed
// dist/scripts/install-master-ef-2026.cjs carries the template files itself.
import { loadMasterEf2026Content } from "./lib/masterEf2026Content";

/**
 * Installs the Master EF 2026-10 agreement as a new template version.
 *
 *   --dry-run   plan and apply inside the transaction, then roll back
 *
 * A re-run writes nothing to the template, clauses, exhibits or LLC; the state
 * notices step is insert-if-absent. Existing state_disclosures rows are only read.
 * The template is found by name, so renaming it makes a re-run install a
 * second copy.
 */
const dryRun = process.argv.includes("--dry-run");

installMasterEf2026(pool, loadMasterEf2026Content(), { dryRun })
  .catch((err) => {
    console.error("Install failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
