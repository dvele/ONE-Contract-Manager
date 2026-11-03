/**
 * Exhibit C.2's responsibility allocation, and the wizard's starting point for
 * it. Both sides need this list: the wizard seeds a project with it, and
 * server-side C.2 rendering falls back to it for a project that never reached
 * that wizard step — C.5 allocates responsibilities "exclusively as set forth
 * in this Exhibit C", so an unconfigured C.2 is an exclusive allocation to an
 * empty table.
 */

import type { DeliveryModel } from './deliveryModel';

export interface ResponsibilityItem {
  id: string;
  category: string;
  label: string;
  assignedTo: 'company' | 'client_gc';
  note?: string;
}

export interface ResponsibilityCategory {
  name: string;
  items: { id: string; label: string; crcDefault: 'company' | 'client_gc'; cmosDefault: 'company' | 'client_gc' }[];
}

export const RESPONSIBILITY_CATEGORIES: ResponsibilityCategory[] = [
  {
    name: 'Site Preparation & Readiness',
    items: [
      { id: 'site_prep_clearing', label: 'Clearing, grading, excavation, and soil preparation', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'site_prep_foundation', label: 'Foundation work (footings, slab, or crawlspace)', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'site_prep_utilities', label: 'Underground utilities (water, sewer, electric, gas)', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'site_prep_access', label: 'Site access and staging areas for delivery', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'site_prep_compliance', label: 'Zoning, building code, and permit compliance', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'site_prep_temp', label: 'Temporary site facilities (fencing, sanitation, security)', crcDefault: 'client_gc', cmosDefault: 'company' },
    ],
  },
  {
    name: 'Delivery Coordination',
    items: [
      { id: 'delivery_scheduling', label: 'Scheduling delivery appointments per Manufacturer windows', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'delivery_access', label: 'Safe and clear access routes for delivery trucks', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'delivery_crane', label: 'Crane/heavy equipment for unloading and setting modules', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'delivery_traffic', label: 'Traffic control, street closures, neighbor notifications', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'delivery_personnel', label: 'On-site personnel and equipment during delivery', crcDefault: 'client_gc', cmosDefault: 'company' },
    ],
  },
  {
    name: 'Module Installation',
    items: [
      { id: 'install_setting', label: 'Setting and securing modules onto foundation', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'install_mep', label: 'MEP connections between modules and site utilities', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'install_sealing', label: 'Sealing, weatherproofing, and site connections', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'install_inspections', label: 'Coordination with manufacturer for inspections and punch list', crcDefault: 'company', cmosDefault: 'company' },
      { id: 'install_finish', label: 'Finish carpentry and site-specific work', crcDefault: 'client_gc', cmosDefault: 'company' },
    ],
  },
  {
    name: 'Inspections & Approvals',
    items: [
      { id: 'inspect_building', label: 'Building department inspections (foundation, framing, MEP, final)', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'inspect_manufacturer', label: 'Manufacturer/third-party quality control inspections', crcDefault: 'company', cmosDefault: 'company' },
      { id: 'inspect_utility', label: 'Utility connection certification and environmental compliance', crcDefault: 'client_gc', cmosDefault: 'company' },
    ],
  },
  {
    name: 'Site Maintenance & Cleanup',
    items: [
      { id: 'cleanup_debris', label: 'Construction debris and packaging removal', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'cleanup_restoration', label: 'Site restoration and landscaping', crcDefault: 'client_gc', cmosDefault: 'company' },
      { id: 'cleanup_remediation', label: 'Remediation of delivery/installation damage', crcDefault: 'client_gc', cmosDefault: 'company' },
    ],
  },
];

export function getDefaultMatrix(serviceModel: 'CRC' | 'CMOS'): ResponsibilityItem[] {
  const items: ResponsibilityItem[] = [];
  for (const category of RESPONSIBILITY_CATEGORIES) {
    for (const item of category.items) {
      items.push({
        id: item.id,
        category: category.name,
        label: item.label,
        assignedTo: serviceModel === 'CRC' ? item.crcDefault : item.cmosDefault,
      });
    }
  }
  return items;
}

export type C2Assignee = 'company' | 'client_gc';

export interface C2WorkCategory {
  id: string;
  label: string;
  note: string;
  defaults: Record<DeliveryModel, C2Assignee>;
}

/**
 * The Work Categories of the Master EF 2026 agreement's C.2, verbatim. The
 * defaults follow its preamble: under FOB Dvele fabricates only; under
 * Delivered to Site it adds transport and the crane/set; under Dvele GC it does
 * everything. Kept apart from RESPONSIBILITY_CATEGORIES, which older exhibits
 * still render.
 */
export const C2_WORK_CATEGORIES: readonly C2WorkCategory[] = [
  { id: 'factory_fabrication', label: 'Factory fabrication', note: 'Per Exhibit B', defaults: { FOB: 'company', CRC: 'company', CMOS: 'company' } },
  { id: 'transport_coordination', label: 'Transport coordination', note: 'Per Exhibit A', defaults: { FOB: 'client_gc', CRC: 'company', CMOS: 'company' } },
  { id: 'transport_cost', label: 'Transport cost', note: 'Per Exhibit A', defaults: { FOB: 'client_gc', CRC: 'company', CMOS: 'company' } },
  { id: 'route_surveys', label: 'Route surveys / escorts', note: 'As required', defaults: { FOB: 'client_gc', CRC: 'company', CMOS: 'company' } },
  { id: 'crane_rigging', label: 'Crane / rigging', note: 'Define in Exhibit A', defaults: { FOB: 'client_gc', CRC: 'company', CMOS: 'company' } },
  { id: 'site_access', label: 'Site access & staging', note: 'Must meet delivery specs', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'clearing_grading', label: 'Clearing / grading', note: '', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'foundation', label: 'Foundation / footings / slab', note: 'Must meet Dvele tolerances', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'utility_stubs', label: 'Utility stubs (water/sewer/power/gas)', note: 'Stub locations per drawings', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'set_placement', label: 'Set / placement on foundation', note: 'If Dvele model, Dvele manages via sub', defaults: { FOB: 'client_gc', CRC: 'company', CMOS: 'company' } },
  { id: 'stitching_sealing', label: 'Stitching / sealing / weatherproofing', note: 'Allocate clearly', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'mep_reconnections', label: 'MEP reconnections', note: 'Allocate clearly', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'interior_finish', label: 'Interior finish out (site)', note: 'Allocate clearly', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'exterior_tieins', label: 'Exterior tie-ins / decks / stairs', note: 'Allocate clearly', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'inspections_scheduling', label: 'Inspections scheduling', note: '', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'co_equivalent', label: 'CO/Equivalent responsibility', note: 'Election in Exhibit A', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'site_safety', label: 'Site safety and security', note: '', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'debris_cleanup', label: 'Debris removal / cleanup', note: '', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
  { id: 'damage_remediation', label: 'Damage remediation from delivery activities', note: 'Allocate', defaults: { FOB: 'client_gc', CRC: 'client_gc', CMOS: 'company' } },
];

export function getC2DefaultMatrix(model: DeliveryModel): ResponsibilityItem[] {
  return C2_WORK_CATEGORIES.map((c) => ({
    id: c.id,
    category: 'C.2',
    label: c.label,
    assignedTo: c.defaults[model],
    note: c.note,
  }));
}

/** A stored matrix saved against the old list must not be mixed with this one. */
export function isC2Matrix(items: ResponsibilityItem[]): boolean {
  const ids = new Set(C2_WORK_CATEGORIES.map((c) => c.id));
  return items.every((i) => ids.has(i.id));
}

/**
 * The two matrices `project_details.responsibility_matrix` can hold: the old
 * agreement's list (RESPONSIBILITY_CATEGORIES) and the 2026 agreement's C.2.
 * A project issued on the old agreement keeps its old matrix while the wizard
 * edits the new one, so neither overwrites the other.
 */
export interface StoredMatrix {
  legacy: ResponsibilityItem[] | null;
  c2: ResponsibilityItem[] | null;
}

/** A non-empty array of objects with a string id, or null. */
function itemArray(value: unknown): ResponsibilityItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ok = value.every(
    (i) => typeof i === 'object' && i !== null && typeof (i as { id?: unknown }).id === 'string',
  );
  return ok ? (value as ResponsibilityItem[]) : null;
}

/**
 * Reads the stored text, which is either a bare array (the format before the
 * 2026 agreement, holding one list) or `{ c2, legacy? }`. A bare array of C.2
 * ids is C.2; any other bare array is legacy. Malformed JSON or items give
 * null. Never throws: an unreadable value falls back to the defaults.
 */
export function parseStoredMatrix(raw: string | null | undefined): StoredMatrix {
  const none: StoredMatrix = { legacy: null, c2: null };
  if (!raw) return none;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return none;
  }
  const classify = (value: unknown) => {
    const items = itemArray(value);
    if (!items) return { c2: null, legacy: null };
    return isC2Matrix(items) ? { c2: items, legacy: null } : { c2: null, legacy: items };
  };
  if (Array.isArray(parsed)) return classify(parsed);
  if (typeof parsed !== 'object' || parsed === null) return none;
  const obj = parsed as { c2?: unknown; legacy?: unknown };
  return { c2: classify(obj.c2).c2, legacy: classify(obj.legacy).legacy };
}

/** Always writes the object form; null when there is nothing to keep. */
export function serializeStoredMatrix(
  c2: ResponsibilityItem[],
  legacy: ResponsibilityItem[] | null,
): string | null {
  if (c2.length === 0 && !legacy) return null;
  return JSON.stringify(legacy ? { c2, legacy } : { c2 });
}
