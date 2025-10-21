
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../provider/community/community_hub_controller.dart';
import '../provider/profile/user_profile_controller.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  double _progress = 0.1;
  int _currentStep = 0;
  bool _ready = false;
  bool _loading = true;
  bool _failed = false;
  String? _errorMessage;
  final List<String> _steps = const [
    'Securing workspace',
    'Syncing community data',
    'Personalizing for you',
  ];

  @override
  void initState() {
    super.initState();
    Future.microtask(_warmUp);
  }

  Future<void> _warmUp({bool retry = false}) async {
    try {
      final community = ref.read(communityHubControllerProvider.notifier);
      final profiles = ref.read(userProfileControllerProvider.notifier);
      setState(() {
        _loading = true;
        _failed = false;
        _errorMessage = null;
        _progress = 0.2;
        _currentStep = 0;
      });
      await profiles.bootstrap();
      if (!mounted) return;
      setState(() {
        _progress = 0.55;
        _currentStep = 1;
      });
      await community.bootstrap();
      if (!mounted) return;
      setState(() {
        _progress = 0.85;
        _currentStep = 2;
      });
      await Future<void>.delayed(const Duration(milliseconds: 350));
      if (!mounted) return;
      setState(() {
        _progress = 1.0;
        _ready = true;
        _loading = false;
        _failed = false;
        _errorMessage = null;
      });
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('Splash warm-up failed: $error');
        debugPrintStack(stackTrace: stackTrace);
      }
      if (!mounted) return;
      setState(() {
        _loading = false;
        _failed = true;
        _ready = retry && ref.read(userProfileControllerProvider).snapshot.profiles.isNotEmpty;
        _progress = _ready ? 1.0 : 0.0;
        _errorMessage = _describeWarmupError(error);
      });
    }
  }

  String _describeWarmupError(Object error) {
    if (error is DioException) {
      final code = error.response?.statusCode;
      final message = error.response?.data is Map && error.response?.data['message'] is String
          ? error.response?.data['message'] as String
          : null;
      if (code == 401) {
        return 'Your session expired. Sign in again to reload your workspace.';
      }
      if (message != null && message.isNotEmpty) {
        return message;
      }
    }
    return 'We couldn\'t prepare your workspace. Check your connection and try again.';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final profileState = ref.watch(userProfileControllerProvider);
    final profiles = profileState.snapshot.profiles;
    final activeId = profileState.snapshot.activeProfileId;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [theme.colorScheme.primaryContainer, Colors.white],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor: theme.colorScheme.primary,
                      child: const Icon(Icons.auto_graph, color: Colors.white),
                    ),
                    const SizedBox(width: 16),
                    Text(
                      'Edulure mobile',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: _failed
                      ? _WarmupErrorCard(
                          key: const ValueKey('warmup-error'),
                          message: _errorMessage ??
                              'We hit a snag while bootstrapping your workspace. Tap retry when you\'re ready.',
                          onRetry: () => _warmUp(retry: true),
                        )
                      : _WarmupProgress(
                          key: ValueKey('warmup-progress-$_currentStep'),
                          title: _steps[_currentStep.clamp(0, _steps.length - 1)],
                          progress: _progress,
                        ),
                ),
                const SizedBox(height: 24),
                Expanded(
                  child: PageView(
                    children: const [
                      _SplashPanel(
                        title: 'Build thriving learning communities',
                        description:
                            'Launch courses, live rooms, and on-demand content from one orchestrated workspace.',
                        icon: Icons.groups_outlined,
                      ),
                      _SplashPanel(
                        title: 'Coordinate high-trust engagements',
                        description:
                            'Manage calendars, tutor sessions, and community drops with reminders baked in.',
                        icon: Icons.calendar_month_outlined,
                      ),
                      _SplashPanel(
                        title: 'Showcase your profile',
                        description:
                            'Craft a compelling presence with rich media, credentials, and booking availability.',
                        icon: Icons.star_outline,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                if (profiles.isNotEmpty)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Jump in as', style: theme.textTheme.bodySmall),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        value: activeId ?? profiles.first.id,
                        items: [
                          for (final profile in profiles)
                            DropdownMenuItem(value: profile.id, child: Text(profile.displayName)),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            ref.read(userProfileControllerProvider.notifier).selectProfile(value);
                          }
                        },
                      ),
                    ],
                  ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _ready
                      ? () => Navigator.pushReplacementNamed(context, '/home')
                      : _failed && profiles.isNotEmpty
                          ? () => Navigator.pushReplacementNamed(context, '/home')
                          : null,
                  child: Text(
                    _loading
                        ? 'Preparing...'
                        : _failed
                            ? (profiles.isNotEmpty ? 'Enter with cached data' : 'Enter workspace')
                            : 'Enter workspace',
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pushNamed(context, '/profile'),
                        child: const Text('Customize profile'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _loading ? null : () => _warmUp(retry: true),
                        icon: const Icon(Icons.refresh),
                        label: const Text('Retry'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SplashPanel extends StatelessWidget {
  const _SplashPanel({required this.title, required this.description, required this.icon});

  final String title;
  final String description;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: theme.colorScheme.primary.withOpacity(0.12),
                child: Icon(icon, color: theme.colorScheme.primary),
              ),
              const SizedBox(height: 16),
              Text(title, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Text(description),
            ],
          ),
        ),
      ),
    );
  }
}

class _WarmupProgress extends StatelessWidget {
  const _WarmupProgress({super.key, required this.title, required this.progress});

  final String title;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      key: key,
      children: [
        Text(title, style: theme.textTheme.titleMedium),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: LinearProgressIndicator(
            minHeight: 8,
            value: progress,
            backgroundColor: theme.colorScheme.primaryContainer.withOpacity(0.4),
          ),
        ),
      ],
    );
  }
}

class _WarmupErrorCard extends StatelessWidget {
  const _WarmupErrorCard({super.key, required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: theme.colorScheme.errorContainer.withOpacity(0.2),
        border: Border.all(color: theme.colorScheme.errorContainer),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning_rounded, color: theme.colorScheme.error),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  message,
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry initialization'),
            ),
          ),
        ],
      ),
    );
  }
}
