import 'package:flutter/material.dart';

import '../services/dashboard_service.dart';
import '../services/session_manager.dart';

class LearnerDashboardScreen extends StatefulWidget {
  const LearnerDashboardScreen({super.key});

  @override
  State<LearnerDashboardScreen> createState() => _LearnerDashboardScreenState();
}

class _LearnerDashboardScreenState extends State<LearnerDashboardScreen> {
  final DashboardService _service = DashboardService();
  LearnerDashboardSnapshot? _snapshot;
  String? _errorMessage;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    final cached = _service.loadCachedLearnerSnapshot();
    if (cached != null) {
      _snapshot = cached;
      _loading = false;
    }
    _refresh(force: true);
  }

  Future<void> _refresh({bool force = false}) async {
    setState(() {
      if (_snapshot == null || force) {
        _loading = true;
      }
      _errorMessage = null;
    });
    try {
      final snapshot = await _service.fetchLearnerDashboard();
      if (!mounted) return;
      setState(() {
        _snapshot = snapshot;
        _loading = false;
        _errorMessage = null;
      });
    } on DashboardException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
        _loading = false;
      });
      if (_snapshot != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.message)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeRole = SessionManager.getActiveRole()?.toLowerCase();
    const learnerRoles = {'learner', 'user'};
    if (activeRole == null || !learnerRoles.contains(activeRole)) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Learner dashboard'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_outline, size: 56, color: Colors.grey),
                const SizedBox(height: 16),
                Text(
                  'Switch to the learner Learnspace role to access this dashboard.',
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Return to home'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final snapshot = _snapshot;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Learner dashboard'),
        actions: [
          if (snapshot?.isFromCache ?? false)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.amber.shade100,
                  borderRadius: BorderRadius.circular(20),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: Text(
                  'Offline snapshot',
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: Colors.amber.shade900, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => _refresh(force: true),
            icon: const Icon(Icons.refresh),
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _refresh(force: true),
        child: _buildBody(context, snapshot),
      ),
    );
  }

  Widget _buildBody(BuildContext context, LearnerDashboardSnapshot? snapshot) {
    if (_loading && snapshot == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 900;
        final widgets = <Widget>[];

        if (_errorMessage != null && snapshot == null) {
          widgets.add(_buildErrorState(context));
        } else if (snapshot != null) {
          widgets.addAll(_buildDashboardContent(context, snapshot, isWide));
        } else if (_errorMessage != null) {
          widgets.add(_buildErrorBanner(context));
        }

        if (widgets.isEmpty) {
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [_buildErrorState(context)],
          );
        }

        return ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          children: widgets,
        );
      },
    );
  }

  Widget _buildErrorState(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 120),
          Icon(Icons.error_outline, size: 52, color: Theme.of(context).colorScheme.error),
          const SizedBox(height: 16),
          Text(
            _errorMessage ?? 'We could not load the learner dashboard.',
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            'Pull down to retry once your network connection is restored.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBanner(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.shade100,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.wifi_off_outlined, color: Colors.amber.shade800),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _errorMessage ?? 'We are working from cached data until your connection returns.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.amber.shade900),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildDashboardContent(
    BuildContext context,
    LearnerDashboardSnapshot snapshot,
    bool isWide,
  ) {
    final content = <Widget>[];
    if (_errorMessage != null) {
      content.add(_buildErrorBanner(context));
    }
    content.add(_buildProfileCard(context, snapshot));
    content.add(const SizedBox(height: 24));
    content.add(_buildMetricsGrid(context, snapshot));
    content.add(const SizedBox(height: 24));

    if (snapshot.liveClassrooms != null) {
      content.add(_buildLiveClassesCard(context, snapshot.liveClassrooms!, isWide));
      content.add(const SizedBox(height: 24));
    }

    final paceCard = _buildPaceCard(context, snapshot);
    final communityCard = _buildCommunityCard(context, snapshot);
    if (isWide) {
      content.add(
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: paceCard),
            const SizedBox(width: 16),
            Expanded(child: communityCard),
          ],
        ),
      );
    } else {
      content.addAll([paceCard, const SizedBox(height: 16), communityCard]);
    }
    content.add(const SizedBox(height: 24));

    final upcomingCard = _buildUpcomingCard(context, snapshot);
    final notificationsCard = _buildNotificationsCard(context, snapshot);
    if (isWide) {
      content.add(
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(flex: 2, child: upcomingCard),
            const SizedBox(width: 16),
            Expanded(child: notificationsCard),
          ],
        ),
      );
    } else {
      content.addAll([upcomingCard, const SizedBox(height: 16), notificationsCard]);
    }
    content.add(const SizedBox(height: 24));

    final highlightsCard = _buildHighlightsCard(context, snapshot);
    final safetyCard = _buildSafetyCard(context, snapshot);
    if (isWide) {
      content.add(
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(flex: 2, child: highlightsCard),
            const SizedBox(width: 16),
            Expanded(child: safetyCard),
          ],
        ),
      );
    } else {
      content.addAll([highlightsCard, const SizedBox(height: 16), safetyCard]);
    }

    content.add(const SizedBox(height: 24));
    content.add(_buildBlogCard(context, snapshot));

    content.add(const SizedBox(height: 32));
    content.add(
      Text(
        'Last synced ${TimeOfDay.fromDateTime(snapshot.syncedAt).format(context)} • ${snapshot.syncedAt.toLocal().toIso8601String().split('T').first}',
        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
      ),
    );

    return content;
  }

  Widget _buildProfileCard(BuildContext context, LearnerDashboardSnapshot snapshot) {
    final profile = snapshot.profile;
    final verification = profile.verification;
    final completionRatio = verification.documentsRequired == 0
        ? 0.0
        : (verification.documentsSubmitted / verification.documentsRequired).clamp(0, 1);

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2D62FF), Color(0xFF1F3BB3)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(32),
        boxShadow: const [
          BoxShadow(
            color: Color(0x332D62FF),
            blurRadius: 24,
            offset: Offset(0, 12),
          )
        ],
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: Colors.white.withOpacity(0.25),
                backgroundImage: profile.avatar.isNotEmpty ? NetworkImage(profile.avatar) : null,
                child: profile.avatar.isEmpty
                    ? Text(
                        profile.name.isNotEmpty ? profile.name.substring(0, 1) : 'L',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: Colors.white),
                      )
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.name,
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      profile.title,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Chip(
                          backgroundColor: Colors.white.withOpacity(0.15),
                          label: Text(
                            'Verification: ${verification.status}',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                          ),
                        ),
                        Chip(
                          backgroundColor: Colors.white.withOpacity(0.15),
                          label: Text(
                            '${snapshot.notifications.length} alerts',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            profile.bio,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withOpacity(0.85)),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: profile.stats
                .map(
                  (stat) => Container(
                    width: 120,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.25)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stat.label,
                          style: const TextStyle(color: Colors.white70, fontSize: 11, letterSpacing: 0.4),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          stat.value,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16),
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 24),
          Text(
            'Identity verification progress',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white70, letterSpacing: 0.6),
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: completionRatio,
              minHeight: 8,
              backgroundColor: Colors.white.withOpacity(0.2),
              valueColor: AlwaysStoppedAnimation<Color>(Colors.greenAccent.shade200),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${verification.documentsSubmitted}/${verification.documentsRequired} documents submitted',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricsGrid(BuildContext context, LearnerDashboardSnapshot snapshot) {
    if (snapshot.metrics.isEmpty) {
      return const SizedBox.shrink();
    }

    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: snapshot.metrics
          .map(
            (metric) => Container(
              width: 180,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: const [
                  BoxShadow(color: Color(0x142D62FF), blurRadius: 16, offset: Offset(0, 8)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    metric.label,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    metric.value,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  if (metric.change != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Row(
                        children: [
                          Icon(
                            metric.trend == 'down' ? Icons.arrow_downward : Icons.arrow_upward,
                            size: 16,
                            color: metric.trend == 'down' ? Colors.redAccent : Colors.green,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            metric.change!,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: metric.trend == 'down' ? Colors.redAccent : Colors.green,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildLiveClassesCard(
    BuildContext context,
    LiveClassroomsSnapshot snapshot,
    bool isWide,
  ) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFF1F5FF), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: const Color(0xFFDCE5FF)),
        boxShadow: const [
          BoxShadow(color: Color(0x0F2D62FF), blurRadius: 28, offset: Offset(0, 18)),
        ],
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Live classrooms',
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(
            'Preview readiness, whiteboards, and access controls before you go live.',
            style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: snapshot.metrics.isEmpty
                ? [
                    Text(
                      'Metrics will populate once a classroom is scheduled.',
                      style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey),
                    ),
                  ]
                : snapshot.metrics
                    .map((metric) => _buildLiveMetricChip(context, metric))
                    .toList(),
          ),
          const SizedBox(height: 24),
          if (snapshot.active.isNotEmpty) ...[
            Text(
              'Streaming now',
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            ...snapshot.active.map((session) => _buildLiveSessionTile(context, session)),
            const SizedBox(height: 20),
          ],
          Text(
            'Upcoming',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          if (snapshot.upcoming.isEmpty)
            _buildLiveEmptyState(context, 'No upcoming live classrooms yet. Schedule one to populate this view.')
          else
            ...snapshot.upcoming.map((session) => _buildLiveSessionTile(context, session)),
          const SizedBox(height: 20),
          if (snapshot.whiteboardSnapshots.isNotEmpty)
            _buildWhiteboardSnapshotRow(context, snapshot.whiteboardSnapshots, isWide),
          const SizedBox(height: 20),
          _buildReadinessList(context, snapshot.readiness),
        ],
      ),
    );
  }

  Widget _buildLiveMetricChip(BuildContext context, DashboardMetric metric) {
    final isDown = metric.trend == 'down';
    return Container(
      width: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE3EAFD)),
        boxShadow: const [
          BoxShadow(color: Color(0x142D62FF), blurRadius: 18, offset: Offset(0, 12)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            metric.label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.blueGrey.shade600),
          ),
          const SizedBox(height: 8),
          Text(
            metric.value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          if (metric.change != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                metric.change!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: isDown ? const Color(0xFFD14353) : const Color(0xFF1B8C5D),
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildLiveSessionTile(BuildContext context, LiveClassSessionSummary session) {
    final theme = Theme.of(context);
    final occupancy = session.occupancy;
    final security = session.security;
    final whiteboard = session.whiteboard;
    final callToAction = session.callToAction;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE3EAFD)),
        boxShadow: const [
          BoxShadow(color: Color(0x142D62FF), blurRadius: 18, offset: Offset(0, 12)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session.title,
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${session.startLabel}${session.timezone != null ? ' • ${session.timezone}' : ''}${session.community != null ? ' • ${session.community}' : ''}',
                      style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
                    ),
                  ],
                ),
              ),
              if (callToAction != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: callToAction.enabled ? const Color(0xFF2D62FF) : Colors.blueGrey.shade100,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    callToAction.label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: callToAction.enabled ? Colors.white : Colors.blueGrey,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          if (session.summary != null && session.summary!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                session.summary!,
                style: theme.textTheme.bodySmall,
              ),
            ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              Chip(
                label: Text(
                  occupancy.capacity != null
                      ? '${occupancy.reserved}/${occupancy.capacity} seats'
                      : '${occupancy.reserved} learners',
                ),
                avatar: const Icon(Icons.people_alt_outlined, size: 18),
              ),
              Chip(
                label: Text(security.waitingRoom ? 'Waiting room' : 'Direct entry'),
                avatar: Icon(
                  security.waitingRoom ? Icons.lock_outline : Icons.vpn_key_off,
                  size: 18,
                ),
              ),
              Chip(
                label: Text(security.passcodeRequired ? 'Passcode ready' : 'Add passcode'),
                avatar: Icon(
                  security.passcodeRequired ? Icons.verified_user_outlined : Icons.error_outline,
                  size: 18,
                ),
              ),
            ],
          ),
          if (whiteboard != null && whiteboard.template != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(
                  whiteboard.ready ? Icons.check_circle_outline : Icons.draw_outlined,
                  color: whiteboard.ready ? const Color(0xFF1B8C5D) : const Color(0xFFB7791F),
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        whiteboard.template!,
                        style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      if (whiteboard.lastUpdatedLabel != null)
                        Text(
                          'Updated ${whiteboard.lastUpdatedLabel}',
                          style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLiveEmptyState(BuildContext context, String message) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blueGrey.shade50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blueGrey.shade100),
      ),
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
      ),
    );
  }

  Widget _buildWhiteboardSnapshotRow(
    BuildContext context,
    List<LiveClassWhiteboardSnapshot> snapshots,
    bool isWide,
  ) {
    final items = snapshots.take(isWide ? 5 : 3).toList();
    if (items.isEmpty) {
      return const SizedBox.shrink();
    }
    return SizedBox(
      height: 150,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 16),
        itemBuilder: (context, index) {
          final snapshot = items[index];
          return Container(
            width: isWide ? 220 : 200,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFDCE5FF)),
              gradient: const LinearGradient(
                colors: [Color(0xFFEEF2FF), Colors.white],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  snapshot.title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Text(
                  snapshot.template,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
                ),
                const Spacer(),
                Row(
                  children: [
                    Icon(
                      snapshot.ready ? Icons.check_circle_outline : Icons.pending_actions_outlined,
                      color: snapshot.ready ? const Color(0xFF1B8C5D) : const Color(0xFFB7791F),
                      size: 18,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        snapshot.ready ? 'Ready' : 'Prep required',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: snapshot.ready ? const Color(0xFF1B8C5D) : const Color(0xFFB7791F),
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                  ],
                ),
                if (snapshot.lastUpdatedLabel != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      'Updated ${snapshot.lastUpdatedLabel}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildReadinessList(BuildContext context, List<LiveClassReadinessItem> readiness) {
    final theme = Theme.of(context);
    if (readiness.isEmpty) {
      return Text(
        'No readiness checks available yet.',
        style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: readiness
          .map(
            (item) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE3EAFD)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    item.status == 'ready'
                        ? Icons.check_circle_outline
                        : item.status == 'attention'
                            ? Icons.warning_amber_outlined
                            : Icons.priority_high_rounded,
                    color: item.status == 'ready'
                        ? const Color(0xFF1B8C5D)
                        : item.status == 'attention'
                            ? const Color(0xFFB7791F)
                            : const Color(0xFFD14353),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.label,
                          style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.detail,
                          style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildPaceCard(BuildContext context, LearnerDashboardSnapshot snapshot) {
    if (snapshot.learningPace.isEmpty) {
      return const SizedBox.shrink();
    }
    final maxMinutes = snapshot.learningPace.fold<int>(0, (max, entry) => entry.minutes > max ? entry.minutes : max);

    return _CardContainer(
      title: 'Learning pace',
      subtitle: 'Focus minutes across the last seven days',
      child: Column(
        children: snapshot.learningPace
            .map(
              (entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(entry.label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
                        Text('${entry.minutes} min', style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                    const SizedBox(height: 6),
                    LinearProgressIndicator(
                      value: maxMinutes == 0 ? 0 : entry.minutes / maxMinutes,
                      minHeight: 8,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2D62FF)),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildCommunityCard(BuildContext context, LearnerDashboardSnapshot snapshot) {
    if (snapshot.communityEngagement.isEmpty) {
      return const SizedBox.shrink();
    }
    final max = snapshot.communityEngagement.fold<int>(0, (max, entry) => entry.participation > max ? entry.participation : max);

    return _CardContainer(
      title: 'Community engagement',
      subtitle: 'Signals from your most active spaces',
      child: Column(
        children: snapshot.communityEngagement
            .map(
              (entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            entry.name,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text('${entry.participation} touchpoints', style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                    const SizedBox(height: 6),
                    LinearProgressIndicator(
                      value: max == 0 ? 0 : entry.participation / max,
                      minHeight: 8,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF1F3BB3)),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildUpcomingCard(BuildContext context, LearnerDashboardSnapshot snapshot) {
    if (snapshot.upcomingEvents.isEmpty) {
      return _CardContainer(
        title: 'Upcoming commitments',
        subtitle: 'We will notify you as soon as new sessions are scheduled.',
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Center(
            child: Text(
              'No upcoming events yet.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
            ),
          ),
        ),
      );
    }

    return _CardContainer(
      title: 'Upcoming commitments',
      subtitle: 'Stay prepared for workshops, AMAs, and coaching calls.',
      child: Column(
        children: snapshot.upcomingEvents
            .map(
              (event) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  color: const Color(0xFFF8FAFF),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(event.type, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.blueGrey)),
                        Text(event.date, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.blueGrey)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(event.title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text('Hosted by ${event.host}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
                    const SizedBox(height: 12),
                    FilledButton.tonal(
                      onPressed: () {},
                      child: Text(event.action),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildNotificationsCard(BuildContext context, LearnerDashboardSnapshot snapshot) {
    if (snapshot.notifications.isEmpty) {
      return _CardContainer(
        title: 'Notifications',
        subtitle: 'All caught up. New alerts will land here instantly.',
        child: Column(
          children: [
            const SizedBox(height: 12),
            Icon(Icons.notifications_none, size: 32, color: Colors.grey.shade500),
            const SizedBox(height: 12),
            Text('No active alerts', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    return _CardContainer(
      title: 'Notifications',
      subtitle: 'Latest items that need your attention.',
      trailing: Chip(
        label: Text('${snapshot.notifications.length}/${snapshot.totalNotifications} open'),
      ),
      child: Column(
        children: snapshot.notifications
            .take(5)
            .map(
              (notification) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFFEBF2FF),
                  child: Icon(
                    notification.type == 'messaging'
                        ? Icons.chat_bubble_outline
                        : notification.type == 'learning'
                            ? Icons.school_outlined
                            : Icons.notifications_outlined,
                    color: const Color(0xFF2D62FF),
                  ),
                ),
                title: Text(notification.title, style: Theme.of(context).textTheme.bodyMedium),
                subtitle: Text(notification.timestamp, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildHighlightsCard(BuildContext context, LearnerDashboardSnapshot snapshot) {
    if (snapshot.feedHighlights.isEmpty) {
      return _CardContainer(
        title: 'Feed highlights',
        subtitle: 'Your network is quiet. We will surface new signals here.',
        child: const SizedBox(height: 48),
      );
    }

    return _CardContainer(
      title: 'Feed highlights',
      subtitle: 'Signals curated across your communities.',
      child: Column(
        children: snapshot.feedHighlights
            .map(
              (highlight) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  color: Colors.white,
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(highlight.time, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.grey.shade600)),
                        Flexible(
                          child: Text(
                            highlight.tags.join(' • '),
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.grey.shade500),
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.right,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      highlight.headline,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.favorite_border, size: 16, color: Colors.pink.shade400),
                        const SizedBox(width: 4),
                        Text('${highlight.reactions}', style: Theme.of(context).textTheme.bodySmall),
                        const SizedBox(width: 16),
                        Icon(Icons.chat_bubble_outline, size: 16, color: Colors.blueGrey.shade300),
                        const SizedBox(width: 4),
                        Text('${highlight.comments}', style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildSafetyCard(BuildContext context, LearnerDashboardSnapshot snapshot) {
    final privacy = snapshot.privacySettings;
    final messaging = snapshot.messagingSettings;
    final followers = snapshot.followers;

    return _CardContainer(
      title: 'Safety & controls',
      subtitle: 'Track privacy, messaging, and follow approvals.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SafetyRow(
            icon: Icons.lock_outline,
            label: 'Visibility',
            value: privacy.visibility,
          ),
          _SafetyRow(
            icon: Icons.verified_user_outlined,
            label: 'Follow approvals',
            value: privacy.followApprovalRequired ? 'Required' : 'Auto-approve',
          ),
          _SafetyRow(
            icon: Icons.remove_red_eye_outlined,
            label: 'Activity sharing',
            value: privacy.shareActivity ? 'Enabled' : 'Muted',
          ),
          const Divider(height: 24),
          _SafetyRow(
            icon: Icons.chat_bubble_outline,
            label: 'Message access',
            value: privacy.messagePermission,
          ),
          _SafetyRow(
            icon: Icons.notifications_active_outlined,
            label: 'Push notifications',
            value: messaging.notificationsEnabled ? 'Enabled' : 'Disabled',
          ),
          const Divider(height: 24),
          _SafetyRow(
            icon: Icons.groups_outlined,
            label: 'Followers',
            value: '${followers.followers}',
          ),
          _SafetyRow(
            icon: Icons.person_add_outlined,
            label: 'Pending approvals',
            value: '${followers.pending}',
          ),
          _SafetyRow(
            icon: Icons.outgoing_mail_outlined,
            label: 'Outgoing requests',
            value: '${followers.outgoing}',
          ),
          _SafetyRow(
            icon: Icons.alternate_email,
            label: 'Unread messages',
            value: '${snapshot.unreadMessages}',
          ),
        ],
      ),
    );
  }

  Widget _buildBlogCard(BuildContext context, LearnerDashboardSnapshot snapshot) {
    final posts = snapshot.blogPosts;
    if (posts.isEmpty) {
      return _CardContainer(
        title: 'Edulure blog',
        subtitle: 'Enterprise insights will surface here when available.',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'No articles published yet',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              'Stay tuned for platform stories and product walkthroughs tailored to your learning journey.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => Navigator.of(context).pushNamed('/blog'),
              child: const Text('Visit blog hub'),
            ),
          ],
        ),
      );
    }

    final featured = snapshot.featuredBlog ?? posts.first;
    final supporting = posts.where((article) => article.slug != featured.slug).take(3).toList();

    return _CardContainer(
      title: 'Edulure blog',
      subtitle: 'Read platform announcements with mobile-responsive design parity.',
      trailing: TextButton(
        onPressed: () => Navigator.of(context).pushNamed('/blog'),
        child: const Text('Open blog'),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: const LinearGradient(
                colors: [Color(0xFFEEF2FF), Color(0xFFE0ECFF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (featured.heroImageUrl != null && featured.heroImageUrl!.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: Image.network(
                      featured.heroImageUrl!,
                      height: 160,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                if (featured.heroImageUrl != null && featured.heroImageUrl!.isNotEmpty)
                  const SizedBox(height: 12),
                Text(
                  featured.category,
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: const Color(0xFF2D62FF), fontWeight: FontWeight.w600, letterSpacing: 0.6),
                ),
                const SizedBox(height: 6),
                Text(
                  featured.title,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                ),
                const SizedBox(height: 6),
                Text(
                  featured.excerpt.isNotEmpty ? featured.excerpt : 'Tap to read the full announcement.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade700),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    Chip(
                      label: Text('${featured.readingTimeMinutes} min read'),
                      backgroundColor: Colors.white,
                      labelStyle: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    Chip(
                      label: Text(featured.publishedAt ?? 'Draft'),
                      backgroundColor: Colors.white,
                    ),
                    if (featured.isFeatured)
                      const Chip(
                        label: Text('Featured'),
                        backgroundColor: Color(0xFFFFF7E6),
                        labelStyle: TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w600),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => Navigator.of(context).pushNamed('/blog'),
                  child: const Text('Read featured article'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (supporting.isNotEmpty)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Recently published',
                  style: Theme.of(context)
                      .textTheme
                      .labelLarge
                      ?.copyWith(fontWeight: FontWeight.w600, color: Colors.grey.shade800),
                ),
                const SizedBox(height: 12),
                ...supporting.map(
                  (article) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      color: Colors.white,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                article.category,
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(color: Colors.grey.shade600, letterSpacing: 0.4),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                article.title,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(fontWeight: FontWeight.w600, color: Colors.grey.shade900),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                article.excerpt.isNotEmpty ? article.excerpt : 'Read more',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: Colors.grey.shade600),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '${article.readingTimeMinutes} min',
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.grey.shade500),
                            ),
                            const SizedBox(height: 8),
                            IconButton(
                              tooltip: 'Open article',
                              icon: const Icon(Icons.open_in_new, size: 20, color: Color(0xFF2D62FF)),
                              onPressed: () => Navigator.of(context).pushNamed('/blog'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _CardContainer extends StatelessWidget {
  const _CardContainer({
    required this.title,
    required this.child,
    this.subtitle,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(color: Color(0x11000000), blurRadius: 18, offset: Offset(0, 10)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    if (subtitle != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          subtitle!,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                        ),
                      ),
                  ],
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _SafetyRow extends StatelessWidget {
  const _SafetyRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF2D62FF)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
            ),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
