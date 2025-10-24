import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import '../config/app_config.dart';

typedef _PackageInfoLoader = Future<PackageInfo> Function();
typedef _DebugLogger = void Function(String message);

class TelemetryInitOptions {
  const TelemetryInitOptions({
    required this.dsn,
    required this.environment,
    required this.tracesSampleRate,
    this.release,
  });

  final String dsn;
  final String environment;
  final double tracesSampleRate;
  final String? release;
}

abstract class TelemetryClient {
  const TelemetryClient();

  Future<void> init({
    required TelemetryInitOptions options,
    required FutureOr<void> Function() runner,
  });

  Future<void> captureException(
    Object error, {
    StackTrace? stackTrace,
    Map<String, dynamic>? context,
  });

  void addBreadcrumb(Breadcrumb breadcrumb);
}

class SentryTelemetryClient implements TelemetryClient {
  const SentryTelemetryClient();

  @override
  Future<void> init({
    required TelemetryInitOptions options,
    required FutureOr<void> Function() runner,
  }) async {
    await SentryFlutter.init(
      (config) {
        config.dsn = options.dsn;
        config.tracesSampleRate = options.tracesSampleRate;
        config.environment = options.environment;
        if (options.release != null) {
          config.release = options.release;
        }
      },
      appRunner: () {
        runZonedGuarded(
          () async {
            await Future.sync(runner);
          },
          (error, stackTrace) {
            Sentry.captureException(error, stackTrace: stackTrace);
          },
        );
      },
    );
  }

  @override
  Future<void> captureException(
    Object error, {
    StackTrace? stackTrace,
    Map<String, dynamic>? context,
  }) {
    return Sentry.captureException(
      error,
      stackTrace: stackTrace,
      withScope: (scope) {
        if (context != null) {
          for (final entry in context.entries) {
            scope.setExtra(entry.key, entry.value);
          }
        }
      },
    );
  }

  @override
  void addBreadcrumb(Breadcrumb breadcrumb) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}

class TelemetryService {
  TelemetryService(
    this._config, {
    TelemetryClient? client,
    _PackageInfoLoader? packageInfoLoader,
    _DebugLogger? debugLogger,
  })  : _client = client ?? const SentryTelemetryClient(),
        _packageInfoLoader = packageInfoLoader ?? PackageInfo.fromPlatform,
        _debugLogger = debugLogger ?? ((message) => debugPrint(message));

  final AppConfig _config;
  final TelemetryClient _client;
  final _PackageInfoLoader _packageInfoLoader;
  final _DebugLogger _debugLogger;
  PackageInfo? _packageInfo;
  bool _sentryEnabled = false;

  Future<void> prepare() async {
    try {
      _packageInfo = await _packageInfoLoader();
    } catch (error, stackTrace) {
      _debugLogger('Failed to load package info: $error');
      if (_config.sentryDsn != null && _config.sentryDsn!.isNotEmpty) {
        unawaited(
          _client.captureException(error, stackTrace: stackTrace),
        );
      }
    }
  }

  Future<void> runApp(FutureOr<void> Function() runner) async {
    final dsn = _config.sentryDsn;
    if (dsn == null || dsn.isEmpty) {
      await Future.sync(runner);
      return;
    }

    await _client.init(
      options: TelemetryInitOptions(
        dsn: dsn,
        environment: _config.environment.name,
        tracesSampleRate: _config.tracesSampleRate,
        release: _packageInfo != null
            ? '${_packageInfo!.packageName}@${_packageInfo!.version}+${_packageInfo!.buildNumber}'
            : null,
      ),
      runner: runner,
    );

    _sentryEnabled = true;
  }

  Future<void> captureException(
    Object error, {
    StackTrace? stackTrace,
    Map<String, dynamic>? context,
  }) async {
    if (_sentryEnabled) {
      await _client.captureException(
        error,
        stackTrace: stackTrace,
        context: context,
      );
      return;
    }
    if (kDebugMode) {
      _debugLogger('Telemetry exception: $error');
      if (stackTrace != null) {
        _debugLogger(stackTrace.toString());
      }
    }
  }

  void recordBreadcrumb({
    required String category,
    required String message,
    Map<String, dynamic>? data,
    SentryLevel level = SentryLevel.info,
  }) {
    final breadcrumb = Breadcrumb(
      message: message,
      category: category,
      data: data,
      level: level,
    );
    if (_sentryEnabled) {
      _client.addBreadcrumb(breadcrumb);
    }
    if (kDebugMode) {
      final meta = data == null || data.isEmpty ? '' : ' ${data.toString()}';
      _debugLogger('[telemetry][$category] $message$meta');
    }
  }

  void recordNetworkEvent({
    required RequestOptions request,
    Response? response,
    DioException? error,
    Duration? duration,
  }) {
    final statusCode = response?.statusCode ?? error?.response?.statusCode;
    final breadcrumb = Breadcrumb(
      message: '${request.method} ${request.uri.path}',
      category: 'network',
      data: {
        'url': request.uri.toString(),
        'statusCode': statusCode,
        'durationMs': duration?.inMilliseconds,
      },
      level: error != null ? SentryLevel.error : SentryLevel.info,
    );
    if (_sentryEnabled) {
      _client.addBreadcrumb(breadcrumb);
    }
    if (kDebugMode) {
      _debugLogger('[network] ${request.method} ${request.uri} status=$statusCode duration=${duration?.inMilliseconds ?? '-'}ms');
      if (error != null) {
        _debugLogger('↳ error: ${error.message}');
      }
    }
  }

  void recordProviderUpdate({
    required String providerName,
    Object? value,
  }) {
    if (!_sentryEnabled && !kDebugMode) {
      return;
    }
    final breadcrumb = Breadcrumb(
      message: 'Provider updated: $providerName',
      category: 'state',
      data: {
        'value': value?.toString(),
      },
    );
    if (_sentryEnabled) {
      _client.addBreadcrumb(breadcrumb);
    }
    if (kDebugMode) {
      _debugLogger('[state] $providerName -> $value');
    }
  }
}

final telemetryServiceProvider = Provider<TelemetryService>((ref) {
  final config = ref.watch(appConfigProvider);
  return TelemetryService(config);
});
