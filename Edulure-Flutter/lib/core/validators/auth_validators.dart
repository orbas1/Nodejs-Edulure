class AuthValidators {
  const AuthValidators._();

  static final RegExp _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
  static final RegExp _passwordPattern =
      RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$');
  static final RegExp _otpPattern = RegExp(r'^\d{6}$');

  static String? requiredField(String? value, {String label = 'This field'}) {
    if (value == null || value.trim().isEmpty) {
      return '$label is required';
    }
    return null;
  }

  static String? email(String? value, {bool required = true}) {
    if (value == null || value.trim().isEmpty) {
      return required ? 'Email is required' : null;
    }
    if (!_emailPattern.hasMatch(value.trim())) {
      return 'Enter a valid email address';
    }
    return null;
  }

  static String? password(String? value, {bool requireComplexity = true}) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (requireComplexity && !_passwordPattern.hasMatch(value)) {
      return 'Use 12+ characters with upper, lower, number and symbol';
    }
    return null;
  }

  static String? confirmPassword(String? value, String? original) {
    if (value == null || value.isEmpty) {
      return 'Confirm your password';
    }
    if (original != value) {
      return 'Passwords do not match';
    }
    return null;
  }

  static String? otp(String? value, {bool required = true}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return required ? 'Enter the six-digit code' : null;
    }
    if (!_otpPattern.hasMatch(trimmed)) {
      return 'Codes must be six digits';
    }
    return null;
  }
}
