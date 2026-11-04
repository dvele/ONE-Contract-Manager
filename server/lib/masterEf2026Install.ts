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
/** States whose F.2 notices live in server/templates/master-ef-2026-10/state-notices/<STATE>.html. */
export const MASTER_EF_2026_NOTICE_STATES = ["AZ", "CA"] as const;

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
  /** Reviewed F.2 notice HTML by state code; the repo copy is the source of truth. */
  stateNotices: Record<string, string>;
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
  /** The MASTER_EF_2026_STATE_NOTICES row per state (any activity; first by id). */
  existingNotices: { state: string; content: string }[];
  /** The installed template's exhibit rows, by letter. Empty on a fresh install. */
  existingExhibits: { id: number; letter: string; content: string }[];
}

export interface PlannedExhibitUpdate {
  id: number;
  letter: string;
  content: string;
}

export interface PlannedDisclosure {
  state: string;
  action: "insert" | "update" | "skip";
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
  /**
   * On a re-run, the installed template's exhibits whose text no longer
   * matches the repo file. Contracts read exhibits from the template at
   * generation time, so an update reaches every contract on it.
   */
  exhibitUpdates: PlannedExhibitUpdate[];
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
 * The fallback F.2 notices for a state without a reviewed file: its
 * MASTER_EF_NOTICES, then its EXHIBIT_G_CONTENT, each omitted when absent. No
 * heading: Exhibit F already carries the state's name. Null when the state has
 * neither, so no row is planned.
 */
export function composeStateNotices(notices: string | null, exhibitG: string | null): string | null {
  if (!present(notices) && !present(exhibitG)) return null;
  const parts: string[] = [];
  if (present(notices)) parts.push(notices);
  if (present(exhibitG)) parts.push(exhibitG);
  return renameAgreementTerms(parts.join("\n"));
}

/**
 * One MASTER_EF_2026_STATE_NOTICES row per state. A state with a reviewed file
 * in the repo gets that file, inserted or updated so a re-run ships text
 * changes; any other state keeps the insert-if-absent fallback.
 */
function planStateNotices(content: MasterEf2026Content, existing: ExistingState): PlannedDisclosure[] {
  const have = new Map(existing.existingNotices.map((n) => [n.state.toUpperCase(), n.content]));
  const disclosures: PlannedDisclosure[] = [];
  const reviewed = new Set<string>();

  for (const [state, html] of Object.entries(content.stateNotices)) {
    const code = state.toUpperCase();
    reviewed.add(code);
    const current = have.get(code);
    if (current === undefined) disclosures.push({ state: code, action: "insert", content: html });
    else if (current === html) disclosures.push({ state: code, action: "skip", reason: "already current" });
    else disclosures.push({ state: code, action: "update", content: html });
  }

  for (const source of existing.stateSources) {
    const code = source.state.toUpperCase();
    if (reviewed.has(code)) continue;
    if (have.has(code)) {
      disclosures.push({ state: source.state, action: "skip", reason: "already has MASTER_EF_2026_STATE_NOTICES" });
      continue;
    }
    const combined = composeStateNotices(source.notices, source.exhibitG);
    if (combined === null) continue;
    disclosures.push({ state: source.state, action: "insert", content: combined });
  }
  return disclosures;
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

  const disclosures = planStateNotices(content, existing);

  const exhibitUpdates: PlannedExhibitUpdate[] = [];
  if (!fresh) {
    for (const exhibit of content.exhibits) {
      const row = existing.existingExhibits.find((e) => e.letter === exhibit.letter);
      if (row && row.content !== exhibit.content) {
        exhibitUpdates.push({ id: row.id, letter: exhibit.letter, content: exhibit.content });
      }
    }
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
    exhibitUpdates,
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
  stateNotices: Record<(typeof MASTER_EF_2026_NOTICE_STATES)[number], string>,
): MasterEf2026Content {
  for (const [state, html] of Object.entries(stateNotices)) {
    if (!present(html)) throw new Error(`state notices ${state}: empty`);
  }
  return {
    clauses,
    exhibits: EXHIBIT_LETTERS.map((letter) => ({
      letter,
      title: exhibitTitleFromHtml(letter, exhibitHtml[letter]),
      content: exhibitHtml[letter],
    })),
    stateNotices,
  };
}
