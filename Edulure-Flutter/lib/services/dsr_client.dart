import 'dart:async';

import 'package:dio/dio.dart';

import 'api_config.dart';
import 'session_manager.dart';

class DsrClient {
  const DsrClient();

  Future<void> submitRequest({
    required String type,
    required String description,
    Dio? client,
    String? accessToken,
  }) async {
    final token = accessToken ?? SessionManager.getAccessToken();
    if (token == null || token.isEmpty) {
      throw const DsrClientException('Authentication required to submit a privacy request.');
    }

    final dio = client ?? ApiConfig.createHttpClient(requiresAuth: true);
    try {
      await dio.post(
        '/privacy/dsr',
        data: <String, dynamic>{
          'type': type,
          'description': description,
        },
        options: Options(
          headers: {
            ...dio.options.headers,
            'Authorization': 'Bearer $token',
          },
          extra: {
            ...?dio.options.extra,
            'requiresAuth': true,
          },
        ),
      );
    } on DioException catch (error) {
      throw DsrClientException(_resolveErrorMessage(error), cause: error);
    } catch (error) {
      throw DsrClientException('Unable to submit privacy request.', cause: error);
    } finally {
      if (client == null) {
        dio.close();
      }
    }
  }

  String _resolveErrorMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return error.message ?? 'Unable to submit privacy request.';
  }
}

class DsrClientException implements Exception {
  const DsrClientException(this.message, {this.cause});

  final String message;
  final Object? cause;

  @override
  String toString() => 'DsrClientException: $message';
}
