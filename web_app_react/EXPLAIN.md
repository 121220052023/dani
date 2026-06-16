# VoltCart Dashboard - Detailed Code Explanation

This file provides in-depth explanation of every page, component, and their code logic in the VoltCart Commerce Suite React dashboard.

---

## Table of Contents
1. [Auth.jsx - Login Page](#authjsx---login-page)
2. [Dashboard.jsx - Main Dashboard](#dashboardjsx---main-dashboard)
3. [Products.jsx - Product Management](#productsjsx---product-management)
4. [Orders.jsx - Order Management](#ordersjsx---order-management)
5. [Users.jsx - User Management](#usersjsx---user-management)
6. [Chat.jsx - Customer Support Chat](#chatjsx---customer-support-chat)
7. [Analytics.jsx - Analytics & Reports](#analyticsjsx---analytics--reports)
8. [Marketing.jsx - Marketing Tools](#marketingjsx---marketing-tools)
9. [Roles.jsx - Role Management](#rolesjsx---role-management)
10. [Settings.jsx - User Settings](#settingsjsx---user-settings)

---

## Auth.jsx - Login Page

### Purpose
Provides authentication interface for staff users (admin, sales, marketing) to sign in to the dashboard.

### File Location
`src/pages/Auth.jsx`

### Code Structure

#### Imports
```javascript
import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';  // Icons for password toggle
import { Navigate, useNavigate } from 'react-router-dom';  // Routing
import useAuthStore from '../store/useAuthStore';  // Zustand auth store
import useUiStore from '../store/useUiStore';  // UI state (language)
import { t } from '../lib/i18n';  // Internationalization
```

#### State Management
```javascript
const [form, setForm] = useState({ 
  email: '', 
  password: '', 
  showPassword: false  // Toggle password visibility
});
const [localError, setLocalError] = useState('');
const navigate = useNavigate();
```

#### Key Functions

**checkSession()** - Called on mount via useEffect:
- Calls `useAuthStore.checkSession()` to verify if user already has valid session
- If session exists, `user` object will be set in store

**submit(event)** - Form submission handler:
1. Prevents default form submission
2. Validates that email and password are not empty
3. Calls `signIn(email, password)` from auth store
4. On success, navigates to `/dashboard`
5. On failure, error is displayed via `displayError`

**Password Visibility Toggle**:
- Clicking the eye icon toggles `showPassword` state
- Input type changes between `password` and `text`
- Uses `Eye`/`EyeOff` icons from `lucide-react`

#### UI Structure
```
<div className="auth-shell">           # Full-screen container with gradient bg
  <section className="auth-card">      # Card container (max-width: 440px)
    <div className="auth-header">    # Logo, title, description
      <div className="auth-logo">
        <div className="icon">VD</div>  # "VoltDash" logo icon
        <span>VoltDash</span>
      </div>
      <span className="eyebrow">Staff User</span>
      <h1>Sign In</h1>
      <p className="auth-description">...</p>
    </div>
    
    <form className="auth-form">   # Login form
      <label>Email input</label>
      <label>
        Password input with toggle button
        <div className="password-field">  # Relative container
          <input type={showPassword ? 'text' : 'password'} />
          <button type="button" className="icon-button small">
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </label>
      {displayError && <div className="form-error">}  # Error display
      <button type="submit" className="primary-button auth-submit">
        {isLoading ? <Spinner /> : 'Sign In'}
      </button>
    </form>
    
    <div className="auth-footer">Protected area notice</div>
  </section>
</div>
```

#### Redirect Logic
```javascript
if (user) {
  return <Navigate to="/dashboard" replace />;
}
```
If user is already logged in, automatically redirects to dashboard.

---

## Dashboard.jsx - Main Dashboard

### Purpose
Displays executive overview with revenue charts, order statistics, employee tracking, and real-time activity feed.

### File Location
`src/pages/Dashboard.jsx`

### Code Structure

#### Imports
```javascript
import { useEffect, useState, useCallback, useRef } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchDashboardData, subscribeToTables } from '../lib/api';
import { PageHeader, SectionCard, SkeletonCards, StatCard } from '../components/ui/SectionCard';
import useUiStore from '../store/useUiStore';
import { t } from '../lib/i18n';
```

#### State Management
```javascript
const [state, setState] = useState(null);        // Dashboard data object
const [isLoading, setIsLoading] = useState(true);  // Loading state
const [error, setError] = useState(null);        // Error state
const retryCount = useRef(0);                 // Retry counter for failed requests
const maxRetries = 3;                         // Maximum retry attempts
const { pushToast, language } = useUiStore();  // UI store actions
```

#### Data Structure (from fetchDashboardData)
```javascript
{
  summaryCards: [                            // Top stat cards
    { label: "Revenue", value: 12345, meta: "+20.1%", tone: "success" },
    { label: "Orders", value: 123, meta: "+180.1%", tone: "primary" },
    { label: "Users", value: 456, meta: "+19%", tone: "warning" },
    { label: "Products", value: 78, meta: "+201", tone: "danger" }
  ],
  revenueSeries: [                            // Line chart data (6 months)
    { name: "Nov", revenue: 5000, orders: 50 },
    { name: "Dec", revenue: 6000, orders: 60 },
    ...
  ],
  bestSellers: [                           // Pie chart data
    { name: "Product A", value: 100 },
    { name: "Product B", value: 80 },
    ...
  ],
  orderBars: [                              // Bar chart data
    { name: "Preparing", value: 20 },
    { name: "Shipped", value: 15 },
    ...
  ],
  activityFeed: [                            // Recent activity
    { id: "order-1", actor: "John", action: "placed order 123", created_at: "..." },
    ...
  ],
  employeeTracking: [                        // Staff presence
    { id: "user-1", name: "John", email: "...", role: "Admin", status: "Active", screenTime: "Live now" },
    ...
  ]
}
```

#### Key Functions

**load()** - Data fetching function:
```javascript
const load = useCallback(async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    const data = await fetchDashboardData();  // Calls API
    setState(data);
    retryCount.current = 0;  // Reset retry counter
  } catch (err) {
    setError(err.message);
    
    // Retry logic for 5xx errors
    if (retryCount.current < maxRetries && (err.status >= 500 || err.message?.includes('timeout'))) {
      retryCount.current++;
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 5000);
      setTimeout(() => load(), delay);  // Exponential backoff
      return;
    }
    
    pushToast({ tone: 'danger', message: `Dashboard error: ${err.message}` });
  } finally {
    setIsLoading(false);
  }
}, [pushToast]);
```

**Real-time Subscriptions**:
```javascript
useEffect(() => {
  let isMounted = true;
  
  const initialLoad = async () => {
    if (isMounted) await load();
  };
  
  initialLoad();

  // Debounced subscription handler (500ms delay)
  let debounceTimer;
  const debouncedReload = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (isMounted) load();
    }, 500);
  };

  // Subscribe to table changes (orders, products, profiles)
  const unsubscribe = subscribeToTables(
    'dashboard-live', 
    ['orders', 'products', 'profiles'],
    debouncedReload  // Called when any table changes
  );

  return () => {
    isMounted = false;
    clearTimeout(debounceTimer);
    unsubscribe();  // Cleanup subscription
  };
}, [load]);
```

#### UI Structure
```
<div className="page-grid">
  <PageHeader />  # Title + subtitle
  
  {isLoading ? (
    <SkeletonCards />  # Loading skeleton (3-4 gray blocks)
  ) : (
    <div className="stats-grid">  # 4 summary cards
      {state.summaryCards.map(card => <StatCard key={...} {...card} />)}
    </div>
  )}
  
  <div className="content-grid two-up">  # 2-column layout
    <SectionCard title="Revenue">  # Line chart
      <ResponsiveContainer>
        <LineChart data={state.revenueSeries}>
          <Line dataKey="revenue" stroke="#2563EB" />
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
    
    <SectionCard title="Best Sellers">  # Pie chart
      <PieChart>
        <Pie data={state.bestSellers} dataKey="value" />
      </PieChart>
    </SectionCard>
  </div>
  
  <div className="content-grid two-up">  # Second row
    <SectionCard title="Order Statuses">  # Bar chart
      <BarChart data={state.orderBars}>...</BarChart>
    </SectionCard>
    
    <SectionCard title="Recent Activity">  # Activity feed
      {state.activityFeed.map(item => (
        <article className="activity-item">
          <strong>{item.actor}</strong>
          <p>{item.action}</p>
        </article>
      ))}
    </SectionCard>
  </div>
  
  <SectionCard title="Employee Tracking">  # Staff status
    {state.employeeTracking.map(emp => (
      <article className="employee-card">
        <div><strong>{emp.name}</strong><p>{emp.email}</p></div>
        <div className="employee-meta">
          <span className={`status-pill ${emp.status === 'Active' ? 'success' : 'neutral'}`}>
            {emp.status}
          </span>
        </div>
      </article>
    ))}
  </SectionCard>
</div>
```

#### Charts Explanation

**Revenue Line Chart**:
- Uses `recharts` LineChart component
- Data: `state.revenueSeries` (6 months)
- Displays monthly revenue trend
- X-axis: Month names (Nov, Dec, Jan...)
- Y-axis: Revenue amount
- Tooltip shows exact values on hover

**Best Sellers Pie Chart**:
- Uses `recharts` PieChart component
- Data: `state.bestSellers` (top 4 products)
- Displays product sales distribution
- Inner radius: 60px, Outer radius: 95px
- Each slice has different color from `pieColors` array

**Order Status Bar Chart**:
- Uses `recharts` BarChart component
- Data: `state.orderBars` (Preparing, Shipped, On the way, Delivered)
- Shows order fulfillment distribution
- Bars have rounded corners (radius: [8, 8, 0, 0])

---

## Products.jsx - Product Management

### Purpose
CRUD interface for managing products: create, read, update, delete, with support for tags, discounts, featured items, and product reviews.

### File Location
`src/pages/Products.jsx`

### Code Structure

#### State Management
```javascript
const [products, setProducts] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [editing, setEditing] = useState(null);      // Product being edited
const [showForm, setShowForm] = useState(false); // Show create/edit form
const [form, setForm] = useState({                 // Form state
  name: '',
  description: '',
  price: '',
  stock: '',
  category: 'electronics',
  tags: '',
  is_best_seller: false,
  is_featured: false,
  is_hot_deal: false,
  image_url: '',
  discount_percent: '',
});
const [searchQuery, setSearchQuery] = useState('');
const { searchQuery: globalSearch, setSearchQuery: setGlobalSearch, pushToast, language } = useUiStore();
```

#### Data Fetching with Real-time Updates
```javascript
useEffect(() => {
  let isMounted = true;

  const load = async () => {
    if (!isMounted) return;
    setIsLoading(true);
    try {
      const data = await fetchProducts();  // API call
      if (isMounted) setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      if (isMounted) {
        pushToast({ tone: "danger", message: `Failed to load: ${error.message}` });
      }
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  load();

  // Debounced real-time subscription
  let debounceTimer;
  const debouncedLoad = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(load, 500);
  };

  // Subscribe to products table changes
  const unsubscribe = subscribeToTables("products-live", ["products"], debouncedLoad);

  return () => {
    isMounted = false;
    clearTimeout(debounceTimer);
    unsubscribe();
  };
}, [pushToast]);
```

#### Filtering Logic
```javascript
const filteredProducts = useMemo(
  () =>
    products.filter((product) =>
      [product.name, product.description, product.category, product.tags]
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.toLowerCase() || globalSearch.toLowerCase()),
    ),
  [products, searchQuery, globalSearch],
);
```
Combines product fields into searchable string, checks if query is included.

#### Key Functions

**saveProduct(e)** - Create or update product:
```javascript
const saveProduct = async (e) => {
  e.preventDefault();
  
  // Process tags: split by comma, trim whitespace
  const tagsValue = form.tags
    ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];
  
  const payload = {
    ...form,
    tags: tagsValue,
    slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),  // URL-friendly slug
  };
  
  try {
    if (form.id) {
      // Update existing product
      await saveProduct(product.id, payload);
    } else {
      // Create new product
      await saveProduct(payload);
    }
    
    pushToast({ tone: "success", message: t('productSaved', language) });
    setShowForm(false);
    setForm({...});  // Reset form
    const data = await fetchProducts();  // Refresh list
    setProducts(data);
  } catch (error) {
    pushToast({ tone: "danger", message: error.message });
  }
};
```

**deleteProduct(id)** - Delete with confirmation:
```javascript
const deleteProduct = async (id) => {
  if (!window.confirm(t('confirmDelete', language))) return;
  
  try {
    await deleteProductApi(id);  // API call
    pushToast({ tone: "success", message: t('productDeleted', language) });
    const data = await fetchProducts();  // Refresh list
    setProducts(data);
  } catch (error) {
    pushToast({ tone: "danger", message: error.message });
  }
};
```

#### UI Structure

**Product Grid** (Card Layout):
```jsx
<div className="product-grid">  // CSS Grid: repeat(auto-fill, minmax(280px, 1fr))
  {filteredProducts.map(product => (
    <article key={product.id} className="product-card">
      <div 
        className="product-media"
        style={{ backgroundImage: `url(${product.image_url})` }}  // Background image
      >
        <div className="product-overlay" />  // Gradient overlay on hover
      </div>
      
      <div className="product-body">
        <div className="product-heading">
          <div>
            <h3>{product.name}</h3>
            <p>{product.category}</p>
          </div>
          <strong>
            ${product.discount_percent > 0 ? (
              <>
                <span style={{ textDecoration: 'line-through', color: 'var(--text-faint)' }}>
                  ${product.price}
                </span>
                {' '}
                ${product.price * (1 - product.discount_percent / 100)}
              </>
            ) : (
              product.price
            )}
          </strong>
        </div>
        
        <div className="tag-row">
          {product.tags?.map(tag => <span className="tag">{tag}</span>)}
        </div>
        
        <div className="product-flags">
          {product.is_best_seller && <span className="status-pill success">Best Seller</span>}
          {product.is_featured && <span className="status-pill primary">Featured</span>}
          {product.is_hot_deal && <span className="status-pill warning">Hot Deal</span>}
        </div>
        
        <small>Stock: {product.stock}</small>
      </div>
      
      <div className="table-actions">  // Edit/Delete buttons
        <button onClick={() => { setEditing(product); setShowForm(true); }}>
          <Edit size={14} />
        </button>
        <button onClick={() => deleteProduct(product.id)}>
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  ))}
</div>
```

**Product Form** (Modal):
```jsx
{showForm && (
  <Modal title={editing ? 'Edit Product' : 'Create Product'} onClose={() => setShowForm(false)}>
    <form onSubmit={saveProduct} className="form-grid">  // 2-column grid
      <label>Name: <input value={form.name} onChange={...} /></label>
      <label>Price: <input type="number" value={form.price} /></label>
      <label>Stock: <input type="number" value={form.stock} /></label>
      <label>Category: <select value={form.category}>...</select></label>
      <label>Tags: <input value={form.tags} placeholder="tag1, tag2" /></label>
      <label>Discount %: <input type="number" value={form.discount_percent} /></label>
      <label>Image URL: <input value={form.image_url} /></label>
      <label>
        <input type="checkbox" checked={form.is_best_seller} />
        Best Seller
      </label>
      <label>
        <input type="checkbox" checked={form.is_featured} />
        Featured
      </label>
      <label>
        <input type="checkbox" checked={form.is_hot_deal} />
        Hot Deal
      </label>
      <div style={{ gridColumn: "1 / -1" }}>  // Full width
        <button type="submit" className="primary-button">Save</button>
        <button type="button" className="ghost-button" onClick={...}>Cancel</button>
      </div>
    </form>
  </Modal>
)}
```

---

## Orders.jsx - Order Management

### Purpose
View and manage customer orders with status updates, order details, and real-time updates.

### File Location
`src/pages/Orders.jsx`

### Code Structure

#### State Management
```javascript
const [orders, setOrders] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState('');
const { searchQuery: globalSearch, pushToast, language } = useUiStore();
```

#### Data Fetching
```javascript
useEffect(() => {
  let isMounted = true;

  const load = async () => {
    if (!isMounted) return;
    setIsLoading(true);
    try {
      const data = await fetchOrders();  // Includes profiles (customer info)
      if (isMounted) setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      if (isMounted) {
        pushToast({ tone: "danger", message: `Failed: ${error.message}` });
      }
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  load();

  let debounceTimer;
  const debouncedLoad = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(load, 500);
  };

  // Subscribe to orders changes
  const unsubscribe = subscribeToTables("orders-live", ["orders"], debouncedLoad);

  return () => {
    isMounted = false;
    clearTimeout(debounceTimer);
    unsubscribe();
  };
}, [pushToast]);
```

#### Key Functions

**updateOrderStatus(id, status)** - Update order status:
```javascript
const updateOrderStatus = async (id, status) => {
  try {
    await updateOrder(id, { status });  // API call
    pushToast({ tone: "success", message: t('orderUpdated', language) });
    
    // Optimistic UI update
    setOrders(current =>
      current.map(order =>
        order.id === id ? { ...order, status } : order
      )
    );
  } catch (error) {
    pushToast({ tone: "danger", message: error.message });
  }
};
```

#### UI Structure

**Orders Table**:
```jsx
<div className="table-wrap">  // Overflow scroll container
  <table className="data-table">
    <thead>
      <tr>
        <th>Order ID</th>
        <th>Customer</th>
        <th>Total</th>
        <th>Status</th>
        <th>Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {filteredOrders.map(order => (
        <tr key={order.id}>
          <td>#{order.id.slice(0, 8)}</td>  // Short ID
          <td>{order.profiles?.full_name ?? 'Guest'}</td>
          <td>${order.total_amount}</td>
          <td>
            <select 
              value={order.status} 
              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
            >
              <option value="Preparing">Preparing</option>
              <option value="Shipped">Shipped</option>
              <option value="On the way">On the way</option>
              <option value="Delivered">Delivered</option>
            </select>
          </td>
          <td>{new Date(order.created_at).toLocaleDateString()}</td>
          <td>
            <div className="table-actions">
              <span className={`status-pill ${getStatusTone(order.status)}`}>
                {order.status}
              </span>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Status Color Coding**:
- "Preparing" → `warning` (yellow)
- "Shipped" → `primary` (blue)
- "On the way" → `warning` (yellow)
- "Delivered" → `success` (green)

---

## Users.jsx - User Management

### Purpose
Admin-only interface for managing staff accounts: create, update roles, block/suspend, reset passwords, and delete users.

### File Location
`src/pages/Users.jsx`

### Code Structure

#### State Management
```javascript
const [users, setUsers] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [showCreateForm, setShowCreateForm] = useState(false);
const [newUser, setNewUser] = useState({
  email: '',
  password: '',
  fullName: '',
  role: 'sales',  // Default role
});
const [isCreating, setIsCreating] = useState(false);
const [resetPasswordId, setResetPasswordId] = useState(null);  // Which user's password to reset
const [resetPasswordValue, setResetPasswordValue] = useState('');
const [showPassword, setShowPassword] = useState(false);
const { searchQuery, setSearchQuery, pushToast, language } = useUiStore();
```

#### Data Fetching with Role-Based Access
```javascript
useEffect(() => {
  let isMounted = true;

  const load = async () => {
    if (!isMounted) return;
    setIsLoading(true);
    try {
      const data = await fetchUsers();  // Includes order counts and total spend
      if (isMounted) setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      if (isMounted) {
        pushToast({ tone: "danger", message: `Failed: ${error.message}` });
      }
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  load();

  let debounceTimer;
  const debouncedLoad = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(load, 500);
  };

  // Subscribe to profiles and orders (for stats)
  const unsubscribe = subscribeToTables(
    "users-live",
    ["profiles", "orders"],
    debouncedLoad
  );

  return () => {
    isMounted = false;
    clearTimeout(debounceTimer);
    unsubscribe();
  };
}, [pushToast]);
```

#### Key Functions

**handleCreateUser(e)** - Create new staff account:
```javascript
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
    // Calls Edge Function "create-user" (uses service role key)
    await createUser(newUser.email, newUser.password, newUser.fullName, newUser.role);
    
    pushToast({ tone: "success", message: t('userCreated', language) });
    setNewUser({ email: '', password: '', fullName: '', role: 'sales' });
    setShowCreateForm(false);
    
    const data = await fetchUsers();  // Refresh list
    setUsers(data);
  } catch (error) {
    pushToast({ tone: "danger", message: error.message || "Failed to create user" });
    
    // If session expired, redirect to login
    if (error.message?.includes("Session expired") || error.message?.includes("sign in again")) {
      setTimeout(() => { window.location.href = "/login"; }, 2000);
    }
  } finally {
    setIsCreating(false);
  }
};
```

**handleResetPassword(id)** - Reset user password:
```javascript
const handleResetPassword = async (id) => {
  if (!resetPasswordValue) {
    pushToast({ tone: "danger", message: t('passwordMinChars', language) });
    return;
  }
  
  if (resetPasswordValue.length < 6) {
    pushToast({ tone: "danger", message: t('passwordMinChars', language) });
    return;
  }
  
  try {
    // Calls Edge Function "reset-user-password" (uses service role key)
    await resetUserPassword(id, resetPasswordValue);
    
    pushToast({ tone: "success", message: "Password reset successfully" });
    setResetPasswordId(null);
    setResetPasswordValue("");
  } catch (error) {
    pushToast({ tone: "danger", message: error.message });
  }
};
```

**Highlight Text** - Search highlighting:
```javascript
const highlightText = (text, search) => {
  if (!search || !text) return text;
  
  // Escape special regex characters
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} style={{ 
        backgroundColor: 'var(--primary-soft)', 
        color: 'var(--primary)', 
        padding: '0 2px', 
        borderRadius: '2px' 
      }}>
        {part}
      </mark>
    ) : part
  );
};
```

#### UI Structure

**Users Table** with inline password reset:
```jsx
<div className="table-wrap">
  <table className="data-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Status</th>
        <th>Orders</th>
        <th>Total Spend</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {filteredUsers.map(user => (
        <tr key={user.id}>
          <td>{highlightText(user.full_name, searchQuery)}</td>
          <td>{highlightText(user.email, searchQuery)}</td>
          <td>
            <select 
              value={user.role} 
              onChange={(e) => save(user.id, { role: e.target.value })}
            >
              {staffRoles.map(role => (
                <option key={role} value={role}>{getRoleLabel(role, language)}</option>
              ))}
            </select>
          </td>
          <td>
            <span className={`status-pill ${user.is_blocked ? "danger" : "success"}`}>
              {user.status}
            </span>
            <button onClick={() => save(user.id, { is_blocked: !user.is_blocked })}>
              {user.is_blocked ? 'Unblock' : 'Suspend'}
            </button>
          </td>
          <td>{user.orders}</td>
          <td>${Number(user.totalSpend).toFixed(2)}</td>
          <td>
            <div className="table-actions">
              {resetPasswordId === user.id ? (
                // Inline password reset form
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    placeholder={t('newPassword', language)}
                  />
                  <button onClick={() => setShowPassword(!showPassword)}>
                    <Key size={14} />  // Eye toggle
                  </button>
                  <button onClick={() => handleResetPassword(user.id)}>Save</button>
                  <button onClick={() => { 
                    setResetPasswordId(null); 
                    setResetPasswordValue(""); 
                    setShowPassword(false); 
                  }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => { 
                  setResetPasswordId(user.id); 
                  setResetPasswordValue(""); 
                  setShowPassword(false); 
                }}>
                  <Key size={14} /> Reset Password
                </button>
              )}
              <button className="danger-button" onClick={() => handleDeleteUser(user.id)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## Chat.jsx - Customer Support Chat

### Purpose
Real-time customer support chat interface where sales staff can view customer threads, reply to messages, and manage conversations.

### File Location
`src/pages/Chat.jsx`

### Real-Time Architecture

```
Customer (Supabase) → chat_threads + chat_messages
                    ↓
         Supabase Realtime Subscription
                    ↓
         Sales Dashboard (Updates instantly)
```

### Code Structure

#### State Management
```javascript
const [threads, setThreads] = useState([]);              // Chat threads
const [activeThread, setActiveThread] = useState("");      // Currently selected thread
const [messages, setMessages] = useState([]);          // Messages in active thread
const [draft, setDraft] = useState("");                  // Draft message
const [threadSearch, setThreadSearch] = useState("");    // Thread search query
const [now, setNow] = useState(() => Date.now());       // Current time (for status)
const streamRef = useRef(null);                         // Scrollable message container
const { pushToast, language } = useUiStore();
```

#### Data Fetching with Dual Subscriptions
```javascript
useEffect(() => {
  // Load threads on mount
  const loadThreads = async () => {
    const nextThreads = await fetchChatThreads();
    setThreads(nextThreads);
    setActiveThread((current) => current || nextThreads[0]?.id || "");
  };
  
  loadThreads().catch(console.error);
  
  // Subscribe to thread changes (new conversations)
  return subscribeToTables("chat-threads-live", ["chat_threads"], loadThreads);
}, []);

useEffect(() => {
  if (!activeThread) return undefined;
  
  // Load messages for active thread
  const loadMessages = () =>
    fetchMessages(activeThread).then(setMessages).catch(console.error);
    
  loadMessages();
  
  // Subscribe to message changes for this specific thread
  return subscribeToTables(
    `chat-messages-${activeThread}`,
    ["chat_messages"],
    loadMessages
  );
}, [activeThread]);

// Update "now" every minute (for status timing)
useEffect(() => {
  const interval = setInterval(() => setNow(Date.now()), 60000);
  return () => clearInterval(interval);
}, []);

// Auto-scroll to bottom when new messages arrive
useEffect(() => {
  if (!streamRef.current) return;
  streamRef.current.scrollTop = streamRef.current.scrollHeight;
}, [messages]);
```

#### Status Logic
```javascript
function statusCopy(thread, latestMessage, now, language = 'en') {
  if (!thread) {
    return {
      label: t('selectThread', language),
      tone: "neutral",
      helper: t('conversations', language),
    };
  }

  if (latestMessage?.sender_type === "user") {
    if (!thread.last_sales_reply_at) {
      return {
        label: t('awaitingReply', language),
        tone: "warning",
        helper: t('realtimeSupport', language),
      };
    }

    const minutes = Math.max(
      0,
      Math.round((now - new Date(thread.last_sales_reply_at).getTime()) / 60000),
    );

    if (minutes >= 5) {
      return {
        label: "Fallback window reached",
        tone: "danger",
        helper: "Check whether the edge function already replied.",
      };
    }

    return {
      label: t('waitingForSales', language),
      tone: "warning",
      helper: `Fallback triggers in about ${5 - minutes} minute(s).`,
    };
  }

  return {
    label: t('handled', language),
    tone: "success",
    helper: "Latest response came from sales or AI.",
  };
}
```

#### Key Functions

**submit(event)** - Send message:
```javascript
const submit = async (event) => {
  event.preventDefault();
  if (!draft.trim() || !activeThread) return;
    
  try {
    // Send message via API (automatically sets sender as current sales staff)
    await sendSalesMessage(activeThread, draft.trim());
    setDraft("");  // Clear input
      
    // Refresh messages immediately
    fetchMessages(activeThread).then(setMessages).catch(console.error);
  } catch (error) {
    pushToast({ tone: "danger", message: error.message });
  }
};
```

**handleEmptyChat** - Delete all messages (uses Edge Function):
```javascript
const handleEmptyChat = async () => {
  if (!activeThread) return;
  if (!window.confirm(t('confirmEmptyChat', language))) return;
    
  try {
    // Calls Edge Function "delete-chat-messages" (bypasses RLS)
    await deleteChatMessages(activeThread);
      
    pushToast({ tone: "success", message: "Chat emptied successfully" });
    setMessages([]);  // Clear UI immediately
      
    // Refresh threads to update status
    const updatedThreads = await fetchChatThreads();
    setThreads(updatedThreads);
  } catch (error) {
    pushToast({ tone: "danger", message: error.message });
  }
};
```

**handleKeyDown** - Ctrl+Enter to send:
```javascript
const handleKeyDown = (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    submit(event);
  }
};
```

#### UI Structure

**Two-Column Layout**:
```jsx
<div className="chat-layout enhanced">  // display: grid; grid-template-columns: 350px 1fr
  
  {/* LEFT: Thread List */}
  <div className="thread-column enhanced">
    <div className="chat-toolbar">
      <label className="search-bar">
        <input 
          value={threadSearch}
          onChange={(e) => setThreadSearch(e.target.value)}
          placeholder={t('searchConversations', language)}
        />
      </label>
    </div>
    
    {filteredThreads.map(thread => {
      const isActive = thread.id === activeThread;
      const waiting = messages.length > 0 && activeThread === thread.id && latestMessage?.sender_type === "user";
        
      return (
        <button
          key={thread.id}
          className={`thread-card${isActive ? " active" : ""}`}
          onClick={() => setActiveThread(thread.id)}
        >
          <div className="thread-topline">
            <strong>{thread.profiles?.full_name ?? t('unnamedUser', language)}</strong>
            {waiting && <span className="thread-badge">Waiting</span>}
          </div>
          <span>{thread.profiles?.email ?? t('noEmail', language)}</span>
          <div className="thread-meta">
            <small>{new Date(thread.created_at).toLocaleString()}</small>
            <small>{thread.assigned_sales_id ? t('assigned', language) : t('unassigned', language)}</small>
          </div>
        </button>
      );
    })}
  </div>
  
  {/* RIGHT: Message Stream */}
  <div className="chat-column enhanced">
    <div className="chat-column-head">  // Thread header
      <div>
        <strong>{activeConversation?.profiles?.full_name ?? t('selectThread', language)}</strong>
        <span>{activeConversation?.profiles?.email}</span>
      </div>
      <div className="chat-head-meta">
        <small>Opened: {new Date(activeConversation?.created_at).toLocaleString()}</small>
        {activeThread && (
          <button className="ghost-button small" onClick={handleEmptyChat}>
            {t('emptyChat', language)}
          </button>
        )}
      </div>
    </div>
    
    <div className="chat-stream enhanced" ref={streamRef}>  // Scrollable messages
      {messages.length === 0 ? (
        <div className="chat-empty-state">
          <strong>{t('noMessagesYet', language)}</strong>
          <p>{t('sendFirstReply', language)}</p>
        </div>
      ) : (
        messages.map(message => (
          <article key={message.id} className={`chat-bubble ${message.sender_type}`}>
            <strong>{message.sender?.full_name ?? message.sender_type}</strong>
            <p>{message.message}</p>
            <small>{new Date(message.created_at).toLocaleTimeString()}</small>
          </article>
        ))
      )}
    </div>
    
    <form className="chat-composer enhanced" onSubmit={submit}>  // Message input
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('replyPlaceholder', language)}
        disabled={!activeThread}
      />
      <button 
        className="primary-button" 
        type="submit"
        disabled={isSendDisabled}  // Disabled if no thread or draft empty
      >
        {t('send', language)}
      </button>
    </form>
  </div>
</div>
```

#### Message Bubble Styles
- **User messages** (left side): `chat-bubble user` - White background, rounded left corner
- **Sales replies** (right side): `chat-bubble sales` - Green background (#d9fdd3), rounded right corner
- **AI messages**: `chat-bubble ai` - Yellow background (#fff7c2)

---

## Analytics.jsx - Analytics & Reports

### Purpose
Displays detailed analytics charts: daily order trends, category distribution, and aggregated metrics.

### File Location
`src/pages/Analytics.jsx`

### Code Structure

#### State Management
```javascript
const [analytics, setAnalytics] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);
const { pushToast, language } = useUiStore();
```

#### Data Fetching
```javascript
useEffect(() => {
  let isMounted = true;

  const load = async () => {
    if (!isMounted) return;
    setIsLoading(true);
    setError(null);
      
    try {
      // fetchAnalyticsData() calls fetchDashboardData() internally + additional queries
      const data = await fetchAnalyticsData();
      if (isMounted) setAnalytics(data);
    } catch (error) {
      console.error("Analytics load error:", error);
      if (isMounted) setError(error.message);
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };
  
  load();
}, [pushToast]);

// Real-time subscription to relevant tables
useEffect(() => {
  let isMounted = true;
    
  let debounceTimer;
  const debouncedReload = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (isMounted) load();
    }, 1000);  // Longer debounce (1s) for analytics
  };
    
  const unsubscribe = subscribeToTables(
    "analytics-live",
    ["orders", "products", "profiles", "order_items"],
    debouncedReload
  );
    
  return () => {
    isMounted = false;
    clearTimeout(debounceTimer);
    unsubscribe();
  };
}, [load]);
```

#### UI Structure
```jsx
<div className="page-grid">
  <PageHeader title={t('analytics', language)} subtitle={t('detailedReports', language)} />
    
  {isLoading ? (
    <SkeletonCards />
  ) : error ? (
    <div className="section-card" style={{ textAlign: 'center', padding: '60px' }}>
      <p style={{ color: 'var(--danger)' }}>{error}</p>
      <button className="primary-button" onClick={() => { load(); }}>
        {t('retry', language)}
      </button>
    </div>
  ) : (
    <>
      {/* Daily Orders Chart */}
      <div className="content-grid two-up">
        <SectionCard title={t('dailyOrders', language)} subtitle={t('last7Days', language)}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.ordersByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#2563EB" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
          
        {/* Category Mix Pie Chart */}
        <SectionCard title={t('categoryMix', language)} subtitle={t('productCategories', language)}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.categoryMix}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {analytics.categoryMix.map((entry, index) => (
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
        
      {/* Summary Cards */}
      <div className="stats-grid">
        {analytics.summaryCards.map(card => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    </>
  )}
</div>
```

---

## Marketing.jsx - Marketing Tools

### Purpose
Interface for marketing staff to view product performance, manage promotions, and track campaign effectiveness.

### File Location
`src/pages/Marketing.jsx`

### Code Structure
```javascript
const [products, setProducts] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const { pushToast, language } = useUiStore();
```

#### Key Metrics
Marketing page focuses on:
- **Best Sellers** - Products with highest sales
- **Featured Products** - Items marked `is_featured = true`
- **Hot Deals** - Items with active discounts (`is_hot_deal = true`)
- **Product Ratings** - Customer reviews and ratings

#### UI Structure
```jsx
<div className="page-grid">
  <PageHeader title={t('marketing', language)} subtitle={t('campaignPerformance', language)} />
    
  <div className="content-grid two-up">
    {/* Featured Products */}
    <SectionCard title={t('featuredProducts', language)}>
      <div className="product-grid">
        {products
          .filter(p => p.is_featured)
          .map(product => (
            <div key={product.id} className="product-card">
              <div className="product-media" style={{ backgroundImage: `url(${product.image_url})` }} />
              <div className="product-body">
                <h3>{product.name}</h3>
                <strong>${product.price}</strong>
                <span className="status-pill primary">Featured</span>
              </div>
            </div>
          ))}
      </div>
    </SectionCard>
      
    {/* Hot Deals */}
    <SectionCard title={t('hotDeals', language)}>
      <div className="product-grid">
        {products
          .filter(p => p.is_hot_deal)
          .map(product => (
            <div key={product.id} className="product-card">
              {/* Similar structure to featured */}
            </div>
          ))}
      </div>
    </SectionCard>
  </div>
  
  {/* All Products with Ratings */}
  <SectionCard title={t('productPerformance', language)}>
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Category</th>
            <th>Tags</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>
                {product.discount_percent > 0 ? (
                  <>
                    <span style={{ textDecoration: 'line-through' }}>{product.price}</span>
                    {' '}
                    {product.price * (1 - product.discount_percent / 100)}
                  </>
                ) : (
                  product.price
                )}
              </td>
              <td>{product.stock}</td>
              <td>{product.category}</td>
              <td>
                {product.tags?.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </td>
              <td>
                <span className={`status-pill ${product.is_best_seller ? 'success' : 'neutral'}`}>
                  {product.is_best_seller ? 'Best Seller' : 'Standard'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </SectionCard>
</div>
```

---

## Roles.jsx - Role Management

### Purpose
Displays role definitions, permissions, and what each role can access in the dashboard.

### File Location
`src/pages/Roles.jsx`

### Role Definitions
```javascript
const ROLE_INFO = {
  admin: {
    label: 'Admin',
    description: 'Full access to all features',
    permissions: ['Create staff', 'Delete users', 'Manage products', 'View analytics', 'Manage orders', 'Chat support', 'Manage roles'],
  },
  sales: {
    label: 'Sales',
    description: 'Customer support and order management',
    permissions: ['Manage orders', 'Chat support', 'View products'],
  },
  marketing: {
    label: 'Marketing',
    description: 'Manage products and view marketing tools',
    permissions: ['Manage products', 'View marketing tools', 'View analytics'],
  },

  retail: {
    label: 'Retail',
    description: 'Standard customer access',
    permissions: ['Place retail orders'],
  },
};
```

#### UI Structure
```jsx
<div className="page-grid">
  <PageHeader title={t('roles', language)} subtitle={t('roleDefinitions', language)} />
    
  <div className="content-grid two-up">
    {Object.entries(ROLE_INFO).map(([role, info]) => (
      <SectionCard 
        key={role}
        title={getRoleLabel(role, language)}
        subtitle={info.description}
      >
        <div className="stack-list">
          <strong>{t('permissions', language)}:</strong>
          {info.permissions.map(perm => (
            <div key={perm} className="compact-card">
              <span className="status-pill primary">✓</span>
              {perm}
            </div>
          ))}
        </div>
      </SectionCard>
    ))}
  </div>
</div>
```

---

## Settings.jsx - User Settings

### Purpose
Allows users to update their profile, upload avatar, change theme, select language, and manage account preferences.

### File Location
`src/pages/Settings.jsx`

### Code Structure

#### State Management
```javascript
const [profile, setProfile] = useState(null);
const [form, setForm] = useState({
  full_name: '',
  preferred_language: 'en',
  theme: 'light',
});
const [isSaving, setIsSaving] = useState(false);
const [uploading, setUploading] = useState(false);
const { theme, toggleTheme, setLanguage, language, pushToast } = useUiStore();
```

#### Key Functions

**loadProfile()** - Fetch current user profile:
```javascript
const loadProfile = async () => {
  try {
    const data = await fetchCurrentProfile();  // Includes avatar_url
    setProfile(data);
    setForm({
      full_name: data?.full_name ?? '',
      preferred_language: data?.preferred_language ?? 'en',
      theme: theme,
    });
  } catch (error) {
    pushToast({ tone: "danger", message: error.message });
  }
};
```

**handleSave()** - Save profile changes (only on button click):
```javascript
const handleSave = async () => {
  setIsSaving(true);
  try {
    // Update profile in Supabase
    const updated = await updateCurrentProfile({
      full_name: form.full_name,
      preferred_language: form.preferred_language,
    });
      
    setProfile(updated);
    pushToast({ tone: "success", message: t('profileUpdated', language) });
  } catch (error) {
    pushToast({ tone: "danger", message: error.message });
  } finally {
    setIsSaving(false);
  }
};
```

**handleAvatarUpload(event)** - Upload avatar to Supabase Storage:
```javascript
const handleAvatarUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
    
  // Validate file type
  if (!file.type.startsWith('image/')) {
    pushToast({ tone: "danger", message: t('invalidImageType', language) });
    return;
  }
    
  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    pushToast({ tone: "danger", message: t('imageSizeError', language) });
    return;
  }
    
  setUploading(true);
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      
    // Upload to Supabase Storage bucket "avatars"
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);
      
    if (uploadError) throw uploadError;
      
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
      
    // Update profile with avatar URL
    const updated = await updateCurrentProfile({ avatar_url: publicUrl });
    setProfile(updated);
      
    pushToast({ tone: "success", message: t('avatarUploaded', language) });
  } catch (error) {
    pushToast({ tone: "danger", message: error.message });
  } finally {
    setUploading(false);
  }
};
```

**Theme Only Applies on Save**:
```javascript
const handleThemeChange = (newTheme) => {
  // Don't apply immediately - wait for save button
  setForm(current => ({ ...current, theme: newTheme }));
};

// Only apply theme when save button is clicked
const handleSave = async () => {
  // ... save profile
    
  // Apply theme after save
  if (form.theme !== theme) {
    // Update stored theme
    useUiStore.getState().setTheme(form.theme);
  }
};
```

#### UI Structure
```jsx
<div className="page-grid">
  <PageHeader title={t('settings', language)} subtitle={t('manageAccount', language)} />
    
  <SectionCard title={t('profileSettings', language)}>
    <form onSubmit={handleSave} className="form-grid">
        
      {/* Avatar Upload */}
      <div style={{ gridColumn: "1 / -1", textAlign: 'center' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto' }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%', 
              background: 'var(--primary-soft)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '2rem',
              color: 'var(--primary)',
            }}>
              {(profile?.full_name?.[0] || '?').toUpperCase()}
            </div>
          )}
            
          <label 
            htmlFor="avatar-upload"
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              background: 'var(--primary)',
              color: 'white',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Camera size={14} />
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginTop: '8px' }}>
          {uploading ? t('uploading', language) : t('selectImage', language)}
        </p>
      </div>
        
      {/* Full Name */}
      <label>
        {t('fullName', language)}
        <input 
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />
      </label>
        
      {/* Language Selection */}
      <label>
        {t('language', language)}
        <select 
          value={form.preferred_language}
          onChange={(e) => {
            setForm({ ...form, preferred_language: e.target.value });
          }}
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </label>
        
      {/* Theme Selection (doesn't apply until save) */}
      <label>
        {t('theme', language)}
        <div className="theme-options">
          <button
            type="button"
            className={`theme-option ${form.theme === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeChange('light')}
          >
            <Sun size={18} /> Light
          </button>
          <button
            type="button"
            className={`theme-option ${form.theme === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeChange('dark')}
          >
            <Moon size={18} /> Dark
          </button>
        </div>
      </label>
        
      {/* Save Button */}
      <div style={{ gridColumn: "1 / -1" }}>
        <button type="submit" className="primary-button" disabled={isSaving}>
          {isSaving ? t('saving', language) : t('save', language)}
        </button>
      </div>
    </form>
  </SectionCard>
</div>
```

---

## Summary

This dashboard uses:
- **React** with functional components + hooks
- **Zustand** for state management (useAuthStore, useUiStore)
- **Supabase** for backend (PostgreSQL + Realtime + Storage + Edge Functions)
- **Recharts** for data visualization
- **lucide-react** for icons
- **Vercel** for deployment
- **Vite** for build tool

### Key Patterns
1. **Real-time Updates**: All pages subscribe to Supabase table changes via `subscribeToTables()` with debounced reloads
2. **Optimistic UI**: Some actions update local state immediately, then sync with server
3. **Error Handling**: Try-catch with toast notifications
4. **Retry Logic**: Exponential backoff for failed API calls
5. **Role-Based Access**: `ProtectedRoute` component checks user role before rendering pages
6. **Edge Functions**: Sensitive operations (create user, reset password, delete chat) use service role key
7. **Internationalization**: `t()` function with language switcher in settings

### File Flow Example (Dashboard)
```
User visits /dashboard
    ↓
App.jsx renders DashboardPage
    ↓
Dashboard.jsx mount (useEffect)
    ↓
checkSession() in useAuthStore → verifies Supabase session
    ↓
fetchDashboardData() in lib/api/dashboard.js
    ↓
Multiple Supabase queries (orders, products, profiles, etc.)
    ↓
Data returned to Dashboard.jsx
    ↓
State updated → UI re-renders with charts
    ↓
subscribeToTables() listens for changes
    ↓
If data changes → debouncedReload() → refetch data
```

---

**End of EXPLAIN.md**
