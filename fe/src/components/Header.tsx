import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { route } from "../router/route";
import { BREAKPOINTS } from "../utils/constants";
import { Button } from "./ui";

export default function Header() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isLoggedIn = !!sessionStorage.getItem("accessToken");

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await axiosInstance.get(api.v1.users);
      return res.data;
    },
    enabled: isLoggedIn,
    retry: false,
  });

  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    queryClient.removeQueries({ queryKey: ["me"] });
    navigate("/");
    window.location.reload();
  };

  return (
    <HeaderWrapper>
      <Inner>
        <Link to="/" style={{ textDecoration: "none" }}>
          <LogoContainer>
            <LogoImage src="/logo.png" alt="K-PAI Logo" />
            <LogoWrapper>
              <LetterGroup>
                <Letter>K</Letter>
                <ExpandedWord>orean</ExpandedWord>
              </LetterGroup>
              <Separator>-</Separator>
              <LetterGroup>
                <Letter>P</Letter>
                <ExpandedWord>rivacy Preserving</ExpandedWord>
              </LetterGroup>
              <DynamicSpacer />
              <LetterGroup>
                <Letter>AI</Letter>
              </LetterGroup>
              <Spacer />
              <LetterGroup>
                <ExpandedWord>Forum</ExpandedWord>
              </LetterGroup>
            </LogoWrapper>
          </LogoContainer>
        </Link>

        <NavRight>
          <NavLink to={route.seminar}>Seminars</NavLink>
          {me?.role === "staff" && (
            <NavLink to={route.admin}>Admin</NavLink>
          )}
          {isLoggedIn ? (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          ) : (
            <>
              <NavLink to={route.signin}>Sign In</NavLink>
              <Button
                as={Link as any}
                to={route.signup}
                variant="primary"
                size="sm"
              >
                Sign Up
              </Button>
            </>
          )}
        </NavRight>
      </Inner>
    </HeaderWrapper>
  );
}

const HeaderWrapper = styled.header`
  height: 60px;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);

  @media (min-width: ${BREAKPOINTS.mobile}) {
    height: 68px;
  }
`;

const Inner = styled.div`
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    padding: 0 32px;
  }
`;

const LogoContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    gap: 16px;
  }
`;

const LogoImage = styled.img`
  height: 32px;
  width: auto;
  object-fit: contain;
  transition: transform 0.35s ease;
  border-radius: 50%;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    height: 40px;
  }

  @media (hover: hover) {
    ${LogoContainer}:hover & {
      transform: scale(1.05);
    }
  }
`;

const LogoWrapper = styled.div`
  display: inline-flex;
  align-items: flex-end;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #111827;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    font-size: 26px;
  }
`;

const LetterGroup = styled.div`
  display: inline-flex;
  align-items: flex-end;
  position: relative;
`;

const Letter = styled.span`
  transition: opacity 0.35s ease;

  @media (hover: hover) {
    ${LogoContainer}:hover & {
      opacity: 0.6;
    }
  }
`;

const Separator = styled.span`
  transition: opacity 0.35s ease;

  @media (hover: hover) {
    ${LogoContainer}:hover & {
      opacity: 0.6;
    }
  }
`;

const Spacer = styled.span`
  width: 6px;
  @media (min-width: ${BREAKPOINTS.mobile}) { width: 8px; }
`;

const DynamicSpacer = styled.span`
  width: 0;
  transition: width 0.35s ease;

  @media (hover: hover) {
    ${LogoContainer}:hover & { width: 8px; }
  }

  @media (min-width: ${BREAKPOINTS.mobile}) and (hover: hover) {
    ${LogoContainer}:hover & { width: 12px; }
  }
`;

const ExpandedWord = styled.span`
  margin-bottom: 2px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
  opacity: 0;
  max-width: 0;
  transition: opacity 0.35s ease, max-width 0.35s ease;

  @media (min-width: ${BREAKPOINTS.mobile}) { font-size: 18px; }

  @media (hover: hover) {
    ${LogoContainer}:hover & {
      opacity: 1;
      max-width: 200px;
    }
  }
`;

const NavRight = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    gap: 8px;
  }
`;

const NavLink = styled(Link)`
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  text-decoration: none;
  border-radius: 8px;
  transition: color 0.15s, background 0.15s;

  &:hover {
    color: #111827;
    background: #f3f4f6;
    text-decoration: none;
  }
`;
