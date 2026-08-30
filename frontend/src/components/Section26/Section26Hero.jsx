import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Backdrop from "./Backdrop";
import LogoMarquee from "./LogoMarquee";
import Orb from "./Orb";
import ShinyText from "../ShinyText";
import LiquidCarveButton from "../LiquidCarveButton";
import useAuthStore from "../../stores/authStore";

export const Section26Hero = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/home");
  };

  return (
    <main className="section26-main-root">
      {/* Background runs edge to edge */}
      <Backdrop />

      {/* Overlay wash across the bottom */}
      <div aria-hidden="true" className="section26-bottom-wash" />

      {/* Top Floating White Pill Navbar Panel */}
      <header className="okaydev-navbar">
        <div className="okaydev-nav-inner">
          <Link to="/" className="okaydev-brand" aria-label="AEGIS Home">
            <ShinyText
              text="AEGIS"
              fontSize={28}
              fontWeight={900}
              letterSpacing="0.06em"
              textColor="#000000"
              shadowColor="rgba(0, 0, 0, 0.28)"
              glareColor="rgba(255, 255, 255, 0.95)"
              glareSpeed={1.2}
              glareDirection="left-to-right"
            />
          </Link>

          <nav className="okaydev-nav-links">
            <Link to="/dashboard">OVERVIEW</Link>
            <Link to="/users">IDENTITY</Link>
            <Link to="/profile">SECURITY</Link>
            <Link to="/sdlc">SDLC STAGING</Link>
            <a href="#team">TEAM</a>
          </nav>

          <div className="okaydev-nav-auth">
            {isAuthenticated ? (
              <LiquidCarveButton
                onClick={handleLogout}
                label="SIGN OUT"
                padding="9px 24px"
                rounded={100}
                colors={{ fill: "#000000", textColor: "#FFFFFF" }}
                blob={{ color: "#FF5A1F", size: 60, smoothness: 55 }}
                font={{
                  fontFamily: "var(--font-sans, Inter, sans-serif)",
                  fontWeight: 800,
                  fontSize: 12.5,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              />
            ) : (
              <>
                <Link to="/login" className="okaydev-link-login">
                  LOGIN
                </Link>
                <LiquidCarveButton
                  to="/register"
                  label="SIGN UP"
                  padding="9px 24px"
                  rounded={100}
                  colors={{ fill: "#000000", textColor: "#FFFFFF" }}
                  blob={{ color: "#FF5A1F", size: 60, smoothness: 55 }}
                  font={{
                    fontFamily: "var(--font-sans, Inter, sans-serif)",
                    fontWeight: 800,
                    fontSize: 12.5,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Stage */}
      <div className="section26-stage">
        {/* Left Headline + Logo strip */}
        <div className="section26-left-column">
          <div className="section26-headline-copy">
            <div className="section26-subtitle-tag">
              ZERO-TRUST IDENTITY & ACCESS MANAGEMENT ENGINE
            </div>
            <h1 className="section26-serif-title">
              Identity Access<br />Governance
            </h1>
            <p className="section26-body-desc">
              Enterprise IAM architecture powered by Argon2id password hashing, Granular RBAC, TOTP Multi-Factor Authentication, Redis Token Revocation, and Tamper-Evident SHA-256 Audit Chains.
            </p>
          </div>

          {/* Trusted logos — continuous marquee */}
          <div className="section26-marquee-wrapper">
            <LogoMarquee />
          </div>
        </div>

        {/* Center / Right Visual Area: Starburst Symphony Model */}
        <div className="section26-visual-stage-container">
          <Orb />
        </div>
      </div>
    </main>
  );
};

export default Section26Hero;
