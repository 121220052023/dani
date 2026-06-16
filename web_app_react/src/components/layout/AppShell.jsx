import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ToastViewport from '../ui/ToastViewport';
import useUiStore from '../../store/useUiStore';
import useAuthStore from '../../store/useAuthStore';
import { ArrowUp } from 'lucide-react';

export default function AppShell() {
  const { theme, mobileSidebarOpen, closeMobileSidebar } = useUiStore();
  const trackActivity = useAuthStore((state) => state.trackActivity);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track user activity to reset session timeout (30 min inactivity)
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => trackActivity();
    
    events.forEach(event => window.addEventListener(event, handleActivity, true));
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity, true));
    };
  }, [trackActivity]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

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
      
      <button
        className={`scroll-top-button${showScrollTop ? ' visible' : ''}`}
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <ArrowUp size={20} />
      </button>
    </div>
  );
}
