import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../core/runtime/capability_manifest_repository.dart';
import '../../core/security/rbac_matrix_models.dart';
import '../../core/security/rbac_matrix_repository.dart';
import '../runtime/provider_capability_bridge.dart';

class ProviderAppBootstrap {
  ProviderAppBootstrap({
    required Dio dio,
    required ProviderRoleContext roleContext,
    List<NavigatorObserver>? navigatorObservers,
  })  : _dio = dio,
        _roleContext = roleContext,
        _navigatorObservers = navigatorObservers ?? const <NavigatorObserver>[];

  final Dio _dio;
  final ProviderRoleContext _roleContext;
  final List<NavigatorObserver> _navigatorObservers;

  late final CapabilityManifestRepository capabilityManifestRepository;
  late final RbacMatrixRepository rbacMatrixRepository;
  late final ProviderCapabilityBridge capabilityBridge;

  static bool _hiveInitialised = false;

  Future<void> initialise() async {
    if (!_hiveInitialised) {
      await Hive.initFlutter();
      _hiveInitialised = true;
    }

    capabilityManifestRepository = CapabilityManifestRepository(
      _dio,
      audience: 'provider-mobile',
    );
    rbacMatrixRepository = RbacMatrixRepository(
      _dio,
      audience: 'provider-mobile',
    );
    capabilityBridge = ProviderCapabilityBridge(
      manifestRepository: capabilityManifestRepository,
      rbacRepository: rbacMatrixRepository,
      roleContext: _roleContext,
    );

    await capabilityBridge.warm();
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
}
