import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const marqueeItems = [
  'AEGIS / IAM PROTOCOL',
  '❖ AUTHENTICATION',
  '❖ AUTHORIZATION',
  '❖ GRANULAR RBAC',
  '❖ OAUTH / JWT REFRESH',
  '❖ SESSION MANAGEMENT',
  '❖ TOTP MULTI-FACTOR AUTH',
  '❖ TOKEN BLOCKLISTING (REDIS)',
  '❖ SHA-256 AUDIT LOG CHAIN',
  '❖ RATE LIMITING (100 REQ/15MIN)',
  '❖ AES-256-GCM ENCRYPTION',
  '❖ SDLC STAGING VERIFIED',
  '❖ ZERO TRUST ARCHITECTURE',
];

/**
 * AppLayout — authenticated layout with sidebar, main content, and bottom marquee.
 */
const AppLayout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ paddingBottom: '36px' }}>
        <Outlet />
      </main>

      {/* Animated Marquee Ticker */}
      <div className="sirnik-marquee">
        <div className="sirnik-marquee-inner">
          {/* Duplicate content for seamless loop */}
          {[0, 1].map((copy) => (
            <div className="sirnik-marquee-content" key={copy}>
              {marqueeItems.map((item, idx) => (
                <span key={idx}>
                  {item.includes('SIRNIK') ? (
                    <span className="marquee-highlight">{item}</span>
                  ) : (
                    item
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
