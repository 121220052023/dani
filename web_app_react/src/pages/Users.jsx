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
import useAuthStore from "../store/useAuthStore";
import { STAFF_ROLES, getRoleLabel } from "../lib/roles";
import { t } from "../lib/i18n";
import { Search, Key, Eye, EyeOff, UserPlus, RotateCcw, Trash2 } from "lucide-react";
import { getAuthProvider, isOAuthProvider, getProviderMeta } from "../lib/authProviders";

const staffRoles = STAFF_ROLES;
const userRoles = ["retail", "wholesale"];

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
  const { user: currentUser } = useAuthStore();

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
                            {user.id === currentUser?.id ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', fontStyle: 'italic' }}>{t('cannotSuspendSelf', language)}</span>
                            ) : user.role === 'admin' ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', fontStyle: 'italic' }}>{t('cannotSuspendAdmin', language)}</span>
                            ) : (
                              <button className="ghost-button" type="button" onClick={() => save(user.id, { is_blocked: !user.is_blocked })}>
                                {user.is_blocked ? t('block', language) : t('suspend', language)}
                              </button>
                            )}
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
