import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthException implements Exception {
  final String message;
  final String? code;
  
  AuthException({required this.message, this.code});
  
  @override
  String toString() => message;
}

class AuthService {
  AuthService() : _client = Supabase.instance.client;

  final SupabaseClient _client;

  User? get currentUser => _client.auth.currentUser;
  Stream<AuthState> get authChanges => _client.auth.onAuthStateChange;

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email.trim().toLowerCase(),
        password: password,
      );
      return response;
    } on AuthException catch (e) {
      throw AuthException(
        message: _mapAuthError(e.message),
      );
    } catch (e) {
      throw AuthException(
        message: 'An unexpected error occurred. Please try again.',
      );
    }
  }

  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    try {
      // Validate input
      if (email.isEmpty || !email.contains('@')) {
        throw AuthException(message: 'Please enter a valid email address.');
      }
      
      if (password.length < 6) {
        throw AuthException(message: 'Password must be at least 6 characters.');
      }
      
      if (fullName.trim().isEmpty) {
        throw AuthException(message: 'Please enter your full name.');
      }

      final response = await _client.auth.signUp(
        email: email.trim().toLowerCase(),
        password: password,
        data: {'full_name': fullName.trim()},
      );
      return response;
    } on AuthException catch (e) {
      throw AuthException(
        message: _mapAuthError(e.message),
      );
    } catch (e) {
      throw AuthException(
        message: 'An unexpected error occurred. Please try again.',
      );
    }
  }

  Future<void> signInWithGoogle() async {
    try {
      await _client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: kIsWeb ? Uri.base.origin : null,
      );
    } catch (e) {
      throw AuthException(
        message: 'Failed to sign in with Google. Please try again.',
      );
    }
  }

  Future<void> signInWithGitHub() async {
    try {
      await _client.auth.signInWithOAuth(
        OAuthProvider.github,
        redirectTo: kIsWeb ? Uri.base.origin : null,
      );
    } catch (e) {
      throw AuthException(
        message: 'Failed to sign in with GitHub. Please try again.',
      );
    }
  }

  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } catch (e) {
      throw AuthException(
        message: 'Failed to sign out. Please try again.',
      );
    }
  }

  String _mapAuthError(String message) {
    final lowerMessage = message.toLowerCase();
    
    if (lowerMessage.contains('invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials.';
    }
    
    if (lowerMessage.contains('email not confirmed') || 
        lowerMessage.contains('email not confirmed')) {
      return 'Please verify your email address before signing in.';
    }
    
    if (lowerMessage.contains('user already registered') || 
        lowerMessage.contains('already registered')) {
      return 'An account with this email already exists.';
    }
    
    if (lowerMessage.contains('rate limit') || 
        lowerMessage.contains('too many requests')) {
      return 'Too many attempts. Please try again later.';
    }
    
    if (lowerMessage.contains('network') || 
        lowerMessage.contains('timeout')) {
      return 'Network error. Please check your connection.';
    }
    
    return message;
  }
}
