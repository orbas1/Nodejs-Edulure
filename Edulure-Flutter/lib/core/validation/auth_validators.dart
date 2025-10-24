import 'package:collection/collection.dart';

/// Centralised validators for authentication flows so login and registration
/// screens surface consistent copy, error thresholds, and sanitisation.
class AuthFieldValidators {
  const AuthFieldValidators._();

  static final _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
  static final _passwordPattern =
      RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$');
  static final _otpPattern = RegExp(r'^\d{6}$');

  static String normalizeEmail(String value) {
    return value.trim().toLowerCase();
  }

  static String? validateEmail(String? value) {
    final candidate = value?.trim() ?? '';
    if (candidate.isEmpty) {
      return 'Enter the email you use with Edulure.';
    }
    if (!_emailPattern.hasMatch(candidate)) {
      return 'That doesn\'t look like a valid email address yet.';
    }
    return null;
  }

  static String? validatePassword(String? value) {
    final candidate = value ?? '';
    if (candidate.isEmpty) {
      return 'Choose a password with at least 12 characters.';
    }
    if (!_passwordPattern.hasMatch(candidate)) {
      return 'Use 12+ characters with upper, lower, number, and symbol.';
    }
    return null;
  }

  static String? validateExistingPassword(String? value) {
    final candidate = value ?? '';
    if (candidate.isEmpty) {
      return 'Enter your password.';
    }
    return null;
  }

  static String? validateName(String? value, {required String field}) {
    final candidate = value?.trim() ?? '';
    if (candidate.isEmpty) {
      return 'Enter your $field.';
    }
    if (candidate.length < 2) {
      return '$field should be at least 2 characters long.';
    }
    return null;
  }

  static String? validateConfirmation(String? value, {required String original}) {
    if (value == original) {
      return null;
    }
    return 'Passwords must match before continuing.';
  }

  static String? validateOtp(String? value, {bool optional = true}) {
    final candidate = value?.trim() ?? '';
    if (candidate.isEmpty) {
      return optional ? null : 'Enter the six-digit code from your email.';
    }
    if (!_otpPattern.hasMatch(candidate)) {
      return 'Security codes are six digits.';
    }
    return null;
  }

  static Map<String, String> sanitiseAddress(Map<String, String?> address) {
    final cleaned = address.map((key, value) => MapEntry(key, value?.trim()))
      ..removeWhere((key, value) => value == null || value!.isEmpty);
    return cleaned.map((key, value) => MapEntry(key, value!));
  }

  static Map<String, dynamic> redactSensitiveMetadata(Map<String, dynamic>? metadata) {
    if (metadata == null || metadata.isEmpty) {
      return const <String, dynamic>{};
    }
    final redactedKeys = const {
      'password',
      'secret',
      'token',
      'otp',
    };
    final output = <String, dynamic>{};
    metadata.forEach((key, value) {
      if (redactedKeys.contains(key.toLowerCase())) {
        output[key] = '***';
      } else {
        output[key] = value;
      }
    });
    return output;
  }

  static List<String> diffRoles(String? previousRole, String? nextRole) {
    final changes = <String>[];
    if (previousRole == null && nextRole != null) {
      changes.add('assigned:$nextRole');
    } else if (previousRole != null && nextRole == null) {
      changes.add('revoked:$previousRole');
    } else if (previousRole != null && nextRole != null && previousRole != nextRole) {
      changes.addAll([previousRole, nextRole]);
    }
    return changes;
  }

  static String summariseRoleDiff(String? previousRole, String? nextRole) {
    final changes = diffRoles(previousRole, nextRole);
    if (changes.isEmpty) {
      return 'unchanged';
    }
    if (changes.length == 1) {
      return changes.first;
    }
    return changes.join('→');
  }

  static Map<String, dynamic> summarizeProfileSnapshot(Map<String, dynamic>? session) {
    if (session == null) {
      return const <String, dynamic>{};
    }
    final user = session['user'];
    if (user is! Map) {
      return const <String, dynamic>{};
    }
    final normalizedUser = Map<String, dynamic>.from(user as Map)
      ..removeWhere((key, value) => value == null);
    final trackedKeys = const ['id', 'email', 'role', 'status'];
    return Map<String, dynamic>.fromEntries(
      trackedKeys.map((key) => MapEntry(key, normalizedUser[key])),
    )..removeWhere((key, value) => value == null);
  }
}

extension _IterableTrim on Iterable<String?> {
  List<String> whereNotEmpty() {
    return whereNotNull().map((value) => value!.trim()).where((value) => value.isNotEmpty).toList();
  }
}
