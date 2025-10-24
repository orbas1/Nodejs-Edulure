import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/network/dio_provider.dart';
import '../core/validation/auth_validators.dart';
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
  }) : _sessionPersistence = sessionPersistence ?? _SessionManagerPersistence();

  final Dio _dio;
  final SessionPersistence _sessionPersistence;

  Future<Map<String, dynamic>> login(
    String email,
    String password, {
    String? twoFactorCode,
  }) async {
    final normalizedEmail = AuthFieldValidators.normalizeEmail(email);
    final sanitizedTwoFactor = twoFactorCode?.trim();
    final payload = <String, dynamic>{
      'email': normalizedEmail,
      'password': password,
      if (sanitizedTwoFactor != null && sanitizedTwoFactor.isNotEmpty)
        'twoFactorCode': sanitizedTwoFactor,
    };
    try {
      final response = await _dio.post(
        '/auth/login',
        data: payload,
        options: ApiConfig.unauthenticatedOptions(),
      );
      final session = _extractSession(response.data);
      await _sessionPersistence.saveSession(session);
      await _recordAudit(
        'login',
        status: 'success',
        metadata: {
          'method': 'password',
          'twoFactor': sanitizedTwoFactor?.isNotEmpty == true,
          'profile': AuthFieldValidators.summarizeProfileSnapshot(session),
        },
      );
      return session;
    } on DioException catch (error) {
      await _recordAudit(
        'login',
        status: 'failure',
        metadata: {
          'method': 'password',
          'error': _extractMessage(error.response?.data) ?? error.message,
          'payload': AuthFieldValidators.redactSensitiveMetadata(payload),
        },
      );
      throw AuthException.fromDio(error);
    } catch (error, stackTrace) {
      await _recordAudit(
        'login',
        status: 'failure',
        metadata: {
          'method': 'password',
          'error': error.toString(),
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
    final sanitizedAddress =
        address != null ? AuthFieldValidators.sanitiseAddress(address) : null;
    final payload = <String, dynamic>{
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      'email': AuthFieldValidators.normalizeEmail(email),
      'password': password,
      'role': role,
      if (age != null) 'age': age,
      if (sanitizedAddress != null && sanitizedAddress.isNotEmpty)
        'address': sanitizedAddress,
      'twoFactor': {'enabled': enableTwoFactor},
      if (metadata != null && metadata.isNotEmpty) 'metadata': metadata,
    };
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
      await _recordAudit(
        'register',
        status: 'success',
        metadata: {
          'role': role,
          'twoFactor': enableTwoFactor,
          'profile': AuthFieldValidators.summarizeProfileSnapshot(session),
        },
      );
      return session;
    } on DioException catch (error) {
      await _recordAudit(
        'register',
        status: 'failure',
        metadata: {
          'role': role,
          'twoFactor': enableTwoFactor,
          'error': _extractMessage(error.response?.data) ?? error.message,
          'payload': AuthFieldValidators.redactSensitiveMetadata(payload),
        },
      );
      throw AuthException.fromDio(error);
    } catch (error, stackTrace) {
      await _recordAudit(
        'register',
        status: 'failure',
        metadata: {
          'role': role,
          'twoFactor': enableTwoFactor,
          'error': error.toString(),
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
      throw AuthException(
        requestOptions: RequestOptions(path: '/auth/refresh'),
        message: 'No refresh token available',
        type: DioExceptionType.unknown,
      );
    }
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
      await _recordAudit(
        'refresh',
        status: 'success',
        metadata: {
          'hasSession': session.isNotEmpty,
          'profile': AuthFieldValidators.summarizeProfileSnapshot(session),
        },
      );
      return session;
    } on DioException catch (error) {
      await _recordAudit(
        'refresh',
        status: 'failure',
        metadata: {
          'error': _extractMessage(error.response?.data) ?? error.message,
        },
      );
      throw AuthException.fromDio(error);
    } catch (error, stackTrace) {
      await _recordAudit(
        'refresh',
        status: 'failure',
        metadata: {
          'error': error.toString(),
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
    await _recordAudit(
      'logout',
      status: remoteError == null ? 'success' : 'partial',
      metadata: {
        'remote': remote,
        if (remoteError != null)
          'error': _extractMessage(remoteError.response?.data) ?? remoteError.message,
      },
    );
    if (remoteError != null) {
      throw AuthException.fromDio(remoteError);
    }
  }

  Future<Map<String, dynamic>> beginPasskeyRegistration({
    required String email,
    Map<String, dynamic>? metadata,
  }) async {
    final normalizedEmail = AuthFieldValidators.normalizeEmail(email);
    final sanitizedMetadata = metadata == null
        ? null
        : Map<String, dynamic>.from(metadata)
          ..removeWhere((key, value) => value == null);
    final payload = <String, dynamic>{
      'email': normalizedEmail,
      if (sanitizedMetadata != null && sanitizedMetadata.isNotEmpty)
        'metadata': sanitizedMetadata,
    };
    try {
      final response = await _dio.post(
        '/auth/passkeys/register/begin',
        data: payload,
        options: ApiConfig.unauthenticatedOptions(),
      );
      await _recordAudit(
        'passkey.register',
        status: 'challenge-issued',
        metadata: {
          'email': normalizedEmail,
          if (sanitizedMetadata != null && sanitizedMetadata.isNotEmpty)
            'metadata': AuthFieldValidators.redactSensitiveMetadata(
              sanitizedMetadata,
            ),
        },
      );
      return _asJsonMap(response.data['data'] ?? response.data);
    } on DioException catch (error) {
      await _recordAudit(
        'passkey.register',
        status: 'failure',
        metadata: {
          'stage': 'begin',
          'error': _extractMessage(error.response?.data) ?? error.message,
          'payload': AuthFieldValidators.redactSensitiveMetadata(payload),
        },
      );
      throw AuthException.fromDio(error);
    }
  }

  Future<Map<String, dynamic>> completePasskeyRegistration({
    required Map<String, dynamic> attestation,
  }) async {
    final sanitized = AuthFieldValidators.redactSensitiveMetadata(attestation);
    try {
      final response = await _dio.post(
        '/auth/passkeys/register/complete',
        data: attestation,
        options: ApiConfig.unauthenticatedOptions(),
      );
      await _recordAudit(
        'passkey.register',
        status: 'success',
        metadata: sanitized,
      );
      return _asJsonMap(response.data['data'] ?? response.data);
    } on DioException catch (error) {
      await _recordAudit(
        'passkey.register',
        status: 'failure',
        metadata: {
          'stage': 'complete',
          'error': _extractMessage(error.response?.data) ?? error.message,
          'payload': sanitized,
        },
      );
      throw AuthException.fromDio(error);
    }
  }

  Future<Map<String, dynamic>> loginWithPasskey({
    required Map<String, dynamic> assertion,
  }) async {
    final sanitized = AuthFieldValidators.redactSensitiveMetadata(assertion);
    try {
      final response = await _dio.post(
        '/auth/passkeys/login',
        data: assertion,
        options: ApiConfig.unauthenticatedOptions(),
      );
      final session = _extractSession(response.data);
      if (session.isNotEmpty) {
        await _sessionPersistence.saveSession(session);
      }
      await _recordAudit(
        'login',
        status: 'success',
        metadata: {
          'method': 'passkey',
          'profile': AuthFieldValidators.summarizeProfileSnapshot(session),
        },
      );
      return session;
    } on DioException catch (error) {
      await _recordAudit(
        'login',
        status: 'failure',
        metadata: {
          'method': 'passkey',
          'error': _extractMessage(error.response?.data) ?? error.message,
          'payload': sanitized,
        },
      );
      throw AuthException.fromDio(error);
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

  Future<void> _recordAudit(
    String type, {
    required String status,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      await SessionManager.appendAuthEvent(
        AuthAuditEvent(
          type: type,
          status: status,
          timestamp: DateTime.now(),
          metadata: metadata ?? const <String, dynamic>{},
        ),
      );
    } catch (error, stackTrace) {
      debugPrint('Failed to append auth audit event: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }
}

final authServiceProvider = Provider<AuthService>((ref) {
  final dio = ref.watch(dioProvider);
  return AuthService(dio);
});
