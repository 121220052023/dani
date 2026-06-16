import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/product.dart';

class CatalogException implements Exception {
  final String message;
  
  CatalogException({required this.message});
  
  @override
  String toString() => message;
}

class CatalogService {
  CatalogService() : _client = Supabase.instance.client;

  final SupabaseClient _client;

  Future<List<Product>> fetchProducts() async {
    try {
      final response = await _client
          .from('products')
          .select('*')
          .order('created_at', ascending: false);

      return (response as List)
          .map((item) => Product.fromMap(Map<String, dynamic>.from(item as Map)))
          .toList();
    } catch (e) {
      // Log the actual error for debugging
      debugPrint('DEBUG: Product fetch error: $e');
      throw CatalogException(message: 'Failed to load products. Please try again.');
    }
  }

  Future<Map<String, dynamic>> fetchProductsPaginated({
    int page = 1,
    int pageSize = 20,
    String? category,
    String? brand,
    String? searchQuery,
  }) async {
    try {
      final from = (page - 1) * pageSize;
      final to = from + pageSize - 1;

      var query = _client
          .from('products')
          .select('*');

      // Apply filters before ordering
      if (category != null && category != 'All') {
        query = query.eq('category', category);
      }

      if (brand != null && brand != 'All') {
        query = query.eq('brand', brand);
      }

      if (searchQuery != null && searchQuery.isNotEmpty) {
        final searchPattern = '%$searchQuery%';
        query = query.or('name.ilike.$searchPattern,brand.ilike.$searchPattern,description.ilike.$searchPattern');
      }

      // Apply ordering and pagination last
      final response = await query
          .order('created_at', ascending: false)
          .range(from, to);
      
      return {
        'products': (response as List)
            .map((item) => Product.fromMap(Map<String, dynamic>.from(item as Map)))
            .toList(),
        'hasMore': response.length == pageSize,
      };
    } catch (e) {
      debugPrint('DEBUG: Paginated product fetch error: $e');
      throw CatalogException(message: 'Failed to load products. Please try again.');
    }
  }
}
