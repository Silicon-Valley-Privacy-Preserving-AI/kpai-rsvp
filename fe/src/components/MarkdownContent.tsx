import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styled from "styled-components";

interface Props {
  children: string;
  /** Compact mode trims spacing — for card previews */
  compact?: boolean;
}

/**
 * react-markdown v10 does not render raw HTML by default,
 * so XSS is prevented without rehype-sanitize.
 * rehype-sanitize was stripping valid markdown-generated elements
 * (h2, ul, li, etc.) and has been removed for that reason.
 */
export default function MarkdownContent({ children, compact }: Props) {
  return (
    <Prose compact={compact}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </Prose>
  );
}

const Prose = styled.div<{ compact?: boolean }>`
  font-size: ${({ compact }) => (compact ? "13px" : "15px")};
  color: #374151;
  line-height: 1.75;

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    color: #111827;
    font-weight: 700;
    line-height: 1.3;
    margin: ${({ compact }) => (compact ? "10px 0 4px" : "20px 0 8px")};
  }
  h1 { font-size: ${({ compact }) => (compact ? "16px" : "22px")}; }
  h2 { font-size: ${({ compact }) => (compact ? "14px" : "19px")}; }
  h3 { font-size: ${({ compact }) => (compact ? "13px" : "17px")}; }

  /* Paragraph */
  p {
    margin: ${({ compact }) => (compact ? "4px 0" : "12px 0")};
  }

  /* Bold / italic */
  strong { font-weight: 700; color: #111827; }
  em { font-style: italic; }

  /* Inline code */
  code {
    background: #f0eeff;
    color: #6c5ce7;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: 'Fira Code', 'Consolas', monospace;
  }

  /* Code block */
  pre {
    background: #1e1e2e;
    color: #cdd6f4;
    border-radius: 8px;
    padding: 16px 20px;
    overflow-x: auto;
    margin: ${({ compact }) => (compact ? "8px 0" : "16px 0")};

    code {
      background: transparent;
      color: inherit;
      padding: 0;
      font-size: 13px;
    }
  }

  /* Blockquote */
  blockquote {
    border-left: 4px solid #6c5ce7;
    background: #f8f6ff;
    margin: ${({ compact }) => (compact ? "8px 0" : "16px 0")};
    padding: 10px 16px;
    border-radius: 0 8px 8px 0;
    color: #4b5563;
    font-style: italic;

    p { margin: 0; }
  }

  /* Lists */
  ul, ol {
    margin: ${({ compact }) => (compact ? "4px 0" : "12px 0")};
    padding-left: 24px;
  }
  li {
    margin-bottom: ${({ compact }) => (compact ? "2px" : "6px")};
  }
  /* Task list (GFM) */
  li input[type="checkbox"] {
    margin-right: 6px;
    accent-color: #6c5ce7;
  }

  /* Horizontal rule */
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: ${({ compact }) => (compact ? "10px 0" : "20px 0")};
  }

  /* Links */
  a {
    color: #6c5ce7;
    text-decoration: underline;
    text-underline-offset: 2px;
    &:hover { color: #5849e8; }
  }

  /* Tables (GFM) */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    margin: ${({ compact }) => (compact ? "8px 0" : "16px 0")};
    overflow-x: auto;
    display: block;
  }
  th {
    background: #f8f7ff;
    font-weight: 700;
    color: #6b7280;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    text-align: left;
  }
  td {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    color: #374151;
  }
  tr:nth-child(even) td { background: #faf9ff; }

  /* Images */
  img {
    max-width: 100%;
    border-radius: 8px;
    margin: ${({ compact }) => (compact ? "6px 0" : "12px 0")};
  }

  /* First / last child margin reset */
  > *:first-child { margin-top: 0; }
  > *:last-child  { margin-bottom: 0; }
`;
