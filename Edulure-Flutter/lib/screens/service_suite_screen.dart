import 'package:flutter/material.dart';

import '../services/course_service.dart';
import '../services/service_suite_models.dart';

class ServiceSuiteScreen extends StatefulWidget {
  const ServiceSuiteScreen({super.key});

  @override
  State<ServiceSuiteScreen> createState() => _ServiceSuiteScreenState();
}

class _ServiceSuiteScreenState extends State<ServiceSuiteScreen> {
  final CourseService _service = CourseService();
  ServiceSuite? _suite;
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
      final suite = await _service.fetchServiceSuite();
      if (!mounted) return;
      setState(() {
        _suite = suite;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error is Exception ? error.toString() : 'Unable to load service data.';
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
    final suite = _suite;
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Service suite'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          )
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: _loading && suite == null
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
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.red.shade200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'We could not load the latest service data',
                              style: theme.textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w600, color: Colors.red.shade700),
                            ),
                            const SizedBox(height: 8),
                            Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
                            const SizedBox(height: 12),
                            FilledButton.icon(
                              onPressed: _load,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    Text('Enterprise service desk',
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: const Color(0xFF2D62FF),
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        )),
                    const SizedBox(height: 4),
                    Text('Service creation & orchestration',
                        style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Text(
                      'Design, launch, and govern high-touch service offerings with enterprise-grade booking telemetry and '
                      'automation across web and mobile.',
                      style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600),
                    ),
                    const SizedBox(height: 20),
                    if (suite != null) ...[
                      _SummarySection(metrics: suite.summary),
                      const SizedBox(height: 24),
                      _AlertsSection(alerts: suite.alerts),
                      const SizedBox(height: 24),
                      _WorkflowSection(workflow: suite.workflow),
                      const SizedBox(height: 24),
                      _CatalogueSection(offerings: suite.catalogue),
                      const SizedBox(height: 24),
                      _BookingsSection(bookings: suite.bookings),
                      const SizedBox(height: 24),
                      _CalendarSection(calendar: suite.bookings.calendar),
                      const SizedBox(height: 24),
                      _ControlsSection(controls: suite.controls),
                    ] else ...[
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.blueGrey.shade50,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.blueGrey.shade100),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Service data unavailable',
                                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            Text('Connect your instructor Learnspace to populate services, bookings, and telemetry.',
                                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600)),
                            const SizedBox(height: 12),
                            FilledButton.icon(
                              onPressed: _load,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    ]
                  ],
                ),
        ),
      ),
      floatingActionButton: suite != null
          ? FloatingActionButton.extended(
              onPressed: () => Navigator.pushNamed(context, '/dashboard/instructor'),
              icon: const Icon(Icons.dashboard_customize_outlined),
              label: const Text('Instructor dashboard'),
            )
          : null,
    );
  }
}

class _SummarySection extends StatelessWidget {
  const _SummarySection({required this.metrics});

  final List<ServiceSummaryMetric> metrics;

  Color _toneColor(BuildContext context, String? tone) {
    switch (tone) {
      case 'primary':
        return const Color(0xFF2D62FF);
      case 'success':
        return Colors.green.shade600;
      case 'warning':
        return Colors.amber.shade700;
      case 'info':
        return Colors.blue.shade600;
      default:
        return Colors.blueGrey.shade600;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (metrics.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.blueGrey.shade50,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.blueGrey.shade100),
        ),
        child: const Text(
          'Publish at least one service offering to unlock summary analytics.',
          style: TextStyle(color: Colors.black54),
        ),
      );
    }
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: metrics
          .map(
            (metric) => Container(
              width: 170,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: LinearGradient(
                  colors: [
                    _toneColor(context, metric.tone).withOpacity(0.08),
                    Colors.white,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(color: _toneColor(context, metric.tone).withOpacity(0.25)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(metric.label,
                      style: Theme.of(context)
                          .textTheme
                          .labelSmall
                          ?.copyWith(color: _toneColor(context, metric.tone), fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  Text(metric.value,
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w700, color: Colors.blueGrey.shade900)),
                  if (metric.detail != null) ...[
                    const SizedBox(height: 6),
                    Text(metric.detail!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600)),
                  ]
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

class _AlertsSection extends StatelessWidget {
  const _AlertsSection({required this.alerts});

  final List<ServiceAlert> alerts;

  @override
  Widget build(BuildContext context) {
    if (alerts.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.blueGrey.shade50,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.blueGrey.shade100),
        ),
        child: const Text('No active alerts. Intake pipelines and capacity are within SLAs.'),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Operational alerts',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...alerts.map(
          (alert) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: alert.severity == 'warning'
                    ? Colors.amber.shade200
                    : alert.severity == 'error'
                        ? Colors.red.shade200
                        : Colors.blueGrey.shade100,
              ),
              color: alert.severity == 'warning'
                  ? Colors.amber.shade50
                  : alert.severity == 'error'
                      ? Colors.red.shade50
                      : Colors.blueGrey.shade50,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(alert.title, style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
                if (alert.detail != null) ...[
                  const SizedBox(height: 6),
                  Text(alert.detail!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600)),
                ]
              ],
            ),
          ),
        )
      ],
    );
  }
}

class _WorkflowSection extends StatelessWidget {
  const _WorkflowSection({required this.workflow});

  final ServiceWorkflow workflow;

  Color _toneColor(String? tone) {
    switch (tone) {
      case 'success':
        return Colors.green.shade600;
      case 'warning':
        return Colors.amber.shade700;
      case 'info':
        return Colors.blue.shade600;
      default:
        return Colors.blueGrey.shade600;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (workflow.stages.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.blueGrey.shade100),
          boxShadow: const [BoxShadow(color: Color(0x11000000), blurRadius: 20, offset: Offset(0, 12))],
        ),
        child: const Text('Configure automation stages to see workflow telemetry.'),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text('Automation workflow',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            if (workflow.automationRate != null)
              Text('${workflow.automationRate!.toStringAsFixed(0)}% automated',
                  style: Theme.of(context)
                      .textTheme
                      .labelLarge
                      ?.copyWith(color: Colors.blueGrey.shade600, fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 12),
        Column(
          children: workflow.stages
              .map(
                (stage) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: _toneColor(stage.tone).withOpacity(0.25)),
                    color: _toneColor(stage.tone).withOpacity(0.06),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(stage.title,
                          style: Theme.of(context)
                              .textTheme
                              .titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700, color: Colors.blueGrey.shade900)),
                      const SizedBox(height: 6),
                      Text(stage.status,
                          style: Theme.of(context)
                              .textTheme
                              .labelLarge
                              ?.copyWith(color: _toneColor(stage.tone), fontWeight: FontWeight.w600)),
                      if (stage.description != null) ...[
                        const SizedBox(height: 6),
                        Text(stage.description!,
                            style:
                                Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600)),
                      ],
                      if (stage.kpis.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: stage.kpis
                              .map((kpi) => Chip(
                                    backgroundColor: Colors.white,
                                    side: BorderSide(color: Colors.blueGrey.shade100),
                                    label: Text(kpi, style: const TextStyle(fontSize: 12)),
                                  ))
                              .toList(),
                        ),
                      ]
                    ],
                  ),
                ),
              )
              .toList(),
        ),
        if (workflow.notes.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: workflow.notes
                .map((note) => Chip(
                      backgroundColor: const Color(0xFFEFF3FF),
                      side: const BorderSide(color: Color(0xFFCFD8FF)),
                      label: Text(note, style: const TextStyle(fontSize: 12, color: Color(0xFF2D62FF))),
                    ))
                .toList(),
          ),
        ]
      ],
    );
  }
}

class _CatalogueSection extends StatelessWidget {
  const _CatalogueSection({required this.offerings});

  final List<ServiceOffering> offerings;

  @override
  Widget build(BuildContext context) {
    if (offerings.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.blueGrey.shade100),
          boxShadow: const [BoxShadow(color: Color(0x11000000), blurRadius: 20, offset: Offset(0, 12))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Service catalogue',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            const Text('Create a service to unlock booking and automation telemetry.'),
          ],
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Service catalogue',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...offerings.map(
          (offering) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              color: Colors.white,
              border: Border.all(color: Colors.blueGrey.shade100),
              boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 12, offset: Offset(0, 10))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(offering.category,
                              style: Theme.of(context)
                                  .textTheme
                                  .labelSmall
                                  ?.copyWith(color: Colors.blueGrey.shade500, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(offering.name,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700, color: Colors.blueGrey.shade900)),
                        ],
                      ),
                    ),
                    if (offering.statusLabel != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF3FF),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(offering.statusLabel!,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF2D62FF))),
                      ),
                  ],
                ),
                if (offering.description != null) ...[
                  const SizedBox(height: 8),
                  Text(offering.description!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600)),
                ],
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    if (offering.priceLabel != null)
                      _InfoChip(label: 'Pricing', value: offering.priceLabel!),
                    if (offering.durationLabel != null)
                      _InfoChip(label: 'Duration', value: offering.durationLabel!),
                    if (offering.deliveryLabel != null)
                      _InfoChip(label: 'Delivery', value: offering.deliveryLabel!),
                    if (offering.csatLabel != null)
                      _InfoChip(label: 'CSAT', value: offering.csatLabel!),
                    if (offering.clientsServedLabel != null)
                      _InfoChip(label: 'Clients', value: offering.clientsServedLabel!),
                    if (offering.automationLabel != null)
                      _InfoChip(label: 'Automation', value: offering.automationLabel!),
                    if (offering.slaLabel != null) _InfoChip(label: 'SLA', value: offering.slaLabel!),
                    if (offering.utilisationLabel != null)
                      _InfoChip(label: 'Utilisation', value: offering.utilisationLabel!),
                  ],
                ),
                if (offering.tags.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: offering.tags
                        .map((tag) => Chip(
                              label: Text(tag),
                              backgroundColor: const Color(0xFFF5F7FF),
                              side: const BorderSide(color: Color(0xFFE0E7FF)),
                            ))
                        .toList(),
                  ),
                ]
              ],
            ),
          ),
        )
      ],
    );
  }
}

class _BookingsSection extends StatelessWidget {
  const _BookingsSection({required this.bookings});

  final ServiceBookingOverview bookings;

  Color _statusColor(String status) {
    switch (status) {
      case 'confirmed':
        return Colors.green.shade600;
      case 'requested':
        return Colors.amber.shade700;
      case 'in_review':
        return Colors.blue.shade600;
      default:
        return Colors.blueGrey.shade600;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Upcoming bookings',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        if (bookings.upcoming.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.blueGrey.shade50,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.blueGrey.shade100),
            ),
            child: const Text('No bookings scheduled. Approve pending requests to populate this list.'),
          )
        else ...[
          ...bookings.upcoming.map(
            (booking) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _statusColor(booking.status).withOpacity(0.25)),
                color: _statusColor(booking.status).withOpacity(0.05),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(booking.label,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(fontWeight: FontWeight.w600, color: Colors.blueGrey.shade900)),
                        const SizedBox(height: 4),
                        Text(booking.learner,
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: Colors.blueGrey.shade600, fontSize: 12)),
                        if (booking.stage != null)
                          Text(booking.stage!,
                              style: Theme.of(context)
                                  .textTheme
                                  .labelSmall
                                  ?.copyWith(color: Colors.blueGrey.shade500)),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(booking.scheduledFor,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(fontWeight: FontWeight.w600, color: Colors.blueGrey.shade800)),
                      if (booking.timeLabel != null)
                        Text(booking.timeLabel!,
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: Colors.blueGrey.shade500)),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: _statusColor(booking.status).withOpacity(0.3)),
                        ),
                        child: Text(booking.statusLabel,
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _statusColor(booking.status))),
                      )
                    ],
                  )
                ],
              ),
            ),
          )
        ],
        const SizedBox(height: 20),
        Text('Monthly utilisation outlook',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...bookings.months.map(
          (month) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              color: Colors.white,
              border: Border.all(color: Colors.blueGrey.shade100),
              boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 12, offset: Offset(0, 8))],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(month.label,
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(fontWeight: FontWeight.w600, color: Colors.blueGrey.shade900)),
                    if (month.note != null)
                      Text(month.note!,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: Colors.blueGrey.shade500)),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('${month.confirmed} confirmed',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(fontWeight: FontWeight.w600, color: Colors.blueGrey.shade800)),
                    Text('${month.pending} pending',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: Colors.amber.shade700, fontWeight: FontWeight.w600)),
                    Text(
                        month.utilisationRate != null
                            ? '${month.utilisationRate}% utilised'
                            : 'Publish availability',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: Colors.blueGrey.shade500)),
                  ],
                )
              ],
            ),
          ),
        )
      ],
    );
  }
}

class _CalendarSection extends StatelessWidget {
  const _CalendarSection({required this.calendar});

  final List<ServiceCalendarMonth> calendar;

  Color _statusColor(String status) {
    switch (status) {
      case 'confirmed':
        return Colors.green.shade600;
      case 'requested':
        return Colors.amber.shade700;
      case 'in_review':
        return Colors.blue.shade600;
      default:
        return Colors.blueGrey.shade600;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (calendar.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.blueGrey.shade100),
          boxShadow: const [BoxShadow(color: Color(0x11000000), blurRadius: 20, offset: Offset(0, 12))],
        ),
        child: const Text('No bookings scheduled across the next 12 months.'),
      );
    }
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('12-month booking calendar',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...calendar.map(
          (month) => Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              color: Colors.white,
              border: Border.all(color: Colors.blueGrey.shade100),
              boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 12, offset: Offset(0, 10))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(month.label,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(fontWeight: FontWeight.w600, color: Colors.blueGrey.shade900)),
                        Text(
                          '${month.confirmed} confirmed • ${month.pending} pending',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: Colors.blueGrey.shade500),
                        )
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF3FF),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text('${month.capacity} slots',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF2D62FF))),
                    )
                  ],
                ),
                const SizedBox(height: 12),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7,
                    crossAxisSpacing: 6,
                    mainAxisSpacing: 6,
                  ),
                  itemCount: weekdays.length + month.days.length,
                  itemBuilder: (context, index) {
                    if (index < weekdays.length) {
                      return Center(
                        child: Text(weekdays[index],
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.blueGrey)),
                      );
                    }
                    final day = month.days[index - weekdays.length];
                    final bookings = day.bookings.take(2).toList();
                    return Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        color: day.isCurrentMonth ? const Color(0xFFF6F7FB) : Colors.white,
                        border: Border.all(color: day.isCurrentMonth ? Colors.blueGrey.shade100 : Colors.blueGrey.shade50),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${day.day}',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: day.isCurrentMonth ? Colors.blueGrey.shade800 : Colors.blueGrey.shade200,
                              )),
                          const SizedBox(height: 4),
                          ...bookings.map(
                            (booking) => Container(
                              margin: const EdgeInsets.only(bottom: 4),
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(10),
                                color: _statusColor(booking.status).withOpacity(0.12),
                              ),
                              child: Text(
                                booking.label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: _statusColor(booking.status),
                                ),
                              ),
                            ),
                          ),
                          if (day.bookings.length > 2)
                            Text('+${day.bookings.length - 2} more',
                                style: TextStyle(fontSize: 10, color: Colors.blueGrey.shade500)),
                        ],
                      ),
                    );
                  },
                )
              ],
            ),
          ),
        )
      ],
    );
  }
}

class _ControlsSection extends StatelessWidget {
  const _ControlsSection({required this.controls});

  final ServiceControlDeck controls;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Controls & compliance',
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            color: Colors.white,
            border: Border.all(color: Colors.blueGrey.shade100),
            boxShadow: const [BoxShadow(color: Color(0x11000000), blurRadius: 20, offset: Offset(0, 10))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _InfoRow(label: 'Owner', value: controls.owner),
              _InfoRow(label: 'Last audit', value: controls.lastAudit ?? 'Audit pending'),
              _InfoRow(
                label: 'Automation coverage',
                value: controls.automationRate != null
                    ? '${controls.automationRate!.toStringAsFixed(0)}%'
                    : 'Manual orchestration',
              ),
              _InfoRow(
                label: 'Data retention',
                value: controls.retentionDays != null
                    ? '${controls.retentionDays} days'
                    : 'Policy pending',
              ),
              _InfoRow(label: 'Encryption', value: controls.encryption ?? 'TLS enforced'),
              if (controls.restrictedRoles != null && controls.restrictedRoles!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    'Role access: ${controls.restrictedRoles!.join(', ')}',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
                  ),
                ),
              if (controls.monitoring != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    controls.monitoring!,
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
                  ),
                ),
              if (controls.auditLog != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    controls.auditLog!,
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
                  ),
                ),
              if (controls.policies != null && controls.policies!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text('Policies',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: Colors.blueGrey.shade500,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.4,
                    )),
                const SizedBox(height: 8),
                ...controls.policies!.map(
                  (policy) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F7FF),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE0E7FF)),
                    ),
                    child: Text(policy, style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade700)),
                  ),
                )
              ]
            ],
          ),
        )
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade500)),
          Text(value,
              style:
                  Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600, color: Colors.blueGrey.shade900)),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: const Color(0xFFF5F7FF),
        border: Border.all(color: const Color(0xFFE0E7FF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(color: Colors.blueGrey.shade500, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(fontWeight: FontWeight.w600, color: Colors.blueGrey.shade900)),
        ],
      ),
    );
  }
}
