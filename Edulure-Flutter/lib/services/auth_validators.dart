import 'package:collection/collection.dart';

/// Collection of reusable authentication validators shared across
/// registration, login, and multi-factor prompts. Every validator returns
/// a human-readable error string or `null` when the supplied value is
/// acceptable.
class AuthValidators {
  AuthValidators._();

  static final RegExp _emailPattern = RegExp(
    r'^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$',
    caseSensitive: false,
  );

  static final RegExp _passwordUppercase = RegExp(r'[A-Z]');
  static final RegExp _passwordLowercase = RegExp(r'[a-z]');
  static final RegExp _passwordDigit = RegExp(r'[0-9]');
  static final RegExp _passwordSymbol = RegExp(r'[!@#\\$%^&*(),.?":{}|<>_\\-]');

  /// Validates that the provided [value] represents a syntactically correct
  /// email address. Returns a helpful error message when validation fails.
  static String? email(String? value, {String fieldLabel = 'Email'}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return '$fieldLabel is required';
    }
    if (!_emailPattern.hasMatch(trimmed)) {
      return 'Enter a valid email address';
    }
    return null;
  }

  /// Validates that the supplied password meets the mobile policy: at least
  /// [minLength] characters, and must contain an uppercase character, lowercase
  /// character, digit, and symbol. Mirrors the server-side requirements so
  /// errors surface before the network request is made.
  static String? password(
    String? value, {
    String fieldLabel = 'Password',
    int minLength = 8,
  }) {
    final raw = value ?? '';
    if (raw.isEmpty) {
      return '$fieldLabel is required';
    }
    if (raw.length < minLength) {
      return '$fieldLabel must be at least $minLength characters';
    }
    if (!_passwordUppercase.hasMatch(raw) ||
        !_passwordLowercase.hasMatch(raw) ||
        !_passwordDigit.hasMatch(raw) ||
        !_passwordSymbol.hasMatch(raw)) {
      return '$fieldLabel must include upper & lower case letters, a number, and a symbol';
    }
    return null;
  }

  /// Validates that an optional password confirmation matches the source
  /// password. Returns `null` when the confirmation is either empty and not
  /// required or when it matches the original password.
  static String? confirmPassword(
    String? value,
    String? original, {
    bool required = true,
  }) {
    final confirmation = value ?? '';
    if (confirmation.isEmpty) {
      return required ? 'Confirm your password' : null;
    }
    if (confirmation != original) {
      return 'Passwords do not match';
    }
    return null;
  }

  /// Validates that a multi-factor code contains the expected number of
  /// digits. The value is trimmed to avoid issues with accidental whitespace.
  static String? otp(
    String? value, {
    int length = 6,
    bool required = false,
    String fieldLabel = 'Security code',
  }) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return required ? '$fieldLabel is required' : null;
    }
    final digitsOnly = RegExp('^\\d{$length}\\$');
    if (!digitsOnly.hasMatch(trimmed)) {
      return '$fieldLabel must be $length digits';
    }
    return null;
  }

  /// Validates free-form names (first name, last name, organisation) and
  /// ensures at least two visible characters remain after trimming.
  static String? name(String? value, {String fieldLabel = 'Name'}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return '$fieldLabel is required';
    }
    if (trimmed.characters.length < 2) {
      return 'Enter at least 2 characters';
    }
    return null;
  }

  /// Ensures boolean consent checkboxes have been accepted before proceeding
  /// with registration.
  static String? consentAccepted(bool accepted, {String fieldLabel = 'Terms'}) {
    if (!accepted) {
      return 'You must accept the $fieldLabel to continue';
    }
    return null;
  }
}
