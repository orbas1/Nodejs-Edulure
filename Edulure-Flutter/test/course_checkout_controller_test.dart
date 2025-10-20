import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:edulure_mobile/provider/commerce/commerce_payments_controller.dart';
import 'package:edulure_mobile/provider/commerce/course_checkout_controller.dart';
import 'package:edulure_mobile/services/commerce_models.dart';
import 'package:edulure_mobile/services/commerce_persistence_service.dart';

import 'test_util/fake_commerce_persistence.dart';

void main() {
  test('course checkout controller creates order with coupon application', () async {
    final persistence = FakeCommercePersistence();
    final container = ProviderContainer(overrides: [
      commercePersistenceProvider.overrideWithValue(persistence),
    ]);
    addTearDown(container.dispose);

    final paymentsController = container.read(commercePaymentsControllerProvider.notifier);
    await paymentsController.bootstrap();

    final checkoutController = container.read(courseCheckoutControllerProvider.notifier);
    await checkoutController.bootstrap();

    final state = container.read(courseCheckoutControllerProvider);
    final offer = state.offers.first;
    final payment = container.read(commercePaymentsControllerProvider).defaultMethod!;
    final coupon = state.coupons.first;

    final order = checkoutController.createOrder(
      offer: offer,
      learnerName: 'Test Learner',
      learnerEmail: 'test@example.com',
      quantity: 2,
      paymentMethod: payment,
      coupon: coupon,
    );

    final updatedState = container.read(courseCheckoutControllerProvider);
    expect(updatedState.orders.length, equals(1));
    expect(updatedState.orders.first.total, lessThan(offer.price * 2 + (offer.price * 2 * 0.08)));
    expect(order.couponCode, equals(coupon.code));
    expect(persistence.courseSnapshot?.orders.length, equals(1));
  });
}
