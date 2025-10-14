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

  Future<Map<String, dynamic>> login(String email, String password, {String? twoFactorCode}) async {
    final payload = {
      'email': email,
      'password': password,
      if (twoFactorCode != null && twoFactorCode.trim().isNotEmpty) 'twoFactorCode': twoFactorCode.trim(),
    };
    final response = await _dio.post('/auth/login', data: payload);
    final session = response.data['data'] as Map<String, dynamic>;
    await SessionManager.saveSession(session);
    return session;
  }

  Future<Map<String, dynamic>> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    required String role,
    int? age,
    String? address,
    bool enableTwoFactor = false,
  }) async {
    final payload = {
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'password': password,
      'role': role,
      if (age != null) 'age': age,
      if (address != null && address.trim().isNotEmpty) 'address': address.trim(),
      'twoFactor': {'enabled': enableTwoFactor},
    };
    final response = await _dio.post('/auth/register', data: payload);
    final data = response.data['data'];
    if (data is Map<String, dynamic>) {
      return data;
    }
    return {};
  }
}
