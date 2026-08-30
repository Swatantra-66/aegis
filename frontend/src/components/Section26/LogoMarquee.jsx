import React from 'react';

const TECH_LOGOS = [
  {
    name: "okaydev",
    iconSrc: "/logos/okaydev.svg",
    isCustomColor: true,
  },
  {
    name: "Antigravity",
    iconSrc: "/logos/antigravity.svg",
    isCustomColor: true,
  },
  {
    name: "DigitalOcean",
    iconSrc: "/logos/digitalocean.svg",
    isCustomColor: false,
  },
  {
    name: "PostgreSQL",
    iconSrc: "/logos/postgresql.svg",
    isCustomColor: false,
  },
  {
    name: "Docker",
    iconSrc: "/logos/docker.svg",
    isCustomColor: false,
  },
  {
    name: "Redis",
    iconSrc: "/logos/redis.svg",
    isCustomColor: false,
  },
  {
    name: "Node.js",
    iconSrc: "/logos/nodejs.svg",
    isCustomColor: false,
  },
  {
    name: "Express",
    iconSrc: "/logos/express.svg",
    isCustomColor: false,
  },
  {
    name: "Nginx",
    iconSrc: "/logos/nginx.svg",
    isCustomColor: false,
  },
  {
    name: "npm",
    iconSrc: "/logos/npm.svg",
    isCustomColor: false,
  },
  {
    name: "Certbot",
    iconSrc: "/logos/certbot.svg",
    isCustomColor: true,
    scale: 1.35,
  },
  {
    name: "GitHub",
    iconSrc: "/logos/github.svg",
    isCustomColor: false,
  },
];

const EDGE_MASK =
  "linear-gradient(to right, transparent 0, #000 10%, #000 90%, transparent 100%)";

export const LogoMarquee = () => (
  <div
    className="section26-logo-marquee-root"
    style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
  >
    <div className="section26-logo-track">
      {[0, 1].map((copy) => (
        <div key={copy} className="section26-logo-group">
          {TECH_LOGOS.map((item) => (
            <div key={item.name} className="section26-logo-item">
              <img
                src={item.iconSrc}
                alt={item.name}
                className="section26-logo-img"
                style={{
                  filter: item.isCustomColor ? "none" : "brightness(0) invert(0.85)",
                  transform: item.scale ? `scale(${item.scale})` : "none",
                }}
              />
              <span className="section26-logo-text">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default LogoMarquee;
