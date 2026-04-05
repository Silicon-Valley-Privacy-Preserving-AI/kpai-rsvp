import { useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Input,
  Label,
  FormGroup,
  AlertBox,
} from "../components/ui";
import { AlertTriangleIcon } from "../components/icons";

export default function SignInPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");

  const mutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await axiosInstance.post(api.v1.auth.login, payload);
      return data;
    },
    onSuccess: (data) => {
      sessionStorage.setItem("accessToken", data.access_token);
      if (redirect) {
        navigate(redirect);
      } else {
        navigate("/");
      }
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      setErrorMsg(typeof detail === "string" ? detail : "Invalid email or password.");
    },
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <PageWrap>
      <AuthCard>
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardSub>Welcome back to K-PAI</CardSub>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          {errorMsg && (
            <AlertBox variant="error" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangleIcon size={16} /> {errorMsg}
            </AlertBox>
          )}

          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
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
              autoComplete="current-password"
              required
            />
          </FormGroup>

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={mutation.isPending}
            style={{ marginTop: 8 }}
          >
            {mutation.isPending ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <Divider />
        <FooterText>
          Don't have an account?{" "}
          <Link to="/signup">Sign up</Link>
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
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 28px 20px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 24px rgba(108, 92, 231, 0.08);

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
  color: #111827;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
`;

const CardSub = styled.p`
  font-size: 14px;
  color: #6b7280;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #f3f4f6;
  margin: 24px 0;
`;

const FooterText = styled.p`
  text-align: center;
  font-size: 14px;
  color: #6b7280;

  a {
    color: #6c5ce7;
    font-weight: 600;
  }
`;