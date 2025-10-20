import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';

import '../config/app_config.dart';
import '../telemetry/telemetry_service.dart';
import '../security/session_manager_facade.dart';
import '../security/session_refresh_coordinator.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/telemetry_interceptor.dart';

final dioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);
  final telemetry = ref.watch(telemetryServiceProvider);
  final sessionManager = ref.read(sessionManagerFacadeProvider);
  final refreshCoordinator = ref.read(sessionRefreshCoordinatorProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: config.apiBaseUrl,
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ),
  );

  dio.interceptors.addAll([
    AuthInterceptor(
      sessionManager: sessionManager,
      refreshCoordinator: refreshCoordinator,
      httpClient: dio,
    ),
    TelemetryInterceptor(telemetry),
    if (config.enableNetworkLogging)
      PrettyDioLogger(
        requestBody: true,
        responseBody: true,
        requestHeader: false,
        compact: true,
      ),
  ]);

  return dio;
});
