/**
 * Every table holding a draft project's data, in an order that satisfies the
 * foreign keys when rows are deleted top to bottom: project_units reference
 * unit_configurations and properties, and properties and milestones reference
 * phases. Contracts are not here because a project in Draft status has none
 * that are not themselves drafts, and the scrap route deletes those first.
 *
 * server/lib/__tests__/draft-project.test.ts checks this list against the
 * schema, so a new table with a project_id column fails the suite until it is
 * added here.
 */
export const DRAFT_PROJECT_CHILD_TABLES = [
  "project_units",
  "unit_configurations",
  "milestones",
  "properties",
  "phases",
  "clients",
  "project_details",
  "financials",
  "warranty_terms",
  "contractors",
] as const;
