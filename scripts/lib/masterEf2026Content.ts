import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  buildMasterEf2026Content,
  MASTER_EF_2026_NOTICE_STATES,
  type MasterEf2026Content,
} from "../../server/lib/masterEf2026Install";

/**
 * Reads the template files from disk (tsx and tests). script/build.ts swaps this
 * module for masterEf2026Content.bundled.ts, which inlines the same files, so the
 * deployed .cjs needs no server/templates directory.
 */
const DIR = join(dirname(fileURLToPath(import.meta.url)), "../../server/templates/master-ef-2026-10");

export function loadMasterEf2026Content(): MasterEf2026Content {
  const read = (f: string) => readFileSync(join(DIR, f), "utf8");
  return buildMasterEf2026Content(
    JSON.parse(read("clauses.json")),
    {
      A: read("exhibit-a.html"),
      B: read("exhibit-b.html"),
      C: read("exhibit-c.html"),
      D: read("exhibit-d.html"),
      E: read("exhibit-e.html"),
      F: read("exhibit-f.html"),
    },
    Object.fromEntries(MASTER_EF_2026_NOTICE_STATES.map((s) => [s, read(`state-notices/${s}.html`)])) as Record<
      (typeof MASTER_EF_2026_NOTICE_STATES)[number],
      string
    >,
  );
}
