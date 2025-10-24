import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/network/dio_provider.dart';
import 'api_config.dart';
import 'session_manager.dart';
import 'device_context_service.dart';

class AuthException extends DioException {
  AuthException({
    required super.requestOptions,
    super.response,
    super.type,
    super.message,
    super.error,
    super.stackTrace,
  });

  factory AuthException.fromDio(DioException error) {
    final message = _extractMessage(error.response?.data) ?? error.message ?? 'Authentication failed';
    return AuthException(
      requestOptions: error.requestOptions,
      response: error.response,
      type: error.type,
      message: message,
      error: error.error,
      stackTrace: error.stackTrace,
    );
  }

  static String? _extractMessage(dynamic data) {
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    if (data is Map && data['errors'] is List && data['errors'].isNotEmpty) {
      return data['errors'].first.toString();
    }
    return null;
  }
}

abstract class SessionPersistence {
  Future<void> saveSession(Map<String, dynamic> session);
  Future<void> clearSession();
  String? get refreshToken;
}

class _SessionManagerPersistence implements SessionPersistence {
  @override
  Future<void> saveSession(Map<String, dynamic> session) {
    return SessionManager.saveSession(session);
  }

  @override
  Future<void> clearSession() {
    return SessionManager.clear();
  }

  @override
  String? get refreshToken => SessionManager.getRefreshToken();
}

class AuthService {
  AuthService(
    this._dio, {
    SessionPersistence? sessionPersistence,
    DeviceContextService? deviceContextService,
  })  : _sessionPersistence = sessionPersistence ?? _SessionManagerPersistence(),
        _deviceContextService = deviceContextService ?? DeviceContextService();

  final Dio _dio;
  final SessionPersistence _sessionPersistence;
  final DeviceContextService _deviceContextService;

  Future<Map<String, dynamic>> login(
    String email,
    String password, {
    String? twoFactorCode,
  }) async {
    final payload = <String, dynamic>{
      'email': email.trim(),
      'password': password,
      if (twoFactorCode != null && twoFactorCode.trim().isNotEmpty)
        'twoFactorCode': twoFactorCode.trim(),
    };
    final context = await _buildActivityContext('login');
    if (context.isNotEmpty) {
      payload['context'] = context;
    }
    try {
      final response = await _dio.post(
        '/auth/login',
        data: payload,
        options: ApiConfig.unauthenticatedOptions(),
      );
      final session = _extractSession(response.data);
      await _sessionPersistence.saveSession(session);
      return session;
    } on DioException catch (error) {
      throw AuthException.fromDio(error);
    } catch (error, stackTrace) {
      throw AuthException(
        requestOptions: RequestOptions(path: '/auth/login'),
        message: 'Unable to process login request',
        error: error,
        stackTrace: stackTrace,
      );
    }
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
    Map<String, dynamic>? metadata,
  }) async {
    final payload = <String, dynamic>{
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      'email': email.trim(),
      'password': password,
      'role': role,
      if (age != null) 'age': age,
      if (address != null && address.isNotEmpty) 'address': address,
      'twoFactor': {'enabled': enableTwoFactor},
      if (metadata != null && metadata.isNotEmpty) 'metadata': metadata,
    };
    final context = await _buildActivityContext('register');
    if (context.isNotEmpty) {
      payload['context'] = context;
    }
    try {
      final response = await _dio.post(
        '/auth/register',
        data: payload,
        options: ApiConfig.unauthenticatedOptions(),
      );
      final session = _extractSession(response.data);
      if (session.isNotEmpty) {
        await _sessionPersistence.saveSession(session);
      }
      return session;
    } on DioException catch (error) {
      throw AuthException.fromDio(error);
    } catch (error, stackTrace) {
      throw AuthException(
        requestOptions: RequestOptions(path: '/auth/register'),
        message: 'Unable to complete registration',
        error: error,
        stackTrace: stackTrace,
      );
    }
  }

  Future<Map<String, dynamic>> refreshSession({String? refreshToken}) async {
    final token = (refreshToken ?? _sessionPersistence.refreshToken)?.trim();
    if (token == null || token.isEmpty) {
      throw AuthException(
        requestOptions: RequestOptions(path: '/auth/refresh'),
        message: 'No refresh token available',
        type: DioExceptionType.unknown,
      );
    }
    try {
      final context = await _buildActivityContext('refresh', includeRiskSignals: false);
      final response = await _dio.post(
        '/auth/refresh',
        data: {
          'refreshToken': token,
          if (context.isNotEmpty) 'context': context,
        },
        options: ApiConfig.unauthenticatedOptions(),
      );
      final session = _extractSession(response.data);
      if (session.isNotEmpty) {
        await _sessionPersistence.saveSession(session);
      }
      return session;
    } on DioException catch (error) {
      throw AuthException.fromDio(error);
    } catch (error, stackTrace) {
      throw AuthException(
        requestOptions: RequestOptions(path: '/auth/refresh'),
        message: 'Unable to refresh session',
        error: error,
        stackTrace: stackTrace,
      );
    }
  }

  Future<void> logout({bool remote = true}) async {
    DioException? remoteError;
    if (remote) {
      try {
        await _dio.post(
          '/auth/logout',
          options: Options(
            headers: ApiConfig.defaultHeaders,
            extra: const {'requiresAuth': true},
          ),
        );
      } on DioException catch (error) {
        if (error.response?.statusCode != 401) {
          remoteError = error;
        }
      }
    }
    await _sessionPersistence.clearSession();
    if (remoteError != null) {
      throw AuthException.fromDio(remoteError);
    }
  }

  static Map<String, dynamic> _extractSession(dynamic payload) {
    final envelope = _asJsonMap(payload);
    if (envelope.containsKey('data')) {
      final data = envelope['data'];
      if (data is Map<String, dynamic>) {
        return Map<String, dynamic>.from(data);
      }
      if (data is Map) {
        return Map<String, dynamic>.from(data as Map);
      }
    }
    return envelope;
  }

  static Map<String, dynamic> _asJsonMap(dynamic payload) {
    if (payload is Map<String, dynamic>) {
      return Map<String, dynamic>.from(payload);
    }
    if (payload is Map) {
      return Map<String, dynamic>.from(payload as Map);
    }
    return <String, dynamic>{};
  }

  Future<Map<String, dynamic>> _buildActivityContext(
    String activity, {
    bool includeRiskSignals = true,
  }) async {
    try {
      final context = await _deviceContextService.buildContext(
        activity: activity,
        includeRiskSignals: includeRiskSignals,
      );
      return context;
    } catch (error, stackTrace) {
      debugPrint('Failed to build auth context for $activity: $error');
      debugPrintStack(stackTrace: stackTrace);
      return <String, dynamic>{'activity': activity};
    }
  }
}

final authServiceProvider = Provider<AuthService>((ref) {
  final dio = ref.watch(dioProvider);
  final deviceContext = ref.watch(deviceContextServiceProvider);
  return AuthService(
    dio,
    deviceContextService: deviceContext,
  );
});
