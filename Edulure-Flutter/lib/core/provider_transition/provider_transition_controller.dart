import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/dio_provider.dart';
import 'provider_transition_models.dart';
import 'provider_transition_repository.dart';
import '../../services/provider_transition_service.dart';

final providerTransitionServiceProvider = Provider<ProviderTransitionService>((ref) {
  final dio = ref.watch(dioProvider);
  return ProviderTransitionService(dio);
});

final providerTransitionRepositoryProvider = Provider<ProviderTransitionRepository>((ref) {
  final service = ref.watch(providerTransitionServiceProvider);
  return ProviderTransitionRepository(service);
});

class ProviderTransitionAnnouncementsController
    extends AsyncNotifier<ProviderTransitionAnnouncementsState> {
  @override
  Future<ProviderTransitionAnnouncementsState> build() async {
    final repository = ref.watch(providerTransitionRepositoryProvider);
    return repository.loadAnnouncements();
  }

  Future<void> refresh({bool forceNetwork = true}) async {
    final repository = ref.watch(providerTransitionRepositoryProvider);
    final previous = state.value;
    state = AsyncValue.loading(previous: previous);
    state = await AsyncValue.guard(
      () => repository.loadAnnouncements(forceRefresh: forceNetwork),
    );
  }

  Future<void> acknowledge(
    String slug,
    ProviderTransitionAcknowledgementRequest request,
  ) async {
    final repository = ref.watch(providerTransitionRepositoryProvider);
    state = AsyncValue.loading(previous: state.value);
    state = await AsyncValue.guard(() async {
      await repository.acknowledge(slug, request);
      return repository.loadAnnouncements();
    });
  }

  Future<void> recordStatus(
    String slug, {
    required String statusCode,
    String? providerReference,
    String? notes,
  }) async {
    final repository = ref.watch(providerTransitionRepositoryProvider);
    state = AsyncValue.loading(previous: state.value);
    state = await AsyncValue.guard(() async {
      await repository.recordStatus(
        slug,
        statusCode: statusCode,
        providerReference: providerReference,
        notes: notes,
      );
      return repository.loadAnnouncements();
    });
  }

  Future<ProviderTransitionAnnouncementBundle?> loadDetail(
    String slug, {
    bool forceRefresh = false,
  }) async {
    final repository = ref.watch(providerTransitionRepositoryProvider);
    return repository.fetchAnnouncementDetail(slug, forceRefresh: forceRefresh);
  }
}

final providerTransitionAnnouncementsProvider = AsyncNotifierProvider<
    ProviderTransitionAnnouncementsController, ProviderTransitionAnnouncementsState>(
  ProviderTransitionAnnouncementsController.new,
);
