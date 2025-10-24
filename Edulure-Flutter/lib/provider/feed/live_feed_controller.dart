import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/dio_provider.dart';
import '../../core/telemetry/telemetry_service.dart';
import '../../services/community_service.dart';
import '../../services/feed_cache_repository.dart';
import '../../services/live_feed_service.dart';

final feedCacheRepositoryProvider = Provider<FeedCacheRepository>((ref) {
  return FeedCacheRepository();
});

final liveFeedServiceProvider = Provider<LiveFeedService>((ref) {
  final dio = ref.watch(dioProvider);
  final telemetry = ref.watch(telemetryServiceProvider);
  final cache = ref.watch(feedCacheRepositoryProvider);
  return LiveFeedService(
    httpClient: dio,
    telemetry: telemetry,
    cache: cache,
  );
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
}

class LiveFeedController extends StateNotifier<LiveFeedState> {
  LiveFeedController({required LiveFeedService feedService, required CommunityService communityService})
      : _feedService = feedService,
        _communityService = communityService,
        super(const LiveFeedState(context: FeedContext.global));

  final LiveFeedService _feedService;
  final CommunityService _communityService;

  Future<void> bootstrap({FeedContext? context, CommunitySummary? community}) async {
    await refresh(
      context: context ?? state.context,
      community: community ?? state.community,
    );
  }

  Future<void> refresh({FeedContext? context, CommunitySummary? community, LiveFeedFilters? filters}) async {
    final nextContext = context ?? state.context;
    final resolvedCommunity = nextContext == FeedContext.community ? community ?? state.community : null;
    state = state.copyWith(
      context: nextContext,
      community: resolvedCommunity,
      filters: filters ?? state.filters,
      loading: true,
      page: 1,
      clearError: true,
    );

    try {
      final snapshot = await _feedService.fetchFeed(
        context: nextContext,
        community: resolvedCommunity?.id,
        page: 1,
        perPage: state.perPage,
        range: state.filters.range,
        search: state.filters.search,
        postType: state.filters.postType,
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
        preferCache: false,
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
  }

  void _removePost({required String postId}) {
    final filtered = state.entries.where((entry) => entry.post?.id != postId).toList();
    state = state.copyWith(
      entries: filtered,
      snapshot: state.snapshot?.copyWith(items: filtered),
      lastSyncedAt: DateTime.now(),
    );
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
}
