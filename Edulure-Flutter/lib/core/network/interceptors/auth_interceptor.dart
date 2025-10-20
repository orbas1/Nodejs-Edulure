import 'dart:async';

import 'package:dio/dio.dart';

import '../../security/session_manager_facade.dart';
import '../../security/session_refresh_coordinator.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required SessionManagerFacade sessionManager,
    required SessionRefreshCoordinator refreshCoordinator,
    required Dio httpClient,
  })  : _sessionManager = sessionManager,
        _refreshCoordinator = refreshCoordinator,
        _httpClient = httpClient;

  final SessionManagerFacade _sessionManager;
  final SessionRefreshCoordinator _refreshCoordinator;
  final Dio _httpClient;

  static const _retryKey = '__auth_interceptor_retry';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final requiresAuth = options.extra['requiresAuth'] != false;
    if (!requiresAuth) {
      options.headers.remove('Authorization');
      handler.next(options);
      return;
    }

    final token = _sessionManager.accessToken;
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (await _tryRecover(err, handler)) {
      return;
    }
    handler.next(err);
  }

  Future<bool> _tryRecover(DioException err, ErrorInterceptorHandler handler) async {
    if (!_shouldAttemptRefresh(err)) {
      return false;
    }

    try {
      final token = await _refreshCoordinator.refresh();
      if (token == null || token.isEmpty) {
        return false;
      }
      final response = await _retryWithToken(err.requestOptions, token);
      handler.resolve(response);
      return true;
    } on DioException catch (refreshError) {
      if (refreshError.type == DioExceptionType.cancel) {
        handler.reject(refreshError);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  bool _shouldAttemptRefresh(DioException err) {
    final statusCode = err.response?.statusCode;
    if (statusCode != 401 && statusCode != 403 && statusCode != 419) {
      return false;
    }

    final options = err.requestOptions;
    if (options.extra[_retryKey] == true) {
      return false;
    }
    if (options.extra['requiresAuth'] == false) {
      return false;
    }
    final path = options.path.toLowerCase();
    if (path.contains('/auth/login') ||
        path.contains('/auth/register') ||
        path.contains('/auth/refresh')) {
      return false;
    }
    if (_sessionManager.refreshToken == null ||
        _sessionManager.refreshToken!.isEmpty) {
      return false;
    }
    if (options.data is Stream<dynamic>) {
      return false;
    }
    return true;
  }

  Future<Response<dynamic>> _retryWithToken(RequestOptions requestOptions, String token) {
    final headers = Map<String, dynamic>.from(requestOptions.headers);
    headers['Authorization'] = 'Bearer $token';

    final extra = Map<String, dynamic>.from(requestOptions.extra)
      ..[_retryKey] = true;

    final options = Options(
      method: requestOptions.method,
      headers: headers,
      responseType: requestOptions.responseType,
      contentType: requestOptions.contentType,
      followRedirects: requestOptions.followRedirects,
      validateStatus: requestOptions.validateStatus,
      sendTimeout: requestOptions.sendTimeout,
      receiveTimeout: requestOptions.receiveTimeout,
      extra: extra,
    );

    return _httpClient.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
      cancelToken: requestOptions.cancelToken,
      onReceiveProgress: requestOptions.onReceiveProgress,
      onSendProgress: requestOptions.onSendProgress,
    );
  }
}
