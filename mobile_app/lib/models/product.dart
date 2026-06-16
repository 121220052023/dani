class Product {
  Product({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    required this.category,
    required this.brand,
    required this.price,
    required this.discountPercent,
    required this.stock,
    required this.tags,
    required this.imageUrl,
    required this.isBestSeller,
    required this.isFeatured,
    required this.isHotDeal,
    required this.createdAt,
  });

  final String id;
  final String name;
  final String? slug;
  final String description;
  final String category;
  final String brand;
  final double price;
  final int discountPercent;
  final int stock;
  final List<String> tags;
  final String? imageUrl;
  final bool isBestSeller;
  final bool isFeatured;
  final bool isHotDeal;
  final DateTime? createdAt;

  double get discountedPrice =>
      price * (1 - (discountPercent.clamp(0, 100) / 100.0));

  bool get isLowStock => stock > 0 && stock < 5;
  bool get isOutOfStock => stock <= 0;

  factory Product.fromMap(Map<String, dynamic> map) {
    return Product(
      id: map['id'].toString(),
      name: (map['name'] ?? '').toString(),
      slug: map['slug']?.toString(),
      description: (map['description'] ?? '').toString(),
      category: (map['category'] ?? '').toString(),
      brand: (map['brand'] ?? '').toString(),
      price: double.tryParse((map['price'] ?? 0).toString()) ?? 0,
      discountPercent: int.tryParse((map['discount_percent'] ?? 0).toString()) ?? 0,
      stock: int.tryParse((map['stock'] ?? 0).toString()) ?? 0,
      tags: ((map['tags'] as List?) ?? const [])
          .map((tag) => tag.toString())
          .toList(),
      imageUrl: map['image_url']?.toString(),
      isBestSeller: map['is_best_seller'] == true,
      isFeatured: map['is_featured'] == true,
      isHotDeal: map['is_hot_deal'] == true,
      createdAt: map['created_at'] == null
          ? null
          : DateTime.tryParse(map['created_at'].toString()),
    );
  }
}
