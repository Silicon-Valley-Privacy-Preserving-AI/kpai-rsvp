import { useState } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <HeaderWrapper>
      <Inner>
        <Link to="/" style={{ textDecoration: "none" }} onClick={closeMobileMenu}>
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

        {/* Desktop navigation */}
        <NavRight>
          <NavLink to={route.seminar}>Seminars</NavLink>
          {me?.role === "staff" && (
            <NavLink to={route.admin}>Admin</NavLink>
          )}
          {isLoggedIn ? (
            <>
              <NavLink to={route.mypage}>My Page</NavLink>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </>
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

        {/* Mobile hamburger button */}
        <HamburgerBtn
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </HamburgerBtn>
      </Inner>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <MobileMenu>
          <MobileNavLink to={route.seminar} onClick={closeMobileMenu}>
            Seminars
          </MobileNavLink>
          {me?.role === "staff" && (
            <MobileNavLink to={route.admin} onClick={closeMobileMenu}>
              Admin
            </MobileNavLink>
          )}
          {isLoggedIn ? (
            <>
              <MobileNavLink to={route.mypage} onClick={closeMobileMenu}>
                My Page
              </MobileNavLink>
              <MobileActionRow>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => { handleLogout(); closeMobileMenu(); }}
                >
                  Sign Out
                </Button>
              </MobileActionRow>
            </>
          ) : (
            <>
              <MobileNavLink to={route.signin} onClick={closeMobileMenu}>
                Sign In
              </MobileNavLink>
              <MobileActionRow>
                <Button
                  as={Link as any}
                  to={route.signup}
                  variant="primary"
                  fullWidth
                  onClick={closeMobileMenu}
                >
                  Sign Up
                </Button>
              </MobileActionRow>
            </>
          )}
        </MobileMenu>
      )}
    </HeaderWrapper>
  );
}

const HeaderWrapper = styled.header`
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
`;

const Inner = styled.div`
  max-width: 1200px;
  width: 100%;
  height: 60px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    height: 68px;
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
  display: none;
  align-items: center;
  gap: 4px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: flex;
    gap: 8px;
  }
`;

const HamburgerBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: transparent;
  font-size: 18px;
  color: #374151;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;

  &:hover {
    background: #f3f4f6;
  }

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: none;
  }
`;

const MobileMenu = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 8px 0 16px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: none;
  }
`;

const MobileNavLink = styled(Link)`
  padding: 13px 20px;
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  text-decoration: none;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.12s, color 0.12s;

  &:last-of-type {
    border-bottom: none;
  }

  &:hover {
    background: #f5f3ff;
    color: #6c5ce7;
  }
`;

const MobileActionRow = styled.div`
  padding: 12px 16px 0;
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
