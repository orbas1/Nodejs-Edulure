import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../provider/commerce/billing_controller.dart';
import '../services/billing_service.dart';

class BillingIntegration {
  BillingIntegration({required BillingService service, required BillingController controller})
      : _service = service,
        _controller = controller;

  final BillingService _service;
  final BillingController _controller;

  Future<BillingAccountSnapshot> bootstrap() async {
    await _controller.bootstrap();
    return _controller.state.snapshot ?? await _service.loadSnapshot();
  }

  Future<void> synchronizeQueuedPurchases() async {
    await _controller.flushPendingPurchases();
  }

  Stream<BillingAccountSnapshot> watchSnapshots() {
    return _service.snapshots;
  }
}

final billingIntegrationProvider = Provider<BillingIntegration>((ref) {
  final service = ref.watch(billingServiceProvider);
  final controller = ref.watch(billingControllerProvider.notifier);
  return BillingIntegration(service: service, controller: controller);
});
