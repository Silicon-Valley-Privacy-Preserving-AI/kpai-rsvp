import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";

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
      alert("체크인 완료 ✅");
      navigate(`/seminar/${data.seminar_id}`);
    },
    onError: (e: any) => {
      alert(e.response?.data?.detail ?? "체크인 실패");
      navigate("/seminar");
    },
  });

  useEffect(() => {
    if (!token) {
      alert("유효하지 않은 체크인 링크입니다.");
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
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>체크인 처리 중...</p>
    </div>
  );
}
