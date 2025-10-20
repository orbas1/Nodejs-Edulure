import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/services/api_config.dart';

void main() {
  group('ApiConfig', () {
    test('provides default base URL and headers', () {
      final client = ApiConfig.createHttpClient();
      expect(client.options.baseUrl, apiBaseUrl);
      expect(client.options.headers['X-Client-Platform'], 'mobile');
      expect(client.options.extra['requiresAuth'], isTrue);
    });

    test('unauthenticated options disable auth requirement', () {
      final options = ApiConfig.unauthenticatedOptions();
      expect(options.extra?['requiresAuth'], isFalse);
      expect(options.headers?['X-Requested-With'], 'XMLHttpRequest');
      expect(options.validateStatus?.call(200), isTrue);
    });

    test('createHttpClient honours requiresAuth flag', () {
      final client = ApiConfig.createHttpClient(requiresAuth: false);
      expect(client.options.extra['requiresAuth'], isFalse);
      expect(client.options.connectTimeout, const Duration(seconds: 12));
    });
  });
}
