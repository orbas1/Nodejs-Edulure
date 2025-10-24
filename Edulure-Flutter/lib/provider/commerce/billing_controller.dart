import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/billing_service.dart';
import 'commerce_payments_controller.dart';

final billingServiceProvider = Provider<BillingService>((ref) {
  final persistence = ref.watch(commercePersistenceProvider);
  final service = BillingService(commercePersistence: persistence);
  ref.onDispose(() {
    unawaited(service.dispose());
  });
  return service;
});

final billingControllerProvider =
    StateNotifierProvider<BillingController, BillingState>((ref) {
  final service = ref.watch(billingServiceProvider);
  return BillingController(service: service);
});

@immutable
class BillingState {
  const BillingState({
    this.loading = false,
    this.error,
    this.snapshot,
    this.pendingPurchases = const <BillingQueuedPurchase>[],
    this.lastSyncedAt,
    this.bootstrapped = false,
  });

  final bool loading;
  final String? error;
  final BillingAccountSnapshot? snapshot;
  final List<BillingQueuedPurchase> pendingPurchases;
  final DateTime? lastSyncedAt;
  final bool bootstrapped;

  BillingState copyWith({
    bool? loading,
    String? error,
    BillingAccountSnapshot? snapshot,
    List<BillingQueuedPurchase>? pendingPurchases,
    DateTime? lastSyncedAt,
    bool? bootstrapped,
    bool clearError = false,
  }) {
    return BillingState(
      loading: loading ?? this.loading,
      error: clearError ? null : error ?? this.error,
      snapshot: snapshot ?? this.snapshot,
      pendingPurchases: pendingPurchases ?? this.pendingPurchases,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      bootstrapped: bootstrapped ?? this.bootstrapped,
    );
  }
}

class BillingController extends StateNotifier<BillingState> {
  BillingController({required BillingService service})
      : _service = service,
        super(const BillingState());

  final BillingService _service;
  StreamSubscription<BillingAccountSnapshot>? _subscription;
  bool _bootstrapping = false;

  Future<void> bootstrap() async {
    if (state.bootstrapped || _bootstrapping) {
      return;
    }
    _bootstrapping = true;
    state = state.copyWith(loading: true, clearError: true);
    try {
      await _service.ensurePaymentMethodsCached();
      final snapshot = await _service.loadSnapshot();
      final pending = await _service.loadQueuedPurchases();
      state = state.copyWith(
        snapshot: snapshot,
        pendingPurchases: pending,
        lastSyncedAt: snapshot.updatedAt,
        bootstrapped: true,
      );
      _subscription ??= _service.snapshots.listen(_handleSnapshotUpdate);
    } catch (error, stackTrace) {
      debugPrint('Billing bootstrap failed: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString());
    } finally {
      state = state.copyWith(loading: false);
      _bootstrapping = false;
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final snapshot = await _service.refreshSnapshot();
      state = state.copyWith(
        snapshot: snapshot,
        lastSyncedAt: snapshot.updatedAt,
      );
    } catch (error, stackTrace) {
      debugPrint('Billing refresh failed: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString());
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  Future<BillingInvoice?> recordPurchase(BillingPurchase purchase) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final invoice = await _service.recordPurchase(purchase);
      final pending = await _service.loadQueuedPurchases();
      state = state.copyWith(
        pendingPurchases: pending,
      );
      return invoice;
    } catch (error, stackTrace) {
      debugPrint('Billing purchase failed: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString());
      return null;
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  Future<void> cancelSubscription({String? reason}) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      await _service.cancelSubscription(reason: reason);
    } catch (error, stackTrace) {
      debugPrint('Cancel subscription failed: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString());
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  Future<List<BillingQueuedPurchase>> flushPendingPurchases() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final resolved = await _service.flushOutbox();
      final pending = await _service.loadQueuedPurchases();
      state = state.copyWith(pendingPurchases: pending);
      return resolved;
    } catch (error, stackTrace) {
      debugPrint('Flushing billing queue failed: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString());
      return const <BillingQueuedPurchase>[];
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  void _handleSnapshotUpdate(BillingAccountSnapshot snapshot) {
    state = state.copyWith(
      snapshot: snapshot,
      lastSyncedAt: snapshot.updatedAt,
    );
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
