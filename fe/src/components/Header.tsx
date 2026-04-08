import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { route } from "../router/route";
import { BREAKPOINTS } from "../utils/constants";
import { Button } from "./ui";
import { MenuIcon, XIcon, SunIcon, MoonIcon } from "./icons";
import { useTheme } from "../contexts/ThemeContext";

export default function Header() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isLoggedIn = !!sessionStorage.getItem("accessToken");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // ── Logo expand animation ────────────────────────────────────────────────
  const [logoExpanded, setLogoExpanded] = useState(false);
  const isHovering = useRef(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const INTERVAL_MS = 10_000;
    const HOLD_MS     = 2_400;

    const play = () => {
      if (isHovering.current) return;
      setLogoExpanded(true);
      collapseTimer.current = setTimeout(() => {
        if (!isHovering.current) setLogoExpanded(false);
      }, HOLD_MS);
    };

    const id = setInterval(play, INTERVAL_MS);
    return () => {
      clearInterval(id);
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  const handleLogoEnter = () => {
    isHovering.current = true;
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    setLogoExpanded(true);
  };

  const handleLogoLeave = () => {
    isHovering.current = false;
    setLogoExpanded(false);
  };

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
          <LogoContainer
            onMouseEnter={handleLogoEnter}
            onMouseLeave={handleLogoLeave}
          >
            <LogoImage src="/logo.png" alt="K-PAI Logo" />
            <LogoText>
              {LOGO_PARTS.map(({ init, rest }, i) => (
                <LogoWord key={i}>
                  <LogoInit>{init}</LogoInit>
                  {rest && (
                    <LogoSuffix
                      $expanded={logoExpanded}
                      style={{ transitionDelay: logoExpanded ? `${i * 38}ms` : "0ms" }}
                    >
                      {rest}
                    </LogoSuffix>
                  )}
                </LogoWord>
              ))}
            </LogoText>
          </LogoContainer>
        </Link>

        {/* Desktop navigation */}
        <NavRight>
          <ThemeToggle
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark"
              ? <SunIcon size={15} color="currentColor" />
              : <MoonIcon size={15} color="currentColor" />}
          </ThemeToggle>
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

        {/* Mobile: theme toggle + hamburger */}
        <MobileControls>
          <ThemeToggle
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark"
              ? <SunIcon size={15} color="currentColor" />
              : <MoonIcon size={15} color="currentColor" />}
          </ThemeToggle>
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
        </MobileControls>
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

// ── Logo word parts ───────────────────────────────────────────────────────────
// Each entry: init = always-visible initial letter(s), rest = suffix that expands
// Collapsed → "SVAIN"  |  Expanded → "Silicon Valley AI Nexus"
const LOGO_PARTS = [
  { init: "S", rest: "ilicon\u00A0" },  // trailing nbsp = word space
  { init: "V", rest: "alley\u00A0" },
  { init: "AI", rest: "\u00A0" },        // AI itself is the abbreviation; space only
  { init: "N", rest: "exus" },
] as const;

// ── Styled components ─────────────────────────────────────────────────────────

const HeaderWrapper = styled.header`
  background: var(--bg-glass);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 200;
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  transition: background 0.25s ease, border-color 0.25s ease;
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
  align-items: baseline;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text-1);
  overflow: hidden; /* clips suffixes during animation */

  @media (min-width: ${BREAKPOINTS.mobile}) {
    font-size: 22px;
  }
`;

/** One word group, e.g. <LogoInit>S</LogoInit><LogoSuffix>ilicon</LogoSuffix> */
const LogoWord = styled.span`
  display: inline-flex;
  align-items: baseline;
`;

/** Always-visible initial letter(s) — keeps the brand orange */
const LogoInit = styled.span`
  color: #F97316;
  flex-shrink: 0;
`;

/** Suffix that slides in to the right on expand */
const LogoSuffix = styled.span<{ $expanded: boolean }>`
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  color: var(--text-1);
  /* max-width drives the layout expansion; clip keeps it tidy at width:0 */
  max-width: ${({ $expanded }) => ($expanded ? "200px" : "0px")};
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  transition:
    max-width 0.52s cubic-bezier(0.16, 1, 0.3, 1),
    opacity   0.32s ease;
  vertical-align: baseline;
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
  color: var(--text-2);
  text-decoration: none;
  border-radius: 8px;
  position: relative;
  letter-spacing: -0.01em;
  transition: color 0.18s cubic-bezier(0.16,1,0.3,1), background 0.18s;

  &:hover {
    color: var(--text-1);
    background: var(--surface-hover);
    text-decoration: none;
  }
`;

const HamburgerBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--border-soft);
  color: var(--text-2);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--surface-active);
    color: var(--text-1);
  }

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: none;
  }
`;

const MobileMenu = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
  background: var(--bg-glass);
  padding: 8px 0 20px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: none;
  }
`;

const MobileNavLink = styled(Link)`
  padding: 13px 24px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-2);
  text-decoration: none;
  border-bottom: 1px solid var(--surface-hover);
  transition: background 0.12s, color 0.12s;
  letter-spacing: -0.01em;

  &:last-of-type { border-bottom: none; }
  &:hover { background: rgba(249,115,22,0.06); color: #F97316; }
`;

const MobileActionRow = styled.div`
  padding: 14px 24px 0;
`;

/** Sun / Moon icon button — shared between desktop NavRight and mobile bar */
const ThemeToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--surface-hover);
  color: var(--text-2);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.18s, color 0.18s, border-color 0.18s;

  &:hover {
    background: var(--surface-active);
    color: #F97316;
    border-color: rgba(249,115,22,0.3);
  }
`;

/** Wraps ThemeToggle + HamburgerBtn on mobile; hidden on desktop */
const MobileControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    display: none;
  }
`;
