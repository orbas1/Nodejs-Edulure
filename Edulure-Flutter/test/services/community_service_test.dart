import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/services/community_service.dart';

import 'test_http_adapter.dart';

void main() {
  group('CommunityService', () {
    test('lists communities with authentication header', () async {
      late Map<String, dynamic> capturedHeaders;
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = TestHttpClientAdapter((options, _) async {
        capturedHeaders = options.headers;
        return ResponseBody.fromString(
          jsonEncode({
            'data': [
              {
                'id': 'community-1',
                'name': 'Growth Leaders',
                'slug': 'growth-leaders',
              },
            ],
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      });

      final service = CommunityService(
        client: dio,
        tokenProvider: () => 'token-123',
      );

      final communities = await service.listCommunities();

      expect(communities.single.slug, 'growth-leaders');
      expect(capturedHeaders['Authorization'], 'Bearer token-123');
    });

    test('fetches community feed and parses pagination', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = TestHttpClientAdapter((options, _) async {
        expect(options.queryParameters['page'], 2);
        return ResponseBody.fromString(
          jsonEncode({
            'data': [
              {
                'id': 'post-1',
                'title': 'Welcome',
                'body': 'First announcement',
                'author': 'Ops',
                'createdAt': '2024-01-01T00:00:00Z',
                'updatedAt': '2024-01-01T00:00:00Z',
              },
            ],
            'meta': {
              'pagination': {
                'page': 2,
                'totalPages': 5,
                'totalResults': 100,
              },
            },
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      });

      final service = CommunityService(
        client: dio,
        tokenProvider: () => 'token',
      );

      final feed = await service.fetchCommunityFeed('community-1', page: 2);

      expect(feed.items.single.title, 'Welcome');
      expect(feed.pagination.page, 2);
    });

    test('throws CommunityServiceException with API message', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = TestHttpClientAdapter((options, _) async {
        return ResponseBody.fromString(
          jsonEncode({'message': 'Access denied'}),
          403,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      });

      final service = CommunityService(
        client: dio,
        tokenProvider: () => 'expired-token',
      );

      await expectLater(
        () => service.joinCommunity('community-1'),
        throwsA(isA<CommunityServiceException>().having((error) => error.message, 'message', contains('Access denied'))),
      );
    });
  });
}
