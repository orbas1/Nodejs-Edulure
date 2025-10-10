import 'package:dio/dio.dart';

import 'api_config.dart';
import 'session_manager.dart';

class AuthService {
  AuthService()
      : _dio = Dio(
          BaseOptions(
            baseUrl: apiBaseUrl,
            connectTimeout: const Duration(seconds: 12),
          ),
        );

  final Dio _dio;

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {'email': email, 'password': password});
    final session = response.data['data'] as Map<String, dynamic>;
    await SessionManager.saveSession(session);
    return session;
  }
}
