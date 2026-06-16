import { useEffect, useMemo, useState } from "react";
import {
  fetchUsers,
  fetchDeletedUsers,
  subscribeToTables,
  updateUser,
  deleteUser,
  permanentlyDeleteUser,
  restoreUser,
  createUser,
  resetUserPassword,
} from "../lib/api";
import { formatFullDateTime } from "../lib/api/client";
import { PageHeader, SectionCard } from "../components/ui/SectionCard";
import useUiStore from "../store/useUiStore";
import { STAFF_ROLES, getRoleLabel } from "../lib/roles";
import { t } from "../lib/i18n";
import { Search, Key, Eye, EyeOff, UserPlus, RotateCcw, Trash2 } from "lucide-react";
import { getAuthProvider, isOAuthProvider, getProviderMeta } from "../lib/authProviders";

const roles = ["admin", "sales", "marketing", "retail", "wholesale"];
const staffRoles = STAFF_ROLES;
const userRoles = ["retail", "wholesale"];

function ProviderBadge({ provider }) {
  const meta = getProviderMeta(provider);
  return (
    <span
      className={`provider-badge ${provider}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.02em",
        background: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.color}22`,
      }}
    >
      {provider === "google" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )}
      {provider === "github" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      )}
      {provider === "email" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M22 4L12 13 2 4"/>
        </svg>
      )}
      {meta.label}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", fullName: "", role: "sales" });
  const [isCreating, setIsCreating] = useState(false);
  const [resetPasswordId, setResetPasswordId] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);
  const { searchQuery, setSearchQuery, pushToast, language } = useUiStore();

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      try {
        const data = await fetchUsers();
        if (isMounted) setUsers(data);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        if (isMounted) pushToast({ tone: "danger", message: `Failed to load users: ${error.message}` });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    let debounceTimer;
    const debouncedLoad = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(load, 500); };
    const unsubscribe = subscribeToTables("users-live", ["profiles", "orders"], debouncedLoad);
    return () => { isMounted = false; clearTimeout(debounceTimer); unsubscribe(); };
  }, [pushToast]);

  const loadDeletedUsers = async () => {
    try {
      const data = await fetchDeletedUsers();
      setDeletedUsers(data);
    } catch (error) {
      console.error("Failed to fetch deleted users:", error);
      pushToast({ tone: "danger", message: `Failed to load deleted users: ${error.message}` });
    }
  };

  const handleRestoreUser = async (id) => {
    try {
      await restoreUser(id);
      pushToast({ tone: "success", message: t('userRestored', language) });
      setUsers(await fetchUsers());
      setDeletedUsers(await fetchDeletedUsers());
    } catch (error) {
      pushToast({ tone: "danger", message: error.message });
    }
  };

  const handlePermanentDeleteUser = async (id) => {
    if (!window.confirm(t('confirmPermanentDelete', language))) return;
    try {
      await permanentlyDeleteUser(id);
      pushToast({ tone: "success", message: t('userPermanentlyDeleted', language) });
      setDeletedUsers(await fetchDeletedUsers());
    } catch (error) {
      pushToast({ tone: "danger", message: error.message });
    }
  };

  const filteredUsers = useMemo(
    () => users.filter((user) => [user.full_name, user.email, user.role, user.provider].join(" ").toLowerCase().includes(searchQuery.toLowerCase())),
    [users, searchQuery],
  );

  const highlightText = (text, search) => {
    if (!search || !text) return text;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => regex.test(part) ? <mark key={i} style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', padding: '0 2px', borderRadius: '2px' }}>{part}</mark> : part);
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm(t('deleteThisUser', language))) return;
    try {
      await deleteUser(id);
      pushToast({ tone: "success", message: t('userDeleted', language) });
      setUsers(await fetchUsers());
    } catch (error) {
      pushToast({ tone: "danger", message: error.message });
    }
  };

  const save = async (id, patch) => {
    try {
      await updateUser(id, patch);
      pushToast({ tone: "success", message: t('userUpdated', language) });
      setUsers(await fetchUsers());
    } catch (error) {
      pushToast({ tone: "danger", message: error.message });
    }
  };

  const handleResetPassword = async (id) => {
    if (!resetPasswordValue || resetPasswordValue.length < 6) {
      pushToast({ tone: "danger", message: t('passwordMinChars', language) });
      return;
    }
    setIsResetting(true);
    try {
      await resetUserPassword(id, resetPasswordValue);
      pushToast({ tone: "success", message: "Password reset successfully" });
      setResetPasswordId(null);
      setResetPasswordValue("");
      setShowPassword(false);
    } catch (error) {
      pushToast({ tone: "danger", message: error.message });
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) { pushToast({ tone: "danger", message: t('emailPasswordRequired', language) }); return; }
    if (newUser.password.length < 6) { pushToast({ tone: "danger", message: t('passwordMinChars', language) }); return; }
    if (!newUser.fullName || !newUser.fullName.trim()) { pushToast({ tone: "danger", message: t('fullNameRequired', language) }); return; }
    // Validate email starts with a letter
    const emailPrefix = newUser.email.split('@')[0];
    if (!/^[a-zA-Z]/.test(emailPrefix)) { pushToast({ tone: "danger", message: t('emailStartsWithLetter', language) }); return; }
    setIsCreating(true);
    try {
      await createUser(newUser.email, newUser.password, newUser.fullName, newUser.role);
      pushToast({ tone: "success", message: t('userCreated', language) });
      setNewUser({ email: "", password: "", fullName: "", role: "sales" });
      setShowCreateForm(false);
      setShowCreatePassword(false);
      setUsers(await fetchUsers());
    } catch (error) {
      pushToast({ tone: "danger", message: error.message || "Failed to create user" });
      if (error.message?.includes("Session expired") || error.message?.includes("sign in again")) {
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="page-grid">
      <PageHeader eyebrow={t('adminOnly', language)} title={t('users', language)} subtitle={t('manageStaff', language)} />

      <SectionCard title={t('createUser', language)} subtitle={t('adminCreateDashboard', language)}>
        <div className="chat-toolbar" style={{ marginBottom: "20px" }}>
          <label className="search-bar">
            <Search size={16} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('searchUsersProducts', language)} />
          </label>
          {searchQuery && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{t('searchingFor', language)}: <strong style={{ color: 'var(--primary)' }}>{searchQuery}</strong></span>
              <button className="ghost-button small" onClick={() => setSearchQuery('')}>{t('clear', language)}</button>
            </div>
          )}
        </div>
        {!showCreateForm && <button className="primary-button" onClick={() => setShowCreateForm(true)}><UserPlus size={16} style={{ marginRight: '6px' }} />{t('createUser', language)}</button>}
        {showCreateForm && (
          <form onSubmit={handleCreateUser} className="form-grid" style={{ marginTop: "20px" }}>
            <label>{t('email', language)} *<input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required placeholder={t('yourEmail', language)} /></label>
            <label>
              {t('password', language)} *
              <div className="password-field">
                <input 
                  type={showCreatePassword ? "text" : "password"} 
                  value={newUser.password} 
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} 
                  required 
                  minLength={6} 
                  placeholder="Min 6 characters" 
                />
                <button 
                  type="button" 
                  className="icon-button" 
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  title={showCreatePassword ? t('hidePassword', language) : t('showPassword', language)}
                >
                  {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label>{t('fullName', language)} *<input type="text" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} placeholder={t('yourName', language)} required /></label>
            <label>{t('role', language)} *<select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>{staffRoles.map((role) => <option key={role} value={role}>{getRoleLabel(role, language)}</option>)}</select></label>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", alignItems: "center" }}>
              <button type="submit" className="primary-button" disabled={isCreating}>{isCreating ? t('creating', language) : t('createUser', language)}</button>
              <button type="button" className="ghost-button" onClick={() => setShowCreateForm(false)}>{t('cancel', language)}</button>
            </div>
          </form>
        )}
      </SectionCard>

      <SectionCard title={t('userManagement', language)} subtitle={`${filteredUsers.length} ${t('users', language)}`}>
        {isLoading ? (
          <div className="loading-state">
            <div className="skeleton-card" style={{ height: "60px", marginBottom: "10px" }}></div>
            <div className="skeleton-card" style={{ height: "60px", marginBottom: "10px" }}></div>
            <div className="skeleton-card" style={{ height: "60px" }}></div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('name', language)}</th>
                  <th>{t('email', language)}</th>
                  <th>Auth Provider</th>
                  <th>{t('role', language)}</th>
                  <th>{t('status', language)}</th>
                  <th>{t('orders', language)}</th>
                  <th>{t('totalSpend', language)}</th>
                  <th>{t('actions', language)}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--text-faint)" }}>{t('noUsersFound', language)}</td></tr>
                ) : (
                  filteredUsers.map((user) => {
                    const provider = user.provider || getAuthProvider(user);
                    const oauth = isOAuthProvider(provider);
                    return (
                      <tr key={user.id}>
                        <td>{highlightText(user.full_name ?? t('unnamedUser', language), searchQuery)}</td>
                        <td>{highlightText(user.email, searchQuery)}</td>
                        <td><ProviderBadge provider={provider} /></td>
                        <td>
                          {(() => {
                            const staffRoles = ['admin', 'sales', 'marketing'];
                            const userRoles = ['retail', 'wholesale'];
                            const isStaff = staffRoles.includes(user.role);
                            const allowedRoles = isStaff ? staffRoles : userRoles;
                            return (
                              <>
                                <select value={user.role} onChange={(event) => save(user.id, { role: event.target.value })}>
                                  {allowedRoles.map((role) => <option key={role} value={role}>{getRoleLabel(role, language)}</option>)}
                                </select>
                                {!isStaff && user.role === 'retail' && (
                                  <button 
                                    className="primary-button small" 
                                    style={{ marginTop: '4px', fontSize: '0.7rem', padding: '2px 8px' }}
                                    onClick={() => save(user.id, { role: 'wholesale' })}
                                  >
                                    {t('promoteToWholesale', language)}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td>
                          <div className="table-actions">
                            <span className={`status-pill ${user.is_blocked ? "danger" : "success"}`}>{user.status}</span>
                            <button className="ghost-button" type="button" onClick={() => save(user.id, { is_blocked: !user.is_blocked })}>
                              {user.is_blocked ? t('block', language) : t('suspend', language)}
                            </button>
                            <button className="danger-button" type="button" onClick={() => handleDeleteUser(user.id)}>{t('delete', language)}</button>
                          </div>
                        </td>
                        <td>{user.orders}</td>
                        <td>${Number(user.totalSpend).toFixed(2)}</td>
                        <td>
                          <div className="table-actions">
                            {oauth ? (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-soft)", fontStyle: "italic" }}>
                                Managed by {getProviderMeta(provider).label}
                              </span>
                            ) : resetPasswordId === user.id ? (
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <div className="password-field" style={{ width: '180px' }}>
                                  <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={resetPasswordValue} 
                                    onChange={(e) => setResetPasswordValue(e.target.value)} 
                                    placeholder={t('newPassword', language)} 
                                    style={{ padding: '6px 40px 6px 10px', fontSize: '0.8rem' }} 
                                  />
                                  <button 
                                    type="button" 
                                    className="icon-button" 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    title={showPassword ? t('hidePassword', language) : t('showPassword', language)}
                                  >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                                <button className="primary-button" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleResetPassword(user.id)} disabled={isResetting}>
                                  {isResetting ? t('loading', language) : t('save', language)}
                                </button>
                                <button className="ghost-button" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => { setResetPasswordId(null); setResetPasswordValue(""); setShowPassword(false); }}>{t('cancel', language)}</button>
                              </div>
                            ) : (
                              <button className="ghost-button" type="button" onClick={() => { setResetPasswordId(user.id); setResetPasswordValue(""); setShowPassword(false); }} title={t('resetPassword', language)}><Key size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Deleted Users (Trash) Section */}
      <SectionCard title={t('deletedUsers', language)} subtitle={t('restoreWithin7Days', language)}>
        <div className="chat-toolbar" style={{ marginBottom: "20px" }}>
          <button 
            className="ghost-button" 
            onClick={() => { setShowDeletedUsers(!showDeletedUsers); loadDeletedUsers(); }}
          >
            {showDeletedUsers ? <Trash2 size={16} style={{ marginRight: '6px' }} /> : <RotateCcw size={16} style={{ marginRight: '6px' }} />}
            {showDeletedUsers ? t('hideDeletedUsers', language) : t('showDeletedUsers', language)}
          </button>
        </div>
        {showDeletedUsers && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('name', language)}</th>
                  <th>{t('email', language)}</th>
                  <th>{t('role', language)}</th>
                  <th>{t('deletedAt', language)}</th>
                  <th>{t('actions', language)}</th>
                </tr>
              </thead>
              <tbody>
                {deletedUsers.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "var(--text-faint)" }}>{t('noDeletedUsers', language)}</td></tr>
                ) : (
                  deletedUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name ?? t('unnamedUser', language)}</td>
                      <td>{user.email}</td>
                      <td>{getRoleLabel(user.role, language)}</td>
                      <td>{formatFullDateTime(user.deleted_at)}</td>
                      <td>
                        <div className="table-actions">
                          <button className="primary-button small" onClick={() => handleRestoreUser(user.id)}>
                            <RotateCcw size={14} style={{ marginRight: '4px' }} />
                            {t('restore', language)}
                          </button>
                          <button className="danger-button small" onClick={() => handlePermanentDeleteUser(user.id)}>
                            <Trash2 size={14} style={{ marginRight: '4px' }} />
                            {t('permanentDelete', language)}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
