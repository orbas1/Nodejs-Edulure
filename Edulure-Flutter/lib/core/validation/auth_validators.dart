import 'package:collection/collection.dart';

/// Collection of reusable form validators for authentication and identity
/// surfaces. Each validator returns `null` when the provided value is valid
/// and an error message when the input should be rejected.
class AuthValidators {
  const AuthValidators._();

  /// Validates that the value is a non-empty, well-formed email address.
  static String? email(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return 'Enter your email address to continue.';
    }
    final emailPattern =
        RegExp(r'^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$', caseSensitive: false);
    if (!emailPattern.hasMatch(trimmed)) {
      return 'Enter a valid email address (name@example.com).';
    }
    return null;
  }

  /// Validates that the password meets the strong password policy used across
  /// Edulure mobile flows (12+ characters, mixed case, number, symbol).
  static String? strongPassword(String? value) {
    final password = value ?? '';
    if (password.trim().isEmpty) {
      return 'Create a password to secure your account.';
    }
    final pattern =
        RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$');
    if (!pattern.hasMatch(password)) {
      return 'Passwords must be 12+ characters and include upper, lower, number, and symbol.';
    }
    return null;
  }

  /// Ensures that the confirmation password matches the original password.
  static String? confirmPassword(String? value, String original) {
    if (value == null || value.isEmpty) {
      return 'Confirm your password to continue.';
    }
    if (value != original) {
      return 'Passwords do not match.';
    }
    return null;
  }

  /// Validates a required name field.
  static String? requiredName(String? value, {String field = 'field'}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return 'Enter your ' + field + '.';
    }
    if (trimmed.split(' ').where((word) => word.isNotEmpty).length > 5) {
      return 'Keep ' + field + ' names under five words.';
    }
    return null;
  }

  /// Validates an optional age input.
  static String? optionalAge(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return null;
    }
    final age = int.tryParse(trimmed);
    if (age == null) {
      return 'Enter age using numbers only.';
    }
    if (age < 13) {
      return 'Learners must be at least 13 years old.';
    }
    if (age > 120) {
      return 'Enter a real age under 120.';
    }
    return null;
  }

  /// Basic validator for postal/zip codes. Accepts alphanumeric characters
  /// while rejecting obviously invalid inputs.
  static String? optionalPostalCode(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return null;
    }
    final pattern = RegExp(r'^[A-Za-z0-9][A-Za-z0-9\-\s]{1,9}$');
    if (!pattern.hasMatch(trimmed)) {
      return 'Enter a valid postal code (letters, numbers, or dashes).';
    }
    return null;
  }

  /// Ensures a 6 digit one-time passcode when provided.
  static String? optionalOtp(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return null;
    }
    if (!RegExp(r'^\d{6}$').hasMatch(trimmed)) {
      return 'Security codes are six digits.';
    }
    return null;
  }
}
