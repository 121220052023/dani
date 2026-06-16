class ProductComment {
  ProductComment({
    required this.id,
    required this.userId,
    required this.productId,
    required this.rating,
    required this.title,
    this.comment,
    required this.isVerifiedPurchase,
    required this.helpfulCount,
    required this.createdAt,
    this.reviewerName,
  });

  final String id;
  final String userId;
  final String productId;
  final int rating;
  final String title;
  final String? comment;
  final bool isVerifiedPurchase;
  final int helpfulCount;
  final DateTime createdAt;
  final String? reviewerName;

  factory ProductComment.fromMap(Map<String, dynamic> map) {
    final profile = map['profiles'];
    final profileMap = profile is Map<String, dynamic>
        ? profile
        : profile is Map
        ? Map<String, dynamic>.from(profile)
        : <String, dynamic>{};

    final fullName = profileMap['full_name']?.toString().trim();
    final email = profileMap['email']?.toString().trim();
    final reviewerName = (fullName != null && fullName.isNotEmpty)
        ? fullName
        : (email != null && email.isNotEmpty)
            ? email.split('@').first
            : 'Anonymous';

    return ProductComment(
      id: (map['id'] ?? '').toString(),
      userId: (map['user_id'] ?? '').toString(),
      productId: (map['product_id'] ?? '').toString(),
      rating: int.tryParse((map['rating'] ?? 0).toString()) ?? 0,
      title: (map['title'] ?? '').toString(),
      comment: map['comment']?.toString(),
      isVerifiedPurchase: map['is_verified_purchase'] == true,
      helpfulCount: int.tryParse((map['helpful_count'] ?? 0).toString()) ?? 0,
      createdAt: map['created_at'] == null
          ? DateTime.now()
          : DateTime.tryParse(map['created_at'].toString()) ?? DateTime.now(),
      reviewerName: reviewerName,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'rating': rating,
      'title': title,
      'comment': comment,
      'product_id': productId,
    };
  }
}
