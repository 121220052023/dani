import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/providers/app_state_provider.dart';
import '../../models/product.dart';
import '../../widgets/feedback.dart';
import '../../widgets/product_card.dart';
import '../../widgets/section_title.dart';

class FavoritesScreen extends StatelessWidget {
  const FavoritesScreen({
    super.key,
    required this.onProductSelected,
    required this.onRequireAuth,
  });

  final ValueChanged<Product> onProductSelected;
  final VoidCallback onRequireAuth;

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();

    if (appState.isGuest) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 120),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const Icon(Icons.favorite_border_rounded, size: 44),
                  const SizedBox(height: 16),
                  Text(
                    appState.text(
                      en: 'Save favorites after you sign in.',
                      ar: 'احفظ المفضلة بعد تسجيل الدخول.',
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: onRequireAuth,
                    child: Text(appState.text(en: 'Sign in', ar: 'تسجيل الدخول')),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }

    final favorites = appState.favoriteProducts;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
      children: [
        SectionTitle(
          title: appState.text(en: 'Favorites', ar: 'المفضلة'),
          subtitle: appState.text(
            en: 'Synced instantly with your Supabase wishlist.',
            ar: 'متزامنة فورًا مع قائمة الأمنيات في Supabase.',
          ),
        ),
        const SizedBox(height: 16),
        if (favorites.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                appState.text(
                  en: 'You have not saved any products yet.',
                  ar: 'لم تحفظ أي منتجات بعد.',
                ),
              ),
            ),
          )
        else
          ...favorites.map(
            (product) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: ProductCard(
                product: product,
                isFavorite: true,
                onTap: () => onProductSelected(product),
                onFavoriteToggle: () async {
                  try {
                    await appState.toggleFavorite(product);
                  } catch (error) {
                    if (!context.mounted) return;
                    showAppSnackBar(context, error.toString(), isError: true);
                  }
                },
                onAddToCart: () async {
                  try {
                    await appState.addToCart(product);
                    if (!context.mounted) return;
                    showAppSnackBar(context, 'Added to cart.');
                  } catch (error) {
                    if (!context.mounted) return;
                    showAppSnackBar(context, error.toString(), isError: true);
                  }
                },
              ),
            ),
          ),
      ],
    );
  }
}
