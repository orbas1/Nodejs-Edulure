import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/auth_service.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _authService = AuthService();

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _ageController = TextEditingController();
  final _addressController = TextEditingController();

  final _passwordPattern =
      RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$');

  String _role = 'instructor';
  bool _termsAccepted = false;
  bool _loading = false;
  String? _error;
  bool _twoFactorEnabled = false;
  bool _twoFactorLocked = false;
  Map<String, dynamic>? _twoFactorEnrollment;

  static const _twoFactorEnforcedRoles = {'admin'};

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _ageController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _twoFactorLocked = _twoFactorEnforcedRoles.contains(_role);
    _twoFactorEnabled = _twoFactorLocked;
  }

  String _resolveErrorMessage(Object error) {
    if (error is DioException) {
      final response = error.response?.data;
      if (response is Map && response['message'] is String) {
        return response['message'] as String;
      }
      if (response is Map && response['errors'] is List && response['errors'].isNotEmpty) {
        return response['errors'].first.toString();
      }
    }
    return 'We could not complete registration right now. Please try again.';
  }

  String _formatSecret(String secret) {
    return secret.replaceAllMapped(RegExp(r'.{1,4}'), (match) => '${match.group(0)} ').trim();
  }

  Future<void> _showTwoFactorDialog(Map<String, dynamic> enrollment) async {
    final secret = enrollment['secret']?.toString() ?? '';
    final otpauthUrl = enrollment['otpauthUrl']?.toString();
    final issuer = enrollment['issuer']?.toString() ?? 'Edulure';

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        bool copied = false;
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Finish securing your account'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Add this workspace to your authenticator app, then continue to login.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 12),
                  Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(12),
                    child: SelectableText(
                      _formatSecret(secret),
                      textAlign: TextAlign.center,
                      style: const TextStyle(letterSpacing: 2, fontFamily: 'monospace'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (otpauthUrl != null && otpauthUrl.isNotEmpty)
                    SelectableText(
                      otpauthUrl,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: Colors.blueGrey.shade700),
                    ),
                  const SizedBox(height: 12),
                  FilledButton.tonal(
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: secret));
                      setDialogState(() => copied = true);
                    },
                    child: Text(copied ? 'Secret copied' : 'Copy secret'),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Issuer: $issuer',
                    style:
                        Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text('Close'),
                ),
                FilledButton(
                  onPressed: () {
                    Navigator.of(dialogContext).pop();
                    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
                  },
                  child: const Text('Continue to login'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _submit() async {
    final form = _formKey.currentState;
    if (form == null) return;
    if (!form.validate()) {
      return;
    }
    if (!_termsAccepted) {
      setState(() {
        _error = 'You must accept the terms to continue.';
      });
      return;
    }

    final ageInput = _ageController.text.trim();
    int? age;
    if (ageInput.isNotEmpty) {
      age = int.tryParse(ageInput);
      if (age == null) {
        setState(() {
          _error = 'Age must be a number.';
        });
        return;
      }
    }

    setState(() {
      _loading = true;
      _error = null;
      _twoFactorEnrollment = null;
    });

    try {
      final result = await _authService.register(
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
        role: _role,
        age: age,
        address: _addressController.text,
        enableTwoFactor: _twoFactorLocked ? true : _twoFactorEnabled,
      );
      if (!mounted) return;
      final twoFactor = result['twoFactor'];
      final requiresTwoFactor = twoFactor is Map && twoFactor['enabled'] == true;
      setState(() {
        _twoFactorEnrollment = twoFactor is Map<String, dynamic> ? twoFactor : null;
        if (twoFactor is Map && twoFactor['enforced'] == true) {
          _twoFactorLocked = true;
        }
        if (requiresTwoFactor) {
          _twoFactorEnabled = true;
        }
      });
      final verificationStatus = result['verification'] is Map
          ? result['verification']['status']?.toString()
          : null;
      final message = verificationStatus == 'pending'
          ? 'Account created. Check your inbox to verify your email before signing in.'
          : 'Account created successfully.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      if (requiresTwoFactor && twoFactor is Map<String, dynamic>) {
        await _showTwoFactorDialog(twoFactor);
      } else {
        if (!mounted) return;
        Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = _resolveErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create workspace')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Create your Edulure workspace',
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tell us a little about yourself so we can personalise your onboarding.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  if (_error != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.red.shade100),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(
                          color: Colors.red,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _firstNameController,
                          decoration: const InputDecoration(labelText: 'First name'),
                          textInputAction: TextInputAction.next,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'First name is required';
                            }
                            if (value.trim().length < 2) {
                              return 'Enter at least 2 characters';
                            }
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: TextFormField(
                          controller: _lastNameController,
                          decoration: const InputDecoration(labelText: 'Last name'),
                          textInputAction: TextInputAction.next,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Last name is required';
                            }
                            return null;
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _emailController,
                    decoration: const InputDecoration(labelText: 'Email address'),
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Email is required';
                      }
                      final emailPattern = RegExp(r'^.+@.+\..+$');
                      if (!emailPattern.hasMatch(value.trim())) {
                        return 'Enter a valid email address';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _role,
                    decoration: const InputDecoration(labelText: 'Role'),
                    items: const [
                      DropdownMenuItem(value: 'instructor', child: Text('Instructor')),
                      DropdownMenuItem(value: 'user', child: Text('Learner')),
                      DropdownMenuItem(value: 'admin', child: Text('Administrator')),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() {
                        _role = value;
                        final enforced = _twoFactorEnforcedRoles.contains(value);
                        _twoFactorLocked = enforced;
                        if (enforced) {
                          _twoFactorEnabled = true;
                        }
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _ageController,
                    decoration: const InputDecoration(labelText: 'Age (optional)'),
                    keyboardType: TextInputType.number,
                    textInputAction: TextInputAction.next,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return null;
                      }
                      final age = int.tryParse(value.trim());
                      if (age == null) {
                        return 'Age must be a number';
                      }
                      if (age < 16) {
                        return 'Minimum age is 16';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _addressController,
                    decoration: const InputDecoration(labelText: 'Address (optional)'),
                    maxLines: 3,
                    textInputAction: TextInputAction.newline,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    decoration: const InputDecoration(labelText: 'Password'),
                    obscureText: true,
                    textInputAction: TextInputAction.next,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Password is required';
                      }
                      if (!_passwordPattern.hasMatch(value)) {
                        return 'Use 12+ chars with upper, lower, number, and symbol';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _confirmPasswordController,
                    decoration: const InputDecoration(labelText: 'Confirm password'),
                    obscureText: true,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Confirm your password';
                      }
                      if (value != _passwordController.text) {
                        return 'Passwords do not match';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SwitchListTile.adaptive(
                            contentPadding: EdgeInsets.zero,
                            value: _twoFactorLocked ? true : _twoFactorEnabled,
                            onChanged: _twoFactorLocked
                                ? null
                                : (value) {
                                    setState(() {
                                      _twoFactorEnabled = value;
                                    });
                                  },
                            title: const Text('Multi-factor authentication'),
                            subtitle: Text(
                              _twoFactorLocked
                                  ? 'Administrators must use an authenticator app on every login.'
                                  : 'Enable an authenticator challenge to add another layer of protection.',
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _twoFactorLocked
                                ? 'We will display your setup key immediately after registration.'
                                : 'Turn this on to receive your authenticator setup instructions right away.',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (_twoFactorEnrollment?['enabled'] == true) ...[
                    const SizedBox(height: 16),
                    Card(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Authenticator setup',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(color: Theme.of(context).colorScheme.primary),
                            ),
                            const SizedBox(height: 8),
                            SelectableText(
                              _formatSecret(_twoFactorEnrollment?['secret']?.toString() ?? ''),
                              style: const TextStyle(letterSpacing: 2, fontFamily: 'monospace'),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Issuer: ${_twoFactorEnrollment?['issuer'] ?? 'Edulure'}',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: Colors.grey.shade600),
                            ),
                            if (_twoFactorEnrollment?['otpauthUrl'] != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 12),
                                child: SelectableText(
                                  _twoFactorEnrollment?['otpauthUrl']?.toString() ?? '',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(color: Colors.blueGrey.shade600),
                                ),
                              ),
                            const SizedBox(height: 12),
                            FilledButton.tonal(
                              onPressed: () async {
                                final secret = _twoFactorEnrollment?['secret']?.toString() ?? '';
                                if (secret.isEmpty) return;
                                await Clipboard.setData(ClipboardData(text: secret));
                                if (!mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Secret copied to clipboard')),
                                );
                              },
                              child: const Text('Copy secret'),
                            ),
                            const SizedBox(height: 12),
                            FilledButton(
                              onPressed: () {
                                Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
                              },
                              child: const Text('Proceed to secure login'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Checkbox(
                        value: _termsAccepted,
                        onChanged: (value) {
                          setState(() {
                            _termsAccepted = value ?? false;
                          });
                        },
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'I agree to the Edulure terms of use and privacy policy.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _loading ? null : _submit,
                    child: Text(_loading ? 'Creating account…' : 'Create account'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
