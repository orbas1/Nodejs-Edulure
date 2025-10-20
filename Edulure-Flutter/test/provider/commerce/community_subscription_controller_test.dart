import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';

import 'package:edulure_mobile/provider/commerce/community_subscription_controller.dart';
import 'package:edulure_mobile/provider/commerce/commerce_payments_controller.dart';
import 'package:edulure_mobile/services/commerce_models.dart';
import 'package:edulure_mobile/services/commerce_persistence_service.dart';

class _MockCommercePersistence extends Mock implements CommercePersistence {}

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

void main() {
  late _MockCommercePersistence persistence;
  late _TestPaymentsController paymentsController;
  late CommunitySubscriptionController controller;

  setUp(() {
    persistence = _MockCommercePersistence();
    paymentsController = _TestPaymentsController();
    when(persistence.saveCommunitySubscriptions).thenAnswer((_) async {});
  });

  Reader _buildReader() {
    return <T>(ProviderBase<T> provider) {
      if (provider == commercePaymentsControllerProvider.notifier) {
        return paymentsController as T;
      }
      throw UnsupportedError('Unsupported provider: $provider');
    };
  }

  CommunitySubscriptionSnapshot _snapshot() {
    final plan = CommunitySubscriptionPlan(
      id: 'plan_1',
      name: 'Growth Guild',
      description: 'test',
      price: 100,
      currency: 'USD',
      billingCycle: BillingCycle.monthly,
      trialDays: 7,
      features: const ['One'],
      active: true,
    );
    final subscriber = CommunitySubscriber(
      id: 'sub_1',
      fullName: 'Jamie',
      email: 'jamie@example.com',
      company: 'Example',
      planId: plan.id,
      status: SubscriptionStatus.active,
      joinedAt: DateTime.now(),
      currentPeriodEnd: DateTime.now(),
      autoRenew: true,
      seats: 1,
    );
    final invoice = CommunityInvoice(
      id: 'inv_1',
      subscriberId: subscriber.id,
      planId: plan.id,
      amount: 100,
      currency: 'USD',
      tax: 8,
      discount: 0,
      status: InvoiceStatus.paid,
      issuedAt: DateTime.now(),
      dueDate: DateTime.now(),
      paidAt: DateTime.now(),
    );
    return CommunitySubscriptionSnapshot(
      plans: <CommunitySubscriptionPlan>[plan],
      subscribers: <CommunitySubscriber>[subscriber],
      invoices: <CommunityInvoice>[invoice],
    );
  }

  test('bootstrap loads subscriptions from persistence', () async {
    when(persistence.loadCommunitySubscriptions).thenAnswer((_) async => _snapshot());

    controller = CommunitySubscriptionController(
      persistence: persistence,
      read: _buildReader(),
    );

    await controller.bootstrap();

    expect(paymentsController.warmed, isTrue);
    expect(controller.state.plans, isNotEmpty);
    expect(controller.state.bootstrapped, isTrue);
  });

  test('bootstrap seeds data when persistence is empty', () async {
    when(persistence.loadCommunitySubscriptions).thenAnswer((_) async => null);

    controller = CommunitySubscriptionController(
      persistence: persistence,
      read: _buildReader(),
    );

    await controller.bootstrap();

    expect(controller.state.plans, isNotEmpty);
    verify(() => persistence.saveCommunitySubscriptions(any())).called(1);
  });

  test('deletePlan reassigns subscribers to fallback plan when available', () async {
    final snapshot = _snapshot();
    final fallbackPlan = CommunitySubscriptionPlan(
      id: 'plan_2',
      name: 'Fallback',
      description: 'Fallback',
      price: 120,
      currency: 'USD',
      billingCycle: BillingCycle.monthly,
      trialDays: 0,
      features: const [],
      active: true,
    );
    when(persistence.loadCommunitySubscriptions).thenAnswer((_) async => CommunitySubscriptionSnapshot(
          plans: <CommunitySubscriptionPlan>[...snapshot.plans, fallbackPlan],
          subscribers: snapshot.subscribers,
          invoices: snapshot.invoices,
        ));

    controller = CommunitySubscriptionController(
      persistence: persistence,
      read: _buildReader(),
    );
    await controller.bootstrap();

    controller.deletePlan(snapshot.plans.first.id);

    expect(controller.state.plans.length, 1);
    expect(controller.state.subscribers.single.planId, fallbackPlan.id);
  });

  test('monthlyRecurringRevenue aggregates paid invoices for current month', () async {
    when(persistence.loadCommunitySubscriptions).thenAnswer((_) async => _snapshot());
    controller = CommunitySubscriptionController(
      persistence: persistence,
      read: _buildReader(),
    );
    await controller.bootstrap();

    expect(controller.state.monthlyRecurringRevenue, greaterThan(0));
  });
}
