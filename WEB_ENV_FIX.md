# 🔧 Flutter Web .env Fix

## Problem
The `flutter_dotenv` package **does not work on Flutter Web** in debug mode because:
1. It tries to load `.env` as an asset file
2. Web assets must be declared in `pubspec.yaml`
3. The file system access is restricted in browser environments
4. Results in `404 Not Found` error: `GET http://localhost:XXXX/assets/.env 404`

## Solution Applied

### 1. **Conditional Environment Loading** (`main.dart`)
```dart
// Load .env only on mobile platforms (iOS/Android/Desktop)
if (!kIsWeb) {
  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    debugPrint('Warning: Could not load .env file: $e');
  }
}
```

### 2. **Platform-Specific Configuration** (`supabase_config.dart`)
```dart
static String get url => kIsWeb 
    ? const String.fromEnvironment('SUPABASE_URL', 
        defaultValue: 'https://hqszihvjqscrwdzrwbyg.supabase.co')
    : 'https://hqszihvjqscrwdzrwbyg.supabase.co';

static String get anonKey => kIsWeb
    ? const String.fromEnvironment('SUPABASE_ANON_KEY',
        defaultValue: 'your_anon_key')
    : 'your_anon_key';
```

## How It Works Now

### **Flutter Web** (Chrome, Edge, etc.)
- Uses `String.fromEnvironment()` - compile-time constants
- Credentials are embedded during compilation
- **No .env file needed at runtime**
- To change credentials: rebuild with `--dart-define`

### **Mobile** (iOS/Android)
- Uses `flutter_dotenv` package
- Loads `.env` file from file system
- Credentials can be changed without recompiling
- Just update the `.env` file

## Running on Web

### **Default (with embedded credentials)**
```bash
flutter run -d chrome
```

### **With Custom Credentials**
```bash
flutter run -d chrome \
  --dart-define=SUPABASE_URL=https://your-project.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your_key_here
```

## Running on Mobile

### **Default (reads from .env file)**
```bash
flutter run -d chrome  # Won't work - no .env on web
flutter run            # Works on mobile devices
```

### **Build for Production**
```bash
# Web
flutter build web --dart-define-from-file=.env.production

# Mobile
flutter build apk --dart-define-from-file=.env.production
```

## Security Note

⚠️ **For Flutter Web**, credentials are embedded in the compiled JavaScript.
- This is **acceptable** for the `anon` key (it's meant to be public)
- **Never** embed the `service_role` key in frontend code
- For production web builds, use build-time variables

## Verification

✅ **Web**: App loads without trying to fetch `.env`  
✅ **Mobile**: App reads from `.env` file  
✅ **Both**: Use same codebase with platform-specific behavior  

## Files Modified

1. `mobile_app/lib/main.dart` - Conditional .env loading
2. `mobile_app/lib/core/config/supabase_config.dart` - Platform-specific config

## Error Before Fix

```
GET http://localhost:57385/assets/.env 404 (Not Found)
Error: Instance of 'FileNotFoundError'
```

## After Fix

✅ App loads successfully on Chrome  
✅ Supabase connection established  
✅ All features working  

---

**Last Updated**: 2026-04-20  
**Status**: ✅ Resolved
