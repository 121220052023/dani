import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/providers/app_state_provider.dart';
import '../../models/cart_entry.dart';
import '../../models/product.dart';
import '../../widgets/network_product_image.dart';
import '../../widgets/section_title.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({
    super.key,
    required this.onProductSelected,
    required this.onRequireAuth,
    required this.onCheckout,
  });

  final ValueChanged<Product> onProductSelected;
  final VoidCallback onRequireAuth;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();
    final theme = Theme.of(context);

    if (appState.cartEntries.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.shopping_cart_outlined, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              appState.text(en: 'Your cart is empty', ar: 'سلة التسوق فارغة'),
              style: theme.textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              appState.text(en: 'Add some products to get started', ar: 'أضف بعض المنتجات للبدء'),
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: appState.refreshAll,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
        children: [
          SectionTitle(
            title: appState.text(en: 'Cart', ar: 'السلة'),
            subtitle: appState.text(
              en: 'Review your items before checkout.',
              ar: 'راجع منتجاتك قبل الدفع.',
            ),
          ),
          const SizedBox(height: 16),
          ...appState.cartEntries.map((entry) => _CartItemTile(
            entry: entry,
            onProductSelected: onProductSelected,
            onUpdateQuantity: (quantity) => appState.updateCartQuantity(entry.product.id, quantity),
            onRemove: () => appState.removeFromCart(entry.product.id),
          )),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    appState.text(en: 'Order Summary', ar: 'ملخص الطلب'),
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(appState.text(en: 'Subtotal', ar: 'المجموع الفرعي')),
                      Text('\$${appState.cartSubtotal.toStringAsFixed(2)}'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(appState.text(en: 'Shipping', ar: 'الشحن')),
                      Text(appState.cartSubtotal >= 50 ? appState.text(en: 'Free', ar: 'مجاني') : '\$9.99'),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        appState.text(en: 'Total', ar: 'المجموع'),
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        '\$${appState.cartTotal.toStringAsFixed(2)}',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: appState.isAuthenticated ? onCheckout : onRequireAuth,
            style: FilledButton.styleFrom(
              minimumSize: const Size(double.infinity, 50),
            ),
            child: Text(appState.text(en: 'Proceed to Checkout', ar: 'المتابعة للدفع')),
          ),
        ],
      ),
    );
  }
}

class _CartItemTile extends StatelessWidget {
  const _CartItemTile({
    required this.entry,
    required this.onProductSelected,
    required this.onUpdateQuantity,
    required this.onRemove,
  });

  final CartEntry entry;
  final ValueChanged<Product> onProductSelected;
  final ValueChanged<int> onUpdateQuantity;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            GestureDetector(
              onTap: () => onProductSelected(entry.product),
              child: SizedBox(
                width: 80,
                height: 80,
                child: NetworkProductImage(
                  imageUrl: entry.product.imageUrl,
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.product.name,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '\$${entry.product.price.toStringAsFixed(2)}',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.primaryColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      IconButton(
                        onPressed: entry.quantity > 1 ? () => onUpdateQuantity(entry.quantity - 1) : null,
                        icon: const Icon(Icons.remove),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${entry.quantity}',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => onUpdateQuantity(entry.quantity + 1),
                        icon: const Icon(Icons.add),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: onRemove,
              icon: const Icon(Icons.delete_outline, color: Colors.red),
            ),
          ],
        ),
      ),
    );
  }
}