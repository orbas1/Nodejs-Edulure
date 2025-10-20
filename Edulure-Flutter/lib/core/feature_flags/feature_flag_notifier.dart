import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../feature_flags/feature_flag_repository.dart';
import '../network/dio_provider.dart';
import '../telemetry/telemetry_service.dart';

final featureFlagRepositoryProvider = Provider<FeatureFlagRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return FeatureFlagRepository(dio);
});

class FeatureFlagNotifier extends AsyncNotifier<Map<String, bool>> {
  @override
  Future<Map<String, bool>> build() async {
    final repository = ref.watch(featureFlagRepositoryProvider);
    return repository.loadCachedFlags();
  }

  Future<void> warmUp() async {
    await refresh(force: true);
  }

  Future<void> refresh({bool force = false}) async {
    final repository = ref.watch(featureFlagRepositoryProvider);
    final telemetry = ref.read(telemetryServiceProvider);
    final previous = state.value;

    state = AsyncValue.loading(previous: previous);
    try {
      final flags = await repository.refresh(force: force);
      state = AsyncValue.data(flags);
      telemetry.recordProviderUpdate(
        providerName: 'featureFlags',
        value: '${flags.length} flags',
      );
    } catch (error, stackTrace) {
      final cached = await repository.loadCachedFlags();
      if (cached.isNotEmpty) {
        state = AsyncValue.data(cached);
        telemetry.recordProviderUpdate(
          providerName: 'featureFlags.offline',
          value: '${cached.length} cached flags',
        );
      } else {
        state = AsyncValue.error(error, stackTrace);
      }
      await telemetry.captureException(
        error,
        stackTrace: stackTrace,
        context: {
          'provider': 'featureFlags',
          'force': force,
        },
      );
    }
  }

  bool isEnabled(String key) {
    return state.value?[key] ?? false;
  }
}

final featureFlagControllerProvider = AsyncNotifierProvider<FeatureFlagNotifier, Map<String, bool>>(
  FeatureFlagNotifier.new,
);
