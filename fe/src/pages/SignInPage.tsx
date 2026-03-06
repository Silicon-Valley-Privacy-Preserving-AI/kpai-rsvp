import { useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import styled, { keyframes } from "styled-components";
import { axiosInstance } from "../apis/axiosInstance";
import { api } from "../apis/endpoints";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { route } from "../router/route";

export default function SignInPage() {
  const [form, setForm] = useState({
    user: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");

  const mutation = useMutation({
    mutationFn: async (payload: {
      user: string;
      email: string;
      password: string;
    }) => {
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
    onError: (error) => {
      console.error(error);
      alert("Login failed. Please check your credentials.");
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
    <Container>
      <FormCard>
        <LogoSection>
          <LogoCircle>K-PAI</LogoCircle>
          <Title>Welcome Back</Title>
          <Subtitle>Sign in to continue to K-PAI Forum</Subtitle>
        </LogoSection>

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="user">Username</Label>
            <Input
              id="user"
              name="user"
              type="text"
              placeholder="Enter your username"
              value={form.user}
              onChange={handleChange}
              required
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="text"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </InputGroup>

          <SubmitButton type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </SubmitButton>
        </Form>

        <FooterText>
          Don't have an account?{" "}
          <StyledLink to={route.signup}>Create one</StyledLink>
        </FooterText>
      </FormCard>
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

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Container = styled.div`
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
`;

const FormCard = styled.div`
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 20px;
  padding: 48px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  animation: ${fadeIn} 0.6s ease-out;

  @media (max-width: 480px) {
    padding: 32px 24px;
  }
`;

const LogoSection = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const LogoCircle = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 24px auto;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.05em;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 15px;
  color: #64748b;
  margin: 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #334155;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  color: #0f172a;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: #ffffff;
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const FooterText = styled.p`
  text-align: center;
  font-size: 14px;
  color: #64748b;
  margin: 24px 0 0 0;
`;

const StyledLink = styled(Link)`
  color: #3b82f6;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;

  &:hover {
    color: #8b5cf6;
  }
`;
