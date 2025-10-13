import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../services/session_manager.dart';

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
        return _AuthenticatedHomeView(session: session);
      },
    );
  }
}

class _PublicHomeView extends StatelessWidget {
  const _PublicHomeView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edulure'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pushNamed(context, '/login'),
            child: const Text('Login'),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: () => Navigator.pushNamed(context, '/register'),
            child: const Text('Join Edulure'),
          ),
          const SizedBox(width: 12),
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
                  'Learning communities engineered for scale',
                  style: Theme.of(context)
                      .textTheme
                      .headlineSmall
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                Text(
                  'Blend courses, community, and live sessions into one seamless mobile experience.',
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
              return Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.groups_3_outlined),
                    title: const Text('Communities'),
                    subtitle: const Text('Curate your hubs and monitor health in real time.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/communities'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.dashboard_customize_outlined),
                    title: const Text('Live feed'),
                    subtitle: const Text('Stay up to date with every community in a unified stream.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/feed'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.inbox_outlined),
                    title: const Text('Messages'),
                    subtitle: const Text('Coordinate with faculty and members in threaded conversations.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/inbox'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.person_outline),
                    title: const Text('Profile'),
                    subtitle: const Text('Personalise your instructor and member presence.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/profile'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.calendar_month_outlined),
                    title: const Text('Tutor bookings'),
                    subtitle: const Text('Manage mentor requests, schedules, and session history.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/tutor-bookings'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.library_books_outlined),
                    title: const Text('Content library'),
                    subtitle: const Text('Download decks and ebooks with offline support.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/content'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.dashboard_outlined),
                    title: const Text('Course management'),
                    subtitle: const Text('Track cohorts, assign production tasks, and monitor operations.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/courses/manage'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.shopping_bag_outlined),
                    title: const Text('Purchase courses'),
                    subtitle: const Text('Review offers, apply coupons, and confirm learner enrolments.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/courses/purchase'),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _AuthenticatedHomeView extends StatefulWidget {
  const _AuthenticatedHomeView({required this.session});

  final Map<String, dynamic> session;

  @override
  State<_AuthenticatedHomeView> createState() => _AuthenticatedHomeViewState();
}

class _AuthenticatedHomeViewState extends State<_AuthenticatedHomeView> {
  late final List<String> _availableRoles;
  late String _activeRole;

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

  void _setActiveRole(String role) {
    setState(() {
      _activeRole = role;
    });
    SessionManager.setActiveRole(role);
  }

  @override
  Widget build(BuildContext context) {
    final roleDetails = _roleConfigurations[_activeRole] ?? _roleConfigurations['user']!;
    final verificationStatus = _verification?['status']?.toString() ?? 'pending';
    final email = _user?['email']?.toString();

    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome back, $_userDisplayName'),
        actions: [
          IconButton(
            tooltip: 'Profile',
            onPressed: () => Navigator.pushNamed(context, '/profile'),
            icon: const Icon(Icons.person_outline),
          ),
          IconButton(
            tooltip: 'Sign out',
            onPressed: _logout,
            icon: const Icon(Icons.logout_outlined),
          ),
          const SizedBox(width: 4),
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
            'Switch workspace role',
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
        icon: Icons.forum_outlined,
        title: 'Community pulse',
        description: 'Join the latest discussions and collect trusted recommendations.',
      ),
    ],
    actions: [
      _RoleAction(icon: Icons.dynamic_feed_outlined, label: 'Browse feed', route: '/feed'),
      _RoleAction(icon: Icons.bookmark_border, label: 'Open content library', route: '/content'),
      _RoleAction(icon: Icons.calendar_today_outlined, label: 'Review timetable', route: '/profile'),
    ],
  ),
  'instructor': _RoleHomeDetails(
    heroTitle: 'Guide every cohort with confidence',
    heroSubtitle: 'Launch community updates, manage bookings, and iterate your curriculum.',
    heroGradient: [Color(0xFF0EA5E9), Color(0xFF6366F1)],
    features: [
      _RoleFeature(
        icon: Icons.analytics_outlined,
        title: 'Operational analytics',
        description: 'Monitor enrolment health, retention, and student sentiment in real time.',
      ),
      _RoleFeature(
        icon: Icons.groups_outlined,
        title: 'Community orchestration',
        description: 'Moderate discussions, assign mentors, and celebrate learner milestones.',
      ),
      _RoleFeature(
        icon: Icons.attach_money_outlined,
        title: 'Revenue levers',
        description: 'Price new offers, manage tutor availability, and sync payouts.',
      ),
    ],
    actions: [
      _RoleAction(icon: Icons.add_circle_outline, label: 'Create course', route: '/content'),
      _RoleAction(icon: Icons.message_outlined, label: 'Open inbox', route: '/feed'),
      _RoleAction(icon: Icons.schedule_outlined, label: 'Plan lesson', route: '/profile'),
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
      _RoleAction(icon: Icons.admin_panel_settings_outlined, label: 'Manage roles', route: '/profile'),
      _RoleAction(icon: Icons.insights_outlined, label: 'View analytics', route: '/content'),
      _RoleAction(icon: Icons.settings_outlined, label: 'Workspace settings', route: '/profile'),
    ],
  ),
};

String _roleLabel(String role) {
  switch (role) {
    case 'instructor':
      return 'Instructor';
    case 'admin':
      return 'Administrator';
    default:
      return 'Learner';
  }
}

List<String> _resolveRolesForUser(String role) {
  switch (role) {
    case 'admin':
      return const ['admin', 'instructor', 'user'];
    case 'instructor':
      return const ['instructor', 'user'];
    default:
      return const ['user'];
  }
}
