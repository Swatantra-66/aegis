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
 * AppLayout — authenticated layout with sidebar and main content.
 */
const AppLayout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
