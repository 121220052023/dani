# Environment Setup Guide - VoltCart Commerce Suite

This guide will walk you through setting up environment variables for both the mobile app and web admin panel.

## 📋 Prerequisites

- Supabase project: `https://hqszihvjqscrwdzrwbyg.supabase.co`
- Access to Supabase Dashboard
- Flutter SDK (for mobile app)
- Node.js ≥ 18.x (for web app)

---

## 🔑 Getting Supabase Credentials

1. **Navigate to Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/hqszihvjqscrwdzrwbyg/settings/api

2. **Copy the following credentials**:
   - **Project URL**: `https://hqszihvjqscrwdzrwbyg.supabase.co`
   - **anon/public key**: Found under "Project API keys" → `anon public`
   - **service_role key**: Found under "Project API keys" → `service_role` (KEEP SECRET!)

---

## 📱 Mobile App Setup (Flutter)

### Step 1: Create `.env` file

Navigate to the mobile app directory and create a `.env` file:

```bash
cd mobile_app
copy .env.example .env
```

### Step 2: Add your credentials

Open `mobile_app/.env` and update:

```env
# Supabase Configuration
SUPABASE_URL=https://hqszihvjqscrwdzrwbyg.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here

# App Configuration
APP_NAME=VoltCart
APP_VERSION=1.0.0

# Optional: Enable debug mode (false for production)
DEBUG_MODE=true
```

### Step 3: Install dependencies

```bash
cd mobile_app
flutter pub get
```

### Step 4: Run the app

```bash
flutter run
```

---

## 🌐 Web Admin Panel Setup (React)

### Step 1: Create `.env` file

Navigate to the web app directory:

```bash
cd web_app_react
copy .env.example .env
```

### Step 2: Add your credentials

Open `web_app_react/.env` and update:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://hqszihvjqscrwdzrwbyg.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here

# App Configuration
VITE_APP_NAME=VoltCart Admin Panel
VITE_APP_VERSION=1.0.0

# Optional: Enable debug mode (false for production)
VITE_DEBUG_MODE=true
```

### Step 3: Install dependencies

```bash
cd web_app_react
npm install
```

### Step 4: Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 🔒 Security Best Practices

### ✅ DO:
- Use `.env` files for local development
- Add `.env` to `.gitignore` (already done)
- Use different keys for development and production
- Rotate your Supabase keys periodically
- Use `service_role` key ONLY in edge functions (never in frontend)

### ❌ NEVER:
- Commit `.env` files to version control
- Share your `service_role` key
- Use `service_role` key in mobile or web apps
- Hardcode credentials in source code

---

## 🚀 Production Deployment

### Mobile App (Release Build)

For production, use `--dart-define` to pass environment variables:

```bash
flutter build apk --dart-define-from-file=.env.production
# or
flutter build ios --dart-define-from-file=.env.production
```

### Web App (Production Build)

Create `.env.production`:

```env
VITE_SUPABASE_URL=https://hqszihvjqscrwdzrwbyg.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_DEBUG_MODE=false
```

Build the app:

```bash
npm run build
```

The production build will be in `web_app_react/dist/`

---

## 🔧 Troubleshooting

### Issue: "Missing Supabase credentials"

**Solution**:
1. Check that `.env` file exists in the correct directory
2. Verify the file is named exactly `.env` (not `.env.txt`)
3. Restart your development server after adding credentials

### Issue: "Invalid API key"

**Solution**:
1. Verify you're using the `anon public` key (not `service_role`)
2. Check that the key hasn't been rotated or changed
3. Ensure there are no extra spaces or quotes in the `.env` file

### Issue: Mobile app not loading `.env`

**Solution**:
1. Run `flutter clean` then `flutter pub get`
2. Verify `flutter_dotenv` package is installed
3. Check that `await dotenv.load(fileName: '.env')` is called in `main()`

---

## 📁 File Structure

```
final project dani/
├── mobile_app/
│   ├── .env                  # ← Mobile environment variables (DO NOT COMMIT)
│   ├── .env.example          # ← Template (safe to commit)
│   ├── lib/
│   │   ├── core/
│   │   │   └── config/
│   │   │       └── supabase_config.dart  # ← Reads from .env
│   │   └── main.dart         # ← Loads .env file
│   └── pubspec.yaml
│
├── web_app_react/
│   ├── .env                  # ← Web environment variables (DO NOT COMMIT)
│   ├── .env.example          # ← Template (safe to commit)
│   └── src/
│       └── lib/
│           └── supabase.js   # ← Reads from .env
│
└── .gitignore                # ← Ensures .env files are ignored
```

---

## 🔄 Updating Credentials

If you need to rotate your Supabase keys:

1. Go to Supabase Dashboard → Settings → API
2. Click "Regenerate key" for the respective key
3. Update your `.env` files with the new keys
4. Restart your development servers
5. Rebuild production apps

---

## 📞 Support

If you encounter issues:
1. Check browser console for web app errors
2. Check Flutter console for mobile app errors
3. Verify Supabase project is active
4. Check Supabase logs: Dashboard → Settings → Logs

---

**Last Updated**: 2026-04-20  
**Version**: 1.0.0
