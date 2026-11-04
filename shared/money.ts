/**
 * Money is stored as integer cents everywhere; the wizard's amount inputs are
 * typed in whole dollars. These two convert at that boundary.
 */

/** "2500000" or "2,500,000.50" → cents; undefined for an empty or unparsable field. */
export function dollarsInputToCents(input: string | null | undefined): number | undefined {
  const dollars = parseFloat((input ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : undefined;
}

/** cents → the whole-dollar text an input shows; "" for null. */
export function centsToDollarsInput(cents: number | null | undefined): string {
  return cents == null ? "" : String(cents / 100);
}
