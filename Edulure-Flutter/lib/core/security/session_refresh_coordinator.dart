import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../telemetry/telemetry_service.dart';
import 'session_manager_facade.dart';

class SessionRefreshCoordinator {
  SessionRefreshCoordinator({
    required Dio refreshClient,
    required SessionManagerFacade sessionManager,
    required TelemetryService telemetry,
    required AppConfig config,
  })  : _refreshClient = refreshClient,
        _sessionManager = sessionManager,
        _telemetry = telemetry,
        _config = config;

  final Dio _refreshClient;
  final SessionManagerFacade _sessionManager;
  final TelemetryService _telemetry;
  final AppConfig _config;

  Future<String?>? _refreshing;

  Future<String?> refresh({bool force = false}) {
    if (!force) {
      final inflight = _refreshing;
      if (inflight != null) {
        return inflight;
      }
    }

    final future = _refreshInternal();
    _refreshing = future;
    return future.whenComplete(() {
      if (identical(_refreshing, future)) {
        _refreshing = null;
      }
    });
  }

  Future<String?> _refreshInternal() async {
    final refreshToken = _sessionManager.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) {
      return null;
    }

    final stopwatch = Stopwatch()..start();
    try {
      final response = await _refreshClient.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(
          extra: const {'requiresAuth': false},
        ),
      );
      stopwatch.stop();
      _telemetry.recordNetworkEvent(
        request: response.requestOptions,
        response: response,
        duration: stopwatch.elapsed,
      );
      final payload = response.data?['data'];
      if (payload is Map<String, dynamic>) {
        await _sessionManager.saveSession(Map<String, dynamic>.from(payload));
        final tokens = payload['tokens'];
        if (tokens is Map<String, dynamic>) {
          final accessToken = tokens['accessToken'];
          if (accessToken is String && accessToken.isNotEmpty) {
            return accessToken;
          }
        }
      }
      return _sessionManager.accessToken;
    } on DioException catch (error) {
      stopwatch.stop();
      _telemetry.recordNetworkEvent(
        request: error.requestOptions,
        error: error,
        duration: stopwatch.elapsed,
      );
      if (_isRefreshRevoked(error.response?.statusCode)) {
        await _sessionManager.clear();
      }
      rethrow;
    } catch (error, stackTrace) {
      stopwatch.stop();
      await _telemetry.captureException(
        error,
        stackTrace: stackTrace,
        context: {
          'phase': 'session_refresh',
          'environment': _config.environment.name,
        },
      );
      rethrow;
    }
  }

  bool _isRefreshRevoked(int? statusCode) {
    if (statusCode == null) {
      return false;
    }
    return statusCode == 401 || statusCode == 403 || statusCode == 419;
  }
}

final sessionRefreshCoordinatorProvider = Provider<SessionRefreshCoordinator>((ref) {
  final config = ref.watch(appConfigProvider);
  final sessionManager = ref.read(sessionManagerFacadeProvider);
  final telemetry = ref.read(telemetryServiceProvider);

  final refreshClient = Dio(
    BaseOptions(
      baseUrl: config.apiBaseUrl,
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 20),
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ),
  );

  return SessionRefreshCoordinator(
    refreshClient: refreshClient,
    sessionManager: sessionManager,
    telemetry: telemetry,
    config: config,
  );
});
