import 'package:dio/dio.dart';

import 'api_config.dart';
import 'session_manager.dart';

class ExplorerService {
  ExplorerService()
      : _dio = Dio(
          BaseOptions(
            baseUrl: apiBaseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 20),
          ),
        );

  final Dio _dio;

  Options _authOptions() {
    final token = SessionManager.getAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('Authentication required');
    }
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  Future<ExplorerSearchResponse> search({
    required String query,
    required List<String> entityTypes,
    Map<String, dynamic>? filters,
    Map<String, dynamic>? globalFilters,
    Map<String, dynamic>? sort,
    int page = 1,
    int perPage = 12,
  }) async {
    final response = await _dio.post(
      '/explorer/search',
      data: {
        'query': query,
        'entityTypes': entityTypes,
        'filters': filters ?? <String, dynamic>{},
        'globalFilters': globalFilters ?? <String, dynamic>{},
        'sort': sort ?? <String, dynamic>{},
        'page': page,
        'perPage': perPage,
      },
      options: _authOptions(),
    );

    final payload = response.data['data'];
    if (payload is Map<String, dynamic>) {
      return ExplorerSearchResponse.fromJson(payload);
    }
    if (payload is Map) {
      return ExplorerSearchResponse.fromJson(Map<String, dynamic>.from(payload as Map));
    }
    throw Exception('Unexpected explorer response payload');
  }

  Future<void> recordInteraction({
    required String searchEventId,
    required String entityType,
    required String resultId,
    String interactionType = 'click',
  }) async {
    final token = SessionManager.getAccessToken();
    if (token == null || token.isEmpty) {
      return;
    }

    await _dio.post(
      '/analytics/explorer/interactions',
      data: {
        'searchEventId': searchEventId,
        'entityType': entityType,
        'resultId': resultId,
        'interactionType': interactionType,
      },
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
  }
}

class ExplorerSearchResponse {
  ExplorerSearchResponse({
    required this.results,
    required this.totals,
    this.analytics,
    this.markers,
  });

  final Map<String, ExplorerEntityResults> results;
  final Map<String, int> totals;
  final ExplorerAnalytics? analytics;
  final ExplorerMarkers? markers;

  factory ExplorerSearchResponse.fromJson(Map<String, dynamic> json) {
    final results = <String, ExplorerEntityResults>{};
    final rawResults = json['results'];
    if (rawResults is Map) {
      rawResults.forEach((key, value) {
        if (value is Map) {
          results[key.toString()] = ExplorerEntityResults.fromJson(
            key.toString(),
            Map<String, dynamic>.from(value as Map),
          );
        }
      });
    }

    final totals = <String, int>{};
    final rawTotals = json['totals'];
    if (rawTotals is Map) {
      rawTotals.forEach((key, value) {
        if (value is num) {
          totals[key.toString()] = value.toInt();
        }
      });
    }

    return ExplorerSearchResponse(
      results: results,
      totals: totals,
      analytics: json['analytics'] is Map<String, dynamic>
          ? ExplorerAnalytics.fromJson(json['analytics'] as Map<String, dynamic>)
          : json['analytics'] is Map
              ? ExplorerAnalytics.fromJson(Map<String, dynamic>.from(json['analytics'] as Map))
              : null,
      markers: json['markers'] is Map<String, dynamic>
          ? ExplorerMarkers.fromJson(json['markers'] as Map<String, dynamic>)
          : json['markers'] is Map
              ? ExplorerMarkers.fromJson(Map<String, dynamic>.from(json['markers'] as Map))
              : null,
    );
  }
}

class ExplorerEntityResults {
  ExplorerEntityResults({
    required this.entityType,
    required this.hits,
    this.facets,
    this.processingTimeMs,
  });

  final String entityType;
  final List<ExplorerHit> hits;
  final Map<String, dynamic>? facets;
  final double? processingTimeMs;

  factory ExplorerEntityResults.fromJson(String entityType, Map<String, dynamic> json) {
    final rawHits = json['hits'];
    final hits = <ExplorerHit>[];
    if (rawHits is List) {
      for (final entry in rawHits) {
        if (entry is Map) {
          hits.add(ExplorerHit.fromJson(Map<String, dynamic>.from(entry as Map)));
        }
      }
    }

    return ExplorerEntityResults(
      entityType: entityType,
      hits: hits,
      facets: json['facets'] is Map
          ? Map<String, dynamic>.from(json['facets'] as Map)
          : null,
      processingTimeMs: json['processingTimeMs'] is num
          ? (json['processingTimeMs'] as num).toDouble()
          : null,
    );
  }
}

class ExplorerHit {
  ExplorerHit({
    required this.id,
    required this.entityType,
    required this.title,
    this.subtitle,
    this.description,
    this.metrics = const {},
    this.tags = const [],
    this.geo,
    this.raw,
    this.actions = const [],
  });

  final String id;
  final String entityType;
  final String title;
  final String? subtitle;
  final String? description;
  final Map<String, dynamic> metrics;
  final List<String> tags;
  final Map<String, dynamic>? geo;
  final Map<String, dynamic>? raw;
  final List<ExplorerAction> actions;

  factory ExplorerHit.fromJson(Map<String, dynamic> json) {
    final tags = <String>[];
    final rawTags = json['tags'];
    if (rawTags is List) {
      for (final tag in rawTags) {
        if (tag is String && tag.trim().isNotEmpty) {
          tags.add(tag);
        }
      }
    }

    final metrics = <String, dynamic>{};
    final rawMetrics = json['metrics'];
    if (rawMetrics is Map) {
      rawMetrics.forEach((key, value) {
        metrics[key.toString()] = value;
      });
    }

    final actions = <ExplorerAction>[];
    final rawActions = json['actions'];
    if (rawActions is List) {
      for (final action in rawActions) {
        if (action is Map) {
          actions.add(ExplorerAction.fromJson(Map<String, dynamic>.from(action as Map)));
        }
      }
    }

    return ExplorerHit(
      id: json['id']?.toString() ?? '',
      entityType: json['entityType']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled',
      subtitle: json['subtitle']?.toString(),
      description: json['description']?.toString(),
      metrics: metrics,
      tags: tags,
      geo: json['geo'] is Map ? Map<String, dynamic>.from(json['geo'] as Map) : null,
      raw: json['raw'] is Map ? Map<String, dynamic>.from(json['raw'] as Map) : null,
      actions: actions,
    );
  }
}

class ExplorerAction {
  ExplorerAction({required this.label, required this.href});

  final String label;
  final String href;

  factory ExplorerAction.fromJson(Map<String, dynamic> json) {
    return ExplorerAction(
      label: json['label']?.toString() ?? 'Open',
      href: json['href']?.toString() ?? '',
    );
  }
}

class ExplorerAnalytics {
  ExplorerAnalytics({
    required this.searchEventId,
    required this.totalResults,
    required this.totalDisplayed,
    required this.zeroResult,
  });

  final String searchEventId;
  final int totalResults;
  final int totalDisplayed;
  final bool zeroResult;

  factory ExplorerAnalytics.fromJson(Map<String, dynamic> json) {
    return ExplorerAnalytics(
      searchEventId: json['searchEventId']?.toString() ?? '',
      totalResults: (json['totalResults'] is num) ? (json['totalResults'] as num).toInt() : 0,
      totalDisplayed: (json['totalDisplayed'] is num) ? (json['totalDisplayed'] as num).toInt() : 0,
      zeroResult: json['zeroResult'] == true,
    );
  }

  bool get hasEvent => searchEventId.isNotEmpty;
}

class ExplorerMarkers {
  ExplorerMarkers({required this.items, this.bounds});

  final List<ExplorerMarker> items;
  final ExplorerMarkerBounds? bounds;

  factory ExplorerMarkers.fromJson(Map<String, dynamic> json) {
    final items = <ExplorerMarker>[];
    final rawItems = json['items'];
    if (rawItems is List) {
      for (final item in rawItems) {
        if (item is Map) {
          items.add(ExplorerMarker.fromJson(Map<String, dynamic>.from(item as Map)));
        }
      }
    }

    return ExplorerMarkers(
      items: items,
      bounds: json['bounds'] is Map
          ? ExplorerMarkerBounds.fromJson(json['bounds'] as Map<String, dynamic>)
          : json['bounds'] is Map
              ? ExplorerMarkerBounds.fromJson(Map<String, dynamic>.from(json['bounds'] as Map))
              : null,
    );
  }
}

class ExplorerMarker {
  ExplorerMarker({required this.lat, required this.lng, this.label});

  final double lat;
  final double lng;
  final String? label;

  factory ExplorerMarker.fromJson(Map<String, dynamic> json) {
    return ExplorerMarker(
      lat: (json['lat'] is num) ? (json['lat'] as num).toDouble() : 0,
      lng: (json['lng'] is num) ? (json['lng'] as num).toDouble() : 0,
      label: json['label']?.toString(),
    );
  }
}

class ExplorerMarkerBounds {
  ExplorerMarkerBounds({
    required this.north,
    required this.south,
    required this.east,
    required this.west,
  });

  final double north;
  final double south;
  final double east;
  final double west;

  factory ExplorerMarkerBounds.fromJson(Map<String, dynamic> json) {
    return ExplorerMarkerBounds(
      north: (json['north'] is num) ? (json['north'] as num).toDouble() : 0,
      south: (json['south'] is num) ? (json['south'] as num).toDouble() : 0,
      east: (json['east'] is num) ? (json['east'] as num).toDouble() : 0,
      west: (json['west'] is num) ? (json['west'] as num).toDouble() : 0,
    );
  }
}
