import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ToastViewport from '../ui/ToastViewport';
import useUiStore from '../../store/useUiStore';

export default function AppShell() {
  const { theme, mobileSidebarOpen, closeMobileSidebar } = useUiStore();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="app-shell">
      <Sidebar mobile={false} />
      <div className={`mobile-sidebar-backdrop${mobileSidebarOpen ? ' visible' : ''}`} onClick={closeMobileSidebar} />
      <Sidebar mobile />
      <div className="app-main">
        <Navbar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
