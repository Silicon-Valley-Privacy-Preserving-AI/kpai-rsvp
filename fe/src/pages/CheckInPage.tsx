import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
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
      alert("체크인 완료 ✅");
      navigate("/seminar");
    },
    onError: () => {
      alert("체크인 실패");
    },
  });

  useEffect(() => {
    if (!seminarId) return;

    if (!accessToken) {
      // 🔥 로그인 후 다시 돌아오도록 redirect 쿼리 추가
      navigate(`/signin?redirect=/check-in/${seminarId}`);
      return;
    }

    checkInMutation.mutate();
  }, [seminarId]);

  return <div>Checking in...</div>;
}
