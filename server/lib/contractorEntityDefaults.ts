/**
 * Project contractors are picked in the wizard from the master contractor list
 * (`contractor_entities`), but the wizard only sends the name, address and the
 * entity's id. The project row has no column for that id, so the license and
 * contact details were never copied — every Dvele GC agreement printed a blank
 * GC Affiliate "License No.". Filling them here fixes every save path at once.
 *
 * A value the request carries always wins; only missing or empty fields are
 * taken from the entity.
 */
export const ENTITY_COPIED_FIELDS = [
  "entityType",
  "state",
  "address",
  "city",
  "stateAddress",
  "zip",
  "licenseNumber",
  "licenseState",
  "licenseExpiration",
  "contactName",
  "contactEmail",
  "contactPhone",
  "bondAmount",
  "insuranceAmount",
  "insuranceExpiration",
  "insuranceCarrier",
] as const;

type EntityRow = Partial<Record<(typeof ENTITY_COPIED_FIELDS)[number], unknown>>;

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function withContractorEntityDefaults<T extends Record<string, unknown>>(
  fields: T,
  entity: EntityRow | null
): T {
  if (!entity) return fields;
  const filled: Record<string, unknown> = { ...fields };
  for (const key of ENTITY_COPIED_FIELDS) {
    if (isMissing(filled[key]) && !isMissing(entity[key])) {
      filled[key] = entity[key];
    }
  }
  return filled as T;
}
