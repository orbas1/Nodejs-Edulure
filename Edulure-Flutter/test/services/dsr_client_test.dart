import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:edulure_mobile/services/dsr_client.dart';
import 'package:flutter_test/flutter_test.dart';

class _Adapter extends HttpClientAdapter {
  _Adapter(this._handler);

  final ResponseBody Function(RequestOptions options) _handler;
  late RequestOptions lastRequest;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastRequest = options;
    return _handler(options);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('submits DSR requests with authorization headers', () async {
    final adapter = _Adapter((options) {
      return ResponseBody.fromString(
        jsonEncode({'status': 'accepted'}),
        202,
        headers: {Headers.contentTypeHeader: ['application/json']},
      );
    });

    final dio = Dio(BaseOptions(baseUrl: 'https://api.test'))..httpClientAdapter = adapter;
    final client = DsrClient(httpClient: dio, tokenProvider: () => 'token');

    await client.submitRequest(type: 'access', description: 'Export my data');

    expect(adapter.lastRequest.headers['Authorization'], 'Bearer token');
    expect(adapter.lastRequest.path, '/compliance/dsr/requests');
  });

  test('maps server conflicts to friendly errors', () async {
    final adapter = _Adapter((options) {
      return ResponseBody.fromString(
        jsonEncode({'message': 'conflict'}),
        409,
        headers: {Headers.contentTypeHeader: ['application/json']},
      );
    });
    final dio = Dio(BaseOptions(baseUrl: 'https://api.test'))..httpClientAdapter = adapter;
    final client = DsrClient(httpClient: dio, tokenProvider: () => 'token');

    expect(
      () => client.submitRequest(type: 'erase', description: 'Remove records'),
      throwsA(isException),
    );
  });

  test('requires authentication for submissions', () async {
    final client = DsrClient(tokenProvider: () => null);
    expect(
      () => client.submitRequest(type: 'access', description: 'noop'),
      throwsA(isException),
    );
  });
}
