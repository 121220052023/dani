import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NotificationHandler {
  static final NotificationHandler _instance = NotificationHandler._internal();

  factory NotificationHandler() {
    return _instance;
  }

  NotificationHandler._internal();

  late SupabaseClient _client;
  RealtimeChannel? _notificationsChannel;
  StreamSubscription? _notificationSubscription;
  String? _currentUserId;

  // Callbacks
  final List<Function(Map<String, dynamic>)> _listeners = [];

  void addListener(Function(Map<String, dynamic>) callback) {
    _listeners.add(callback);
  }

  void removeListener(Function(Map<String, dynamic>) callback) {
    _listeners.remove(callback);
  }

  void _notifyListeners(Map<String, dynamic> notification) {
    for (final listener in _listeners) {
      listener(notification);
    }
  }

  Future<void> initialize(String userId) async {
    try {
      _client = Supabase.instance.client;
      _currentUserId = userId;

      // Subscribe to real-time notifications for this user
      _subscribeToNotifications();
      
      debugPrint('Notification handler initialized for user: $userId');
    } catch (e) {
      debugPrint('Error initializing notification handler: $e');
    }
  }

  void _subscribeToNotifications() {
    if (_currentUserId == null) return;

    // Use Supabase Realtime to listen for notifications
    _notificationsChannel = _client.channel('notifications:$_currentUserId');
    
    _notificationsChannel!
        .onBroadcast(event: 'notification', callback: (payload) {
          debugPrint('Received notification: $payload');
          _notifyListeners(payload);
        })
        .subscribe();

    debugPrint('Subscribed to notifications for user: $_currentUserId');
  }

  Future<void> fetchPendingNotifications() async {
    if (_currentUserId == null) return;

    try {
      final response = await _client
          .from('notifications')
          .select('*')
          .eq('user_id', _currentUserId!)
          .eq('is_read', false)
          .order('created_at', ascending: false);

      for (final notification in response as List) {
        _notifyListeners(Map<String, dynamic>.from(notification as Map));
      }
    } catch (e) {
      debugPrint('Error fetching pending notifications: $e');
    }
  }

  Future<void> markNotificationAsRead(String notificationId) async {
    try {
      await _client
          .from('notifications')
          .update({'is_read': true})
          .eq('id', notificationId);
    } catch (e) {
      debugPrint('Error marking notification as read: $e');
    }
  }

  Future<void> markAllAsRead() async {
    if (_currentUserId == null) return;

    try {
      await _client
          .from('notifications')
          .update({'is_read': true})
          .eq('user_id', _currentUserId!)
          .eq('is_read', false);
    } catch (e) {
      debugPrint('Error marking all notifications as read: $e');
    }
  }

  Future<void> deleteNotification(String notificationId) async {
    try {
      await _client
          .from('notifications')
          .delete()
          .eq('id', notificationId);
    } catch (e) {
      debugPrint('Error deleting notification: $e');
    }
  }

  void dispose() {
    _notificationSubscription?.cancel();
    if (_notificationsChannel != null) {
      _client.removeChannel(_notificationsChannel!);
    }
    _listeners.clear();
    debugPrint('Notification handler disposed');
  }
}

