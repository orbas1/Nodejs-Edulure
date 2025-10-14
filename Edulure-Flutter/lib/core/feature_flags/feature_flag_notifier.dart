import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../feature_flags/feature_flag_repository.dart';
import '../telemetry/telemetry_service.dart';
import '../network/dio_provider.dart';

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
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => repository.refresh(force: force));
    state.whenData((flags) {
      ref.read(telemetryServiceProvider).recordProviderUpdate(
            providerName: 'featureFlags',
            value: '${flags.length} flags',
          );
    });
  }

  bool isEnabled(String key) {
    return state.value?[key] ?? false;
  }
}

final featureFlagControllerProvider = AsyncNotifierProvider<FeatureFlagNotifier, Map<String, bool>>(
  FeatureFlagNotifier.new,
);
