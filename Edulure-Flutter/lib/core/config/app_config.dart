import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_environment.dart';

class AppConfig {
  AppConfig({
    required this.environment,
    required this.apiBaseUrl,
    required this.enableNetworkLogging,
    required this.sentryDsn,
    required this.tracesSampleRate,
    this.defaultRequestTimeout = const Duration(seconds: 30),
  })  : assert(tracesSampleRate >= 0 && tracesSampleRate <= 1, 'Trace sample rate must be between 0 and 1.'),
        _baseUri = _ensureValidBaseUri(environment, apiBaseUrl);

  final AppEnvironment environment;
  final String apiBaseUrl;
  final bool enableNetworkLogging;
  final String? sentryDsn;
  final double tracesSampleRate;
  final Duration defaultRequestTimeout;

  final Uri _baseUri;

  bool get isProduction => environment == AppEnvironment.production;
  bool get isStaging => environment == AppEnvironment.staging;
  bool get isDevelopment => environment == AppEnvironment.development;

  Uri get apiBaseUri => _baseUri;

  Map<String, String> get defaultHeaders {
    final headers = <String, String>{
      'Accept': 'application/json',
    };
    if (isProduction) {
      headers['X-Edulure-Strict-Origin'] = 'provider-mobile';
    }
    return headers;
  }

  Map<String, dynamic> toJson() {
    return {
      'environment': environment.name,
      'apiBaseUrl': apiBaseUrl,
      'enableNetworkLogging': enableNetworkLogging,
      'sentryDsn': sentryDsn,
      'tracesSampleRate': tracesSampleRate,
      'defaultRequestTimeoutMs': defaultRequestTimeout.inMilliseconds,
    };
  }

  static AppConfig resolve() {
    const envName = String.fromEnvironment('APP_ENV', defaultValue: 'development');
    const baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:4000/api');
    const sentry = String.fromEnvironment('SENTRY_DSN', defaultValue: '');
    const traces = String.fromEnvironment('SENTRY_TRACES_SAMPLE_RATE', defaultValue: '0.15');
    const logSetting = String.fromEnvironment('ENABLE_NETWORK_LOGGING', defaultValue: '');
    const timeoutMs = String.fromEnvironment('HTTP_CLIENT_TIMEOUT_MS', defaultValue: '30000');

    final environment = parseEnvironment(envName);
    final enableLogging = logSetting.isEmpty
        ? !kReleaseMode
        : logSetting.toLowerCase() == 'true' || logSetting == '1';

    final sampleRate = double.tryParse(traces) ?? 0.15;
    final timeout = int.tryParse(timeoutMs);

    double clampSample(double value) => value.clamp(0.0, 1.0).toDouble();

    return AppConfig(
      environment: environment,
      apiBaseUrl: baseUrl,
      enableNetworkLogging: enableLogging,
      sentryDsn: sentry.isEmpty ? null : sentry,
      tracesSampleRate: clampSample(sampleRate),
      defaultRequestTimeout: timeout == null || timeout <= 0
          ? const Duration(seconds: 30)
          : Duration(milliseconds: timeout),
    );
  }

  static Uri _ensureValidBaseUri(AppEnvironment environment, String rawUrl) {
    final normalised = rawUrl.trim();
    if (normalised.isEmpty) {
      throw ArgumentError('API_BASE_URL is required.');
    }

    Uri? parsed;
    try {
      parsed = Uri.parse(normalised);
    } catch (_) {
      parsed = null;
    }

    if (parsed == null || (!parsed.hasScheme || !parsed.hasAuthority)) {
      throw ArgumentError('API_BASE_URL must be a valid absolute URL.');
    }

    if (environment == AppEnvironment.production && parsed.scheme != 'https') {
      throw ArgumentError('Production builds require an HTTPS API_BASE_URL.');
    }

    if (!parsed.path.endsWith('/')) {
      parsed = parsed.replace(path: '${parsed.path}/');
    }

    return parsed;
  }
}

final appConfigProvider = Provider<AppConfig>((ref) {
  return AppConfig.resolve();
});
