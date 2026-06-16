export const STAFF_ROLES = ['admin', 'sales', 'marketing'];

export const ROLE_LABELS = {
  admin: 'Admin',
  sales: 'Sales',
  marketing: 'Marketing',
};

export const ROLE_LABELS_AR = {
  admin: 'مدير',
  sales: 'مبيعات',
  marketing: 'تسويق',
};

export function getRoleLabel(role, language = 'en') {
  if (language === 'ar') {
    return ROLE_LABELS_AR[role] ?? role;
  }
  return ROLE_LABELS[role] ?? role;
}

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'dashboard', icon: 'layout', roles: STAFF_ROLES },
  { to: '/users', label: 'users', icon: 'users', roles: ['admin'] },
  { to: '/products', label: 'products', icon: 'package', roles: ['admin', 'marketing'] },
  { to: '/reviews', label: 'reviews', icon: 'star', roles: ['admin'] },
  { to: '/orders', label: 'orders', icon: 'shopping-cart', roles: ['admin', 'sales'] },
  { to: '/chat', label: 'chat', icon: 'messages-square', roles: ['admin', 'sales'] },
  { to: '/analytics', label: 'analytics', icon: 'chart-column', roles: ['admin'] },
  { to: '/marketing', label: 'marketing', icon: 'badge-percent', roles: ['admin', 'marketing'] },
  { to: '/roles', label: 'roles', icon: 'shield-check', roles: ['admin'] },
  { to: '/settings', label: 'settings', icon: 'settings', roles: STAFF_ROLES },
];

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function canAccess(role, allowedRoles) {
  return allowedRoles.includes(role);
}
