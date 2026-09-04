import React from 'react';

// Line 1: Infrastructure & Security (Certbot at index 1, PM2 at index 6, Ubuntu at index 3)
const COLUMN_1_LOGOS = [
  { name: "Docker", iconSrc: "/logos/docker.svg", isCustomColor: false },
  { name: "Certbot", iconSrc: "/logos/certbot.svg", isCustomColor: true, scale: 1.25 },
  { name: "PostgreSQL", iconSrc: "/logos/postgresql.svg", isCustomColor: false },
  { name: "Ubuntu Linux", iconSrc: "/logos/ubuntu.svg", isCustomColor: false, scale: 1.15 },
  { name: "Redis", iconSrc: "/logos/redis.svg", isCustomColor: false },
  { name: "GitHub", iconSrc: "/logos/github.svg", isCustomColor: false },
  { name: "PM2", iconSrc: "/logos/pm2.svg", isCustomColor: false, scale: 1.15 },
  { name: "Antigravity", iconSrc: "/logos/antigravity.svg", isCustomColor: true },
];

// Line 2: Runtime & APIs (OpenAPI at index 0, PM2 at index 2 [opp Col 1], Let's Encrypt at index 5 [opp Col 1])
const COLUMN_2_LOGOS = [
  { name: "OpenAPI", iconSrc: "/logos/openapi.svg", isCustomColor: false, scale: 1.15 },
  { name: "Node.js", iconSrc: "/logos/nodejs.svg", isCustomColor: false },
  { name: "PM2", iconSrc: "/logos/pm2.svg", isCustomColor: false, scale: 1.15 },
  { name: "Express", iconSrc: "/logos/express.svg", isCustomColor: false },
  { name: "Nginx", iconSrc: "/logos/nginx.svg", isCustomColor: false },
  { name: "Let's Encrypt", iconSrc: "/logos/letsencrypt.svg", isCustomColor: true, scale: 1.2 },
  { name: "DigitalOcean", iconSrc: "/logos/digitalocean.svg", isCustomColor: false },
  { name: "npm", iconSrc: "/logos/npm.svg", isCustomColor: false },
];

export const LogoMarquee = () => {
  return (
    <div className="section26-vertical-marquee-root">
      {/* Column 1: Scrolling UP */}
      <div className="section26-vertical-col">
        <div className="section26-vertical-track section26-track-up">
          {[0, 1].map((copy) => (
            <div key={copy} className="section26-tile-group">
              {COLUMN_1_LOGOS.map((item, idx) => (
                <div
                  key={`${item.name}-${copy}-${idx}`}
                  className="section26-tile-item"
                  title={item.name}
                >
                  <img
                    src={item.iconSrc}
                    alt={item.name}
                    className="section26-tile-img"
                    style={{
                      filter: item.isCustomColor ? "none" : "brightness(0) invert(0.92)",
                      transform: item.scale ? `scale(${item.scale})` : "none",
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: Scrolling DOWN */}
      <div className="section26-vertical-col">
        <div className="section26-vertical-track section26-track-down">
          {[0, 1].map((copy) => (
            <div key={copy} className="section26-tile-group">
              {COLUMN_2_LOGOS.map((item, idx) => (
                <div
                  key={`${item.name}-${copy}-${idx}`}
                  className="section26-tile-item"
                  title={item.name}
                >
                  <img
                    src={item.iconSrc}
                    alt={item.name}
                    className="section26-tile-img"
                    style={{
                      filter: item.isCustomColor ? "none" : "brightness(0) invert(0.92)",
                      transform: item.scale ? `scale(${item.scale})` : "none",
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogoMarquee;
