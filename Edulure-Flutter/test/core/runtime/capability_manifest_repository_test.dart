import 'dart:io';

import 'package:dio/dio.dart';
import 'package:edulure_mobile/core/runtime/capability_manifest_models.dart';
import 'package:edulure_mobile/core/runtime/capability_manifest_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

void main() {
  late Directory tempDir;
  late int requestCount;
  late CapabilityManifestRepository repository;
  late bool shouldFail;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('capability_manifest_repo_test');
    Hive.init(tempDir.path);
    requestCount = 0;
    shouldFail = false;
    repository = CapabilityManifestRepository(
      _FakeDio((options) async {
        requestCount += 1;
        expect(options.path, '/runtime/manifest');
        if (shouldFail) {
          throw DioException(requestOptions: options);
        }
        return {
          'data': _manifestPayload(sequence: requestCount),
        };
      }),
    );
  });

  tearDown(() async {
    if (Hive.isBoxOpen('capability_manifest')) {
      await Hive.box('capability_manifest').close();
    }
    try {
      await Hive.deleteBoxFromDisk('capability_manifest');
    } catch (_) {
      // Ignore when no box exists.
    }
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  test('getManifest caches result within ttl window', () async {
    final first = await repository.getManifest();
    expect(first.fromCache, isFalse);
    expect(first.isStale, isFalse);
    expect(requestCount, 1);
    expect(first.manifest.capabilities, isNotEmpty);

    final second = await repository.getManifest();
    expect(second.fromCache, isTrue);
    expect(second.isStale, isFalse);
    expect(requestCount, 1, reason: 'Cache should prevent duplicate network calls');

    final forced = await repository.getManifest(force: true);
    expect(forced.fromCache, isFalse);
    expect(forced.isStale, isFalse);
    expect(requestCount, 2);
  });

  test('stale cache triggers refetch and overwrite', () async {
    await repository.getManifest();
    expect(requestCount, 1);

    final box = await Hive.openBox('capability_manifest');
    final staleTimestamp = DateTime.now().toUtc().subtract(const Duration(minutes: 6)).toIso8601String();
    await box.put('timestamp', staleTimestamp);
    await box.close();

    final refreshed = await repository.getManifest();
    expect(refreshed.fromCache, isFalse, reason: 'Expired cache should force network fetch');
    expect(refreshed.isStale, isFalse);
    expect(requestCount, 2);

    final forced = await repository.getManifest(force: true);
    expect(forced.fromCache, isFalse);
    expect(forced.isStale, isFalse);
    expect(requestCount, 3);
  });

  test('returns cached manifest when refresh fails', () async {
    final first = await repository.getManifest();
    expect(first.fromCache, isFalse);

    // Mark cache as stale to ensure refresh attempts network call.
    final box = await Hive.openBox('capability_manifest');
    final staleTimestamp = DateTime.now().toUtc().subtract(const Duration(minutes: 10)).toIso8601String();
    await box.put('timestamp', staleTimestamp);
    await box.close();

    shouldFail = true;

    final fallback = await repository.getManifest(force: true);
    expect(fallback.fromCache, isTrue);
    expect(fallback.isStale, isTrue);
    expect(fallback.manifest.summary.capabilities.operational,
        first.manifest.summary.capabilities.operational);
    expect(requestCount, 2);
  });

  test('throws descriptive exception when no cache is available', () async {
    shouldFail = true;
    expect(
      () => repository.getManifest(),
      throwsA(isA<CapabilityManifestRepositoryException>()),
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

Map<String, dynamic> _manifestPayload({required int sequence}) {
  final generatedAt = DateTime.now().toUtc().toIso8601String();
  return {
    'environment': 'production',
    'generatedAt': generatedAt,
    'audience': 'provider',
    'services': [
      {
        'key': 'telemetry',
        'name': 'Telemetry Service',
        'category': 'core',
        'type': 'http',
        'ready': true,
        'status': 'operational',
        'summary': 'Healthy',
        'checkedAt': generatedAt,
        'components': <Map<String, dynamic>>[],
      },
    ],
    'capabilities': [
      {
        'name': 'Provider Dashboard',
        'capability': 'provider.dashboard.view',
        'description': 'View provider KPIs',
        'basePath': '/dashboard',
        'flagKey': 'dashboard.view',
        'defaultState': 'enabled',
        'audience': 'provider',
        'enabled': true,
        'status': 'operational',
        'summary': 'All systems go',
        'dependencies': <String>[],
        'dependencyStatuses': <String>[],
        'accessible': true,
        'severityRank': sequence,
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
