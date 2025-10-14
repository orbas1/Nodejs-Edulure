import 'package:flutter/material.dart';

import '../services/dashboard_service.dart';

class CommunityDashboardScreen extends StatefulWidget {
  const CommunityDashboardScreen({super.key});

  @override
  State<CommunityDashboardScreen> createState() => _CommunityDashboardScreenState();
}

class _CommunityDashboardScreenState extends State<CommunityDashboardScreen> {
  final DashboardService _service = DashboardService();
  CommunityDashboardSnapshot? _snapshot;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final snapshot = await _service.fetchCommunityDashboard();
      if (!mounted) return;
      setState(() {
        _snapshot = snapshot;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Community dashboard'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading && _snapshot == null
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 280, child: Center(child: CircularProgressIndicator())),
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
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'We could not load community telemetry',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w600, color: Colors.red.shade700),
                          ),
                          const SizedBox(height: 8),
                          Text(_error!, style: TextStyle(color: Colors.red.shade700)),
                          const SizedBox(height: 12),
                          FilledButton.icon(
                            onPressed: _load,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Retry'),
                          )
                        ],
                      ),
                    ),
                  if (_snapshot != null) ...[
                    _buildMetricHighlights(context, _snapshot!),
                    const SizedBox(height: 20),
                    _buildHealthSection(context, _snapshot!),
                    const SizedBox(height: 20),
                    _buildRunbooksSection(context, _snapshot!),
                    const SizedBox(height: 20),
                    _buildProgrammingSection(context, _snapshot!),
                    const SizedBox(height: 20),
                    _buildMonetisationSection(context, _snapshot!),
                    const SizedBox(height: 20),
                    _buildCommunicationsSection(context, _snapshot!),
                  ]
                ],
              ),
      ),
    );
  }

  Widget _buildMetricHighlights(BuildContext context, CommunityDashboardSnapshot snapshot) {
    final metrics = snapshot.metrics;
    final localizations = MaterialLocalizations.of(context);
    final syncedLabel =
        '${localizations.formatShortDate(snapshot.syncedAt)} ${localizations.formatTimeOfDay(TimeOfDay.fromDateTime(snapshot.syncedAt))}';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(colors: [Color(0xFFEEF2FF), Color(0xFFE0E7FF)]),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Community command center',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: metrics.map((metric) => _buildMetricChip(context, metric)).toList(),
          ),
          const SizedBox(height: 12),
          Text(
            'Synced $syncedLabel',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade700),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricChip(BuildContext context, DashboardMetric metric) {
    final color = metric.trend == 'down' ? Colors.red.shade500 : Colors.green.shade600;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: Colors.white,
        border: Border.all(color: Colors.indigo.shade100),
        boxShadow: const [BoxShadow(color: Color(0x11000000), blurRadius: 12, offset: Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(metric.label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade500)),
          const SizedBox(height: 6),
          Text(metric.value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          if (metric.change != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(metric.change!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: color)),
            ),
        ],
      ),
    );
  }

  Widget _buildHealthSection(BuildContext context, CommunityDashboardSnapshot snapshot) {
    final entries = snapshot.health;
    if (entries.isEmpty) {
      return _buildPlaceholderCard(
        context,
        icon: Icons.health_and_safety_outlined,
        title: 'No communities stewarded yet',
        subtitle: 'Launch or claim a community to begin monitoring membership health and incident coverage.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Community health', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        ...entries.map((entry) => _buildHealthCard(context, entry)).toList(),
      ],
    );
  }

  Widget _buildHealthCard(BuildContext context, CommunityHealthEntry entry) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.indigo.shade100),
        color: Colors.white,
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
                    Text(entry.name, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(entry.members, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade500)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  color: Colors.indigo.shade50,
                ),
                child: Text(entry.health, style: Theme.of(context).textTheme.bodySmall),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            children: [
              Chip(label: Text(entry.trend, style: const TextStyle(fontSize: 12))),
              Chip(label: Text('${entry.incidentsOpen} incidents', style: const TextStyle(fontSize: 12))),
              Chip(label: Text('${entry.escalationsOpen} escalations', style: const TextStyle(fontSize: 12))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRunbooksSection(BuildContext context, CommunityDashboardSnapshot snapshot) {
    final runbooks = snapshot.runbooks;
    final escalations = snapshot.escalations;
    if (runbooks.isEmpty && escalations.isEmpty) {
      return _buildPlaceholderCard(
        context,
        icon: Icons.library_books_outlined,
        title: 'No runbooks found',
        subtitle: 'Document your rituals and escalation protocols to orchestrate consistent community operations.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Operations', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        if (runbooks.isNotEmpty)
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Runbooks', style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ...runbooks.map((runbook) => _buildRunbookCard(context, runbook)).toList(),
            ],
          ),
        if (escalations.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text('Escalations', style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ...escalations.map((task) => _buildEscalationCard(context, task)).toList(),
        ]
      ],
    );
  }

  Widget _buildRunbookCard(BuildContext context, CommunityRunbook runbook) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: Colors.white,
        border: Border.all(color: Colors.indigo.shade100),
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
                    Text(runbook.title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text('Maintained by ${runbook.owner}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade500)),
                  ],
                ),
              ),
              if (runbook.automationReady)
                const Icon(Icons.auto_mode_outlined, color: Color(0xFF2563EB))
              else
                const Icon(Icons.pending_outlined, color: Color(0xFF94A3B8)),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            children: [
              Chip(label: Text('Updated ${runbook.updatedAt}', style: const TextStyle(fontSize: 12))),
              ...runbook.tags.map((tag) => Chip(label: Text(tag, style: const TextStyle(fontSize: 12)))).toList(),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildEscalationCard(BuildContext context, CommunityEscalation task) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.amber.shade200),
        color: Colors.amber.shade50,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(task.title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(task.community, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.amber.shade700)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            children: [
              Chip(label: Text('Owner: ${task.owner}', style: const TextStyle(fontSize: 12))),
              Chip(label: Text('Due: ${task.due}', style: const TextStyle(fontSize: 12))),
              Chip(label: Text('Status: ${task.status}', style: const TextStyle(fontSize: 12))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProgrammingSection(BuildContext context, CommunityDashboardSnapshot snapshot) {
    final events = snapshot.events;
    final pods = snapshot.tutorPods;
    if (events.isEmpty && pods.isEmpty) {
      return _buildPlaceholderCard(
        context,
        icon: Icons.calendar_today_outlined,
        title: 'No events scheduled',
        subtitle: 'Plan rituals, live classrooms, or mentor pods to populate your programming roadmap.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Programming & rituals', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        if (events.isNotEmpty) ...[
          Text('Upcoming events', style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ...events.map((event) => _buildEventCard(context, event)).toList(),
        ],
        if (pods.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text('Mentor pods', style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ...pods.map((pod) => _buildTutorPodCard(context, pod)).toList(),
        ],
      ],
    );
  }

  Widget _buildEventCard(BuildContext context, CommunityEventCard event) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.indigo.shade100),
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(event.title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(event.date, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade500)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            children: [
              Chip(label: Text(event.facilitator, style: const TextStyle(fontSize: 12))),
              Chip(label: Text(event.seats, style: const TextStyle(fontSize: 12))),
              Chip(label: Text(event.status, style: const TextStyle(fontSize: 12))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTutorPodCard(BuildContext context, CommunityTutorPod pod) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.indigo.shade100),
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(pod.mentor, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(pod.focus, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade500)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 10,
            children: [
              Chip(label: Text(pod.status, style: const TextStyle(fontSize: 12))),
              Chip(label: Text(pod.scheduled, style: const TextStyle(fontSize: 12))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMonetisationSection(BuildContext context, CommunityDashboardSnapshot snapshot) {
    final tiers = snapshot.tiers;
    final experiments = snapshot.experiments;
    final insights = snapshot.insights;

    if (tiers.isEmpty && experiments.isEmpty && insights.isEmpty) {
      return _buildPlaceholderCard(
        context,
        icon: Icons.payments_outlined,
        title: 'No monetisation data',
        subtitle: 'Launch a premium tier or experiment to surface community revenue telemetry.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Monetisation', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        if (tiers.isNotEmpty) ...[
          Text('Premium tiers', style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ...tiers.map((tier) => _buildTierCard(context, tier)).toList(),
        ],
        if (experiments.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text('Experiments', style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ...experiments.map((exp) => _buildExperimentCard(context, exp)).toList(),
        ],
        if (insights.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text('Insights', style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ...insights.map((insight) => _buildInsightCard(context, insight)).toList(),
        ],
      ],
    );
  }

  Widget _buildTierCard(BuildContext context, CommunityTier tier) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.green.shade100),
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(tier.name, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(tier.price, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.green.shade700)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            children: [
              Chip(label: Text(tier.members, style: const TextStyle(fontSize: 12))),
              Chip(label: Text(tier.churn, style: const TextStyle(fontSize: 12))),
              Chip(label: Text('Renews ${tier.renewal}', style: const TextStyle(fontSize: 12))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildExperimentCard(BuildContext context, CommunityExperiment experiment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blue.shade100),
        color: Colors.blue.shade50,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(experiment.name, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(experiment.community, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blue.shade700)),
          const SizedBox(height: 6),
          Text(experiment.hypothesis, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 6),
          Chip(label: Text(experiment.status, style: const TextStyle(fontSize: 12))),
        ],
      ),
    );
  }

  Widget _buildInsightCard(BuildContext context, String insight) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.indigo.shade100),
        color: Colors.indigo.shade50,
      ),
      child: Text(insight, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade800)),
    );
  }

  Widget _buildCommunicationsSection(BuildContext context, CommunityDashboardSnapshot snapshot) {
    final highlights = snapshot.highlights;
    final trends = snapshot.trends;
    final incidents = snapshot.incidents;

    if (highlights.isEmpty && trends.isEmpty && incidents.isEmpty) {
      return _buildPlaceholderCard(
        context,
        icon: Icons.chat_bubble_outline,
        title: 'No communications data',
        subtitle: 'As conversations and escalations flow in, we will surface highlights and trends here.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Communications & safety', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        if (highlights.isNotEmpty) ...[
          Text('Highlights', style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ...highlights.map((highlight) => _buildHighlightCard(context, highlight)).toList(),
        ],
        if (incidents.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text('Incidents', style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ...incidents.map((incident) => _buildIncidentCard(context, incident)).toList(),
        ],
        if (trends.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text('Engagement trends', style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ...trends.map((trend) => _buildTrendCard(context, trend)).toList(),
        ],
      ],
    );
  }

  Widget _buildHighlightCard(BuildContext context, CommunityHighlight highlight) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.purple.shade100),
        color: Colors.purple.shade50,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(highlight.community, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.purple.shade700)),
          const SizedBox(height: 6),
          Text(highlight.preview, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            children: [
              Chip(label: Text(highlight.postedAt, style: const TextStyle(fontSize: 12))),
              Chip(label: Text('${highlight.reactions} reactions', style: const TextStyle(fontSize: 12))),
              ...highlight.tags.map((tag) => Chip(label: Text('#$tag', style: const TextStyle(fontSize: 12)))).toList(),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildIncidentCard(BuildContext context, CommunityIncident incident) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.red.shade200),
        color: Colors.red.shade50,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(incident.summary, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(incident.communityName, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.red.shade700)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            children: [
              Chip(label: Text('Severity: ${incident.severity}', style: const TextStyle(fontSize: 12))),
              Chip(label: Text('Owner: ${incident.owner}', style: const TextStyle(fontSize: 12))),
              Chip(label: Text('Opened ${incident.openedAt}', style: const TextStyle(fontSize: 12))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTrendCard(BuildContext context, CommunityTrend trend) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.indigo.shade100),
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(trend.metric, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text('Current: ${trend.current}', style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 4),
          Text('Previous: ${trend.previous}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade400)),
        ],
      ),
    );
  }

  Widget _buildPlaceholderCard(BuildContext context,
      {required IconData icon, required String title, required String subtitle}) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200),
        color: Colors.grey.shade50,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 36, color: Colors.grey.shade500),
          const SizedBox(height: 12),
          Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(subtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
        ],
      ),
    );
  }
}
