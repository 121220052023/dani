import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/providers/app_state_provider.dart';
import '../../models/product.dart';
import '../../widgets/product_card.dart';
import '../../widgets/section_title.dart';

class CatalogScreen extends StatelessWidget {
  const CatalogScreen({
    super.key,
    required this.onProductSelected,
    required this.onRequireAuth,
  });

  final ValueChanged<Product> onProductSelected;
  final VoidCallback onRequireAuth;

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();
    final maxPrice = appState.maxCatalogPrice == 0 ? 1.0 : appState.maxCatalogPrice;
    final priceCap = appState.priceCap ?? maxPrice;

    return RefreshIndicator(
      onRefresh: appState.refreshAll,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
        children: [
          SectionTitle(
            title: appState.text(en: 'Catalog', ar: 'المنتجات'),
            subtitle: appState.text(
              en: 'Search phones and accessories by name, brand, and price.',
              ar: 'ابحث عن الهواتف والملحقات حسب الاسم والشركة والسعر.',
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            onChanged: appState.setSearchQuery,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search_rounded),
              hintText: appState.text(
                en: 'Search by product or brand',
                ar: 'ابحث بالمنتج أو الشركة',
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: ['All', 'Phones', 'Accessories']
                  .map(
                    (category) => Padding(
                      padding: const EdgeInsetsDirectional.only(end: 10),
                      child: ChoiceChip(
                        label: Text(category),
                        selected: appState.selectedCategory == category,
                        onSelected: (_) => appState.setSelectedCategory(category),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: appState.availableBrands
                  .map(
                    (brand) => Padding(
                      padding: const EdgeInsetsDirectional.only(end: 10),
                      child: FilterChip(
                        label: Text(brand),
                        selected: appState.selectedBrand == brand,
                        onSelected: (_) => appState.setSelectedBrand(brand),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          appState.text(en: 'Price range', ar: 'نطاق السعر'),
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      ),
                      Text('\$${priceCap.toStringAsFixed(0)}'),
                    ],
                  ),
                  Slider(
                    value: priceCap.clamp(1, maxPrice),
                    min: 1,
                    max: maxPrice,
                    onChanged: (value) => appState.setPriceCap(value),
                  ),
                  DropdownButtonFormField<CatalogSort>(
                    initialValue: appState.sort,
                    decoration: InputDecoration(
                      labelText: appState.text(en: 'Sort by', ar: 'ترتيب حسب'),
                    ),
                    items: [
                      DropdownMenuItem(
                        value: CatalogSort.recommended,
                        child: Text(appState.text(en: 'Recommended', ar: 'مقترح')),
                      ),
                      DropdownMenuItem(
                        value: CatalogSort.priceLowHigh,
                        child: Text(appState.text(en: 'Low to high', ar: 'من الأقل للأعلى')),
                      ),
                      DropdownMenuItem(
                        value: CatalogSort.priceHighLow,
                        child: Text(appState.text(en: 'High to low', ar: 'من الأعلى للأقل')),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) appState.setSort(value);
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              final crossAxisCount = constraints.maxWidth > 1000
                  ? 3
                  : constraints.maxWidth > 620
                  ? 2
                  : 1;
              final products = appState.visibleProducts;

              if (products.isEmpty) {
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(
                      child: Text(
                        appState.text(
                          en: 'No products match your filters.',
                          ar: 'لا توجد منتجات تطابق الفلاتر الحالية.',
                        ),
                      ),
                    ),
                  ),
                );
              }

              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossAxisCount,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  mainAxisExtent: 372,
                ),
                itemCount: products.length,
                itemBuilder: (context, index) {
                  final product = products[index];
                  return ProductCard(
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
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}
