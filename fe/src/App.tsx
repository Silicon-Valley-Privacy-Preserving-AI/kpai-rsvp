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
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 15px;
    color: #111827;
    background: #f8f7ff;
    line-height: 1.6;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    line-height: 1.3;
  }

  p { margin: 0; }

  a {
    color: #6c5ce7;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  input, textarea, select, button {
    font-family: inherit;
  }

  img { display: block; }
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
