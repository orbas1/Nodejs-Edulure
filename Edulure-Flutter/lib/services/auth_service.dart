import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/network/dio_provider.dart';
import 'session_manager.dart';

class AuthService {
  AuthService(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>> login(String email, String password, {String? twoFactorCode}) async {
    final payload = {
      'email': email,
      'password': password,
      if (twoFactorCode != null && twoFactorCode.trim().isNotEmpty) 'twoFactorCode': twoFactorCode.trim(),
    };
    final response = await _dio.post(
      '/auth/login',
      data: payload,
      options: Options(extra: {'requiresAuth': false}),
    );
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
    Map<String, String>? address,
    bool enableTwoFactor = false,
  }) async {
    final payload = {
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'password': password,
      'role': role,
      if (age != null) 'age': age,
      if (address != null && address.isNotEmpty) 'address': address,
      'twoFactor': {'enabled': enableTwoFactor},
    };
    final response = await _dio.post(
      '/auth/register',
      data: payload,
      options: Options(extra: {'requiresAuth': false}),
    );
    final data = response.data['data'];
    if (data is Map<String, dynamic>) {
      return data;
    }
    return {};
  }
}

final authServiceProvider = Provider<AuthService>((ref) {
  final dio = ref.watch(dioProvider);
  return AuthService(dio);
});
