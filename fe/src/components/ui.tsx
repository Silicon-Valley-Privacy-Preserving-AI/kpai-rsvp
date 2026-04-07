import styled, { css } from "styled-components";

// ── Design tokens ─────────────────────────────────────────────────────────────
export const colors = {
  primary: "#0e7490",
  primaryLight: "#22d3ee",
  primaryDark: "#0c6078",
  primaryBg: "#f0fdff",
  success: "#059669",
  successBg: "#ecfdf5",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  warning: "#d97706",
  warningBg: "#fffbeb",
  surface: "#ffffff",
  background: "#f8fafc",
  border: "#e4e4e7",
  borderLight: "#f4f4f5",
  text: "#18181b",
  textSecondary: "#71717a",
  textMuted: "#a1a1aa",
};

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
  gap: 6px;
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
          background: ${colors.primaryBg};
          color: ${colors.primary};
          border: 1px solid rgba(14, 116, 144, 0.15);
          &:hover:not(:disabled) { background: #ccf7fe; border-color: rgba(14, 116, 144, 0.3); }
          &:active:not(:disabled) { transform: scale(0.98); }
        `;
      case "danger":
        return css`
          background: ${colors.dangerBg};
          color: ${colors.danger};
          border: 1px solid rgba(220, 38, 38, 0.15);
          &:hover:not(:disabled) { background: #fee2e2; }
          &:active:not(:disabled) { transform: scale(0.98); }
        `;
      case "ghost":
        return css`
          background: transparent;
          color: ${colors.textSecondary};
          &:hover:not(:disabled) { background: ${colors.borderLight}; color: ${colors.text}; }
          &:active:not(:disabled) { transform: scale(0.98); }
        `;
      case "outline":
        return css`
          background: transparent;
          color: ${colors.primary};
          border: 1.5px solid ${colors.primary};
          &:hover:not(:disabled) { background: ${colors.primaryBg}; }
          &:active:not(:disabled) { transform: scale(0.98); }
        `;
      default: // primary
        return css`
          background: ${colors.primary};
          color: #fff;
          box-shadow: 0 1px 3px rgba(14, 116, 144, 0.25), 0 4px 12px rgba(14, 116, 144, 0.15);
          &:hover:not(:disabled) {
            background: ${colors.primaryDark};
            box-shadow: 0 2px 6px rgba(14, 116, 144, 0.3), 0 6px 16px rgba(14, 116, 144, 0.2);
            transform: translateY(-1px);
          }
          &:active:not(:disabled) { transform: translateY(0) scale(0.98); box-shadow: 0 1px 3px rgba(14, 116, 144, 0.2); }
        `;
    }
  }}

  &:disabled {
    opacity: 0.45;
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
      transition: box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s;
      &:hover {
        box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.1);
        transform: translateY(-3px);
        border-color: #d1d5db;
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
  border: 1.5px solid ${colors.border};
  border-radius: 10px;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
  background: #fff;
  color: ${colors.text};

  &::placeholder { color: ${colors.textMuted}; }

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 116, 144, 0.12);
  }
`;

export const Textarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  border: 1.5px solid ${colors.border};
  border-radius: 10px;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
  background: #fff;
  color: ${colors.text};
  resize: vertical;
  min-height: 90px;

  &::placeholder { color: ${colors.textMuted}; }

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 116, 144, 0.12);
  }
`;

export const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  border: 1.5px solid ${colors.border};
  border-radius: 10px;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
  background: #fff;
  color: ${colors.text};
  cursor: pointer;

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 116, 144, 0.12);
  }
`;

export const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: ${colors.textSecondary};
  margin-bottom: 6px;
  letter-spacing: 0.06em;
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
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;

  ${({ color = "gray" }) => {
    switch (color) {
      case "purple": return css`background: ${colors.primaryBg}; color: ${colors.primary};`;
      case "green":  return css`background: #dcfce7; color: #16a34a;`;
      case "red":    return css`background: #fee2e2; color: #dc2626;`;
      case "blue":   return css`background: #dbeafe; color: #1d4ed8;`;
      case "orange": return css`background: #ffedd5; color: #c2410c;`;
      default:       return css`background: ${colors.borderLight}; color: ${colors.textSecondary};`;
    }
  }}
`;

// ── Page layout ───────────────────────────────────────────────────────────────
export const PageContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 36px 20px 64px;

  @media (min-width: 768px) {
    padding: 48px 32px 88px;
  }
`;

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 28px;
  flex-wrap: wrap;
`;

export const PageTitle = styled.h1`
  font-size: 26px;
  font-weight: 800;
  color: ${colors.text};
  margin: 0;
  letter-spacing: -0.03em;
`;

export const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: ${colors.text};
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
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
      case "success": return css`background: ${colors.successBg}; color: #065f46; border: 1px solid #a7f3d0;`;
      case "error":   return css`background: ${colors.dangerBg}; color: #991b1b; border: 1px solid #fca5a5;`;
      case "warning": return css`background: ${colors.warningBg}; color: #92400e; border: 1px solid #fcd34d;`;
      default:        return css`background: ${colors.primaryBg}; color: ${colors.primaryDark}; border: 1px solid rgba(14, 116, 144, 0.25);`;
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
  background: ${colors.background};
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
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
`;

export const Tr = styled.tr`
  &:last-child ${Td} { border-bottom: none; }
  &:hover ${Td} { background: ${colors.background}; }
`;

// ── Modal overlay ─────────────────────────────────────────────────────────────
export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  backdrop-filter: blur(4px);
`;

export const ModalCard = styled.div`
  background: ${colors.surface};
  border-radius: 20px;
  padding: 32px;
  max-width: 440px;
  width: 100%;
  border: 1px solid ${colors.border};
  box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.18);
`;

// ── Empty state ───────────────────────────────────────────────────────────────
export const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${colors.textMuted};
  font-size: 15px;
`;

// ── Loading spinner ───────────────────────────────────────────────────────────
export const Spinner = styled.div`
  display: inline-block;
  width: 32px;
  height: 32px;
  border: 2.5px solid ${colors.borderLight};
  border-top-color: ${colors.primary};
  border-radius: 50%;
  animation: spin 0.65s cubic-bezier(0.4, 0, 0.2, 1) infinite;

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
  padding: 80px 24px;
  color: ${colors.textMuted};
  font-size: 14px;
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
 