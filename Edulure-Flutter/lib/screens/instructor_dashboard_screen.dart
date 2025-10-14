import 'package:flutter/material.dart';

import '../services/course_service.dart';
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
          ? SafeArea(child: _buildAccessDenied(context))
          : SafeArea(
              child: RefreshIndicator(
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
            'Command cohorts, pricing, and tutor pods with live telemetry streams built for enterprise readiness.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricHighlights(BuildContext context) {
    final metrics = _dashboard?.metrics ?? [];
    if (metrics.isEmpty) {
      return _EmptyStateCard(
        title: 'No instructor metrics yet',
        description: 'Connect your course analytics and tutor utilisation feeds to surface live performance signals.',
      );
    }

    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: metrics
          .map(
            (metric) => _MetricHighlightCard(metric: metric),
          )
          .toList(),
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
    final revenueMix = _dashboard?.revenueMix ?? [];
    final offers = _dashboard?.offers ?? [];

    if (revenueMix.isEmpty && offers.isEmpty) {
      return _EmptyStateCard(
        title: 'Revenue data not connected',
        description:
            'Link your payments, sponsorship, and subscription sources to unlock composition tracking and offer performance.',
      );
    }

    return _SectionCard(
      title: 'Revenue levers',
      subtitle: 'Monitor the balance between monetisation streams and the health of each pricing offer.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (revenueMix.isNotEmpty) ...[
            Text('Revenue composition',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            ...revenueMix.map((slice) => _RevenueSliceRow(slice: slice)),
            if (offers.isNotEmpty) const SizedBox(height: 20),
          ],
          if (offers.isNotEmpty) ...[
            Text('Active offers',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            ...offers.map(
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
                        Flexible(
                          child: Text(
                            offer.name,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(offer.price, style: Theme.of(context).textTheme.bodyMedium),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        Chip(label: Text(offer.status.isEmpty ? 'Draft' : offer.status)),
                        Chip(label: Text('Conversion ${offer.conversion.isEmpty ? 'N/A' : offer.conversion}')),
                        Chip(label: Text(offer.learners.isEmpty ? '0 learners' : offer.learners)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
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
                trailing: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (session.price.isNotEmpty)
                      Text(session.price, style: Theme.of(context).textTheme.bodySmall),
                    if (session.seats.isNotEmpty)
                      Text(
                        session.seats,
                        style: Theme.of(context)
                            .textTheme
                            .labelSmall
                            ?.copyWith(color: Colors.blueGrey.shade600, fontWeight: FontWeight.w600),
                      ),
                  ],
                ),
                dense: true,
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

class _MetricHighlightCard extends StatelessWidget {
  const _MetricHighlightCard({required this.metric});

  final DashboardMetric metric;

  @override
  Widget build(BuildContext context) {
    final bool isDownward = metric.isDownward;
    final Color changeColor = isDownward ? Colors.red.shade600 : const Color(0xFF0E9F6E);
    final IconData trendIcon = isDownward ? Icons.south_east : Icons.north_east;

    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 160, maxWidth: 220),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFE6ECFF)),
          gradient: LinearGradient(
            colors: [
              const Color(0xFF2D62FF).withOpacity(0.12),
              Colors.white,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: const [
            BoxShadow(color: Color(0x1A2D62FF), blurRadius: 18, offset: Offset(0, 12)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              metric.label,
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(letterSpacing: 0.8, color: const Color(0xFF41507B), fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),
            Text(
              metric.value,
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w700, color: const Color(0xFF0D1635)),
            ),
            if (metric.change != null && metric.change!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: changeColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(trendIcon, size: 16, color: changeColor),
                        const SizedBox(width: 6),
                        Text(
                          metric.change!,
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: changeColor),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RevenueSliceRow extends StatelessWidget {
  const _RevenueSliceRow({required this.slice});

  final RevenueSlice slice;

  @override
  Widget build(BuildContext context) {
    return Container(
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
              Expanded(
                child: Text(
                  slice.name,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(width: 12),
              Text(slice.formattedPercent, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: 8,
              value: slice.percent / 100,
              backgroundColor: Colors.blueGrey.shade50,
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2D62FF)),
            ),
          ),
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
