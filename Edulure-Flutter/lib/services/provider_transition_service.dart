import 'package:dio/dio.dart';

class ProviderTransitionApiException implements Exception {
  ProviderTransitionApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'ProviderTransitionApiException($statusCode): $message';
}

class ProviderTransitionService {
  ProviderTransitionService(this._dio);

  final Dio _dio;

  Future<List<Map<String, dynamic>>> listAnnouncements({bool includeDetails = true}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/provider-transition/announcements',
        queryParameters: {
          'includeDetails': includeDetails,
        },
      );
      final payload = response.data;
      if (payload is Map<String, dynamic> && payload['data'] is List) {
        return List<Map<String, dynamic>>.from(
          (payload['data'] as List).map((item) => Map<String, dynamic>.from(item as Map)),
        );
      }
      throw ProviderTransitionApiException('Unexpected response structure when listing announcements.');
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      final message = error.response?.data is Map && error.response?.data['message'] is String
          ? error.response?.data['message'] as String
          : error.message ?? 'Unable to load provider transition announcements.';
      throw ProviderTransitionApiException(message, statusCode: status);
    }
  }

  Future<Map<String, dynamic>> getAnnouncementDetail(String slug) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/provider-transition/announcements/$slug');
      final payload = response.data;
      if (payload is Map<String, dynamic> && payload['data'] is Map) {
        return Map<String, dynamic>.from(payload['data'] as Map);
      }
      throw ProviderTransitionApiException('Unexpected response structure when loading announcement detail.');
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      final message = error.response?.data is Map && error.response?.data['message'] is String
          ? error.response?.data['message'] as String
          : error.message ?? 'Unable to load provider transition announcement detail.';
      throw ProviderTransitionApiException(message, statusCode: status);
    }
  }

  Future<void> acknowledge(String slug, Map<String, dynamic> payload) async {
    try {
      await _dio.post(
        '/provider-transition/announcements/$slug/acknowledgements',
        data: payload,
        options: Options(contentType: Headers.jsonContentType),
      );
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      final message = error.response?.data is Map && error.response?.data['message'] is String
          ? error.response?.data['message'] as String
          : error.message ?? 'Unable to submit acknowledgement for provider transition announcement.';
      throw ProviderTransitionApiException(message, statusCode: status);
    }
  }

  Future<void> recordStatus(String slug, Map<String, dynamic> payload) async {
    try {
      await _dio.post(
        '/provider-transition/announcements/$slug/status-updates',
        data: payload,
        options: Options(contentType: Headers.jsonContentType),
      );
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      final message = error.response?.data is Map && error.response?.data['message'] is String
          ? error.response?.data['message'] as String
          : error.message ?? 'Unable to record provider transition status update.';
      throw ProviderTransitionApiException(message, statusCode: status);
    }
  }
}

