import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/services/commerce_models.dart';

void main() {
  group('CommerceJsonEncoder', () {
    const encoder = CommerceJsonEncoder();

    test('round-trips course checkout snapshot', () {
      final snapshot = CourseCheckoutSnapshot(
        offers: const [],
        orders: const [],
        coupons: const [],
      );

      final encoded = encoder.encodeCourseSnapshot(snapshot);
      final restored = encoder.decodeCourseSnapshot(encoded);

      expect(restored.offers, isEmpty);
      expect(restored.orders, isEmpty);
    });

    test('round-trips payment methods', () {
      final methods = [
        CommercePaymentMethod.card(
          brand: 'Visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2030,
        ),
      ];

      final encoded = encoder.encodePaymentMethods(methods);
      final restored = encoder.decodePaymentMethods(encoded);

      expect(restored.single.brand, 'Visa');
      expect(restored.single.last4, '4242');
    });
  });
}
