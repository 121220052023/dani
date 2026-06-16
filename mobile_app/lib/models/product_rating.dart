class ProductRating {
  ProductRating({
    required this.productId,
    required this.averageRating,
    required this.totalReviews,
    required this.rating1Count,
    required this.rating2Count,
    required this.rating3Count,
    required this.rating4Count,
    required this.rating5Count,
  });

  final String productId;
  final double averageRating;
  final int totalReviews;
  final int rating1Count;
  final int rating2Count;
  final int rating3Count;
  final int rating4Count;
  final int rating5Count;

  factory ProductRating.fromMap(Map<String, dynamic> map) {
    return ProductRating(
      productId: (map['product_id'] ?? '').toString(),
      averageRating: double.tryParse((map['average_rating'] ?? 0).toString()) ?? 0.0,
      totalReviews: int.tryParse((map['total_reviews'] ?? 0).toString()) ?? 0,
      rating1Count: int.tryParse((map['rating_1_count'] ?? 0).toString()) ?? 0,
      rating2Count: int.tryParse((map['rating_2_count'] ?? 0).toString()) ?? 0,
      rating3Count: int.tryParse((map['rating_3_count'] ?? 0).toString()) ?? 0,
      rating4Count: int.tryParse((map['rating_4_count'] ?? 0).toString()) ?? 0,
      rating5Count: int.tryParse((map['rating_5_count'] ?? 0).toString()) ?? 0,
    );
  }

  int getRatingPercentage(int rating) {
    if (totalReviews == 0) return 0;
    final count = _getRatingCount(rating);
    return ((count / totalReviews) * 100).toInt();
  }

  int _getRatingCount(int rating) {
    switch (rating) {
      case 1:
        return rating1Count;
      case 2:
        return rating2Count;
      case 3:
        return rating3Count;
      case 4:
        return rating4Count;
      case 5:
        return rating5Count;
      default:
        return 0;
    }
  }
}
