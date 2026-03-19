/**
 * UTC ISO 문자열 → datetime-local input 에 맞는 로컬 시간 문자열 변환
 * 예) "2024-06-01T01:00:00+00:00" (UTC) → "2024-06-01T10:00" (KST, UTC+9)
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
 * datetime-local input 값 (로컬 시간) → UTC ISO 문자열 변환
 * 예) "2024-06-01T10:00" (KST) → "2024-06-01T01:00:00.000Z" (UTC)
 * new Date(localStr)는 timezone-suffix 없는 문자열을 로컬 시간으로 해석하므로
 * toISOString()으로 UTC 변환이 올바르게 동작한다.
 */
export function toUtcIso(localDatetimeStr: string): string {
  return new Date(localDatetimeStr).toISOString();
}
