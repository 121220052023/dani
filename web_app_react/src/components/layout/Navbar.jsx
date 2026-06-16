import { Bell, Menu, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { clearAllNotifications, fetchCurrentProfile, fetchNotifications, markNotificationRead } from "../../lib/api";
import { getRoleLabel } from "../../lib/roles";
import useAuthStore from "../../store/useAuthStore";
import useUiStore from "../../store/useUiStore";
import { t } from "../../lib/i18n";

export default function Navbar() {
  const { user, role, signOut } = useAuthStore();
  const {
    searchQuery,
    setSearchQuery,
    openMobileSidebar,
    pushToast,
    language,
  } = useUiStore();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchCurrentProfile().then(setProfile).catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications()
      .then(setNotifications)
      .catch(() => {});
  }, []);

  const unread = useMemo(
    () => notifications.filter((item) => !item.is_read),
    [notifications],
  );

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );
      } catch (error) {
        pushToast({ tone: "danger", message: error.message });
      }
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    try {
      await clearAllNotifications();
      setNotifications([]);
      setShowNotifications(false);
    } catch (error) {
      pushToast({ tone: "danger", message: error.message });
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await fetchNotifications();
        setNotifications(data);
      } catch (e) {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="icon-button mobile-only"
          type="button"
          onClick={openMobileSidebar}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        {["/products", "/users"].includes(location.pathname) && (
          <div className="topbar-search">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={location.pathname === "/products" ? t('searchProducts', language) : t('searchUsersProducts', language)}
            />
            {searchQuery && (
              <button className="ghost-button small" onClick={() => setSearchQuery('')}>{t('clear', language)}</button>
            )}
          </div>
        )}
      </div>

      <div className="topbar-right">
        <div className="notification-wrap">
          <button
            className="icon-button"
            type="button"
            onClick={() => setShowNotifications((current) => !current)}
            aria-label="Show notifications"
          >
            <Bell size={18} />
            {unread.length > 0 && (
              <span className="notification-count">{unread.length}</span>
            )}
          </button>
          {showNotifications && (
            <div className="dropdown-panel notifications-panel">
              <div className="dropdown-header">
                <strong>{t('notifications', language)}</strong>
                <span>{unread.length} {t('unread', language)}</span>
                {notifications.length > 0 && (
                  <button
                    className="ghost-button small"
                    type="button"
                    onClick={handleClearAll}
                    aria-label={t('clearAll', language)}
                  >
                    <Trash2 size={14} />
                    {t('clearAll', language)}
                  </button>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 && (
                  <p className="muted-copy">{t('noData', language)}</p>
                )}
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={`notification-item${notification.is_read ? "" : " unread"}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <strong>{notification.title}</strong>
                    <span>{notification.body}</span>
                    <small>
                      {new Date(notification.created_at).toLocaleString()}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="profile-chip">
          <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0 }}>
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--primary-soft)', display: 'grid', placeItems: 'center', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                {(profile?.full_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-copy">
            <strong>{user?.full_name ?? t('staffUser', language)}</strong>
            <span>{getRoleLabel(role, language)}</span>
          </div>
          <button className="ghost-button" type="button" onClick={signOut}>
            {t('logout', language)}
          </button>
        </div>
      </div>
    </header>
  );
}
