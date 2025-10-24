import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/billing_sync_service.dart';
import '../../services/commerce_models.dart';
import '../../services/commerce_persistence_service.dart';

final commercePersistenceProvider = Provider<CommercePersistence>((ref) {
  return CommercePersistenceService();
});

final billingSyncServiceProvider = Provider<BillingSyncService>((ref) {
  final persistence = ref.watch(commercePersistenceProvider);
  return BillingSyncService(persistence: persistence);
});

final commercePaymentsControllerProvider =
    StateNotifierProvider<CommercePaymentsController, CommercePaymentsState>((ref) {
  final persistence = ref.watch(commercePersistenceProvider);
  final billingSync = ref.watch(billingSyncServiceProvider);
  return CommercePaymentsController(
    persistence: persistence,
    billingSyncService: billingSync,
  );
});

class CommercePaymentsState {
  const CommercePaymentsState({
    this.loading = false,
    this.methods = const <CommercePaymentMethod>[],
    this.error,
    this.bootstrapped = false,
    this.catalog = const <BillingProduct>[],
    this.catalogFetchedAt,
    this.catalogLoading = false,
    this.pendingReceipts = 0,
    this.receiptsSyncing = false,
  });

  static const Object _sentinel = Object();

  final bool loading;
  final List<CommercePaymentMethod> methods;
  final String? error;
  final bool bootstrapped;
  final List<BillingProduct> catalog;
  final DateTime? catalogFetchedAt;
  final bool catalogLoading;
  final int pendingReceipts;
  final bool receiptsSyncing;

  CommercePaymentsState copyWith({
    bool? loading,
    List<CommercePaymentMethod>? methods,
    Object? error = _sentinel,
    bool? bootstrapped,
    List<BillingProduct>? catalog,
    Object? catalogFetchedAt = _sentinel,
    bool? catalogLoading,
    int? pendingReceipts,
    bool? receiptsSyncing,
  }) {
    return CommercePaymentsState(
      loading: loading ?? this.loading,
      methods: methods ?? this.methods,
      error: identical(error, _sentinel) ? this.error : error as String?,
      bootstrapped: bootstrapped ?? this.bootstrapped,
      catalog: catalog ?? this.catalog,
      catalogFetchedAt: identical(catalogFetchedAt, _sentinel)
          ? this.catalogFetchedAt
          : catalogFetchedAt as DateTime?,
      catalogLoading: catalogLoading ?? this.catalogLoading,
      pendingReceipts: pendingReceipts ?? this.pendingReceipts,
      receiptsSyncing: receiptsSyncing ?? this.receiptsSyncing,
    );
  }

  CommercePaymentMethod? get defaultMethod => methods.firstWhere(
        (method) => method.defaultMethod,
        orElse: () => methods.isNotEmpty ? methods.first : null,
      );
}

class CommercePaymentsController extends StateNotifier<CommercePaymentsState> {
  CommercePaymentsController({
    required CommercePersistence persistence,
    required BillingSyncService billingSyncService,
  })  : _persistence = persistence,
        _billingSyncService = billingSyncService,
        super(const CommercePaymentsState());

  final CommercePersistence _persistence;
  final BillingSyncService _billingSyncService;
  bool _bootstrapping = false;

  Future<void> bootstrap() async {
    if (state.bootstrapped || _bootstrapping) {
      return;
    }
    _bootstrapping = true;
    state = state.copyWith(loading: true, error: null);
    try {
      final stored = await _persistence.loadPaymentMethods();
      if (stored != null && stored.isNotEmpty) {
        state = state.copyWith(methods: stored, bootstrapped: true);
      } else {
        final seed = _seedMethods();
        state = state.copyWith(methods: seed, bootstrapped: true);
        await _persistence.savePaymentMethods(seed);
      }
      await _hydrateCatalog(forceRefresh: false);
      await synchroniseReceipts();
    } catch (error, stackTrace) {
      debugPrint('Failed to bootstrap payment methods: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString(), bootstrapped: true);
    } finally {
      state = state.copyWith(loading: false, error: state.error);
      _bootstrapping = false;
    }
  }

  Future<void> refreshCatalog() async {
    state = state.copyWith(catalogLoading: true, error: state.error);
    try {
      await _hydrateCatalog(forceRefresh: true);
    } catch (error, stackTrace) {
      debugPrint('Failed to refresh billing catalog: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString());
    } finally {
      state = state.copyWith(catalogLoading: false, error: state.error);
    }
  }

  Future<void> synchroniseReceipts({bool force = false}) async {
    state = state.copyWith(receiptsSyncing: true, error: state.error);
    try {
      await _billingSyncService.flushPendingReceipts(force: force);
    } catch (error, stackTrace) {
      debugPrint('Failed to synchronise receipts: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString());
    } finally {
      await _updateReceiptCount();
      state = state.copyWith(receiptsSyncing: false, error: state.error);
    }
  }

  Future<void> queueReceipt(PendingReceipt receipt) async {
    await _billingSyncService.queueReceipt(receipt);
    await _updateReceiptCount();
  }

  void addMethod(CommercePaymentMethod method) {
    final updated = <CommercePaymentMethod>[...state.methods];
    if (method.defaultMethod) {
      final cleared = updated.map((item) => item.copyWith(defaultMethod: false)).toList();
      cleared.add(method);
      state = state.copyWith(methods: cleared);
    } else {
      updated.add(method);
      state = state.copyWith(methods: updated);
    }
    _persist();
  }

  void updateMethod(CommercePaymentMethod method) {
    final updated = [
      for (final item in state.methods)
        if (item.id == method.id) method else item,
    ];
    state = state.copyWith(methods: updated);
    _persist();
  }

  void removeMethod(String methodId) {
    final filtered = state.methods.where((method) => method.id != methodId).toList(growable: false);
    state = state.copyWith(methods: filtered);
    _persist();
  }

  void setDefault(String methodId) {
    final updated = state.methods
        .map((method) => method.copyWith(defaultMethod: method.id == methodId))
        .toList(growable: false);
    state = state.copyWith(methods: updated);
    _persist();
  }

  List<CommercePaymentMethod> _seedMethods() {
    return [
      CommercePaymentMethod.card(
        brand: 'Visa',
        last4: '4242',
        expMonth: 12,
        expYear: DateTime.now().year + 3,
        accountHolder: 'Edulure Operations',
        billingEmail: 'billing@edulure.com',
        defaultMethod: true,
        country: 'US',
      ),
      CommercePaymentMethod.card(
        brand: 'Mastercard',
        last4: '5454',
        expMonth: 7,
        expYear: DateTime.now().year + 4,
        accountHolder: 'Community Payments',
        billingEmail: 'finance@edulure.com',
        country: 'CA',
      ),
    ];
  }

  Future<void> _persist() async {
    try {
      await _persistence.savePaymentMethods(state.methods);
    } catch (error, stackTrace) {
      debugPrint('Failed to persist payment methods: $error');
      debugPrint('$stackTrace');
    }
  }

  Future<void> _hydrateCatalog({required bool forceRefresh}) async {
    try {
      final snapshot = await _billingSyncService.loadCatalog(forceRefresh: forceRefresh);
      state = state.copyWith(
        catalog: snapshot.products,
        catalogFetchedAt: snapshot.fetchedAt,
        error: state.error,
      );
    } on BillingSyncException catch (error, stackTrace) {
      debugPrint('Billing catalog load failed: ${error.message}');
      debugPrint('$stackTrace');
      if (forceRefresh) {
        rethrow;
      }
    }
  }

  Future<void> _updateReceiptCount() async {
    try {
      final receipts = await _billingSyncService.getPendingReceipts();
      state = state.copyWith(pendingReceipts: receipts.length, error: state.error);
    } catch (error, stackTrace) {
      debugPrint('Failed to read pending receipts: $error');
      debugPrint('$stackTrace');
    }
  }
}
