/**
 * Table Generators for Contract PDF Generation
 * Generates HTML tables with inline styles for PDF compatibility
 * 
 * Contract Type Filtering:
 * - MANUFACTURING: Shows only Offsite/Manufacturing costs
 * - ONSITE: Shows only Onsite/Shipping/Installation costs
 * - ONE: Shows full master budget (all costs)
 */

import { buildStyledTable, TABLE_STYLES, type StyledRow } from './tableStyles';

export type ContractFilterType = 'ONE' | 'MANUFACTURING' | 'ONSITE' | 'MASTER_EF';

interface PricingBreakdown {
  totalDesignFee: number;
  totalOffsite: number;
  totalOnsite: number;
  totalCustomizations?: number;
  totalShipping?: number;
  totalInstallation?: number;
}

interface PricingSummary {
  breakdown: PricingBreakdown;
  grandTotal: number;
  projectBudget: number;
  contractValue: number;
  serviceModel?: string;
}

interface PaymentMilestone {
  name: string;
  percentage: number;
  amount: number;
  phase?: string;
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return formatCurrencyWhole(dollars);
}

function formatCurrencyWhole(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
}

function formatCurrencyFromDollars(dollars: number | string): string {
  return formatCurrencyWhole(dollars);
}

/**
 * Generates an HTML table showing pricing breakdown
 * Includes Design Fee, Offsite Manufacturing, Onsite Services (if applicable), and Grand Total
 * 
 * Contract type filtering:
 * - ONE: Shows full master budget (design + offsite + onsite)
 * - MANUFACTURING: Shows only manufacturing costs (design fee + offsite/manufacturing)
 * - ONSITE: Shows only onsite costs (onsite services + shipping + installation)
 */
export function generatePricingTableHtml(
  pricingSummary: PricingSummary | null, 
  contractType: ContractFilterType = 'ONE'
): string {
  if (!pricingSummary) {
    return 'No pricing data found.';
  }

  const { breakdown, contractValue, serviceModel } = pricingSummary;
  const isCMOS = serviceModel === 'CMOS';
  
  let filteredContractTotal = contractValue;
  if (contractType === 'MANUFACTURING') {
    // Customizations are rendered as a row below, so they belong in this total.
    filteredContractTotal = breakdown.totalDesignFee + breakdown.totalOffsite +
      (breakdown.totalCustomizations || 0);
  } else if (contractType === 'ONSITE') {
    filteredContractTotal = breakdown.totalOnsite +
      (breakdown.totalShipping || 0) +
      (breakdown.totalInstallation || 0);
  }

  const rows: { cells: string[]; isBold?: boolean; isTotal?: boolean }[] = [];
  
  if (contractType === 'ONE' || contractType === 'MANUFACTURING') {
    rows.push({ cells: ['Design Fee', formatCurrency(breakdown.totalDesignFee)] });
  }
  
  if (contractType === 'ONE' || contractType === 'MANUFACTURING') {
    rows.push({ cells: ['Offsite (Manufacturing)', formatCurrency(breakdown.totalOffsite)] });
  }

  if ((contractType === 'ONE' || contractType === 'MANUFACTURING') && 
      breakdown.totalCustomizations && breakdown.totalCustomizations > 0) {
    rows.push({ cells: ['Customizations', formatCurrency(breakdown.totalCustomizations)] });
  }
  
  if ((contractType === 'ONE' && isCMOS && breakdown.totalOnsite > 0) ||
      contractType === 'ONSITE') {
    rows.push({ cells: ['Onsite Services', formatCurrency(breakdown.totalOnsite)] });
  }

  // contractValue carries shipping under every model, so a table without this
  // row is one line item short of the total printed beneath it.
  if ((contractType === 'ONE' || contractType === 'ONSITE') &&
      breakdown.totalShipping && breakdown.totalShipping > 0) {
    rows.push({ cells: ['Shipping', formatCurrency(breakdown.totalShipping)] });
  }

  if (contractType === 'ONSITE') {
    if (breakdown.totalInstallation && breakdown.totalInstallation > 0) {
      rows.push({ cells: ['Installation', formatCurrency(breakdown.totalInstallation)] });
    }
  }

  const totalLabel = contractType === 'ONE' ? 'Contract Total' : 
    contractType === 'MANUFACTURING' ? 'Manufacturing Contract Total' : 'Onsite Contract Total';

  rows.push({ cells: [totalLabel, formatCurrency(filteredContractTotal)], isBold: true, isTotal: true });

  return buildStyledTable({
    columns: [
      { header: 'Item', align: 'left' },
      { header: 'Cost', align: 'right' },
    ],
    rows,
  });
}

/**
 * Generates an HTML table showing payment schedule milestones
 * Shows Phase, Percentage, and Amount for each milestone
 * 
 * Contract type filtering:
 * - ONE: Shows all payment milestones
 * - MANUFACTURING: Shows only manufacturing phase milestones (Design, Production)
 * - ONSITE: Shows only onsite phase milestones (Onsite, Delivery, Completion)
 */
export function generatePaymentScheduleHtml(
  paymentSchedule: PaymentMilestone[] | null,
  contractType: ContractFilterType = 'ONE',
  filteredContractTotal?: number
): string {
  if (!paymentSchedule || paymentSchedule.length === 0) {
    return 'No payment schedule data found.';
  }
  
  let filteredMilestones = paymentSchedule;
  
  if (contractType === 'MANUFACTURING') {
    filteredMilestones = paymentSchedule.filter(m => {
      const phase = (m.phase || '').toLowerCase();
      const name = (m.name || '').toLowerCase();
      return phase.includes('design') || 
             phase.includes('production') || 
             name.includes('deposit') ||
             name.includes('green light') ||
             name.includes('production');
    });
  } else if (contractType === 'ONSITE') {
    filteredMilestones = paymentSchedule.filter(m => {
      const phase = (m.phase || '').toLowerCase();
      const name = (m.name || '').toLowerCase();
      return phase.includes('onsite') || 
             phase.includes('delivery') || 
             phase.includes('completion') ||
             name.includes('delivery') ||
             name.includes('retainage') ||
             name.includes('completion');
    });
  }
  
  if (filteredContractTotal && filteredContractTotal > 0 && filteredMilestones.length > 0) {
    const totalPercentage = filteredMilestones.reduce((sum, m) => sum + m.percentage, 0);
    if (totalPercentage > 0) {
      filteredMilestones = filteredMilestones.map(m => ({
        ...m,
        amount: Math.round((filteredContractTotal * m.percentage) / totalPercentage)
      }));
    }
  }

  const rows: { cells: string[]; isBold?: boolean; isTotal?: boolean }[] = filteredMilestones.map(milestone => ({
    cells: [milestone.name, `${milestone.percentage}%`, formatCurrency(milestone.amount)],
  }));

  const total = filteredMilestones.reduce((sum, m) => sum + m.amount, 0);
  const totalPercent = filteredMilestones.reduce((sum, m) => sum + m.percentage, 0);

  rows.push({
    cells: ['Total', `${totalPercent}%`, formatCurrency(total)],
    isBold: true,
    isTotal: true,
  });

  return buildStyledTable({
    columns: [
      { header: 'Payment Milestone', align: 'left' },
      { header: '%', align: 'center' },
      { header: 'Amount', align: 'right' },
    ],
    rows,
  });
}

/**
 * Unit Details interface for the unit breakdown table
 */
export interface UnitDetail {
  unitLabel: string;
  modelName: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  estimatedPrice: number;
  quantity?: number;
}

/**
 * Generates an HTML table showing unit details breakdown
 * Columns: Unit #, Model Name, Specs (Bed/Bath/Sqft), Estimated Price
 */
export function generateUnitDetailsHtml(units: UnitDetail[] | null): string {
  if (!units || units.length === 0) {
    return 'No units configured.';
  }

  const rows: { cells: string[]; isBold?: boolean; isTotal?: boolean }[] = units.map((unit, index) => {
    const specs: string[] = [];
    if (unit.bedrooms !== undefined && unit.bedrooms !== null) {
      specs.push(`${unit.bedrooms} Bed`);
    }
    if (unit.bathrooms !== undefined && unit.bathrooms !== null) {
      specs.push(`${unit.bathrooms} Bath`);
    }
    if (unit.squareFootage !== undefined && unit.squareFootage !== null) {
      specs.push(`${unit.squareFootage.toLocaleString()} sqft`);
    }
    const specsStr = specs.length > 0 ? specs.join(' / ') : '-';
    const qty = unit.quantity || 1;
    const lineTotal = (unit.estimatedPrice || 0) * qty;

    return {
      cells: [
        unit.unitLabel || `Unit ${index + 1}`,
        unit.modelName || '-',
        String(qty),
        specsStr,
        formatCurrency(unit.estimatedPrice),
        formatCurrency(lineTotal),
      ],
    };
  });

  const totalUnits = units.reduce((sum, u) => sum + (u.quantity || 1), 0);
  const totalPrice = units.reduce((sum, u) => sum + (u.estimatedPrice || 0) * (u.quantity || 1), 0);

  rows.push({
    cells: [
      `Total (${totalUnits} Unit${totalUnits !== 1 ? 's' : ''})`,
      '',
      '',
      '',
      '',
      formatCurrency(totalPrice),
    ],
    isBold: true,
    isTotal: true,
  });

  return buildStyledTable({
    columns: [
      { header: 'Unit #', align: 'left' },
      { header: 'Model Name', align: 'left' },
      { header: 'Qty', align: 'center' },
      { header: 'Specs', align: 'center' },
      { header: 'Unit Price', align: 'right' },
      { header: 'Line Total', align: 'right' },
    ],
    rows,
  });
}

/** One phase as `buildPhaseRollups` returns it; the fields A.2 and B.1 render. */
export interface ExhibitPhase {
  phaseNumber: number;
  properties: {
    propertyCode: string;
    address: string | null;
    units: {
      unitLabel: string | null;
      sourceName: string | null;
      squareFootage: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      quantity: number;
    }[];
  }[];
  dates: {
    factoryStart: string | null;
    factoryComplete: string | null;
    deliveryWindow: string | null;
    targetCO: string | null;
  };
}

/** UTC, matching `formatDateOrTBD` in mapper.ts: a YYYY-MM-DD string is UTC
 * midnight, and formatting it in the host zone prints the day before. */
const EXHIBIT_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
});

function formatExhibitDate(value: string | null): string {
  if (!value) return 'TBD';
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? 'TBD' : EXHIBIT_DATE_FORMAT.format(parsed);
}

function unitSpecs(unit: ExhibitPhase['properties'][number]['units'][number]): string {
  const specs: string[] = [];
  if (unit.bedrooms != null) specs.push(`${unit.bedrooms} Bed`);
  if (unit.bathrooms != null) specs.push(`${unit.bathrooms} Bath`);
  if (unit.squareFootage != null) specs.push(`${unit.squareFootage.toLocaleString()} sqft`);
  return specs.length > 0 ? specs.join(' / ') : '-';
}

export function generateExhibitA2TableHtml(
  phases: ExhibitPhase[] | null,
  fallbackAddress: string
): string {
  const rows: { cells: string[]; isBold?: boolean; isTotal?: boolean }[] = [];

  for (const phase of phases || []) {
    for (const property of phase.properties) {
      const models = property.units
        .map((u) => `${u.quantity}× ${u.sourceName || 'Unknown'}`)
        .join(', ');
      rows.push({
        cells: [
          property.propertyCode,
          property.address || fallbackAddress || 'TBD',
          `Phase ${phase.phaseNumber}`,
          models || 'TBD',
          formatExhibitDate(phase.dates.factoryStart),
          formatExhibitDate(phase.dates.factoryComplete),
          formatExhibitDate(phase.dates.deliveryWindow),
          formatExhibitDate(phase.dates.targetCO),
        ],
      });
    }
  }

  if (rows.length === 0) {
    rows.push({ cells: ['No properties configured', '', '', '', '', '', '', ''] });
  }

  return buildStyledTable({
    columns: [
      { header: 'Property ID', align: 'left' },
      { header: 'Site Address', align: 'left' },
      { header: 'Phase', align: 'left' },
      { header: 'Home/Model', align: 'left' },
      { header: 'Est. Factory Start', align: 'left' },
      { header: 'Est. Factory Complete', align: 'left' },
      { header: 'Est. Delivery Window', align: 'left' },
      { header: 'Target CO/Equivalent', align: 'left' },
    ],
    rows,
  });
}

export function generateExhibitA4TableHtml(
  pricingSummary: PricingSummary | null,
  serviceModel: string
): string {
  if (!pricingSummary) return 'No pricing data available.';
  const { breakdown } = pricingSummary;
  const isCMOS = serviceModel === 'CMOS';

  const designFee = formatCurrency(breakdown.totalDesignFee);
  const productionPrice = formatCurrency(breakdown.totalOffsite);
  const logisticsPrice = breakdown.totalShipping ? formatCurrency(breakdown.totalShipping) : '$0';
  const onsitePrice = formatCurrency(breakdown.totalOnsite);
  // The engine's own figure, not a recomputation of it. Re-deriving the total
  // here is what let A.4's line items disagree with A.4's stated total by
  // $2,087,400 in the issued September 2026 agreement.
  const totalProjectPrice = formatCurrency(pricingSummary.contractValue);

  const rows: { cells: string[]; isBold?: boolean; isTotal?: boolean }[] = [
    { cells: ['Design / Pre-Production Fee', designFee, '', 'Due at signing'] },
    { cells: ['Offsite Services (Factory)', productionPrice, '', 'Per Phase'] },
    { cells: ['Offsite Services (Delivery/Assembly)', logisticsPrice, '', 'Delivery/transport'] },
  ];

  if (breakdown.totalCustomizations && breakdown.totalCustomizations > 0) {
    rows.push({ cells: ['Customizations', formatCurrency(breakdown.totalCustomizations), '', 'Per unit'] });
  }

  if (isCMOS) {
    rows.push({ cells: ['On-site Services (CMOS)', onsitePrice, '', 'CMOS only'] });
  }

  rows.push({ cells: ['Reimbursables (if any)', '', '', 'At cost plus admin fee'] });
  rows.push({
    cells: ['Total Project Price', totalProjectPrice, '', 'Subject to Change Orders'],
    isBold: true,
    isTotal: true,
  });

  return buildStyledTable({
    columns: [
      { header: 'Stage / Component', align: 'left' },
      { header: 'Design / Estimate', align: 'right' },
      { header: 'Final Price (Greenlight Approval)', align: 'left' },
      { header: 'Notes', align: 'left' },
    ],
    rows,
  });
}

/** One phase as `buildPhaseRollups` returns it; only the fields A.5 renders. */
export interface A5Phase {
  phaseNumber: number;
  properties: { propertyCode: string }[];
  milestones: { name: string; trigger: string; percentage: number; amount: number }[];
}

export function generateExhibitA5TableHtml(
  phases: A5Phase[] | null,
  pricingSummary: PricingSummary | null,
  serviceModel: string
): string {
  if (!pricingSummary) return 'No pricing data available.';

  const { breakdown } = pricingSummary;

  // The design fee is billed once, on its own Execution row. Every phase's
  // milestones divide that phase's value, which excludes it by construction —
  // so this row and those rows cannot overlap.
  const rows: { cells: string[]; isBold?: boolean; isTotal?: boolean }[] = [
    { cells: ['', '', 'Design Fee', 'Execution', '-', formatCurrency(breakdown.totalDesignFee), 'Immediate'] },
  ];

  for (const phase of phases || []) {
    const propertyCode = phase.properties.map((p) => p.propertyCode).join(', ');
    for (const milestone of phase.milestones) {
      rows.push({
        cells: [
          propertyCode,
          String(phase.phaseNumber),
          milestone.name,
          milestone.trigger,
          `${milestone.percentage}%`,
          formatCurrency(milestone.amount),
          '',
        ],
      });
    }
  }

  rows.push({
    cells: ['', '', 'Total', '', '100%', formatCurrency(pricingSummary.contractValue), ''],
    isBold: true,
    isTotal: true,
  });

  return buildStyledTable({
    columns: [
      { header: 'Property ID', align: 'left' },
      { header: 'Phase', align: 'left' },
      { header: 'Payment', align: 'left' },
      { header: 'Trigger', align: 'left' },
      { header: '%', align: 'center' },
      { header: 'Amount', align: 'right' },
      { header: 'Due', align: 'left' },
    ],
    rows,
  });
}

export function generateExhibitB1TableHtml(phases: ExhibitPhase[] | null): string {
  const rows: { cells: string[]; isBold?: boolean; isTotal?: boolean }[] = [];
  let totalUnits = 0;

  for (const phase of phases || []) {
    for (const property of phase.properties) {
      for (const unit of property.units) {
        totalUnits += unit.quantity;
        rows.push({
          cells: [
            property.propertyCode,
            String(phase.phaseNumber),
            unit.unitLabel || '-',
            unit.sourceName || '-',
            String(unit.quantity),
            unitSpecs(unit),
            '',
            '',
            '',
          ],
        });
      }
    }
  }

  if (rows.length === 0) {
    return '<p style="font-style: italic; color: #666;">No units configured.</p>';
  }

  rows.push({
    cells: ['', '', '', 'Total', String(totalUnits), '', '', '', ''],
    isBold: true,
    isTotal: true,
  });

  return buildStyledTable({
    columns: [
      { header: 'Property ID', align: 'left' },
      { header: 'Phase', align: 'left' },
      { header: 'Unit', align: 'left' },
      { header: 'Model', align: 'left' },
      { header: 'Qty', align: 'center' },
      { header: 'Specs', align: 'center' },
      { header: 'Plan Set Version', align: 'left' },
      { header: 'Date', align: 'left' },
      { header: 'Third-Party Review', align: 'left' },
    ],
    rows,
  });
}

export interface ResponsibilityMatrixItem {
  id: string;
  category: string;
  label: string;
  assignedTo: 'company' | 'client_gc';
}

export function generateResponsibilityMatrixHtml(
  matrixItems: ResponsibilityMatrixItem[] | null,
  serviceModel?: string
): string {
  if (!matrixItems || matrixItems.length === 0) {
    return '<p style="font-style: italic; color: #666;">Responsibility matrix not configured.</p>';
  }

  // Inline SVG check mark — does not depend on a font having the U+2713 glyph,
  // which the slim PDF-rendering container lacks (renders as tofu boxes otherwise).
  const checkMark =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
    'xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;">' +
    '<path d="M5 13l4 4L19 7" stroke="#1a73e8" stroke-width="3" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const categories = new Map<string, ResponsibilityMatrixItem[]>();
  for (const item of matrixItems) {
    const cat = item.category || 'General';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(item);
  }

  const rows: StyledRow[] = [];
  Array.from(categories.entries()).forEach(([category, items]) => {
    rows.push({
      cells: [category, '', ''],
      isBold: true,
    });
    for (const item of items) {
      rows.push({
        cells: [
          item.label,
          item.assignedTo === 'company' ? checkMark : '',
          item.assignedTo === 'client_gc' ? checkMark : '',
        ],
      });
    }
  });

  return buildStyledTable({
    columns: [
      { header: 'Task / Responsibility', width: '60%', align: 'left' },
      { header: 'Company', width: '20%', align: 'center' },
      { header: 'Client / GC', width: '20%', align: 'center' },
    ],
    rows,
    caption: 'Exhibit C.2 — On-Site Responsibility Matrix',
  });
}
