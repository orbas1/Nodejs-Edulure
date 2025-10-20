import 'dart:async';

import 'package:dio/dio.dart';

import 'api_config.dart';
import 'session_manager.dart';

typedef _TokenProvider = String? Function();

class DsrClient {
  const DsrClient({Dio? httpClient, _TokenProvider? tokenProvider})
      : _httpClient = httpClient,
        _tokenProvider = tokenProvider ?? SessionManager.getAccessToken;

  static const String _endpoint = '/compliance/dsr/requests';

  final Dio? _httpClient;
  final _TokenProvider _tokenProvider;
  static const Duration _timeout = Duration(seconds: 12);

  Dio? _clientCache;

  Dio get _client => _httpClient ?? (_clientCache ??= ApiConfig.createHttpClient());

  Future<void> submitRequest({required String type, required String description}) async {
    final token = _tokenProvider();
    if (token == null || token.isEmpty) {
      throw Exception('Authentication required');
    }

    try {
      await _client.post(
        _endpoint,
        data: {
          'type': type,
          'description': description,
        },
        options: Options(
          extra: const {'requiresAuth': true},
          sendTimeout: _timeout,
          receiveTimeout: _timeout,
        ),
      );
    } on DioException catch (error) {
      final status = error.response?.statusCode ?? 0;
      if (status == 409) {
        throw Exception('A data request for this account is already in progress.');
      }
      if (status == 422) {
        final message = error.response?.data is Map
            ? error.response?.data['message']?.toString()
            : null;
        throw Exception(message ?? 'Unable to submit data subject request.');
      }
      final message = error.message ?? 'Unable to submit data subject request.';
      throw Exception(message);
    }
  }
}
