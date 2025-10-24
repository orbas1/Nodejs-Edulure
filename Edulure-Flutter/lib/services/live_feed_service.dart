import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import '../core/telemetry/telemetry_service.dart';
import 'api_config.dart';
import 'feed_cache_repository.dart';

class LiveFeedService {
  LiveFeedService({
    Dio? httpClient,
    FeedCacheRepository? cache,
    TelemetryService? telemetry,
    Duration cacheTtl = const Duration(minutes: 5),
  })  : _dio = httpClient ?? ApiConfig.createHttpClient(requiresAuth: true),
        _cache = cache,
        _telemetry = telemetry,
        _cacheTtl = cacheTtl;

  final Dio _dio;
  final FeedCacheRepository? _cache;
  final TelemetryService? _telemetry;
  final Duration _cacheTtl;

  Options _requestOptions() {
    return Options(
      headers: Map<String, String>.from(ApiConfig.defaultHeaders),
      extra: const {'requiresAuth': true},
    );
  }

  Future<FeedSnapshot> fetchFeed({
    FeedContext context = FeedContext.global,
    String? community,
    int page = 1,
    int perPage = 20,
    bool includeAnalytics = true,
    bool includeHighlights = true,
    String range = '30d',
    String? search,
    String? postType,
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    await _cache?.pruneExpired();
    final cacheKey = _cacheKey(
      context: context,
      community: community,
      page: page,
      perPage: perPage,
      includeAnalytics: includeAnalytics,
      includeHighlights: includeHighlights,
      range: range,
      search: search,
      postType: postType,
    );

    FeedCacheEntry? cached;
    final canUseCache = _cache != null && page == 1 && preferCache && !forceRefresh;
    if (canUseCache) {
      cached = await _cache!.read(cacheKey);
      if (cached != null) {
        _recordFeedEvent(
          action: 'fetch',
          success: true,
          metadata: {
            'context': describeEnum(context),
            if (community != null) 'community': community,
            'fromCache': true,
          },
        );
        return _dedupeSnapshot(FeedSnapshot.fromJson(cached.payload));
      }
    }

    final stopwatch = Stopwatch()..start();
    try {
      final response = await _dio.get(
        '/feed',
        queryParameters: <String, dynamic>{
          'context': describeEnum(context),
          if (community != null) 'community': community,
          'page': page,
          'perPage': perPage,
          'includeAnalytics': includeAnalytics,
          'includeHighlights': includeHighlights,
          'range': range,
          if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
          if (postType != null && postType.trim().isNotEmpty) 'postType': postType.trim(),
        },
        options: _requestOptions(),
      );

      final rawPayload = _extractFeedPayload(response.data);
      if (rawPayload.isEmpty) {
        throw Exception('Unexpected feed response payload');
      }
      final snapshot = _dedupeSnapshot(FeedSnapshot.fromJson(rawPayload));
      stopwatch.stop();
      await _cache?.write(
        cacheKey,
        rawPayload,
        fetchedAt: snapshot.generatedAt,
        metadata: {
          'context': describeEnum(context),
          if (community != null) 'community': community,
          'itemCount': snapshot.items.length,
          'highlightCount': snapshot.highlights.length,
          'range': snapshot.range?.key ?? range,
        },
      );
      _recordFeedEvent(
        action: 'fetch',
        success: true,
        duration: stopwatch.elapsed,
        metadata: {
          'context': describeEnum(context),
          if (community != null) 'community': community,
          'fromCache': false,
          'itemCount': snapshot.items.length,
          'page': page,
        },
      );
      return snapshot;
    } on DioException catch (error) {
      stopwatch.stop();
      _recordFeedEvent(
        action: 'fetch',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'context': describeEnum(context),
          if (community != null) 'community': community,
          'page': page,
          'statusCode': error.response?.statusCode,
        },
      );
      if (cached != null) {
        return _dedupeSnapshot(FeedSnapshot.fromJson(cached.payload));
      }
      throw error;
    } catch (error) {
      stopwatch.stop();
      _recordFeedEvent(
        action: 'fetch',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'context': describeEnum(context),
          if (community != null) 'community': community,
          'page': page,
          'error': error.toString(),
        },
      );
      if (cached != null) {
        return _dedupeSnapshot(FeedSnapshot.fromJson(cached.payload));
      }
      rethrow;
    }
  }

  Future<FeedAnalytics> fetchAnalytics({
    FeedContext context = FeedContext.global,
    String? community,
    String range = '30d',
    String? search,
    String? postType,
  }) async {
    final stopwatch = Stopwatch()..start();
    try {
      final response = await _dio.get(
        '/feed/analytics',
        queryParameters: <String, dynamic>{
          'context': describeEnum(context),
          if (community != null) 'community': community,
          'range': range,
          if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
          if (postType != null && postType.trim().isNotEmpty) 'postType': postType.trim(),
        },
        options: _requestOptions(),
      );

      final payload = response.data['data'];
      if (payload is Map<String, dynamic>) {
        final analytics = FeedAnalytics.fromJson(payload);
        stopwatch.stop();
        _recordFeedEvent(
          action: 'analytics',
          success: true,
          duration: stopwatch.elapsed,
          metadata: {
            'context': describeEnum(context),
            if (community != null) 'community': community,
            'range': range,
          },
        );
        return analytics;
      }
      if (payload is Map) {
        final analytics = FeedAnalytics.fromJson(Map<String, dynamic>.from(payload as Map));
        stopwatch.stop();
        _recordFeedEvent(
          action: 'analytics',
          success: true,
          duration: stopwatch.elapsed,
          metadata: {
            'context': describeEnum(context),
            if (community != null) 'community': community,
            'range': range,
          },
        );
        return analytics;
      }
      throw Exception('Unexpected analytics payload');
    } on DioException catch (error) {
      stopwatch.stop();
      _recordFeedEvent(
        action: 'analytics',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'context': describeEnum(context),
          if (community != null) 'community': community,
          'range': range,
          'statusCode': error.response?.statusCode,
        },
      );
      throw error;
    } catch (error) {
      stopwatch.stop();
      _recordFeedEvent(
        action: 'analytics',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'context': describeEnum(context),
          if (community != null) 'community': community,
          'range': range,
          'error': error.toString(),
        },
      );
      rethrow;
    }
  }

  Future<List<FeedPlacement>> fetchPlacements({
    FeedPlacementContext context = FeedPlacementContext.globalFeed,
    int limit = 3,
    List<String>? keywords,
  }) async {
    final stopwatch = Stopwatch()..start();
    try {
      final response = await _dio.get(
        '/feed/placements',
        queryParameters: <String, dynamic>{
          'context': describeEnum(context),
          'limit': limit,
          if (keywords != null && keywords.isNotEmpty) 'keywords': keywords.join(','),
        },
        options: _requestOptions(),
      );

      final data = response.data['data'];
      if (data is List) {
        final placements = data
            .whereType<Map>()
            .map((entry) => FeedPlacement.fromJson(Map<String, dynamic>.from(entry as Map)))
            .toList();
        stopwatch.stop();
        _recordFeedEvent(
          action: 'placements',
          success: true,
          duration: stopwatch.elapsed,
          metadata: {
            'context': describeEnum(context),
            'limit': limit,
            'resultCount': placements.length,
          },
        );
        return placements;
      }
      stopwatch.stop();
      _recordFeedEvent(
        action: 'placements',
        success: true,
        duration: stopwatch.elapsed,
        metadata: {
          'context': describeEnum(context),
          'limit': limit,
          'resultCount': 0,
        },
      );
      return const <FeedPlacement>[];
    } on DioException catch (error) {
      stopwatch.stop();
      _recordFeedEvent(
        action: 'placements',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'context': describeEnum(context),
          'limit': limit,
          'statusCode': error.response?.statusCode,
        },
      );
      throw error;
    } catch (error) {
      stopwatch.stop();
      _recordFeedEvent(
        action: 'placements',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'context': describeEnum(context),
          'limit': limit,
          'error': error.toString(),
        },
      );
      rethrow;
    }
  }

  String _cacheKey({
    required FeedContext context,
    String? community,
    required int page,
    required int perPage,
    required bool includeAnalytics,
    required bool includeHighlights,
    required String range,
    String? search,
    String? postType,
  }) {
    final buffer = StringBuffer(describeEnum(context));
    if (community != null && community.isNotEmpty) {
      buffer.write('#$community');
    }
    buffer
      ..write('?page=$page')
      ..write('&perPage=$perPage')
      ..write('&analytics=$includeAnalytics')
      ..write('&highlights=$includeHighlights')
      ..write('&range=${range.trim()}');
    if (search != null && search.trim().isNotEmpty) {
      buffer.write('&search=${search.trim().toLowerCase()}');
    }
    if (postType != null && postType.trim().isNotEmpty) {
      buffer.write('&postType=${postType.trim()}');
    }
    return buffer.toString();
  }

  Map<String, dynamic> _extractFeedPayload(dynamic response) {
    if (response is Map<String, dynamic>) {
      final data = response['data'];
      if (data is Map<String, dynamic>) {
        return Map<String, dynamic>.from(data);
      }
      if (data is Map) {
        return Map<String, dynamic>.from(data as Map);
      }
    }
    if (response is Map) {
      final map = Map<String, dynamic>.from(response as Map);
      final data = map['data'];
      if (data is Map<String, dynamic>) {
        return Map<String, dynamic>.from(data);
      }
      if (data is Map) {
        return Map<String, dynamic>.from(data as Map);
      }
      return map;
    }
    return <String, dynamic>{};
  }

  FeedSnapshot _dedupeSnapshot(FeedSnapshot snapshot) {
    final seenPosts = <String>{};
    final seenAds = <String>{};
    final dedupedItems = <FeedEntry>[];
    for (final entry in snapshot.items) {
      switch (entry.kind) {
        case FeedEntryKind.post:
          final id = entry.post?.id;
          if (id == null || id.isEmpty || seenPosts.add(id)) {
            dedupedItems.add(entry);
          }
          break;
        case FeedEntryKind.ad:
          final ad = entry.ad;
          final key = ad == null
              ? null
              : '${ad.placementId}:${ad.slot}:${ad.campaignId}';
          if (key == null || seenAds.add(key)) {
            dedupedItems.add(entry);
          }
          break;
      }
    }
    final dedupedHighlights = <FeedHighlight>[];
    final seenHighlightIds = <String>{};
    for (final highlight in snapshot.highlights) {
      final key = '${highlight.type}:${highlight.id}';
      if (seenHighlightIds.add(key)) {
        dedupedHighlights.add(highlight);
      }
    }
    dedupedHighlights.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return snapshot.copyWith(
      items: dedupedItems,
      highlights: dedupedHighlights,
    );
  }

  void _recordFeedEvent({
    required String action,
    required bool success,
    Duration? duration,
    Map<String, Object?> metadata = const <String, Object?>{},
  }) {
    final data = <String, Object?>{
      'action': action,
      'success': success,
      if (duration != null) 'durationMs': duration.inMilliseconds,
      ...metadata,
    };
    _telemetry?.recordBreadcrumb(
      category: 'feed',
      message: 'feed.$action.${success ? 'success' : 'failure'}',
      data: data,
      level: success ? SentryLevel.info : SentryLevel.error,
    );
  }
}

enum FeedContext { global, community }

enum FeedPlacementContext { globalFeed, communityFeed, search, courseLive }

enum FeedEntryKind { post, ad }

typedef JsonMap = Map<String, dynamic>;

class FeedSnapshot {
  FeedSnapshot({
    required this.context,
    required this.items,
    required this.pagination,
    required this.generatedAt,
    this.community,
    this.analytics,
    this.highlights = const <FeedHighlight>[],
    this.adsSummary,
    this.range,
  });

  final FeedContext context;
  final CommunityReference? community;
  final FeedPagination pagination;
  final List<FeedEntry> items;
  final DateTime generatedAt;
  final FeedAnalytics? analytics;
  final List<FeedHighlight> highlights;
  final FeedAdsSummary? adsSummary;
  final FeedRangeWindow? range;

  factory FeedSnapshot.fromJson(JsonMap json) {
    final items = <FeedEntry>[];
    final rawItems = json['items'];
    if (rawItems is List) {
      for (final raw in rawItems) {
        if (raw is Map) {
          items.add(FeedEntry.fromJson(Map<String, dynamic>.from(raw as Map)));
        }
      }
    }

    return FeedSnapshot(
      context: _parseFeedContext(json['context']) ?? FeedContext.global,
      community: json['community'] is Map<String, dynamic>
          ? CommunityReference.fromJson(json['community'] as Map<String, dynamic>)
          : json['community'] is Map
              ? CommunityReference.fromJson(Map<String, dynamic>.from(json['community'] as Map))
              : null,
      pagination: FeedPagination.fromJson(_extractPagination(json)),
      generatedAt: DateTime.tryParse(json['generatedAt']?.toString() ?? '') ?? DateTime.now(),
      items: items,
      analytics: json['analytics'] is Map<String, dynamic>
          ? FeedAnalytics.fromJson(json['analytics'] as Map<String, dynamic>)
          : json['analytics'] is Map
              ? FeedAnalytics.fromJson(Map<String, dynamic>.from(json['analytics'] as Map))
              : null,
      highlights: _parseHighlights(json['highlights']),
      adsSummary: json['ads'] is Map<String, dynamic>
          ? FeedAdsSummary.fromJson(json['ads'] as Map<String, dynamic>)
          : json['ads'] is Map
              ? FeedAdsSummary.fromJson(Map<String, dynamic>.from(json['ads'] as Map))
              : null,
      range: json['range'] is Map<String, dynamic>
          ? FeedRangeWindow.fromJson(json['range'] as Map<String, dynamic>)
          : json['range'] is Map
              ? FeedRangeWindow.fromJson(Map<String, dynamic>.from(json['range'] as Map))
              : null,
    );
  }

  FeedSnapshot copyWith({
    FeedPagination? pagination,
    List<FeedEntry>? items,
    FeedAnalytics? analytics,
    List<FeedHighlight>? highlights,
  }) {
    return FeedSnapshot(
      context: context,
      community: community,
      pagination: pagination ?? this.pagination,
      generatedAt: generatedAt,
      items: items ?? this.items,
      analytics: analytics ?? this.analytics,
      highlights: highlights ?? this.highlights,
      adsSummary: adsSummary,
      range: range,
    );
  }

  static JsonMap _extractPagination(JsonMap json) {
    if (json['pagination'] is Map<String, dynamic>) {
      return json['pagination'] as Map<String, dynamic>;
    }
    if (json['meta'] is Map && (json['meta'] as Map)['pagination'] is Map) {
      return Map<String, dynamic>.from((json['meta'] as Map)['pagination'] as Map);
    }
    return json['pagination'] is Map
        ? Map<String, dynamic>.from(json['pagination'] as Map)
        : json['meta'] is Map && (json['meta'] as Map)['pagination'] is Map
            ? Map<String, dynamic>.from((json['meta'] as Map)['pagination'] as Map)
            : <String, dynamic>{};
  }

  static List<FeedHighlight> _parseHighlights(dynamic raw) {
    if (raw is! List) return const <FeedHighlight>[];
    return raw
        .whereType<Map>()
        .map((entry) => FeedHighlight.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList();
  }
}

FeedContext? _parseFeedContext(dynamic value) {
  final raw = value?.toString();
  switch (raw) {
    case 'global':
      return FeedContext.global;
    case 'community':
      return FeedContext.community;
  }
  return null;
}

class FeedRangeWindow {
  const FeedRangeWindow({required this.start, required this.end, required this.key});

  final DateTime start;
  final DateTime end;
  final String key;

  factory FeedRangeWindow.fromJson(JsonMap json) {
    return FeedRangeWindow(
      start: DateTime.tryParse(json['start']?.toString() ?? '') ?? DateTime.now(),
      end: DateTime.tryParse(json['end']?.toString() ?? '') ?? DateTime.now(),
      key: json['key']?.toString() ?? '30d',
    );
  }
}

class FeedPagination {
  FeedPagination({
    required this.page,
    required this.perPage,
    required this.total,
    required this.totalPages,
  });

  final int page;
  final int perPage;
  final int total;
  final int totalPages;

  bool get hasMore => page < totalPages;

  factory FeedPagination.fromJson(JsonMap json) {
    return FeedPagination(
      page: _parseInt(json['page']) ?? 1,
      perPage: _parseInt(json['perPage']) ?? _parseInt(json['pageSize']) ?? 20,
      total: _parseInt(json['total']) ?? 0,
      totalPages: _parseInt(json['totalPages']) ?? 1,
    );
  }
}

class FeedEntry {
  FeedEntry({required this.kind, this.post, this.ad});

  final FeedEntryKind kind;
  final CommunityPost? post;
  final FeedAd? ad;

  factory FeedEntry.fromJson(JsonMap json) {
    final kind = _parseEntryKind(json['kind']);
    return FeedEntry(
      kind: kind,
      post: kind == FeedEntryKind.post
          ? CommunityPost.fromJson(_extractNested(json, 'post'))
          : null,
      ad: kind == FeedEntryKind.ad ? FeedAd.fromJson(_extractNested(json, 'ad')) : null,
    );
  }

  FeedEntry copyWith({CommunityPost? post}) {
    return FeedEntry(
      kind: kind,
      post: post ?? this.post,
      ad: ad,
    );
  }
}

FeedEntryKind _parseEntryKind(dynamic value) {
  switch (value?.toString()) {
    case 'post':
      return FeedEntryKind.post;
    case 'ad':
      return FeedEntryKind.ad;
    default:
      return FeedEntryKind.post;
  }
}

JsonMap _extractNested(JsonMap json, String key) {
  final value = json[key];
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return Map<String, dynamic>.from(value as Map);
  }
  return <String, dynamic>{};
}

int? _parseInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}

double? _parseDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '');
}

class CommunityReference {
  const CommunityReference({required this.id, required this.name, required this.slug});

  final String id;
  final String name;
  final String slug;

  factory CommunityReference.fromJson(JsonMap json) {
    return CommunityReference(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Community',
      slug: json['slug']?.toString() ?? '',
    );
  }
}

class FeedAd {
  FeedAd({
    required this.placementId,
    required this.campaignId,
    required this.slot,
    required this.headline,
    this.description,
    this.ctaUrl,
    this.tracking = const <String, dynamic>{},
    this.position,
  });

  final String placementId;
  final String campaignId;
  final String slot;
  final String headline;
  final String? description;
  final String? ctaUrl;
  final JsonMap tracking;
  final int? position;

  factory FeedAd.fromJson(JsonMap json) {
    return FeedAd(
      placementId: json['placementId']?.toString() ?? '',
      campaignId: json['campaignId']?.toString() ?? '',
      slot: json['slot']?.toString() ?? 'feed-inline',
      headline: json['headline']?.toString() ?? 'Sponsored highlight',
      description: json['description']?.toString(),
      ctaUrl: json['ctaUrl']?.toString(),
      tracking: json['tracking'] is Map<String, dynamic>
          ? json['tracking'] as Map<String, dynamic>
          : json['tracking'] is Map
              ? Map<String, dynamic>.from(json['tracking'] as Map)
              : const <String, dynamic>{},
      position: _parseInt(json['position']),
    );
  }
}

class FeedPlacement {
  FeedPlacement({
    required this.placementId,
    required this.campaignId,
    required this.slot,
    required this.headline,
    this.description,
    this.ctaUrl,
  });

  final String placementId;
  final String campaignId;
  final String slot;
  final String headline;
  final String? description;
  final String? ctaUrl;

  factory FeedPlacement.fromJson(JsonMap json) {
    return FeedPlacement(
      placementId: json['placementId']?.toString() ?? '',
      campaignId: json['campaignId']?.toString() ?? '',
      slot: json['slot']?.toString() ?? 'feed-inline',
      headline: json['headline']?.toString() ?? 'Sponsored placement',
      description: json['description']?.toString(),
      ctaUrl: json['ctaUrl']?.toString(),
    );
  }
}

class FeedAdsSummary {
  const FeedAdsSummary({required this.count, this.placements = const <FeedPlacementSummary>[]});

  final int count;
  final List<FeedPlacementSummary> placements;

  factory FeedAdsSummary.fromJson(JsonMap json) {
    final placements = <FeedPlacementSummary>[];
    final rawPlacements = json['placements'];
    if (rawPlacements is List) {
      for (final raw in rawPlacements) {
        if (raw is Map) {
          placements.add(FeedPlacementSummary.fromJson(Map<String, dynamic>.from(raw as Map)));
        }
      }
    }
    return FeedAdsSummary(
      count: _parseInt(json['count']) ?? placements.length,
      placements: placements,
    );
  }
}

class FeedPlacementSummary {
  const FeedPlacementSummary({
    required this.placementId,
    required this.campaignId,
    required this.slot,
    required this.position,
  });

  final String placementId;
  final String campaignId;
  final String slot;
  final int position;

  factory FeedPlacementSummary.fromJson(JsonMap json) {
    return FeedPlacementSummary(
      placementId: json['placementId']?.toString() ?? '',
      campaignId: json['campaignId']?.toString() ?? '',
      slot: json['slot']?.toString() ?? 'feed-inline',
      position: _parseInt(json['position']) ?? 0,
    );
  }
}

class FeedHighlight {
  FeedHighlight({
    required this.type,
    required this.id,
    required this.timestamp,
    this.title,
    this.summary,
    this.metadata = const <String, dynamic>{},
    this.metrics = const <String, dynamic>{},
    this.name,
    this.status,
    this.projectType,
    this.objective,
  });

  final String type;
  final String id;
  final DateTime timestamp;
  final String? title;
  final String? summary;
  final JsonMap metadata;
  final JsonMap metrics;
  final String? name;
  final String? status;
  final String? projectType;
  final String? objective;

  factory FeedHighlight.fromJson(JsonMap json) {
    return FeedHighlight(
      type: json['type']?.toString() ?? 'highlight',
      id: json['id']?.toString() ?? '',
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ?? DateTime.now(),
      title: json['title']?.toString(),
      summary: json['summary']?.toString(),
      metadata: json['metadata'] is Map<String, dynamic>
          ? json['metadata'] as Map<String, dynamic>
          : json['metadata'] is Map
              ? Map<String, dynamic>.from(json['metadata'] as Map)
              : const <String, dynamic>{},
      metrics: json['metrics'] is Map<String, dynamic>
          ? json['metrics'] as Map<String, dynamic>
          : json['metrics'] is Map
              ? Map<String, dynamic>.from(json['metrics'] as Map)
              : const <String, dynamic>{},
      name: json['name']?.toString(),
      status: json['status']?.toString(),
      projectType: json['projectType']?.toString(),
      objective: json['objective']?.toString(),
    );
  }
}

class FeedAnalytics {
  FeedAnalytics({required this.generatedAt, required this.engagement, required this.ads});

  final DateTime generatedAt;
  final FeedEngagement engagement;
  final FeedAdsAnalytics ads;

  factory FeedAnalytics.fromJson(JsonMap json) {
    return FeedAnalytics(
      generatedAt: DateTime.tryParse(json['generatedAt']?.toString() ?? '') ?? DateTime.now(),
      engagement: FeedEngagement.fromJson(_extractNested(json, 'engagement')),
      ads: FeedAdsAnalytics.fromJson(_extractNested(json, 'ads')),
    );
  }
}

class FeedEngagement {
  FeedEngagement({
    required this.postsSampled,
    required this.postsTotal,
    required this.comments,
    required this.reactions,
    required this.uniqueCommunities,
    this.trendingTags = const <FeedTrendingTag>[],
    this.latestActivityAt,
  });

  final int postsSampled;
  final int postsTotal;
  final int comments;
  final int reactions;
  final int uniqueCommunities;
  final List<FeedTrendingTag> trendingTags;
  final DateTime? latestActivityAt;

  factory FeedEngagement.fromJson(JsonMap json) {
    final trendingTags = <FeedTrendingTag>[];
    final rawTrending = json['trendingTags'];
    if (rawTrending is List) {
      for (final entry in rawTrending) {
        if (entry is Map) {
          trendingTags.add(FeedTrendingTag.fromJson(Map<String, dynamic>.from(entry as Map)));
        }
      }
    }
    return FeedEngagement(
      postsSampled: _parseInt(json['postsSampled']) ?? 0,
      postsTotal: _parseInt(json['postsTotal']) ?? 0,
      comments: _parseInt(json['comments']) ?? 0,
      reactions: _parseInt(json['reactions']) ?? 0,
      uniqueCommunities: _parseInt(json['uniqueCommunities']) ?? 0,
      trendingTags: trendingTags,
      latestActivityAt: DateTime.tryParse(json['latestActivityAt']?.toString() ?? ''),
    );
  }
}

class FeedTrendingTag {
  const FeedTrendingTag({required this.tag, required this.count});

  final String tag;
  final int count;

  factory FeedTrendingTag.fromJson(JsonMap json) {
    return FeedTrendingTag(
      tag: json['tag']?.toString() ?? '',
      count: _parseInt(json['count']) ?? 0,
    );
  }
}

class FeedAdsAnalytics {
  FeedAdsAnalytics({
    required this.placementsServed,
    required this.campaignsServed,
    required this.activeCampaigns,
    required this.scheduledCampaigns,
    required this.totals,
  });

  final int placementsServed;
  final int campaignsServed;
  final int activeCampaigns;
  final int scheduledCampaigns;
  final FeedAdsTotals totals;

  factory FeedAdsAnalytics.fromJson(JsonMap json) {
    return FeedAdsAnalytics(
      placementsServed: _parseInt(json['placementsServed']) ?? 0,
      campaignsServed: _parseInt(json['campaignsServed']) ?? 0,
      activeCampaigns: _parseInt(json['activeCampaigns']) ?? 0,
      scheduledCampaigns: _parseInt(json['scheduledCampaigns']) ?? 0,
      totals: FeedAdsTotals.fromJson(_extractNested(json, 'totals')),
    );
  }
}

class FeedAdsTotals {
  FeedAdsTotals({
    required this.impressions,
    required this.clicks,
    required this.conversions,
    required this.spendCents,
    required this.revenueCents,
  });

  final int impressions;
  final int clicks;
  final int conversions;
  final int spendCents;
  final int revenueCents;

  factory FeedAdsTotals.fromJson(JsonMap json) {
    return FeedAdsTotals(
      impressions: _parseInt(json['impressions']) ?? 0,
      clicks: _parseInt(json['clicks']) ?? 0,
      conversions: _parseInt(json['conversions']) ?? 0,
      spendCents: _parseInt(json['spendCents']) ?? 0,
      revenueCents: _parseInt(json['revenueCents']) ?? 0,
    );
  }
}

class CommunityPost {
  CommunityPost({
    required this.id,
    required this.type,
    required this.body,
    required this.publishedAt,
    required this.status,
    required this.visibility,
    required this.author,
    this.title,
    this.tags = const <String>[],
    this.channel,
    this.community,
    this.metadata = const <String, dynamic>{},
    this.stats = const CommunityPostStats(),
    this.moderation = const CommunityPostModeration(),
    this.scheduledAt,
  });

  final String id;
  final String type;
  final String body;
  final DateTime? publishedAt;
  final DateTime? scheduledAt;
  final String status;
  final String visibility;
  final String? title;
  final List<String> tags;
  final CommunityChannelReference? channel;
  final CommunityReference? community;
  final CommunityMemberSummary author;
  final CommunityPostStats stats;
  final CommunityPostModeration moderation;
  final JsonMap metadata;

  bool get isPublished => status == 'published';

  CommunityPost copyWith({
    String? body,
    String? title,
    List<String>? tags,
    String? status,
    JsonMap? metadata,
    CommunityPostModeration? moderation,
  }) {
    return CommunityPost(
      id: id,
      type: type,
      body: body ?? this.body,
      publishedAt: publishedAt,
      scheduledAt: scheduledAt,
      status: status ?? this.status,
      visibility: visibility,
      author: author,
      title: title ?? this.title,
      tags: tags ?? this.tags,
      channel: channel,
      community: community,
      metadata: metadata ?? this.metadata,
      stats: stats,
      moderation: moderation ?? this.moderation,
    );
  }

  factory CommunityPost.fromJson(JsonMap json) {
    final tags = <String>[];
    final rawTags = json['tags'];
    if (rawTags is List) {
      for (final tag in rawTags) {
        final value = tag?.toString();
        if (value != null && value.isNotEmpty) {
          tags.add(value);
        }
      }
    }

    return CommunityPost(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'update',
      body: json['body']?.toString() ?? '',
      publishedAt: DateTime.tryParse(json['publishedAt']?.toString() ?? ''),
      scheduledAt: DateTime.tryParse(json['scheduledAt']?.toString() ?? ''),
      status: json['status']?.toString() ?? 'draft',
      visibility: json['visibility']?.toString() ?? 'members',
      author: CommunityMemberSummary.fromJson(_extractNested(json, 'author')),
      title: json['title']?.toString(),
      tags: tags,
      channel: json['channel'] is Map<String, dynamic>
          ? CommunityChannelReference.fromJson(json['channel'] as Map<String, dynamic>)
          : json['channel'] is Map
              ? CommunityChannelReference.fromJson(Map<String, dynamic>.from(json['channel'] as Map))
              : null,
      community: json['community'] is Map<String, dynamic>
          ? CommunityReference.fromJson(json['community'] as Map<String, dynamic>)
          : json['community'] is Map
              ? CommunityReference.fromJson(Map<String, dynamic>.from(json['community'] as Map))
              : null,
      metadata: json['metadata'] is Map<String, dynamic>
          ? json['metadata'] as Map<String, dynamic>
          : json['metadata'] is Map
              ? Map<String, dynamic>.from(json['metadata'] as Map)
              : const <String, dynamic>{},
      stats: CommunityPostStats.fromJson(_extractNested(json, 'stats')),
      moderation: CommunityPostModeration.fromJson(_extractNested(json, 'moderation')),
    );
  }
}

class CommunityChannelReference {
  const CommunityChannelReference({
    required this.id,
    required this.name,
    required this.slug,
    required this.type,
  });

  final String id;
  final String name;
  final String slug;
  final String type;

  factory CommunityChannelReference.fromJson(JsonMap json) {
    return CommunityChannelReference(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Channel',
      slug: json['slug']?.toString() ?? '',
      type: json['type']?.toString() ?? 'discussion',
    );
  }
}

class CommunityMemberSummary {
  const CommunityMemberSummary({required this.id, required this.name, required this.role, required this.avatarUrl});

  final String id;
  final String name;
  final String role;
  final String avatarUrl;

  factory CommunityMemberSummary.fromJson(JsonMap json) {
    return CommunityMemberSummary(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Community member',
      role: json['role']?.toString() ?? 'member',
      avatarUrl: json['avatarUrl']?.toString() ?? '',
    );
  }
}

class CommunityPostStats {
  const CommunityPostStats({
    this.reactions = 0,
    this.reactionBreakdown = const <String, dynamic>{},
    this.comments = 0,
  });

  final int reactions;
  final JsonMap reactionBreakdown;
  final int comments;

  factory CommunityPostStats.fromJson(JsonMap json) {
    return CommunityPostStats(
      reactions: _parseInt(json['reactions']) ?? 0,
      reactionBreakdown: json['reactionBreakdown'] is Map<String, dynamic>
          ? json['reactionBreakdown'] as Map<String, dynamic>
          : json['reactionBreakdown'] is Map
              ? Map<String, dynamic>.from(json['reactionBreakdown'] as Map)
              : const <String, dynamic>{},
      comments: _parseInt(json['comments']) ?? 0,
    );
  }
}

class CommunityPostModeration {
  const CommunityPostModeration({
    this.state = 'clean',
    this.lastReviewedAt,
    this.flags = const <String>[],
    this.riskHistory = const <String>[],
    this.notes = const <dynamic>[],
  });

  final String state;
  final DateTime? lastReviewedAt;
  final List<String> flags;
  final List<dynamic> riskHistory;
  final List<dynamic> notes;

  factory CommunityPostModeration.fromJson(JsonMap json) {
    final flags = <String>[];
    final rawFlags = json['flags'];
    if (rawFlags is List) {
      for (final entry in rawFlags) {
        final value = entry?.toString();
        if (value != null && value.isNotEmpty) {
          flags.add(value);
        }
      }
    }

    return CommunityPostModeration(
      state: json['state']?.toString() ?? 'clean',
      lastReviewedAt: DateTime.tryParse(json['lastReviewedAt']?.toString() ?? ''),
      flags: flags,
      riskHistory: json['riskHistory'] is List ? List<dynamic>.from(json['riskHistory'] as List) : const <dynamic>[],
      notes: json['notes'] is List ? List<dynamic>.from(json['notes'] as List) : const <dynamic>[],
    );
  }
}

class CommunityFeedPage {
  CommunityFeedPage({required this.items, required this.pagination, this.ads});

  final List<FeedEntry> items;
  final FeedPagination pagination;
  final FeedAdsSummary? ads;

  factory CommunityFeedPage.fromJson(JsonMap json) {
    final items = <FeedEntry>[];
    final rawItems = json['data'] ?? json['items'];
    if (rawItems is List) {
      for (final entry in rawItems) {
        if (entry is Map) {
          items.add(FeedEntry.fromJson({
            'kind': 'post',
            'post': Map<String, dynamic>.from(entry as Map),
          }));
        }
      }
    }

    return CommunityFeedPage(
      items: items,
      pagination: FeedPagination.fromJson(FeedSnapshot._extractPagination(json)),
      ads: json['meta'] is Map && (json['meta'] as Map)['ads'] is Map
          ? FeedAdsSummary.fromJson(Map<String, dynamic>.from((json['meta'] as Map)['ads'] as Map))
          : null,
    );
  }
}

class CreateCommunityPostInput {
  CreateCommunityPostInput({
    required this.body,
    this.channelId,
    this.postType = 'update',
    this.title,
    this.tags = const <String>[],
    this.visibility = 'members',
    this.status = 'published',
    this.scheduledAt,
    this.metadata = const <String, dynamic>{},
  });

  final String body;
  final int? channelId;
  final String postType;
  final String? title;
  final List<String> tags;
  final String visibility;
  final String status;
  final DateTime? scheduledAt;
  final JsonMap metadata;

  JsonMap toJson() {
    return <String, dynamic>{
      'body': body,
      'channelId': channelId,
      'postType': postType,
      'title': title,
      'tags': tags,
      'visibility': visibility,
      'status': status,
      'scheduledAt': scheduledAt?.toIso8601String(),
      'metadata': metadata,
    }..removeWhere((key, value) => value == null);
  }
}
