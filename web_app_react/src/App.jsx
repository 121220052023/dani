import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import AuthPage from './pages/Auth';
import ChatPage from './pages/Chat';
import DashboardPage from './pages/Dashboard';
import MarketingPage from './pages/Marketing';
import OrdersPage from './pages/Orders';
import ProductsPage from './pages/Products';
import ReviewsPage from './pages/Reviews';
import UsersPage from './pages/Users';
import AnalyticsPage from './pages/Analytics';
import RolesPage from './pages/Roles';
import SettingsPage from './pages/Settings';
import { touchStaffPresence } from './lib/commerce';
import { canAccess, isStaffRole } from './lib/roles';
import useAuthStore from './store/useAuthStore';
import useUiStore from './store/useUiStore';
import { t } from './lib/i18n';

function ProtectedRoute({ children, roles }) {
  const { user, role, isLoading, error, profile } = useAuthStore();
  const { language } = useUiStore();

  if (isLoading) {
    return <div className="fullscreen-state">{t('loadingDashboard', language)}</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is blocked
  if (profile?.is_blocked) {
    return (
      <div className="fullscreen-state restricted-state">
        <strong>{t('accountSuspended', language)}</strong>
        <p>{t('contactAdmin', language)}</p>
      </div>
    );
  }

  if (error && !canAccess(role, roles)) {
    return (
      <div className="fullscreen-state restricted-state">
        <strong>{t('accessRestricted', language)}</strong>
        <p>{error}</p>
      </div>
    );
  }

  return canAccess(role, roles) ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { checkSession, user, role } = useAuthStore();
  const language = useUiStore((state) => state.language);

  useEffect(() => {
    checkSession().catch(() => {});
  }, [checkSession]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!user?.id || !isStaffRole(role)) {
      return undefined;
    }

    const markPresent = (force = false) => {
      touchStaffPresence(force).catch(() => {});
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        markPresent(true);
      }
    };

    markPresent(true);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        markPresent();
      }
    }, 60000);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [role, user?.id]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute roles={['admin', 'sales', 'marketing']}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
          <Route path="products" element={<ProtectedRoute roles={['admin', 'marketing']}><ProductsPage /></ProtectedRoute>} />
          <Route path="reviews" element={<ProtectedRoute roles={['admin']}><ReviewsPage /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute roles={['admin', 'sales']}><OrdersPage /></ProtectedRoute>} />
          <Route path="chat" element={<ProtectedRoute roles={['admin', 'sales']}><ChatPage /></ProtectedRoute>} />
          <Route path="analytics" element={<ProtectedRoute roles={['admin']}><AnalyticsPage /></ProtectedRoute>} />
          <Route path="marketing" element={<ProtectedRoute roles={['admin', 'marketing']}><MarketingPage /></ProtectedRoute>} />
          <Route path="roles" element={<ProtectedRoute roles={['admin']}><RolesPage /></ProtectedRoute>} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
