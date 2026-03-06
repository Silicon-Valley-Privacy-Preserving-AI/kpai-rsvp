import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styled, { keyframes } from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { route } from "../router/route";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
};

export default function MainPage() {
  const queryClient = useQueryClient();

  const token = sessionStorage.getItem("accessToken");
  const isLoggedIn = !!token;

  const { data, isLoading, isError } = useQuery<User>({
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
    <Container>
      <HeroSection>
        <HeroContent>
          <HeroTitle>
            Silicon Valley
            <GradientText>Privacy-Preserving AI</GradientText>
            Forum
          </HeroTitle>
          <HeroDescription>
            Join our community of researchers, engineers, and innovators
            advancing the future of privacy-preserving artificial intelligence.
          </HeroDescription>

          {!isLoggedIn ? (
            <HeroActions>
              <PrimaryButton to={route.signup}>Get Started</PrimaryButton>
              <SecondaryButton to={route.signin}>Sign In</SecondaryButton>
            </HeroActions>
          ) : (
            <UserCard>
              {isLoading ? (
                <LoadingText>Loading...</LoadingText>
              ) : isError ? (
                <ErrorText>Failed to load user information</ErrorText>
              ) : data ? (
                <>
                  <UserHeader>
                    <UserAvatar>{data.username.charAt(0).toUpperCase()}</UserAvatar>
                    <UserInfo>
                      <UserName>{data.username}</UserName>
                      <UserEmail>{data.email}</UserEmail>
                    </UserInfo>
                  </UserHeader>
                  <UserRole $role={data.role}>
                    {data.role === "staff" ? "Staff Member" : "Member"}
                  </UserRole>
                  <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
                </>
              ) : null}
            </UserCard>
          )}
        </HeroContent>

        <FloatingShape style={{ top: "10%", right: "10%", animationDelay: "0s" }} />
        <FloatingShape style={{ bottom: "20%", left: "5%", animationDelay: "2s" }} />
        <FloatingShape style={{ top: "60%", right: "20%", animationDelay: "4s" }} />
      </HeroSection>

      <FeaturesSection>
        <FeatureCard>
          <FeatureIcon>📅</FeatureIcon>
          <FeatureTitle>Upcoming Seminars</FeatureTitle>
          <FeatureDescription>
            Discover and attend cutting-edge seminars on privacy-preserving AI
            technologies.
          </FeatureDescription>
          <FeatureLink to={route.seminar}>Browse Seminars →</FeatureLink>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>🎯</FeatureIcon>
          <FeatureTitle>Easy Check-in</FeatureTitle>
          <FeatureDescription>
            QR-based check-in system for seamless event attendance tracking.
          </FeatureDescription>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>🤝</FeatureIcon>
          <FeatureTitle>Join Our Community</FeatureTitle>
          <FeatureDescription>
            Connect with researchers and practitioners in the privacy-AI space.
          </FeatureDescription>
        </FeatureCard>
      </FeaturesSection>
    </Container>
  );
}

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
`;

const Container = styled.div`
  min-height: calc(100vh - 120px);
`;

const HeroSection = styled.section`
  position: relative;
  padding: 80px 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 120px 24px;
  }
`;

const HeroContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  z-index: 1;
  animation: ${fadeIn} 0.8s ease-out;
`;

const HeroTitle = styled.h1`
  font-size: 36px;
  font-weight: 800;
  line-height: 1.2;
  color: #ffffff;
  margin: 0 0 16px 0;

  @media (min-width: 768px) {
    font-size: 56px;
  }
`;

const GradientText = styled.span`
  display: block;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const HeroDescription = styled.p`
  font-size: 18px;
  line-height: 1.6;
  color: #cbd5e1;
  margin: 0 0 40px 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;

  @media (min-width: 768px) {
    font-size: 20px;
  }
`;

const HeroActions = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
`;

const PrimaryButton = styled(Link)`
  display: inline-block;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border: none;
  border-radius: 12px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
  }
`;

const SecondaryButton = styled(Link)`
  display: inline-block;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid #3b82f6;
  border-radius: 12px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    transform: translateY(-2px);
  }
`;

const UserCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  margin: 0 auto;
`;

const UserHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const UserAvatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
`;

const UserInfo = styled.div`
  flex: 1;
  text-align: left;
`;

const UserName = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
`;

const UserEmail = styled.div`
  font-size: 14px;
  color: #94a3b8;
`;

const UserRole = styled.div<{ $role: string }>`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
  background: ${(props) =>
    props.$role === "staff"
      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
      : "rgba(59, 130, 246, 0.2)"};
  color: #ffffff;
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.1);
  border: 1px solid #f43f5e;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(244, 63, 94, 0.2);
    transform: translateY(-1px);
  }
`;

const LoadingText = styled.p`
  color: #94a3b8;
  font-size: 16px;
`;

const ErrorText = styled.p`
  color: #f43f5e;
  font-size: 16px;
`;

const FloatingShape = styled.div`
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  animation: ${float} 6s ease-in-out infinite;
  pointer-events: none;
`;

const FeaturesSection = styled.section`
  max-width: 1200px;
  margin: -60px auto 80px auto;
  padding: 0 24px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  position: relative;
  z-index: 2;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const FeatureCard = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  animation: ${fadeIn} 0.8s ease-out;
  animation-fill-mode: both;

  &:nth-child(1) {
    animation-delay: 0.1s;
  }
  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.3s;
  }

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  }
`;

const FeatureIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const FeatureTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px 0;
`;

const FeatureDescription = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: #64748b;
  margin: 0 0 16px 0;
`;

const FeatureLink = styled(Link)`
  display: inline-block;
  font-size: 15px;
  font-weight: 600;
  color: #3b82f6;
  text-decoration: none;
  transition: all 0.3s ease;

  &:hover {
    color: #8b5cf6;
    transform: translateX(4px);
  }
`;
