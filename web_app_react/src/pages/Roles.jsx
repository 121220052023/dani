import { useEffect, useState } from 'react';
import { fetchUsers, subscribeToTables } from '../lib/commerce';
import { PageHeader, SectionCard } from '../components/ui/SectionCard';

const ROLE_INFO = {
  admin: {
    label: 'Admin',
    description: 'Full access to all features',
    permissions: ['Dashboard', 'Users', 'Products', 'Orders', 'Chat', 'Analytics', 'Marketing', 'Reviews', 'Settings'],
  },
  sales: {
    label: 'Sales',
    description: 'Order management and customer support',
    permissions: ['Dashboard', 'Orders', 'Chat', 'Settings'],
  },
  marketing: {
    label: 'Marketing',
    description: 'Product and campaign management',
    permissions: ['Dashboard', 'Products', 'Marketing', 'Settings'],
  },
};

export default function RolesPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const load = () => fetchUsers().then(setUsers).catch(console.error);
    load();
    return subscribeToTables('roles-live', ['profiles'], load);
  }, []);

  const grouped = ['admin', 'sales', 'marketing'].map((role) => ({
    role,
    users: users.filter((user) => user.role === role),
  }));

  const totalAdmins = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="page-grid">
      <PageHeader eyebrow="Admin only" title="Roles" subtitle="Staff role assignments and permissions overview." />
      <SectionCard title="Role Permissions" subtitle="What each role can access">
        <table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Description</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <tr key={g.role}>
                <td><strong>{ROLE_INFO[g.role].label}</strong></td>
                <td>{ROLE_INFO[g.role].description}</td>
                <td>{ROLE_INFO[g.role].permissions.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      <div className="content-grid three-up">
        {grouped.map((group) => (
          <SectionCard key={group.role} title={ROLE_INFO[group.role].label} subtitle={`${group.users.length} account(s)`}>
            {group.users.length === 0 ? (
              <p className="text-muted">No {ROLE_INFO[group.role].label.toLowerCase()} accounts</p>
            ) : (
              <div className="stack-list">
                {group.users.map((user) => (
                  <article key={user.id} className="compact-card">
                    <strong>{user.full_name ?? 'Unnamed'}</strong>
                    <span>{user.email}</span>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
