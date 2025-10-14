import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/dashboard_service.dart';
import '../services/session_manager.dart';

class AssessmentsScreen extends StatefulWidget {
  const AssessmentsScreen({super.key});

  @override
  State<AssessmentsScreen> createState() => _AssessmentsScreenState();
}

class _AssessmentsScreenState extends State<AssessmentsScreen> {
  final DashboardService _service = DashboardService();
  LearnerAssessmentsData? _assessments;
  bool _loading = true;
  String? _error;

  bool get _hasLearnerAccess {
    final activeRole = SessionManager.getActiveRole();
    return activeRole == null || activeRole == 'user' || activeRole == 'learner';
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!_hasLearnerAccess) {
      setState(() {
        _loading = false;
        _assessments = null;
        _error = null;
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final snapshot = await _service.fetchLearnerDashboard();
      if (!mounted) return;
      setState(() {
        _assessments = snapshot.assessments;
        _loading = false;
        _error = null;
      });
    } on DashboardException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Assessments'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          )
        ],
      ),
      body: !_hasLearnerAccess
          ? _buildAccessDenied(context)
          : RefreshIndicator(
              onRefresh: _load,
              child: _buildBody(context),
            ),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_loading) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 280, child: Center(child: CircularProgressIndicator()))
        ],
      );
    }

    if (_error != null && _assessments == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [_buildErrorState(context)],
      );
    }

    final data = _assessments;
    if (data == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          _buildEmptyState(
            context,
            title: 'Assessment data unavailable',
            description:
                'We could not sync your assessment feed. Pull to refresh or check back once new assessments are scheduled.',
          )
        ],
      );
    }

    final theme = Theme.of(context);
    final overviewCards = data.overview;
    final timeline = data;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      children: [
        if (_error != null) _buildWarningBanner(context),
        Text(
          'Assessment mission control',
          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 6),
        Text(
          'Stay ahead of every quiz, assignment, and exam. Review due dates, track submissions, and line up your study plan.',
          style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600),
        ),
        const SizedBox(height: 20),
        if (overviewCards.isNotEmpty) _buildOverviewGrid(context, overviewCards),
        const SizedBox(height: 20),
        _buildTimelineCard(context, timeline),
        const SizedBox(height: 20),
        _buildCoursesCard(context, data.courses),
        const SizedBox(height: 20),
        _buildScheduleCard(context, data.studyPlan, data.events),
        const SizedBox(height: 20),
        _buildAnalyticsCard(context, data.analytics),
        const SizedBox(height: 20),
        _buildResourcesCard(context, data.resources),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildAccessDenied(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock_outline, size: 56, color: Colors.blueGrey.shade300),
            const SizedBox(height: 16),
            Text(
              'Switch to the learner workspace to access assessment insights.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Return'),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context) {
    return Column(
      children: [
        Icon(Icons.error_outline, size: 52, color: Theme.of(context).colorScheme.error),
        const SizedBox(height: 16),
        Text(
          _error ?? 'We could not load your assessments.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _load,
          icon: const Icon(Icons.refresh),
          label: const Text('Retry'),
        )
      ],
    );
  }

  Widget _buildWarningBanner(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.shade100,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, color: Colors.amber.shade800),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _error ?? 'We could not refresh the latest assessment data.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.amber.shade800),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, {required String title, required String description}) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.blueGrey.shade100),
        color: Colors.blueGrey.shade50,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.calendar_today_outlined, size: 48, color: Colors.blueGrey.shade400),
          const SizedBox(height: 12),
          Text(title, style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(
            description,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600),
            textAlign: TextAlign.center,
          )
        ],
      ),
    );
  }

  Widget _buildOverviewGrid(BuildContext context, List<AssessmentOverviewMetric> overview) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: overview
          .map(
            (metric) => _SummaryChip(
              label: metric.label,
              value: metric.value,
              detail: metric.context,
              tone: metric.tone,
            ),
          )
          .toList(),
    );
  }

  Widget _buildTimelineCard(BuildContext context, LearnerAssessmentsData data) {
    return _SectionCard(
      title: 'Timeline',
      icon: Icons.schedule_outlined,
      child: Column(
        children: [
          _TimelineColumn(
            title: 'Upcoming focus',
            emptyLabel: 'No upcoming assessments. Enjoy the open runway.',
            items: data.upcoming,
          ),
          const SizedBox(height: 16),
          _TimelineColumn(
            title: 'At risk',
            emptyLabel: 'No overdue assessments. Momentum is on your side.',
            items: data.overdue,
          ),
          const SizedBox(height: 16),
          _TimelineColumn(
            title: 'Completed & submitted',
            emptyLabel: 'Submit work to build your completion streak.',
            items: data.completed,
          ),
        ],
      ),
    );
  }

  Widget _buildCoursesCard(BuildContext context, List<AssessmentCourseReport> courses) {
    if (courses.isEmpty) {
      return _SectionCard(
        title: 'Programmes',
        icon: Icons.layers_outlined,
        child: _buildEmptyState(
          context,
          title: 'No programme analytics yet',
          description: 'Once assessments are linked to your courses, you will see readiness, risk, and feedback signals here.',
        ),
      );
    }

    return _SectionCard(
      title: 'Programmes',
      icon: Icons.layers_outlined,
      child: Column(
        children: courses
            .map(
              (course) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.blueGrey.shade100),
                  color: Colors.white,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(course.name, style: Theme.of(context).textTheme.titleSmall),
                        Text(course.status, style: Theme.of(context).textTheme.labelSmall),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      runSpacing: 4,
                      children: [
                        _InfoChip(label: 'Progress', value: course.progress),
                        _InfoChip(label: 'Upcoming', value: '${course.upcoming}'),
                        _InfoChip(label: 'Awaiting feedback', value: '${course.awaitingFeedback}'),
                        _InfoChip(label: 'Overdue', value: '${course.overdue}'),
                        _InfoChip(label: 'Avg score', value: course.averageScore ?? '—'),
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

  Widget _buildScheduleCard(BuildContext context, List<AssessmentPlanBlock> plan, List<AssessmentScheduleEvent> events) {
    return _SectionCard(
      title: 'Schedule',
      icon: Icons.event_available_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (plan.isEmpty)
            _buildEmptyState(
              context,
              title: 'No study blocks scheduled',
              description: 'Upcoming assessments will populate your personal study plan automatically.',
            )
          else
            ...plan.map(
              (block) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  color: Colors.indigo.shade50,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(block.focus,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w600, color: Colors.indigo.shade900)),
                        ),
                        Text(block.window, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.indigo.shade600)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(block.course, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade600)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.timer_outlined, size: 16, color: Colors.indigo.shade400),
                        const SizedBox(width: 6),
                        Text(block.duration, style: Theme.of(context).textTheme.bodySmall),
                        if (block.mode != null) ...[
                          const SizedBox(width: 12),
                          Icon(Icons.podcasts_outlined, size: 16, color: Colors.indigo.shade400),
                          const SizedBox(width: 4),
                          Text(block.mode!, style: Theme.of(context).textTheme.bodySmall),
                        ],
                        if (block.submissionUrl != null) ...[
                          const SizedBox(width: 12),
                          InkWell(
                            onTap: () async {
                              final uri = Uri.tryParse(block.submissionUrl!);
                              if (uri != null) {
                                await launchUrl(uri, mode: LaunchMode.externalApplication);
                              }
                            },
                            child: Row(
                              children: [
                                Icon(Icons.open_in_new, size: 16, color: Theme.of(context).colorScheme.primary),
                                const SizedBox(width: 4),
                                Text('Open',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(color: Theme.of(context).colorScheme.primary)),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
          if (events.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Events', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            ...events.take(5).map(
              (event) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.event_note_outlined),
                title: Text(event.title),
                subtitle: Text(event.date),
              ),
            )
          ]
        ],
      ),
    );
  }

  Widget _buildAnalyticsCard(BuildContext context, AssessmentAnalytics analytics) {
    final metrics = <Map<String, String>>[];
    if (analytics.pendingReviews != null) {
      metrics.add({'label': 'Awaiting grading', 'value': '${analytics.pendingReviews}'});
    }
    if (analytics.overdue != null) {
      metrics.add({'label': 'Overdue', 'value': '${analytics.overdue}'});
    }
    if (analytics.averageLeadTimeDays != null && analytics.averageLeadTimeDays != 0) {
      metrics.add({'label': 'Average lead time', 'value': '${analytics.averageLeadTimeDays} days'});
    }
    if (analytics.workloadWeight != null) {
      metrics.add({'label': 'Workload weight', 'value': analytics.workloadWeight!.toString()});
    }

    return _SectionCard(
      title: 'Analytics',
      icon: Icons.auto_graph_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: metrics
                .map(
                  (metric) => _InfoChip(label: metric['label']!, value: metric['value']!),
                )
                .toList(),
          ),
          if (analytics.byType.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('By assessment type', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            ...analytics.byType.map(
              (entry) => ListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                title: Text(entry.type),
                trailing: Text(
                  '${entry.count} · ${entry.averageScore ?? 0}%',
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ),
            )
          ]
        ],
      ),
    );
  }

  Widget _buildResourcesCard(BuildContext context, List<String> resources) {
    if (resources.isEmpty) {
      return _SectionCard(
        title: 'Resources',
        icon: Icons.lightbulb_outline,
        child: Text(
          'Need inspiration? Explore the resource hub in your dashboard to pin rubrics, exemplars, and checklists.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      );
    }

    return _SectionCard(
      title: 'Resources',
      icon: Icons.lightbulb_outline,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: resources
            .map(
              (resource) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline, size: 18, color: Colors.teal),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        resource,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    )
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({required this.label, required this.value, this.detail, this.tone});

  final String label;
  final String value;
  final String? detail;
  final String? tone;

  @override
  Widget build(BuildContext context) {
    final color = tone == 'alert'
        ? Colors.red.shade100
        : tone == 'warning'
            ? Colors.amber.shade100
            : tone == 'positive'
                ? Colors.green.shade100
                : Colors.blue.shade50;
    final textColor = tone == 'alert'
        ? Colors.red.shade700
        : tone == 'warning'
            ? Colors.amber.shade800
            : tone == 'positive'
                ? Colors.green.shade700
                : Colors.indigo.shade800;

    return Container(
      width: 170,
      constraints: const BoxConstraints(minHeight: 120),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(), style: Theme.of(context).textTheme.labelSmall?.copyWith(color: textColor)),
          const SizedBox(height: 8),
          Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: textColor, fontWeight: FontWeight.w600)),
          if (detail != null) ...[
            const SizedBox(height: 6),
            Text(detail!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: textColor)),
          ]
        ],
      ),
    );
  }
}

class _TimelineColumn extends StatelessWidget {
  const _TimelineColumn({required this.title, required this.items, required this.emptyLabel});

  final String title;
  final List<AssessmentTimelineItem> items;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        if (items.isEmpty)
          Text(emptyLabel, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade500))
        else
          ...items.map((item) => _TimelineTile(item: item)).toList(),
      ],
    );
  }
}

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({required this.item});

  final AssessmentTimelineItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.blueGrey.shade100),
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(item.title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              ),
              if (item.dueIn != null)
                Text(item.dueIn!, style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.primary)),
            ],
          ),
          const SizedBox(height: 4),
          Text(item.course, style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            runSpacing: 4,
            children: [
              if (item.type != null) _InfoChip(label: 'Type', value: item.type!),
              if (item.status != null) _InfoChip(label: 'Status', value: item.status!),
              if (item.weight != null) _InfoChip(label: 'Weight', value: item.weight!),
              if (item.score != null) _InfoChip(label: 'Score', value: item.score!),
              if (item.recommended != null) _InfoChip(label: 'Duration', value: item.recommended!),
            ],
          ),
          if (item.instructions != null && item.instructions!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(item.instructions!, style: theme.textTheme.bodySmall),
          ],
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
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.blueGrey.shade50,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.blueGrey.shade600)),
          const SizedBox(width: 6),
          Text(value, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.icon, required this.child});

  final String title;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 12),
                Text(title, style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 16),
            child
          ],
        ),
      ),
    );
  }
}
