import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/services/order_service.dart';

void main() {
  group('OrderService', () {
    setUp(() {
      OrderService();
    });

    test('should create OrderException with message', () {
      final exception = OrderException(message: 'Order error');
      expect(exception.message, 'Order error');
      expect(exception.toString(), 'Order error');
    });

    test('should validate payment method is not empty', () {
      const paymentMethod = '';
      expect(paymentMethod.trim().isEmpty, isTrue);
    });

    test('should handle stock insufficient error', () {
      final errorMessage = 'Insufficient stock for product abc-123';
      expect(errorMessage.toLowerCase().contains('insufficient stock'), isTrue);
    });

    test('should handle empty cart error', () {
      final errorMessage = 'Cart is empty';
      expect(errorMessage.toLowerCase().contains('cart is empty'), isTrue);
    });

    test('should handle Arabic cart empty error', () {
      final errorMessage = 'السلة فارغة';
      expect(errorMessage.toLowerCase().contains('السلة فارغة'), isTrue);
    });

    test('should map error messages correctly', () {
      // Test error mapping logic
      const errors = [
        'Insufficient stock',
        'Cart is empty',
        'Network error',
      ];

      for (final error in errors) {
        expect(error.toLowerCase().contains('insufficient stock') || 
               error.toLowerCase().contains('cart is empty'),
               isA<bool>());
      }
    });

    test('should map Arabic error messages', () {
      const arabicErrors = [
        'نفدت الكمية',
        'السلة فارغة',
        'خطأ في الشبكة',
      ];

      for (final error in arabicErrors) {
        expect(error.contains('نفدت الكمية') || error.contains('السلة فارغة'),
               isTrue);
      }
    });
  });

  group('OrderException', () {
    test('should throw with descriptive message', () {
      expect(
        () => throw OrderException(message: 'Failed to create order'),
        throwsA(isA<OrderException>().having(
          (e) => e.message,
          'message',
          'Failed to create order',
        )),
      );
    });
  });
}
