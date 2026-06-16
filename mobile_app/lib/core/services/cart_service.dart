import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/cart_entry.dart';

class CartException implements Exception {
  final String message;
  
  CartException({required this.message});
  
  @override
  String toString() => message;
}

class CartService {
  CartService() : _client = Supabase.instance.client;

  final SupabaseClient _client;

  Future<List<CartEntry>> fetchCart() async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) return [];

      final response = await _client
          .from('cart_items')
          .select('id, product_id, quantity, created_at, product:products(*)')
          .eq('user_id', user.id)
          .order('created_at', ascending: false);

      return (response as List)
          .map((item) => CartEntry.fromMap(Map<String, dynamic>.from(item as Map)))
          .toList();
    } catch (e) {
      throw CartException(message: 'Failed to load cart. Please try again.');
    }
  }

  Future<void> addToCart({
    required String productId,
    int quantity = 1,
  }) async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) {
        throw CartException(message: 'Please sign in to add items to cart.');
      }

      if (quantity <= 0) {
        throw CartException(message: 'Quantity must be greater than zero.');
      }

      final existing = await _client
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .maybeSingle();

      if (existing != null) {
        final currentQuantity =
            int.tryParse((existing['quantity'] ?? 0).toString()) ?? 0;
        await _client
            .from('cart_items')
            .update({'quantity': currentQuantity + quantity})
            .eq('id', existing['id']);
        return;
      }

      await _client.from('cart_items').insert({
        'user_id': user.id,
        'product_id': productId,
        'quantity': quantity,
      });
    } catch (e) {
      if (e is CartException) rethrow;
      throw CartException(message: 'Failed to add item to cart. Please try again.');
    }
  }

  Future<void> updateQuantity({
    required String itemId,
    required int quantity,
  }) async {
    try {
      if (quantity <= 0) {
        await removeItem(itemId);
        return;
      }

      await _client.from('cart_items').update({'quantity': quantity}).eq('id', itemId);
    } catch (e) {
      throw CartException(message: 'Failed to update cart quantity.');
    }
  }

  Future<void> removeItem(String itemId) async {
    try {
      await _client.from('cart_items').delete().eq('id', itemId);
    } catch (e) {
      throw CartException(message: 'Failed to remove item from cart.');
    }
  }

  Future<void> clearCart() async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) return;

      await _client.from('cart_items').delete().eq('user_id', user.id);
    } catch (e) {
      throw CartException(message: 'Failed to clear cart.');
    }
  }
}
