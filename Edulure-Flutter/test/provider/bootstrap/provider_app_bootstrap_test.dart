import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:edulure_mobile/provider/bootstrap/provider_app_bootstrap.dart';
import 'package:edulure_mobile/core/runtime/capability_manifest_repository.dart';
import 'package:edulure_mobile/core/security/rbac_matrix_repository.dart';
import 'package:edulure_mobile/core/security/rbac_matrix_models.dart';
import 'package:edulure_mobile/core/runtime/capability_manifest_models.dart';
import 'package:edulure_mobile/provider/runtime/provider_capability_bridge.dart';

class _MockCapabilityBridge extends Mock implements ProviderCapabilityBridge {}

class _MockCapabilityRepository extends Mock implements CapabilityManifestRepository {}

class _MockRbacRepository extends Mock implements RbacMatrixRepository {}

void main() {
  setUp(() {
    ProviderAppBootstrap.resetHiveInitialisation();
  });

  test('initialise warms bridge and initialises Hive once', () async {
    var hiveCalls = 0;
    final bridge = _MockCapabilityBridge();
    final manifestRepository = _MockCapabilityRepository();
    final rbacRepository = _MockRbacRepository();
    when(bridge.warm).thenAnswer((_) async {});

    final bootstrap = ProviderAppBootstrap(
      dio: Dio(),
      roleContext: ProviderRoleContext(
        providerId: 'provider-1',
        roles: const {'admin'},
        region: 'us',
      ),
      hiveInitializer: () async {
        hiveCalls++;
      },
      capabilityBridge: bridge,
      manifestRepository: manifestRepository,
      rbacMatrixRepository: rbacRepository,
    );

    await bootstrap.initialise();
    await bootstrap.initialise();

    expect(hiveCalls, 1);
    verify(bridge.warm).called(2);
    expect(bootstrap.capabilityBridge, same(bridge));
    expect(bootstrap.capabilityManifestRepository, manifestRepository);
    expect(bootstrap.rbacMatrixRepository, rbacRepository);
  });

  test('surface warm failures to caller for handling', () async {
    final bridge = _MockCapabilityBridge();
    when(bridge.warm).thenAnswer((_) async => throw StateError('offline manifest'));

    final bootstrap = ProviderAppBootstrap(
      dio: Dio(),
      roleContext: ProviderRoleContext(
        providerId: 'provider-1',
        roles: const {'viewer'},
        region: 'eu',
      ),
      hiveInitializer: () async {},
      capabilityBridge: bridge,
      manifestRepository: _MockCapabilityRepository(),
      rbacMatrixRepository: _MockRbacRepository(),
    );

    expect(() => bootstrap.initialise(), throwsStateError);
  });
}
