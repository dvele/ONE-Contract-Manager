import { describe, it, expect, vi } from "vitest";

// contractGenerator imports the DB pool, which throws without DATABASE_URL.
vi.mock("../../db", () => ({ pool: {} }));

const { buildClauseFetchQuery } = await import("../contractGenerator");

describe("buildClauseFetchQuery", () => {
  it("selects through template_clauses in template order when a templateId is given", () => {
    const { sql, params } = buildClauseFetchQuery(28, "MASTER_EF");
    expect(sql).toContain("FROM template_clauses tc");
    expect(sql).toContain("JOIN clauses c ON c.id = tc.clause_id");
    expect(sql).toContain("tc.template_id = $1");
    expect(sql).toContain("ORDER BY tc.order_index ASC");
    expect(sql).not.toContain("contract_types @>");
    expect(params).toEqual([28]);
  });

  it("exposes order_index as the sort key so the generator's final sort keeps template order", () => {
    const { sql } = buildClauseFetchQuery(28, "MASTER_EF");
    expect(sql).toContain('tc.order_index AS "order"');
  });

  it("selects the same columns the row mapping reads", () => {
    const { sql } = buildClauseFetchQuery(28, "MASTER_EF");
    for (const col of ["c.id", "c.slug", "c.parent_id", "c.level", "c.header_text", "c.body_html", "c.contract_types", "c.tags"]) {
      expect(sql, col).toContain(col);
    }
  });

  it("falls back to the contract_types query, unchanged, without a templateId", () => {
    const { sql, params } = buildClauseFetchQuery(undefined, "MASTER_EF");
    expect(sql).toBe(
      `SELECT id, slug, parent_id, level, "order", header_text, body_html, contract_types, tags
       FROM clauses
       WHERE contract_types @> $1::jsonb
       ORDER BY "order", slug`
    );
    expect(params).toEqual([JSON.stringify(["MASTER_EF"])]);
  });
});
