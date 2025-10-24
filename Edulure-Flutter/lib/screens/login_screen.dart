import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uni_links/uni_links.dart';

import '../core/feature_flags/feature_flag_notifier.dart';
import '../services/auth_service.dart';
import '../services/auth_validators.dart';
import '../services/passkey_service.dart';
import '../services/session_manager.dart';

enum _LoginMode { password, magicLink }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _twoFactorController = TextEditingController();
  AutovalidateMode _autovalidateMode = AutovalidateMode.disabled;
  bool _loading = false;
  String? _error;
  bool _twoFactorRequired = false;
  bool _showTwoFactorField = false;
  bool _passkeyAvailable = false;
  bool _passkeyLoading = false;
  bool _enrollingPasskey = false;
  bool _magicLinkSent = false;
  int _magicLinkCountdown = 0;
  Timer? _magicLinkTimer;
  StreamSubscription<Uri?>? _linkSubscription;
  _LoginMode _mode = _LoginMode.password;

  static const _otpTtlMinutes = 5;
  static const Duration _magicLinkCooldown = Duration(seconds: 90);

  @override
  void initState() {
    super.initState();
    _checkPasskeyAvailability();
    _initMagicLinkListener();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _twoFactorController.dispose();
    _magicLinkTimer?.cancel();
    _linkSubscription?.cancel();
    super.dispose();
  }

  Future<void> _checkPasskeyAvailability() async {
    final service = ref.read(passkeyServiceProvider);
    final available = await service.isAvailable();
    if (mounted) {
      setState(() {
        _passkeyAvailable = available;
      });
    }
  }

  Future<void> _initMagicLinkListener() async {
    try {
      final initialUri = await getInitialUri();
      if (initialUri != null) {
        unawaited(_handleMagicLinkUri(initialUri));
      }
    } catch (_) {
      // ignore invalid initial URIs
    }
    _linkSubscription = uriLinkStream.listen((uri) {
      if (uri != null) {
        unawaited(_handleMagicLinkUri(uri));
      }
    }, onError: (Object _) {
      if (!mounted || _error != null) {
        return;
      }
      setState(() {
        _error =
            'We could not open the magic link. Try again or sign in with your password.';
      });
    });
  }

  Future<void> _handleMagicLinkUri(Uri uri) async {
    final lowerPath = uri.path.toLowerCase();
    final isMagicLinkPath = lowerPath.contains('magic') ||
        uri.pathSegments.contains('magic-link');
    final token = uri.queryParameters['token'] ??
        (uri.pathSegments.isNotEmpty ? uri.pathSegments.last : '');
    if (!isMagicLinkPath || token.isEmpty) {
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final authService = ref.read(authServiceProvider);
      final session = await authService.authenticateWithMagicLink(token);
      if (!mounted) return;
      _magicLinkTimer?.cancel();
      final user = session['user'];
      final firstName = user is Map ? user['firstName']?.toString() : null;
      final displayName = (firstName?.isNotEmpty ?? false) ? firstName! : 'there';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Signed in via magic link, welcome $displayName!')),
      );
      setState(() {
        _mode = _LoginMode.password;
        _magicLinkSent = false;
        _magicLinkCountdown = 0;
        _twoFactorRequired = false;
        _showTwoFactorField = false;
        _twoFactorController.clear();
      });
      unawaited(
        ref.read(featureFlagControllerProvider.notifier).refresh(force: true),
      );
      Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
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

  void _startMagicLinkCountdown([Duration duration = _magicLinkCooldown]) {
    _magicLinkTimer?.cancel();
    setState(() {
      _magicLinkCountdown = duration.inSeconds;
    });
    _magicLinkTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        if (_magicLinkCountdown <= 1) {
          _magicLinkCountdown = 0;
          timer.cancel();
        } else {
          _magicLinkCountdown -= 1;
        }
      });
    });
  }

  String _resolveErrorMessage(Object error) {
    if (error is PasskeyAuthFlowException) {
      return error.message;
    }
    if (error is FormatException) {
      return error.message;
    }
    if (error is DioException) {
      final response = error.response?.data;
      if (response is Map && response['message'] is String) {
        return response['message'] as String;
      }
      if (response is Map &&
          response['errors'] is List &&
          response['errors'].isNotEmpty) {
        return response['errors'].first.toString();
      }
      if (error.message != null && error.message!.isNotEmpty) {
        return error.message!;
      }
    }
    return 'Unable to authenticate. Please check your credentials.';
  }

  Future<void> _sendMagicLink() async {
    final emailError = AuthValidators.email(_emailController.text);
    if (emailError != null) {
      setState(() {
        _autovalidateMode = AutovalidateMode.onUserInteraction;
        _error = emailError;
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final authService = ref.read(authServiceProvider);
      await authService.requestMagicLink(_emailController.text);
      if (!mounted) return;
      setState(() {
        _magicLinkSent = true;
        _autovalidateMode = AutovalidateMode.onUserInteraction;
      });
      _startMagicLinkCountdown();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'We sent a secure sign-in link to ${_emailController.text.trim()}.',
          ),
        ),
      );
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

  Future<void> _login() async {
    final form = _formKey.currentState;
    if (form != null && !form.validate()) {
      setState(() {
        _autovalidateMode = AutovalidateMode.onUserInteraction;
        _error = null;
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final authService = ref.read(authServiceProvider);
      final session = await authService.login(
        _emailController.text.trim(),
        _passwordController.text,
        twoFactorCode:
            _showTwoFactorField ? _twoFactorController.text.trim() : null,
      );
      if (!mounted) return;
      final user = session['user'];
      final firstName = user is Map ? user['firstName']?.toString() : null;
      final displayName = (firstName?.isNotEmpty ?? false) ? firstName : 'there';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Welcome back $displayName!')),
      );
      setState(() {
        _twoFactorController.clear();
        _twoFactorRequired = false;
        _showTwoFactorField = false;
      });
      unawaited(
        ref.read(featureFlagControllerProvider.notifier).refresh(force: true),
      );
      Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
    } catch (error) {
      if (!mounted) return;
      if (error is DioException) {
        final response = error.response?.data;
        final code = response is Map ? response['code']?.toString() : null;
        if (code == 'TWO_FACTOR_REQUIRED') {
          setState(() {
            _twoFactorRequired = true;
            _showTwoFactorField = true;
            final details = response is Map ? response['details'] as Map? : null;
            final delivered = details?['delivered'] == true;
            _error = delivered
                ? 'We emailed you a six-digit security code. Enter it to continue.'
                : 'A sign-in code was recently sent. Check your inbox and try again shortly.';
          });
          return;
        }
        if (code == 'TWO_FACTOR_INVALID') {
          setState(() {
            _twoFactorRequired = true;
            _showTwoFactorField = true;
            _error =
                'The email security code you entered is invalid or expired.';
          });
          return;
        }
        if (code == 'TWO_FACTOR_SETUP_REQUIRED') {
          setState(() {
            _twoFactorRequired = true;
            _showTwoFactorField = true;
            _error =
                'Your role requires email-based multi-factor authentication. Complete setup before signing in.';
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

  Future<void> _loginWithPasskey() async {
    setState(() {
      _loading = true;
      _passkeyLoading = true;
      _error = null;
    });
    try {
      final passkeyService = ref.read(passkeyServiceProvider);
      final session = await passkeyService.loginWithPasskey(
        email: _emailController.text.trim().isNotEmpty
            ? _emailController.text.trim()
            : null,
      );
      if (!mounted) return;
      final user = session['user'];
      final firstName = user is Map ? user['firstName']?.toString() : null;
      final displayName = (firstName?.isNotEmpty ?? false) ? firstName : 'there';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Signed in with your passkey, welcome $displayName!')),
      );
      unawaited(
        ref.read(featureFlagControllerProvider.notifier).refresh(force: true),
      );
      Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = _resolveErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _passkeyLoading = false;
        });
      }
    }
  }

  Future<void> _enrollPasskey(Map<String, dynamic> session) async {
    setState(() {
      _enrollingPasskey = true;
      _error = null;
    });
    try {
      final passkeyService = ref.read(passkeyServiceProvider);
      final user = session['user'];
      final displayName = user is Map ? user['firstName']?.toString() : null;
      final metadata = {
        if (displayName != null && displayName.isNotEmpty) 'displayName': displayName,
        if (user is Map && user['id'] != null) 'userId': user['id'],
      };
      await passkeyService.registerPasskey(
        metadata: metadata.isEmpty ? null : metadata,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passkey saved for faster sign-in on this device.')),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = _resolveErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _enrollingPasskey = false;
        });
      }
    }
  }

  Future<void> _submit() {
    if (_mode == _LoginMode.magicLink) {
      return _sendMagicLink();
    }
    return _login();
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionManager.getSession();
    final verificationHint =
        'Enter the ${_twoFactorRequired ? '' : 'optional '}six-digit code we emailed to you. '
        'Codes expire after $_otpTtlMinutes minutes.';
    final isMagicLinkMode = _mode == _LoginMode.magicLink;
    final primaryLabel = isMagicLinkMode
        ? (_magicLinkSent ? 'Resend magic link' : 'Email me a magic link')
        : 'Sign in';
    final disablePrimary = _loading ||
        (isMagicLinkMode && _magicLinkSent && _magicLinkCountdown > 0);
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                autovalidateMode: _autovalidateMode,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildModeToggle(),
                    const SizedBox(height: 16),
                    if (session != null)
                      _buildExistingSessionBanner(context, session),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints:
                          const [AutofillHints.username, AutofillHints.email],
                      autocorrect: false,
                      decoration: const InputDecoration(labelText: 'Email'),
                      textInputAction: TextInputAction.next,
                      validator: AuthValidators.email,
                    ),
                    const SizedBox(height: 12),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 250),
                      child: isMagicLinkMode
                          ? _buildMagicLinkHelper(context)
                          : _buildPasswordField(),
                    ),
                    if (!isMagicLinkMode) ...[
                      const SizedBox(height: 12),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 250),
                        child: _showTwoFactorField
                            ? _buildTwoFactorField(verificationHint)
                            : Align(
                                alignment: Alignment.centerLeft,
                                child: TextButton(
                                  key: const ValueKey('twoFactorToggle'),
                                  onPressed: () {
                                    setState(() {
                                      _showTwoFactorField = true;
                                      _autovalidateMode =
                                          AutovalidateMode.onUserInteraction;
                                    });
                                  },
                                  child: const Text('Have an email code?'),
                                ),
                              ),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      _buildErrorBanner(),
                    ],
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: disablePrimary ? null : () => _submit(),
                      child: _loading && !_passkeyLoading
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(primaryLabel),
                    ),
                    if (isMagicLinkMode && _magicLinkSent) ...[
                      const SizedBox(height: 8),
                      Text(
                        _magicLinkCountdown > 0
                            ? 'You can request another link in $_magicLinkCountdown seconds.'
                            : 'Didn\'t see the email? Check your spam folder or resend.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _loading
                          ? null
                          : () {
                              Navigator.pushNamed(context, '/register');
                            },
                      child: const Text('Need an account? Create one'),
                    ),
                    TextButton(
                      onPressed: _loading
                          ? null
                          : () async {
                              try {
                                await Navigator.pushNamed(
                                    context, '/forgot-password');
                              } catch (_) {
                                if (!mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Reset links are available from the Edulure dashboard.',
                                    ),
                                  ),
                                );
                              }
                            },
                      child: const Text('Forgot password?'),
                    ),
                    if (_passkeyAvailable) ...[
                      const Divider(height: 32),
                      OutlinedButton.icon(
                        onPressed: _loading ? null : _loginWithPasskey,
                        icon: _passkeyLoading
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.key),
                        label: const Text('Sign in with your passkey'),
                      ),
                    ],
                    if (session != null && _passkeyAvailable) ...[
                      const SizedBox(height: 16),
                      _buildPasskeyEnrollmentCard(context, session),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildModeToggle() {
    return SegmentedButton<_LoginMode>(
      segments: const [
        ButtonSegment<_LoginMode>(
          value: _LoginMode.password,
          label: Text('Password'),
          icon: Icon(Icons.lock_outline),
        ),
        ButtonSegment<_LoginMode>(
          value: _LoginMode.magicLink,
          label: Text('Magic link'),
          icon: Icon(Icons.mail_outline),
        ),
      ],
      selected: {_mode},
      onSelectionChanged: (selection) {
        final selected = selection.first;
        setState(() {
          _mode = selected;
          _error = null;
          if (selected == _LoginMode.magicLink) {
            _showTwoFactorField = false;
            _twoFactorRequired = false;
          }
        });
      },
    );
  }

  Widget _buildExistingSessionBanner(
      BuildContext context, Map<String, dynamic> session) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD6E4FF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Signed in as ${_safeEmail(session)}',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          if (_passkeyAvailable)
            TextButton(
              onPressed: _enrollingPasskey ? null : () => _enrollPasskey(session),
              child: _enrollingPasskey
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save a passkey for this account'),
            ),
        ],
      ),
    );
  }

  Widget _buildMagicLinkHelper(BuildContext context) {
    final theme = Theme.of(context);
    final email = _emailController.text.trim();
    final subtitle = email.isNotEmpty
        ? 'We\'ll email a secure sign-in link to $email.'
        : 'We\'ll email a secure sign-in link to your address on file.';
    return Container(
      key: const ValueKey('magicLinkInfo'),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.primary.withOpacity(0.2)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'One-tap email access',
            style: theme.textTheme.titleMedium
                ?.copyWith(color: theme.colorScheme.primary),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Magic links expire quickly and only work once. Opening the link on this device will sign you in instantly.',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordField() {
    return Column(
      key: const ValueKey('password'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextFormField(
          controller: _passwordController,
          decoration: const InputDecoration(labelText: 'Password'),
          obscureText: true,
          autofillHints: const [AutofillHints.password],
          textInputAction: TextInputAction.done,
          validator: (value) =>
              AuthValidators.password(value, requireComplexity: false, minLength: 8),
          onFieldSubmitted: (_) {
            if (!_loading) {
              _login();
            }
          },
        ),
      ],
    );
  }

  Widget _buildTwoFactorField(String verificationHint) {
    return Column(
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
                verificationHint,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _twoFactorController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'Email security code',
            helperText: _twoFactorRequired
                ? 'Required to complete login'
                : '6-digit code from your email inbox',
          ),
          textInputAction: TextInputAction.done,
          inputFormatters: const [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(6),
          ],
          validator: (value) => AuthValidators.twoFactorCode(
            value,
            required: _twoFactorRequired,
          ),
          onFieldSubmitted: (_) {
            if (!_loading) {
              _login();
            }
          },
        ),
      ],
    );
  }

  Widget _buildErrorBanner() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade100),
      ),
      child: Text(
        _error!,
        style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600),
      ),
    );
  }

  Widget _buildPasskeyEnrollmentCard(
      BuildContext context, Map<String, dynamic> session) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).colorScheme.outlineVariant,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Passkey quick access',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'Save a device-bound passkey so you can sign in with biometrics instead of typing your password.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _enrollingPasskey ? null : () => _enrollPasskey(session),
            icon: _enrollingPasskey
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.fingerprint),
            label: const Text('Create a passkey for this account'),
          ),
        ],
      ),
    );
  }

  String _safeEmail(dynamic session) {
    final user = session is Map ? session['user'] : null;
    final email = user is Map ? user['email']?.toString() : null;
    return email ?? 'current session';
  }
}
