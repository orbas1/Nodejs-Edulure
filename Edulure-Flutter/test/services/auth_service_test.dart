import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/services/auth_service.dart';

class _InMemorySessionPersistence implements SessionPersistence {
  Map<String, dynamic>? savedSession;
  bool cleared = false;
  String? manualRefreshToken;

  @override
  Future<void> saveSession(Map<String, dynamic> session) async {
    savedSession = Map<String, dynamic>.from(session);
    final tokens = session['tokens'];
    if (tokens is Map && tokens['refreshToken'] is String) {
      manualRefreshToken = tokens['refreshToken'] as String;
    }
  }

  @override
  Future<void> clearSession() async {
    cleared = true;
    savedSession = null;
  }

  @override
  String? get refreshToken => manualRefreshToken;
}

class _FakeHttpClientAdapter extends HttpClientAdapter {
  _FakeHttpClientAdapter(this._handler);

  final FutureOr<ResponseBody> Function(RequestOptions options, Stream<Uint8List>? stream) _handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future? cancelFuture,
  ) async {
    return await _handler(options, requestStream);
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  group('AuthService', () {
    test('login persists session and trims credentials', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api'));
      dio.httpClientAdapter = _FakeHttpClientAdapter((options, _) async {
        expect(options.path, '/auth/login');
        final payload = options.data as Map<String, dynamic>;
        expect(payload['email'], 'user@example.com');
        expect(payload['password'], 'super-secret');
        return ResponseBody.fromString(
          jsonEncode({
            'data': {
              'user': {'id': 'user-1', 'email': 'user@example.com', 'firstName': 'Test'},
              'tokens': {
                'accessToken': 'access-token',
                'refreshToken': 'refresh-token',
              },
            },
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
      final persistence = _InMemorySessionPersistence();
      final service = AuthService(dio, sessionPersistence: persistence);

      final session = await service.login(' user@example.com ', 'super-secret');

      expect(session['user']['email'], 'user@example.com');
      expect(persistence.savedSession?['user']['id'], 'user-1');
      expect(persistence.refreshToken, 'refresh-token');
    });

    test('login surfaces API error messages as AuthException', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api'));
      dio.httpClientAdapter = _FakeHttpClientAdapter((options, _) async {
        return ResponseBody.fromString(
          jsonEncode({
            'message': 'Invalid credentials',
            'code': 'INVALID_LOGIN',
          }),
          401,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
      final service = AuthService(dio, sessionPersistence: _InMemorySessionPersistence());

      await expectLater(
        () => service.login('user@example.com', 'wrong'),
        throwsA(isA<AuthException>().having((error) => error.message, 'message', contains('Invalid credentials'))),
      );
    });

    test('register persists session when backend returns tokens', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api'));
      dio.httpClientAdapter = _FakeHttpClientAdapter((options, _) async {
        expect(options.path, '/auth/register');
        return ResponseBody.fromString(
          jsonEncode({
            'data': {
              'user': {'id': 'user-1', 'email': 'new@edulure.com'},
              'tokens': {
                'accessToken': 'new-access-token',
                'refreshToken': 'new-refresh-token',
              },
            },
          }),
          201,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
      final persistence = _InMemorySessionPersistence();
      final service = AuthService(dio, sessionPersistence: persistence);

      final session = await service.register(
        firstName: 'New',
        lastName: 'User',
        email: 'new@edulure.com',
        password: 'Secure1!',
        role: 'learner',
      );

      expect(session['tokens']['accessToken'], 'new-access-token');
      expect(persistence.savedSession?['user']['email'], 'new@edulure.com');
    });

    test('refreshSession uses stored refresh token when none provided', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api'));
      final persistence = _InMemorySessionPersistence()..manualRefreshToken = 'stored-refresh';
      dio.httpClientAdapter = _FakeHttpClientAdapter((options, _) async {
        expect(options.path, '/auth/refresh');
        final body = options.data as Map<String, dynamic>;
        expect(body['refreshToken'], 'stored-refresh');
        return ResponseBody.fromString(
          jsonEncode({
            'data': {
              'user': {'id': 'user-1'},
              'tokens': {
                'accessToken': 'new-access',
                'refreshToken': 'stored-refresh',
              },
            },
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
      final service = AuthService(dio, sessionPersistence: persistence);

      final refreshed = await service.refreshSession();

      expect(refreshed['tokens']['accessToken'], 'new-access');
      expect(persistence.savedSession?['tokens']['accessToken'], 'new-access');
    });

    test('logout clears local session and propagates remote errors', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api'));
      final persistence = _InMemorySessionPersistence();
      dio.httpClientAdapter = _FakeHttpClientAdapter((options, _) async {
        return ResponseBody.fromString(
          jsonEncode({'message': 'Server unavailable'}),
          503,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
      final service = AuthService(dio, sessionPersistence: persistence);

      await expectLater(
        () => service.logout(),
        throwsA(isA<AuthException>().having((error) => error.message, 'message', contains('Server unavailable'))),
      );
      expect(persistence.cleared, isTrue);
    });
  });
}
