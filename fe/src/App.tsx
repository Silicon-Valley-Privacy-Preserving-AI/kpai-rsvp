import styled, { createGlobalStyle } from "styled-components";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Router from "./router/Router";

const GlobalStyle = createGlobalStyle`
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
    color: #F4F4F5;
    background: #09090B;
    line-height: 1.6;
    letter-spacing: -0.01em;
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
    background: rgba(249, 115, 22, 0.25);
    color: #F4F4F5;
  }
`;

export default function App() {
  return (
    <>
      <GlobalStyle />
      <AppLayout>
        <Header />
        <AppContents>
          <Router />
        </AppContents>
        <Footer />
      </AppLayout>
    </>
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
