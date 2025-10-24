import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/dashboard_service.dart';
import '../services/offline_learning_service.dart';
import '../services/session_manager.dart';

class AssessmentsScreen extends StatefulWidget {
  const AssessmentsScreen({super.key});

  @override
  State<AssessmentsScreen> createState() => _AssessmentsScreenState();
}

class _AssessmentsScreenState extends State<AssessmentsScreen> {
  final DashboardService _service = DashboardService();
  final OfflineLearningService _offlineService = OfflineLearningService();
  LearnerAssessmentsData? _assessments;
  bool _loading = true;
  String? _error;
  List<OfflineAssessmentSubmission> _offlineSubmissions = [];
  StreamSubscription<OfflineAssessmentSubmission>? _offlineSubscription;
  bool _syncingOffline = false;
  DateTime? _lastOfflineSync;

  bool get _hasLearnerAccess {
    final activeRole = SessionManager.getActiveRole();
    return activeRole == null || activeRole == 'user' || activeRole == 'learner';
  }

  @override
  void initState() {
    super.initState();
    _hydrateOfflineQueue();
    _load();
    _offlineSubscription = _offlineService.assessmentStream.listen((_) {
      if (!mounted) return;
      _hydrateOfflineQueue();
    });
  }

  @override
  void dispose() {
    _offlineSubscription?.cancel();
    super.dispose();
  }

  Future<void> _hydrateOfflineQueue() async {
    final submissions = await _offlineService.listAssessmentSubmissions();
    if (!mounted) return;
    setState(() {
      _offlineSubmissions = submissions;
    });
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

  Future<void> _logOfflineSubmission() async {
    final formKey = GlobalKey<FormState>();
    final assessmentController = TextEditingController();
    final courseController = TextEditingController();
    final notesController = TextEditingController();
    final scoreController = TextEditingController();

    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 16,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Log offline submission', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                TextFormField(
                  controller: assessmentController,
                  decoration: const InputDecoration(labelText: 'Assessment ID'),
                  validator: (value) => value == null || value.trim().isEmpty ? 'Enter an assessment identifier' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: courseController,
                  decoration: const InputDecoration(labelText: 'Course or module'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: scoreController,
                  decoration: const InputDecoration(labelText: 'Score or status'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: notesController,
                  decoration: const InputDecoration(labelText: 'Offline notes'),
                  maxLines: 3,
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 12),
                    FilledButton(
                      onPressed: () {
                        if (formKey.currentState?.validate() ?? false) {
                          Navigator.pop<Map<String, String>>(context, {
                            'assessmentId': assessmentController.text.trim(),
                            'course': courseController.text.trim(),
                            'score': scoreController.text.trim(),
                            'notes': notesController.text.trim(),
                          });
                        }
                      },
                      child: const Text('Queue'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );

    if (result == null || !mounted) {
      assessmentController.dispose();
      courseController.dispose();
      notesController.dispose();
      scoreController.dispose();
      return;
    }

    await _offlineService.queueAssessmentSubmission(
      assessmentId: result['assessmentId']!,
      payload: {
        'course': result['course'] ?? '',
        'score': result['score'] ?? '',
        'notes': result['notes'] ?? '',
        'queuedAt': DateTime.now().toIso8601String(),
      },
    );
    assessmentController.dispose();
    courseController.dispose();
    notesController.dispose();
    scoreController.dispose();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Offline submission queued')),
    );
  }

  Future<void> _syncOfflineSubmissions() async {
    setState(() {
      _syncingOffline = true;
    });
    await _offlineService.syncAssessmentQueue((submission) async {
      await Future<void>.delayed(const Duration(milliseconds: 350));
      return true;
    });
    await _hydrateOfflineQueue();
    if (!mounted) return;
    setState(() {
      _syncingOffline = false;
      _lastOfflineSync = DateTime.now();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Offline submissions synced.')), 
    );
  }

  String _formatRelativeTime(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);
    if (difference.inMinutes < 1) {
      return 'just now';
    }
    if (difference.inMinutes < 60) {
      return '${difference.inMinutes} min ago';
    }
    if (difference.inHours < 24) {
      return '${difference.inHours} h ago';
    }
    return '${difference.inDays} d ago';
  }

  Widget _buildOfflineQueueCard(BuildContext context) {
    final theme = Theme.of(context);
    final pendingCount = _offlineSubmissions
        .where((submission) => submission.state == OfflineAssessmentState.queued || submission.state == OfflineAssessmentState.syncing)
        .length;
    final failedCount = _offlineSubmissions
        .where((submission) => submission.state == OfflineAssessmentState.failed)
        .length;

    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: Colors.blueGrey.shade100)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Offline submissions', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                Wrap(
                  spacing: 8,
                  children: [
                    OutlinedButton.icon(
                      onPressed: _syncingOffline || _offlineSubmissions.isEmpty ? null : _syncOfflineSubmissions,
                      icon: _syncingOffline
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.sync_outlined),
                      label: Text(_syncingOffline ? 'Syncing…' : 'Sync now'),
                    ),
                    FilledButton.icon(
                      onPressed: _logOfflineSubmission,
                      icon: const Icon(Icons.add_task_outlined),
                      label: const Text('Log offline'),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              pendingCount > 0
                  ? '$pendingCount pending • ${_offlineSubmissions.length} total queued'
                  : _offlineSubmissions.isEmpty
                      ? 'No offline submissions queued. Capture attempts from the field to sync later.'
                      : 'All offline submissions are queued and ready to sync.',
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600),
            ),
            if (_lastOfflineSync != null) ...[
              const SizedBox(height: 4),
              Text('Last synced ${_formatRelativeTime(_lastOfflineSync!)}', style: theme.textTheme.bodySmall),
            ],
            if (failedCount > 0) ...[
              const SizedBox(height: 6),
              Text('$failedCount submission(s) need attention', style: theme.textTheme.bodySmall?.copyWith(color: Colors.red.shade600)),
            ],
            if (_offlineSubmissions.isNotEmpty) ...[
              const SizedBox(height: 16),
              ..._offlineSubmissions.map((submission) {
                final stateLabel = submission.state.name.toUpperCase();
                final stateColor = () {
                  switch (submission.state) {
                    case OfflineAssessmentState.completed:
                      return Colors.green.shade600;
                    case OfflineAssessmentState.failed:
                      return Colors.red.shade600;
                    case OfflineAssessmentState.syncing:
                      return Colors.amber.shade700;
                    case OfflineAssessmentState.queued:
                    default:
                      return Colors.blueGrey.shade700;
                  }
                }();
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.blueGrey.shade50,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(submission.assessmentId, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                          Text(stateLabel, style: theme.textTheme.labelSmall?.copyWith(color: stateColor, fontWeight: FontWeight.w700)),
                        ],
                      ),
                      if ((submission.payload['course'] as String?)?.isNotEmpty ?? false)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text('Course: ${submission.payload['course']}', style: theme.textTheme.bodySmall),
                        ),
                      if ((submission.payload['score'] as String?)?.isNotEmpty ?? false)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text('Score: ${submission.payload['score']}', style: theme.textTheme.bodySmall),
                        ),
                      if ((submission.payload['notes'] as String?)?.isNotEmpty ?? false)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(submission.payload['notes'] as String, style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade700)),
                        ),
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text('Queued ${_formatRelativeTime(submission.queuedAt)}', style: theme.textTheme.labelSmall?.copyWith(color: Colors.blueGrey.shade600)),
                      ),
                      if (submission.errorMessage != null && submission.errorMessage!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            submission.errorMessage!,
                            style: theme.textTheme.bodySmall?.copyWith(color: Colors.red.shade600),
                          ),
                        ),
                    ],
                  ),
                );
              }),
            ],
          ],
        ),
      ),
    );
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
        _buildOfflineQueueCard(context),
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
              'Switch to the learner Learnspace to access assessment insights.',
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
