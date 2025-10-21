import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'package:edulure_mobile/core/config/app_config.dart';
import 'package:edulure_mobile/core/config/app_environment.dart';
import 'package:edulure_mobile/core/telemetry/telemetry_service.dart';

import 'package:package_info_plus/package_info_plus.dart';

class _FakeTelemetryClient implements TelemetryClient {
  TelemetryInitOptions? options;
  int initCalls = 0;
  Object? capturedError;
  StackTrace? capturedStack;
  Map<String, dynamic>? capturedContext;
  final List<Breadcrumb> breadcrumbs = <Breadcrumb>[];

  @override
  Future<void> init({
    required TelemetryInitOptions options,
    required FutureOr<void> Function() runner,
  }) async {
    initCalls++;
    this.options = options;
    await Future.sync(runner);
  }

  @override
  Future<void> captureException(
    Object error, {
    StackTrace? stackTrace,
    Map<String, dynamic>? context,
  }) async {
    capturedError = error;
    capturedStack = stackTrace;
    capturedContext = context;
  }

  @override
  void addBreadcrumb(Breadcrumb breadcrumb) {
    breadcrumbs.add(breadcrumb);
  }
}

PackageInfo _testPackageInfo() {
  return PackageInfo(
    appName: 'Edulure Test',
    packageName: 'com.edulure.test',
    version: '1.2.3',
    buildNumber: '42',
    buildSignature: 'sig',
    installerStore: 'test',
  );
}

AppConfig _config({String? dsn}) {
  return AppConfig(
    environment: AppEnvironment.development,
    apiBaseUrl: 'https://api.example.com',
    enableNetworkLogging: true,
    sentryDsn: dsn,
    tracesSampleRate: 0.5,
  );
}

void main() {
  group('TelemetryService', () {
    test('does not initialise Sentry when no DSN is provided', () async {
      final client = _FakeTelemetryClient();
      final logs = <String>[];
      final telemetry = TelemetryService(
        _config(dsn: null),
        client: client,
        packageInfoLoader: () async => _testPackageInfo(),
        debugLogger: logs.add,
      );

      var runnerInvoked = false;
      await telemetry.runApp(() {
        runnerInvoked = true;
      });

      expect(runnerInvoked, isTrue);
      expect(client.initCalls, 0);
      expect(logs, isEmpty);
    });

    test('initialises Sentry with release metadata when DSN provided', () async {
      final client = _FakeTelemetryClient();
      final telemetry = TelemetryService(
        _config(dsn: 'https://dsn@example.com'),
        client: client,
        packageInfoLoader: () async => _testPackageInfo(),
      );

      await telemetry.prepare();
      await telemetry.runApp(() {});

      expect(client.initCalls, 1);
      expect(client.options?.dsn, 'https://dsn@example.com');
      expect(client.options?.environment, 'development');
      expect(client.options?.tracesSampleRate, closeTo(0.5, 1e-9));
      expect(client.options?.release, 'com.edulure.test@1.2.3+42');
    });

    test('forwards exception context to telemetry client', () async {
      final client = _FakeTelemetryClient();
      final telemetry = TelemetryService(
        _config(dsn: 'dsn'),
        client: client,
        packageInfoLoader: () async => _testPackageInfo(),
      );

      await telemetry.runApp(() {});

      final stack = StackTrace.current;
      await telemetry.captureException(
        StateError('boom'),
        stackTrace: stack,
        context: const {'scope': 'testing'},
      );

      expect(client.capturedError, isA<StateError>());
      expect(client.capturedStack, stack);
      expect(client.capturedContext, equals(const {'scope': 'testing'}));
    });

    test('records network breadcrumbs when telemetry enabled', () async {
      final client = _FakeTelemetryClient();
      final telemetry = TelemetryService(
        _config(dsn: 'dsn'),
        client: client,
        packageInfoLoader: () async => _testPackageInfo(),
      );

      await telemetry.runApp(() {});

      final request = RequestOptions(path: '/hello', method: 'GET', baseUrl: 'https://example.com');
      final response = Response(requestOptions: request, statusCode: 200);

      telemetry.recordNetworkEvent(request: request, response: response, duration: const Duration(milliseconds: 123));

      expect(client.breadcrumbs, hasLength(1));
      final breadcrumb = client.breadcrumbs.single;
      expect(breadcrumb.category, 'network');
      expect(breadcrumb.data?['statusCode'], 200);
      expect(breadcrumb.data?['durationMs'], 123);
    });

    test('records provider updates as breadcrumbs', () async {
      final client = _FakeTelemetryClient();
      final telemetry = TelemetryService(
        _config(dsn: 'dsn'),
        client: client,
        packageInfoLoader: () async => _testPackageInfo(),
      );

      await telemetry.runApp(() {});
      telemetry.recordProviderUpdate(providerName: 'testProvider', value: 'value');

      expect(client.breadcrumbs.where((crumb) => crumb.category == 'state'), isNotEmpty);
    });

    test('logs package info failures without throwing when telemetry disabled', () async {
      final client = _FakeTelemetryClient();
      final logs = <String>[];
      final telemetry = TelemetryService(
        _config(dsn: null),
        client: client,
        packageInfoLoader: () async => throw StateError('missing package info'),
        debugLogger: logs.add,
      );

      await telemetry.prepare();

      expect(logs.single, contains('Failed to load package info'));
      expect(client.capturedError, isNull);
    });
  });
}
