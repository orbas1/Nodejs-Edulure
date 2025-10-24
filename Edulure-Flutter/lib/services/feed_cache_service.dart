import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'live_feed_service.dart';
import 'session_manager.dart';

class FeedCacheResult {
  FeedCacheResult({
    required this.snapshot,
    required this.cachedAt,
    required this.placements,
  });

  final FeedSnapshot snapshot;
  final DateTime cachedAt;
  final List<FeedPlacement> placements;
}

class FeedCacheService {
  FeedCacheService({Box? box, Duration ttl = const Duration(minutes: 20)})
      : _box = box ?? SessionManager.feedSnapshotCacheOrNull,
        _ttl = ttl;

  final Box? _box;
  final Duration _ttl;

  bool get _enabled => _box != null;

  Future<void> saveSnapshot({
    required FeedContext context,
    String? communityId,
    required String range,
    String? search,
    String? postType,
    required FeedSnapshot snapshot,
    required List<FeedPlacement> placements,
  }) async {
    if (!_enabled) return;
    final payload = <String, dynamic>{
      'cachedAt': DateTime.now().toUtc().toIso8601String(),
      'snapshot': _snapshotToJson(snapshot),
      'placements': placements.map(_placementToJson).toList(),
    };
    await _box!.put(
      _buildKey(
        context: context,
        communityId: communityId,
        range: range,
        search: search,
        postType: postType,
      ),
      jsonEncode(payload),
    );
  }

  FeedCacheResult? loadSnapshot({
    required FeedContext context,
    String? communityId,
    required String range,
    String? search,
    String? postType,
  }) {
    if (!_enabled) return null;
    final raw = _box!.get(
      _buildKey(
        context: context,
        communityId: communityId,
        range: range,
        search: search,
        postType: postType,
      ),
    );
    if (raw is! String || raw.isEmpty) {
      return null;
    }
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final cachedAt = DateTime.tryParse(decoded['cachedAt']?.toString() ?? '');
      if (cachedAt == null) {
        return null;
      }
      if (DateTime.now().toUtc().isAfter(cachedAt.add(_ttl))) {
        unawaited(_box!.delete(_buildKey(
          context: context,
          communityId: communityId,
          range: range,
          search: search,
          postType: postType,
        )));
        return null;
      }
      final snapshotJson = decoded['snapshot'];
      if (snapshotJson is! Map<String, dynamic>) {
        return null;
      }
      final snapshot = FeedSnapshot.fromJson(snapshotJson);
      final placementJson = decoded['placements'];
      final placements = <FeedPlacement>[];
      if (placementJson is List) {
        for (final entry in placementJson) {
          if (entry is Map<String, dynamic>) {
            placements.add(FeedPlacement.fromJson(entry));
          } else if (entry is Map) {
            placements.add(
              FeedPlacement.fromJson(Map<String, dynamic>.from(entry as Map)),
            );
          }
        }
      }
      return FeedCacheResult(
        snapshot: snapshot,
        cachedAt: cachedAt.toLocal(),
        placements: placements,
      );
    } catch (error) {
      return null;
    }
  }

  String _buildKey({
    required FeedContext context,
    String? communityId,
    required String range,
    String? search,
    String? postType,
  }) {
    final scope = communityId?.trim().isEmpty ?? true ? 'global' : communityId!.trim();
    final post = postType?.trim().toLowerCase() ?? '-';
    final query = (search ?? '').trim().toLowerCase();
    final queryKey = query.isEmpty ? '-' : query;
    return 'ctx:${describeEnum(context)}|comm:$scope|range:$range|post:$post|q:$queryKey';
  }

  Map<String, dynamic> _snapshotToJson(FeedSnapshot snapshot) {
    return <String, dynamic>{
      'context': describeEnum(snapshot.context),
      'community': snapshot.community == null ? null : _communityRefToJson(snapshot.community!),
      'pagination': _paginationToJson(snapshot.pagination),
      'generatedAt': snapshot.generatedAt.toIso8601String(),
      'items': snapshot.items.map(_entryToJson).toList(),
      'analytics': snapshot.analytics == null ? null : _analyticsToJson(snapshot.analytics!),
      'highlights': snapshot.highlights.map(_highlightToJson).toList(),
      'ads': snapshot.adsSummary == null ? null : _adsSummaryToJson(snapshot.adsSummary!),
      'range': snapshot.range == null ? null : _rangeToJson(snapshot.range!),
    }..removeWhere((_, value) => value == null);
  }

  Map<String, dynamic> _paginationToJson(FeedPagination pagination) {
    return <String, dynamic>{
      'page': pagination.page,
      'perPage': pagination.perPage,
      'total': pagination.total,
      'totalPages': pagination.totalPages,
    };
  }

  Map<String, dynamic> _entryToJson(FeedEntry entry) {
    if (entry.kind == FeedEntryKind.ad && entry.ad != null) {
      return <String, dynamic>{
        'kind': 'ad',
        'ad': _adToJson(entry.ad!),
      };
    }
    return <String, dynamic>{
      'kind': 'post',
      'post': entry.post == null ? <String, dynamic>{} : _postToJson(entry.post!),
    };
  }

  Map<String, dynamic> _postToJson(CommunityPost post) {
    return <String, dynamic>{
      'id': post.id,
      'type': post.type,
      'body': post.body,
      'publishedAt': post.publishedAt?.toIso8601String(),
      'scheduledAt': post.scheduledAt?.toIso8601String(),
      'status': post.status,
      'visibility': post.visibility,
      'title': post.title,
      'tags': post.tags,
      'metadata': Map<String, dynamic>.from(post.metadata),
      'author': _authorToJson(post.author),
      'channel': post.channel == null ? null : _channelToJson(post.channel!),
      'community': post.community == null ? null : _communityRefToJson(post.community!),
      'stats': _postStatsToJson(post.stats),
      'moderation': _postModerationToJson(post.moderation),
    }..removeWhere((_, value) => value == null);
  }

  Map<String, dynamic> _adToJson(FeedAd ad) {
    return <String, dynamic>{
      'placementId': ad.placementId,
      'campaignId': ad.campaignId,
      'slot': ad.slot,
      'headline': ad.headline,
      'description': ad.description,
      'ctaUrl': ad.ctaUrl,
      'tracking': Map<String, dynamic>.from(ad.tracking),
      'position': ad.position,
    }..removeWhere((_, value) => value == null);
  }

  Map<String, dynamic> _placementToJson(FeedPlacement placement) {
    return <String, dynamic>{
      'placementId': placement.placementId,
      'campaignId': placement.campaignId,
      'slot': placement.slot,
      'headline': placement.headline,
      'description': placement.description,
      'ctaUrl': placement.ctaUrl,
    }..removeWhere((_, value) => value == null);
  }

  Map<String, dynamic> _adsSummaryToJson(FeedAdsSummary summary) {
    return <String, dynamic>{
      'count': summary.count,
      'placements': summary.placements.map(_placementSummaryToJson).toList(),
    };
  }

  Map<String, dynamic> _placementSummaryToJson(FeedPlacementSummary summary) {
    return <String, dynamic>{
      'placementId': summary.placementId,
      'campaignId': summary.campaignId,
      'slot': summary.slot,
      'position': summary.position,
    };
  }

  Map<String, dynamic> _analyticsToJson(FeedAnalytics analytics) {
    return <String, dynamic>{
      'generatedAt': analytics.generatedAt.toIso8601String(),
      'engagement': _engagementToJson(analytics.engagement),
      'ads': _adsAnalyticsToJson(analytics.ads),
    };
  }

  Map<String, dynamic> _engagementToJson(FeedEngagement engagement) {
    return <String, dynamic>{
      'postsSampled': engagement.postsSampled,
      'postsTotal': engagement.postsTotal,
      'comments': engagement.comments,
      'reactions': engagement.reactions,
      'uniqueCommunities': engagement.uniqueCommunities,
      'trendingTags': engagement.trendingTags
          .map((tag) => {'tag': tag.tag, 'count': tag.count})
          .toList(),
      'latestActivityAt': engagement.latestActivityAt?.toIso8601String(),
    }..removeWhere((_, value) => value == null);
  }

  Map<String, dynamic> _adsAnalyticsToJson(FeedAdsAnalytics analytics) {
    return <String, dynamic>{
      'placementsServed': analytics.placementsServed,
      'campaignsServed': analytics.campaignsServed,
      'activeCampaigns': analytics.activeCampaigns,
      'scheduledCampaigns': analytics.scheduledCampaigns,
      'totals': _adsTotalsToJson(analytics.totals),
    };
  }

  Map<String, dynamic> _adsTotalsToJson(FeedAdsTotals totals) {
    return <String, dynamic>{
      'impressions': totals.impressions,
      'clicks': totals.clicks,
      'conversions': totals.conversions,
      'spendCents': totals.spendCents,
      'revenueCents': totals.revenueCents,
    };
  }

  Map<String, dynamic> _highlightToJson(FeedHighlight highlight) {
    return <String, dynamic>{
      'type': highlight.type,
      'id': highlight.id,
      'timestamp': highlight.timestamp.toIso8601String(),
      'title': highlight.title,
      'summary': highlight.summary,
      'metadata': Map<String, dynamic>.from(highlight.metadata),
      'metrics': Map<String, dynamic>.from(highlight.metrics),
      'name': highlight.name,
      'status': highlight.status,
      'projectType': highlight.projectType,
      'objective': highlight.objective,
    }..removeWhere((_, value) => value == null);
  }

  Map<String, dynamic> _rangeToJson(FeedRangeWindow range) {
    return <String, dynamic>{
      'start': range.start.toIso8601String(),
      'end': range.end.toIso8601String(),
      'key': range.key,
    };
  }

  Map<String, dynamic> _communityRefToJson(CommunityReference reference) {
    return <String, dynamic>{
      'id': reference.id,
      'name': reference.name,
      'slug': reference.slug,
    };
  }

  Map<String, dynamic> _channelToJson(CommunityChannelReference channel) {
    return <String, dynamic>{
      'id': channel.id,
      'name': channel.name,
      'slug': channel.slug,
      'type': channel.type,
    };
  }

  Map<String, dynamic> _authorToJson(CommunityMemberSummary author) {
    return <String, dynamic>{
      'id': author.id,
      'name': author.name,
      'role': author.role,
      'avatarUrl': author.avatarUrl,
    };
  }

  Map<String, dynamic> _postStatsToJson(CommunityPostStats stats) {
    return <String, dynamic>{
      'reactions': stats.reactions,
      'reactionBreakdown': Map<String, dynamic>.from(stats.reactionBreakdown),
      'comments': stats.comments,
    };
  }

  Map<String, dynamic> _postModerationToJson(CommunityPostModeration moderation) {
    return <String, dynamic>{
      'state': moderation.state,
      'lastReviewedAt': moderation.lastReviewedAt?.toIso8601String(),
      'flags': List<String>.from(moderation.flags),
      'riskHistory': List<dynamic>.from(moderation.riskHistory),
      'notes': List<dynamic>.from(moderation.notes),
    }..removeWhere((_, value) => value == null);
  }
}
