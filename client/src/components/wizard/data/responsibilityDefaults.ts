import type { ResponsibilityItem } from '../WizardContext';

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
