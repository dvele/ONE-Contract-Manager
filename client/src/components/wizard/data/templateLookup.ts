/** Thrown when no active template exists for a contract type; generation aborts. */
export class NoActiveTemplateError extends Error {
  constructor(contractType: string) {
    super(
      `No active contract template for ${contractType}. Activate one under Admin → Contract Templates, then generate again.`,
    );
    this.name = 'NoActiveTemplateError';
  }
}

/**
 * The active template id for a contract type, from GET /api/contract-templates
 * (active rows only), falling back to the active MASTER_EF template. Never a
 * hard-coded id: that named the old template after it was deactivated.
 */
export function activeTemplateId(
  templates: Array<{ id?: number; contract_type?: string }>,
  contractType: string,
): number {
  const byType = new Map<string, number>();
  for (const t of templates) {
    if (t.contract_type && t.id) byType.set(t.contract_type.toUpperCase(), t.id);
  }
  const id = byType.get(contractType.toUpperCase()) ?? byType.get('MASTER_EF');
  if (!id) throw new NoActiveTemplateError(contractType);
  return id;
}
