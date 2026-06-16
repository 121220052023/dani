import 'product.dart';

class CartEntry {
  CartEntry({
    required this.id,
    required this.productId,
    required this.quantity,
    required this.createdAt,
    required this.product,
  });

  final String id;
  final String productId;
  final int quantity;
  final DateTime? createdAt;
  final Product product;

  double get total => product.discountedPrice * quantity;

  factory CartEntry.fromMap(Map<String, dynamic> map) {
    final productMap = Map<String, dynamic>.from(
      (map['product'] ?? map['products'] ?? const <String, dynamic>{}) as Map,
    );

    return CartEntry(
      id: map['id'].toString(),
      productId: (map['product_id'] ?? '').toString(),
      quantity: int.tryParse((map['quantity'] ?? 1).toString()) ?? 1,
      createdAt: map['created_at'] == null
          ? null
          : DateTime.tryParse(map['created_at'].toString()),
      product: Product.fromMap(productMap),
    );
  }
}
