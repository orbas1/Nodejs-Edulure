import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/community_service.dart';
import '../../services/live_feed_service.dart';
import '../../services/session_manager.dart';

final liveFeedServiceProvider = Provider<LiveFeedService>((ref) {
  return LiveFeedService();
});

final communityServiceProvider = Provider<CommunityService>((ref) {
  return CommunityService();
});

final liveFeedControllerProvider = StateNotifierProvider<LiveFeedController, LiveFeedState>((ref) {
  return LiveFeedController(
    feedService: ref.watch(liveFeedServiceProvider),
    communityService: ref.watch(communityServiceProvider),
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
    return <String, dynamic>{
      if (search != null && search!.isNotEmpty) 'search': search,
      if (postType != null && postType!.isNotEmpty) 'postType': postType,
      'range': range,
    };
  }

  factory LiveFeedFilters.fromJson(Map<String, dynamic> json) {
    return LiveFeedFilters(
      search: json['search']?.toString(),
      postType: json['postType']?.toString(),
      range: json['range']?.toString() ?? '30d',
    );
  }
}

class LiveFeedController extends StateNotifier<LiveFeedState> {
  LiveFeedController({required LiveFeedService feedService, required CommunityService communityService})
      : _feedService = feedService,
        _communityService = communityService,
        super(const LiveFeedState(context: FeedContext.global));

  final LiveFeedService _feedService;
  final CommunityService _communityService;

  Future<void> bootstrap({FeedContext? context, CommunitySummary? community}) async {
    final targetContext = context ?? state.context;
    final targetCommunity = targetContext == FeedContext.community ? community ?? state.community : null;
    final cached = _readCachedPayload(
      targetContext,
      targetCommunity,
      filters: state.filters,
    );
    if (cached != null) {
      state = state.copyWith(
        context: targetContext,
        community: targetCommunity,
        snapshot: cached.snapshot,
        entries: cached.snapshot.items,
        highlights: cached.snapshot.highlights,
        analytics: cached.analytics ?? cached.snapshot.analytics ?? state.analytics,
        placements: cached.placements,
        filters: cached.filters,
        page: cached.snapshot.pagination.page,
        perPage: cached.snapshot.pagination.perPage,
        canLoadMore: cached.snapshot.pagination.hasMore,
        lastSyncedAt: cached.cachedAt,
        clearError: true,
      );
    }
    await refresh(
      context: targetContext,
      community: targetCommunity,
      filters: cached?.filters ?? state.filters,
    );
  }

  Future<void> refresh({FeedContext? context, CommunitySummary? community, LiveFeedFilters? filters}) async {
    final nextContext = context ?? state.context;
    final resolvedCommunity = nextContext == FeedContext.community ? community ?? state.community : null;
    final resolvedFilters = filters ?? state.filters;
    final cached = _readCachedPayload(
      nextContext,
      resolvedCommunity,
      filters: resolvedFilters,
    );
    state = state.copyWith(
      context: nextContext,
      community: resolvedCommunity,
      filters: resolvedFilters,
      loading: true,
      page: cached?.snapshot.pagination.page ?? 1,
      perPage: cached?.snapshot.pagination.perPage ?? state.perPage,
      entries: cached?.snapshot.items ?? (nextContext == state.context ? state.entries : const <FeedEntry>[]),
      highlights: cached?.snapshot.highlights ?? state.highlights,
      analytics: cached?.analytics ?? cached?.snapshot.analytics ?? state.analytics,
      placements: cached?.placements ?? state.placements,
      canLoadMore: cached?.snapshot.pagination.hasMore ?? state.canLoadMore,
      lastSyncedAt: cached?.cachedAt ?? state.lastSyncedAt,
      clearError: true,
    );

    try {
      final snapshot = await _feedService.fetchFeed(
        context: nextContext,
        community: resolvedCommunity?.id,
        page: 1,
        perPage: state.perPage,
        range: resolvedFilters.range,
        search: resolvedFilters.search,
        postType: resolvedFilters.postType,
      );
      final placements = await _resolvePlacements(snapshot);
      state = state.copyWith(
        loading: false,
        snapshot: snapshot,
        entries: snapshot.items,
        page: snapshot.pagination.page,
        perPage: snapshot.pagination.perPage,
        canLoadMore: snapshot.pagination.hasMore,
        highlights: snapshot.highlights,
        analytics: snapshot.analytics,
        placements: placements,
        lastSyncedAt: DateTime.now(),
        clearError: true,
      );
      unawaited(_persistCache(snapshot: snapshot, placements: placements));
      if (snapshot.analytics == null) {
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
      unawaited(_persistCache());
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
      final combined = <FeedEntry>[...state.entries, ...snapshot.items];
      state = state.copyWith(
        entries: combined,
        page: snapshot.pagination.page,
        canLoadMore: snapshot.pagination.hasMore,
        loadingMore: false,
        snapshot: state.snapshot?.copyWith(
          pagination: snapshot.pagination,
          items: combined,
          highlights: state.highlights,
          analytics: state.analytics,
        ),
      );
      unawaited(_persistCache());
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
    unawaited(_persistCache());
    if (state.context == FeedContext.community && state.community?.id != community.id) {
      await selectContext(FeedContext.community, community: community);
    }
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
    unawaited(_persistCache());
  }

  void _removePost({required String postId}) {
    final filtered = state.entries.where((entry) => entry.post?.id != postId).toList();
    state = state.copyWith(
      entries: filtered,
      snapshot: state.snapshot?.copyWith(items: filtered),
      lastSyncedAt: DateTime.now(),
    );
    unawaited(_persistCache());
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

  Future<void> _persistCache({FeedSnapshot? snapshot, List<FeedPlacement>? placements}) async {
    final activeSnapshot = snapshot ?? state.snapshot;
    if (activeSnapshot == null) {
      return;
    }
    final normalized = activeSnapshot.copyWith(
      items: state.entries,
      analytics: state.analytics ?? activeSnapshot.analytics,
      highlights: state.highlights,
    );
    final payload = <String, dynamic>{
      'snapshot': normalized.toJson(),
      'placements': (placements ?? state.placements).map((placement) => placement.toJson()).toList(),
      'filters': state.filters.toJson(),
      'cachedAt': DateTime.now().toIso8601String(),
    };
    if (state.analytics != null) {
      payload['analytics'] = state.analytics!.toJson();
    }
    await SessionManager.cacheFeedSnapshot(
      _cacheKey(state.context, state.community, state.filters),
      payload,
    );
  }

  _CachedFeedPayload? _readCachedPayload(
    FeedContext context,
    CommunitySummary? community, {
    LiveFeedFilters? filters,
  }) {
    final activeFilters = filters ?? state.filters;
    final primaryKey = _cacheKey(context, community, activeFilters);
    Map<String, dynamic>? cached = SessionManager.loadCachedFeedSnapshot(primaryKey);
    if (cached == null && filters != null && filters != state.filters) {
      final fallbackKey = _cacheKey(context, community, state.filters);
      cached = SessionManager.loadCachedFeedSnapshot(fallbackKey);
    }
    if (cached == null) {
      return null;
    }
    final snapshotJson = cached['snapshot'];
    if (snapshotJson is! Map) {
      return null;
    }
    final snapshot = FeedSnapshot.fromJson(Map<String, dynamic>.from(snapshotJson as Map));
    final placements = <FeedPlacement>[];
    final rawPlacements = cached['placements'];
    if (rawPlacements is List) {
      for (final entry in rawPlacements) {
        if (entry is Map) {
          placements.add(FeedPlacement.fromJson(Map<String, dynamic>.from(entry as Map)));
        }
      }
    }
    LiveFeedFilters filters = state.filters;
    final filtersJson = cached['filters'];
    if (filtersJson is Map) {
      filters = LiveFeedFilters.fromJson(Map<String, dynamic>.from(filtersJson as Map));
    }
    FeedAnalytics? analytics;
    final analyticsJson = cached['analytics'];
    if (analyticsJson is Map) {
      analytics = FeedAnalytics.fromJson(Map<String, dynamic>.from(analyticsJson as Map));
    } else if (snapshot.analytics != null) {
      analytics = snapshot.analytics;
    }
    final cachedAt = DateTime.tryParse(cached['cachedAt']?.toString() ?? '');
    return _CachedFeedPayload(
      snapshot: snapshot,
      placements: placements,
      filters: filters,
      analytics: analytics,
      cachedAt: cachedAt,
    );
  }

  String _cacheKey(
    FeedContext context,
    CommunitySummary? community,
    LiveFeedFilters filters,
  ) {
    final normalizedFilters = <String, dynamic>{
      'range': filters.range,
      if (filters.search != null && filters.search!.trim().isNotEmpty)
        'search': filters.search!.trim().toLowerCase(),
      if (filters.postType != null && filters.postType!.trim().isNotEmpty)
        'postType': filters.postType!.trim().toLowerCase(),
    };
    final encodedFilters = base64Url.encode(utf8.encode(jsonEncode(normalizedFilters)));
    if (context == FeedContext.community) {
      final communityKey = community?.id?.toString().trim();
      return 'feed:community:${communityKey?.isNotEmpty == true ? communityKey : 'all'}:$encodedFilters';
    }
    return 'feed:global:$encodedFilters';
  }
}

class _CachedFeedPayload {
  _CachedFeedPayload({
    required this.snapshot,
    required this.placements,
    required this.filters,
    this.analytics,
    this.cachedAt,
  });

  final FeedSnapshot snapshot;
  final List<FeedPlacement> placements;
  final LiveFeedFilters filters;
  final FeedAnalytics? analytics;
  final DateTime? cachedAt;
}
