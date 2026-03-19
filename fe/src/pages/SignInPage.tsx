import { useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function SignInPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 🔥 redirect 파라미터 받기
  const redirect = searchParams.get("redirect");

  const mutation = useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
    }) => {
      const { data } = await axiosInstance.post(api.v1.auth.login, payload);
      return data;
    },
    onSuccess: (data) => {
      sessionStorage.setItem("accessToken", data.access_token);

      alert("로그인 성공");

      // 🔥 redirect 우선 이동
      if (redirect) {
        navigate(redirect);
      } else {
        navigate("/");
      }
    },
    onError: (error) => {
      console.error(error);
      alert("로그인 실패");
    },
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          name="email"
          placeholder="email"
          value={form.email}
          onChange={handleChange}
        />
      </div>

      <div>
        <input
          name="password"
          type="password"
          placeholder="password"
          value={form.password}
          onChange={handleChange}
        />
      </div>

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Loading..." : "Sign In"}
      </button>
    </form>
  );
}
