import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/user_address.dart';

class AddressException implements Exception {
  final String message;
  
  AddressException({required this.message});
  
  @override
  String toString() => message;
}

class AddressService {
  AddressService() : _client = Supabase.instance.client;

  final SupabaseClient _client;

  Future<List<UserAddress>> fetchUserAddresses() async {
    try {
      final response = await _client
          .from('user_addresses')
          .select('*')
          .order('is_default', ascending: false)
          .order('created_at', ascending: false);

      return (response as List)
          .map((item) => UserAddress.fromMap(Map<String, dynamic>.from(item as Map)))
          .toList();
    } catch (e) {
      debugPrint('DEBUG: Fetch addresses error: $e');
      throw AddressException(message: 'Failed to load addresses');
    }
  }

  Future<UserAddress> createAddress(UserAddress address) async {
    try {
      // Set all other addresses to not default if this is default
      if (address.isDefault) {
        await _client
            .from('user_addresses')
            .update({'is_default': false})
            .eq('user_id', _client.auth.currentUser!.id);
      }

      final response = await _client
          .from('user_addresses')
          .insert({
            ...address.toMap(includeId: false),
            'user_id': _client.auth.currentUser!.id,
          })
          .select()
          .single();

      return UserAddress.fromMap(Map<String, dynamic>.from(response as Map));
    } catch (e) {
      debugPrint('DEBUG: Create address error: $e');
      throw AddressException(message: 'Failed to create address');
    }
  }

  Future<UserAddress> updateAddress(UserAddress address) async {
    try {
      // Set all other addresses to not default if this is default
      if (address.isDefault) {
        await _client
            .from('user_addresses')
            .update({'is_default': false})
            .eq('user_id', _client.auth.currentUser!.id)
            .neq('id', address.id);
      }

      final response = await _client
          .from('user_addresses')
          .update(address.toMap())
          .eq('id', address.id)
          .select()
          .single();

      return UserAddress.fromMap(Map<String, dynamic>.from(response as Map));
    } catch (e) {
      debugPrint('DEBUG: Update address error: $e');
      throw AddressException(message: 'Failed to update address');
    }
  }

  Future<void> deleteAddress(String addressId) async {
    try {
      await _client
          .from('user_addresses')
          .delete()
          .eq('id', addressId);
    } catch (e) {
      debugPrint('DEBUG: Delete address error: $e');
      throw AddressException(message: 'Failed to delete address');
    }
  }

  Future<UserAddress?> getDefaultAddress() async {
    try {
      final response = await _client
          .from('user_addresses')
          .select('*')
          .eq('is_default', true)
          .maybeSingle();

      return response != null
          ? UserAddress.fromMap(Map<String, dynamic>.from(response as Map))
          : null;
    } catch (e) {
      debugPrint('DEBUG: Fetch default address error: $e');
      return null;
    }
  }
}
