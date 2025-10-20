import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/services/blog_service.dart';

class _FakeHttpClientAdapter extends HttpClientAdapter {
  _FakeHttpClientAdapter(this._handler);

  final FutureOr<ResponseBody> Function(RequestOptions options, Stream<Uint8List>? body) _handler;

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future? cancelFuture) async {
    return await _handler(options, requestStream);
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  group('BlogService', () {
    test('caches feed responses until cache expires', () async {
      var invocationCount = 0;
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api'));
      dio.httpClientAdapter = _FakeHttpClientAdapter((options, _) async {
        invocationCount += 1;
        expect(options.path, '/blog/posts');
        return ResponseBody.fromString(
          jsonEncode({
            'data': [
              {
                'slug': 'launch-update',
                'title': 'Launch update',
                'excerpt': 'Highlights from launch week.',
                'category': {'name': 'Product'},
                'readingTimeMinutes': 4,
                'featured': true,
              },
            ],
            'meta': {
              'pagination': {
                'page': 1,
                'totalPages': 2,
                'totalResults': 12,
              },
            },
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final service = BlogService(client: dio, cacheDuration: const Duration(minutes: 10));

      final first = await service.fetchPosts(page: 1, pageSize: 6);
      final second = await service.fetchPosts(page: 1, pageSize: 6);

      expect(invocationCount, 1);
      expect(first.totalPages, 2);
      expect(second.posts.single.slug, 'launch-update');
    });

    test('fetchPost caches individual articles', () async {
      var invocationCount = 0;
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api'));
      dio.httpClientAdapter = _FakeHttpClientAdapter((options, _) async {
        invocationCount += 1;
        return ResponseBody.fromString(
          jsonEncode({
            'data': {
              'slug': 'creator-playbook',
              'title': 'Creator playbook',
              'excerpt': 'How top instructors run launches.',
              'category': 'Growth',
              'readingTimeMinutes': 8,
            },
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final service = BlogService(client: dio, cacheDuration: const Duration(minutes: 10));

      final article = await service.fetchPost('creator-playbook');
      final cached = await service.fetchPost('creator-playbook');

      expect(invocationCount, 1);
      expect(article.slug, 'creator-playbook');
      expect(cached.title, 'Creator playbook');
    });

    test('surface API error message when fetch fails', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api'));
      dio.httpClientAdapter = _FakeHttpClientAdapter((options, _) async {
        return ResponseBody.fromString(
          jsonEncode({'message': 'Access denied'}),
          403,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
      final service = BlogService(client: dio);

      await expectLater(
        () => service.fetchPosts(forceRefresh: true),
        throwsA(isA<DioException>().having((error) => error.message, 'message', contains('Access denied'))),
      );
    });
  });
}
