import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/product.dart';

class HistoryService {
  HistoryService() : _client = Supabase.instance.client;

  final SupabaseClient _client;

  Future<void> recordView(String productId) async {
    final user = _client.auth.currentUser;
    if (user == null) return;

    await _client.from('watch_history').insert({
      'user_id': user.id,
      'product_id': productId,
    });
  }

  Future<List<Product>> fetchHistory() async {
    final user = _client.auth.currentUser;
    if (user == null) return [];

    final response = await _client
        .from('watch_history')
        .select('viewed_at, product:products(*)')
        .eq('user_id', user.id)
        .order('viewed_at', ascending: false)
        .limit(20);

    final seen = <String>{};
    final products = <Product>[];

    for (final entry in response as List) {
      final map = Map<String, dynamic>.from(entry as Map);
      final productRaw = map['product'];
      if (productRaw is! Map) continue;
      final product = Product.fromMap(Map<String, dynamic>.from(productRaw));
      if (seen.add(product.id)) {
        products.add(product);
      }
    }

    return products;
  }
}
