import type { Pool } from "pg";
import {
  EXHIBIT_G_CONTENT_CODE,
  MASTER_EF_2026_CONTRACT_TYPE,
  MASTER_EF_2026_LLC_NAME,
  MASTER_EF_2026_NOTICES_CODE,
  MASTER_EF_2026_ORG_ID,
  MASTER_EF_2026_TEMPLATE_NAME,
  MASTER_EF_NOTICES_CODE,
  planMasterEf2026Install,
  type InstallPlan,
  type MasterEf2026Content,
  type StateSource,
} from "../../server/lib/masterEf2026Install";

const ORG = MASTER_EF_2026_ORG_ID;
const JSON_MASTER_EF = JSON.stringify([MASTER_EF_2026_CONTRACT_TYPE]);

/**
 * Loads the existing-state facts, plans, and applies the plan in ONE transaction.
 * dryRun rolls the transaction back. Does not end the pool.
 */
export async function installMasterEf2026(
  pool: Pool,
  content: MasterEf2026Content,
  { dryRun = false, log = console.log }: { dryRun?: boolean; log?: (msg: string) => void } = {},
): Promise<InstallPlan> {
  const client = await pool.connect();
  const tag = dryRun ? "[dry-run] " : "";
  try {
    await client.query("BEGIN");

    const { rows: [tpl] } = await client.query(
      `SELECT id FROM contract_templates WHERE name = $1 AND organization_id = $2 ORDER BY id LIMIT 1`,
      [MASTER_EF_2026_TEMPLATE_NAME, ORG],
    );
    const { rows: old } = await client.query(
      `SELECT id FROM contract_templates
       WHERE contract_type = $1 AND is_active = true AND name <> $2 ORDER BY id`,
      [MASTER_EF_2026_CONTRACT_TYPE, MASTER_EF_2026_TEMPLATE_NAME],
    );
    const { rowCount: llcCount } = await client.query(
      `SELECT 1 FROM llcs WHERE name = $1 AND organization_id = $2`,
      [MASTER_EF_2026_LLC_NAME, ORG],
    );
    const { rows: sourceRows } = await client.query(
      `SELECT state, code, content FROM state_disclosures
       WHERE organization_id = $1 AND is_active = true AND code = ANY($2::text[])
       ORDER BY state, id`,
      [ORG, [MASTER_EF_NOTICES_CODE, EXHIBIT_G_CONTENT_CODE]],
    );
    const { rows: haveRows } = await client.query(
      `SELECT DISTINCT state FROM state_disclosures WHERE organization_id = $1 AND code = $2`,
      [ORG, MASTER_EF_2026_NOTICES_CODE],
    );

    const byState = new Map<string, StateSource>();
    for (const row of sourceRows) {
      const src = byState.get(row.state) ?? { state: row.state, notices: null, exhibitG: null };
      // First row per state and code wins (ordered by id).
      if (row.code === MASTER_EF_NOTICES_CODE) src.notices ??= row.content;
      else src.exhibitG ??= row.content;
      byState.set(row.state, src);
    }

    const plan = planMasterEf2026Install(content, {
      templateId: tpl?.id ?? null,
      oldTemplateIds: old.map((r) => r.id),
      llcExists: (llcCount ?? 0) > 0,
      stateSources: [...byState.values()],
      existingNoticeStates: haveRows.map((r) => r.state),
    });

    if (tpl) {
      log(`${tag}"${MASTER_EF_2026_TEMPLATE_NAME}" already installed (template ${tpl.id}); no template, clause, exhibit or LLC writes`);
    }
    log(
      `${tag}plan: ${plan.template ? 1 : 0} template, ${plan.clauses.length} clauses, ${plan.clauses.length} clause links, ` +
        `${plan.exhibits.length} exhibits, ${plan.exhibits.length} exhibit links, ${plan.llc ? 1 : 0} LLC, ` +
        `${plan.deactivateTemplateIds.length} template(s) to deactivate [${plan.deactivateTemplateIds.join(", ")}], ` +
        `${plan.disclosures.filter((d) => d.action === "insert").length} disclosure insert(s), ` +
        `${plan.disclosures.filter((d) => d.action === "skip").length} skipped`,
    );

    if (plan.template) {
      const t = plan.template;
      const { rows: [created] } = await client.query(
        `INSERT INTO contract_templates (name, display_name, contract_type, version, status, is_active, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [t.name, t.displayName, t.contractType, t.version, t.status, t.isActive, t.organizationId],
      );
      const templateId: number = created.id;

      if (plan.deactivateTemplateIds.length > 0) {
        await client.query(
          `UPDATE contract_templates SET is_active = false, updated_at = now() WHERE id = ANY($1::int[])`,
          [plan.deactivateTemplateIds],
        );
      }

      const idBySlug = new Map<string, number>();
      for (const c of plan.clauses) {
        const { rows: [row] } = await client.query(
          `INSERT INTO clauses (slug, header_text, body_html, level, parent_id, "order", contract_types, organization_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) RETURNING id`,
          [c.slug, c.headerText, c.bodyHtml, c.level, c.parentSlug ? idBySlug.get(c.parentSlug) : null, c.order, JSON_MASTER_EF, ORG],
        );
        idBySlug.set(c.slug, row.id);
        await client.query(
          `INSERT INTO template_clauses (template_id, clause_id, order_index, organization_id) VALUES ($1, $2, $3, $4)`,
          [templateId, row.id, c.orderIndex, ORG],
        );
      }

      for (const e of plan.exhibits) {
        const { rows: [row] } = await client.query(
          `INSERT INTO exhibits (letter, title, content, contract_types, sort_order, is_active, organization_id)
           VALUES ($1, $2, $3, $4::jsonb, $5, true, $6) RETURNING id`,
          [e.letter, e.title, e.content, JSON_MASTER_EF, e.sortOrder, ORG],
        );
        await client.query(
          `INSERT INTO template_exhibits (template_id, exhibit_id, order_index, organization_id) VALUES ($1, $2, $3, $4)`,
          [templateId, row.id, e.sortOrder, ORG],
        );
      }
    }

    if (plan.llc) {
      await client.query(
        `INSERT INTO llcs (name, state_of_formation, entity_type, status, organization_id) VALUES ($1, $2, $3, $4, $5)`,
        [plan.llc.name, plan.llc.stateOfFormation, plan.llc.entityType, plan.llc.status, plan.llc.organizationId],
      );
    }

    log(`${tag}${MASTER_EF_2026_NOTICES_CODE} by state:`);
    for (const d of plan.disclosures) {
      if (d.action === "insert") {
        await client.query(
          `INSERT INTO state_disclosures (code, state, content, is_active, organization_id) VALUES ($1, $2, $3, true, $4)`,
          [MASTER_EF_2026_NOTICES_CODE, d.state, d.content, ORG],
        );
        log(`${tag}  ${d.state}: inserted`);
      } else {
        log(`${tag}  ${d.state}: skipped (${d.reason})`);
      }
    }

    await client.query(dryRun ? "ROLLBACK" : "COMMIT");
    if (dryRun) log("[dry-run] rolled back");
    return plan;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
