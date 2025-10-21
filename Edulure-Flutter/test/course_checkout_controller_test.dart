import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:edulure_mobile/provider/commerce/commerce_payments_controller.dart';
import 'package:edulure_mobile/provider/commerce/course_checkout_controller.dart';
import 'package:edulure_mobile/services/commerce_models.dart';
import 'package:edulure_mobile/services/commerce_persistence_service.dart';

import 'test_util/fake_commerce_persistence.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeCommercePersistence persistence;
  late ProviderContainer container;
  late CourseCheckoutController controller;

  setUp(() async {
    persistence = FakeCommercePersistence();
    container = ProviderContainer(overrides: [
      commercePersistenceProvider.overrideWithValue(persistence),
    ]);
    addTearDown(container.dispose);

    final paymentsController = container.read(commercePaymentsControllerProvider.notifier);
    await paymentsController.bootstrap();

    controller = container.read(courseCheckoutControllerProvider.notifier);
    await controller.bootstrap();
  });

  test('course checkout controller creates order with coupon application', () async {
    final state = container.read(courseCheckoutControllerProvider);
    final offer = state.offers.first;
    final payment = container.read(commercePaymentsControllerProvider).defaultMethod!;
    final coupon = state.coupons.first;

    final order = controller.createOrder(
      offer: offer,
      learnerName: 'Test Learner',
      learnerEmail: 'test@example.com',
      quantity: 2,
      paymentMethod: payment,
      coupon: coupon,
    );

    final updatedState = container.read(courseCheckoutControllerProvider);
    expect(updatedState.orders.length, equals(1));
    expect(updatedState.orders.first.total,
        lessThan(offer.price * 2 + (offer.price * 2 * 0.08)));
    expect(order.couponCode, equals(coupon.code));
    expect(persistence.courseSnapshot?.orders.length, equals(1));
    expect(updatedState.totalRevenue, greaterThan(0));
  });

  test('deleting offers prunes dependent orders and resolves coupons predictably', () async {
    final state = container.read(courseCheckoutControllerProvider);
    final offer = state.offers.first;
    final payment = container.read(commercePaymentsControllerProvider).defaultMethod!;
    final coupon = state.coupons.first;

    controller.createOrder(
      offer: offer,
      learnerName: 'Casey Client',
      learnerEmail: 'casey@example.com',
      quantity: 1,
      paymentMethod: payment,
      coupon: coupon,
    );

    controller.deleteOffer(offer.id);

    final updated = container.read(courseCheckoutControllerProvider);
    expect(updated.offers.any((item) => item.id == offer.id), isFalse);
    expect(updated.orders.any((order) => order.offerId == offer.id), isFalse);
    expect(persistence.courseSnapshot?.offers.any((item) => item.id == offer.id), isFalse);

    final resolvedCoupon = updated.resolveCoupon(coupon.code.toLowerCase());
    expect(resolvedCoupon, isNotNull);
    expect(resolvedCoupon!.code, coupon.code);
    expect(updated.resolveCoupon('DOES-NOT-EXIST'), isNull);
  });
}
