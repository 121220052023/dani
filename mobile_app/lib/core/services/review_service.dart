import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/product_comment.dart';
import '../../models/product_rating.dart';
import '../../models/review.dart';

class ReviewException implements Exception {
  final String message;
  
  ReviewException({required this.message});
  
  @override
  String toString() => message;
}

class ReviewService {
  ReviewService() : _client = Supabase.instance.client;

  final SupabaseClient _client;

  Future<List<Review>> fetchReviews(String productId) async {
    try {
      final response = await _client
          .from('reviews')
          .select('*, profiles(full_name, email)')
          .eq('product_id', productId)
          .order('created_at', ascending: false);

      return (response as List)
          .map((item) => Review.fromMap(Map<String, dynamic>.from(item as Map)))
          .toList();
    } catch (e) {
      debugPrint('DEBUG: Fetch reviews error: $e');
      throw ReviewException(message: 'Failed to load reviews');
    }
  }

  Future<List<ProductComment>> fetchProductComments(String productId, {int limit = 10, int offset = 0}) async {
    try {
      final response = await _client
          .from('product_comments')
          .select('*, profiles(full_name, email)')
          .eq('product_id', productId)
          .order('created_at', ascending: false)
          .range(offset, offset + limit - 1);

      return (response as List)
          .map((item) => ProductComment.fromMap(Map<String, dynamic>.from(item as Map)))
          .toList();
    } catch (e) {
      debugPrint('DEBUG: Fetch product comments error: $e');
      throw ReviewException(message: 'Failed to load comments');
    }
  }

  Future<ProductRating?> fetchProductRating(String productId) async {
    try {
      final response = await _client
          .from('product_ratings')
          .select('*')
          .eq('product_id', productId)
          .maybeSingle();

      return response != null
          ? ProductRating.fromMap(Map<String, dynamic>.from(response as Map))
          : null;
    } catch (e) {
      debugPrint('DEBUG: Fetch product rating error: $e');
      return null;
    }
  }

  Future<void> addReview({
    required String productId,
    required int rating,
    required String comment,
  }) async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) {
        throw ReviewException(message: 'Create an account to leave a review');
      }

      await _client.from('reviews').insert({
        'user_id': user.id,
        'product_id': productId,
        'rating': rating,
        'comment': comment.trim(),
      });
    } catch (e) {
      debugPrint('DEBUG: Add review error: $e');
      throw ReviewException(message: 'Failed to add review');
    }
  }

  Future<ProductComment> submitComment({
    required String productId,
    required int rating,
    required String title,
    String? comment,
  }) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        throw ReviewException(message: 'User not authenticated');
      }

      // Check if user already reviewed this product
      final existing = await _client
          .from('product_comments')
          .select('id')
          .eq('user_id', userId)
          .eq('product_id', productId)
          .maybeSingle();

      Map<String, dynamic> data = {
        'user_id': userId,
        'product_id': productId,
        'rating': rating,
        'title': title,
        'comment': comment,
      };

      final dynamic response;
      if (existing != null) {
        // Update existing comment
        response = await _client
            .from('product_comments')
            .update(data)
            .eq('user_id', userId)
            .eq('product_id', productId)
            .select('*, profiles(full_name, email)')
            .single();
      } else {
        // Create new comment
        response = await _client
            .from('product_comments')
            .insert(data)
            .select('*, profiles(full_name, email)')
            .single();
      }

      return ProductComment.fromMap(Map<String, dynamic>.from(response as Map));
    } catch (e) {
      debugPrint('DEBUG: Submit comment error: $e');
      throw ReviewException(message: 'Failed to submit comment');
    }
  }

  Future<void> deleteComment(String commentId) async {
    try {
      await _client
          .from('product_comments')
          .delete()
          .eq('id', commentId);
    } catch (e) {
      debugPrint('DEBUG: Delete comment error: $e');
      throw ReviewException(message: 'Failed to delete comment');
    }
  }

  Future<void> markCommentHelpful(String commentId) async {
    try {
      await _client
          .from('product_comments')
          .update({'helpful_count': 'helpful_count + 1'})
          .eq('id', commentId);
    } catch (e) {
      debugPrint('DEBUG: Mark helpful error: $e');
      throw ReviewException(message: 'Failed to mark as helpful');
    }
  }
}
