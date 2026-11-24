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

/**
 * Splits `total` cents in proportion to `weights`. Each share is floored, then
 * the leftover cents go one each to the largest fractional parts, so the shares
 * sum to `total` exactly. Exhibit A.5 (2026) and the wizard's Phase Payment
 * Schedule card both split with this, so the card shows the contract's figures.
 */
export function splitCents(total: number, weights: number[]): number[] {
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);
  if (weights.length === 0 || weightTotal <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (total * w) / weightTotal);
  const shares = exact.map(Math.floor);
  let residual = total - shares.reduce((sum, s) => sum + s, 0);
  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < byFraction.length && residual > 0; i++, residual--) {
    shares[byFraction[i].index] += 1;
  }
  return shares;
}
