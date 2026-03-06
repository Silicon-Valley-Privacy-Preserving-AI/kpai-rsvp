import styled from "styled-components";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Router from "./router/Router";

export default function App() {
  return (
    <AppLayout>
      <Header />
      <AppContents>
        <Router />
      </AppContents>
      <Footer />
    </AppLayout>
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
