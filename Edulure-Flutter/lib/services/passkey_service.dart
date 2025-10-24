import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:passkeys/authenticator.dart';
import 'package:passkeys/types.dart';

import '../core/network/dio_provider.dart';
import 'api_config.dart';
import 'session_manager.dart';

class PasskeyService {
  PasskeyService(
    this._dio, {
    PasskeyAuthenticator? authenticator,
  }) : _authenticator = authenticator ?? PasskeyAuthenticator(debugMode: kDebugMode);

  final Dio _dio;
  final PasskeyAuthenticator _authenticator;

  Future<bool> isAvailable() async {
    try {
      final availability = await _authenticator.getAvailability().android();
      return availability.hasPasskeySupport == true;
    } catch (_) {
      try {
        final availability = await _authenticator.getAvailability().iOS();
        return availability.hasPasskeySupport == true;
      } catch (_) {
        try {
          final availability = await _authenticator.getAvailability().web();
          return availability.hasPasskeySupport == true;
        } catch (_) {
          return false;
        }
      }
    }
  }

  Future<Map<String, dynamic>> loginWithPasskey({String? email}) async {
    final payload = <String, dynamic>{
      if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
    };
    try {
      final optionsResponse = await _dio.post(
        '/auth/passkeys/login/options',
        data: payload.isNotEmpty ? payload : null,
        options: ApiConfig.unauthenticatedOptions(),
      );
      final envelope = _asJsonMap(optionsResponse.data);
      final requestId = envelope['requestId']?.toString();
      final requestMap = _asJsonMap(envelope['options']);
      if (requestId == null || requestId.isEmpty || requestMap.isEmpty) {
        throw const FormatException('Passkey login request missing requestId or options');
      }
      final request = _buildAuthenticateRequest(requestMap);
      final credential = await _authenticator.authenticate(request);
      final verificationResponse = await _dio.post(
        '/auth/passkeys/login/complete',
        data: {
          'requestId': requestId,
          'response': credential.toJson(),
        },
        options: ApiConfig.unauthenticatedOptions(),
      );
      final session = _extractSession(verificationResponse.data);
      if (session.isNotEmpty) {
        await SessionManager.saveSession(session);
      }
      return session;
    } on DioException catch (error) {
      throw _wrapDio('Unable to complete passkey login', error);
    } on AuthenticatorException catch (error) {
      throw PasskeyAuthFlowException(message: error.toString(), cause: error);
    } on FormatException catch (error, stackTrace) {
      throw PasskeyAuthFlowException(message: error.message, stackTrace: stackTrace);
    }
  }

  Future<void> registerPasskey({Map<String, dynamic>? metadata}) async {
    try {
      final optionsResponse = await _dio.post(
        '/auth/passkeys/register/options',
        data: metadata,
        options: Options(
          headers: ApiConfig.defaultHeaders,
          extra: const {'requiresAuth': true},
        ),
      );
      final envelope = _asJsonMap(optionsResponse.data);
      final requestId = envelope['requestId']?.toString();
      final requestMap = _asJsonMap(envelope['options']);
      if (requestId == null || requestId.isEmpty || requestMap.isEmpty) {
        throw const FormatException('Passkey registration request missing requestId or options');
      }
      final request = _buildRegisterRequest(requestMap);
      final response = await _authenticator.register(request);
      await _dio.post(
        '/auth/passkeys/register/complete',
        data: {
          'requestId': requestId,
          'response': _serializeRegisterResponse(response),
        },
        options: Options(
          headers: ApiConfig.defaultHeaders,
          extra: const {'requiresAuth': true},
        ),
      );
    } on DioException catch (error) {
      throw _wrapDio('Unable to complete passkey registration', error);
    } on AuthenticatorException catch (error) {
      throw PasskeyAuthFlowException(message: error.toString(), cause: error);
    } on FormatException catch (error, stackTrace) {
      throw PasskeyAuthFlowException(message: error.message, stackTrace: stackTrace);
    }
  }

  Future<void> cancelCurrentOperation() {
    return _authenticator.cancelCurrentAuthenticatorOperation();
  }

  Map<String, dynamic> _serializeRegisterResponse(RegisterResponseType response) {
    return {
      'id': response.id,
      'rawId': response.rawId,
      'clientDataJSON': response.clientDataJSON,
      'attestationObject': response.attestationObject,
      'transports': response.transports.map((value) => value?.toString()).toList(),
    };
  }

  RegisterRequestType _buildRegisterRequest(Map<String, dynamic> data) {
    final relyingParty = RelyingPartyType.fromJson(_asJsonMap(data['relyingParty']));
    final user = UserType.fromJson(_asJsonMap(data['user']));
    final excludeCredentials = (data['excludeCredentials'] as List?)
            ?.map((item) => CredentialType.fromJson(_asJsonMap(item)))
            .toList() ??
        const <CredentialType>[];
    final authSelection = data['authenticatorSelection'] == null
        ? null
        : AuthenticatorSelectionType.fromJson(_asJsonMap(data['authenticatorSelection']));
    final pubKeyCredParams = (data['pubKeyCredParams'] as List?)
        ?.map((item) => PubKeyCredParamType.fromJson(_asJsonMap(item)))
        .toList();
    final timeout = (data['timeout'] as num?)?.toInt();
    final attestation = data['attestation']?.toString();
    return RegisterRequestType(
      challenge: data['challenge']?.toString() ?? '',
      relyingParty: relyingParty,
      user: user,
      excludeCredentials: excludeCredentials,
      authSelectionType: authSelection,
      pubKeyCredParams: pubKeyCredParams,
      timeout: timeout,
      attestation: attestation,
    );
  }

  AuthenticateRequestType _buildAuthenticateRequest(Map<String, dynamic> data) {
    final allowCredentials = (data['allowCredentials'] as List?)
        ?.map((item) => CredentialType.fromJson(_asJsonMap(item)))
        .toList();
    final timeout = (data['timeout'] as num?)?.toInt();
    final userVerification = data['userVerification']?.toString();
    final mediation = _parseMediation(data['mediation']);
    final preferImmediate = data['preferImmediatelyAvailableCredentials'] == true;
    final relyingPartyId = data['relyingPartyId']?.toString() ?? data['rpId']?.toString() ?? '';
    return AuthenticateRequestType(
      relyingPartyId: relyingPartyId,
      challenge: data['challenge']?.toString() ?? '',
      mediation: mediation,
      preferImmediatelyAvailableCredentials: preferImmediate,
      timeout: timeout,
      userVerification: userVerification,
      allowCredentials: allowCredentials,
    );
  }

  MediationType _parseMediation(dynamic value) {
    final normalized = value?.toString().toLowerCase() ?? '';
    switch (normalized) {
      case 'required':
        return MediationType.Required;
      case 'silent':
        return MediationType.Silent;
      case 'conditional':
        return MediationType.Conditional;
      default:
        return MediationType.Optional;
    }
  }

  Map<String, dynamic> _extractSession(dynamic payload) {
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

  Map<String, dynamic> _asJsonMap(dynamic payload) {
    if (payload is Map<String, dynamic>) {
      return Map<String, dynamic>.from(payload);
    }
    if (payload is Map) {
      return Map<String, dynamic>.from(payload as Map);
    }
    return <String, dynamic>{};
  }

  PasskeyAuthFlowException _wrapDio(String message, DioException error) {
    return PasskeyAuthFlowException(
      message: message,
      cause: error,
      stackTrace: error.stackTrace,
    );
  }
}

class PasskeyAuthFlowException implements Exception {
  const PasskeyAuthFlowException({
    required this.message,
    this.cause,
    this.stackTrace,
  });

  final String message;
  final Object? cause;
  final StackTrace? stackTrace;

  @override
  String toString() => 'PasskeyAuthFlowException(message: $message, cause: $cause)';
}

final passkeyServiceProvider = Provider<PasskeyService>((ref) {
  final dio = ref.watch(dioProvider);
  return PasskeyService(dio);
});
