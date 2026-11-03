import { describe, it, expect } from "vitest";
import type { Pool } from "pg";
import { installMasterEf2026 } from "../../../scripts/lib/masterEf2026Installer";
import type { MasterEf2026Content } from "../masterEf2026Install";

const content: MasterEf2026Content = {
  clauses: [{ slug: "MEF26_A", headerText: "A", bodyHtml: "", level: 1, parentSlug: null, order: 1 }],
  exhibits: ["A", "B", "C", "D", "E", "F"].map((letter) => ({ letter, title: `Title ${letter}`, content: `<h2>${letter}</h2>` })),
};

/** A pg Pool stand-in answering the installer's reads; every query is recorded. */
function fakePool(opts: { installed?: boolean; noticeStates?: string[] } = {}) {
  const queries: Array<{ sql: string; params: any[] }> = [];
  let nextId = 100;
  const client = {
    query: async (sql: string, params: any[] = []) => {
      queries.push({ sql, params });
      if (/^SELECT id FROM contract_templates WHERE name/.test(sql)) return { rows: opts.installed ? [{ id: 28 }] : [] };
      if (/FROM contract_templates\s+WHERE contract_type/.test(sql)) return { rows: [{ id: 26 }] };
      if (/FROM llcs/.test(sql)) return { rows: [], rowCount: 0 };
      if (/SELECT state, code, content FROM state_disclosures/.test(sql))
        return { rows: [{ state: "AZ", code: "MASTER_EF_NOTICES", content: "<p>AZ notice</p>" }, { state: "FL", code: "MASTER_EF_NOTICES", content: "<p>FL</p>" }] };
      if (/SELECT DISTINCT state FROM state_disclosures/.test(sql)) return { rows: (opts.noticeStates ?? []).map((state) => ({ state })) };
      if (/RETURNING id/.test(sql)) return { rows: [{ id: nextId++ }] };
      return { rows: [], rowCount: 0 };
    },
    release: () => {},
  };
  return { pool: { connect: async () => client } as unknown as Pool, queries };
}

describe("installMasterEf2026 run", () => {
  it("scopes the old-template deactivation lookup to organization 1 (M3)", async () => {
    const { pool, queries } = fakePool();
    await installMasterEf2026(pool, content, { log: () => {} });
    const lookup = queries.find((q) => /FROM contract_templates\s+WHERE contract_type/.test(q.sql))!;
    expect(lookup.sql).toMatch(/organization_id = \$3/);
    expect(lookup.params[2]).toBe(1);
  });

  it("says 'would insert' / 'would skip' on a dry run, and rolls back (T9)", async () => {
    const { pool, queries } = fakePool({ noticeStates: ["FL"] });
    const lines: string[] = [];
    await installMasterEf2026(pool, content, { dryRun: true, log: (m) => lines.push(m) });
    expect(lines).toContain("[dry-run]   AZ: would insert");
    expect(lines.some((l) => /^\[dry-run\]   FL: would skip \(/.test(l))).toBe(true);
    expect(lines.some((l) => /: inserted$|: skipped/.test(l))).toBe(false);
    expect(queries.at(-1)?.sql).toBe("ROLLBACK");
  });

  it("says 'inserted' / 'skipped' on a real run", async () => {
    const { pool, queries } = fakePool({ noticeStates: ["FL"] });
    const lines: string[] = [];
    await installMasterEf2026(pool, content, { log: (m) => lines.push(m) });
    expect(lines).toContain("  AZ: inserted");
    expect(lines.some((l) => /^  FL: skipped \(/.test(l))).toBe(true);
    expect(queries.at(-1)?.sql).toBe("COMMIT");
  });
});
