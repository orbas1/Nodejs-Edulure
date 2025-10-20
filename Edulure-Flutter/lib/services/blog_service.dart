import 'dart:collection';

import 'package:dio/dio.dart';

import 'api_config.dart';
import 'dashboard_service.dart';

class BlogFeedResult {
  BlogFeedResult({
    required this.posts,
    required this.page,
    required this.totalPages,
    required this.totalResults,
  });

  final List<BlogArticle> posts;
  final int page;
  final int totalPages;
  final int totalResults;
}

class _CachedFeed {
  _CachedFeed(this.result, this.timestamp, this.ttl);

  final BlogFeedResult result;
  final DateTime timestamp;
  final Duration ttl;

  bool get isExpired => DateTime.now().difference(timestamp) > ttl;
}

class BlogService {
  BlogService({Dio? client, Duration? cacheDuration})
      : _dio = client ?? ApiConfig.createHttpClient(requiresAuth: false),
        _cacheDuration = cacheDuration ?? const Duration(minutes: 5);

  final Dio _dio;
  final Duration _cacheDuration;
  final Map<String, _CachedFeed> _feedCache = HashMap();
  final Map<String, BlogArticle> _postCache = HashMap();

  Future<BlogFeedResult> fetchPosts({
    int page = 1,
    int pageSize = 12,
    bool forceRefresh = false,
    String? category,
  }) async {
    final cacheKey = _buildCacheKey(page: page, pageSize: pageSize, category: category);
    if (!forceRefresh && _feedCache.containsKey(cacheKey)) {
      final cached = _feedCache[cacheKey]!;
      if (!cached.isExpired && cached.result.posts.isNotEmpty) {
        return cached.result;
      }
      if (cached.isExpired) {
        _feedCache.remove(cacheKey);
      }
    }

    try {
      final response = await _dio.get(
        '/blog/posts',
        queryParameters: <String, dynamic>{
          'page': page,
          'pageSize': pageSize,
          if (category != null && category.isNotEmpty) 'category': category,
        },
        options: ApiConfig.unauthenticatedOptions(),
      );
      final result = _parseFeedResponse(response.data, fallbackPage: page, fallbackPageSize: pageSize);
      _feedCache[cacheKey] = _CachedFeed(result, DateTime.now(), _cacheDuration);
      for (final article in result.posts) {
        _postCache[article.slug] = article;
      }
      return result;
    } on DioException catch (error) {
      throw _wrapDioException('/blog/posts', error, 'Unable to load blog posts');
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: RequestOptions(path: '/blog/posts'),
        message: 'Unable to load blog posts',
        error: error,
        stackTrace: stackTrace,
        type: DioExceptionType.unknown,
      );
    }
  }

  Future<BlogArticle> fetchPost(String slug, {bool forceRefresh = false}) async {
    if (!forceRefresh && _postCache.containsKey(slug)) {
      return _postCache[slug]!;
    }
    try {
      final response = await _dio.get(
        '/blog/posts/$slug',
        options: ApiConfig.unauthenticatedOptions(),
      );
      final envelope = _coerceMap(response.data);
      final rawArticle = envelope['data'];
      final articleJson = rawArticle is Map ? _coerceMap(rawArticle) : envelope;
      final article = BlogArticle.fromJson(articleJson);
      _postCache[slug] = article;
      return article;
    } on DioException catch (error) {
      throw _wrapDioException('/blog/posts/$slug', error, 'Unable to load blog article');
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: RequestOptions(path: '/blog/posts/$slug'),
        message: 'Unable to load blog article',
        error: error,
        stackTrace: stackTrace,
        type: DioExceptionType.unknown,
      );
    }
  }

  void clearCache() {
    _feedCache.clear();
    _postCache.clear();
  }

  String _buildCacheKey({required int page, required int pageSize, String? category}) {
    return 'page=$page|size=$pageSize|category=${category ?? ''}';
  }

  BlogFeedResult _parseFeedResponse(dynamic payload, {required int fallbackPage, required int fallbackPageSize}) {
    final envelope = _coerceMap(payload);
    final data = envelope['data'];
    final postsJson = data is List ? data : <dynamic>[];
    final posts = postsJson
        .whereType<Map>()
        .map((item) => BlogArticle.fromJson(_coerceMap(item)))
        .toList();
    final meta = envelope['meta'] is Map ? _coerceMap(envelope['meta']) : <String, dynamic>{};
    final pagination = meta['pagination'] is Map ? _coerceMap(meta['pagination']) : <String, dynamic>{};
    final totalPages = pagination['totalPages'] is num
        ? (pagination['totalPages'] as num).round()
        : (posts.length / fallbackPageSize).ceil().clamp(1, 999);
    final currentPage = pagination['page'] is num ? (pagination['page'] as num).round() : fallbackPage;
    final totalResults = pagination['totalResults'] is num ? (pagination['totalResults'] as num).round() : posts.length;
    return BlogFeedResult(
      posts: posts,
      page: currentPage,
      totalPages: totalPages,
      totalResults: totalResults,
    );
  }

  Map<String, dynamic> _coerceMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return Map<String, dynamic>.from(value);
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value as Map);
    }
    return <String, dynamic>{};
  }

  DioException _wrapDioException(String path, DioException error, String fallback) {
    final message = _extractMessage(error.response?.data) ?? fallback;
    return DioException(
      requestOptions: RequestOptions(
        path: path,
        method: error.requestOptions.method,
        headers: error.requestOptions.headers,
        queryParameters: error.requestOptions.queryParameters,
      ),
      response: error.response,
      type: error.type,
      error: error.error,
      stackTrace: error.stackTrace,
      message: message,
    );
  }

  String? _extractMessage(dynamic data) {
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    if (data is Map && data['errors'] is List && data['errors'].isNotEmpty) {
      return data['errors'].first.toString();
    }
    return null;
  }
}
