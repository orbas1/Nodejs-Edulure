import 'dart:async';
import 'dart:typed_data';

import 'package:dio/dio.dart';

typedef TestHttpHandler = FutureOr<ResponseBody> Function(
  RequestOptions options,
  Stream<Uint8List>? body,
);

class TestHttpClientAdapter extends HttpClientAdapter {
  TestHttpClientAdapter(this._handler);

  final TestHttpHandler _handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<dynamic>? cancelFuture,
  ) async {
    return await _handler(options, requestStream);
  }

  @override
  void close({bool force = false}) {}
}
