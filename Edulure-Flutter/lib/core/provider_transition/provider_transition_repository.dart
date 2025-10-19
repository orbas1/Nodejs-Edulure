import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../services/provider_transition_service.dart';
import '../../services/session_manager.dart';
import 'provider_transition_models.dart';

const _announcementsCacheKey = 'announcements.bundle';
const Duration _cacheTtl = Duration(hours: 4);

class ProviderTransitionRepository {
  ProviderTransitionRepository(this._service);

  final ProviderTransitionService _service;

  Future<ProviderTransitionAnnouncementsState> loadAnnouncements({bool forceRefresh = false}) async {
    final now = DateTime.now();
    final cached = await _readAnnouncementsCache();
    if (!forceRefresh && cached != null && now.difference(cached.fetchedAt) < _cacheTtl) {
      return cached.copyWith(offlineFallback: false);
    }

    try {
      final payload = await _service.listAnnouncements(includeDetails: true);
      final bundles = payload
          .map(
            (item) => _mapBundleFromResponse(
              Map<String, dynamic>.from(item),
              fetchedAt: now,
            ),
          )
          .toList();
      final state = ProviderTransitionAnnouncementsState(
        announcements: bundles,
        fetchedAt: now,
        offlineFallback: false,
      );
      unawaited(_writeAnnouncementsCache(state));
      return state;
    } on ProviderTransitionApiException {
      if (cached != null) {
        final offlineBundles = cached.announcements
            .map((bundle) => bundle.copyWith(offlineSource: true, fetchedAt: now))
            .toList();
        return ProviderTransitionAnnouncementsState(
          announcements: offlineBundles,
          fetchedAt: now,
          offlineFallback: true,
        );
      }
      rethrow;
    }
  }

  Future<ProviderTransitionAnnouncementBundle?> fetchAnnouncementDetail(
    String slug, {
    bool forceRefresh = false,
  }) async {
    final now = DateTime.now();
    if (!forceRefresh) {
      final cachedDetail = await _readAnnouncementDetailCache(slug);
      if (cachedDetail != null && now.difference(cachedDetail.fetchedAt) < _cacheTtl) {
        return cachedDetail.copyWith(offlineSource: false);
      }
    }

    try {
      final payload = await _service.getAnnouncementDetail(slug);
      final bundle = _mapDetailFromResponse(Map<String, dynamic>.from(payload), fetchedAt: now);
      unawaited(_writeAnnouncementDetailCache(slug, bundle));
      return bundle;
    } on ProviderTransitionApiException {
      final cachedDetail = await _readAnnouncementDetailCache(slug);
      if (cachedDetail != null) {
        return cachedDetail.copyWith(offlineSource: true, fetchedAt: now);
      }
      final listCache = await _readAnnouncementsCache();
      final fallback = listCache?.announcements.firstWhere(
        (bundle) => bundle.announcement.slug == slug,
        orElse: () => _emptyBundle(slug, now),
      );
      if (fallback != null) {
        return fallback.copyWith(offlineSource: true, fetchedAt: now);
      }
      rethrow;
    }
  }

  Future<void> acknowledge(
    String slug,
    ProviderTransitionAcknowledgementRequest request,
  ) async {
    await _service.acknowledge(slug, request.toJson());
    await loadAnnouncements(forceRefresh: true);
    unawaited(fetchAnnouncementDetail(slug, forceRefresh: true));
  }

  Future<void> recordStatus(
    String slug, {
    required String statusCode,
    String? providerReference,
    String? notes,
  }) async {
    await _service.recordStatus(slug, {
      'statusCode': statusCode,
      if (providerReference != null) 'providerReference': providerReference,
      if (notes != null) 'notes': notes,
    });
    await loadAnnouncements(forceRefresh: true);
    unawaited(fetchAnnouncementDetail(slug, forceRefresh: true));
  }

  ProviderTransitionAnnouncementBundle _mapBundleFromResponse(
    Map<String, dynamic> payload, {
    required DateTime fetchedAt,
  }) {
    final announcement = ProviderTransitionAnnouncement.fromJson(
      Map<String, dynamic>.from(payload['announcement'] as Map),
    );
    final timeline = (payload['timeline'] as List? ?? const [])
        .map((entry) => ProviderTransitionTimelineEntry.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList();
    final resources = (payload['resources'] as List? ?? const [])
        .map((entry) => ProviderTransitionResource.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList();
    final latestStatus = payload['latestStatus'] is Map
        ? ProviderTransitionStatus.fromJson(Map<String, dynamic>.from(payload['latestStatus'] as Map))
        : null;
    final acknowledgementTotal = payload['acknowledgements'] is Map
        ? int.tryParse('${(payload['acknowledgements'] as Map)['total']}') ?? 0
        : 0;

    return ProviderTransitionAnnouncementBundle(
      announcement: announcement,
      timeline: timeline,
      resources: resources,
      acknowledgementTotal: acknowledgementTotal,
      latestStatus: latestStatus,
      fetchedAt: fetchedAt,
      offlineSource: false,
    );
  }

  ProviderTransitionAnnouncementBundle _mapDetailFromResponse(
    Map<String, dynamic> payload, {
    required DateTime fetchedAt,
  }) {
    final announcement = ProviderTransitionAnnouncement.fromJson(
      Map<String, dynamic>.from(payload['announcement'] as Map),
    );
    final timeline = (payload['timeline'] as List? ?? const [])
        .map((entry) => ProviderTransitionTimelineEntry.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList();
    final resources = (payload['resources'] as List? ?? const [])
        .map((entry) => ProviderTransitionResource.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList();
    final acknowledgementTotal = payload['acknowledgements'] is Map
        ? int.tryParse('${(payload['acknowledgements'] as Map)['total']}') ?? 0
        : 0;
    final recentStatusUpdates = (payload['recentStatusUpdates'] as List? ?? const [])
        .map((entry) => ProviderTransitionStatus.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList();

    return ProviderTransitionAnnouncementBundle(
      announcement: announcement,
      timeline: timeline,
      resources: resources,
      acknowledgementTotal: acknowledgementTotal,
      recentStatusUpdates: recentStatusUpdates,
      latestStatus: recentStatusUpdates.isNotEmpty ? recentStatusUpdates.first : null,
      fetchedAt: fetchedAt,
      offlineSource: false,
    );
  }

  Future<void> _writeAnnouncementsCache(ProviderTransitionAnnouncementsState state) async {
    final box = await SessionManager.ensureProviderTransitionCache();
    if (box == null) {
      return;
    }
    final payload = {
      'fetchedAt': state.fetchedAt.toIso8601String(),
      'announcements': state.announcements.map((bundle) => bundle.toJson()).toList(),
      'offlineFallback': state.offlineFallback,
      'version': 1,
    };
    await box.put(_announcementsCacheKey, payload);
    for (final bundle in state.announcements) {
      await _writeAnnouncementDetailCache(bundle.announcement.slug, bundle);
    }
  }

  Future<ProviderTransitionAnnouncementsState?> _readAnnouncementsCache() async {
    final box = SessionManager.providerTransitionCache;
    if (box == null) {
      return null;
    }
    final cached = box.get(_announcementsCacheKey);
    if (cached is! Map) {
      return null;
    }
    try {
      final fetchedAtRaw = cached['fetchedAt'];
      final fetchedAt = fetchedAtRaw is String ? DateTime.tryParse(fetchedAtRaw) : null;
      final announcements = (cached['announcements'] as List? ?? const [])
          .map((entry) => ProviderTransitionAnnouncementBundle.fromJson(Map<String, dynamic>.from(entry as Map)))
          .toList();
      return ProviderTransitionAnnouncementsState(
        announcements: announcements,
        fetchedAt: fetchedAt ?? DateTime.now(),
        offlineFallback: cached['offlineFallback'] == true,
      );
    } catch (error, stackTrace) {
      debugPrint('Failed to hydrate provider transition cache: $error');
      debugPrintStack(stackTrace: stackTrace);
      return null;
    }
  }

  Future<void> _writeAnnouncementDetailCache(
    String slug,
    ProviderTransitionAnnouncementBundle bundle,
  ) async {
    final box = await SessionManager.ensureProviderTransitionCache();
    if (box == null) {
      return;
    }
    await box.put('announcement:$slug', bundle.toJson());
  }

  Future<ProviderTransitionAnnouncementBundle?> _readAnnouncementDetailCache(String slug) async {
    final box = SessionManager.providerTransitionCache;
    if (box == null) {
      return null;
    }
    final payload = box.get('announcement:$slug');
    if (payload is! Map) {
      return null;
    }
    try {
      return ProviderTransitionAnnouncementBundle.fromJson(Map<String, dynamic>.from(payload as Map));
    } catch (error, stackTrace) {
      debugPrint('Failed to read provider transition detail cache for $slug: $error');
      debugPrintStack(stackTrace: stackTrace);
      return null;
    }
  }

  ProviderTransitionAnnouncementBundle _emptyBundle(String slug, DateTime fetchedAt) {
    return ProviderTransitionAnnouncementBundle(
      announcement: ProviderTransitionAnnouncement(
        id: 0,
        slug: slug,
        title: slug,
        summary: '',
        bodyMarkdown: '',
        status: 'draft',
        effectiveFrom: fetchedAt,
        ackRequired: false,
      ),
      timeline: const [],
      resources: const [],
      acknowledgementTotal: 0,
      fetchedAt: fetchedAt,
      offlineSource: true,
    );
  }
}
