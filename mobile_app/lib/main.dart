import "package:flutter/foundation.dart";
import "package:flutter/material.dart";
import "package:flutter_dotenv/flutter_dotenv.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "app.dart";
import "core/config/supabase_config.dart";

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables for non-web platforms
  if (!kIsWeb) {
    await dotenv.load(fileName: ".env");
  }

  await Supabase.initialize(
    url: SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
  );

  runApp(const VoltCartBootstrap());
}
