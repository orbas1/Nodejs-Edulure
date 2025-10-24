import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import '../core/network/dio_provider.dart';
import '../core/telemetry/telemetry_service.dart';
import 'api_config.dart';
import 'session_manager.dart';

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
    TelemetryService? telemetry,
  })  : _sessionPersistence = sessionPersistence ?? _SessionManagerPersistence(),
        _telemetry = telemetry;

  final Dio _dio;
  final SessionPersistence _sessionPersistence;
  final TelemetryService? _telemetry;

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
    final stopwatch = Stopwatch()..start();
    final twoFactorProvided = twoFactorCode?.trim().isNotEmpty == true;
    try {
      final response = await _dio.post(
        '/auth/login',
        data: payload,
        options: ApiConfig.unauthenticatedOptions(),
      );
      final session = _extractSession(response.data);
      await _sessionPersistence.saveSession(session);
      stopwatch.stop();
      _recordAuthEvent(
        action: 'login',
        success: true,
        duration: stopwatch.elapsed,
        metadata: {
          'twoFactorProvided': twoFactorProvided,
          'userId': _extractUserId(session),
          'role': _extractUserRole(session),
        },
      );
      return session;
    } on DioException catch (error) {
      stopwatch.stop();
      _recordAuthEvent(
        action: 'login',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'twoFactorProvided': twoFactorProvided,
          'statusCode': error.response?.statusCode,
        },
      );
      throw AuthException.fromDio(error);
    } catch (error, stackTrace) {
      stopwatch.stop();
      _recordAuthEvent(
        action: 'login',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'twoFactorProvided': twoFactorProvided,
        },
      );
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
    final stopwatch = Stopwatch()..start();
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
      stopwatch.stop();
      _recordAuthEvent(
        action: 'register',
        success: true,
        duration: stopwatch.elapsed,
        metadata: {
          'role': role,
          'twoFactorEnabled': enableTwoFactor,
          'userId': _extractUserId(session),
        },
      );
      return session;
    } on DioException catch (error) {
      stopwatch.stop();
      _recordAuthEvent(
        action: 'register',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'role': role,
          'twoFactorEnabled': enableTwoFactor,
          'statusCode': error.response?.statusCode,
        },
      );
      throw AuthException.fromDio(error);
    } catch (error, stackTrace) {
      stopwatch.stop();
      _recordAuthEvent(
        action: 'register',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'role': role,
          'twoFactorEnabled': enableTwoFactor,
        },
      );
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
      _recordAuthEvent(
        action: 'refresh',
        success: false,
        metadata: const {
          'reason': 'missing-refresh-token',
        },
      );
      throw AuthException(
        requestOptions: RequestOptions(path: '/auth/refresh'),
        message: 'No refresh token available',
        type: DioExceptionType.unknown,
      );
    }
    final stopwatch = Stopwatch()..start();
    final automatic = refreshToken == null;
    try {
      final response = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': token},
        options: ApiConfig.unauthenticatedOptions(),
      );
      final session = _extractSession(response.data);
      if (session.isNotEmpty) {
        await _sessionPersistence.saveSession(session);
      }
      stopwatch.stop();
      _recordAuthEvent(
        action: 'refresh',
        success: true,
        duration: stopwatch.elapsed,
        metadata: {
          'automatic': automatic,
          'userId': _extractUserId(session),
        },
      );
      return session;
    } on DioException catch (error) {
      stopwatch.stop();
      _recordAuthEvent(
        action: 'refresh',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'automatic': automatic,
          'statusCode': error.response?.statusCode,
        },
      );
      throw AuthException.fromDio(error);
    } catch (error, stackTrace) {
      stopwatch.stop();
      _recordAuthEvent(
        action: 'refresh',
        success: false,
        duration: stopwatch.elapsed,
        metadata: {
          'automatic': automatic,
        },
      );
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
    final stopwatch = Stopwatch()..start();
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
    stopwatch.stop();
    _recordAuthEvent(
      action: 'logout',
      success: remoteError == null,
      duration: stopwatch.elapsed,
      metadata: {
        'remote': remote,
        if (remoteError != null) 'statusCode': remoteError.response?.statusCode,
      },
    );
    if (remoteError != null) {
      throw AuthException.fromDio(remoteError);
    }
  }

  void _recordAuthEvent({
    required String action,
    required bool success,
    Duration? duration,
    Map<String, Object?> metadata = const <String, Object?>{},
  }) {
    final data = <String, Object?>{
      'action': action,
      'success': success,
      if (duration != null) 'durationMs': duration.inMilliseconds,
      ...metadata,
    };
    _telemetry?.recordBreadcrumb(
      category: 'auth',
      message: 'auth.$action.${success ? 'success' : 'failure'}',
      data: data,
      level: success ? SentryLevel.info : SentryLevel.error,
    );
  }

  String? _extractUserId(Map<String, dynamic> session) {
    final user = session['user'];
    if (user is Map && user['id'] != null) {
      return user['id'].toString();
    }
    return null;
  }

  String? _extractUserRole(Map<String, dynamic> session) {
    final user = session['user'];
    if (user is Map && user['role'] != null) {
      return user['role'].toString();
    }
    return null;
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
}

final authServiceProvider = Provider<AuthService>((ref) {
  final dio = ref.watch(dioProvider);
  final telemetry = ref.watch(telemetryServiceProvider);
  return AuthService(
    dio,
    telemetry: telemetry,
  );
});
