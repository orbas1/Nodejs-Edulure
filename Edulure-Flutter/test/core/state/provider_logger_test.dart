import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:edulure_mobile/core/config/app_config.dart';
import 'package:edulure_mobile/core/config/app_environment.dart';
import 'package:edulure_mobile/core/state/provider_logger.dart';
import 'package:edulure_mobile/core/telemetry/telemetry_service.dart';

class _NoopTelemetryClient implements TelemetryClient {
  const _NoopTelemetryClient();

  @override
  Future<void> init({
    required TelemetryInitOptions options,
    required Future<void> Function() runner,
  }) async {}

  @override
  Future<void> captureException(
    Object error, {
    StackTrace? stackTrace,
    Map<String, dynamic>? context,
  }) async {}

  @override
  void addBreadcrumb(Breadcrumb breadcrumb) {}
}

class _TelemetrySpy extends TelemetryService {
  _TelemetrySpy() : super(_config(), client: const _NoopTelemetryClient());

  final List<Map<String, Object?>> entries = <Map<String, Object?>>[];

  static AppConfig _config() {
    return AppConfig(
      environment: AppEnvironment.development,
      apiBaseUrl: 'https://example.com',
      enableNetworkLogging: false,
      sentryDsn: null,
      tracesSampleRate: 0.0,
    );
  }

  @override
  void recordProviderUpdate({required String providerName, Object? value}) {
    entries.add(<String, Object?>{'name': providerName, 'value': value});
  }
}

void main() {
  test('records provider updates via telemetry', () {
    final telemetry = _TelemetrySpy();
    final observer = TelemetryProviderObserver(() => telemetry);
    final provider = Provider<String>((ref) => 'value');
    final container = ProviderContainer();

    observer.didUpdateProvider(provider, null, 'next', container);

    expect(telemetry.entries.single['name'], contains('Provider<String>'));
    expect(telemetry.entries.single['value'], 'next');
  });

  test('swallows telemetry failures to keep provider flow stable', () {
    final telemetry = _TelemetrySpy();
    telemetry.entries.clear();
    final observer = TelemetryProviderObserver(() {
      throw StateError('telemetry offline');
    });
    final provider = Provider<String>((ref) => 'value');
    final container = ProviderContainer();

    expect(
      () => observer.didUpdateProvider(provider, null, 'next', container),
      returnsNormally,
    );
  });
}
