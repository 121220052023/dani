import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/providers/app_state_provider.dart';
import '../addresses/addresses_screen.dart';
import '../notifications/notifications_screen.dart';
import '../orders/orders_screen.dart';
import '../../widgets/section_title.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    super.key,
    required this.onRequireAuth,
  });

  final VoidCallback onRequireAuth;

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: appState.refreshAll,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
        children: [
          SectionTitle(
            title: appState.text(en: 'Profile', ar: 'الملف الشخصي'),
            subtitle: appState.text(
              en: 'Manage your account settings and preferences.',
              ar: 'إدارة إعدادات حسابك وتفضيلاتك.',
            ),
          ),
          const SizedBox(height: 24),
          if (appState.isAuthenticated) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appState.text(en: 'Account Information', ar: 'معلومات الحساب'),
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildInfoRow(
                      context,
                      appState.text(en: 'Name', ar: 'الاسم'),
                      appState.currentUser?.fullName ?? 'N/A',
                    ),
                    const SizedBox(height: 8),
                    _buildInfoRow(
                      context,
                      appState.text(en: 'Email', ar: 'البريد الإلكتروني'),
                      appState.currentUser?.email ?? 'N/A',
                    ),
                    const SizedBox(height: 8),
                    _buildInfoRow(
                      context,
                      appState.text(en: 'Role', ar: 'الدور'),
                      appState.currentUser?.shortRole ?? 'N/A',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.shopping_bag_outlined),
                    title: Text(appState.text(en: 'My Orders', ar: 'طلباتي')),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const OrdersScreen()),
                      );
                    },
                  ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.favorite_outline),
                    title: Text(appState.text(en: 'Favorites', ar: 'المفضلة')),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // Already in navigation, perhaps do nothing or show message
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(appState.text(en: 'Favorites tab available in navigation', ar: 'قسم المفضلة متاح في شريط التنقل')),
                        ),
                      );
                    },
                  ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.location_on_outlined),
                    title: Text(appState.text(en: 'Addresses', ar: 'العناوين')),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const AddressesScreen()),
                      );
                    },
                  ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.notifications_outlined),
                    title: Text(appState.text(en: 'Notifications', ar: 'الإشعارات')),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Card(
              child: ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: Text(
                  appState.text(en: 'Logout', ar: 'تسجيل الخروج'),
                  style: const TextStyle(color: Colors.red),
                ),
                onTap: () async {
                  await appState.logout();
                  onRequireAuth();
                },
              ),
            ),
          ] else ...[
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.account_circle_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    appState.text(en: 'Please sign in to view your profile', ar: 'يرجى تسجيل الدخول لعرض ملفك الشخصي'),
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: onRequireAuth,
                    child: Text(appState.text(en: 'Sign In', ar: 'تسجيل الدخول')),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRow(BuildContext context, String label, String value) {
    return Row(
      children: [
        Expanded(
          flex: 2,
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          flex: 3,
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }
}