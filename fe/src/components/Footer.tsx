import styled from "styled-components";
import { links } from "../utils/links";

export default function Footer() {
  return (
    <FooterWrapper>
      <Inner>
        <Copyright>
          © {new Date().getFullYear()} Silicon Valley Privacy-Preserving AI
          Forum
        </Copyright>

        <LinkGroup>
          <FooterLink href={links.github} target="_blank" rel="noreferrer">
            GitHub
          </FooterLink>
          <FooterLink href={links.instagram} target="_blank" rel="noreferrer">
            Instagram
          </FooterLink>
          <FooterLink href={links.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </FooterLink>
          <FooterLink href={links.facebook} target="_blank" rel="noreferrer">
            Facebook
          </FooterLink>
          <FooterLink href={`mailto:${links.email}`}>Email</FooterLink>
          <FooterLink href={links.location} target="_blank" rel="noreferrer">
            Location
          </FooterLink>
          <FooterLink href={links.feed} target="_blank" rel="noreferrer">
            RSS
          </FooterLink>
        </LinkGroup>
      </Inner>
    </FooterWrapper>
  );
}

const FooterWrapper = styled.footer`
  background: var(--bg);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  color: var(--text-2);
  padding: 28px 24px;
`;

const Inner = styled.div`
  max-width: 1280px;
  margin: 0 auto;

  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const Copyright = styled.p`
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  color: var(--text-3);
  letter-spacing: -0.01em;
`;

const LinkGroup = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
`;

const FooterLink = styled.a`
  font-size: 13px;
  color: var(--text-3);
  text-decoration: none;
  letter-spacing: -0.01em;
  transition: color 0.15s;

  &:hover {
    color: #F97316;
    text-decoration: none;
  }
`;
