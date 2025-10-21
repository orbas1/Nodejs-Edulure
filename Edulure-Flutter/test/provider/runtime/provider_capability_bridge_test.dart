import 'dart:async';

import 'package:dio/dio.dart';
import 'package:edulure_mobile/core/runtime/capability_manifest_models.dart';
import 'package:edulure_mobile/core/runtime/capability_manifest_repository.dart';
import 'package:edulure_mobile/core/security/rbac_matrix_models.dart';
import 'package:edulure_mobile/core/security/rbac_matrix_repository.dart';
import 'package:edulure_mobile/provider/runtime/provider_capability_bridge.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('warm synchronises manifest and matrix then evaluates access', () async {
    final manifest = CapabilityManifest(
      environment: 'production',
      generatedAt: DateTime.now().toUtc(),
      audience: 'provider',
      services: const [],
      capabilities: [
        ManifestCapability(
          name: 'Billing Management',
          capability: 'provider.billing.manage',
          description: 'Manage provider billing',
          basePath: '/billing',
          flagKey: 'billing.manage',
          defaultState: 'enabled',
          audience: 'provider',
          enabled: true,
          status: 'operational',
          summary: 'Healthy',
          dependencies: const [],
          dependencyStatuses: const [],
          accessible: true,
          severityRank: 1,
          generatedAt: DateTime.now().toUtc(),
        ),
      ],
      summary: ManifestSummary.empty(),
    );

    final matrix = RbacMatrix(
      version: '1.0.0',
      generatedAt: DateTime.now().toUtc(),
      roles: [
        RoleDefinition(
          key: 'coach',
          name: 'Coach',
          description: 'Manages cohorts',
          capabilityGrants: [
            CapabilityGrant(
              capability: 'provider.billing.manage',
              actions: {'update'},
              disallowedRegions: const {},
            ),
          ],
          regionRestrictions: const {},
        ),
      ],
      capabilities: [
        CapabilityPolicy(
          capability: 'provider.billing.manage',
          serviceKey: 'billing',
          description: 'Manage billing settings',
          requiresConsent: true,
          auditLogTemplate: '{providerId}:{capability}',
        ),
      ],
      guardrails: [
        CapabilityGuardrail(
          capability: 'provider.billing.manage',
          alertThreshold: 0.5,
          requiresTwoPersonRule: false,
          rolloutStrategy: 'stable',
        ),
      ],
    );

    final manifestResult = CapabilityManifestLoadResult(
      manifest: manifest,
      fetchedAt: DateTime.now().toUtc(),
      fromCache: false,
    );
    final matrixResult = RbacMatrixLoadResult(
      matrix: matrix,
      fetchedAt: DateTime.now().toUtc(),
      fromCache: false,
    );

    final manifestRepository = _StubManifestRepository(manifestResult);
    final matrixRepository = _StubRbacRepository(matrixResult);

    final bridge = ProviderCapabilityBridge(
      manifestRepository: manifestRepository,
      rbacRepository: matrixRepository,
      roleContext: ProviderRoleContext(
        providerId: 'prov-42',
        roles: {'coach'},
        region: 'global',
      ),
    );

    await bridge.warm();

    expect(bridge.state.loading, isFalse);
    expect(bridge.state.error, isNull);
    expect(bridge.manifest, isNotNull);
    expect(bridge.matrix, isNotNull);
    expect(bridge.lastSyncedAt, isNotNull);

    final envelope = bridge.accessFor('provider.billing.manage', action: 'update');
    expect(envelope.allowed, isTrue);
    expect(envelope.requiresConsent, isTrue);
    expect(envelope.auditContext, 'prov-42:provider.billing.manage');

    final updates = <ProviderCapabilityState>[];
    final subscription = bridge.listenChanges(throttle: const Duration(milliseconds: 1)).listen(updates.add);

    final updatedManifest = CapabilityManifest(
      environment: 'production',
      generatedAt: DateTime.now().toUtc(),
      audience: 'provider',
      services: const [],
      capabilities: [
        ManifestCapability(
          name: 'Billing Management',
          capability: 'provider.billing.manage',
          description: 'Manage provider billing',
          basePath: '/billing',
          flagKey: 'billing.manage',
          defaultState: 'enabled',
          audience: 'provider',
          enabled: false,
          status: 'outage',
          summary: 'Temporarily disabled',
          dependencies: const [],
          dependencyStatuses: const [],
          accessible: false,
          severityRank: 2,
          generatedAt: DateTime.now().toUtc(),
        ),
      ],
      summary: ManifestSummary.empty(),
    );

    manifestRepository.nextResult = CapabilityManifestLoadResult(
      manifest: updatedManifest,
      fetchedAt: DateTime.now().toUtc(),
      fromCache: false,
    );

    await bridge.refresh(force: true);

    await Future<void>.delayed(const Duration(milliseconds: 10));
    expect(updates, isNotEmpty);
    expect(bridge.manifest?.capabilities.first.enabled, isFalse);

    final denied = bridge.accessFor('provider.billing.manage', action: 'update');
    expect(denied.allowed, isFalse, reason: 'Capability disabled in manifest should block access');

    await subscription.cancel();
    bridge.dispose();
  });
}

class _StubManifestRepository extends CapabilityManifestRepository {
  _StubManifestRepository(this._result) : super(Dio());

  CapabilityManifestLoadResult _result;

  set nextResult(CapabilityManifestLoadResult value) {
    _result = value;
  }

  @override
  Future<CapabilityManifestLoadResult?> loadCachedManifest() async {
    return null;
  }

  @override
  Future<CapabilityManifestLoadResult> getManifest({bool force = false}) async {
    return _result;
  }

  @override
  Future<CapabilityManifestLoadResult> refresh() async {
    return _result;
  }
}

class _StubRbacRepository extends RbacMatrixRepository {
  _StubRbacRepository(this._result) : super(Dio());

  RbacMatrixLoadResult _result;
  RbacMatrix? _cachedMatrix;

  set nextResult(RbacMatrixLoadResult value) {
    _result = value;
  }

  @override
  Future<RbacMatrixLoadResult?> loadCachedMatrix() async {
    return null;
  }

  @override
  Future<RbacMatrixLoadResult> getMatrix({bool force = false}) async {
    return _result;
  }

  @override
  Future<RbacMatrixLoadResult> refresh() async {
    return _result;
  }

  @override
  void cacheResult(RbacMatrixLoadResult result) {
    _cachedMatrix = result.matrix;
  }

  @override
  void primeMatrix(RbacMatrix matrix) {
    _cachedMatrix = matrix;
  }

  @override
  CapabilityAccessEnvelope evaluateAccess({
    required ProviderRoleContext context,
    required String capability,
    String? action,
    CapabilityManifest? manifest,
  }) {
    final matrix = _cachedMatrix ?? _result.matrix;
    final allowed = matrix.hasPermission(roleKeys: context.roles, capability: capability, action: action);
    final policy = matrix.policyByCapability(capability);
    final guardrail = matrix.guardrailByCapability(capability);
    final requiresConsent = policy?.requiresConsent ?? false;
    final auditContext = policy == null
        ? null
        : policy.auditLogTemplate
            .replaceAll('{providerId}', context.providerId)
            .replaceAll('{capability}', capability);
    final manifestCapability = manifest?.capabilityByKey(capability);
    final manifestAllows = manifestCapability == null
        ? true
        : manifestCapability.enabled && (manifestCapability.accessible || manifestCapability.isOperational);
    return CapabilityAccessEnvelope(
      capability: capability,
      allowed: allowed && manifestAllows,
      requiresConsent: requiresConsent,
      guardrail: guardrail,
      auditContext: auditContext,
    );
  }
}
