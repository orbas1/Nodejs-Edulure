import 'dart:io';

import 'package:dio/dio.dart';
import 'package:edulure_mobile/core/runtime/capability_manifest_models.dart';
import 'package:edulure_mobile/core/security/rbac_matrix_models.dart';
import 'package:edulure_mobile/core/security/rbac_matrix_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

void main() {
  late Directory tempDir;
  late int requestCount;
  late RbacMatrixRepository repository;
  late bool shouldFail;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('rbac_matrix_repo_test');
    Hive.init(tempDir.path);
    requestCount = 0;
    shouldFail = false;
    repository = RbacMatrixRepository(
      _FakeDio((options) async {
        requestCount += 1;
        expect(options.path, '/runtime/rbac-matrix');
        if (shouldFail) {
          throw DioException(requestOptions: options);
        }
        return {
          'data': _matrixPayload(),
        };
      }),
      audience: 'provider-mobile',
    );
  });

  tearDown(() async {
    if (Hive.isBoxOpen('rbac_matrix_provider_mobile')) {
      await Hive.box('rbac_matrix_provider_mobile').close();
    }
    try {
      await Hive.deleteBoxFromDisk('rbac_matrix_provider_mobile');
    } catch (_) {
      // Ignore when box has not been created yet.
    }
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  test('getMatrix caches result within ttl window', () async {
    final first = await repository.getMatrix();
    expect(first.fromCache, isFalse);
    expect(first.isStale, isFalse);
    expect(first.matrix.roles, isNotEmpty);
    expect(requestCount, 1);

    final second = await repository.getMatrix();
    expect(second.fromCache, isTrue);
    expect(second.isStale, isFalse);
    expect(requestCount, 1, reason: 'Should reuse cached matrix without new request');

    final forced = await repository.getMatrix(force: true);
    expect(forced.fromCache, isFalse);
    expect(forced.isStale, isFalse);
    expect(requestCount, 2);
  });

  test('evaluateAccess honours RBAC roles, consent policy and manifest availability', () async {
    final result = await repository.getMatrix();
    repository.cacheResult(result);
    repository.primeMatrix(result.matrix);

    final manifest = CapabilityManifest.fromJson(
      _manifestPayload(
        capability: 'provider.billing.manage',
        enabled: true,
        accessible: true,
      ),
    );

    final context = ProviderRoleContext(
      providerId: 'prov-123',
      roles: {'coach'},
      region: 'global',
    );

    final envelope = repository.evaluateAccess(
      context: context,
      capability: 'provider.billing.manage',
      action: 'update',
      manifest: manifest,
    );

    expect(envelope.allowed, isTrue);
    expect(envelope.requiresConsent, isTrue);
    expect(envelope.guardrail?.requiresTwoPersonRule, isTrue);
    expect(envelope.auditContext, contains('prov-123'));

    final restrictedManifest = CapabilityManifest.fromJson(
      _manifestPayload(
        capability: 'provider.billing.manage',
        enabled: false,
        accessible: false,
      ),
    );

    final blocked = repository.evaluateAccess(
      context: context,
      capability: 'provider.billing.manage',
      action: 'update',
      manifest: restrictedManifest,
    );

    expect(blocked.allowed, isFalse, reason: 'Manifest should block access when capability disabled');
  });

  test('returns cached matrix when refresh fails', () async {
    final first = await repository.getMatrix();
    expect(first.fromCache, isFalse);

    final box = await Hive.openBox('rbac_matrix_provider_mobile');
    final staleTimestamp = DateTime.now().toUtc().subtract(const Duration(minutes: 15)).toIso8601String();
    await box.put('timestamp', staleTimestamp);
    await box.close();

    shouldFail = true;

    final fallback = await repository.getMatrix(force: true);
    expect(fallback.fromCache, isTrue);
    expect(fallback.isStale, isTrue);
    expect(fallback.matrix.version, first.matrix.version);
    expect(requestCount, 2);
  });

  test('throws descriptive exception when no matrix cache exists', () async {
    shouldFail = true;
    expect(
      () => repository.getMatrix(),
      throwsA(isA<RbacMatrixRepositoryException>()),
    );
    expect(requestCount, 1);
  });
}

class _FakeDio extends Dio {
  _FakeDio(this._onGet);

  final Future<Map<String, dynamic>> Function(RequestOptions options) _onGet;

  @override
  Future<Response<T>> get<T>(
    String path, {
    data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onReceiveProgress,
  }) async {
    final requestOptions = RequestOptions(
      path: path,
      method: 'GET',
      queryParameters: queryParameters ?? const <String, dynamic>{},
      extra: options?.extra ?? const <String, dynamic>{},
    );
    final payload = await _onGet(requestOptions);
    return Response<T>(
      data: payload as T,
      requestOptions: requestOptions,
      statusCode: 200,
    );
  }
}

Map<String, dynamic> _matrixPayload() {
  final generatedAt = DateTime.now().toUtc().toIso8601String();
  return {
    'version': '1.0.0',
    'generatedAt': generatedAt,
    'roles': [
      {
        'key': 'coach',
        'name': 'Coach',
        'description': 'Manages learner cohorts',
        'capabilityGrants': [
          {
            'capability': 'provider.billing.manage',
            'actions': ['read', 'update'],
            'disallowedRegions': ['restricted'],
          },
          {
            'capability': 'provider.courses.publish',
            'actions': <String>[],
            'disallowedRegions': <String>[],
          },
        ],
        'regionRestrictions': ['restricted'],
      },
      {
        'key': 'assistant',
        'name': 'Assistant',
        'description': 'Helps with learner management',
        'capabilityGrants': [
          {
            'capability': 'provider.billing.manage',
            'actions': ['read'],
            'disallowedRegions': <String>[],
          },
        ],
        'regionRestrictions': <String>[],
      },
    ],
    'capabilities': [
      {
        'capability': 'provider.billing.manage',
        'serviceKey': 'billing',
        'description': 'Manage billing settings',
        'requiresConsent': true,
        'auditLogTemplate': 'provider {providerId} executed {capability}',
      },
      {
        'capability': 'provider.courses.publish',
        'serviceKey': 'courses',
        'description': 'Publish courses to catalog',
        'requiresConsent': false,
        'auditLogTemplate': 'provider {providerId} executed {capability}',
      },
    ],
    'guardrails': [
      {
        'capability': 'provider.billing.manage',
        'alertThreshold': 0.8,
        'requiresTwoPersonRule': true,
        'rolloutStrategy': 'gradual',
      },
    ],
  };
}

Map<String, dynamic> _manifestPayload({
  required String capability,
  required bool enabled,
  required bool accessible,
}) {
  final generatedAt = DateTime.now().toUtc().toIso8601String();
  return {
    'environment': 'production',
    'generatedAt': generatedAt,
    'audience': 'provider',
    'services': <Map<String, dynamic>>[],
    'capabilities': [
      {
        'name': 'Billing Management',
        'capability': capability,
        'description': 'Manage billing preferences',
        'basePath': '/billing',
        'flagKey': 'billing.manage',
        'defaultState': 'enabled',
        'audience': 'provider',
        'enabled': enabled,
        'status': accessible ? 'operational' : 'outage',
        'summary': accessible ? 'Available' : 'Unavailable',
        'dependencies': <String>[],
        'dependencyStatuses': <String>[],
        'accessible': accessible,
        'severityRank': 2,
        'generatedAt': generatedAt,
      },
    ],
    'summary': {
      'services': {
        'operational': 1,
        'degraded': 0,
        'outage': 0,
        'unknown': 0,
        'disabled': 0,
      },
      'capabilities': {
        'operational': 1,
        'degraded': 0,
        'outage': 0,
        'unknown': 0,
        'disabled': 0,
      },
    },
  };
}
