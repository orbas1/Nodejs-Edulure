import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/dio_provider.dart';
import '../security/session_manager_facade.dart';
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
    final baseState = await repository.loadAnnouncements();
    return _attachPermissions(baseState);
  }

  Future<void> refresh({bool forceNetwork = true}) async {
    final repository = ref.watch(providerTransitionRepositoryProvider);
    final previous = state.value;
    state = AsyncValue.loading(previous: previous);
    state = await AsyncValue.guard(() async {
      final refreshed = await repository.loadAnnouncements(forceRefresh: forceNetwork);
      return _attachPermissions(refreshed);
    });
  }

  Future<void> acknowledge(
    String slug,
    ProviderTransitionAcknowledgementRequest request,
  ) async {
    _ensureActionAllowed(ProviderTransitionAction.acknowledge);
    final repository = ref.watch(providerTransitionRepositoryProvider);
    state = AsyncValue.loading(previous: state.value);
    state = await AsyncValue.guard(() async {
      await repository.acknowledge(slug, request);
      final refreshed = await repository.loadAnnouncements();
      return _attachPermissions(refreshed);
    });
  }

  Future<void> recordStatus(
    String slug, {
    required String statusCode,
    String? providerReference,
    String? notes,
  }) async {
    _ensureActionAllowed(ProviderTransitionAction.recordStatus);
    final repository = ref.watch(providerTransitionRepositoryProvider);
    state = AsyncValue.loading(previous: state.value);
    state = await AsyncValue.guard(() async {
      await repository.recordStatus(
        slug,
        statusCode: statusCode,
        providerReference: providerReference,
        notes: notes,
      );
      final refreshed = await repository.loadAnnouncements();
      return _attachPermissions(refreshed);
    });
  }

  Future<ProviderTransitionAnnouncementBundle?> loadDetail(
    String slug, {
    bool forceRefresh = false,
  }) async {
    final repository = ref.watch(providerTransitionRepositoryProvider);
    return repository.fetchAnnouncementDetail(slug, forceRefresh: forceRefresh);
  }

  ProviderTransitionAnnouncementsState _attachPermissions(
    ProviderTransitionAnnouncementsState state,
  ) {
    final permissions = _resolvePermissions(offlineFallback: state.offlineFallback);
    return state.copyWith(permissions: permissions);
  }

  ProviderTransitionPermissions _resolvePermissions({bool offlineFallback = false}) {
    final facade = ref.read(sessionManagerFacadeProvider);
    var permissions = ProviderTransitionPermissions.fromSession(
      session: facade.session,
      activeRole: facade.activeRole,
    );
    if (offlineFallback) {
      permissions = permissions.restrictForOffline();
    }
    return permissions;
  }

  void _ensureActionAllowed(ProviderTransitionAction action) {
    final permissions = state.value?.permissions ?? _resolvePermissions();
    if (!permissions.allows(action)) {
      throw ProviderTransitionAccessDeniedException(
        action,
        reason: permissions.denialReasonFor(action),
      );
    }
  }
}

final providerTransitionAnnouncementsProvider = AsyncNotifierProvider<
    ProviderTransitionAnnouncementsController, ProviderTransitionAnnouncementsState>(
  ProviderTransitionAnnouncementsController.new,
);
