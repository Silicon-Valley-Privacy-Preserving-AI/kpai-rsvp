import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import styled from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { Spinner } from "../components/ui";

export default function CheckInPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const accessToken = sessionStorage.getItem("accessToken");

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(api.v1.checkIn, { token });
      return res.data;
    },
    onSuccess: (data) => {
      navigate(`/seminar/${data.seminar_id}`);
    },
    onError: (e: any) => {
      alert(e.response?.data?.detail ?? "Check-in failed");
      navigate("/seminar");
    },
  });

  useEffect(() => {
    if (!token) {
      alert("Invalid check-in link.");
      navigate("/seminar");
      return;
    }
    if (!accessToken) {
      const redirect = encodeURIComponent(`/check-in?token=${token}`);
      navigate(`/signin?redirect=${redirect}`);
      return;
    }
    checkInMutation.mutate();
  }, [token]);

  return (
    <Wrap>
      <Card>
        <Spinner />
        <Title>Processing Check-in</Title>
        <Sub>Please wait a moment…</Sub>
      </Card>
    </Wrap>
  );
}

// ── Styled components ─────────────────────────────────────────────────────────

const Wrap = styled.div`
  min-height: calc(100vh - 128px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Card = styled.div`
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 48px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
  min-width: 280px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: var(--text-1);
  letter-spacing: -0.02em;
`;

const Sub = styled.p`
  font-size: 14px;
  color: var(--text-2);
`;
