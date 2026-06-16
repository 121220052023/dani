import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/providers/app_state_provider.dart';

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();
    final theme = Theme.of(context);

    if (appState.orders.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: Text(appState.text(en: 'My Orders', ar: 'طلباتي')),
        ),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.shopping_bag_outlined, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              Text(
                appState.text(en: 'No orders yet', ar: 'لا توجد طلبات حتى الآن'),
                style: theme.textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                appState.text(en: 'Your orders will appear here', ar: 'ستظهر طلباتك هنا'),
                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(appState.text(en: 'My Orders', ar: 'طلباتي')),
      ),
      body: RefreshIndicator(
        onRefresh: appState.refreshAll,
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: appState.orders.length,
          itemBuilder: (context, index) {
            final order = appState.orders[index];
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          appState.text(en: 'Order #${order.id}', ar: 'الطلب #${order.id}'),
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: _getStatusColor(order.status),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            order.status.toUpperCase(),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      DateFormat.yMMMd().format(order.createdAt ?? DateTime.now()),
                      style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      appState.text(
                        en: 'Total: \$${order.totalAmount.toStringAsFixed(2)}',
                        ar: 'المجموع: \$${order.totalAmount.toStringAsFixed(2)}',
                      ),
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'preparing':
        return Colors.orange;
      case 'shipped':
        return Colors.blue;
      case 'on the way':
        return Colors.purple;
      case 'delivered':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}