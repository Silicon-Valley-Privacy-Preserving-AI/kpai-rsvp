import { Link } from "react-router-dom";
import styled from "styled-components";
import { BREAKPOINTS } from "../utils/constants";

export default function Header() {
  return (
    <HeaderWrapper>
      <Inner>
        <Link to="/">
          <LogoContainer>
            <LogoImage src="/logo.png" alt="K-PAI Logo" />
            <LogoWrapper>
              <LetterGroup>
                <Letter>K</Letter>
                <ExpandedWord>orean</ExpandedWord>
              </LetterGroup>
              <Separator>-</Separator>
              <LetterGroup>
                <Letter>P</Letter>
                <ExpandedWord>rivacy Preserving</ExpandedWord>
              </LetterGroup>
              <DynamicSpacer />
              <LetterGroup>
                <Letter>AI</Letter>
              </LetterGroup>
              <Spacer />
              <LetterGroup>
                <ExpandedWord>Forum</ExpandedWord>
              </LetterGroup>
            </LogoWrapper>
          </LogoContainer>
        </Link>
      </Inner>
    </HeaderWrapper>
  );
}

const HeaderWrapper = styled.header`
  height: 56px;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    height: 64px;
  }
`;

const Inner = styled.div`
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 0 16px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    padding: 0 24px;
  }
`;

const LogoContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    gap: 16px;
  }
`;

const LogoImage = styled.img`
  height: 32px;
  width: auto;
  object-fit: contain;
  transition: transform 0.35s ease;
  border-radius: 50%;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    height: 40px;
  }

  @media (hover: hover) {
    ${LogoContainer}:hover & {
      transform: scale(1.05);
    }
  }
`;

const LogoWrapper = styled.div`
  display: inline-flex;
  align-items: flex-end;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #111827;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    font-size: 28px;
  }
`;

const LetterGroup = styled.div`
  display: inline-flex;
  align-items: flex-end;
  position: relative;
`;

const Letter = styled.span`
  transition: opacity 0.35s ease;

  @media (hover: hover) {
    ${LogoContainer}:hover & {
      opacity: 0.6;
    }
  }
`;

const Separator = styled.span`
  transition: opacity 0.35s ease;

  @media (hover: hover) {
    ${LogoContainer}:hover & {
      opacity: 0.6;
    }
  }
`;

const Spacer = styled.span`
  width: 6px;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    width: 8px;
  }
`;

const DynamicSpacer = styled.span`
  width: 0;
  transition: width 0.35s ease;

  @media (hover: hover) {
    ${LogoContainer}:hover & {
      width: 8px;
    }
  }

  @media (min-width: ${BREAKPOINTS.mobile}) and (hover: hover) {
    ${LogoContainer}:hover & {
      width: 12px;
    }
  }
`;

const ExpandedWord = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;

  opacity: 0;
  max-width: 0;
  transition:
    opacity 0.35s ease,
    max-width 0.35s ease;

  @media (min-width: ${BREAKPOINTS.mobile}) {
    font-size: 20px;
  }

  @media (hover: hover) {
    ${LogoContainer}:hover & {
      opacity: 1;
      max-width: 200px;
    }
  }
`;
