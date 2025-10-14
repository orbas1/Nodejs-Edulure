import 'package:dio/dio.dart';

import 'api_config.dart';
import 'dashboard_service.dart';

class BlogFeedResult {
  BlogFeedResult({
    required this.posts,
    required this.page,
    required this.totalPages,
  });

  final List<BlogArticle> posts;
  final int page;
  final int totalPages;
}

class BlogService {
  BlogService()
      : _dio = Dio(
          BaseOptions(
            baseUrl: apiBaseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 20),
          ),
        );

  final Dio _dio;

  Future<BlogFeedResult> fetchPosts({int page = 1, int pageSize = 12}) async {
    final response = await _dio.get(
      '/blog/posts',
      queryParameters: {'page': page, 'pageSize': pageSize},
    );
    final data = response.data;
    final List<dynamic> postsJson = data['data'] is List ? data['data'] as List : const [];
    final List<BlogArticle> posts = postsJson
        .map((item) => BlogArticle.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
    final pagination = data['meta'] is Map ? Map<String, dynamic>.from(data['meta'] as Map) : const {};
    final paginationInfo = pagination['pagination'] is Map
        ? Map<String, dynamic>.from(pagination['pagination'] as Map)
        : const {};
    final totalPages = paginationInfo['totalPages'] is num ? (paginationInfo['totalPages'] as num).round() : 1;
    final currentPage = paginationInfo['page'] is num ? (paginationInfo['page'] as num).round() : page;
    return BlogFeedResult(posts: posts, page: currentPage, totalPages: totalPages);
  }

  Future<BlogArticle> fetchPost(String slug) async {
    final response = await _dio.get('/blog/posts/$slug');
    final data = response.data['data'] is Map
        ? Map<String, dynamic>.from(response.data['data'] as Map)
        : Map<String, dynamic>.from(response.data as Map);
    return BlogArticle.fromJson(data);
  }
}
