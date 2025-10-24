import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/community_service.dart';
import '../../services/live_feed_service.dart';
import '../../services/community_engagement_storage.dart';

final liveFeedServiceProvider = Provider<LiveFeedService>((ref) {
  return LiveFeedService();
});

final communityServiceProvider = Provider<CommunityService>((ref) {
  return CommunityService();
});

final communityEngagementStorageProvider = Provider<CommunityEngagementStorage>((ref) {
  return CommunityEngagementStorage();
});

final liveFeedControllerProvider = StateNotifierProvider<LiveFeedController, LiveFeedState>((ref) {
  return LiveFeedController(
    feedService: ref.watch(liveFeedServiceProvider),
    communityService: ref.watch(communityServiceProvider),
    engagementStorage: ref.watch(communityEngagementStorageProvider),
  );
});

class LiveFeedState {
  const LiveFeedState({
    required this.context,
    this.community,
    this.entries = const <FeedEntry>[],
    this.page = 1,
    this.perPage = 20,
    this.loading = false,
    this.loadingMore = false,
    this.analyticsLoading = false,
    this.error,
    this.snapshot,
    this.highlights = const <FeedHighlight>[],
    this.analytics,
    this.filters = const LiveFeedFilters(),
    this.canLoadMore = false,
    this.placements = const <FeedPlacement>[],
    this.lastSyncedAt,
  });

  final FeedContext context;
  final CommunitySummary? community;
  final List<FeedEntry> entries;
  final int page;
  final int perPage;
  final bool loading;
  final bool loadingMore;
  final bool analyticsLoading;
  final String? error;
  final FeedSnapshot? snapshot;
  final List<FeedHighlight> highlights;
  final FeedAnalytics? analytics;
  final LiveFeedFilters filters;
  final bool canLoadMore;
  final List<FeedPlacement> placements;
  final DateTime? lastSyncedAt;

  LiveFeedState copyWith({
    FeedContext? context,
    CommunitySummary? community,
    List<FeedEntry>? entries,
    int? page,
    int? perPage,
    bool? loading,
    bool? loadingMore,
    bool? analyticsLoading,
    String? error,
    bool clearError = false,
    FeedSnapshot? snapshot,
    List<FeedHighlight>? highlights,
    FeedAnalytics? analytics,
    LiveFeedFilters? filters,
    bool? canLoadMore,
    List<FeedPlacement>? placements,
    DateTime? lastSyncedAt,
  }) {
    return LiveFeedState(
      context: context ?? this.context,
      community: community ?? this.community,
      entries: entries ?? this.entries,
      page: page ?? this.page,
      perPage: perPage ?? this.perPage,
      loading: loading ?? this.loading,
      loadingMore: loadingMore ?? this.loadingMore,
      analyticsLoading: analyticsLoading ?? this.analyticsLoading,
      error: clearError ? null : (error ?? this.error),
      snapshot: snapshot ?? this.snapshot,
      highlights: highlights ?? this.highlights,
      analytics: analytics ?? this.analytics,
      filters: filters ?? this.filters,
      canLoadMore: canLoadMore ?? this.canLoadMore,
      placements: placements ?? this.placements,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }
}

class LiveFeedFilters {
  const LiveFeedFilters({this.search, this.postType, this.range = '30d'});

  final String? search;
  final String? postType;
  final String range;

  LiveFeedFilters copyWith({String? search, String? postType, String? range}) {
    return LiveFeedFilters(
      search: search ?? this.search,
      postType: postType ?? this.postType,
      range: range ?? this.range,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (search != null) 'search': search,
      if (postType != null) 'postType': postType,
      'range': range,
    };
  }
}

class LiveFeedController extends StateNotifier<LiveFeedState> {
  LiveFeedController({
    required LiveFeedService feedService,
    required CommunityService communityService,
    required CommunityEngagementStorage engagementStorage,
  })  : _feedService = feedService,
        _communityService = communityService,
        _engagementStorage = engagementStorage,
        super(const LiveFeedState(context: FeedContext.global));

  final LiveFeedService _feedService;
  final CommunityService _communityService;
  final CommunityEngagementStorage _engagementStorage;

  Future<void> bootstrap({FeedContext? context, CommunitySummary? community}) async {
    final nextContext = context ?? state.context;
    final resolvedCommunity = nextContext == FeedContext.community ? community ?? state.community : null;
    await _hydrateFromCache(nextContext, resolvedCommunity, state.filters);
    await refresh(
      context: nextContext,
      community: resolvedCommunity,
      hydrateFromCache: false,
    );
  }

  Future<void> refresh({
    FeedContext? context,
    CommunitySummary? community,
    LiveFeedFilters? filters,
    bool hydrateFromCache = true,
  }) async {
    final nextContext = context ?? state.context;
    final resolvedCommunity = nextContext == FeedContext.community ? community ?? state.community : null;
    final effectiveFilters = filters ?? state.filters;
    state = state.copyWith(
      context: nextContext,
      community: resolvedCommunity,
      filters: effectiveFilters,
      loading: true,
      page: 1,
      clearError: true,
    );

    if (hydrateFromCache) {
      await _hydrateFromCache(nextContext, resolvedCommunity, effectiveFilters);
    }

    try {
      final snapshot = await _feedService.fetchFeed(
        context: nextContext,
        community: resolvedCommunity?.id,
        page: 1,
        perPage: state.perPage,
        range: effectiveFilters.range,
        search: effectiveFilters.search,
        postType: effectiveFilters.postType,
      );
      final dedupedItems = _dedupeEntries(snapshot.items);
      final normalizedSnapshot = snapshot.copyWith(items: dedupedItems);
      final placements = await _resolvePlacements(normalizedSnapshot);
      state = state.copyWith(
        loading: false,
        snapshot: normalizedSnapshot,
        entries: dedupedItems,
        page: normalizedSnapshot.pagination.page,
        perPage: normalizedSnapshot.pagination.perPage,
        canLoadMore: normalizedSnapshot.pagination.hasMore,
        highlights: normalizedSnapshot.highlights,
        analytics: normalizedSnapshot.analytics,
        placements: placements,
        lastSyncedAt: DateTime.now(),
        clearError: true,
      );
      unawaited(_cacheSnapshot(
        normalizedSnapshot,
        placements,
        nextContext,
        resolvedCommunity,
        effectiveFilters,
      ));
      if (normalizedSnapshot.analytics == null) {
        await reloadAnalytics();
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to refresh feed: $error\n$stackTrace');
      state = state.copyWith(
        loading: false,
        error: _mapError(error),
      );
    }
  }

  Future<void> reloadAnalytics() async {
    if (state.analyticsLoading) return;
    state = state.copyWith(analyticsLoading: true);
    try {
      final analytics = await _feedService.fetchAnalytics(
        context: state.context,
        community: state.community?.id,
        range: state.filters.range,
        search: state.filters.search,
        postType: state.filters.postType,
      );
      state = state.copyWith(
        analytics: analytics,
        analyticsLoading: false,
      );
    } catch (error, stackTrace) {
      debugPrint('Failed to fetch feed analytics: $error\n$stackTrace');
      state = state.copyWith(analyticsLoading: false);
    }
  }

  Future<void> loadMore() async {
    if (state.loadingMore || !state.canLoadMore) return;
    final nextPage = state.page + 1;
    state = state.copyWith(loadingMore: true, clearError: true);
    try {
      final snapshot = await _feedService.fetchFeed(
        context: state.context,
        community: state.community?.id,
        page: nextPage,
        perPage: state.perPage,
        includeAnalytics: false,
        includeHighlights: nextPage == 1,
        range: state.filters.range,
        search: state.filters.search,
        postType: state.filters.postType,
      );
      final combined = _dedupeEntries(<FeedEntry>[...state.entries, ...snapshot.items]);
      final normalizedSnapshot = (state.snapshot ?? snapshot).copyWith(
        pagination: snapshot.pagination,
        items: combined,
        analytics: state.analytics,
        highlights: state.highlights,
      );
      state = state.copyWith(
        entries: combined,
        page: snapshot.pagination.page,
        canLoadMore: snapshot.pagination.hasMore,
        loadingMore: false,
        snapshot: normalizedSnapshot,
      );
      unawaited(_cacheSnapshot(
        normalizedSnapshot,
        state.placements,
        state.context,
        state.community,
        state.filters,
      ));
    } catch (error, stackTrace) {
      debugPrint('Failed to load more feed entries: $error\n$stackTrace');
      state = state.copyWith(
        loadingMore: false,
        error: _mapError(error),
      );
    }
  }

  Future<void> applyFilters(LiveFeedFilters filters) async {
    await refresh(filters: filters);
  }

  Future<void> selectContext(FeedContext context, {CommunitySummary? community}) async {
    await refresh(context: context, community: community);
  }

  Future<CommunityPost> createPost({
    required CommunitySummary community,
    required CreateCommunityPostInput input,
  }) async {
    final post = await _communityService.createPost(community.id, input);
    final entry = FeedEntry(kind: FeedEntryKind.post, post: post);
    state = state.copyWith(
      entries: [entry, ...state.entries],
      snapshot: state.snapshot?.copyWith(items: [entry, ...state.entries]),
      lastSyncedAt: DateTime.now(),
    );
    if (state.context == FeedContext.community && state.community?.id != community.id) {
      await selectContext(FeedContext.community, community: community);
    }
    _persistCache();
    return post;
  }

  Future<CommunityPost> updatePost({
    required CommunitySummary community,
    required CommunityPost post,
    required CreateCommunityPostInput input,
  }) async {
    final updated = await _communityService.updatePost(community.id, post.id, input);
    _replacePost(postId: post.id, replacement: updated);
    return updated;
  }

  Future<void> removePost({
    required CommunitySummary community,
    required CommunityPost post,
    String? reason,
  }) async {
    await _communityService.removePost(community.id, post.id, reason: reason);
    _removePost(postId: post.id);
  }

  Future<void> moderatePost({
    required CommunitySummary community,
    required CommunityPost post,
    required String action,
    String? reason,
  }) async {
    final updated = await _communityService.moderatePost(
      community.id,
      post.id,
      action: action,
      reason: reason,
    );
    _replacePost(postId: post.id, replacement: updated);
  }

  void _replacePost({required String postId, required CommunityPost replacement}) {
    final updatedEntries = state.entries.map((entry) {
      if (entry.kind == FeedEntryKind.post && entry.post?.id == postId) {
        return entry.copyWith(post: replacement);
      }
      return entry;
    }).toList();
    state = state.copyWith(
      entries: updatedEntries,
      snapshot: state.snapshot?.copyWith(items: updatedEntries),
      lastSyncedAt: DateTime.now(),
    );
    _persistCache();
  }

  void _removePost({required String postId}) {
    final filtered = state.entries.where((entry) => entry.post?.id != postId).toList();
    state = state.copyWith(
      entries: filtered,
      snapshot: state.snapshot?.copyWith(items: filtered),
      lastSyncedAt: DateTime.now(),
    );
    _persistCache();
  }

  Future<List<FeedPlacement>> _resolvePlacements(FeedSnapshot snapshot) async {
    try {
      final context = state.context == FeedContext.global
          ? FeedPlacementContext.globalFeed
          : FeedPlacementContext.communityFeed;
      final keywords = state.filters.search
          ?.split(RegExp(r'[\s,]+'))
          .map((value) => value.trim())
          .where((value) => value.isNotEmpty)
          .toList();
      final placements = await _feedService.fetchPlacements(
        context: context,
        keywords: keywords,
      );
      if (placements.isNotEmpty) {
        return placements;
      }
      if (snapshot.adsSummary != null) {
        return snapshot.adsSummary!.placements
            .map((summary) => FeedPlacement(
                  placementId: summary.placementId,
                  campaignId: summary.campaignId,
                  slot: summary.slot,
                  headline: 'Placement ${summary.placementId}',
                ))
            .toList();
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to resolve placements: $error\n$stackTrace');
    }
    return snapshot.adsSummary?.placements
            .map((summary) => FeedPlacement(
                  placementId: summary.placementId,
                  campaignId: summary.campaignId,
                  slot: summary.slot,
                  headline: 'Placement ${summary.placementId}',
                ))
            .toList() ??
        const <FeedPlacement>[];
  }

  String _mapError(Object error) {
    if (error is DioException) {
      final response = error.response?.data;
      if (response is Map && response['message'] is String) {
        return response['message'] as String;
      }
      return error.message ?? 'Network error';
    }
    return error.toString();
  }

  Future<void> _hydrateFromCache(
    FeedContext context,
    CommunitySummary? community,
    LiveFeedFilters filters,
  ) async {
    final cacheKey = _cacheKey(context, community, filters);
    try {
      final cached = await _engagementStorage.readFeedSnapshot(cacheKey);
      if (cached == null) {
        return;
      }
      final snapshotJson = cached['snapshot'];
      if (snapshotJson is! Map) {
        return;
      }
      final snapshot = FeedSnapshot.fromJson(Map<String, dynamic>.from(snapshotJson as Map));
      final dedupedItems = _dedupeEntries(snapshot.items);
      final normalizedSnapshot = snapshot.copyWith(items: dedupedItems);
      final placements = _parseCachedPlacements(cached['placements']);
      final cachedSyncedAt = cached['lastSyncedAt'] is String
          ? DateTime.tryParse(cached['lastSyncedAt'] as String)
          : null;
      state = state.copyWith(
        snapshot: normalizedSnapshot,
        entries: dedupedItems,
        page: normalizedSnapshot.pagination.page,
        perPage: normalizedSnapshot.pagination.perPage,
        canLoadMore: normalizedSnapshot.pagination.hasMore,
        highlights: normalizedSnapshot.highlights,
        analytics: normalizedSnapshot.analytics ?? state.analytics,
        placements: placements.isNotEmpty ? placements : state.placements,
        lastSyncedAt: cachedSyncedAt ?? state.lastSyncedAt,
        clearError: true,
      );
    } catch (error, stackTrace) {
      debugPrint('Failed to hydrate feed cache: $error\n$stackTrace');
    }
  }

  Future<void> _cacheSnapshot(
    FeedSnapshot snapshot,
    List<FeedPlacement> placements,
    FeedContext context,
    CommunitySummary? community,
    LiveFeedFilters filters,
  ) async {
    final payload = <String, dynamic>{
      'snapshot': snapshot.toJson(),
      'lastSyncedAt': DateTime.now().toIso8601String(),
      'filters': filters.toJson(),
      if (placements.isNotEmpty) 'placements': placements.map((placement) => placement.toJson()).toList(),
    };
    final cacheKey = _cacheKey(context, community, filters);
    try {
      await _engagementStorage.writeFeedSnapshot(cacheKey, payload);
    } catch (error, stackTrace) {
      debugPrint('Failed to cache feed snapshot: $error\n$stackTrace');
    }
  }

  List<FeedPlacement> _parseCachedPlacements(dynamic raw) {
    if (raw is! List) {
      return const <FeedPlacement>[];
    }
    final placements = <FeedPlacement>[];
    for (final entry in raw) {
      if (entry is Map<String, dynamic>) {
        placements.add(FeedPlacement.fromJson(entry));
      } else if (entry is Map) {
        placements.add(FeedPlacement.fromJson(Map<String, dynamic>.from(entry as Map)));
      }
    }
    return placements;
  }

  List<FeedEntry> _dedupeEntries(List<FeedEntry> entries) {
    final result = <FeedEntry>[];
    final postIndex = <String, int>{};
    final adIndex = <String, int>{};

    for (final entry in entries) {
      if (entry.kind == FeedEntryKind.post) {
        final normalized = _normalizePostEntry(entry);
        final postId = normalized.post?.id;
        if (postId == null || postId.isEmpty) {
          result.add(normalized);
          continue;
        }
        final existingIndex = postIndex[postId];
        if (existingIndex != null) {
          result[existingIndex] = normalized;
        } else {
          postIndex[postId] = result.length;
          result.add(normalized);
        }
      } else if (entry.kind == FeedEntryKind.ad) {
        final key = _adCacheKey(entry.ad);
        if (key == null) {
          result.add(entry);
          continue;
        }
        final existingIndex = adIndex[key];
        if (existingIndex != null) {
          result[existingIndex] = entry;
        } else {
          adIndex[key] = result.length;
          result.add(entry);
        }
      } else {
        result.add(entry);
      }
    }
    return result;
  }

  FeedEntry _normalizePostEntry(FeedEntry entry) {
    final postId = entry.post?.id;
    if (postId == null || postId.isEmpty) {
      return entry;
    }
    final existing = _findExistingPostEntry(postId);
    if (existing == null) {
      return entry;
    }
    if (identical(existing.post, entry.post)) {
      return existing;
    }
    return existing.copyWith(post: entry.post);
  }

  FeedEntry? _findExistingPostEntry(String postId) {
    for (final entry in state.entries) {
      if (entry.kind == FeedEntryKind.post && entry.post?.id == postId) {
        return entry;
      }
    }
    return null;
  }

  String? _adCacheKey(FeedAd? ad) {
    if (ad == null) {
      return null;
    }
    return '${ad.placementId}:${ad.campaignId}:${ad.slot}';
  }

  String _cacheKey(FeedContext context, CommunitySummary? community, LiveFeedFilters filters) {
    final contextKey = describeEnum(context);
    final communityKey = context == FeedContext.community ? (community?.id ?? 'none') : 'global';
    final searchKey = (filters.search ?? '').trim().toLowerCase();
    final postTypeKey = (filters.postType ?? '').trim().toLowerCase();
    final rangeKey = filters.range.trim().toLowerCase();
    return '$contextKey::$communityKey::$rangeKey::$searchKey::$postTypeKey';
  }

  void _persistCache() {
    final snapshot = state.snapshot;
    if (snapshot == null) {
      return;
    }
    unawaited(_cacheSnapshot(snapshot, state.placements, state.context, state.community, state.filters));
  }
}
