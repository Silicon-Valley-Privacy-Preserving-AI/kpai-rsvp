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
  background-color: #0f172a; /* slate-900 */
  color: #cbd5f5; /* slate-300 */
  padding: 32px 24px;
`;

const Inner = styled.div`
  max-width: 1200px;
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
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
`;

const LinkGroup = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`;

const FooterLink = styled.a`
  font-size: 14px;
  color: #94a3b8; /* slate-400 */
  text-decoration: none;

  &:hover {
    color: #e2e8f0; /* slate-200 */
    text-decoration: underline;
  }
`;
