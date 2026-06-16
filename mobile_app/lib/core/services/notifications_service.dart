import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/app_notification.dart';

class NotificationsService {
  NotificationsService() : _client = Supabase.instance.client;

  final SupabaseClient _client;

  Future<List<AppNotification>> fetchNotifications() async {
    final user = _client.auth.currentUser;
    if (user == null) return [];

    final response = await _client
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', ascending: false)
        .limit(20);

    return (response as List)
        .map((item) =>
            AppNotification.fromMap(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<void> markAsRead(String id) {
    return _client.from('notifications').update({'is_read': true}).eq('id', id);
  }
}
