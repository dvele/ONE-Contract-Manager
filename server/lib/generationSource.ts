import { pool } from "../db";
import type { Clause } from "./contractGenerator";

/**
 * Where a generation's clauses and exhibits come from. A saved contract keeps
 * the template it was issued on and its own clause snapshot, so downloading,
 * exporting or previewing an issued contract never picks up a newer template.
 */
export interface GenerationSource {
  templateId?: number;
  snapshotClauses?: Clause[];
}

/** A request that names a contract which cannot be used; the route maps it to 4xx. */
export class GenerationSourceError extends Error {
  constructor(public readonly status: 400 | 404, message: string) {
    super(message);
    this.name = "GenerationSourceError";
  }
}

/**
 * The active template for a contract type. Exhibits are fetched via the
 * template_exhibits junction keyed by templateId, so a generation without one
 * silently omits every exhibit. There is one active template per contract_type.
 */
export async function resolveActiveTemplateId(contractType: string): Promise<number | undefined> {
  const r = await pool.query(
    `SELECT id FROM contract_templates
     WHERE contract_type = $1 AND is_active = true
     ORDER BY id DESC LIMIT 1`,
    [contractType],
  );
  const id = r.rows[0]?.id as number | undefined;
  if (!id) {
    console.warn(
      `⚠️ No active contract_template for contractType "${contractType}" — exhibits will be omitted`,
    );
  }
  return id;
}

/**
 * A saved contract's contract_clauses snapshot, shaped for generateContract,
 * or undefined when the contract has none.
 */
export async function loadClauseSnapshot(contractId: number): Promise<Clause[] | undefined> {
  const snapshotResult = await pool.query(
    `SELECT cc.clause_id AS id, c.slug AS clause_code, cc.header_text AS name,
            cc.body_html AS content, c.contract_types, cc.level AS hierarchy_level,
            cc."order" AS sort_order, c.tags, c.parent_id AS parent_clause_id
     FROM contract_clauses cc
     LEFT JOIN clauses c ON c.id = cc.clause_id
     WHERE cc.contract_id = $1
     ORDER BY cc."order" ASC`,
    [contractId],
  );
  if (snapshotResult.rows.length === 0) return undefined;

  // Field values are exactly what draft-preview built before this was shared.
  const snapshot: Clause[] = snapshotResult.rows.map((r: any): any => ({
    id: r.id,
    clause_code: r.clause_code || '',
    name: r.name || '',
    content: r.content || '',
    contract_type: Array.isArray(r.contract_types) ? r.contract_types[0] : r.contract_types,
    hierarchy_level: r.hierarchy_level,
    sort_order: r.sort_order,
    // Restore hierarchy from the live clause's parent_id so buildBlockTree nests
    // the snapshot the same way the PDF path does. The contract_clauses snapshot
    // table doesn't store parent_clause_id; without this the tree is flat and
    // applyMasterEFNumbering numbers every clause as a top-level section
    // (5) 6) 7)… instead of 1) / a. / i.).
    parent_clause_id: r.parent_clause_id ?? null,
    conditions: null,
    block_type: null,
    disclosure_code: null,
    category: '',
    variables_used: [],
    service_model_condition: null,
  }));
  console.log(`📄 Using clause snapshot (${snapshot.length} clauses) from contract ${contractId}`);
  return snapshot;
}

async function fromSavedContract(row: { id: number; template_id: number | null }): Promise<GenerationSource> {
  return {
    templateId: row.template_id ?? undefined,
    snapshotClauses: await loadClauseSnapshot(row.id),
  };
}

/**
 * Resolve the template and clause snapshot for a generation, in this order:
 *   1. contractId — that saved contract's template and snapshot;
 *   2. an explicit templateId — that template's live playlist, no snapshot;
 *   3. the project's most recent saved contract of this type — its template and snapshot;
 *   4. the active template for the contract type — its live playlist, no snapshot.
 * download-pdf, download-all-zip, export-google-doc and draft-preview all use it,
 * so the same request resolves identically on every path.
 */
export async function resolveGenerationSource(req: {
  contractId?: number;
  projectId: number;
  contractType: string;
  templateId?: number;
}): Promise<GenerationSource> {
  const { contractId, projectId, contractType, templateId } = req;

  if (contractId) {
    // contracts.organization_id is nullable (unset at INSERT), so the contract
    // is keyed by id and checked against the request's project instead.
    const r = await pool.query(
      `SELECT id, template_id, project_id FROM contracts
       WHERE id = $1`,
      [contractId],
    );
    const row = r.rows[0];
    if (!row) throw new GenerationSourceError(404, `Contract ${contractId} not found`);
    if (Number(row.project_id) !== Number(projectId)) {
      throw new GenerationSourceError(400, `Contract ${contractId} does not belong to project ${projectId}`);
    }
    return fromSavedContract(row);
  }

  if (templateId) return { templateId };

  const saved = await pool.query(
    `SELECT id, template_id FROM contracts
     WHERE project_id = $1 AND UPPER(contract_type) = UPPER($2)
     ORDER BY generated_at DESC LIMIT 1`,
    [projectId, contractType],
  );
  if (saved.rows.length > 0) return fromSavedContract(saved.rows[0]);

  return { templateId: await resolveActiveTemplateId(contractType) };
}

