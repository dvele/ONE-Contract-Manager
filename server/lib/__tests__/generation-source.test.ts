import { describe, it, expect, vi, beforeEach } from "vitest";

// Each query is answered by the first handler whose pattern matches its SQL.
type Handler = { match: RegExp; rows: (params: any[]) => any[] };
let handlers: Handler[] = [];
const calls: Array<{ sql: string; params: any[] }> = [];

vi.mock("../../db", () => ({
  pool: {
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      const h = handlers.find((x) => x.match.test(sql));
      return { rows: h ? h.rows(params) : [] };
    },
  },
}));

const { resolveGenerationSource, GenerationSourceError } = await import("../generationSource");
const { generateContract, EmptyTemplateError } = await import("../contractGenerator");

const CONTRACTS = [
  { id: 6, project_id: 49, contract_type: "master_ef", template_id: 26 },
  { id: 7, project_id: 49, contract_type: "master_ef", template_id: 28 },
];
const SNAPSHOT_ROWS: Record<number, any[]> = {
  6: [
    { id: 101, clause_code: "MASTER_EF_PREAMBLE", name: "Preamble", content: "<p>old</p>", contract_types: ["MASTER_EF"], hierarchy_level: 1, sort_order: 0, tags: null, parent_clause_id: null },
    { id: 102, clause_code: null, name: null, content: null, contract_types: "MASTER_EF", hierarchy_level: 2, sort_order: 1, tags: null, parent_clause_id: 101 },
  ],
  7: [],
};

function installDb(opts: { latestForProject?: number | null; activeTemplate?: number | null } = {}) {
  handlers = [
    { match: /FROM contracts\s+WHERE id = \$1/, rows: ([id]) => CONTRACTS.filter((c) => c.id === id) },
    {
      match: /FROM contracts\s+WHERE project_id = \$1/,
      rows: () => (opts.latestForProject ? CONTRACTS.filter((c) => c.id === opts.latestForProject) : []),
    },
    { match: /FROM contract_clauses cc/, rows: ([id]) => SNAPSHOT_ROWS[id] ?? [] },
    {
      match: /FROM contract_templates/,
      rows: () => (opts.activeTemplate ? [{ id: opts.activeTemplate }] : []),
    },
  ];
}

beforeEach(() => {
  calls.length = 0;
  installDb();
});

describe("resolveGenerationSource", () => {
  it("1. a contractId uses that contract's template and its clause snapshot", async () => {
    installDb({ latestForProject: 7, activeTemplate: 28 });
    const src = await resolveGenerationSource({ contractId: 6, projectId: 49, contractType: "MASTER_EF" });
    expect(src.templateId).toBe(26);
    expect(src.snapshotClauses).toHaveLength(2);
    expect(src.snapshotClauses![0]).toMatchObject({
      id: 101, clause_code: "MASTER_EF_PREAMBLE", name: "Preamble", content: "<p>old</p>",
      contract_type: "MASTER_EF", hierarchy_level: 1, sort_order: 0, parent_clause_id: null,
    });
    // Nulls become the generator's empty defaults; a scalar contract_types passes through.
    expect(src.snapshotClauses![1]).toMatchObject({
      clause_code: "", name: "", content: "", contract_type: "MASTER_EF", parent_clause_id: 101,
    });
    expect(calls.some((c) => /FROM contract_templates/.test(c.sql))).toBe(false);
  });

  it("1. a contractId wins over an explicit templateId", async () => {
    const src = await resolveGenerationSource({ contractId: 6, projectId: 49, contractType: "MASTER_EF", templateId: 28 });
    expect(src.templateId).toBe(26);
  });

  it("1. a contract with no snapshot rows keeps its template and has no snapshot", async () => {
    const src = await resolveGenerationSource({ contractId: 7, projectId: 49, contractType: "MASTER_EF" });
    expect(src).toEqual({ templateId: 28, snapshotClauses: undefined });
  });

  it("1. an unknown contractId is a 404", async () => {
    await expect(resolveGenerationSource({ contractId: 999, projectId: 49, contractType: "MASTER_EF" }))
      .rejects.toMatchObject({ status: 404 });
  });

  it("1. a contract from another project is a 400", async () => {
    const err = await resolveGenerationSource({ contractId: 6, projectId: 50, contractType: "MASTER_EF" }).catch((e) => e);
    expect(err).toBeInstanceOf(GenerationSourceError);
    expect(err.status).toBe(400);
  });

  it("2. an explicit templateId is used as is, with no snapshot", async () => {
    installDb({ latestForProject: 6, activeTemplate: 28 });
    const src = await resolveGenerationSource({ projectId: 49, contractType: "MASTER_EF", templateId: 24 });
    expect(src).toEqual({ templateId: 24 });
    expect(calls).toHaveLength(0);
  });

  it("3. without either, the project's latest saved contract supplies template and snapshot", async () => {
    installDb({ latestForProject: 6, activeTemplate: 28 });
    const src = await resolveGenerationSource({ projectId: 49, contractType: "MASTER_EF" });
    expect(src.templateId).toBe(26);
    expect(src.snapshotClauses).toHaveLength(2);
    const lookup = calls.find((c) => /WHERE project_id = \$1/.test(c.sql))!;
    expect(lookup.sql).toContain("UPPER(contract_type) = UPPER($2)");
    expect(lookup.sql).toContain("ORDER BY generated_at DESC LIMIT 1");
    expect(lookup.params).toEqual([49, "MASTER_EF"]);
  });

  it("4. with no saved contract, falls back to the active template, with no snapshot", async () => {
    installDb({ latestForProject: null, activeTemplate: 28 });
    const src = await resolveGenerationSource({ projectId: 49, contractType: "MASTER_EF" });
    expect(src).toEqual({ templateId: 28 });
    const active = calls.find((c) => /FROM contract_templates/.test(c.sql))!;
    expect(active.sql).toContain("is_active = true");
    expect(active.params).toEqual(["MASTER_EF"]);
  });

  it("4. with no saved contract and no active template, templateId is undefined", async () => {
    installDb({ latestForProject: null, activeTemplate: null });
    const src = await resolveGenerationSource({ projectId: 49, contractType: "MASTER_EF" });
    expect(src).toEqual({ templateId: undefined });
  });
});

describe("generateContract with an empty template playlist (Ruling 30)", () => {
  it("throws EmptyTemplateError instead of producing a clause-less agreement", async () => {
    handlers = [{ match: /FROM template_clauses tc/, rows: () => [] }];
    const err = await generateContract({ contractType: "MASTER_EF", projectData: {}, format: "html", templateId: 99 }).catch((e) => e);
    expect(err).toBeInstanceOf(EmptyTemplateError);
    expect(err.message).toMatch(/Template is empty/);
    expect(err.templateId).toBe(99);
  });

  it("does not throw on an empty contract_types match (no templateId), as before", async () => {
    handlers = [];
    const err = await generateContract({ contractType: "MASTER_EF", projectData: {}, format: "html" }).catch((e) => e);
    expect(err).not.toBeInstanceOf(EmptyTemplateError);
  });
});
