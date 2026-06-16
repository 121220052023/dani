import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/providers/app_state_provider.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();
    final theme = Theme.of(context);

    if (appState.notifications.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: Text(appState.text(en: 'Notifications', ar: 'الإشعارات')),
        ),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.notifications_outlined, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              Text(
                appState.text(en: 'No notifications', ar: 'لا توجد إشعارات'),
                style: theme.textTheme.headlineSmall,
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(appState.text(en: 'Notifications', ar: 'الإشعارات')),
      ),
      body: RefreshIndicator(
        onRefresh: appState.refreshAll,
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: appState.notifications.length,
          itemBuilder: (context, index) {
            final notification = appState.notifications[index];
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: const Icon(Icons.notifications),
                title: Text(notification.title),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(notification.body),
                    const SizedBox(height: 4),
                    Text(
                      DateFormat.yMMMd().format(notification.createdAt ?? DateTime.now()),
                      style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                    ),
                  ],
                ),
                trailing: notification.isRead
                    ? null
                    : Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Colors.blue,
                          shape: BoxShape.circle,
                        ),
                      ),
                onTap: () {
                  if (!notification.isRead) {
                    appState.markNotificationRead(notification.id);
                  }
                },
              ),
            );
          },
        ),
      ),
    );
  }
}