import styled, { createGlobalStyle } from "styled-components";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Router from "./router/Router";
import { ThemeProvider } from "./contexts/ThemeContext";

const GlobalStyle = createGlobalStyle`
  /* ── CSS design tokens ───────────────────────────────────────────────────── */

  :root, [data-theme="dark"] {
    /* Surfaces */
    --bg:             #09090B;
    --surface:        #111113;
    --surface-2:      #1A1A1E;
    --surface-3:      rgba(255,255,255,0.03);
    --surface-hover:  rgba(255,255,255,0.05);
    --surface-active: rgba(255,255,255,0.08);
    --surface-shimmer:#222228;
    --bg-glass:       rgba(9,9,11,0.85);
    /* Borders */
    --border:         rgba(255,255,255,0.07);
    --border-strong:  rgba(255,255,255,0.10);
    --border-soft:    rgba(255,255,255,0.04);
    /* Text */
    --text-1:         #F4F4F5;
    --text-2:         #A1A1AA;
    --text-3:         #71717A;
    /* Selection */
    --selection-bg:   rgba(249,115,22,0.25);
    --selection-text: #F4F4F5;
    color-scheme: dark;
  }

  [data-theme="light"] {
    /* Surfaces */
    --bg:             #F5F5F7;
    --surface:        #FFFFFF;
    --surface-2:      #EBEBED;
    --surface-3:      rgba(0,0,0,0.03);
    --surface-hover:  rgba(0,0,0,0.04);
    --surface-active: rgba(0,0,0,0.07);
    --surface-shimmer:#DCDCDE;
    --bg-glass:       rgba(245,245,247,0.90);
    /* Borders */
    --border:         rgba(0,0,0,0.09);
    --border-strong:  rgba(0,0,0,0.14);
    --border-soft:    rgba(0,0,0,0.05);
    /* Text */
    --text-1:         #111113;
    --text-2:         #52525B;
    --text-3:         #71717A;
    /* Selection */
    --selection-bg:   rgba(249,115,22,0.20);
    --selection-text: #111113;
    color-scheme: light;
  }

  /* ── Resets ──────────────────────────────────────────────────────────────── */

  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
    font-size: 15px;
    color: var(--text-1);
    background: var(--bg);
    line-height: 1.6;
    letter-spacing: -0.01em;
    transition: background 0.25s ease, color 0.25s ease;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    line-height: 1.1;
    letter-spacing: -0.03em;
  }

  p { margin: 0; }

  a {
    color: #F97316;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  input, textarea, select, button {
    font-family: inherit;
    letter-spacing: inherit;
  }

  img { display: block; }

  ::selection {
    background: var(--selection-bg);
    color: var(--selection-text);
  }
`;

export default function App() {
  return (
    <ThemeProvider>
      <GlobalStyle />
      <AppLayout>
        <Header />
        <AppContents>
          <Router />
        </AppContents>
        <Footer />
      </AppLayout>
    </ThemeProvider>
  );
}

const AppLayout = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const AppContents = styled.main`
  flex: 1;
`;
