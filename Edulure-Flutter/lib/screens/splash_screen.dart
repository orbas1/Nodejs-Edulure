
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

  Future<void> _warmUp() async {
    try {
      final community = ref.read(communityHubControllerProvider.notifier);
      final profiles = ref.read(userProfileControllerProvider.notifier);
      setState(() {
        _loading = true;
        _progress = 0.2;
        _currentStep = 0;
      });
      await profiles.bootstrap();
      setState(() {
        _progress = 0.55;
        _currentStep = 1;
      });
      await community.bootstrap();
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
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _ready = true;
        _progress = 1.0;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final profiles = ref.watch(userProfileControllerProvider).snapshot.profiles;
    final activeId = ref.watch(userProfileControllerProvider).snapshot.activeProfileId;

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
                Text(
                  _steps[_currentStep.clamp(0, _steps.length - 1)],
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: LinearProgressIndicator(
                    minHeight: 8,
                    value: _progress,
                    backgroundColor: theme.colorScheme.primaryContainer.withOpacity(0.4),
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
                      : null,
                  child: Text(_loading ? 'Preparing...' : 'Enter workspace'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () => Navigator.pushNamed(context, '/profile'),
                  child: const Text('Customize profile'),
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
