import 'package:flutter/material.dart';

import '../services/course_service.dart';
import '../services/dashboard_service.dart';
import '../services/session_manager.dart';

class InstructorDashboardScreen extends StatefulWidget {
  const InstructorDashboardScreen({super.key});

  @override
  State<InstructorDashboardScreen> createState() => _InstructorDashboardScreenState();
}

class _InstructorDashboardScreenState extends State<InstructorDashboardScreen> {
  final CourseService _service = CourseService();
  CourseDashboard? _dashboard;
  bool _loading = true;
  String? _error;

  Map<String, dynamic>? get _session => SessionManager.getSession();

  Map<String, dynamic>? get _user =>
      _session != null && _session!['user'] is Map ? Map<String, dynamic>.from(_session!['user']) : null;

  String? get _verificationStatus =>
      _session != null && _session!['verification'] is Map ? _session!['verification']['status']?.toString() : null;

  bool get _hasInstructorAccess {
    final activeRole = SessionManager.getActiveRole();
    if (activeRole == 'instructor') {
      return true;
    }
    final role = _user?['role']?.toString();
    return role == 'instructor';
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!_hasInstructorAccess) {
      setState(() {
        _loading = false;
        _dashboard = null;
        _error = null;
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final dashboard = await _service.fetchDashboard();
      if (!mounted) return;
      setState(() {
        _dashboard = dashboard;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _loading = false;
      });
    }
  }

  String get _displayName {
    final firstName = _user?['firstName']?.toString() ?? '';
    final lastName = _user?['lastName']?.toString() ?? '';
    final fullName = '$firstName $lastName'.trim();
    if (fullName.isNotEmpty) {
      return fullName;
    }
    return _user?['email']?.toString() ?? 'Instructor';
  }

  String get _initials {
    final firstName = _user?['firstName']?.toString() ?? '';
    final lastName = _user?['lastName']?.toString() ?? '';
    final initials = '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'.trim();
    if (initials.isNotEmpty) {
      return initials.toUpperCase();
    }
    final email = _user?['email']?.toString() ?? 'I';
    return email.isNotEmpty ? email[0].toUpperCase() : 'I';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Instructor dashboard'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: !_hasInstructorAccess
          ? _buildAccessDenied(context)
          : RefreshIndicator(
              onRefresh: _load,
              child: _loading && _dashboard == null
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: 240, child: Center(child: CircularProgressIndicator())),
                      ],
                    )
                  : ListView(
                      padding: const EdgeInsets.all(20),
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        if (_error != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.red.shade200),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('We could not load the latest data',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(fontWeight: FontWeight.w600, color: Colors.red.shade700)),
                                const SizedBox(height: 8),
                                Text(
                                  _error!,
                                  style: TextStyle(color: Colors.red.shade700),
                                ),
                                const SizedBox(height: 12),
                                FilledButton.icon(
                                  onPressed: _load,
                                  icon: const Icon(Icons.refresh),
                                  label: const Text('Retry'),
                                ),
                              ],
                            ),
                          ),
                        _buildHeroCard(context),
                        const SizedBox(height: 20),
                        _buildMetricHighlights(context),
                        const SizedBox(height: 20),
                        _buildLiveClassroomsSection(context),
                        const SizedBox(height: 20),
                        _buildPipelineSection(context),
                        const SizedBox(height: 20),
                        _buildProductionSection(context),
                        const SizedBox(height: 20),
                        _buildRevenueSection(context),
                        const SizedBox(height: 20),
                        _buildInsightsSection(context),
                      ],
                    ),
            ),
    );
  }

  Widget _buildAccessDenied(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock_outline, size: 64, color: Colors.blueGrey.shade300),
            const SizedBox(height: 16),
            Text(
              'Instructor access required',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            const Text(
              'Switch to your instructor workspace or contact an administrator to get access to the instructor dashboard.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Return'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroCard(BuildContext context) {
    final verificationStatus = _verificationStatus;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2D62FF), Color(0xFF1F3BB3)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: Colors.white.withOpacity(0.15),
                child: Text(
                  _initials,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: Colors.white),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _displayName,
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Chip(
                          label: const Text('Instructor workspace'),
                          avatar: const Icon(Icons.school_outlined, color: Colors.white, size: 18),
                          labelStyle: const TextStyle(color: Colors.white),
                          backgroundColor: Colors.white.withOpacity(0.2),
                        ),
                        const SizedBox(width: 8),
                        Chip(
                          label: Text(verificationStatus == 'verified' ? 'Verified' : 'Verification pending'),
                          avatar: Icon(
                            verificationStatus == 'verified' ? Icons.verified_outlined : Icons.mark_email_unread_outlined,
                            size: 18,
                            color: Colors.white,
                          ),
                          labelStyle: const TextStyle(color: Colors.white),
                          backgroundColor: Colors.white.withOpacity(0.2),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            'Monitor cohort momentum, orchestrate production, and keep monetisation levers balanced.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricHighlights(BuildContext context) {
    final pipelineCount = _dashboard?.pipeline.length ?? 0;
    final productionCount = _dashboard?.production.length ?? 0;
    final offersCount = _dashboard?.offers.length ?? 0;
    final sessionCount = _dashboard?.sessions.length ?? 0;

    final metrics = [
      _MetricTile(label: 'Pipeline cohorts', value: '$pipelineCount', description: 'Awaiting launch approvals'),
      _MetricTile(label: 'Production tasks', value: '$productionCount', description: 'In-flight deliverables'),
      _MetricTile(label: 'Active offers', value: '$offersCount', description: 'Pricing packages live now'),
      _MetricTile(label: 'Upcoming sessions', value: '$sessionCount', description: 'Tutor hours scheduled'),
    ];

    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: metrics
          .map(
            (metric) => SizedBox(
              width: 170,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.blueGrey.shade50),
                  color: Colors.blueGrey.shade50.withOpacity(0.4),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(metric.label,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.blueGrey.shade700)),
                    const SizedBox(height: 8),
                    Text(
                      metric.value,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      metric.description,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
                    ),
                  ],
                ),
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildLiveClassroomsSection(BuildContext context) {
    final snapshot = _dashboard?.liveClassrooms;
    if (snapshot == null) {
      return _EmptyStateCard(
        title: 'Live classrooms not configured',
        description:
            'Connect your streaming provider and publish your first live classroom to unlock host controls and readiness automations.',
      );
    }

    final theme = Theme.of(context);
    final metrics = snapshot.metrics;
    final active = snapshot.active;
    final upcoming = snapshot.upcoming;
    final completed = snapshot.completed;
    final groups = snapshot.groups;
    final boards = snapshot.whiteboardSnapshots;
    final readiness = snapshot.readiness;
    final hasSessions = active.isNotEmpty || upcoming.isNotEmpty;

    return _SectionCard(
      title: 'Live classrooms mission control',
      subtitle: 'Monitor occupancy, facilitator readiness, and monetisation in real time.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (metrics.isNotEmpty) ...[
            SizedBox(
              height: 110,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: metrics.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) => _buildLiveMetricTile(metrics[index], theme),
              ),
            ),
            const SizedBox(height: 16),
          ],
          if (hasSessions) ...[
            if (active.isNotEmpty) _buildSessionList(context, 'Live now', active),
            if (active.isNotEmpty && upcoming.isNotEmpty) const SizedBox(height: 12),
            if (upcoming.isNotEmpty)
              _buildSessionList(
                context,
                'In staging',
                upcoming.length > 3 ? upcoming.sublist(0, 3) : upcoming,
              ),
            const SizedBox(height: 16),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFEEF2FF),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Text(
                'Schedule a live broadcast to unlock seat fill, host controls, and readiness automation.',
                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade700),
              ),
            ),
            const SizedBox(height: 16),
          ],
          if (groups.isNotEmpty) ...[
            Text('Group labs', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: groups.map((session) => _buildGroupChip(session, theme)).toList(),
            ),
            const SizedBox(height: 16),
          ],
          if (boards.isNotEmpty) ...[
            Text('Whiteboard snapshots', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...boards.map((board) => _buildWhiteboardCard(board, theme)),
            const SizedBox(height: 16),
          ],
          if (readiness.isNotEmpty) ...[
            Text('Operational checklist', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...readiness.map((item) => _buildReadinessRow(item, theme)),
            const SizedBox(height: 16),
          ],
          if (completed.isNotEmpty) ...[
            Text('Recently completed', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: completed.take(4).map((session) => _buildCompletedChip(session, theme)).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLiveMetricTile(DashboardMetric metric, ThemeData theme) {
    final trendDown = metric.trend == 'down';
    final accent = trendDown ? const Color(0xFFEF4444) : const Color(0xFF10B981);
    return Container(
      width: 200,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          colors: [const Color(0xFFEEF2FF), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: Colors.blueGrey.shade50),
        boxShadow: const [
          BoxShadow(color: Color(0x11000000), blurRadius: 18, offset: Offset(0, 10)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            metric.label,
            style: theme.textTheme.labelLarge?.copyWith(color: Colors.blueGrey.shade600),
          ),
          const SizedBox(height: 12),
          Text(
            metric.value,
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          if (metric.change != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(trendDown ? Icons.trending_down : Icons.trending_up, size: 18, color: accent),
                const SizedBox(width: 6),
                Text(
                  metric.change!,
                  style: theme.textTheme.bodySmall?.copyWith(color: accent, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSessionList(
    BuildContext context,
    String title,
    List<LiveClassSessionSummary> sessions,
  ) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 10),
        ...sessions.map((session) => _buildSessionCard(context, session)).toList(),
      ],
    );
  }

  Widget _buildSessionCard(BuildContext context, LiveClassSessionSummary session) {
    final theme = Theme.of(context);
    final accent = _statusAccent(session.status);
    final timeline = [
      session.startLabel,
      if (session.timezone != null && session.timezone!.isNotEmpty) session.timezone!,
      if (session.community != null && session.community!.isNotEmpty) session.community!,
    ].join(' • ');
    final occupancyLabel = _occupancyLabel(session);
    final occupancyRate = session.occupancy.rate;
    final security = session.security;
    final whiteboard = session.whiteboard;
    final callToAction = session.callToAction;

    final infoPills = <Widget>[
      _buildInfoPill(
        theme,
        Icons.people_outline,
        occupancyRate != null ? '$occupancyLabel • ${occupancyRate}% fill' : occupancyLabel,
        accent: accent,
      ),
      _buildInfoPill(
        theme,
        Icons.security_outlined,
        '${security.waitingRoom ? 'Waiting room' : 'Direct entry'} • ${security.passcodeRequired ? 'Passcode enforced' : 'Passcode open'}',
        accent: accent,
      ),
      _buildInfoPill(
        theme,
        security.recordingConsent ? Icons.verified_user_outlined : Icons.record_voice_over_outlined,
        security.recordingConsent ? 'Recording consent active' : 'Capture recording consent',
        accent: security.recordingConsent ? const Color(0xFF0EA5E9) : const Color(0xFFF97316),
      ),
    ];

    if (whiteboard != null) {
      infoPills.add(
        _buildInfoPill(
          theme,
          Icons.draw_outlined,
          '${whiteboard.template ?? 'Whiteboard'} • ${whiteboard.ready ? 'Ready' : 'In prep'}',
          accent: accent,
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          colors: [accent.withOpacity(0.12), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: accent.withOpacity(0.3)),
        boxShadow: const [
          BoxShadow(color: Color(0x12000000), blurRadius: 22, offset: Offset(0, 14)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: accent.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  session.stage,
                  style: TextStyle(color: accent, fontWeight: FontWeight.w600, fontSize: 12),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: accent.withOpacity(0.35)),
                ),
                child: Text(
                  _statusLabel(session.status),
                  style: TextStyle(color: accent, fontWeight: FontWeight.w700, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            session.title,
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            timeline,
            style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
          ),
          if (session.summary != null && session.summary!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              session.summary!,
              style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade700),
            ),
          ],
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: infoPills,
          ),
          if (session.breakoutRooms.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: session.breakoutRooms
                  .map(
                    (room) => Chip(
                      label: Text(room),
                      backgroundColor: const Color(0xFFF8FAFF),
                      side: BorderSide(color: Colors.blueGrey.shade100),
                    ),
                  )
                  .toList(),
            ),
          ],
          if (callToAction != null) ...[
            const SizedBox(height: 18),
            Align(
              alignment: Alignment.centerRight,
              child: (callToAction.action == 'host' ||
                      callToAction.action == 'join' ||
                      callToAction.action == 'check-in')
                  ? FilledButton(
                      onPressed: callToAction.enabled
                          ? () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('${callToAction.label} • workflow coming soon'),
                                ),
                              );
                            }
                          : null,
                      child: Text(callToAction.label),
                    )
                  : OutlinedButton(
                      onPressed: callToAction.enabled
                          ? () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('${callToAction.label} • workflow coming soon'),
                                ),
                              );
                            }
                          : null,
                      child: Text(callToAction.label),
                    ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoPill(ThemeData theme, IconData icon, String label, {Color? accent}) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 260),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.blueGrey.shade50),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 12, offset: Offset(0, 6)),
        ],
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: accent ?? const Color(0xFF2563EB)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600, color: Colors.blueGrey.shade700),
            ),
          ),
        ],
      ),
    );
  }

  String _occupancyLabel(LiveClassSessionSummary session) {
    final capacity = session.occupancy.capacity;
    if (capacity != null && capacity > 0) {
      return '${session.occupancy.reserved}/$capacity seats';
    }
    return '${session.occupancy.reserved} learners';
  }

  Color _statusAccent(String status) {
    switch (status.toLowerCase()) {
      case 'live':
        return const Color(0xFF10B981);
      case 'check-in':
        return const Color(0xFFF59E0B);
      case 'upcoming':
        return const Color(0xFF2563EB);
      case 'completed':
        return const Color(0xFF64748B);
      default:
        return const Color(0xFF1E40AF);
    }
  }

  String _statusLabel(String status) {
    if (status.isEmpty) return 'Draft';
    final lower = status.toLowerCase();
    switch (lower) {
      case 'live':
        return 'Live';
      case 'check-in':
        return 'Check-in';
      case 'upcoming':
        return 'Upcoming';
      case 'completed':
        return 'Completed';
      default:
        return lower[0].toUpperCase() + lower.substring(1);
    }
  }

  Widget _buildGroupChip(LiveClassSessionSummary session, ThemeData theme) {
    return Container(
      width: 240,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFF),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.blueGrey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(session.title, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(
            '${session.startLabel}${session.community != null ? ' • ${session.community}' : ''}',
            style: theme.textTheme.labelSmall?.copyWith(color: Colors.blueGrey.shade600),
          ),
          const SizedBox(height: 4),
          Text(
            _occupancyLabel(session),
            style: theme.textTheme.labelSmall?.copyWith(color: Colors.blueGrey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildCompletedChip(LiveClassSessionSummary session, ThemeData theme) {
    return Container(
      width: 220,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(session.title, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(
            session.startLabel,
            style: theme.textTheme.labelSmall?.copyWith(color: Colors.blueGrey.shade600),
          ),
          const SizedBox(height: 4),
          Text(
            'Completed • ${_occupancyLabel(session)}',
            style: theme.textTheme.labelSmall?.copyWith(color: Colors.blueGrey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildWhiteboardCard(LiveClassWhiteboardSnapshot board, ThemeData theme) {
    final ready = board.ready;
    final accent = ready ? const Color(0xFF059669) : const Color(0xFFF97316);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          colors: ready
              ? [const Color(0xFFEFFDF6), Colors.white]
              : [const Color(0xFFFFF7ED), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: accent.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.draw_outlined, color: accent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  board.title,
                  style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: accent.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  ready ? 'Ready' : 'In prep',
                  style: TextStyle(color: accent, fontWeight: FontWeight.w700, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            board.template,
            style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
          ),
          if (board.lastUpdatedLabel != null) ...[
            const SizedBox(height: 6),
            Text(
              'Updated ${board.lastUpdatedLabel}',
              style: theme.textTheme.labelSmall?.copyWith(color: Colors.blueGrey.shade500),
            ),
          ],
          if (board.facilitators.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Facilitators: ${board.facilitators.join(', ')}',
              style: theme.textTheme.labelSmall?.copyWith(color: Colors.blueGrey.shade500),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildReadinessRow(LiveClassReadinessItem item, ThemeData theme) {
    final status = item.status.toLowerCase();
    late Color accent;
    late IconData icon;
    late String label;
    switch (status) {
      case 'ready':
        accent = const Color(0xFF10B981);
        icon = Icons.verified_outlined;
        label = 'Ready';
        break;
      case 'attention':
        accent = const Color(0xFFF59E0B);
        icon = Icons.error_outline;
        label = 'Review';
        break;
      default:
        accent = const Color(0xFFEF4444);
        icon = Icons.priority_high_outlined;
        label = 'Action';
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: accent.withOpacity(0.25)),
        color: accent.withOpacity(0.08),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: accent),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.label, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(
                  item.detail,
                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade700),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              label,
              style: theme.textTheme.labelSmall?.copyWith(color: accent, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPipelineSection(BuildContext context) {
    final pipeline = _dashboard?.pipeline ?? [];
    if (pipeline.isEmpty) {
      return _EmptyStateCard(
        title: 'No cohorts scheduled',
        description: 'Draft your next launch to keep learners on standby informed and nurture demand.',
      );
    }

    return _SectionCard(
      title: 'Launch radar',
      subtitle: 'These cohorts are closest to enrolment go-live.',
      child: Column(
        children: pipeline
            .map(
              (entry) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.blueGrey.shade50),
                  color: Colors.white,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFF2D62FF).withOpacity(0.08),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            entry.stage,
                            style: const TextStyle(color: Color(0xFF2D62FF), fontWeight: FontWeight.w600, fontSize: 12),
                          ),
                        ),
                        Text(entry.startDate, style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(entry.name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    Text(entry.learners, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600)),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildProductionSection(BuildContext context) {
    final production = _dashboard?.production ?? [];
    if (production.isEmpty) {
      return _EmptyStateCard(
        title: 'Production queue is clear',
        description: 'Assign lesson scripting, filming, and QA tasks to keep assets shipping on time.',
      );
    }

    return _SectionCard(
      title: 'Production board',
      subtitle: 'Active deliverables owned by your instructors and creative team.',
      child: Column(
        children: production
            .map(
              (task) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.blueGrey.shade50),
                  color: Colors.white,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Owner ${task.owner}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            task.status,
                            style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.w600, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(task.asset,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    Text(task.type, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600)),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildRevenueSection(BuildContext context) {
    final offers = _dashboard?.offers ?? [];
    if (offers.isEmpty) {
      return _EmptyStateCard(
        title: 'No offers configured',
        description: 'Launch pricing packages or seat-based cohorts to start tracking revenue mix.',
      );
    }

    return _SectionCard(
      title: 'Revenue levers',
      subtitle: 'Offer performance across your instructor portfolio.',
      child: Column(
        children: offers
            .map(
              (offer) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.blueGrey.shade50),
                  color: Colors.white,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(offer.name,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                        Text(offer.price, style: Theme.of(context).textTheme.bodyMedium),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      children: [
                        Chip(label: Text(offer.status.isEmpty ? 'Draft' : offer.status)),
                        Chip(label: Text('Conversion ${offer.conversion.isEmpty ? 'N/A' : offer.conversion}')),
                        Chip(label: Text(offer.learners.isEmpty ? '0 learners' : offer.learners)),
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

  Widget _buildInsightsSection(BuildContext context) {
    final sessions = _dashboard?.sessions ?? [];
    final insights = _dashboard?.insights ?? [];

    if (sessions.isEmpty && insights.isEmpty) {
      return _EmptyStateCard(
        title: 'No insights yet',
        description: 'As you run more live programming we will surface tutor utilisation and pricing suggestions here.',
      );
    }

    return _SectionCard(
      title: 'Operational intelligence',
      subtitle: 'Signals generated from your tutor bookings and pricing experiments.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (sessions.isNotEmpty) ...[
            Text('Upcoming tutor sessions',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...sessions.map(
              (session) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.calendar_month_outlined),
                title: Text(session.name),
                subtitle: Text('${session.date} • ${session.status.isEmpty ? 'Scheduled' : session.status}'),
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (insights.isNotEmpty) ...[
            Text('Revenue insights',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...insights.map(
              (insight) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.bolt_outlined, size: 18, color: Color(0xFF2D62FF)),
                    const SizedBox(width: 8),
                    Expanded(child: Text(insight)),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.subtitle, required this.child});

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.blueGrey.shade50),
        boxShadow: const [
          BoxShadow(color: Color(0x11000000), blurRadius: 18, offset: Offset(0, 8)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(subtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600)),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _EmptyStateCard extends StatelessWidget {
  const _EmptyStateCard({required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.blueGrey.shade50, style: BorderStyle.solid),
        color: Colors.blueGrey.shade50.withOpacity(0.4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(description, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600)),
        ],
      ),
    );
  }
}

class _MetricTile {
  const _MetricTile({required this.label, required this.value, required this.description});

  final String label;
  final String value;
  final String description;
}
