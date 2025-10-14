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
  });

  final AppEnvironment environment;
  final String apiBaseUrl;
  final bool enableNetworkLogging;
  final String? sentryDsn;
  final double tracesSampleRate;

  bool get isProduction => environment == AppEnvironment.production;
  bool get isStaging => environment == AppEnvironment.staging;

  static AppConfig resolve() {
    const envName = String.fromEnvironment('APP_ENV', defaultValue: 'development');
    const baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:4000/api');
    const sentry = String.fromEnvironment('SENTRY_DSN', defaultValue: '');
    const traces = String.fromEnvironment('SENTRY_TRACES_SAMPLE_RATE', defaultValue: '0.15');
    const logSetting = String.fromEnvironment('ENABLE_NETWORK_LOGGING', defaultValue: '');

    final environment = parseEnvironment(envName);
    final enableLogging = logSetting.isEmpty
        ? !kReleaseMode
        : logSetting.toLowerCase() == 'true' || logSetting == '1';

    final sampleRate = double.tryParse(traces) ?? 0.15;

    double clampSample(double value) => value.clamp(0.0, 1.0).toDouble();

    return AppConfig(
      environment: environment,
      apiBaseUrl: baseUrl,
      enableNetworkLogging: enableLogging,
      sentryDsn: sentry.isEmpty ? null : sentry,
      tracesSampleRate: clampSample(sampleRate),
    );
  }
}

final appConfigProvider = Provider<AppConfig>((ref) {
  return AppConfig.resolve();
});
