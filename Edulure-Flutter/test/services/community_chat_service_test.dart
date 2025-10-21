import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/services/community_chat_service.dart';

import 'test_http_adapter.dart';

void main() {
  group('CommunityChatService', () {
    TestHttpClientAdapter buildAdapter(Map<String, dynamic> payload, {int statusCode = 200, void Function(RequestOptions)? onRequest}) {
      return TestHttpClientAdapter((options, _) async {
        onRequest?.call(options);
        return ResponseBody.fromString(
          jsonEncode(payload),
          statusCode,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      });
    }

    Map<String, dynamic> channelSummaryJson() {
      return {
        'channel': {
          'id': 'channel-1',
          'communityId': 'community-1',
          'name': 'General',
          'slug': 'general',
          'channelType': 'text',
          'description': 'General chat',
          'metadata': const <String, dynamic>{},
          'isDefault': true,
          'createdAt': '2024-01-01T00:00:00Z',
          'updatedAt': '2024-01-01T00:00:00Z',
        },
        'membership': {
          'id': 'membership-1',
          'channelId': 'channel-1',
          'userId': 'user-1',
          'role': 'member',
          'notificationsEnabled': true,
          'lastReadAt': '2024-01-01T00:00:00Z',
        },
        'latestMessage': messageJson()['data'],
        'unreadCount': 3,
      };
    }

    Map<String, dynamic> messageJson() {
      return {
        'data': {
          'id': 'message-1',
          'communityId': 'community-1',
          'channelId': 'channel-1',
          'authorId': 'user-1',
          'messageType': 'text',
          'body': 'Hello team',
          'attachments': const [],
          'metadata': const <String, dynamic>{},
          'status': 'visible',
          'pinned': false,
          'createdAt': '2024-01-01T00:00:00Z',
          'updatedAt': '2024-01-01T00:00:00Z',
          'author': {
            'id': 'user-1',
            'displayName': 'Taylor',
            'avatarUrl': null,
            'role': 'member',
          },
          'reactions': const [],
          'viewerReactions': const [],
        },
      };
    }

    test('lists chat channels', () async {
      late Map<String, dynamic> headers;
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = buildAdapter(
        {'data': [channelSummaryJson()]},
        onRequest: (options) => headers = options.headers,
      );

      final service = CommunityChatService(
        client: dio,
        tokenProvider: () => 'token',
      );

      final channels = await service.listChannels('community-1');

      expect(channels.single.channel.name, 'General');
      expect(headers['Authorization'], 'Bearer token');
    });

    test('posts a message', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = buildAdapter(messageJson());

      final service = CommunityChatService(
        client: dio,
        tokenProvider: () => 'token',
      );

      final created = await service.postMessage(
        'community-1',
        'channel-1',
        CommunityChatMessageDraft(body: 'Hello team'),
      );

      expect(created.body, 'Hello team');
      expect(created.author.displayName, 'Taylor');
    });

    test('throws CommunityChatException on failure', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = buildAdapter(
        {'message': 'Channel not found'},
        statusCode: 404,
      );

      final service = CommunityChatService(
        client: dio,
        tokenProvider: () => 'token',
      );

      await expectLater(
        () => service.addReaction('community-1', 'channel-1', 'message-1', '🔥'),
        throwsA(isA<CommunityChatException>().having((error) => error.message, 'message', contains('Channel not found'))),
      );
    });
  });
}
