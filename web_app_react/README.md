# VoltCart Commerce Suite - React Dashboard

Modern React dashboard for managing VoltCart e-commerce operations with Supabase backend and Vercel deployment.

## Project Structure

```
voltcart-dashboard/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx      # Main layout wrapper
│   │   │   ├── Navbar.jsx         # Top navigation bar
│   │   │   └── Sidebar.jsx        # Side navigation
│   │   └── ui/                   # Reusable UI components
│   │       ├── Modal.jsx
│   │       └── SectionCard.jsx
│   ├── lib/
│   │   ├── api/                   # API layer (NEW STRUCTURE)
│   │   │   ├── client.js          # Utilities, cache, retry logic, constants
│   │   │   ├── users.js           # User & profile API functions
│   │   │   ├── products.js        # Product API functions
│   │   │   ├── favorites.js       # Favorites & Analytics API functions
│   │   │   ├── orders.js          # Order API functions
│   │   │   ├── chat.js            # Chat & messages API
│   │   │   ├── dashboard.js       # Dashboard data aggregation
│   │   │   ├── notifications.js   # Notification API
│   │   │   └── index.js           # Barrel exports
│   │   ├── i18n.js               # Internationalization
│   │   ├── roles.js              # Role definitions & helpers
│   │   └── supabase.js           # Supabase client setup
│   ├── pages/
│   │   ├── Auth.jsx             # Login page
│   │   ├── Dashboard.jsx        # Main dashboard
│   │   ├── Products.jsx         # Product management
│   │   ├── Orders.jsx           # Order management
│   │   ├── Users.jsx            # User management
│   │   ├── Chat.jsx             # Customer support chat
│   │   ├── Analytics.jsx        # Analytics & reports
│   │   ├── Marketing.jsx        # Marketing tools
│   │   ├── Roles.jsx            # Role management
│   │   └── Settings.jsx         # User settings & profile
│   ├── store/
│   │   └── useAuthStore.js     # Zustand auth state
│   ├── App.jsx                 # Main app router
│   ├── index.css               # Global styles
│   └── main.jsx                # Entry point
├── supabase/
│   ├── functions/
│   │   ├── create-user/         # Edge Function: Create user
│   │   ├── reset-user-password/ # Edge Function: Reset password
│   │   └── delete-chat-messages/ # Edge Function: Delete chat
│   └── ...
├── temp/                         # Old/unneeded files
│   └── commerce.js.bak           # Original monolithic API file (backup)
├── public/
├── package.json
├── vite.config.js
└── README.md                     # This file
```

## File Descriptions

### API Layer (`src/lib/api/`)

#### `client.js` - Core Utilities
- **Constants**: `ROLE_LABELS`, `CACHE_DURATION`
- **Functions**:
  - `requireClient()` - Validates Supabase connection
  - `dedupeRequest()` - Prevents duplicate API calls
  - `withRetry()` - Retry failed requests with exponential backoff
  - `monthKey()`, `monthLabel()` - Date formatting helpers
  - `activityStatus()`, `activityLabel()` - User activity helpers
  - `touchStaffPresence()` - Update user last_seen_at
  - `subscribeToTables()` - Real-time subscription helper

#### `users.js` - User Management
- `ensureProfile()` - Create/fetch user profile
- `fetchCurrentProfile()` - Get current user's profile
- `updateCurrentProfile()` - Update profile (avatar, theme, etc.)
- `fetchUsers()` - List all users with stats
- `updateUser()` - Update user details
- `deleteUser()` - Delete user
- `createUser()` - Create new user (calls Edge Function)
- `resetUserPassword()` - Reset user password (calls Edge Function)

#### `products.js` - Product Management
- `fetchProducts()` - List products with caching
- `saveProduct()` - Create/update product
- `deleteProduct()` - Delete product
- `fetchProductComments()` - Get product reviews
- `fetchProductRatings()` - Get product ratings
- `deleteProductComment()` - Delete review

#### `favorites.js` - Favorites & Analytics
- `fetchFavoriteCountsByProduct()` - Returns map of global favorite counts (Admin only)
- `fetchUserFavorites()` - Get list of product IDs favorited by a user
- `toggleFavorite()` - Add/remove favorite for a user
- `fetchFavoritesWithDetails()` - Detailed list of all favorites for admin audit

#### `orders.js` - Order Management
- `fetchOrders()` - List orders with customer info
- `updateOrder()` - Update order status

#### `chat.js` - Chat System
- `fetchChatThreads()` - List chat threads
- `fetchMessages()` - Get messages for a thread
- `sendSalesMessage()` - Send reply as sales
- `deleteChatMessages()` - Delete chat (calls Edge Function)

#### `dashboard.js` - Dashboard Data
- `fetchDashboardData()` - Aggregates all dashboard metrics
- `fetchAnalyticsData()` - Analytics page data

#### `notifications.js` - Notifications
- `fetchNotifications()` - List notifications
- `markNotificationRead()` - Mark as read
- `clearAllNotifications()` - Clear all

### Components (`src/components/`)

#### Layout Components
- **AppShell.jsx**: Wraps pages with sidebar + topbar
- **Navbar.jsx**: Top bar with theme toggle, notifications, user profile, avatar display
- **Sidebar.jsx**: Left navigation with role-based menu items, collapse button

#### UI Components
- **Modal.jsx**: Reusable modal dialog
- **SectionCard.jsx**: Card wrapper with header, stats, charts

### Pages (`src/pages/`)

- **Auth.jsx**: Login page with email/password, password visibility toggle
- **Dashboard.jsx**: Overview with revenue chart, best sellers, order status, activity feed, employee tracking
- **Products.jsx**: Product CRUD, tags, discounts, featured items
- **Orders.jsx**: Order list, status updates, filtering
- **Users.jsx**: User management, role assignment, password reset, account suspension
- **Chat.jsx**: Customer support chat interface, real-time updates, "Empty Chat" button
- **Analytics.jsx**: Detailed analytics charts
- **Marketing.jsx**: Marketing tools and campaigns
- **Roles.jsx**: Role definitions and permissions
- **Settings.jsx**: User profile, avatar upload, theme selection, language

### State Management (`src/store/`)

#### `useAuthStore.js` - Zustand Store
- **State**: `user`, `role`, `profile`, `isLoading`, `error`
- **Actions**:
  - `checkSession()` - Verify auth session
  - `signIn()` - Login with email/password
  - `signOut()` - Logout

### Supabase Edge Functions (`supabase/functions/`)

- **create-user**: Creates new user with admin privileges (service role key)
- **reset-user-password**: Resets user password (service role key)
- **delete-chat-messages**: Permanently deletes chat messages (bypasses RLS)

## Key Features

✅ **Role-based access control** (admin, sales, marketing, retail)
✅ **Real-time updates** via Supabase subscriptions
✅ **Admin "Market Demand" analytics** (global favorite counts)
✅ **Avatar upload** to Supabase Storage
✅ **Theme toggle** (light/dark mode)
✅ **Password visibility** toggle on login
✅ **Chat message deletion** with Edge Functions
✅ **Responsive design** with collapsible sidebar
✅ **Internationalization** (EN/AR)
✅ **Toast notifications**
✅ **Scroll-to-top** button

## Environment Variables

```env
VITE_SUPABASE_URL=https://hqszihvjqscrwdzrwbyg.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview # Preview production build
vercel --prod        # Deploy to Vercel
```

## Deployment

- **Production URL**: https://webappreact.vercel.app
- **Supabase Project**: hqszihvjqscrwdzrwbyg
- **Edge Functions**: Deployed to Supabase

## Notes

- Old monolithic `commerce.js` moved to `temp/commerce.js.bak`
- All `console.log` statements removed for production
- Chat deletion now uses Edge Function to bypass RLS policies
- API layer split by domain for better maintainability
