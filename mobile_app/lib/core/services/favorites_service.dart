import 'package:supabase_flutter/supabase_flutter.dart';

class FavoritesService {
  FavoritesService() : _client = Supabase.instance.client;

  final SupabaseClient _client;

  Future<Set<String>> fetchFavoriteIds() async {
    final user = _client.auth.currentUser;
    if (user == null) return <String>{};

    final response = await _client
        .from('favorites')
        .select('product_id')
        .eq('user_id', user.id);

    return (response as List)
        .map((row) => (row as Map)['product_id'].toString())
        .toSet();
  }

  Future<void> addFavorite(String productId) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw StateError('Create an account to save favorites.');
    }

    await _client.from('favorites').insert({
      'user_id': user.id,
      'product_id': productId,
    });
  }

  Future<void> removeFavorite(String productId) async {
    final user = _client.auth.currentUser;
    if (user == null) return;

    await _client
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
  }
}
