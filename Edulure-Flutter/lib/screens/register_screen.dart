import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/feature_flags/feature_flag_notifier.dart';
import '../services/auth_service.dart';
import '../services/auth_validators.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _ageController = TextEditingController();
  final _streetAddressController = TextEditingController();
  final _addressLine2Controller = TextEditingController();
  final _townController = TextEditingController();
  final _cityController = TextEditingController();
  final _countryController = TextEditingController();
  final _postcodeController = TextEditingController();

  String _role = 'instructor';
  bool _termsAccepted = false;
  bool _loading = false;
  String? _error;
  bool _twoFactorEnabled = false;
  bool _twoFactorLocked = false;
  Map<String, dynamic>? _twoFactorEnrollment;

  static const _twoFactorEnforcedRoles = {'admin'};

  @override
  void initState() {
    super.initState();
    _twoFactorLocked = _twoFactorEnforcedRoles.contains(_role);
    _twoFactorEnabled = _twoFactorLocked;
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _ageController.dispose();
    _streetAddressController.dispose();
    _addressLine2Controller.dispose();
    _townController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    _postcodeController.dispose();
    super.dispose();
  }

  bool _isTwoFactorLocked(Map<String, bool> flags, String role) {
    if (_twoFactorEnforcedRoles.contains(role)) {
      return true;
    }
    if (flags['mobile.forceMfa.all'] == true) {
      return true;
    }
    final roleKey = 'mobile.forceMfa.$role';
    return flags[roleKey] == true;
  }

  void _applyTwoFactorPolicy(Map<String, bool> flags) {
    final shouldLock = _isTwoFactorLocked(flags, _role);
    if (shouldLock != _twoFactorLocked) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        setState(() {
          _twoFactorLocked = shouldLock;
          if (_twoFactorLocked) {
            _twoFactorEnabled = true;
          }
        });
      });
    }
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
                    'Add this Learnspace to your authenticator app, then continue to login.',
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
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
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
    final consentError = AuthValidators.consentAccepted(
      _termsAccepted,
      fieldLabel: 'Terms of Service and Privacy Policy',
    );
    if (consentError != null) {
      setState(() {
        _error = consentError;
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
      final authService = ref.read(authServiceProvider);
      final address = <String, String>{};
      void addAddressField(String key, TextEditingController controller) {
        final value = controller.text.trim();
        if (value.isNotEmpty) {
          address[key] = value;
        }
      }

      addAddressField('streetAddress', _streetAddressController);
      addAddressField('addressLine2', _addressLine2Controller);
      addAddressField('town', _townController);
      addAddressField('city', _cityController);
      addAddressField('country', _countryController);
      addAddressField('postcode', _postcodeController);

      final result = await authService.register(
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
        role: _role,
        age: age,
        address: address.isEmpty ? null : address,
        enableTwoFactor: _twoFactorLocked ? true : _twoFactorEnabled,
      );
      if (!mounted) return;
      final twoFactor = result['twoFactor'];
      final requiresTwoFactor = twoFactor is Map && twoFactor['enabled'] == true;
      setState(() {
        _twoFactorEnrollment = twoFactor is Map<String, dynamic> ? Map<String, dynamic>.from(twoFactor as Map) : null;
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
      unawaited(ref.read(featureFlagControllerProvider.notifier).refresh(force: true));
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
    final flagState = ref.watch(featureFlagControllerProvider);
    final flags = flagState.maybeWhen(
      data: (value) => value,
      orElse: () => const <String, bool>{},
    );
    _applyTwoFactorPolicy(flags);

    return Scaffold(
      appBar: AppBar(title: const Text('Create Learnspace')),
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
                    'Create your Edulure Learnspace',
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
                          validator: (value) =>
                              AuthValidators.name(value, fieldLabel: 'First name'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: TextFormField(
                          controller: _lastNameController,
                          decoration: const InputDecoration(labelText: 'Last name'),
                          textInputAction: TextInputAction.next,
                          validator: (value) =>
                              AuthValidators.name(value, fieldLabel: 'Last name'),
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
                    validator: (value) =>
                        AuthValidators.email(value, fieldLabel: 'Email address'),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _role,
                    decoration: const InputDecoration(labelText: 'Role'),
                    items: const [
                      DropdownMenuItem(value: 'instructor', child: Text('Instructor')),
                      DropdownMenuItem(value: 'user', child: Text('Learner')),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() {
                        _role = value;
                        final enforced = _isTwoFactorLocked(flags, value);
                        _twoFactorLocked = enforced;
                        if (enforced) {
                          _twoFactorEnabled = true;
                        }
                      });
                    },
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Need administrator access? Contact your organisation\'s Edulure operations representative to provision it securely.',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: Colors.blueGrey.shade500),
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
                  const SizedBox(height: 16),
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.blueGrey.shade100),
                      color: Colors.white,
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Address (optional)',
                          style: Theme.of(context)
                              .textTheme
                              .titleSmall
                              ?.copyWith(color: Colors.blueGrey.shade700, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Separate fields help us tailor onboarding and compliance guidance to your location.',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: Colors.blueGrey.shade500),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _streetAddressController,
                          decoration: const InputDecoration(labelText: 'Street address'),
                          textInputAction: TextInputAction.next,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _addressLine2Controller,
                          decoration: const InputDecoration(labelText: 'Address line 2'),
                          textInputAction: TextInputAction.next,
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _townController,
                                decoration: const InputDecoration(labelText: 'Town'),
                                textInputAction: TextInputAction.next,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                controller: _cityController,
                                decoration: const InputDecoration(labelText: 'City'),
                                textInputAction: TextInputAction.next,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _countryController,
                                decoration: const InputDecoration(labelText: 'Country'),
                                textInputAction: TextInputAction.next,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                controller: _postcodeController,
                                decoration: const InputDecoration(labelText: 'Postcode'),
                                textInputAction: TextInputAction.next,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    decoration: const InputDecoration(labelText: 'Password'),
                    obscureText: true,
                    textInputAction: TextInputAction.next,
                    validator: (value) => AuthValidators.password(
                      value,
                      fieldLabel: 'Password',
                      minLength: 12,
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _confirmPasswordController,
                    decoration: const InputDecoration(labelText: 'Confirm password'),
                    obscureText: true,
                    validator: (value) => AuthValidators.confirmPassword(
                      value,
                      _passwordController.text,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile.adaptive(
                    title: const Text('Enable multi-factor authentication'),
                    subtitle: Text(
                      _twoFactorLocked
                          ? 'Required for this role to protect sensitive operations.'
                          : 'Add a security layer with an authenticator app.',
                    ),
                    value: _twoFactorEnabled || _twoFactorLocked,
                    onChanged: _twoFactorLocked
                        ? null
                        : (value) {
                            setState(() {
                              _twoFactorEnabled = value;
                            });
                          },
                  ),
                  const SizedBox(height: 12),
                  CheckboxListTile(
                    value: _termsAccepted,
                    onChanged: (value) {
                      setState(() {
                        _termsAccepted = value ?? false;
                      });
                    },
                    title: const Text('I agree to the Terms of Service and Privacy Policy'),
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _loading ? null : _submit,
                    child: _loading
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Create account'),
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
