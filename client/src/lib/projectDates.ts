/**
 * Project schedule dates, held and rendered in UTC.
 *
 * A `YYYY-MM-DD` string parses as UTC midnight. Formatting or incrementing it
 * in the viewer's own zone prints the previous day anywhere west of UTC — the
 * defect fixed three times on the server (`formatDateOrTBD`, `formatDateWritten`
 * and `formatDate` in server/lib/mapper.ts) and once in the wizard
 * (Step6DatesSchedule), each time by pinning the zone to UTC.
 *
 * These are the only places the wizard's schedule dates are parsed, advanced or
 * formatted, so a derived date and the start it derives from cannot disagree
 * about which day they are on.
 */

const projectDateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** Parses a `YYYY-MM-DD` string to UTC midnight on that calendar date. */
export function parseProjectDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

/**
 * Advances by whole UTC days, returning a new Date.
 *
 * `setDate`/`getDate` work in local time, so adding across a DST boundary
 * shifts the underlying instant by an hour — enough to move a UTC-midnight
 * date onto the previous day.
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Advances by whole months in UTC, returning a new Date.
 *
 * `setMonth` has the same local-time problem as `setDate`, and the warranty
 * expirations are measured in months rather than days.
 */
export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/** Renders as "Sep 21, 2026", in UTC. */
export function formatProjectDate(date: Date): string {
  return projectDateFormat.format(date);
}
