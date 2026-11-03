// @ts-nocheck -- .html imports resolve through esbuild's text loader (script/build.ts)
import clauses from "../../server/templates/master-ef-2026-10/clauses.json";
import a from "../../server/templates/master-ef-2026-10/exhibit-a.html";
import b from "../../server/templates/master-ef-2026-10/exhibit-b.html";
import c from "../../server/templates/master-ef-2026-10/exhibit-c.html";
import d from "../../server/templates/master-ef-2026-10/exhibit-d.html";
import e from "../../server/templates/master-ef-2026-10/exhibit-e.html";
import f from "../../server/templates/master-ef-2026-10/exhibit-f.html";
import { buildMasterEf2026Content, type MasterEf2026Content } from "../../server/lib/masterEf2026Install";

/** The bundled twin of masterEf2026Content.ts: same API, files inlined at build time. */
export function loadMasterEf2026Content(): MasterEf2026Content {
  return buildMasterEf2026Content(clauses, { A: a, B: b, C: c, D: d, E: e, F: f });
}
