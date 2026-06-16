# VoltCart Commerce Suite

Professional e-commerce system split into:

- `mobile_app/`: Flutter user app
- `web_app_react/`: React + Vite control panel for admin, sales, and marketing
- `supabase-schema.sql`: core database schema and RLS policies
- `supabase/functions/ai-chat-responder/`: AI fallback support responder

## Mobile App

Implemented user-facing flows:

- Guest browsing with sign-in gate for interactions
- Light and dark mode toggle
- Arabic and English toggle
- Product discovery with search, category filtering, sorting, hot deals, most sold, tags, and stock alerts
- Cart, checkout, payment options, tracking, order history, favorites, watch history, reviews, wholesale upgrade, and support chat UI

Main entry points:

- `mobile_app/lib/main.dart`
- `mobile_app/lib/app/app_state.dart`
- `mobile_app/lib/screens/storefront_app.dart`

## Web App

Implemented staff-facing flows:

- Role-aware dashboard shell
- Admin overview with revenue and best-seller analytics
- Marketing product and campaign workspace
- Sales wholesale code and order operations views
- User control screen
- Support chat screen
- Demo fallback when Supabase env vars are not configured

Main entry points:

- `web_app_react/src/App.jsx`
- `web_app_react/src/components/Layout.jsx`
- `web_app_react/src/data/mockData.js`

Set web env vars in `web_app_react/.env`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Notes

Schema includes:

- `profiles`
- `wholesale_codes`
- `products`
- `cart_items`
- `favorites`
- `watch_history`
- `orders`
- `order_items`
- `reviews`
- `notifications`
- `chat_threads`
- `chat_messages`

The AI edge function now uses environment variables only and sends the requested fallback message after inactive sales threads.

## Verification

- Web build: `npm run build` in `web_app_react` succeeded
- Flutter verification could not run in this shell because `flutter` is not installed on PATH
