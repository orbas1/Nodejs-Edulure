import 'dart:async';

import 'package:dio/dio.dart';

import '../../telemetry/telemetry_service.dart';

class TelemetryInterceptor extends Interceptor {
  TelemetryInterceptor(this._telemetry);

  final TelemetryService _telemetry;

  static const _requestStartKey = 'requestStart';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.extra[_requestStartKey] = DateTime.now();
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final startedAt = response.requestOptions.extra[_requestStartKey] as DateTime?;
    final duration = startedAt != null ? DateTime.now().difference(startedAt) : null;
    _telemetry.recordNetworkEvent(
      request: response.requestOptions,
      response: response,
      duration: duration,
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final startedAt = err.requestOptions.extra[_requestStartKey] as DateTime?;
    final duration = startedAt != null ? DateTime.now().difference(startedAt) : null;
    _telemetry.recordNetworkEvent(
      request: err.requestOptions,
      error: err,
      duration: duration,
    );
    unawaited(_telemetry.captureException(
      err,
      stackTrace: err.stackTrace,
      context: {
        'path': err.requestOptions.path,
        'method': err.requestOptions.method,
        if (err.response?.statusCode != null) 'statusCode': err.response!.statusCode!,
      },
    ));
    handler.next(err);
  }
}
