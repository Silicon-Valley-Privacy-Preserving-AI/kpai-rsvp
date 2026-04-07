import type { CSSProperties } from "react";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

function base(
  path: React.ReactNode,
  size: number,
  color: string,
  rest: { className?: string; style?: CSSProperties }
) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, ...rest.style }}
      className={rest.className}
    >
      {path}
    </svg>
  );
}

export function CalendarIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>, size, color, { className, style });
}

export function MapPinIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>, size, color, { className, style });
}

export function MicIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>, size, color, { className, style });
}

export function UsersIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>, size, color, { className, style });
}

export function UserIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>, size, color, { className, style });
}

export function CheckCircleIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>, size, color, { className, style });
}

export function CheckIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<polyline points="20 6 9 17 4 12" />, size, color, { className, style });
}

export function ClockIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>, size, color, { className, style });
}

export function MailIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>, size, color, { className, style });
}

export function LockIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, size, color, { className, style });
}

export function FolderOpenIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="2" y1="10" x2="22" y2="10" /></>, size, color, { className, style });
}

export function GraduationCapIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>, size, color, { className, style });
}

export function KeyIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />, size, color, { className, style });
}

export function SparklesIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z" /><path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75z" /></>, size, color, { className, style });
}

export function SettingsIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>, size, color, { className, style });
}

export function AlertTriangleIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>, size, color, { className, style });
}

export function XIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, size, color, { className, style });
}

export function PlusIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, size, color, { className, style });
}

export function ArrowLeftIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>, size, color, { className, style });
}

export function ShieldCheckIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></>, size, color, { className, style });
}

export function MenuIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>, size, color, { className, style });
}

export function ArrowRightIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>, size, color, { className, style });
}

export function ExternalLinkIcon({ size = 16, color = "currentColor", className, style }: IconProps) {
  return base(<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>, size, color, { className, style });
}
