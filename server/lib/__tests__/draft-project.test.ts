import { describe, it, expect } from "vitest";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../../../shared/schema";
import { DRAFT_PROJECT_CHILD_TABLES } from "../draftProject";

/** table name → names of the tables its foreign keys point at */
function foreignKeyTargets(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const value of Object.values(schema)) {
    if (!(value instanceof PgTable)) continue;
    const cfg = getTableConfig(value);
    const targets = new Set<string>();
    for (const fk of cfg.foreignKeys) {
      targets.add(getTableConfig(fk.reference().foreignTable).name);
    }
    out.set(cfg.name, targets);
  }
  return out;
}

describe("DRAFT_PROJECT_CHILD_TABLES", () => {
  const fks = foreignKeyTargets();

  it("names every table that references projects, except contracts", () => {
    const referencing = [...fks.entries()]
      .filter(([name, targets]) => targets.has("projects") && name !== "contracts")
      .map(([name]) => name)
      .sort();
    expect([...DRAFT_PROJECT_CHILD_TABLES].sort()).toEqual(referencing);
  });

  it("deletes a referencing table before the table it references", () => {
    const list = [...DRAFT_PROJECT_CHILD_TABLES];
    for (const [i, table] of list.entries()) {
      for (const target of fks.get(table) ?? []) {
        const j = list.indexOf(target as (typeof list)[number]);
        if (j === -1) continue; // projects, organizations, home_models: not in the list
        expect(i, `${table} must be deleted before ${target}`).toBeLessThan(j);
      }
    }
  });
});
