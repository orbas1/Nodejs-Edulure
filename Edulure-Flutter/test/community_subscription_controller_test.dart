import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:edulure_mobile/provider/commerce/commerce_payments_controller.dart';
import 'package:edulure_mobile/provider/commerce/community_subscription_controller.dart';
import 'package:edulure_mobile/services/commerce_models.dart';

import 'test_util/fake_commerce_persistence.dart';

void main() {
  test('community subscription controller manages plans and invoices', () async {
    final persistence = FakeCommercePersistence();
    final container = ProviderContainer(overrides: [
      commercePersistenceProvider.overrideWithValue(persistence),
    ]);
    addTearDown(container.dispose);

    await container.read(commercePaymentsControllerProvider.notifier).bootstrap();
    final controller = container.read(communitySubscriptionControllerProvider.notifier);
    await controller.bootstrap();

    final plan = container.read(communitySubscriptionControllerProvider).plans.first;
    final subscriber = container.read(communitySubscriptionControllerProvider).subscribers.first;

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

    final updated = container.read(communitySubscriptionControllerProvider);
    expect(updated.invoices.any((invoice) => invoice.id == newInvoice.id), isTrue);
    expect(persistence.communitySnapshot?.invoices.length, greaterThan(0));
  });
}
