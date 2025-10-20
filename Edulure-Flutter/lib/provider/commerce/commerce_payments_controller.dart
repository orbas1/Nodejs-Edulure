import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/commerce_models.dart';
import '../../services/commerce_persistence_service.dart';

final commercePersistenceProvider = Provider<CommercePersistence>((ref) {
  return CommercePersistenceService();
});

final commercePaymentsControllerProvider =
    StateNotifierProvider<CommercePaymentsController, CommercePaymentsState>((ref) {
  final persistence = ref.watch(commercePersistenceProvider);
  return CommercePaymentsController(persistence: persistence);
});

class CommercePaymentsState {
  const CommercePaymentsState({
    this.loading = false,
    this.methods = const <CommercePaymentMethod>[],
    this.error,
    this.bootstrapped = false,
  });

  final bool loading;
  final List<CommercePaymentMethod> methods;
  final String? error;
  final bool bootstrapped;

  CommercePaymentsState copyWith({
    bool? loading,
    List<CommercePaymentMethod>? methods,
    String? error,
    bool? bootstrapped,
  }) {
    return CommercePaymentsState(
      loading: loading ?? this.loading,
      methods: methods ?? this.methods,
      error: error,
      bootstrapped: bootstrapped ?? this.bootstrapped,
    );
  }

  CommercePaymentMethod? get defaultMethod =>
      methods.firstWhere((method) => method.defaultMethod, orElse: () => methods.isNotEmpty ? methods.first : null);
}

class CommercePaymentsController extends StateNotifier<CommercePaymentsState> {
  CommercePaymentsController({required CommercePersistence persistence})
      : _persistence = persistence,
        super(const CommercePaymentsState());

  final CommercePersistence _persistence;
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
    } catch (error, stackTrace) {
      debugPrint('Failed to bootstrap payment methods: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString(), bootstrapped: true);
    } finally {
      state = state.copyWith(loading: false);
      _bootstrapping = false;
    }
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
}
