import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { route } from "../router/route";
import { Button, Badge } from "../components/ui";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
};

export default function MainPage() {
  const queryClient = useQueryClient();
  const isLoggedIn = !!sessionStorage.getItem("accessToken");

  const { data, isLoading } = useQuery<User>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await axiosInstance.get(api.v1.users);
      return data;
    },
    enabled: isLoggedIn,
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
        <HeroBadge>Korean Privacy-Preserving AI Forum</HeroBadge>
        <HeroTitle>
          Welcome to <Highlight>K-PAI</Highlight>
        </HeroTitle>
        <HeroSub>
          A community for researchers and practitioners in privacy-preserving AI.
          Join our seminars, connect with peers, and grow together.
        </HeroSub>

        <HeroActions>
          <Button as={Link as any} to={route.seminar} size="lg">
            Browse Seminars →
          </Button>
          {!isLoggedIn && (
            <Button as={Link as any} to={route.signup} variant="outline" size="lg">
              Join the Community
            </Button>
          )}
        </HeroActions>
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
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </>
          ) : null}
        </UserCard>
      )}

      {/* ── Feature tiles ── */}
      <TileGrid>
        <Tile to={route.seminar}>
          <TileIcon>🎓</TileIcon>
          <TileTitle>Seminars</TileTitle>
          <TileDesc>Browse and RSVP for upcoming K-PAI seminars and events.</TileDesc>
        </Tile>
        {!isLoggedIn && (
          <>
            <Tile to={route.signin}>
              <TileIcon>🔑</TileIcon>
              <TileTitle>Sign In</TileTitle>
              <TileDesc>Already a member? Sign in to manage your RSVPs.</TileDesc>
            </Tile>
            <Tile to={route.signup}>
              <TileIcon>✨</TileIcon>
              <TileTitle>Sign Up</TileTitle>
              <TileDesc>Create an account to participate in seminars.</TileDesc>
            </Tile>
          </>
        )}
        {data?.role === "staff" && (
          <Tile to={route.admin}>
            <TileIcon>⚙️</TileIcon>
            <TileTitle>Admin</TileTitle>
            <TileDesc>Manage users, seminars, and attendance records.</TileDesc>
          </Tile>
        )}
      </TileGrid>
    </Wrapper>
  );
}

// ── Styled components ─────────────────────────────────────────────────────────

const Wrapper = styled.div`
  max-width: 860px;
  margin: 0 auto;
  padding: 48px 24px 80px;

  @media (min-width: 768px) {
    padding: 72px 32px 100px;
  }
`;

const HeroSection = styled.section`
  text-align: center;
  margin-bottom: 48px;
`;

const HeroBadge = styled.span`
  display: inline-block;
  padding: 5px 16px;
  background: #ede9fe;
  color: #6c5ce7;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-bottom: 20px;
`;

const HeroTitle = styled.h1`
  font-size: 40px;
  font-weight: 900;
  color: #111827;
  letter-spacing: -0.03em;
  margin-bottom: 16px;

  @media (min-width: 768px) {
    font-size: 56px;
  }
`;

const Highlight = styled.span`
  background: linear-gradient(135deg, #6c5ce7, #a29bfe);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const HeroSub = styled.p`
  font-size: 17px;
  color: #6b7280;
  max-width: 520px;
  margin: 0 auto 32px;
  line-height: 1.7;
`;

const HeroActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`;

const UserCard = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 40px;
  box-shadow: 0 2px 12px rgba(108, 92, 231, 0.06);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6c5ce7, #a29bfe);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
`;

const UserName = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: #111827;
`;

const UserEmail = styled.div`
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
`;

const LoadingDots = styled.p`
  color: #9ca3af;
  font-size: 14px;
`;

const TileGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 560px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Tile = styled(Link)`
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 24px;
  text-decoration: none;
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;

  &:hover {
    box-shadow: 0 8px 28px rgba(108, 92, 231, 0.12);
    transform: translateY(-2px);
    border-color: #c4b5fd;
    text-decoration: none;
  }
`;

const TileIcon = styled.div`
  font-size: 28px;
  margin-bottom: 12px;
`;

const TileTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 6px;
`;

const TileDesc = styled.div`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
`;
