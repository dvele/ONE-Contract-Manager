import { stateName } from "../../shared/usStates";

/**
 * Pure planner for installing the Master EF 2026-10 agreement. No database and no
 * filesystem: the executor (scripts/lib/masterEf2026Installer.ts) loads the
 * content and the existing-state facts, calls this, and applies the plan in one
 * transaction.
 */

export const MASTER_EF_2026_TEMPLATE_NAME = "Dvele Master Factory Built Home Agreement (2026-10)";
export const MASTER_EF_2026_CONTRACT_TYPE = "MASTER_EF";
export const MASTER_EF_2026_LLC_NAME = "Dvele AZ, LLC";
export const MASTER_EF_2026_NOTICES_CODE = "MASTER_EF_2026_STATE_NOTICES";
export const MASTER_EF_NOTICES_CODE = "MASTER_EF_NOTICES";
export const EXHIBIT_G_CONTENT_CODE = "EXHIBIT_G_CONTENT";
export const MASTER_EF_2026_ORG_ID = 1;

export interface MasterEf2026Clause {
  slug: string;
  headerText: string;
  bodyHtml: string;
  level: number;
  parentSlug: string | null;
  order: number;
}

export interface MasterEf2026Exhibit {
  letter: string;
  title: string;
  content: string;
}

export interface MasterEf2026Content {
  clauses: MasterEf2026Clause[];
  exhibits: MasterEf2026Exhibit[];
}

export interface StateSource {
  state: string;
  notices: string | null;
  exhibitG: string | null;
}

export interface ExistingState {
  templateId: number | null;
  /** Every active MASTER_EF template other than the 2026-10 one. */
  oldTemplateIds: number[];
  /** True when an llcs row named "Dvele AZ, LLC" exists for org 1. */
  llcExists: boolean;
  /** Active source rows (org 1) per state. */
  stateSources: StateSource[];
  /** States that already have a MASTER_EF_2026_STATE_NOTICES row (any activity). */
  existingNoticeStates: string[];
}

export interface PlannedDisclosure {
  state: string;
  action: "insert" | "skip";
  /** Why a state is skipped. */
  reason?: string;
  content?: string;
}

export interface InstallPlan {
  template: { name: string; displayName: string; contractType: string; version: number; status: string; isActive: boolean; organizationId: number } | null;
  clauses: (MasterEf2026Clause & { orderIndex: number })[];
  exhibits: (MasterEf2026Exhibit & { sortOrder: number })[];
  llc: { name: string; stateOfFormation: string; entityType: string; status: string; organizationId: number } | null;
  deactivateTemplateIds: number[];
  disclosures: PlannedDisclosure[];
}

/**
 * Replaces whole-word, capitalized "Company" and "Client" in text content only.
 * Tag names and attributes (`<p class="Company">`) are left alone.
 */
export function renameAgreementTerms(html: string): string {
  return html
    .split(/(<[^>]*>)/)
    .map((part) =>
      part.startsWith("<") && part.endsWith(">")
        ? part
        : part.replace(/\bCompany\b/g, "Dvele").replace(/\bClient\b/g, "Buyer"),
    )
    .join("");
}

const present = (s: string | null | undefined): s is string => !!s && s.trim() !== "";

/**
 * The combined state notices for Exhibit F.2: a heading, the state's
 * MASTER_EF_NOTICES, then its EXHIBIT_G_CONTENT, each omitted when absent. Null
 * when the state has neither, so no row is planned.
 */
export function composeStateNotices(
  state: string,
  notices: string | null,
  exhibitG: string | null,
): string | null {
  if (!present(notices) && !present(exhibitG)) return null;
  const parts = [`<h3>${stateName(state)} Notices</h3>`];
  if (present(notices)) parts.push(notices);
  if (present(exhibitG)) parts.push(exhibitG);
  return renameAgreementTerms(parts.join("\n"));
}

export function planMasterEf2026Install(
  content: MasterEf2026Content,
  existing: ExistingState,
): InstallPlan {
  const fresh = existing.templateId === null;

  const seen = new Set<string>();
  for (const clause of content.clauses) {
    if (clause.parentSlug !== null && !seen.has(clause.parentSlug)) {
      throw new Error(`clause ${clause.slug}: parent ${clause.parentSlug} does not appear earlier`);
    }
    seen.add(clause.slug);
  }

  const have = new Set(existing.existingNoticeStates.map((s) => s.toUpperCase()));
  const disclosures: PlannedDisclosure[] = [];
  for (const source of existing.stateSources) {
    if (have.has(source.state.toUpperCase())) {
      disclosures.push({ state: source.state, action: "skip", reason: "already has MASTER_EF_2026_STATE_NOTICES" });
      continue;
    }
    const combined = composeStateNotices(source.state, source.notices, source.exhibitG);
    if (combined === null) continue;
    disclosures.push({ state: source.state, action: "insert", content: combined });
  }

  return {
    template: fresh
      ? {
          name: MASTER_EF_2026_TEMPLATE_NAME,
          displayName: MASTER_EF_2026_TEMPLATE_NAME,
          contractType: MASTER_EF_2026_CONTRACT_TYPE,
          version: 1,
          status: "active",
          isActive: true,
          organizationId: MASTER_EF_2026_ORG_ID,
        }
      : null,
    clauses: fresh ? content.clauses.map((c) => ({ ...c, orderIndex: c.order * 10 })) : [],
    exhibits: fresh ? content.exhibits.map((e, i) => ({ ...e, sortOrder: i + 1 })) : [],
    llc:
      fresh && !existing.llcExists
        ? {
            name: MASTER_EF_2026_LLC_NAME,
            stateOfFormation: "Arizona",
            entityType: "LLC",
            status: "active",
            organizationId: MASTER_EF_2026_ORG_ID,
          }
        : null,
    deactivateTemplateIds: fresh ? [...existing.oldTemplateIds] : [],
    disclosures,
  };
}

const EXHIBIT_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
const decodeEntities = (s: string) =>
  s.replace(/&mdash;/g, "—").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");

/**
 * An exhibit's title is the text of its <h2> after "EXHIBIT X — ", without a
 * trailing parenthetical such as ({{PROJECT_STATE_NAME}}).
 */
export function exhibitTitleFromHtml(letter: string, html: string): string {
  const h2 = /<h2>([\s\S]*?)<\/h2>/.exec(html)?.[1];
  if (!h2) throw new Error(`exhibit ${letter} has no <h2>`);
  const text = decodeEntities(h2).replace(/\s*\([^)]*\)\s*$/, "").trim();
  const title = text.replace(/^EXHIBIT [A-Z]\s*—\s*/, "").trim();
  if (!title) throw new Error(`exhibit ${letter}: empty title`);
  return title;
}

/** Assembles the content from the raw files; shared by the fs and bundled loaders. */
export function buildMasterEf2026Content(
  clauses: MasterEf2026Clause[],
  exhibitHtml: Record<(typeof EXHIBIT_LETTERS)[number], string>,
): MasterEf2026Content {
  return {
    clauses,
    exhibits: EXHIBIT_LETTERS.map((letter) => ({
      letter,
      title: exhibitTitleFromHtml(letter, exhibitHtml[letter]),
      content: exhibitHtml[letter],
    })),
  };
}
