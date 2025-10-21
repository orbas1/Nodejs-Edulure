import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../core/config/app_config.dart';

const _fallbackSecureBaseUrl = 'https://api.edulure.com/v1';
const _fallbackLocalBaseUrl = 'http://localhost:4000/api';

class ApiConfig {
  ApiConfig._();

  static final AppConfig _appConfig = AppConfig.resolve();

  static final String _baseUrl = _resolveBaseUrl();

  static String get baseUrl => _baseUrl;

  static Map<String, String> get defaultHeaders => const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Platform': 'mobile',
        'X-Requested-With': 'XMLHttpRequest',
      };

  static Dio createHttpClient({bool requiresAuth = true}) {
    return Dio(
      BaseOptions(
        baseUrl: _baseUrl,
        connectTimeout: const Duration(seconds: 12),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 30),
        responseType: ResponseType.json,
        listFormat: ListFormat.multiCompatible,
        followRedirects: false,
        validateStatus: (status) => status != null && status >= 200 && status < 400,
        headers: defaultHeaders,
        extra: {
          'requiresAuth': requiresAuth,
        },
      ),
    );
  }

  static Options unauthenticatedOptions({Map<String, dynamic>? extra}) {
    return Options(
      headers: defaultHeaders,
      extra: {
        'requiresAuth': false,
        if (extra != null) ...extra,
      },
      followRedirects: false,
      responseType: ResponseType.json,
      listFormat: ListFormat.multiCompatible,
      validateStatus: (status) => status != null && status >= 200 && status < 400,
    );
  }

  static String _resolveBaseUrl() {
    final override = const String.fromEnvironment('API_BASE_URL', defaultValue: '').trim();
    final candidate = override.isNotEmpty ? override : _appConfig.apiBaseUrl.trim();
    final normalized = _normalize(candidate);
    if (normalized != null) {
      return normalized;
    }
    return kReleaseMode ? _fallbackSecureBaseUrl : _fallbackLocalBaseUrl;
  }

  static String? _normalize(String value) {
    if (value.isEmpty) {
      return null;
    }
    final withScheme = value.contains('://') ? value : 'https://$value';
    Uri? uri;
    try {
      uri = Uri.parse(withScheme);
    } catch (_) {
      return null;
    }
    if (!uri.hasScheme) {
      return null;
    }
    if (uri.scheme != 'https' && uri.scheme != 'http') {
      return null;
    }
    if (uri.scheme == 'http' && kReleaseMode) {
      return uri.replace(scheme: 'https').toString();
    }
    final sanitized = uri.normalizePath();
    return sanitized.toString().replaceAll(RegExp(r'/+$'), '');
  }
}

final String apiBaseUrl = ApiConfig.baseUrl;
