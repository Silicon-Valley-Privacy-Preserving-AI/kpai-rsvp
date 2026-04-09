import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styled, { css, keyframes } from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { route } from "../router/route";
import { Button, Badge } from "../components/ui";
import {
  GraduationCapIcon, KeyIcon, SparklesIcon, SettingsIcon,
  ArrowRightIcon, CalendarIcon, UsersIcon, UserIcon,
} from "../components/icons";
import type { SeminarResponse, SeminarDetailResponse } from "../types/seminar";
import { tzAbbr } from "../utils/datetime";
import { BROWSER_TZ } from "../utils/constants";
import { links } from "../utils/links";

type User = { id: number; username: string; email: string; role: string; };

/** Find the soonest seminar whose start_time is in the future. */
function findNextSeminar(seminars: SeminarResponse[]): SeminarResponse | null {
  const now = new Date();
  return (
    [...seminars]
      .filter((s) => s.start_time && new Date(s.start_time) > now)
      .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime())[0]
    ?? null
  );
}

/** Compact date + optional location line for the preview card. */
function formatPreviewDate(seminar: SeminarResponse): string {
  const tz = seminar.display_timezone ?? BROWSER_TZ;
  const d = new Date(seminar.start_time!);
  const dateStr = d.toLocaleDateString("en-US", {
    timeZone: tz, month: "short", day: "numeric", year: "numeric",
  });
  const abbr = tzAbbr(tz, d);
  return seminar.location
    ? `${dateStr} · ${seminar.location}`
    : `${dateStr} · ${abbr}`;
}

// ── Orbital SVG hero visual ───────────────────────────────────────────────────

function OrbitalSystem() {
  return (
    <svg
      viewBox="0 0 380 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: "100%", maxWidth: 360, height: "auto", overflow: "visible" }}
    >
      <defs>
        <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="core-glow" x="-80%" y="-80%" width="360%" height="360%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="ambient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient glow */}
      <circle cx="190" cy="190" r="150" fill="url(#ambient)" />
      <circle cx="190" cy="190" r="90"  fill="rgba(249,115,22,0.05)" />

      {/* ── Ring 1: Equatorial (0°) ── */}
      <ellipse cx="190" cy="190" rx="155" ry="58"
        stroke="rgba(249,115,22,0.38)" strokeWidth="1.5" />
      {/* Dot on ring 1 */}
      <circle cx="190" cy="132" r="7" fill="#F97316" filter="url(#dot-glow)">
        <animateTransform attributeName="transform" type="rotate"
          from="0 190 190" to="360 190 190" dur="9s" repeatCount="indefinite" />
      </circle>

      {/* ── Ring 2: Tilted 60° ── */}
      <g transform="rotate(60 190 190)">
        <ellipse cx="190" cy="190" rx="155" ry="58"
          stroke="rgba(249,115,22,0.28)" strokeWidth="1.5" />
        <circle cx="190" cy="132" r="5.5" fill="#FB923C" opacity="0.92" filter="url(#dot-glow)">
          <animateTransform attributeName="transform" type="rotate"
            from="360 190 190" to="0 190 190" dur="11s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* ── Ring 3: Tilted -60° ── */}
      <g transform="rotate(-60 190 190)">
        <ellipse cx="190" cy="190" rx="155" ry="58"
          stroke="rgba(249,115,22,0.20)" strokeWidth="1.5" />
        <circle cx="190" cy="132" r="4.5" fill="#FDBA74" opacity="0.85" filter="url(#dot-glow)">
          <animateTransform attributeName="transform" type="rotate"
            from="0 190 190" to="360 190 190" dur="7s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* ── Nucleus ── */}
      <circle cx="190" cy="190" r="22" fill="rgba(249,115,22,0.18)" filter="url(#core-glow)" />
      <circle cx="190" cy="190" r="13" fill="#F97316" />
      <circle cx="190" cy="190" r="7"  fill="#FED7AA" />
    </svg>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export default function MainPage() {
  const queryClient = useQueryClient();
  const isLoggedIn = !!sessionStorage.getItem("accessToken");

  const { data, isLoading } = useQuery<User>({
    queryKey: ["me"],
    queryFn: async () => { const { data } = await axiosInstance.get(api.v1.users); return data; },
    enabled: isLoggedIn,
  });

  // ── Public platform stats ────────────────────────────────────────────────
  const { data: stats } = useQuery<{ seminar_count: number; member_count: number }>({
    queryKey: ["stats"],
    queryFn: async () => { const { data } = await axiosInstance.get(api.v1.stats); return data; },
    staleTime: 5 * 60_000,
  });

  // ── Next seminar: list → nearest upcoming ────────────────────────────────
  const { data: seminars = [], isLoading: seminarsLoading } = useQuery<SeminarResponse[]>({
    queryKey: ["seminars"],
    queryFn: async () => { const { data } = await axiosInstance.get(api.v1.seminars); return data; },
    staleTime: 60_000,
  });

  const nextSeminar = findNextSeminar(seminars);

  // Fetch detail only when we know which seminar is next (for RSVP count)
  const { data: nextDetail } = useQuery<SeminarDetailResponse>({
    queryKey: ["seminar", nextSeminar?.id],
    queryFn: async () => {
      const { data } = await axiosInstance.get(api.v1.seminarDetail(nextSeminar!.id));
      return data;
    },
    enabled: !!nextSeminar,
    staleTime: 60_000,
  });

  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    queryClient.removeQueries({ queryKey: ["me"] });
    window.location.reload();
  };

  return (
    <Wrapper>
      {/* ── Hero ── */}
      <HeroSection>
        <HeroContent>
          <HeroBadge>Silicon Valley AI Forum</HeroBadge>
          <HeroTitle>
            Where Innovation<br />Meets Intelligence.
          </HeroTitle>
          <HeroSub>
            SVAIN connects researchers and practitioners building
            the next generation of privacy-preserving AI systems.
            Join seminars. Build connections. Drive the field forward.
          </HeroSub>
          <HeroActions>
            <Button as={Link as any} to={route.seminar} size="lg">
              Browse Seminars
              <ArrowRightIcon size={16} color="currentColor" />
            </Button>
            {!isLoggedIn && (
              <Button as={Link as any} to={route.signup} variant="outline" size="lg">
                Join the Forum
              </Button>
            )}
          </HeroActions>

          {/* Live stat strip */}
          <StatStrip>
            <Stat>
              <StatNumber>{stats?.seminar_count ?? "—"}</StatNumber>
              <StatLabel>Seminars hosted</StatLabel>
            </Stat>
            <StatDiv />
            <Stat>
              <StatNumber>{stats?.member_count ?? "—"}</StatNumber>
              <StatLabel>Members</StatLabel>
            </Stat>
            <StatDiv />
            <Stat>
              <StatNumber>Silicon Valley</StatNumber>
              <StatLabel>Based in</StatLabel>
            </Stat>
          </StatStrip>
        </HeroContent>

        <HeroVisual>
          <OrbitalWrap>
            <OrbitalSystem />
          </OrbitalWrap>

          {/* Floating preview card — real data */}
          <PreviewCard>
            <PreviewLabel>
              <PulseDot />
              Next Seminar
            </PreviewLabel>

            {seminarsLoading ? (
              <>
                <PreviewSkeleton style={{ width: "90%", marginBottom: 6 }} />
                <PreviewSkeleton style={{ width: "70%" }} />
                <PreviewSkeletonMeta />
                <PreviewSkeletonMeta />
                <PreviewSkeletonBtn />
              </>
            ) : !nextSeminar ? (
              <PreviewEmpty>No upcoming seminars scheduled.</PreviewEmpty>
            ) : (
              <>
                <PreviewTitle>{nextSeminar.title}</PreviewTitle>
                <PreviewMeta>
                  <CalendarIcon size={14} color="var(--text-2)" />
                  {formatPreviewDate(nextSeminar)}
                </PreviewMeta>
                {nextDetail != null && (
                  <PreviewMeta>
                    <UsersIcon size={14} color="var(--text-2)" />
                    {nextDetail.current_rsvp_count} attending
                    {nextSeminar.max_capacity != null && ` / ${nextSeminar.max_capacity}`}
                  </PreviewMeta>
                )}
                <PreviewRsvp
                  as={Link as any}
                  to={`/seminar/${nextSeminar.id}`}
                >
                  RSVP Now
                </PreviewRsvp>
              </>
            )}
          </PreviewCard>
        </HeroVisual>
      </HeroSection>

      {/* ── User card ── */}
      {isLoggedIn && (
        <UserCard>
          {isLoading ? (
            <LoadingDots>Loading…</LoadingDots>
          ) : data ? (
            <>
              <UserInfo>
                <Avatar>{data.username.charAt(0).toUpperCase()}</Avatar>
                <div>
                  <UserName>{data.username}</UserName>
                  <UserEmail>{data.email}</UserEmail>
                  <div style={{ marginTop: 6 }}>
                    <Badge color={data.role === "staff" ? "purple" : "green"}>
                      {data.role === "staff" ? "Staff" : "Member"}
                    </Badge>
                  </div>
                </div>
              </UserInfo>
              <Button variant="ghost" size="sm" onClick={handleLogout}>Sign Out</Button>
            </>
          ) : null}
        </UserCard>
      )}

      {/* ── Feature tiles ── */}
      <TileSection>
        <TileSectionLabel>Quick Access</TileSectionLabel>
        {/* tileCount drives grid columns + row-spanning so there's never an empty gap */}
        {/* not-logged-in: +Sign In+About SVAIN | member: +My Page+About SVAIN | staff: +My Page+Admin */}
        {(() => {
          const showAbout = !isLoggedIn || data?.role === "member";
          const tileCount = 1 + (!isLoggedIn ? 1 : 0) + (isLoggedIn ? 1 : 0) + (data?.role === "staff" ? 1 : 0) + (showAbout ? 1 : 0);
          return (
            <TileGrid $cols={tileCount >= 2 ? 2 : 1}>
              <FeaturedTile to={route.seminar} $spanRows={tileCount >= 3}>
                <TileIconWrap>
                  <GraduationCapIcon size={22} color="#F97316" />
                </TileIconWrap>
                <div>
                  <TileTitle>Seminars</TileTitle>
                  <TileDesc>Browse and RSVP for upcoming research talks and community events.</TileDesc>
                </div>
                <TileArrow>
                  <ArrowRightIcon size={16} color="#F97316" />
                </TileArrow>
              </FeaturedTile>

              {!isLoggedIn && (
                <Tile to={route.signin}>
                  <TileIconWrap small>
                    <KeyIcon size={18} color="#F97316" />
                  </TileIconWrap>
                  <TileTitle>Sign In</TileTitle>
                  <TileDesc>Access your RSVPs and profile.</TileDesc>
                </Tile>
              )}

              {isLoggedIn && (
                <Tile to={route.mypage}>
                  <TileIconWrap small>
                    <UserIcon size={18} color="#F97316" />
                  </TileIconWrap>
                  <TileTitle>My Page</TileTitle>
                  <TileDesc>View your profile, RSVPs, and membership status.</TileDesc>
                </Tile>
              )}

              {data?.role === "staff" && (
                <Tile to={route.admin}>
                  <TileIconWrap small>
                    <SettingsIcon size={18} color="#F97316" />
                  </TileIconWrap>
                  <TileTitle>Admin</TileTitle>
                  <TileDesc>Manage users, seminars, and attendance.</TileDesc>
                </Tile>
              )}

              {showAbout && (
                <ExternalTile href={links.github_page} target="_blank" rel="noopener noreferrer">
                  <TileIconWrap small>
                    <SparklesIcon size={18} color="#F97316" />
                  </TileIconWrap>
                  <TileTitle>About SVAIN</TileTitle>
                  <TileDesc>Learn more about our community, mission, and research focus.</TileDesc>
                </ExternalTile>
              )}
            </TileGrid>
          );
        })()}
      </TileSection>
    </Wrapper>
  );
}

// ── Animations ────────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(-1deg); }
  50%       { transform: translateY(-10px) rotate(1deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.85); }
`;

// ── Styled components ─────────────────────────────────────────────────────────

const Wrapper = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 20px 80px;

  @media (min-width: 768px) {
    padding: 0 40px 100px;
  }
`;

// ── Hero ──────────────────────────────────────────────────────────────────────

const HeroSection = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
  padding: 64px 0 72px;
  align-items: center;

  @media (min-width: 900px) {
    grid-template-columns: 55fr 45fr;
    gap: 48px;
    padding: 88px 0 96px;
  }
`;

const HeroContent = styled.div`
  animation: ${fadeUp} 0.7s cubic-bezier(0.16,1,0.3,1) both;
`;

const HeroBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background: rgba(249,115,22,0.1);
  color: #F97316;
  border: 1px solid rgba(249,115,22,0.25);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 28px;
`;

const HeroTitle = styled.h1`
  font-size: 44px;
  font-weight: 800;
  color: var(--text-1);
  letter-spacing: -0.05em;
  line-height: 1.0;
  margin-bottom: 22px;
  animation: ${fadeUp} 0.7s 0.08s cubic-bezier(0.16,1,0.3,1) both;

  @media (min-width: 768px) {
    font-size: 58px;
  }
`;

const HeroSub = styled.p`
  font-size: 16px;
  color: var(--text-2);
  max-width: 460px;
  margin: 0 0 32px;
  line-height: 1.7;
  letter-spacing: -0.01em;
  animation: ${fadeUp} 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both;
`;

const HeroActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 40px;
  animation: ${fadeUp} 0.7s 0.22s cubic-bezier(0.16,1,0.3,1) both;
`;

const StatStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  animation: ${fadeUp} 0.7s 0.30s cubic-bezier(0.16,1,0.3,1) both;
`;

const Stat = styled.div``;

const StatNumber = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: var(--text-1);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: var(--text-3);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-top: 2px;
`;

const StatDiv = styled.div`
  width: 1px;
  height: 28px;
  background: var(--surface-active);
  flex-shrink: 0;
`;

// ── Hero Visual ───────────────────────────────────────────────────────────────

const HeroVisual = styled.div`
  display: none;
  position: relative;
  align-items: center;
  justify-content: center;
  min-height: 360px;

  @media (min-width: 900px) {
    display: flex;
  }
`;

const OrbitalWrap = styled.div`
  width: 100%;
  max-width: 340px;
`;

const PreviewCard = styled.div`
  position: absolute;
  bottom: 16px;
  right: -8px;
  background: rgba(26, 26, 30, 0.68);
  html[data-theme="light"] & {
    background: rgba(235, 235, 237, 0.72);
  }
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  padding: 22px 24px;
  width: 280px;
  box-shadow: 0 20px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(249,115,22,0.08);
  animation: ${float} 7s ease-in-out infinite;
`;

const PreviewLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #F97316;
  margin-bottom: 10px;
`;

const PulseDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #F97316;
  display: inline-block;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const PreviewTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: var(--text-1);
  letter-spacing: -0.02em;
  line-height: 1.35;
  margin-bottom: 10px;
`;

const PreviewMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--text-3);
  margin-bottom: 4px;
`;

const PreviewRsvp = styled.div`
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  margin-top: 14px;
  background: #F97316;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.01em;
`;

const shimmerBase = css`
  background: linear-gradient(
    90deg,
    var(--border-soft) 25%,
    rgba(255,255,255,0.09) 50%,
    var(--border-soft) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.6s linear infinite;
  border-radius: 5px;
`;

const PreviewSkeleton = styled.div`
  ${shimmerBase}
  height: 13px;
  margin-bottom: 8px;
  width: 100%;
`;

const PreviewSkeletonMeta = styled.div`
  ${shimmerBase}
  height: 10px;
  width: 65%;
  margin-bottom: 6px;
`;

const PreviewSkeletonBtn = styled.div`
  ${shimmerBase}
  height: 28px;
  width: 80px;
  margin-top: 14px;
  border-radius: 7px;
`;

const PreviewEmpty = styled.p`
  font-size: 12px;
  color: var(--text-3);
  margin: 4px 0 0;
  line-height: 1.5;
`;

// ── User card ─────────────────────────────────────────────────────────────────

const UserCard = styled.div`
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 48px;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Avatar = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #F97316;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 800;
  flex-shrink: 0;
  letter-spacing: -0.02em;
`;

const UserName = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: var(--text-1);
  letter-spacing: -0.02em;
`;

const UserEmail = styled.div`
  font-size: 13px;
  color: var(--text-2);
  margin-top: 1px;
`;

const LoadingDots = styled.p`
  color: var(--text-3);
  font-size: 14px;
`;

// ── Tile grid ─────────────────────────────────────────────────────────────────

const TileSection = styled.div``;

const TileSectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 16px;
`;

const TileGrid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: 560px) {
    grid-template-columns: ${({ $cols = 2 }) => $cols >= 2 ? "repeat(2, 1fr)" : "1fr"};
  }
`;

const baseTileCSS = `
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 16px;
  text-decoration: none;
  transition: border-color 0.22s cubic-bezier(0.16,1,0.3,1), background 0.22s, transform 0.22s cubic-bezier(0.16,1,0.3,1);

  &:hover {
    border-color: rgba(249,115,22,0.3);
    background: rgba(249,115,22,0.04);
    transform: translateY(-2px);
    text-decoration: none;
  }
`;

const FeaturedTile = styled(Link)<{ $spanRows?: boolean }>`
  ${baseTileCSS}
  padding: 24px 24px;
  grid-column: 1 / -1;

  @media (min-width: 560px) {
    grid-column: auto;
    grid-row: ${({ $spanRows }) => $spanRows ? "span 2" : "auto"};
    padding: 28px;
    flex-direction: column;
    gap: 18px;
  }
`;

const Tile = styled(Link)`
  ${baseTileCSS}
  padding: 20px 22px;
  flex-direction: row;
  align-items: center;
`;

const ExternalTile = styled.a`
  ${baseTileCSS}
  padding: 20px 22px;
  flex-direction: row;
  align-items: center;
`;

const TileIconWrap = styled.div<{ small?: boolean }>`
  width: ${({ small }) => small ? "36px" : "42px"};
  height: ${({ small }) => small ? "36px" : "42px"};
  border-radius: ${({ small }) => small ? "10px" : "12px"};
  background: rgba(249,115,22,0.1);
  border: 1px solid rgba(249,115,22,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const TileTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: var(--text-1);
  margin-bottom: 5px;
  letter-spacing: -0.02em;
`;

const TileDesc = styled.div`
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.55;
  letter-spacing: -0.01em;
`;

const TileArrow = styled.div`
  margin-top: auto;
  display: flex;
  align-items: center;
`;
