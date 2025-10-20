import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/services/dsr_client.dart';

import 'test_http_adapter.dart';

void main() {
  group('DsrClient', () {
    test('submits request with authorization header', () async {
      late Map<String, dynamic> headers;
      late Map<String, dynamic> payload;
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = TestHttpClientAdapter((options, body) async {
        headers = options.headers;
        final collected = await body!.toList();
        payload = jsonDecode(utf8.decode(collected.expand((chunk) => chunk).toList())) as Map<String, dynamic>;
        return ResponseBody.fromString('{}', 202);
      });

      final client = const DsrClient();

      await client.submitRequest(
        type: 'erasure',
        description: 'Please delete my profile',
        client: dio,
        accessToken: 'token',
      );

      expect(headers['Authorization'], 'Bearer token');
      expect(payload['type'], 'erasure');
    });

    test('throws DsrClientException when API returns error', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = TestHttpClientAdapter((options, _) async {
        return ResponseBody.fromString(
          jsonEncode({'message': 'Request already pending'}),
          409,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      });

      final client = const DsrClient();

      await expectLater(
        () => client.submitRequest(
          type: 'access',
          description: 'Download my data',
          client: dio,
          accessToken: 'token',
        ),
        throwsA(isA<DsrClientException>().having((error) => error.message, 'message', contains('Request already pending'))),
      );
    });
  });
}
