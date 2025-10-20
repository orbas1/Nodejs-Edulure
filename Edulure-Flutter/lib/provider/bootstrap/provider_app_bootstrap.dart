import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../core/runtime/capability_manifest_repository.dart';
import '../../core/security/rbac_matrix_models.dart';
import '../../core/security/rbac_matrix_repository.dart';
import '../runtime/provider_capability_bridge.dart';

typedef _HiveInitializer = Future<void> Function();

class ProviderAppBootstrap {
  ProviderAppBootstrap({
    required Dio dio,
    required ProviderRoleContext roleContext,
    List<NavigatorObserver>? navigatorObservers,
    _HiveInitializer? hiveInitializer,
    CapabilityManifestRepository? manifestRepository,
    RbacMatrixRepository? rbacMatrixRepository,
    ProviderCapabilityBridge? capabilityBridge,
  })  : _dio = dio,
        _roleContext = roleContext,
        _navigatorObservers = navigatorObservers ?? const <NavigatorObserver>[],
        _hiveInitializer = hiveInitializer ?? Hive.initFlutter,
        _manifestOverride = manifestRepository,
        _rbacOverride = rbacMatrixRepository,
        _bridgeOverride = capabilityBridge;

  final Dio _dio;
  final ProviderRoleContext _roleContext;
  final List<NavigatorObserver> _navigatorObservers;
  final _HiveInitializer _hiveInitializer;
  final CapabilityManifestRepository? _manifestOverride;
  final RbacMatrixRepository? _rbacOverride;
  final ProviderCapabilityBridge? _bridgeOverride;

  late final CapabilityManifestRepository capabilityManifestRepository;
  late final RbacMatrixRepository rbacMatrixRepository;
  late final ProviderCapabilityBridge capabilityBridge;

  static bool _hiveInitialised = false;

  Future<void> initialise() async {
    if (!_hiveInitialised) {
      await _hiveInitializer();
      _hiveInitialised = true;
    }

    capabilityManifestRepository = _manifestOverride ??
        CapabilityManifestRepository(
          _dio,
          audience: 'provider-mobile',
        );
    rbacMatrixRepository = _rbacOverride ??
        RbacMatrixRepository(
          _dio,
          audience: 'provider-mobile',
        );
    capabilityBridge = _bridgeOverride ??
        ProviderCapabilityBridge(
          manifestRepository: capabilityManifestRepository,
          rbacRepository: rbacMatrixRepository,
          roleContext: _roleContext,
        );

    try {
      await capabilityBridge.warm();
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('Provider capability warm failed: $error\n$stackTrace');
      }
      rethrow;
    }
  }

  List<NavigatorObserver> get navigatorObservers => List.unmodifiable(_navigatorObservers);

  Future<void> refreshOperationalState({bool force = false}) async {
    await capabilityBridge.refresh(force: force);
  }

  CapabilityAccessEnvelope evaluate(String capability, {String? action}) {
    return capabilityBridge.accessFor(capability, action: action);
  }

  void dispose() {
    capabilityBridge.dispose();
  }

  @visibleForTesting
  static void resetHiveInitialisation() {
    _hiveInitialised = false;
  }
}
