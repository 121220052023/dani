import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/providers/app_state_provider.dart';
import '../../models/product.dart';
import '../../widgets/product_card.dart';
import '../../widgets/section_title.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.onProductSelected,
    required this.onExploreCatalog,
    required this.onRequireAuth,
    required this.onOpenChat,
  });

  final ValueChanged<Product> onProductSelected;
  final VoidCallback onExploreCatalog;
  final VoidCallback onRequireAuth;
  final VoidCallback onOpenChat;

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: appState.refreshAll,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(32),
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF2563EB), Color(0xFF38BDF8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.18),
                  blurRadius: 32,
                  offset: const Offset(0, 18),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  appState.text(
                    en: 'Shop smarter.',
                    ar: 'تسوق بذكاء.',
                  ),
                  style: theme.textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  appState.text(
                    en: 'Live catalog, wholesale discounts, synced orders, and direct chat with sales.',
                    ar: 'كتالوج مباشر وخصومات الجملة وطلبات متزامنة ودردشة مباشرة مع المبيعات.',
                  ),
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: Colors.white.withValues(alpha: 0.84),
                  ),
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    FilledButton(
                      onPressed: onExploreCatalog,
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF0F172A),
                      ),
                      child: Text(appState.text(en: 'Browse catalog', ar: 'تصفح المتجر')),
                    ),
                    OutlinedButton(
                      onPressed: appState.isGuest ? onRequireAuth : onOpenChat,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(color: Colors.white.withValues(alpha: 0.28)),
                      ),
                      child: Text(appState.text(en: 'Chat with sales', ar: 'الدردشة مع المبيعات')),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          SectionTitle(
            title: appState.text(en: 'Most sold', ar: 'الأكثر مبيعًا'),
            subtitle: appState.text(
              en: 'Trending picks from the live catalog.',
              ar: 'اختيارات رائجة من الكتالوج المباشر.',
            ),
          ),
          const SizedBox(height: 16),
          _ProductCarousel(
            products: appState.bestSellerProducts,
            onProductSelected: onProductSelected,
            onExploreCatalog: onExploreCatalog,
            onRequireAuth: onRequireAuth,
          ),
          const SizedBox(height: 24),
          SectionTitle(
            title: appState.text(en: 'Hot deals', ar: 'العروض الساخنة'),
            subtitle: appState.text(
              en: 'Highest discounts right now.',
              ar: 'أعلى الخصومات الآن.',
            ),
          ),
          const SizedBox(height: 16),
          _ProductCarousel(
            products: appState.hotDeals.take(8).toList(),
            onProductSelected: onProductSelected,
            onExploreCatalog: onExploreCatalog,
            onRequireAuth: onRequireAuth,
          ),
          const SizedBox(height: 24),
          SectionTitle(
            title: appState.text(en: 'Featured', ar: 'المنتجات المميزة'),
            subtitle: appState.text(
              en: 'Curated phones and accessories.',
              ar: 'هواتف وملحقات مختارة بعناية.',
            ),
          ),
          const SizedBox(height: 16),
          _ProductCarousel(
            products: appState.featuredProducts,
            onProductSelected: onProductSelected,
            onExploreCatalog: onExploreCatalog,
            onRequireAuth: onRequireAuth,
          ),
        ],
      ),
    );
  }
}

class _ProductCarousel extends StatelessWidget {
  const _ProductCarousel({
    required this.products,
    required this.onProductSelected,
    required this.onExploreCatalog,
    required this.onRequireAuth,
  });

  final List<Product> products;
  final ValueChanged<Product> onProductSelected;
  final VoidCallback onExploreCatalog;
  final VoidCallback onRequireAuth;

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();

    if (products.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Icon(Icons.inventory_2_outlined, size: 32),
              const SizedBox(height: 12),
              Text(
                appState.text(
                  en: 'No products found yet.',
                  ar: 'لا توجد منتجات حتى الآن.',
                ),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: onExploreCatalog,
                child: Text(appState.text(en: 'Open catalog', ar: 'فتح المتجر')),
              ),
            ],
          ),
        ),
      );
    }

    return SizedBox(
      height: 392,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: products.length,
        separatorBuilder: (_, __) => const SizedBox(width: 16),
        itemBuilder: (context, index) {
          final product = products[index];
          return SizedBox(
            width: 280,
            child: ProductCard(
              product: product,
              isFavorite: appState.favoriteIds.contains(product.id),
              onTap: () => onProductSelected(product),
              onFavoriteToggle: () async {
                if (appState.isGuest) {
                  onRequireAuth();
                  return;
                }
                await appState.toggleFavorite(product);
              },
              onAddToCart: () async {
                if (appState.isGuest) {
                  onRequireAuth();
                  return;
                }
                await appState.addToCart(product);
              },
            ),
          );
        },
      ),
    );
  }
}
