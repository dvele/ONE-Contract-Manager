/**
 * Every monetary value the API returns is an integer number of cents. These are
 * the only places that divide by 100 for display, so a unit price and the total
 * it rolls into cannot disagree about scale.
 */

const wholeDollarsFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const exactDollarsFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Rounded to whole dollars — for totals, where cents are noise. */
export function formatCents(cents: number): string {
  return wholeDollarsFormat.format(cents / 100);
}

/**
 * Whole dollars when the value is exact, two decimals otherwise — never one,
 * which is how $450.50 would otherwise print as "$450.5".
 */
export function formatCentsExact(cents: number): string {
  return cents % 100 === 0 ? wholeDollarsFormat.format(cents / 100) : exactDollarsFormat.format(cents / 100);
}
