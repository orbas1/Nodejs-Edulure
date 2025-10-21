import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:edulure_mobile/provider/commerce/course_checkout_controller.dart';
import 'package:edulure_mobile/provider/commerce/commerce_payments_controller.dart';
import 'package:edulure_mobile/provider/learning/learning_models.dart';
import 'package:edulure_mobile/provider/learning/learning_store.dart';
import 'package:edulure_mobile/services/commerce_models.dart';
import 'package:edulure_mobile/services/commerce_persistence_service.dart';

class _MockCommercePersistence extends Mock implements CommercePersistence {}

class _TestPaymentsController extends CommercePaymentsController {
  _TestPaymentsController()
      : super(
          persistence: _NoopCommercePersistence(),
        );

  bool warmed = false;

  @override
  Future<void> bootstrap() async {
    warmed = true;
  }
}

class _NoopCommercePersistence implements CommercePersistence {
  @override
  Future<void> reset() async {}

  @override
  Future<CourseCheckoutSnapshot?> loadCourseCheckout() async => null;

  @override
  Future<List<CommercePaymentMethod>?> loadPaymentMethods() async => null;

  @override
  Future<CommunitySubscriptionSnapshot?> loadCommunitySubscriptions() async => null;

  @override
  Future<TutorBookingSnapshot?> loadTutorBookings() async => null;

  @override
  Future<void> saveCourseCheckout(CourseCheckoutSnapshot snapshot) async {}

  @override
  Future<void> savePaymentMethods(List<CommercePaymentMethod> methods) async {}

  @override
  Future<void> saveCommunitySubscriptions(CommunitySubscriptionSnapshot snapshot) async {}

  @override
  Future<void> saveTutorBookings(TutorBookingSnapshot snapshot) async {}
}

void main() {
  late _MockCommercePersistence persistence;
  late _TestPaymentsController paymentsController;
  late CourseCheckoutController controller;
  late List<Course> courses;

  setUp(() {
    persistence = _MockCommercePersistence();
    paymentsController = _TestPaymentsController();
    when(persistence.saveCourseCheckout).thenAnswer((_) async {});
    courses = <Course>[
      Course(
        id: 'course-1',
        title: 'Ops Sprint',
        category: 'Ops',
        level: 'Intermediate',
        summary: 'Summary',
        thumbnailUrl: 'https://image',
        price: 200,
        modules: const <CourseModule>[],
        language: 'en',
        tags: const ['ops'],
      ),
    ];
  });

  Reader _reader() {
    return <T>(ProviderBase<T> provider) {
      if (provider == commercePaymentsControllerProvider.notifier) {
        return paymentsController as T;
      }
      if (provider == courseStoreProvider) {
        return courses as T;
      }
      throw UnsupportedError('Unsupported provider $provider');
    };
  }

  CourseCheckoutSnapshot _snapshot() {
    final offer = CourseCheckoutOffer(
      id: 'offer-1',
      courseId: 'course-1',
      courseTitle: 'Ops Sprint',
      cohortName: 'Ops Cohort',
      price: 250,
      currency: 'USD',
      startDate: DateTime.now(),
      endDate: DateTime.now().add(const Duration(days: 30)),
      seats: 20,
      deliveryFormat: 'Hybrid',
      pacing: 'Self-paced',
      liveSupport: true,
      tags: const ['ops'],
      bonuses: const [],
    );
    final order = CourseCheckoutOrder(
      id: 'order-1',
      offerId: offer.id,
      offerName: offer.cohortName,
      learnerName: 'Jamie',
      learnerEmail: 'jamie@example.com',
      quantity: 1,
      subtotal: 250,
      discount: 0,
      tax: 20,
      total: 270,
      currency: 'USD',
      status: CourseOrderStatus.confirmed,
      createdAt: DateTime.now(),
      paymentMethodId: 'pm_1',
    );
    final coupon = CourseCoupon(
      code: 'SAVE10',
      description: 'Save',
      percentOff: 10,
      maxRedemptions: 5,
    );
    return CourseCheckoutSnapshot(
      offers: <CourseCheckoutOffer>[offer],
      orders: <CourseCheckoutOrder>[order],
      coupons: <CourseCoupon>[coupon],
    );
  }

  test('bootstrap restores snapshot from persistence', () async {
    when(persistence.loadCourseCheckout).thenAnswer((_) async => _snapshot());

    controller = CourseCheckoutController(
      persistence: persistence,
      read: _reader(),
    );

    await controller.bootstrap();

    expect(paymentsController.warmed, isTrue);
    expect(controller.state.offers, isNotEmpty);
    expect(controller.state.bootstrapped, isTrue);
  });

  test('createOrder applies coupon discounts and persists snapshot', () async {
    when(persistence.loadCourseCheckout).thenAnswer((_) async => _snapshot());
    controller = CourseCheckoutController(
      persistence: persistence,
      read: _reader(),
    );
    await controller.bootstrap();

    final offer = controller.state.offers.first;
    final coupon = controller.state.coupons.first;
    final paymentMethod = CommercePaymentMethod.card(
      id: 'pm_1',
      brand: 'Visa',
      last4: '4242',
      expMonth: 1,
      expYear: 2030,
      accountHolder: 'Jamie',
      billingEmail: 'jamie@example.com',
      defaultMethod: true,
      country: 'US',
    );

    final order = controller.createOrder(
      offer: offer,
      learnerName: 'Jamie',
      learnerEmail: 'jamie@example.com',
      quantity: 2,
      paymentMethod: paymentMethod,
      coupon: coupon,
    );

    expect(order.discount, greaterThan(0));
    expect(controller.state.coupons.first.redeemed, 1);
    verify(() => persistence.saveCourseCheckout(any())).called(greaterThan(0));
  });

  test('duplicateOffer creates an unpublished copy with new id', () async {
    when(persistence.loadCourseCheckout).thenAnswer((_) async => _snapshot());
    controller = CourseCheckoutController(
      persistence: persistence,
      read: _reader(),
    );
    await controller.bootstrap();

    final offer = controller.state.offers.first;
    final duplicate = controller.duplicateOffer(offer);

    expect(duplicate.id, isNot(offer.id));
    expect(duplicate.published, isFalse);
  });
}
