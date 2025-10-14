import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import '../config/app_config.dart';

class TelemetryService {
  TelemetryService(this._config);

  final AppConfig _config;
  PackageInfo? _packageInfo;
  bool _sentryEnabled = false;

  Future<void> prepare() async {
    try {
      _packageInfo = await PackageInfo.fromPlatform();
    } catch (error, stackTrace) {
      debugPrint('Failed to load package info: $error');
      if (_config.sentryDsn != null) {
        unawaited(Sentry.captureException(error, stackTrace: stackTrace));
      }
    }
  }

  Future<void> runApp(FutureOr<void> Function() runner) async {
    final dsn = _config.sentryDsn;
    if (dsn == null || dsn.isEmpty) {
      await runner();
      return;
    }

    await SentryFlutter.init(
      (options) {
        options.dsn = dsn;
        options.tracesSampleRate = _config.tracesSampleRate;
        options.environment = _config.environment.name;
        if (_packageInfo != null) {
          options.release =
              '${_packageInfo!.packageName}@${_packageInfo!.version}+${_packageInfo!.buildNumber}';
        }
      },
      appRunner: () {
        runZonedGuarded(
          () {
            runner();
          },
          (error, stackTrace) {
            Sentry.captureException(error, stackTrace: stackTrace);
          },
        );
      },
    );

    _sentryEnabled = true;
  }

  Future<void> captureException(
    Object error, {
    StackTrace? stackTrace,
    Map<String, dynamic>? context,
  }) async {
    if (_sentryEnabled) {
      await Sentry.captureException(
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
      return;
    }
    if (kDebugMode) {
      debugPrint('Telemetry exception: $error');
      if (stackTrace != null) {
        debugPrint(stackTrace.toString());
      }
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
      Sentry.addBreadcrumb(breadcrumb);
    }
    if (kDebugMode) {
      debugPrint('[network] ${request.method} ${request.uri} status=$statusCode duration=${duration?.inMilliseconds ?? '-'}ms');
      if (error != null) {
        debugPrint('↳ error: ${error.message}');
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
      Sentry.addBreadcrumb(breadcrumb);
    }
    if (kDebugMode) {
      debugPrint('[state] $providerName -> $value');
    }
  }
}

final telemetryServiceProvider = Provider<TelemetryService>((ref) {
  final config = ref.watch(appConfigProvider);
  return TelemetryService(config);
});
