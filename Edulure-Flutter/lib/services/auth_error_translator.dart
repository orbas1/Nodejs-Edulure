import 'package:dio/dio.dart';

/// Utility for mapping Dio exceptions coming from the authentication APIs to
/// user-friendly messages that match copy guidelines across login and
/// registration screens.
class AuthErrorTranslator {
  const AuthErrorTranslator._();

  static String translate(Object error, {String fallback = 'Something went wrong. Please try again.'}) {
    if (error is DioException) {
      final response = error.response?.data;
      if (response is Map) {
        final code = response['code']?.toString();
        if (code == 'PASSWORD_POLICY_VIOLATION') {
          return 'Your password does not meet the latest security requirements.';
        }
        if (response['message'] is String) {
          final message = response['message'] as String;
          if (message.trim().isNotEmpty) {
            return message;
          }
        }
        final errors = response['errors'];
        if (errors is List && errors.isNotEmpty) {
          final first = errors.first?.toString();
          if (first != null && first.isNotEmpty) {
            return first;
          }
        }
      }
      if (error.message != null && error.message!.trim().isNotEmpty) {
        return error.message!;
      }
    }
    return fallback;
  }
}
