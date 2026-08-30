import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * AppLayout — authenticated shell layout providing Sidebar navigation and page container.
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
