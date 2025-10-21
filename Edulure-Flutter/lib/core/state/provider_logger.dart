import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../telemetry/telemetry_service.dart';

class TelemetryProviderObserver extends ProviderObserver {
  TelemetryProviderObserver(this._telemetryResolver);

  final TelemetryService Function() _telemetryResolver;

  @override
  void didUpdateProvider(
    ProviderBase<Object?> provider,
    Object? previousValue,
    Object? newValue,
    ProviderContainer container,
  ) {
    try {
      final telemetry = _telemetryResolver();
      telemetry.recordProviderUpdate(
        providerName: provider.name ?? provider.runtimeType.toString(),
        value: newValue,
      );
    } catch (error, stackTrace) {
      // Telemetry should never break provider updates; surface through debug output instead.
      if (kDebugMode) {
        // ignore: avoid_print
        debugPrint('Telemetry provider observer failed: $error\n$stackTrace');
      }
    }
    super.didUpdateProvider(provider, previousValue, newValue, container);
  }
}
