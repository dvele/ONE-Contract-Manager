import { pool } from "../db";

/**
 * Guards shared by every route that attaches a project unit to a property.
 *
 * Both `POST /api/project-units` and the wizard's `POST /api/projects/:projectId/units`
 * import these, so the organization/project check and the one-home-one-ADU rule
 * cannot drift apart between the two entry points.
 */

export const UNIT_ROLES = ["home", "adu"] as const;
export type UnitRole = (typeof UNIT_ROLES)[number];

export function isUnitRole(value: unknown): value is UnitRole {
  return typeof value === "string" && (UNIT_ROLES as readonly string[]).includes(value);
}

/**
 * A property holds at most one home and one ADU. Returns an error message when
 * the requested role is already taken, or null when the attachment is allowed.
 *
 * @param excludeUnitId - unit being updated, so it does not conflict with itself
 */
export async function roleConflict(
  propertyId: number,
  unitRole: UnitRole,
  excludeUnitId: number | null,
): Promise<string | null> {
  const result = await pool.query(
    `SELECT id FROM project_units
     WHERE property_id = $1 AND unit_role = $2 AND ($3::int IS NULL OR id <> $3)`,
    [propertyId, unitRole, excludeUnitId],
  );
  return result.rows.length > 0
    ? `This property already has a ${unitRole}`
    : null;
}

/**
 * A unit may only attach to a property in its own project and organization.
 * Returns false when the property is missing, belongs to another organization,
 * or belongs to a different project.
 */
export async function propertyAccessible(
  propertyId: number,
  organizationId: number,
  projectId: number,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM properties WHERE id = $1 AND organization_id = $2 AND project_id = $3`,
    [propertyId, organizationId, projectId],
  );
  return result.rows.length > 0;
}

/** Postgres unique_violation, raised by the (property_id, unit_role) constraint. */
export const UNIQUE_VIOLATION = "23505";

export interface ConfigurationRow {
  id: number;
  name: string;
  sq_ft: number;
  price_per_sq_ft_low: number;
  price_per_sq_ft_high: number;
  derived_offsite_price: number;
}

/**
 * A unit may only be priced from a configuration in its own project and
 * organization. Returns the row — whose `derived_offsite_price` is the only
 * authoritative price for such a unit — or null when it does not resolve.
 */
export async function configurationForProject(
  configurationId: number,
  organizationId: number,
  projectId: number,
): Promise<ConfigurationRow | null> {
  const result = await pool.query(
    `SELECT id, name, sq_ft, price_per_sq_ft_low, price_per_sq_ft_high, derived_offsite_price
     FROM unit_configurations
     WHERE id = $1 AND organization_id = $2 AND project_id = $3`,
    [configurationId, organizationId, projectId],
  );
  return result.rows.length > 0 ? (result.rows[0] as ConfigurationRow) : null;
}

/**
 * A unit is priced from exactly one source: a catalog model or an unpriced
 * configuration. Returns an error message when neither or both are supplied.
 */
export function pricingSourceError(
  modelId: unknown,
  configurationId: unknown,
): string | null {
  const hasModel = modelId !== undefined && modelId !== null;
  const hasConfiguration = configurationId !== undefined && configurationId !== null;
  if (hasModel === hasConfiguration) {
    return "Provide exactly one of modelId or configurationId";
  }
  return null;
}
