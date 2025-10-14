import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/runtime/capability_manifest_models.dart';
import '../../core/runtime/capability_manifest_repository.dart';
import '../../core/security/rbac_matrix_models.dart';
import '../../core/security/rbac_matrix_repository.dart';

class ProviderCapabilityState {
  ProviderCapabilityState({
    required this.manifest,
    required this.matrix,
    required this.lastSyncedAt,
    required this.loading,
    required this.error,
  });

  final CapabilityManifest? manifest;
  final RbacMatrix? matrix;
  final DateTime? lastSyncedAt;
  final bool loading;
  final Object? error;

  CapabilityImpactNotice? get impactNotice => manifest?.buildImpactNotice();

  ProviderCapabilityState copyWith({
    CapabilityManifest? manifest,
    RbacMatrix? matrix,
    DateTime? lastSyncedAt,
    bool? loading,
    Object? error,
  }) {
    return ProviderCapabilityState(
      manifest: manifest ?? this.manifest,
      matrix: matrix ?? this.matrix,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      loading: loading ?? this.loading,
      error: error,
    );
  }
}

class ProviderCapabilityBridge extends ChangeNotifier {
  ProviderCapabilityBridge({
    required CapabilityManifestRepository manifestRepository,
    required RbacMatrixRepository rbacRepository,
    required ProviderRoleContext roleContext,
  })  : _manifestRepository = manifestRepository,
        _rbacRepository = rbacRepository,
        _roleContext = roleContext,
        _state = ProviderCapabilityState(
          manifest: null,
          matrix: null,
          lastSyncedAt: null,
          loading: false,
          error: null,
        );

  final CapabilityManifestRepository _manifestRepository;
  final RbacMatrixRepository _rbacRepository;
  final ProviderRoleContext _roleContext;

  ProviderCapabilityState _state;

  ProviderCapabilityState get state => _state;

  CapabilityManifest? get manifest => _state.manifest;

  RbacMatrix? get matrix => _state.matrix;

  bool get isLoading => _state.loading;

  Object? get lastError => _state.error;

  DateTime? get lastSyncedAt => _state.lastSyncedAt;

  Future<void> warm() async {
    await _load(force: false, initial: true);
  }

  Future<void> refresh({bool force = false}) async {
    await _load(force: force, initial: false);
  }

  CapabilityAccessEnvelope accessFor(String capability, {String? action}) {
    if (_state.matrix == null) {
      throw StateError('RBAC matrix not loaded');
    }

    return _rbacRepository.evaluateAccess(
      context: _roleContext,
      capability: capability,
      action: action,
      manifest: _state.manifest,
    );
  }

  Stream<ProviderCapabilityState> listenChanges({Duration throttle = const Duration(milliseconds: 300)}) {
    return Stream<ProviderCapabilityState>.multi((multiController) {
      ProviderCapabilityState? pendingState;
      Timer? timer;

      void emit(ProviderCapabilityState snapshot) {
        pendingState = snapshot;
        timer ??= Timer(throttle, () {
          timer = null;
          final pending = pendingState;
          if (pending != null) {
            multiController.add(pending);
            pendingState = null;
          }
        });
      }

      multiController.add(_state);

      void listener() => emit(_state);
      addListener(listener);

      multiController.onCancel = (_) {
        timer?.cancel();
        removeListener(listener);
      };
    }, isBroadcast: true);
  }

  Future<void> _load({required bool force, required bool initial}) async {
    _updateState(_state.copyWith(loading: true, error: null));
    try {
      final manifestFuture = force
          ? _manifestRepository.refresh()
          : _manifestRepository.getManifest(force: false);
      final matrixFuture = force ? _rbacRepository.refresh() : _rbacRepository.getMatrix(force: false);

      final manifestResult = await manifestFuture;
      final matrixResult = await matrixFuture;

      _rbacRepository.cacheResult(matrixResult);
      _rbacRepository.primeMatrix(matrixResult.matrix);

      _updateState(
        _state.copyWith(
          manifest: manifestResult.manifest,
          matrix: matrixResult.matrix,
          lastSyncedAt: DateTime.now().toUtc(),
          loading: false,
        ),
      );
    } catch (error) {
      _updateState(_state.copyWith(loading: false, error: error));
      rethrow;
    } finally {
      if (initial && _state.matrix == null) {
        _updateState(_state.copyWith(loading: false));
      }
    }
  }

  void _updateState(ProviderCapabilityState newState) {
    _state = newState;
    notifyListeners();
  }
}
