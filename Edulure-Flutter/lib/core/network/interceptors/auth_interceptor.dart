import 'package:dio/dio.dart';

import '../../security/session_manager_facade.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._sessionManager);

  final SessionManagerFacade _sessionManager;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final requiresAuth = options.extra['requiresAuth'] != false;
    if (requiresAuth) {
      final token = _sessionManager.accessToken;
      if (token != null && token.isNotEmpty) {
        options.headers.putIfAbsent('Authorization', () => 'Bearer $token');
      }
    }
    handler.next(options);
  }
}
