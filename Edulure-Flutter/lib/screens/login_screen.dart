import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/feature_flags/feature_flag_notifier.dart';
import '../services/auth_service.dart';
import '../services/session_manager.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _twoFactorController = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _twoFactorRequired = false;
  bool _showTwoFactorField = false;

  static const _otpStepSeconds = 30;

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
    return 'Unable to authenticate. Please check your credentials.';
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _twoFactorController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final authService = ref.read(authServiceProvider);
      final session = await authService.login(
        _emailController.text.trim(),
        _passwordController.text,
        twoFactorCode: _showTwoFactorField ? _twoFactorController.text.trim() : null,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Welcome back ${session['user']['firstName'] ?? ''}!')),
      );
      setState(() {
        _twoFactorController.clear();
        _twoFactorRequired = false;
        _showTwoFactorField = false;
      });
      // refresh feature flags in case role-based experiments toggled after sign-in
      unawaited(ref.read(featureFlagControllerProvider.notifier).refresh(force: true));
      Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
    } catch (error) {
      if (!mounted) return;
      if (error is DioException) {
        final response = error.response?.data;
        final code = response is Map ? response['code']?.toString() : null;
        if (code == 'TWO_FACTOR_REQUIRED') {
          setState(() {
            _twoFactorRequired = true;
            _showTwoFactorField = true;
            _error = 'Enter the code from your authenticator app to continue.';
          });
          return;
        }
        if (code == 'TWO_FACTOR_INVALID') {
          setState(() {
            _twoFactorRequired = true;
            _showTwoFactorField = true;
            _error = 'The security code you entered is invalid or expired.';
          });
          return;
        }
        if (code == 'TWO_FACTOR_SETUP_REQUIRED') {
          setState(() {
            _twoFactorRequired = true;
            _showTwoFactorField = true;
            _error = 'Your role requires multi-factor authentication. Complete setup before signing in.';
          });
          return;
        }
      }
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
    final session = SessionManager.getSession();
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (session != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      'Signed in as ${session['user']['email']}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _passwordController,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                ),
                const SizedBox(height: 12),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: _showTwoFactorField
                      ? Column(
                          key: const ValueKey('twoFactor'),
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Container(
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                                ),
                              ),
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Multi-factor verification',
                                    style: Theme.of(context)
                                        .textTheme
                                        .labelLarge
                                        ?.copyWith(color: Theme.of(context).colorScheme.primary),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Enter the ${_twoFactorRequired ? '' : 'optional '}code generated by your authenticator app. Codes refresh every $_otpStepSeconds seconds.',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _twoFactorController,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'Authenticator code',
                                helperText:
                                    _twoFactorRequired ? 'Required to complete login' : '6-digit code from your authenticator',
                              ),
                              inputFormatters: const [FilteringTextInputFormatter.digitsOnly],
                              maxLength: 6,
                              buildCounter: (_, {required int currentLength, required bool isFocused, int? maxLength}) => null,
                            ),
                          ],
                        )
                      : Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton(
                            onPressed: () {
                              setState(() {
                                _showTwoFactorField = true;
                              });
                            },
                            child: const Text('Have an authenticator code?'),
                          ),
                        ),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600),
                    ),
                  ),
                FilledButton(
                  onPressed: _loading ? null : _login,
                  child: Text(_loading ? 'Authenticating…' : 'Login securely'),
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text('Forgot password?'),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
