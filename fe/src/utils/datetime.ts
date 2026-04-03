/**
 * Convert a UTC ISO string to a local datetime-local input string.
 * e.g. "2024-06-01T01:00:00+00:00" (UTC) → "2024-06-01T10:00" (KST, UTC+9)
 */
export function toLocalInput(utcIso: string): string {
  const d = new Date(utcIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * Convert a datetime-local input value (local time) to a UTC ISO string.
 * e.g. "2024-06-01T10:00" (KST) → "2024-06-01T01:00:00.000Z" (UTC)
 * new Date() interprets a string without a timezone suffix as local time,
 * so toISOString() correctly converts it to UTC.
 */
export function toUtcIso(localDatetimeStr: string): string {
  return new Date(localDatetimeStr).toISOString();
}
