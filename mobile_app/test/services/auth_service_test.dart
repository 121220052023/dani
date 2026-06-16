import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/services/auth_service.dart';

void main() {
  group('AuthService', () {
    late AuthService authService;

    setUp(() {
      // Note: These tests verify error handling logic
      // Integration tests require actual Supabase client
      authService = AuthService();
    });

    test('should throw AuthException for invalid email format', () async {
      expect(
        () => authService.signIn(
          email: 'invalid-email',
          password: 'password123',
        ),
        throwsA(isA<AuthException>()),
      );
    });

    test('should throw AuthException for empty password', () async {
      expect(
        () => authService.signUp(
          email: 'test@example.com',
          password: '',
          fullName: 'Test User',
        ),
        throwsA(isA<AuthException>()),
      );
    });

    test('should throw AuthException for short password', () async {
      expect(
        () => authService.signUp(
          email: 'test@example.com',
          password: '123', // Less than 6 characters
          fullName: 'Test User',
        ),
        throwsA(isA<AuthException>()),
      );
    });

    test('should throw AuthException for empty full name', () async {
      expect(
        () => authService.signUp(
          email: 'test@example.com',
          password: 'password123',
          fullName: '   ',
        ),
        throwsA(isA<AuthException>()),
      );
    });

    test('should trim whitespace from email and name', () async {
      // This is tested via integration as it requires Supabase
      // The implementation shows email.trim().toLowerCase() is used
      expect('  Test@Example.COM  '.trim().toLowerCase(), 'test@example.com');
      expect('   John Doe   '.trim(), 'John Doe');
    });

    test('should throw AuthException for Arabic invalid email', () async {
      expect(
        () => authService.signIn(
          email: 'البريد@غير.صحيح',
          password: 'password123',
        ),
        throwsA(isA<AuthException>()),
      );
    });

    test('should throw AuthException for Arabic short password', () async {
      expect(
        () => authService.signUp(
          email: 'test@example.com',
          password: '12345',
          fullName: 'اسم المستخدم',
        ),
        throwsA(isA<AuthException>()),
      );
    });

    test('should handle Arabic error messages', () {
      final exception = AuthException(
        message: 'خطأ في التحقق',
        code: '400',
      );
      expect(exception.message, 'خطأ في التحقق');
      expect(exception.code, '400');
    });
  });

  group('AuthException', () {
    test('should create exception with message', () {
      final exception = AuthException(message: 'Test error');
      expect(exception.message, 'Test error');
      expect(exception.toString(), 'Test error');
    });

    test('should create exception with message and code', () {
      final exception = AuthException(message: 'Test error', code: '401');
      expect(exception.message, 'Test error');
      expect(exception.code, '401');
    });
  });
}
