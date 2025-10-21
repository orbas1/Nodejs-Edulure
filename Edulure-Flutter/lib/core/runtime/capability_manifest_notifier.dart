import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/dio_provider.dart';
import '../telemetry/telemetry_service.dart';
import 'capability_manifest_models.dart';
import 'capability_manifest_repository.dart';

final capabilityManifestRepositoryProvider = Provider<CapabilityManifestRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return CapabilityManifestRepository(dio);
});

class CapabilityManifestSnapshot {
  CapabilityManifestSnapshot({
    required this.manifest,
    required this.fetchedAt,
    required this.fromCache,
    this.isStale = false,
    this.isRefreshing = false,
    this.lastError,
    this.lastErrorStackTrace,
  });

  final CapabilityManifest manifest;
  final DateTime fetchedAt;
  final bool fromCache;
  final bool isStale;
  final bool isRefreshing;
  final Object? lastError;
  final StackTrace? lastErrorStackTrace;

  CapabilityImpactNotice? get notice => manifest.buildImpactNotice();

  CapabilityManifestSnapshot copyWith({
    CapabilityManifest? manifest,
    DateTime? fetchedAt,
    bool? fromCache,
    bool? isStale,
    bool? isRefreshing,
    Object? lastError,
    StackTrace? lastErrorStackTrace,
    bool clearError = false,
  }) {
    return CapabilityManifestSnapshot(
      manifest: manifest ?? this.manifest,
      fetchedAt: fetchedAt ?? this.fetchedAt,
      fromCache: fromCache ?? this.fromCache,
      isStale: isStale ?? this.isStale,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      lastError: clearError ? null : (lastError ?? this.lastError),
      lastErrorStackTrace: clearError ? null : (lastErrorStackTrace ?? this.lastErrorStackTrace),
    );
  }
}

class CapabilityManifestNotifier extends AsyncNotifier<CapabilityManifestSnapshot?> {
  @override
  Future<CapabilityManifestSnapshot?> build() async {
    final repository = ref.read(capabilityManifestRepositoryProvider);
    final cached = await repository.loadCachedManifest();
    if (cached == null) {
      return null;
    }
    return CapabilityManifestSnapshot(
      manifest: cached.manifest,
      fetchedAt: cached.fetchedAt,
      fromCache: true,
      isStale: cached.isStale,
    );
  }

  Future<void> warmUp() async {
    final repository = ref.read(capabilityManifestRepositoryProvider);
    final cached = await repository.loadCachedManifest();
    if (cached != null) {
      state = AsyncData(
        CapabilityManifestSnapshot(
          manifest: cached.manifest,
          fetchedAt: cached.fetchedAt,
          fromCache: true,
          isStale: cached.isStale,
        ),
      );
    } else {
      state = const AsyncLoading();
    }
    await refresh(force: true);
  }

  Future<void> refresh({bool force = false}) async {
    final repository = ref.read(capabilityManifestRepositoryProvider);
    final telemetry = ref.read(telemetryServiceProvider);
    final previous = state.asData?.value;

    if (previous != null) {
      state = AsyncData(previous.copyWith(isRefreshing: true, clearError: true));
    } else if (!state.isLoading) {
      state = const AsyncLoading();
    }

    try {
      final result = await repository.getManifest(force: force);
      final snapshot = CapabilityManifestSnapshot(
        manifest: result.manifest,
        fetchedAt: result.fetchedAt,
        fromCache: result.fromCache,
        isStale: result.isStale,
      );
      state = AsyncData(snapshot);
      telemetry.recordProviderUpdate(
        providerName: 'capabilityManifest',
        value: snapshot.manifest.statusSummary,
      );
    } catch (error, stackTrace) {
      await telemetry.captureException(
        error,
        stackTrace: stackTrace,
        context: {
          'provider': 'capabilityManifest',
          'phase': 'refresh',
          'force': force,
        },
      );

      if (previous != null) {
        state = AsyncData(
          previous.copyWith(
            isRefreshing: false,
            lastError: error,
            lastErrorStackTrace: stackTrace,
          ),
        );
        return;
      }

      final fallback = await repository.loadCachedManifest();
      if (fallback != null) {
        state = AsyncData(
          CapabilityManifestSnapshot(
            manifest: fallback.manifest,
            fetchedAt: fallback.fetchedAt,
            fromCache: true,
            lastError: error,
            lastErrorStackTrace: stackTrace,
          ),
        );
      } else {
        state = AsyncError(error, stackTrace);
      }
    }
  }
}

final capabilityManifestControllerProvider =
    AsyncNotifierProvider<CapabilityManifestNotifier, CapabilityManifestSnapshot?>(CapabilityManifestNotifier.new);
