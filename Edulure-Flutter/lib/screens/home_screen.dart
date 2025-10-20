import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../services/session_manager.dart';
import '../services/privacy_preferences.dart';
import '../services/dsr_client.dart';
import '../services/language_service.dart';
import '../widgets/language_selector.dart';

enum _MenuAction { dashboard, profile, settings, signOut }

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder(
      valueListenable: SessionManager.sessionListenable(),
      builder: (context, box, _) {
        final session = SessionManager.getSession();
        if (session == null) {
          return const _PublicHomeView();
        }
        return AuthenticatedHomeView(session: session);
      },
    );
  }
}

class _PublicHomeView extends StatelessWidget {
  const _PublicHomeView();

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: LanguageService.listenable(),
      builder: (context, code, _) {
        final t = LanguageService.translate;
        return Scaffold(
          appBar: AppBar(
            automaticallyImplyLeading: false,
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.white,
            elevation: 0.4,
            toolbarHeight: 72,
            titleSpacing: 20,
            title: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(
                    'https://i.ibb.co/twQyCm1N/Edulure-Logo.png',
                    height: 40,
                  ),
                ),
              ],
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: LanguageSelector(compact: true),
              ),
              TextButton(
                onPressed: () => Navigator.pushNamed(context, '/login'),
                child: Text(t('navigation.login')),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () => Navigator.pushNamed(context, '/register'),
                child: Text(t('navigation.register')),
              ),
              const SizedBox(width: 16),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(24),
            children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFEEF2FF), Color(0xFFEFF6FF)],
              ),
              borderRadius: BorderRadius.circular(32),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t('home.hero.title'),
                  'Learning communities built for scale',
                  style: Theme.of(context)
                      .textTheme
                      .headlineSmall
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                Text(
                  t('home.hero.description'),
                  'Run courses, community, and live sessions from one secure app.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                Wrap(
                  spacing: 12,
                  children: const [
                    Chip(label: Text('Communities')),
                    Chip(label: Text('Classrooms')),
                    Chip(label: Text('Analytics')),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ValueListenableBuilder(
            valueListenable: SessionManager.assetsCache.listenable(),
            builder: (context, box, _) {
              final role = SessionManager.getActiveRole();
              final classroomTarget = role == 'instructor' ? '/instructor-dashboard' : '/dashboard/learner';

              return Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.groups_3_outlined),
                    title: const Text('Communities'),
                    subtitle: const Text('Track health across every hub.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/communities'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.subscriptions_outlined),
                    title: const Text('Community subscriptions'),
                    subtitle: const Text('Manage membership tiers, payments, and renewals.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/community/subscribe'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.dashboard_customize_outlined),
                    title: const Text('Live feed'),
                    subtitle: const Text('Monitor updates across Learnspaces.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/feed'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.videocam_outlined),
                    title: const Text('Live classrooms'),
                    subtitle: const Text('Prep upcoming rooms and materials in seconds.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, classroomTarget),
                  ),
                  ListTile(
                    leading: const Icon(Icons.travel_explore_outlined),
                    title: const Text('Explorer intelligence'),
                    subtitle: const Text('Search cohorts, talent, and campaigns.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/explorer'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.library_books_outlined),
                    title: const Text('Edulure blog'),
                    subtitle: const Text('Platform updates and playbooks.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/blog'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.inbox_outlined),
                    title: const Text('Messages'),
                    subtitle: const Text('Coordinate with members in threads.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/inbox'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.person_outline),
                    title: const Text('Profile'),
                    subtitle: const Text('Tailor your instructor or learner presence.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/profile'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.event_note_outlined),
                    title: const Text('Calendar'),
                    subtitle: const Text('Plan launches, AMAs, and live classrooms.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/calendar'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.calendar_month_outlined),
                    title: const Text('Tutor bookings'),
                    subtitle: const Text('Manage mentor requests and schedules.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/tutor-bookings'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.library_books_outlined),
                    title: const Text('Content library'),
                    subtitle: const Text('Access decks and ebooks with offline support.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/content'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.school_outlined),
                    title: const Text('Course catalog'),
                    subtitle: const Text('Design, publish, and manage interactive courses.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/courses/catalog'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.menu_book_outlined),
                    title: const Text('E-book studio'),
                    subtitle: const Text('Publish multimedia playbooks and track reading progress.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/ebooks'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.people_outline),
                    title: const Text('Tutor talent directory'),
                    subtitle: const Text('Manage mentor availability and session reviews.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/tutors'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.videocam_outlined),
                    title: const Text('Live classrooms'),
                    subtitle: const Text('Schedule and orchestrate real-time cohort sessions.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/sessions/live'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.insights_outlined),
                    title: const Text('Progress analytics'),
                    subtitle: const Text('Track module completion and learner milestones.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/courses/progress'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.support_agent_outlined),
                    title: const Text('Support desk'),
                    subtitle: const Text('Manage learner issues and internal notes.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/support'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.info_outline),
                    title: const Text('About Edulure'),
                    subtitle: const Text('Meet the team and learn our mission.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/about'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.privacy_tip_outlined),
                    title: const Text('Privacy & data'),
                    subtitle: const Text('Review controls and compliance posture.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/privacy'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.dashboard_outlined),
                    title: const Text('Course management'),
                    subtitle: const Text('Track cohorts and production tasks.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/courses/manage'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.shopping_bag_outlined),
                    title: const Text('Purchase courses'),
                    subtitle: const Text('Review offers and confirm enrollments.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/courses/purchase'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.swap_horiz_outlined),
                    title: const Text('Provider transition hub'),
                    subtitle: const Text('Coordinate migration milestones and readiness.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/provider-transition'),
                  ),
                ],
              );
            },
          ),
        ],
          ),
        );
      },
    );
  }
}

class AuthenticatedHomeView extends StatefulWidget {
  const AuthenticatedHomeView({
    required this.session,
    DsrClient? dsrClient,
    Future<bool> Function()? requiresConsent,
    Future<void> Function({DateTime? grantedAt})? recordConsentAccepted,
  })  : _dsrClient = dsrClient ?? const DsrClient(),
        _requiresConsent = requiresConsent ?? PrivacyPreferenceService.requiresConsent,
        _recordConsentAccepted = recordConsentAccepted ?? PrivacyPreferenceService.recordConsentAccepted;

  final Map<String, dynamic> session;
  final DsrClient _dsrClient;
  final Future<bool> Function() _requiresConsent;
  final Future<void> Function({DateTime? grantedAt}) _recordConsentAccepted;

  @override
  State<AuthenticatedHomeView> createState() => AuthenticatedHomeViewState();
}

class AuthenticatedHomeViewState extends State<AuthenticatedHomeView> {
  late final List<String> _availableRoles;
  late String _activeRole;
  bool _pendingConsent = false;

  @override
  void initState() {
    super.initState();
    final userRole = widget.session['user'] is Map
        ? widget.session['user']['role']?.toString() ?? 'user'
        : 'user';
    _availableRoles = _resolveRolesForUser(userRole);
    final storedRole = SessionManager.getActiveRole();
    _activeRole = storedRole != null && _availableRoles.contains(storedRole)
        ? storedRole
        : _availableRoles.first;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _bootstrapPrivacyWorkflow();
    });
  }

  Map<String, dynamic>? get _user =>
      widget.session['user'] is Map ? Map<String, dynamic>.from(widget.session['user']) : null;

  Map<String, dynamic>? get _verification => widget.session['verification'] is Map
      ? Map<String, dynamic>.from(widget.session['verification'])
      : null;

  String get _userDisplayName {
    final firstName = _user?['firstName']?.toString() ?? '';
    final lastName = _user?['lastName']?.toString() ?? '';
    final fullName = '$firstName $lastName'.trim();
    if (fullName.isNotEmpty) {
      return fullName;
    }
    final email = _user?['email']?.toString();
    return email ?? 'Edulure member';
  }

  String get _initials {
    final firstName = _user?['firstName']?.toString() ?? '';
    final lastName = _user?['lastName']?.toString() ?? '';
    final initials = (firstName.isNotEmpty ? firstName[0] : '') + (lastName.isNotEmpty ? lastName[0] : '');
    return initials.isNotEmpty ? initials.toUpperCase() : 'E';
  }

  Future<void> _logout() async {
    await SessionManager.clear();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('You have been signed out.')),
    );
  }

  Future<void> _bootstrapPrivacyWorkflow() async {
    final requiresConsent = await widget._requiresConsent();
    if (!mounted) return;
    if (requiresConsent) {
      setState(() {
        _pendingConsent = true;
      });
      await _showConsentDialog();
    }
  }

  Future<void> _showConsentDialog() async {
    if (!_pendingConsent || !mounted) {
      return;
    }
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Review updated privacy policy'),
          content: const Text(
            'We have refreshed our privacy and analytics policies to align with GDPR retention windows. Please consent to the '
            'new version or request a data export if you need a copy of your records.',
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await _submitDsrRequest();
              },
              child: const Text('Request data export'),
            ),
            FilledButton(
              onPressed: () async {
                await _acceptConsent();
                if (!mounted) return;
                Navigator.of(dialogContext).pop();
              },
              child: const Text('Accept & continue'),
            )
          ],
        );
      },
    );
  }

  Future<void> _acceptConsent() async {
    await widget._recordConsentAccepted();
    if (!mounted) return;
    setState(() {
      _pendingConsent = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Thank you — your privacy preferences are up to date.')),
    );
  }

  Future<void> _submitDsrRequest() async {
    await widget._dsrClient.submitRequest(
      type: 'access',
      description: 'Requested export from mobile privacy workflow',
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Your data access request has been filed. Our trust team will follow up shortly.'),
      ),
    );
  }

  String get _dashboardRoute {
    switch (_activeRole) {
      case 'instructor':
        return '/instructor-dashboard';
      case 'admin':
        return '/dashboard/learner';
      default:
        return '/dashboard/learner';
    }
  }

  void _setActiveRole(String role) {
    setState(() {
      _activeRole = role;
    });
    SessionManager.setActiveRole(role);
  }

  void _handleMenuAction(_MenuAction action) {
    switch (action) {
      case _MenuAction.dashboard:
        Navigator.pushNamed(context, _dashboardRoute);
        break;
      case _MenuAction.profile:
        Navigator.pushNamed(context, '/profile');
        break;
      case _MenuAction.settings:
        Navigator.pushNamed(context, '/settings');
        break;
      case _MenuAction.signOut:
        _logout();
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final roleDetails = _roleConfigurations[_activeRole] ?? _roleConfigurations['user']!;
    final verificationStatus = _verification?['status']?.toString() ?? 'pending';
    final email = _user?['email']?.toString();

    return ValueListenableBuilder<String>(
      valueListenable: LanguageService.listenable(),
      builder: (context, code, _) {
        return Scaffold(
          appBar: AppBar(
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.white,
            elevation: 0.4,
            toolbarHeight: 84,
            titleSpacing: 0,
            leadingWidth: 72,
            leading: Padding(
              padding: const EdgeInsets.only(left: 16),
              child: CircleAvatar(
                backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                child: Text(_initials, style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Welcome back, $_userDisplayName',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
                if (email != null)
                  Text(
                    email!,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.blueGrey),
                  ),
              ],
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: LanguageSelector(compact: true),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Chip(
                  avatar: const Icon(Icons.badge_outlined, size: 16),
                  label: Text(_roleLabel(_activeRole)),
                  backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                ),
              ),
              PopupMenuButton<_MenuAction>(
                tooltip: 'Workspace menu',
                onSelected: _handleMenuAction,
                itemBuilder: (context) => [
                  PopupMenuItem<_MenuAction>(
                    value: _MenuAction.dashboard,
                    child: const ListTile(
                      leading: Icon(Icons.dashboard_customize_outlined),
                      title: Text('Open dashboard'),
                    ),
                  ),
                  PopupMenuItem<_MenuAction>(
                    value: _MenuAction.profile,
                    child: const ListTile(
                      leading: Icon(Icons.person_outline),
                      title: Text('View profile'),
                    ),
                  ),
                  PopupMenuItem<_MenuAction>(
                    value: _MenuAction.settings,
                    child: const ListTile(
                      leading: Icon(Icons.settings_outlined),
                      title: Text('Settings'),
                    ),
                  ),
                  const PopupMenuDivider(),
                  PopupMenuItem<_MenuAction>(
                    value: _MenuAction.signOut,
                    child: const ListTile(
                      leading: Icon(Icons.logout_outlined, color: Colors.redAccent),
                      title: Text('Sign out'),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 8),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        child: Text(
                          _initials,
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _userDisplayName,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            if (email != null)
                              Text(
                                email,
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
                              ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                Chip(
                                  label: Text('Viewing as ${_roleLabel(_activeRole)}'),
                                  avatar: const Icon(Icons.badge_outlined, size: 18),
                                ),
                                Chip(
                                  label: Text(verificationStatus == 'verified' ? 'Email verified' : 'Verification pending'),
                                  avatar: Icon(
                                    verificationStatus == 'verified'
                                        ? Icons.verified_outlined
                                        : Icons.mark_email_unread_outlined,
                                    size: 18,
                                    color: verificationStatus == 'verified' ? Colors.green : Colors.orange,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Switch Learnspace role',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: _availableRoles
                    .map(
                      (role) => ChoiceChip(
                        label: Text(_roleLabel(role)),
                        selected: _activeRole == role,
                        onSelected: (selected) {
                          if (selected) {
                            _setActiveRole(role);
                          }
                        },
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: roleDetails.heroGradient,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(28),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      roleDetails.heroTitle,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600, color: Colors.white),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      roleDetails.heroSubtitle,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Focus areas',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 16,
                children: roleDetails.features
                    .map(
                      (feature) => SizedBox(
                        width: 320,
                        child: Card(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(feature.icon, size: 28, color: Theme.of(context).colorScheme.primary),
                                const SizedBox(height: 16),
                                Text(
                                  feature.title,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  feature.description,
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 24),
              Text(
                'Quick actions',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: roleDetails.actions
                    .map(
                      (action) => FilledButton.tonalIcon(
                        onPressed: () => Navigator.pushNamed(context, action.route),
                        icon: Icon(action.icon),
                        label: Text(action.label),
                      ),
                    )
                    .toList(),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _RoleHomeDetails {
  const _RoleHomeDetails({
    required this.heroTitle,
    required this.heroSubtitle,
    required this.heroGradient,
    required this.features,
    required this.actions,
  });

  final String heroTitle;
  final String heroSubtitle;
  final List<Color> heroGradient;
  final List<_RoleFeature> features;
  final List<_RoleAction> actions;
}

class _RoleFeature {
  const _RoleFeature({required this.icon, required this.title, required this.description});

  final IconData icon;
  final String title;
  final String description;
}

class _RoleAction {
  const _RoleAction({required this.icon, required this.label, required this.route});

  final IconData icon;
  final String label;
  final String route;
}

const Map<String, _RoleHomeDetails> _roleConfigurations = {
  'user': _RoleHomeDetails(
    heroTitle: 'Your learning mission control',
    heroSubtitle: 'Track live cohorts, unlock new resources, and stay close to your instructors.',
    heroGradient: [Color(0xFF2563EB), Color(0xFF7C3AED)],
    features: [
      _RoleFeature(
        icon: Icons.event_available_outlined,
        title: 'Upcoming sessions',
        description: 'See what classes, AMAs, and workshops are on your calendar.',
      ),
      _RoleFeature(
        icon: Icons.auto_graph_outlined,
        title: 'Progress insights',
        description: 'Understand completion, assessments, and mentor feedback in one view.',
      ),
      _RoleFeature(
        icon: Icons.travel_explore_outlined,
        title: 'Discovery explorer',
        description: 'Surface communities, mentors, and resources with curated filters and saved searches.',
      ),
    ],
    actions: [
      _RoleAction(icon: Icons.fact_check_outlined, label: 'Review assessments', route: '/dashboard/assessments'),
      _RoleAction(icon: Icons.travel_explore_outlined, label: 'Launch explorer', route: '/explorer'),
      _RoleAction(icon: Icons.dashboard_outlined, label: 'Open learner dashboard', route: '/dashboard/learner'),
      _RoleAction(icon: Icons.dynamic_feed_outlined, label: 'Browse feed', route: '/feed'),
      _RoleAction(icon: Icons.bookmark_border, label: 'Open content library', route: '/content'),
      _RoleAction(icon: Icons.calendar_today_outlined, label: 'Review timetable', route: '/profile'),
      _RoleAction(icon: Icons.settings_outlined, label: 'Settings', route: '/settings'),
    ],
  ),
  'community': _RoleHomeDetails(
    heroTitle: 'Steward thriving communities',
    heroSubtitle: 'Monitor rituals, incidents, and monetisation signals from your command deck.',
    heroGradient: [Color(0xFF312E81), Color(0xFF6366F1)],
    features: [
      _RoleFeature(
        icon: Icons.groups_3_outlined,
        title: 'Community health',
        description: 'Track member activity, pending approvals, and moderator coverage.',
      ),
      _RoleFeature(
        icon: Icons.auto_mode_outlined,
        title: 'Operations runbooks',
        description: 'Activate escalation playbooks and measure automation readiness.',
      ),
      _RoleFeature(
        icon: Icons.campaign_outlined,
        title: 'Growth telemetry',
        description: 'Review premium tiers, experiments, and communications insights.',
      ),
    ],
    actions: [
      _RoleAction(icon: Icons.dashboard_outlined, label: 'Open community dashboard', route: '/dashboard/community'),
      _RoleAction(icon: Icons.calendar_month_outlined, label: 'Review programming', route: '/dashboard/community'),
      _RoleAction(icon: Icons.campaign_outlined, label: 'Plan broadcasts', route: '/inbox'),
      _RoleAction(icon: Icons.assignment_turned_in_outlined, label: 'Manage runbooks', route: '/content'),
    ],
  ),
  'instructor': _RoleHomeDetails(
    heroTitle: 'Guide every cohort with confidence',
    heroSubtitle: 'Launch community updates, manage bookings, and iterate your curriculum.',
    heroGradient: [Color(0xFF0EA5E9), Color(0xFF6366F1)],
    features: [
      _RoleFeature(
        icon: Icons.videocam_outlined,
        title: 'Live classrooms mission control',
        description: 'Track occupancy, security, and facilitator readiness for every broadcast.',
      ),
      _RoleFeature(
        icon: Icons.analytics_outlined,
        title: 'Operational analytics',
        description: 'Monitor enrolment health, retention, and student sentiment in real time.',
      ),
      _RoleFeature(
        icon: Icons.travel_explore_outlined,
        title: 'Explorer playbooks',
        description: 'Share discovery packs that blend cohorts, tutors, and campaigns for your learners.',
      ),
      _RoleFeature(
        icon: Icons.attach_money_outlined,
        title: 'Revenue levers',
        description: 'Price new offers, manage tutor availability, and sync payouts.',
      ),
    ],
    actions: [
      _RoleAction(icon: Icons.travel_explore_outlined, label: 'Launch explorer', route: '/explorer'),
      _RoleAction(icon: Icons.videocam_outlined, label: 'Manage live classrooms', route: '/instructor-dashboard'),
            _RoleAction(icon: Icons.phone_iphone_outlined, label: 'Creation companion', route: '/creation/companion'),
            _RoleAction(icon: Icons.shield_outlined, label: 'Ads governance', route: '/ads/governance'),
      _RoleAction(icon: Icons.add_circle_outline, label: 'Create course', route: '/content'),
      _RoleAction(icon: Icons.message_outlined, label: 'Open inbox', route: '/feed'),
      _RoleAction(icon: Icons.schedule_outlined, label: 'Plan lesson', route: '/profile'),
      _RoleAction(icon: Icons.settings_outlined, label: 'Settings', route: '/settings'),
    ],
  ),
  'admin': _RoleHomeDetails(
    heroTitle: 'Orchestrate your learning operations',
    heroSubtitle: 'Align teams, manage compliance, and keep programmes launch-ready.',
    heroGradient: [Color(0xFF1E293B), Color(0xFF6366F1)],
    features: [
      _RoleFeature(
        icon: Icons.security_outlined,
        title: 'Governance status',
        description: 'Monitor verification, access policies, and incident response readiness.',
      ),
      _RoleFeature(
        icon: Icons.dashboard_outlined,
        title: 'Workspace health',
        description: 'Review adoption metrics across instructors, tutors, and learners.',
      ),
      _RoleFeature(
        icon: Icons.campaign_outlined,
        title: 'Growth initiatives',
        description: 'Track partnerships, campaign performance, and sponsorship revenue.',
      ),
    ],
    actions: [
      _RoleAction(icon: Icons.travel_explore_outlined, label: 'Open explorer', route: '/explorer'),
      _RoleAction(icon: Icons.admin_panel_settings_outlined, label: 'Manage roles', route: '/profile'),
      _RoleAction(icon: Icons.insights_outlined, label: 'View analytics', route: '/content'),
      _RoleAction(icon: Icons.settings_outlined, label: 'Workspace settings', route: '/settings'),
    ],
  ),
};

String _roleLabel(String role) {
  switch (role) {
    case 'instructor':
      return 'Instructor';
    case 'admin':
      return 'Administrator';
    case 'community':
      return 'Community';
    default:
      return 'Learner';
  }
}

List<String> _resolveRolesForUser(String role) {
  switch (role) {
    case 'admin':
      return const ['admin', 'community', 'instructor', 'user'];
    case 'instructor':
      return const ['community', 'instructor', 'user'];
    default:
      return const ['user'];
  }
}
