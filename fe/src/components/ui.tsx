import styled, { css, keyframes } from "styled-components";

// ── Design tokens ─────────────────────────────────────────────────────────────
export const colors = {
  // Surfaces
  primary:       "#F97316",                   // Solar Orange — the single accent
  primaryLight:  "#FB923C",                   // Orange-400
  primaryDark:   "#EA580C",                   // Orange-600 — pressed state
  primaryBg:     "rgba(249,115,22,0.12)",     // Orange glow — focus rings, hover tints
  // Semantic
  success:       "#22C55E",
  successBg:     "rgba(34,197,94,0.12)",
  danger:        "#F87171",
  dangerBg:      "rgba(248,113,113,0.12)",
  warning:       "#FBBF24",
  warningBg:     "rgba(251,191,36,0.12)",
  // Surfaces
  surface:       "#1A1A1E",                   // Raised surface — cards
  background:    "#09090B",                   // Void black — canvas
  border:        "rgba(255,255,255,0.07)",    // Whisper border
  borderLight:   "rgba(255,255,255,0.04)",    // Ultra-subtle structural lines
  borderSoft:    "rgba(255,255,255,0.12)",    // Interactive element borders
  // Text
  text:          "#F4F4F5",                   // Primary — zinc-100
  textSecondary: "#A1A1AA",                   // Secondary — zinc-400
  textMuted:     "#52525B",                   // Muted — zinc-600
};

// ── Keyframes ─────────────────────────────────────────────────────────────────
const shimmer = keyframes`
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
`;

// ── Button ────────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

export const Button = styled.button<{
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
  text-decoration: none;
  letter-spacing: -0.01em;

  ${({ size = "md" }) =>
    size === "sm"
      ? css`font-size: 13px; padding: 7px 15px;`
      : size === "lg"
      ? css`font-size: 15px; padding: 13px 28px;`
      : css`font-size: 14px; padding: 9px 20px;`}

  ${({ fullWidth }) => fullWidth && css`width: 100%;`}

  ${({ variant = "primary" }) => {
    switch (variant) {
      case "secondary":
        return css`
          background: rgba(255,255,255,0.06);
          color: #E4E4E7;
          border: 1px solid rgba(255,255,255,0.12);
          &:hover:not(:disabled) { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.18); }
          &:active:not(:disabled) { transform: scale(0.98); }
        `;
      case "danger":
        return css`
          background: ${colors.dangerBg};
          color: ${colors.danger};
          border: 1px solid rgba(248,113,113,0.2);
          &:hover:not(:disabled) { background: rgba(248,113,113,0.18); }
          &:active:not(:disabled) { transform: scale(0.98); }
        `;
      case "ghost":
        return css`
          background: transparent;
          color: ${colors.textSecondary};
          &:hover:not(:disabled) { background: rgba(255,255,255,0.05); color: ${colors.text}; }
          &:active:not(:disabled) { transform: scale(0.98); }
        `;
      case "outline":
        return css`
          background: transparent;
          color: ${colors.primary};
          border: 1.5px solid rgba(249,115,22,0.5);
          &:hover:not(:disabled) { background: ${colors.primaryBg}; border-color: ${colors.primary}; }
          &:active:not(:disabled) { transform: scale(0.98); }
        `;
      default: // primary
        return css`
          background: ${colors.primary};
          color: #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(249,115,22,0.2);
          &:hover:not(:disabled) {
            background: ${colors.primaryDark};
            box-shadow: 0 2px 4px rgba(0,0,0,0.4), 0 6px 16px rgba(249,115,22,0.28);
            transform: translateY(-1px);
          }
          &:active:not(:disabled) {
            transform: translateY(0) scale(0.97);
            box-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 2px 6px rgba(249,115,22,0.15);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }
`;

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = styled.div<{ hoverable?: boolean }>`
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  overflow: hidden;
  ${({ hoverable }) =>
    hoverable &&
    css`
      cursor: pointer;
      transition: box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.2s;
      &:hover {
        border-color: rgba(255,255,255,0.14);
        box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(249,115,22,0.06);
        transform: translateY(-2px);
      }
    `}
`;

export const CardBody = styled.div`
  padding: 20px 24px;
`;

// ── Form elements ─────────────────────────────────────────────────────────────
export const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
  background: #111113;
  color: ${colors.text};

  &::placeholder { color: ${colors.textMuted}; }

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(249,115,22,0.15);
  }
`;

export const Textarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
  background: #111113;
  color: ${colors.text};
  resize: vertical;
  min-height: 90px;

  &::placeholder { color: ${colors.textMuted}; }

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(249,115,22,0.15);
  }
`;

export const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
  background: #111113;
  color: ${colors.text};
  cursor: pointer;

  option { background: #1A1A1E; color: ${colors.text}; }

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(249,115,22,0.15);
  }
`;

export const Label = styled.label`
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: ${colors.textMuted};
  margin-bottom: 6px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
`;

export const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: ${colors.text};
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: ${colors.primary};
    cursor: pointer;
  }
`;

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeColor = "purple" | "green" | "red" | "blue" | "gray" | "orange";

export const Badge = styled.span<{ color?: BadgeColor }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;

  ${({ color = "gray" }) => {
    switch (color) {
      case "purple":
      case "blue":   return css`background: rgba(249,115,22,0.14); color: #FB923C;`;
      case "green":  return css`background: rgba(34,197,94,0.14);  color: #22C55E;`;
      case "red":    return css`background: rgba(248,113,113,0.14); color: #F87171;`;
      case "orange": return css`background: rgba(249,115,22,0.14); color: #F97316;`;
      default:       return css`background: rgba(255,255,255,0.07); color: ${colors.textSecondary};`;
    }
  }}
`;

// ── Page layout ───────────────────────────────────────────────────────────────
export const PageContainer = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 36px 20px 72px;

  @media (min-width: 768px) {
    padding: 52px 40px 96px;
  }
`;

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 32px;
  flex-wrap: wrap;
`;

export const PageTitle = styled.h1`
  font-size: 26px;
  font-weight: 800;
  color: ${colors.text};
  margin: 0;
  letter-spacing: -0.04em;
`;

export const SectionTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: ${colors.text};
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.02em;
`;

// ── Section block ─────────────────────────────────────────────────────────────
export const SectionBlock = styled.section`
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 20px 24px;
  margin-top: 20px;
`;

// ── Divider ───────────────────────────────────────────────────────────────────
export const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${colors.border};
  margin: 24px 0;
`;

// ── Status / alert boxes ──────────────────────────────────────────────────────
export const AlertBox = styled.div<{ variant?: "success" | "error" | "info" | "warning" }>`
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;

  ${({ variant = "info" }) => {
    switch (variant) {
      case "success": return css`background: ${colors.successBg}; color: #4ADE80; border: 1px solid rgba(34,197,94,0.2);`;
      case "error":   return css`background: ${colors.dangerBg};  color: #F87171; border: 1px solid rgba(248,113,113,0.2);`;
      case "warning": return css`background: ${colors.warningBg}; color: #FBBF24; border: 1px solid rgba(251,191,36,0.2);`;
      default:        return css`background: ${colors.primaryBg}; color: #FB923C; border: 1px solid rgba(249,115,22,0.2);`;
    }
  }}
`;

// ── Table ─────────────────────────────────────────────────────────────────────
export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`;

export const Thead = styled.thead`
  background: rgba(255,255,255,0.03);
`;

export const Th = styled.th`
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.07em;
  white-space: nowrap;
  border-bottom: 1px solid ${colors.border};
`;

export const Td = styled.td`
  padding: 12px 14px;
  color: ${colors.text};
  border-bottom: 1px solid ${colors.border};
  vertical-align: middle;
`;

export const Tr = styled.tr`
  transition: background 0.12s;
  &:last-child ${Td} { border-bottom: none; }
  &:hover ${Td} { background: rgba(255,255,255,0.025); }
`;

// ── Modal overlay ─────────────────────────────────────────────────────────────
export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  backdrop-filter: blur(6px);
`;

export const ModalCard = styled.div`
  background: #1A1A1E;
  border-radius: 20px;
  padding: 32px;
  max-width: 440px;
  width: 100%;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 24px 80px rgba(0,0,0,0.6);
`;

// ── Empty state ───────────────────────────────────────────────────────────────
export const EmptyState = styled.div`
  text-align: center;
  padding: 56px 24px;
  color: ${colors.textMuted};
  font-size: 15px;
`;

// ── Loading spinner (skeletal ring, no generic circle) ────────────────────────
export const Spinner = styled.div`
  display: inline-block;
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255,255,255,0.08);
  border-top-color: ${colors.primary};
  border-radius: 50%;
  animation: spin 0.6s cubic-bezier(0.4,0,0.2,1) infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const LoadingCenter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 96px 24px;
  color: ${colors.textMuted};
  font-size: 14px;
`;

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
export const Skeleton = styled.div<{ w?: string; h?: string; radius?: string }>`
  width: ${({ w }) => w ?? "100%"};
  height: ${({ h }) => h ?? "16px"};
  border-radius: ${({ radius }) => radius ?? "6px"};
  background: linear-gradient(90deg, #1A1A1E 0%, #222228 50%, #1A1A1E 100%);
  background-size: 400px 100%;
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;

// ── Tag row ───────────────────────────────────────────────────────────────────
export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`;

// ── Meta info row ─────────────────────────────────────────────────────────────
export const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: ${colors.textSecondary};
  margin-bottom: 6px;
`;
