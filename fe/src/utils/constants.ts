export const BREAKPOINTS = {
  mobile: "768px",
} as const;

/** Curated IANA timezone list for the seminar timezone selector. */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Asia/Seoul",          label: "KST  — Seoul / Busan (UTC+9)" },
  { value: "Asia/Tokyo",          label: "JST  — Tokyo (UTC+9)" },
  { value: "Asia/Shanghai",       label: "CST  — Beijing / Shanghai (UTC+8)" },
  { value: "Asia/Singapore",      label: "SGT  — Singapore (UTC+8)" },
  { value: "Asia/Kolkata",        label: "IST  — India (UTC+5:30)" },
  { value: "Asia/Dubai",          label: "GST  — Dubai (UTC+4)" },
  { value: "Europe/London",       label: "GMT/BST — London (UTC+0/+1)" },
  { value: "Europe/Paris",        label: "CET/CEST — Paris / Berlin (UTC+1/+2)" },
  { value: "Europe/Moscow",       label: "MSK  — Moscow (UTC+3)" },
  { value: "America/New_York",    label: "ET   — New York (UTC−5/−4)" },
  { value: "America/Chicago",     label: "CT   — Chicago (UTC−6/−5)" },
  { value: "America/Denver",      label: "MT   — Denver (UTC−7/−6)" },
  { value: "America/Los_Angeles", label: "PT   — Los Angeles (UTC−8/−7)" },
  { value: "America/Sao_Paulo",   label: "BRT  — São Paulo (UTC−3)" },
  { value: "Australia/Sydney",    label: "AEST — Sydney (UTC+10/+11)" },
  { value: "Pacific/Auckland",    label: "NZST — Auckland (UTC+12/+13)" },
  { value: "UTC",                 label: "UTC  — Coordinated Universal Time" },
];

/** Browser's detected timezone, used as the default selector value. */
export const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
