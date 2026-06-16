import 'product.dart';

class OrderLineItem {
  OrderLineItem({
    required this.id,
    required this.productId,
    required this.quantity,
    required this.unitPrice,
    required this.discountPercent,
    required this.product,
  });

  final String id;
  final String productId;
  final int quantity;
  final double unitPrice;
  final int discountPercent;
  final Product? product;

  double get discountedUnitPrice =>
      unitPrice * (1 - (discountPercent.clamp(0, 100) / 100.0));

  factory OrderLineItem.fromMap(Map<String, dynamic> map) {
    final productRaw = map['product'] ?? map['products'];

    return OrderLineItem(
      id: (map['id'] ?? '${map['product_id']}-${map['quantity']}').toString(),
      productId: (map['product_id'] ?? '').toString(),
      quantity: int.tryParse((map['quantity'] ?? 0).toString()) ?? 0,
      unitPrice: double.tryParse((map['unit_price'] ?? 0).toString()) ?? 0,
      discountPercent: int.tryParse((map['discount_percent'] ?? 0).toString()) ?? 0,
      product: productRaw is Map ? Product.fromMap(Map<String, dynamic>.from(productRaw)) : null,
    );
  }
}

class OrderSummary {
  OrderSummary({
    required this.id,
    required this.paymentMethod,
    required this.status,
    required this.trackingCode,
    required this.subtotal,
    required this.wholesaleDiscount,
    required this.loyaltyDiscount,
    required this.totalAmount,
    required this.shippingAddress,
    required this.createdAt,
    required this.items,
  });

  final String id;
  final String paymentMethod;
  final String status;
  final String trackingCode;
  final double subtotal;
  final double wholesaleDiscount;
  final double loyaltyDiscount;
  final double totalAmount;
  final Map<String, dynamic> shippingAddress;
  final DateTime? createdAt;
  final List<OrderLineItem> items;

  factory OrderSummary.fromMap(Map<String, dynamic> map) {
    final rawItems = (map['order_items'] as List?) ?? const [];
    final rawAddress = map['shipping_address'];

    return OrderSummary(
      id: map['id'].toString(),
      paymentMethod: (map['payment_method'] ?? '').toString(),
      status: (map['status'] ?? '').toString(),
      trackingCode: (map['tracking_code'] ?? '').toString(),
      subtotal: double.tryParse((map['subtotal'] ?? 0).toString()) ?? 0,
      wholesaleDiscount:
          double.tryParse((map['wholesale_discount'] ?? 0).toString()) ?? 0,
      loyaltyDiscount:
          double.tryParse((map['loyalty_discount'] ?? 0).toString()) ?? 0,
      totalAmount: double.tryParse((map['total_amount'] ?? 0).toString()) ?? 0,
      shippingAddress: rawAddress is Map<String, dynamic>
          ? rawAddress
          : rawAddress is Map
          ? Map<String, dynamic>.from(rawAddress)
          : <String, dynamic>{},
      createdAt: map['created_at'] == null
          ? null
          : DateTime.tryParse(map['created_at'].toString()),
      items: rawItems
          .whereType<Map>()
          .map((item) => OrderLineItem.fromMap(Map<String, dynamic>.from(item)))
          .toList(),
    );
  }
}
