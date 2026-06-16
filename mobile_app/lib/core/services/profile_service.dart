import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/app_user.dart';

class ProfileService {
  ProfileService() : _client = Supabase.instance.client;

  final SupabaseClient _client;

  Future<AppUser?> fetchCurrentProfile() async {
    final user = _client.auth.currentUser;
    if (user == null) return null;

    final data = await _client
        .from('profiles')
        .select('id, email, full_name, role, is_blocked, preferred_language, created_at')
        .eq('id', user.id)
        .maybeSingle();

    if (data == null) return null;
    return AppUser.fromMap(Map<String, dynamic>.from(data));
  }

  Future<AppUser?> ensureProfile({
    String role = 'retail',
    String? fullName,
    String language = 'en',
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) return null;

    final result = await _client.rpc(
      'ensure_profile',
      params: {
        'p_full_name': fullName,
        'p_role': role,
        'p_language': language,
      },
    );

    if (result is Map) {
      return AppUser.fromMap(Map<String, dynamic>.from(result));
    }

    return fetchCurrentProfile();
  }

  Future<AppUser> redeemWholesaleCode(String code) async {
    final result = await _client.rpc(
      'redeem_wholesale_code',
      params: {'p_code': code.trim()},
    );

    return AppUser.fromMap(Map<String, dynamic>.from(result as Map));
  }

  Future<AppUser> updateProfile({
    required String fullName,
    required String preferredLanguage,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw StateError('You must be signed in to update your profile.');
    }

    final result = await _client
        .from('profiles')
        .update({
          'full_name': fullName.trim(),
          'preferred_language': preferredLanguage,
        })
        .eq('id', user.id)
        .select('id, email, full_name, role, is_blocked, preferred_language, created_at')
        .single();

    return AppUser.fromMap(Map<String, dynamic>.from(result));
  }
}
