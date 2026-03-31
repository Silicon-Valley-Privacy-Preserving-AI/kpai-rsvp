import { useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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

// Temp account info returned in 409 detail when TEMP_ACCOUNT_EXISTS
interface TempAccountInfo {
  code: "TEMP_ACCOUNT_EXISTS";
  username: string;
  email: string;
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignUpRequest>({
    username: "",
    email: "",
    password: "",
    role: "member",
    staff_code: "",
  });

  // Holds temp account info when 409 TEMP_ACCOUNT_EXISTS is returned
  const [tempAccount, setTempAccount] = useState<TempAccountInfo | null>(null);
  // Password entered for set-password flow
  const [newPassword, setNewPassword] = useState("");

  // ── Normal sign-up ────────────────────────────────────────────────────────
  const signUpMutation = useMutation({
    mutationFn: async (payload: SignUpRequest) => {
      const { data } = await axiosInstance.post(api.v1.users, payload);
      return data;
    },
    onSuccess: async (_data, variables) => {
      try {
        const { data: loginData } = await axiosInstance.post(api.v1.auth.login, {
          email: variables.email,
          password: variables.password,
        });
        sessionStorage.setItem("accessToken", loginData.access_token);
        navigate("/");
      } catch {
        alert("회원가입 성공! 로그인 페이지로 이동합니다.");
        navigate("/signin");
      }
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      // BE returns an object when TEMP_ACCOUNT_EXISTS
      if (detail && typeof detail === "object" && detail.code === "TEMP_ACCOUNT_EXISTS") {
        setTempAccount(detail as TempAccountInfo);
        return;
      }
      alert(typeof detail === "string" ? detail : "회원가입 실패");
    },
  });

  // ── Set password for existing temp account ────────────────────────────────
  const setPasswordMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data } = await axiosInstance.post(api.v1.setPassword, {
        email,
        new_password: password,
      });
      return data;
    },
    onSuccess: async () => {
      // Auto-login after setting password
      try {
        const { data: loginData } = await axiosInstance.post(api.v1.auth.login, {
          email: tempAccount!.email,
          password: newPassword,
        });
        sessionStorage.setItem("accessToken", loginData.access_token);
        navigate("/");
      } catch {
        alert("비밀번호 설정 완료! 로그인 페이지로 이동합니다.");
        navigate("/signin");
      }
    },
    onError: (error: any) => {
      alert(error?.response?.data?.detail ?? "비밀번호 설정 실패");
    },
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.role === "staff" && !form.staff_code) {
      alert("Staff 코드를 입력하세요");
      return;
    }
    signUpMutation.mutate(form);
  };

  // ── Temp account confirmation modal ──────────────────────────────────────
  if (tempAccount) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: "2rem",
            maxWidth: 420,
            width: "90%",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>자동 생성된 계정이 있습니다</h2>
          <p>
            입력하신 이메일로 이미 임시 계정이 생성되어 있습니다.
            이 계정으로 계속하시겠습니까?
          </p>
          <div
            style={{
              background: "#f4f4f4",
              borderRadius: 6,
              padding: "12px 16px",
              marginBottom: "1rem",
            }}
          >
            <div><strong>이름:</strong> {tempAccount.username}</div>
            <div><strong>이메일:</strong> {tempAccount.email}</div>
          </div>
          <p style={{ fontSize: "0.85rem", color: "#e17055" }}>
            본인 정보와 다르다면 관리자에게 문의해주십시오.
          </p>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              사용할 비밀번호 설정
            </label>
            <input
              type="password"
              placeholder="새 비밀번호 (4자 이상)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "8px" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ flex: 1 }}
              disabled={newPassword.length < 4 || setPasswordMutation.isPending}
              onClick={() =>
                setPasswordMutation.mutate({
                  email: tempAccount.email,
                  password: newPassword,
                })
              }
            >
              {setPasswordMutation.isPending ? "처리 중..." : "이 계정으로 계속하기"}
            </button>
            <button
              style={{ flex: 1 }}
              onClick={() => {
                setTempAccount(null);
                setNewPassword("");
              }}
            >
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal sign-up form ───────────────────────────────────────────────────
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

      <div>
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="member">Member</option>
          <option value="staff">Staff</option>
        </select>
      </div>

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

      <button type="submit" disabled={signUpMutation.isPending}>
        {signUpMutation.isPending ? "Loading..." : "Sign Up"}
      </button>
    </form>
  );
}
