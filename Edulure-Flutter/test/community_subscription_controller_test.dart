import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:edulure_mobile/provider/commerce/commerce_payments_controller.dart';
import 'package:edulure_mobile/provider/commerce/community_subscription_controller.dart';
import 'package:edulure_mobile/services/commerce_models.dart';

import 'test_util/fake_commerce_persistence.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeCommercePersistence persistence;
  late ProviderContainer container;
  late CommunitySubscriptionController controller;

  setUp(() async {
    persistence = FakeCommercePersistence();
    container = ProviderContainer(overrides: [
      commercePersistenceProvider.overrideWithValue(persistence),
    ]);
    addTearDown(container.dispose);

    await container.read(commercePaymentsControllerProvider.notifier).bootstrap();
    controller = container.read(communitySubscriptionControllerProvider.notifier);
    await controller.bootstrap();
  });

  test('community subscription controller manages plans and invoices', () async {
    final state = container.read(communitySubscriptionControllerProvider);
    final plan = state.plans.first;
    final subscriber = state.subscribers.first;

    final newInvoice = CommunityInvoice(
      id: generateCommerceId('invoice'),
      subscriberId: subscriber.id,
      planId: plan.id,
      amount: plan.price,
      currency: 'USD',
      tax: 10,
      discount: 0,
      status: InvoiceStatus.open,
      issuedAt: DateTime.now(),
      dueDate: DateTime.now().add(const Duration(days: 7)),
    );

    controller.upsertInvoice(newInvoice);

    var updated = container.read(communitySubscriptionControllerProvider);
    expect(updated.invoices.any((invoice) => invoice.id == newInvoice.id), isTrue);
    expect(persistence.communitySnapshot?.invoices.length, greaterThan(0));

    final paidInvoice = newInvoice.copyWith(status: InvoiceStatus.paid, paidAt: DateTime.now());
    controller.upsertInvoice(paidInvoice);

    updated = container.read(communitySubscriptionControllerProvider);
    final storedInvoice = updated.invoices.firstWhere((invoice) => invoice.id == newInvoice.id);
    expect(storedInvoice.status, InvoiceStatus.paid);
    expect(storedInvoice.paidAt, isNotNull);
  });

  test('deleting plans reassigns subscribers before canceling exhausted cohorts', () async {
    final initialState = container.read(communitySubscriptionControllerProvider);
    final primarySubscriber = initialState.subscribers.first;
    final initialPlanId = primarySubscriber.planId;

    controller.deletePlan(initialPlanId);

    var updated = container.read(communitySubscriptionControllerProvider);
    expect(updated.plans.any((plan) => plan.id == initialPlanId), isFalse);
    final reassigned = updated.subscribers.firstWhere((subscriber) => subscriber.id == primarySubscriber.id);
    expect(reassigned.planId, isNot(initialPlanId));
    expect(reassigned.status, isNot(SubscriptionStatus.canceled));

    // Remove all remaining plans to ensure orphaned subscribers are gracefully canceled.
    for (final plan in updated.plans.toList()) {
      controller.deletePlan(plan.id);
    }

    updated = container.read(communitySubscriptionControllerProvider);
    final canceled = updated.subscribers.firstWhere((subscriber) => subscriber.id == primarySubscriber.id);
    expect(canceled.status, SubscriptionStatus.canceled);
  });

  test('revenue metrics respond to invoice payments and churn updates', () async {
    final state = container.read(communitySubscriptionControllerProvider);
    final invoice = state.invoices.first;
    final paidInvoice = invoice.copyWith(status: InvoiceStatus.paid, paidAt: DateTime.now());

    controller.upsertInvoice(paidInvoice);

    var metrics = container.read(communitySubscriptionControllerProvider);
    expect(metrics.monthlyRecurringRevenue, greaterThan(0));
    expect(metrics.annualRunRate, closeTo(metrics.monthlyRecurringRevenue * 12, 0.0001));

    final subscriber = metrics.subscribers.first;
    controller.upsertSubscriber(subscriber.copyWith(status: SubscriptionStatus.canceled));

    metrics = container.read(communitySubscriptionControllerProvider);
    expect(metrics.churnRate, greaterThanOrEqualTo(0));
    expect(metrics.churnRate, lessThanOrEqualTo(1));
  });
}
