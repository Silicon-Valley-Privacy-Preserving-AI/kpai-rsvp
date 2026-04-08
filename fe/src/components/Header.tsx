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
            <LogoText>
              <LogoAccent>SVAIN</LogoAccent>
            </LogoText>
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
                Join Forum
              </Button>
            </>
          )}
        </NavRight>

        {/* Mobile hamburger */}
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

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <MobileMenu>
          <MobileNavLink to={route.seminar} onClick={closeMobileMenu}>Seminars</MobileNavLink>
          {me?.role === "staff" && (
            <MobileNavLink to={route.admin} onClick={closeMobileMenu}>Admin</MobileNavLink>
          )}
          {isLoggedIn ? (
            <>
              <MobileNavLink to={route.mypage} onClick={closeMobileMenu}>My Page</MobileNavLink>
              <MobileActionRow>
                <Button variant="ghost" fullWidth onClick={() => { handleLogout(); closeMobileMenu(); }}>
                  Sign Out
                </Button>
              </MobileActionRow>
            </>
          ) : (
            <>
              <MobileNavLink to={route.signin} onClick={closeMobileMenu}>Sign In</MobileNavLink>
              <MobileActionRow>
                <Button as={Link as any} to={route.signup} variant="primary" fullWidth onClick={closeMobileMenu}>
                  Join Forum
                </Button>
              </MobileActionRow>
            </>
          )}
        </MobileMenu>
      )}
    </HeaderWrapper>
  );
}

// ── Styled components ─────────────────────────────────────────────────────────

const HeaderWrapper = styled.header`
  background: rgba(9, 9, 11, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  position: sticky;
  top: 0;
  z-index: 200;
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
`;

const Inner = styled.div`
  max-width: 1280px;
  width: 100%;
  height: 64px;
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
  gap: 10px;
  cursor: pointer;
  transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
`;

const LogoImage = styled.img`
  height: 30px;
  width: auto;
  object-fit: contain;
  border-radius: 50%;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    height: 34px;
  }
`;

const LogoText = styled.div`
  display: inline-flex;
  align-items: center;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #F4F4F5;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    font-size: 22px;
  }
`;

const LogoAccent = styled.span`
  color: #F97316;
`;

const NavRight = styled.nav`
  display: none;
  align-items: center;
  gap: 4px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: flex;
    gap: 2px;
  }
`;

const NavLink = styled(Link)`
  padding: 7px 13px;
  font-size: 14px;
  font-weight: 500;
  color: #A1A1AA;
  text-decoration: none;
  border-radius: 8px;
  position: relative;
  letter-spacing: -0.01em;
  transition: color 0.18s cubic-bezier(0.16,1,0.3,1), background 0.18s;

  &:hover {
    color: #F4F4F5;
    background: rgba(255,255,255,0.05);
    text-decoration: none;
  }
`;

const HamburgerBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  color: #A1A1AA;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(255,255,255,0.08);
    color: #F4F4F5;
  }

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: none;
  }
`;

const MobileMenu = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(255,255,255,0.07);
  background: rgba(9,9,11,0.97);
  padding: 8px 0 20px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: none;
  }
`;

const MobileNavLink = styled(Link)`
  padding: 13px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #A1A1AA;
  text-decoration: none;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  transition: background 0.12s, color 0.12s;
  letter-spacing: -0.01em;

  &:last-of-type { border-bottom: none; }
  &:hover { background: rgba(249,115,22,0.06); color: #F97316; }
`;

const MobileActionRow = styled.div`
  padding: 14px 24px 0;
`;
