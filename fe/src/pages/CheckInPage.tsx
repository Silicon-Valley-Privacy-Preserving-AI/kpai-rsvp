import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import styled, { keyframes } from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";

export default function CheckInPage() {
  const { seminarId } = useParams();
  const navigate = useNavigate();

  const accessToken = sessionStorage.getItem("accessToken");

  const checkInMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.post(`/api/v1/seminars/${seminarId}/check-in`);
    },
    onSuccess: () => {
      navigate("/seminar", { state: { message: "Check-in successful! ✅" } });
    },
    onError: () => {
      alert("Check-in failed. Please try again.");
      navigate("/seminar");
    },
  });

  useEffect(() => {
    if (!seminarId) return;

    if (!accessToken) {
      navigate(`/signin?redirect=/check-in/${seminarId}`);
      return;
    }

    checkInMutation.mutate();
  }, [seminarId]);

  return (
    <Container>
      <Card>
        <LogoCircle>K-PAI</LogoCircle>
        <Spinner />
        <Title>Checking you in...</Title>
        <Description>Please wait while we process your check-in</Description>
      </Card>
    </Container>
  );
}

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

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

const Container = styled.div`
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
`;

const Card = styled.div`
  background: #ffffff;
  border-radius: 20px;
  padding: 48px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  animation: ${fadeIn} 0.6s ease-out;
  max-width: 400px;

  @media (max-width: 480px) {
    padding: 32px 24px;
  }
`;

const LogoCircle = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 32px auto;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.05em;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  margin: 0 auto 24px auto;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px 0;
`;

const Description = styled.p`
  font-size: 15px;
  color: #64748b;
  margin: 0;
`;
