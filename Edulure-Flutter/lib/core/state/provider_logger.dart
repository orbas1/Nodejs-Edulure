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
    final telemetry = _telemetryResolver();
    telemetry.recordProviderUpdate(
      providerName: provider.name ?? provider.runtimeType.toString(),
      value: newValue,
    );
    super.didUpdateProvider(provider, previousValue, newValue, container);
  }
}
