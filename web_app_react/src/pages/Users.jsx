import { useEffect, useMemo, useState } from "react";
import {
  fetchUsers,
  subscribeToTables,
  updateUser,
  deleteUser,
  createUser,
} from "../lib/commerce";
import { PageHeader, SectionCard } from "../components/ui/SectionCard";
import useUiStore from "../store/useUiStore";
import { STAFF_ROLES, getRoleLabel } from "../lib/roles";
import { t } from "../lib/i18n";
import useAuthStore from "../store/useAuthStore";

const roles = ["admin", "sales", "marketing", "wholesale", "retail"];
const staffRoles = STAFF_ROLES;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "sales",
  });
  const [isCreating, setIsCreating] = useState(false);
  const { searchQuery, pushToast, language } = useUiStore();
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      try {
        const data = await fetchUsers();
        if (isMounted) {
          setUsers(data);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
        if (isMounted) {
          pushToast({
            tone: "danger",
            message: `Failed to load users: ${error.message}`,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    // Debounced subscription handler
    let debounceTimer;
    const debouncedLoad = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(load, 500);
    };

    const unsubscribe = subscribeToTables(
      "users-live",
      ["profiles", "orders"],
      debouncedLoad,
    );

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [pushToast]);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        [user.full_name, user.email, user.role]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      ),
    [users, searchQuery],
  );

const handleDeleteUser = async (id) => {
    if (!window.confirm(t('deleteThisUser', language))) return;
    try {
      await deleteUser(id);
      pushToast({ tone: "success", message: t('userDeleted', language) });
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      pushToast({ tone: "danger", message: error.message });
    }
  };

  const save = async (id, patch) => {
    if (patch.is_blocked !== undefined) {
      const targetUser = users.find((u) => u.id === id);
      if (currentUser && id === currentUser.id) {
        pushToast({ tone: "danger", message: t('cannotSuspendSelf', language) });
        return;
      }
      if (targetUser?.role === "admin") {
        pushToast({ tone: "danger", message: t('cannotSuspendAdmin', language) });
        return;
      }
    }
    try {
      await updateUser(id, patch);
      pushToast({ tone: "success", message: t('userUpdated', language) });
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      pushToast({ tone: "danger", message: error.message });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newUser.email || !newUser.password) {
      pushToast({ tone: "danger", message: t('emailPasswordRequired', language) });
      return;
    }

    if (newUser.password.length < 6) {
      pushToast({ tone: "danger", message: t('passwordMinChars', language) });
      return;
    }

    setIsCreating(true);
    try {
      await createUser(newUser.email, newUser.password, newUser.fullName, newUser.role);
      pushToast({ tone: "success", message: t('userCreated', language) });
      setNewUser({ email: "", password: "", fullName: "", role: "sales" });
      setShowCreateForm(false);
      const data = await fetchUsers();
      setUsers(data);
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
      <PageHeader
        eyebrow={t('adminOnly', language)}
        title={t('users', language)}
        subtitle={t('manageStaff', language)}
      />

      <SectionCard
        title={t('createStaffAccount', language)}
        subtitle={t('adminCreateDashboard', language)}
      >
        <button
          className="primary-button"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? t('cancel', language) : t('createNewUser', language)}
        </button>

        {showCreateForm && (
          <form onSubmit={handleCreateUser} className="form-grid" style={{ marginTop: "20px" }}>
            <label>
              {t('email', language)} *
              <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required placeholder="user@example.com" />
            </label>
            <label>
              {t('password', language)} *
              <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} placeholder="Min 6 characters" />
            </label>
            <label>
              {t('fullName', language)}
              <input type="text" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} placeholder="John Doe" />
            </label>
            <label>
              {t('role', language)} *
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                {staffRoles.map((role) => <option key={role} value={role}>{getRoleLabel(role, language)}</option>)}
              </select>
            </label>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px" }}>
              <button type="submit" className="primary-button" disabled={isCreating}>
                {isCreating ? t('creating', language) : t('createNewUser', language)}
              </button>
              <button type="button" className="ghost-button" onClick={() => setShowCreateForm(false)}>
                {t('cancel', language)}
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      <SectionCard
        title={t('userManagement', language)}
        subtitle={`${filteredUsers.length} ${t('users', language)}`}
      >
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
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--text-faint)" }}>
                      {t('noUsersFound', language)}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name ?? t('unnamedUser', language)}</td>
                      <td>{user.email}</td>
                      <td>
                        <select value={user.role} onChange={(event) => save(user.id, { role: event.target.value })}>
                          {roles.map((role) => <option key={role} value={role}>{getRoleLabel(role, language)}</option>)}
                        </select>
                      </td>
                      <td>
                        <div className="table-actions">
                          <span className={`status-pill ${user.is_blocked ? "danger" : "success"}`}>{user.status}</span>
                          <button className="ghost-button" type="button" onClick={() => save(user.id, { is_blocked: !user.is_blocked })}>
                            {user.is_blocked ? t('block', language) : t('suspend', language)}
                          </button>
                          <button className="danger-button" type="button" onClick={() => handleDeleteUser(user.id)}>
                            {t('delete', language)}
                          </button>
                        </div>
                      </td>
                      <td>{user.orders}</td>
                      <td>${Number(user.totalSpend).toFixed(2)}</td>
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
