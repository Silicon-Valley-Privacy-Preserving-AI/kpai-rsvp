import { useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import {
  Button,
  Input,
  Label,
  FormGroup,
  Select,
  AlertBox,
  ModalOverlay,
  ModalCard,
} from "../components/ui";
import { AlertTriangleIcon } from "../components/icons";

type UserRole = "member" | "staff";
type SignUpRequest = {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  staff_code?: string;
};
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
  const [errorMsg, setErrorMsg] = useState("");
  const [tempAccount, setTempAccount] = useState<TempAccountInfo | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState("");

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
        navigate("/signin");
      }
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      if (detail && typeof detail === "object" && detail.code === "TEMP_ACCOUNT_EXISTS") {
        setTempAccount(detail as TempAccountInfo);
        return;
      }
      setErrorMsg(typeof detail === "string" ? detail : "Sign up failed. Please try again.");
    },
  });

  // ── Set password for temp account ─────────────────────────────────────────
  const setPasswordMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data } = await axiosInstance.post(api.v1.setPassword, {
        email,
        new_password: password,
      });
      return data;
    },
    onSuccess: async () => {
      try {
        const { data: loginData } = await axiosInstance.post(api.v1.auth.login, {
          email: tempAccount!.email,
          password: newPassword,
        });
        sessionStorage.setItem("accessToken", loginData.access_token);
        navigate("/");
      } catch {
        navigate("/signin");
      }
    },
    onError: (error: any) => {
      setPwError(error?.response?.data?.detail ?? "Failed to set password.");
    },
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setErrorMsg("");
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.role === "staff" && !form.staff_code) {
      setErrorMsg("Please enter the staff access code.");
      return;
    }
    signUpMutation.mutate(form);
  };

  // ── Temp account modal ────────────────────────────────────────────────────
  if (tempAccount) {
    return (
      <ModalOverlay>
        <ModalCard>
          <ModalTitle>An auto-created account exists</ModalTitle>
          <ModalDesc>
            A temporary account already exists for this email. Would you like to continue with this account?
          </ModalDesc>

          <TempInfoBox>
            <TempRow><span>Name</span><strong>{tempAccount.username}</strong></TempRow>
            <TempRow><span>Email</span><strong>{tempAccount.email}</strong></TempRow>
          </TempInfoBox>

          <AlertBox variant="warning" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangleIcon size={16} /> If this is not your information, please contact an administrator.
          </AlertBox>

          <FormGroup>
            <Label htmlFor="newPw">Set a password</Label>
            <Input
              id="newPw"
              type="password"
              placeholder="New password (at least 4 characters)"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwError(""); }}
            />
          </FormGroup>

          {pwError && (
            <AlertBox variant="error" style={{ marginBottom: 12 }}>
              {pwError}
            </AlertBox>
          )}

          <ModalActions>
            <Button
              fullWidth
              disabled={newPassword.length < 4 || setPasswordMutation.isPending}
              onClick={() => setPasswordMutation.mutate({ email: tempAccount.email, password: newPassword })}
            >
              {setPasswordMutation.isPending ? "Processing…" : "Continue with this account"}
            </Button>
            <Button
              fullWidth
              variant="ghost"
              onClick={() => { setTempAccount(null); setNewPassword(""); }}
            >
              Cancel
            </Button>
          </ModalActions>
        </ModalCard>
      </ModalOverlay>
    );
  }

  // ── Normal sign-up form ───────────────────────────────────────────────────
  return (
    <PageWrap>
      <AuthCard>
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardSub>Join the K-PAI community</CardSub>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          {errorMsg && (
            <AlertBox variant="error" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangleIcon size={16} /> {errorMsg}
            </AlertBox>
          )}

          <FormGroup>
            <Label htmlFor="username">Name</Label>
            <Input
              id="username"
              name="username"
              placeholder="Your name"
              value={form.username}
              onChange={handleChange}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="role">Role</Label>
            <Select id="role" name="role" value={form.role} onChange={handleChange}>
              <option value="member">Member</option>
              <option value="staff">Staff</option>
            </Select>
          </FormGroup>

          {form.role === "staff" && (
            <FormGroup>
              <Label htmlFor="staff_code">Staff Code</Label>
              <Input
                id="staff_code"
                name="staff_code"
                placeholder="Enter staff access code"
                value={form.staff_code}
                onChange={handleChange}
              />
            </FormGroup>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={signUpMutation.isPending}
            style={{ marginTop: 8 }}
          >
            {signUpMutation.isPending ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <Divider />
        <FooterText>
          Already have an account?{" "}
          <Link to="/signin">Sign in</Link>
        </FooterText>
      </AuthCard>
    </PageWrap>
  );
}

// ── Styled components ─────────────────────────────────────────────────────────

const PageWrap = styled.div`
  min-height: calc(100vh - 128px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
`;

const AuthCard = styled.div`
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 28px 20px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);

  @media (min-width: 480px) {
    padding: 40px 36px;
  }
`;

const CardHeader = styled.div`
  margin-bottom: 28px;
`;

const CardTitle = styled.h1`
  font-size: 26px;
  font-weight: 800;
  color: var(--text-1);
  letter-spacing: -0.03em;
  margin-bottom: 4px;
`;

const CardSub = styled.p`
  font-size: 14px;
  color: var(--text-2);
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  margin: 24px 0;
`;

const FooterText = styled.p`
  text-align: center;
  font-size: 14px;
  color: var(--text-2);

  a {
    color: #F97316;
    font-weight: 600;
  }
`;

// Modal internals
const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 800;
  color: var(--text-1);
  letter-spacing: -0.03em;
  margin-bottom: 10px;
`;

const ModalDesc = styled.p`
  font-size: 14px;
  color: var(--text-2);
  margin-bottom: 20px;
  line-height: 1.6;
`;

const TempInfoBox = styled.div`
  background: rgba(249, 115, 22, 0.06);
  border: 1px solid rgba(249, 115, 22, 0.2);
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 16px;
`;

const TempRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  padding: 4px 0;

  span { color: var(--text-2); }
  strong { color: var(--text-1); }
`;

const ModalActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
`;