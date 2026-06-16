import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/order_summary.dart';

class OrderException implements Exception {
  final String message;
  
  OrderException({required this.message});
  
  @override
  String toString() => message;
}

class OrderService {
  OrderService() : _client = Supabase.instance.client;

  final SupabaseClient _client;

  Future<List<OrderSummary>> fetchOrders() async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) return [];

      final response = await _client
          .from('orders')
          .select('*, order_items(*, product:products(*))')
          .eq('user_id', user.id)
          .order('created_at', ascending: false);

      return (response as List)
          .map((item) => OrderSummary.fromMap(Map<String, dynamic>.from(item as Map)))
          .toList();
    } catch (e) {
      throw OrderException(message: 'Failed to load orders. Please try again.');
    }
  }

  Future<OrderSummary> createOrderFromCart({
    required String paymentMethod,
    required Map<String, dynamic> shippingAddress,
  }) async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) {
        throw OrderException(message: 'Please sign in to place an order.');
      }

      if (paymentMethod.trim().isEmpty) {
        throw OrderException(message: 'Please select a payment method.');
      }

      final result = await _client.rpc(
        'create_order_from_cart',
        params: {
          'p_payment_method': paymentMethod,
          'p_shipping_address': shippingAddress,
        },
      );

      return OrderSummary.fromMap(Map<String, dynamic>.from(result as Map));
    } catch (e) {
      if (e is OrderException) rethrow;
      
      final errorMessage = e.toString().toLowerCase();
      if (errorMessage.contains('insufficient stock')) {
        throw OrderException(
          message: 'One or more items are out of stock. Please update your cart.',
        );
      }
      
      if (errorMessage.contains('cart is empty')) {
        throw OrderException(message: 'Your cart is empty.');
      }
      
      throw OrderException(
        message: 'Failed to create order. Please try again.',
      );
    }
  }
}
