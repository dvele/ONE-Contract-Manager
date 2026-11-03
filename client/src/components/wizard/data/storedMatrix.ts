import { parseStoredMatrix, serializeStoredMatrix, type ResponsibilityItem } from '@shared/responsibilityMatrix';

export interface WizardMatrices {
  /** The C.2 matrix the editor shows; empty until the editor seeds its defaults. */
  responsibilityMatrix: ResponsibilityItem[];
  /** The old agreement's matrix, carried unchanged so an old contract keeps its rows. */
  legacyResponsibilityMatrix: ResponsibilityItem[] | null;
}

export function matrixFromStored(raw: string | null | undefined): WizardMatrices {
  const { c2, legacy } = parseStoredMatrix(raw);
  return { responsibilityMatrix: c2 ?? [], legacyResponsibilityMatrix: legacy };
}

export function matrixToStored(m: WizardMatrices): string | null {
  return serializeStoredMatrix(m.responsibilityMatrix ?? [], m.legacyResponsibilityMatrix ?? null);
}
