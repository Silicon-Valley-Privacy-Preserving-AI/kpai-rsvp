import styled, { css } from "styled-components";

// ── Design tokens ─────────────────────────────────────────────────────────────
export const colors = {
  primary: "#6c5ce7",
  primaryLight: "#a29bfe",
  primaryDark: "#5849e8",
  primaryBg: "#f0eeff",
  success: "#10b981",
  successBg: "#ecfdf5",
  danger: "#ef4444",
  dangerBg: "#fef2f2",
  warning: "#f59e0b",
  warningBg: "#fffbeb",
  surface: "#ffffff",
  background: "#f8f7ff",
  border: "#e5e7eb",
  borderLight: "#f0eeff",
  text: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
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
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
  text-decoration: none;

  ${({ size = "md" }) =>
    size === "sm"
      ? css`font-size: 13px; padding: 6px 14px;`
      : size === "lg"
      ? css`font-size: 16px; padding: 14px 28px;`
      : css`font-size: 14px; padding: 10px 20px;`}

  ${({ fullWidth }) => fullWidth && css`width: 100%;`}

  ${({ variant = "primary" }) => {
    switch (variant) {
      case "secondary":
        return css`
          background: ${colors.primaryBg};
          color: ${colors.primary};
          &:hover:not(:disabled) { background: #e4ddff; }
        `;
      case "danger":
        return css`
          background: ${colors.dangerBg};
          color: ${colors.danger};
          &:hover:not(:disabled) { background: #fee2e2; }
        `;
      case "ghost":
        return css`
          background: transparent;
          color: ${colors.textSecondary};
          &:hover:not(:disabled) { background: #f3f4f6; color: ${colors.text}; }
        `;
      case "outline":
        return css`
          background: transparent;
          color: ${colors.primary};
          border: 1.5px solid ${colors.primary};
          &:hover:not(:disabled) { background: ${colors.primaryBg}; }
        `;
      default: // primary
        return css`
          background: linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight});
          color: #fff;
          box-shadow: 0 2px 8px rgba(108, 92, 231, 0.3);
          &:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(108, 92, 231, 0.4);
          }
          &:active:not(:disabled) { transform: translateY(0); }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = styled.div<{ hoverable?: boolean }>`
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  overflow: hidden;
  ${({ hoverable }) =>
    hoverable &&
    css`
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.2s;
      &:hover {
        box-shadow: 0 8px 28px rgba(108, 92, 231, 0.12);
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
  border: 1.5px solid ${colors.border};
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s;
  background: #fff;
  color: ${colors.text};

  &::placeholder { color: ${colors.textMuted}; }

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.12);
  }
`;

export const Textarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  font-size: 14px;
  border: 1.5px solid ${colors.border};
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s;
  background: #fff;
  color: ${colors.text};
  resize: vertical;
  min-height: 90px;
  font-family: inherit;

  &::placeholder { color: ${colors.textMuted}; }

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.12);
  }
`;

export const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  font-size: 14px;
  border: 1.5px solid ${colors.border};
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s;
  background: #fff;
  color: ${colors.text};
  cursor: pointer;

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.12);
  }
`;

export const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textSecondary};
  margin-bottom: 6px;
  letter-spacing: 0.02em;
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
      case "purple": return css`background: #ede9fe; color: #6c5ce7;`;
      case "green":  return css`background: #d1fae5; color: #059669;`;
      case "red":    return css`background: #fee2e2; color: #dc2626;`;
      case "blue":   return css`background: #dbeafe; color: #2563eb;`;
      case "orange": return css`background: #ffedd5; color: #c2410c;`;
      default:       return css`background: #f3f4f6; color: #6b7280;`;
    }
  }}
`;

// ── Page layout ───────────────────────────────────────────────────────────────
export const PageContainer = styled.div`
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 20px 60px;

  @media (min-width: 768px) {
    padding: 40px 32px 80px;
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
  font-size: 24px;
  font-weight: 800;
  color: ${colors.text};
  margin: 0;
  letter-spacing: -0.02em;
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
  border-radius: 12px;
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
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;

  ${({ variant = "info" }) => {
    switch (variant) {
      case "success": return css`background: ${colors.successBg}; color: #065f46; border: 1px solid #6ee7b7;`;
      case "error":   return css`background: ${colors.dangerBg}; color: #991b1b; border: 1px solid #fca5a5;`;
      case "warning": return css`background: ${colors.warningBg}; color: #92400e; border: 1px solid #fcd34d;`;
      default:        return css`background: ${colors.primaryBg}; color: #4338ca; border: 1px solid #c4b5fd;`;
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
  font-size: 12px;
  font-weight: 700;
  color: ${colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  backdrop-filter: blur(2px);
`;

export const ModalCard = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  padding: 32px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
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
  width: 36px;
  height: 36px;
  border: 3px solid ${colors.border};
  border-top-color: ${colors.primary};
  border-radius: 50%;
  animation: spin 0.75s linear infinite;

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
