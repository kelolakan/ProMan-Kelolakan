/**
 * Work Time Utilities (Hours vs Mandays / Hari Kerja)
 * Default Standard: 1 Hari Kerja (Manday) = 8 Jam Kerja
 */

export const HOURS_PER_WORK_DAY = 8;

/**
 * Converts hours to working days (mandays)
 */
export function hoursToMandays(hours: number, hoursPerDay: number = HOURS_PER_WORK_DAY): number {
  if (!hours || isNaN(hours)) return 0;
  return Number((hours / hoursPerDay).toFixed(1));
}

/**
 * Converts working days (mandays) to hours
 */
export function mandaysToHours(days: number, hoursPerDay: number = HOURS_PER_WORK_DAY): number {
  if (!days || isNaN(days)) return 0;
  return Number((days * hoursPerDay).toFixed(1));
}

/**
 * Converts minutes to hours or days
 */
export function minutesToHours(mins: number): number {
  if (!mins || isNaN(mins)) return 0;
  return Number((mins / 60).toFixed(1));
}

/**
 * Formats hours into a dual string (Jam + Hari Kerja)
 * e.g. formatWorkDuration(24) -> "24 Jam (3 Hari Kerja)"
 * e.g. formatWorkDuration(12) -> "12 Jam (1.5 Hari Kerja)"
 * e.g. formatWorkDuration(4)  -> "4 Jam (0.5 Hari Kerja)"
 */
export function formatWorkDuration(hours: number, hoursPerDay: number = HOURS_PER_WORK_DAY): string {
  if (hours === undefined || hours === null || isNaN(hours)) return "0 Jam (0 Hari)";
  const days = hoursToMandays(hours, hoursPerDay);
  if (hours === 0) return "0 Jam (0 Hari)";
  if (days === 1) return `${hours} Jam (1 Hari Kerja)`;
  return `${hours} Jam (${days} Hari Kerja)`;
}

/**
 * Compact format for badges & small cards
 * e.g. "24j (~3h)"
 */
export function formatWorkDurationShort(hours: number, hoursPerDay: number = HOURS_PER_WORK_DAY): string {
  if (!hours || isNaN(hours)) return "0j (0h)";
  const days = hoursToMandays(hours, hoursPerDay);
  return `${hours} Jam (${days} Hari)`;
}
