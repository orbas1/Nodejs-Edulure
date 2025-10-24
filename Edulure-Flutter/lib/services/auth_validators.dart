class AuthValidators {
  const AuthValidators._();

  static final RegExp _emailPattern = RegExp(r"^[^\s@]+@[^\s@]+\.[^\s@]+$");
  static final RegExp _passwordComplexityPattern =
      RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$');

  static String? name(String? value, {required String fieldLabel, int minLength = 2}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return '$fieldLabel is required';
    }
    if (trimmed.length < minLength) {
      return 'Enter at least $minLength characters';
    }
    return null;
  }

  static String? email(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return 'Email is required';
    }
    if (!_emailPattern.hasMatch(trimmed)) {
      return 'Enter a valid email address';
    }
    return null;
  }

  static String? password(
    String? value, {
    bool requireComplexity = true,
    int minLength = 12,
  }) {
    final raw = value ?? '';
    if (raw.isEmpty) {
      return 'Password is required';
    }
    if (requireComplexity && !_passwordComplexityPattern.hasMatch(raw)) {
      return 'Use $minLength+ chars with upper, lower, number, and symbol';
    }
    if (!requireComplexity && raw.length < minLength) {
      return 'Use at least $minLength characters';
    }
    return null;
  }

  static String? confirmPassword(String? value, String original) {
    final raw = value ?? '';
    if (raw.isEmpty) {
      return 'Confirm your password';
    }
    if (raw != original) {
      return 'Passwords do not match';
    }
    return null;
  }

  static String? optionalAge(String? value, {int minimumAge = 16}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return null;
    }
    final parsed = int.tryParse(trimmed);
    if (parsed == null) {
      return 'Age must be a number';
    }
    if (parsed < minimumAge) {
      return 'Minimum age is $minimumAge';
    }
    return null;
  }

  static String? twoFactorCode(
    String? value, {
    bool required = false,
    int length = 6,
  }) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return required ? 'Enter the security code we sent you' : null;
    }
    if (trimmed.length != length) {
      return 'Codes must be $length digits';
    }
    if (!RegExp(r'^\d+$').hasMatch(trimmed)) {
      return 'Codes must contain numbers only';
    }
    return null;
  }
}
