const TZ = 'Africa/Maputo';

/** "YYYY-MM-DD" for today in Maputo timezone — safe near midnight. */
export function todayMaputo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/** "YYYY-MM-01" for the first day of the current month in Maputo timezone. */
export function firstOfMonthMaputo(): string {
  const [y, m] = todayMaputo().split('-');
  return `${y}-${m}-01`;
}

/** "YYYY-MM-01" for the first day of N months ago in Maputo timezone. */
export function firstOfMonthAgoMaputo(monthsAgo: number): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toLocaleDateString('en-CA');
}

/** "YYYY-MM-DD" for the last day of the previous month in Maputo timezone. */
export function lastOfPrevMonthMaputo(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  d.setDate(0);
  return d.toLocaleDateString('en-CA');
}

/**
 * Format any ISO / date string for display in Maputo timezone.
 * Pass Intl.DateTimeFormatOptions to control output.
 */
export function formatMaputo(isoOrDate: string | Date, opts: Intl.DateTimeFormatOptions): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleDateString('pt-PT', { timeZone: TZ, ...opts });
}
