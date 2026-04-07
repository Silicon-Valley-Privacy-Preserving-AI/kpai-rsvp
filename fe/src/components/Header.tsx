import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { route } from "../router/route";
import { BREAKPOINTS } from "../utils/constants";
import { Button } from "./ui";
import { MenuIcon, XIcon } from "./icons";

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
          {mobileMenuOpen
            ? <XIcon size={18} color="currentColor" />
            : <MenuIcon size={18} color="currentColor" />
          }
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
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid rgba(228, 228, 231, 0.7);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
`;

const Inner = styled.div`
  max-width: 1280px;
  width: 100%;
  height: 62px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    height: 68px;
    padding: 0 40px;
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
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #18181b;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    font-size: 24px;
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


const HamburgerBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  background: transparent;
  color: #52525b;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: #f4f4f5;
    color: #18181b;
  }

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: none;
  }
`;

const MobileMenu = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(228, 228, 231, 0.7);
  background: rgba(255, 255, 255, 0.96);
  padding: 8px 0 16px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: none;
  }
`;

const MobileNavLink = styled(Link)`
  padding: 13px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #3f3f46;
  text-decoration: none;
  border-bottom: 1px solid #f4f4f5;
  transition: background 0.12s, color 0.12s;
  letter-spacing: -0.01em;

  &:last-of-type {
    border-bottom: none;
  }

  &:hover {
    background: #f0fdff;
    color: #0e7490;
  }
`;

const MobileActionRow = styled.div`
  padding: 12px 24px 0;
`;

const NavLink = styled(Link)`
  padding: 6px 4px;
  font-size: 14px;
  font-weight: 500;
  color: #71717a;
  text-decoration: none;
  position: relative;
  letter-spacing: -0.01em;
  transition: color 0.18s cubic-bezier(0.16, 1, 0.3, 1);

  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 1.5px;
    background: #0e7490;
    border-radius: 2px;
    transform: scaleX(0);
    transform-origin: center;
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  &:hover {
    color: #18181b;
    text-decoration: none;
    &::after { transform: scaleX(1); }
  }
`;

const NavRight = styled.nav`
  display: none;
  align-items: center;
  gap: 20px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: flex;
  }
`;
