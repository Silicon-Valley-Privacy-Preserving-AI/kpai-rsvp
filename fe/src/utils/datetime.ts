/**
 * Format a UTC ISO string in the given IANA timezone.
 * Returns a human-readable string like "Jan 14, 2026, 05:00 PM".
 */
export function formatInTz(utcIso: string | null, tz: string): string {
  if (!utcIso) return "—";
  return new Date(utcIso).toLocaleString("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Return the short timezone abbreviation for a given IANA tz at a given instant.
 * e.g. tzAbbr("America/Los_Angeles") → "PST" or "PDT"
 */
export function tzAbbr(tz: string, date?: Date): string {
  const d = date ?? new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(d);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

/**
 * Convert a UTC ISO string to a local datetime-local input string.
 * Uses the browser's local timezone (legacy helper — prefer toTzInput).
 * e.g. "2024-06-01T01:00:00+00:00" (UTC) → "2024-06-01T10:00" (KST, UTC+9)
 */
export function toLocalInput(utcIso: string): string {
  return toTzInput(utcIso, Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/**
 * Convert a datetime-local input value (local time) to a UTC ISO string.
 * Uses the browser's local timezone (legacy helper — prefer tzToUtcIso).
 * e.g. "2024-06-01T10:00" (KST) → "2024-06-01T01:00:00.000Z" (UTC)
 */
export function toUtcIso(localDatetimeStr: string): string {
  return tzToUtcIso(localDatetimeStr, Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/**
 * Convert a UTC ISO string to a datetime-local input string in the given IANA timezone.
 * e.g. toTzInput("2026-01-15T01:00:00Z", "America/Los_Angeles") → "2026-01-14T17:00"
 */
export function toTzInput(utcIso: string, tz: string): string {
  const d = new Date(utcIso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  // Some engines emit "24" for midnight; normalise to "00"
  const hh = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hh}:${get("minute")}`;
}

/**
 * Compute the wall-clock offset of a timezone at a given UTC instant.
 * Returns (localTime − utcTime) in milliseconds.
 */
function _tzOffsetMs(utc: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utc);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const h = get("hour") === 24 ? 0 : get("hour");
  const localAsUtcMs = Date.UTC(get("year"), get("month") - 1, get("day"), h, get("minute"), get("second"));
  return localAsUtcMs - utc.getTime();
}

/**
 * Convert a datetime-local input value interpreted in the given IANA timezone to a UTC ISO string.
 * Handles DST transitions with a two-pass correction.
 * e.g. tzToUtcIso("2026-01-14T17:00", "America/Los_Angeles") → "2026-01-15T01:00:00.000Z"
 */
export function tzToUtcIso(localStr: string, tz: string): string {
  if (!localStr) return "";
  // Treat the local string as if it were UTC to get a starting Date object
  const approxUtc = new Date(localStr + "Z");
  // First-pass: estimate the offset at the approximate UTC moment
  const offsetMs1 = _tzOffsetMs(approxUtc, tz);
  const utc1 = new Date(approxUtc.getTime() - offsetMs1);
  // Second-pass: re-compute with the corrected UTC time (handles DST edge cases)
  const offsetMs2 = _tzOffsetMs(utc1, tz);
  return new Date(approxUtc.getTime() - offsetMs2).toISOString();
}
