import { useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";

type UserRole = "member" | "staff";

type SignUpRequest = {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  staff_code?: string;
};

export default function SignUpPage() {
  const [form, setForm] = useState<SignUpRequest>({
    username: "",
    email: "",
    password: "",
    role: "member",
    staff_code: "",
  });

  const mutation = useMutation({
    mutationFn: async (payload: SignUpRequest) => {
      const { data } = await axiosInstance.post(api.v1.users, payload);
      return data;
    },
    onSuccess: () => {
      alert("회원가입 성공");
    },
    onError: (error: any) => {
      alert(error?.response?.data?.detail ?? "회원가입 실패");
    },
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 🔥 staff인데 코드 안 썼으면 막기
    if (form.role === "staff" && !form.staff_code) {
      alert("Staff 코드를 입력하세요");
      return;
    }

    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          name="username"
          placeholder="username"
          value={form.username}
          onChange={handleChange}
        />
      </div>

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

      {/* 🔥 role 선택 */}
      <div>
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="member">Member</option>
          <option value="staff">Staff</option>
        </select>
      </div>

      {/* 🔥 staff일 때만 코드 입력창 */}
      {form.role === "staff" && (
        <div>
          <input
            name="staff_code"
            placeholder="Staff Code"
            value={form.staff_code}
            onChange={handleChange}
          />
        </div>
      )}

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Loading..." : "Sign Up"}
      </button>
    </form>
  );
}
