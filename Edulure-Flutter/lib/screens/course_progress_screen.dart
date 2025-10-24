import 'dart:async';

import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/learning/learning_models.dart';
import '../provider/learning/learning_store.dart';
import '../services/progress_service.dart';

enum _ProgressAction { refresh, restoreSeed }

class CourseProgressScreen extends ConsumerWidget {
  const CourseProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final courses = ref.watch(courseStoreProvider);
    final logs = ref.watch(progressStoreProvider);
    final grouped = <String, List<ModuleProgressLog>>{};
    for (final log in logs) {
      grouped.putIfAbsent(log.courseId, () => []).add(log);
    }

    final progressService = ref.watch(progressServiceProvider);
    unawaited(progressService.ensureReady());
    final queueAsync = ref.watch(progressSyncQueueProvider);
    final queue = queueAsync.value ?? const <ProgressSyncTask>[];
    final queueError = queueAsync.hasError ? queueAsync.error : null;
    final analytics = progressService.buildPortfolioAnalytics(courses: courses, logs: logs);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Course progress & insights'),
        actions: [
          IconButton(
            icon: const Icon(Icons.note_add_outlined),
            tooltip: 'Record progress',
            onPressed: () => _openProgressForm(context, ref),
          ),
          PopupMenuButton<_ProgressAction>(
            tooltip: 'Progress sync options',
            onSelected: (action) => _handleProgressAction(context, ref, action),
            itemBuilder: (context) => [
              PopupMenuItem(
                value: _ProgressAction.refresh,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.sync, size: 20),
                    SizedBox(width: 12),
                    Text('Reload saved logs'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: _ProgressAction.restoreSeed,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.restore_outlined, size: 20),
                    SizedBox(width: 12),
                    Text('Restore demo logs'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: courses.isEmpty
          ? const _EmptyProgressState()
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _PortfolioSummaryCard(analytics: analytics),
                const SizedBox(height: 16),
                if (queueAsync.isLoading) ...[
                  const _OfflineQueueLoadingCard(),
                  const SizedBox(height: 16),
                ] else if (queueError != null) ...[
                  _OfflineQueueErrorCard(error: queueError),
                  const SizedBox(height: 16),
                ] else if (queue.isNotEmpty) ...[
                  _OfflineQueueCard(
                    queue: queue,
                    courses: courses,
                    onSync: () => _syncOfflineQueue(context, ref, queue),
                    onRetryFailed: queue.any((task) => task.status == ProgressSyncStatus.failed)
                        ? () => _retryFailedQueue(context, ref, queue)
                        : null,
                  ),
                  const SizedBox(height: 16),
                ],
                for (final course in courses)
                  _CourseProgressCard(
                    course: course,
                    logs: grouped[course.id] ?? const <ModuleProgressLog>[],
                    onRecord: () => _openProgressForm(context, ref, course: course),
                  ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openProgressForm(context, ref),
        icon: const Icon(Icons.add_chart_outlined),
        label: const Text('Log milestone'),
      ),
    );
  }

  Future<void> _handleProgressAction(
    BuildContext context,
    WidgetRef ref,
    _ProgressAction action,
  ) async {
    final courseNotifier = ref.read(courseStoreProvider.notifier);
    final progressNotifier = ref.read(progressStoreProvider.notifier);
    switch (action) {
      case _ProgressAction.refresh:
        await Future.wait([
          courseNotifier.refreshFromPersistence(),
          progressNotifier.refreshFromPersistence(),
        ]);
        _showSnackBar(context, 'Reloaded saved course logs');
        break;
      case _ProgressAction.restoreSeed:
        await courseNotifier.restoreSeedData();
        await progressNotifier.restoreSeedData();
        _showSnackBar(context, 'Restored demo logs and modules');
        break;
    }
  }

  void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _syncOfflineQueue(
    BuildContext context,
    WidgetRef ref,
    Iterable<ProgressSyncTask> tasks,
  ) async {
    if (tasks.isEmpty) {
      return;
    }
    final service = ref.read(progressServiceProvider);
    await service.markBatchSynced(tasks.map((task) => task.id));
    if (!context.mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Marked ${tasks.length} progress logs as synced')),
    );
  }

  Future<void> _retryFailedQueue(
    BuildContext context,
    WidgetRef ref,
    Iterable<ProgressSyncTask> tasks,
  ) async {
    final failures = tasks.where((task) => task.status == ProgressSyncStatus.failed).toList();
    if (failures.isEmpty) {
      return;
    }
    final service = ref.read(progressServiceProvider);
    for (final task in failures) {
      await service.retryFailed(task.id);
    }
    if (!context.mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Queued ${failures.length} failed logs for retry')),
    );
  }

  void _openProgressForm(BuildContext context, WidgetRef ref, {Course? course}) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return _ProgressLogFormSheet(initialCourse: course);
      },
    );
  }
}

class _CourseProgressCard extends StatelessWidget {
  const _CourseProgressCard({
    required this.course,
    required this.logs,
    required this.onRecord,
  });

  final Course course;
  final List<ModuleProgressLog> logs;
  final VoidCallback onRecord;

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat.percentPattern();
    final completion = formatter.format(course.overallProgress);
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      margin: const EdgeInsets.only(bottom: 20),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        course.title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 6),
                      Text(course.summary, maxLines: 2, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                SizedBox(
                  width: 120,
                  height: 120,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircularProgressIndicator(
                        value: course.overallProgress,
                        strokeWidth: 12,
                      ),
                      Text(completion, style: Theme.of(context).textTheme.titleMedium),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            FilledButton.tonalIcon(
              onPressed: onRecord,
              icon: const Icon(Icons.add_task_outlined),
              label: const Text('Record module milestone'),
            ),
            const SizedBox(height: 16),
            Text('Recent module updates', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            if (logs.isEmpty)
              const Text('No progress logs yet. Share your first milestone to keep stakeholders aligned.')
            else
              ...logs
                  .sorted((a, b) => b.timestamp.compareTo(a.timestamp))
                  .take(5)
                  .map(
                    (log) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        child: Text('${log.completedLessons}'),
                      ),
                      title: Text('${_moduleTitle(course, log.moduleId)} • completed lessons: ${log.completedLessons}'),
                      subtitle: Text('${DateFormat.yMMMd().format(log.timestamp)} — ${log.notes}'),
                    ),
                  )
                  .toList(),
          ],
        ),
      ),
    );
  }

  String _moduleTitle(Course course, String moduleId) {
    return course.modules.firstWhere((module) => module.id == moduleId, orElse: () => course.modules.first).title;
  }
}

class _PortfolioSummaryCard extends StatelessWidget {
  const _PortfolioSummaryCard({required this.analytics});

  final ProgressAnalytics analytics;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percentage = (analytics.averageCourseCompletion * 100).clamp(0, 100).toStringAsFixed(0);
    final decimal = NumberFormat.decimalPattern();
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Portfolio health overview',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _SummaryMetricTile(
                  label: 'Portfolio completion',
                  value: '$percentage%',
                  caption: 'Average course progress',
                ),
                _SummaryMetricTile(
                  label: 'Active courses',
                  value: analytics.activeCourseCount.toString(),
                  caption: 'Tracked in mobile workspace',
                ),
                _SummaryMetricTile(
                  label: 'Logs this week',
                  value: analytics.logsThisWeek.toString(),
                  caption: 'Recent milestones captured',
                ),
                _SummaryMetricTile(
                  label: 'Pending offline sync',
                  value: analytics.pendingSyncs.toString(),
                  caption: 'Awaiting connectivity',
                ),
                _SummaryMetricTile(
                  label: 'Lessons backlog',
                  value: decimal.format(analytics.backlogLessons),
                  caption: 'Remaining lessons across modules',
                ),
                _SummaryMetricTile(
                  label: 'Avg lessons / log',
                  value: analytics.averageLessonsPerLog.toStringAsFixed(1),
                  caption: 'Signal density per update',
                ),
                _SummaryMetricTile(
                  label: 'Daily velocity',
                  value: analytics.averageDailyVelocity.toStringAsFixed(1),
                  caption: 'Lessons logged per day',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryMetricTile extends StatelessWidget {
  const _SummaryMetricTile({
    required this.label,
    required this.value,
    required this.caption,
  });

  final String label;
  final String value;
  final String caption;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: 180,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: theme.colorScheme.surfaceVariant.withOpacity(0.6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(value, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(caption, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}

class _OfflineQueueLoadingCard extends StatelessWidget {
  const _OfflineQueueLoadingCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: const Padding(
        padding: EdgeInsets.all(24),
        child: Row(
          children: [
            SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5)),
            SizedBox(width: 16),
            Expanded(child: Text('Loading offline progress queue…')),
          ],
        ),
      ),
    );
  }
}

class _OfflineQueueErrorCard extends StatelessWidget {
  const _OfflineQueueErrorCard({this.error});

  final Object? error;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Icon(Icons.warning_amber_outlined, color: theme.colorScheme.error),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Offline queue unavailable: ${error ?? 'unknown error'}',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.error),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OfflineQueueCard extends StatelessWidget {
  const _OfflineQueueCard({
    required this.queue,
    required this.courses,
    required this.onSync,
    this.onRetryFailed,
  });

  final List<ProgressSyncTask> queue;
  final List<Course> courses;
  final Future<void> Function() onSync;
  final Future<void> Function()? onRetryFailed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final failed = queue.where((task) => task.status == ProgressSyncStatus.failed).toList();
    final pending = queue.length - failed.length;
    final formatter = DateFormat('MMM d, HH:mm');
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Offline sync queue',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const Spacer(),
                FilledButton.tonal(
                  onPressed: queue.isEmpty ? null : () async => onSync(),
                  child: const Text('Mark synced'),
                ),
              ],
            ),
            if (onRetryFailed != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: TextButton.icon(
                  onPressed: failed.isEmpty ? null : () async => onRetryFailed!(),
                  icon: const Icon(Icons.refresh_outlined),
                  label: const Text('Retry failed'),
                ),
              ),
            const SizedBox(height: 12),
            Text(
              '$pending pending • ${failed.length} failed',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            if (queue.isEmpty)
              const Text('All progress logs are synced.')
            else
              ...queue.take(3).map(
                (task) {
                  final label = _taskLabel(task);
                  final status = _statusLabel(task);
                  final subtitle = task.lastAttempt ?? task.createdAt;
                  final icon = task.status == ProgressSyncStatus.failed
                      ? Icons.error_outline
                      : Icons.schedule_outlined;
                  final iconColor = task.status == ProgressSyncStatus.failed
                      ? theme.colorScheme.error
                      : theme.colorScheme.primary;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(icon, color: iconColor),
                    title: Text(label),
                    subtitle: Text('$status • ${formatter.format(subtitle.toLocal())}'),
                  );
                },
              ),
            if (queue.length > 3)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '+${queue.length - 3} additional updates pending',
                  style: theme.textTheme.bodySmall,
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _taskLabel(ProgressSyncTask task) {
    final course = courses.firstWhereOrNull((element) => element.id == task.courseId);
    final module = course?.modules.firstWhereOrNull((module) => module.id == task.moduleId);
    final courseLabel = course?.title ?? task.courseId;
    final moduleLabel = module?.title ?? task.moduleId;
    return '$courseLabel • $moduleLabel';
  }

  String _statusLabel(ProgressSyncTask task) {
    switch (task.status) {
      case ProgressSyncStatus.pending:
        return 'Pending sync';
      case ProgressSyncStatus.syncing:
        return 'Sync in progress';
      case ProgressSyncStatus.failed:
        return 'Failed to sync';
      case ProgressSyncStatus.completed:
        return 'Synced';
    }
  }
}

class _ProgressLogFormSheet extends ConsumerStatefulWidget {
  const _ProgressLogFormSheet({this.initialCourse});

  final Course? initialCourse;

  @override
  ConsumerState<_ProgressLogFormSheet> createState() => _ProgressLogFormSheetState();
}

class _ProgressLogFormSheetState extends ConsumerState<_ProgressLogFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late DateTime _timestamp;
  Course? _selectedCourse;
  CourseModule? _selectedModule;
  late final TextEditingController _lessonsController;
  late final TextEditingController _notesController;
  bool _queueOffline = true;

  @override
  void initState() {
    super.initState();
    final courses = ref.read(courseStoreProvider);
    _selectedCourse = widget.initialCourse ?? (courses.isNotEmpty ? courses.first : null);
    _selectedModule = _selectedCourse?.modules.first;
    _timestamp = DateTime.now();
    _lessonsController = TextEditingController(text: '1');
    _notesController = TextEditingController();
    _queueOffline = true;
  }

  @override
  void dispose() {
    _lessonsController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _selectedCourse == null || _selectedModule == null) return;
    final notifier = ref.read(progressStoreProvider.notifier);
    final log = notifier.buildLogFromForm(
      courseId: _selectedCourse!.id,
      moduleId: _selectedModule!.id,
      timestamp: _timestamp,
      notes: _notesController.text.trim(),
      completedLessons: int.tryParse(_lessonsController.text) ?? 0,
    );
    notifier.recordProgress(log);
    ref.read(courseStoreProvider.notifier).updateModuleProgress(
          courseId: _selectedCourse!.id,
          moduleId: _selectedModule!.id,
          completedLessons: int.tryParse(_lessonsController.text) ?? 0,
        );
    final progressService = ref.read(progressServiceProvider);
    await progressService.enqueueLog(log, offline: _queueOffline);
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _queueOffline
              ? 'Progress recorded for ${_selectedCourse!.title} (queued for offline sync)'
              : 'Progress recorded for ${_selectedCourse!.title}',
        ),
      ),
    );
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _timestamp,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now(),
    );
    if (date == null) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_timestamp));
    if (time == null) return;
    setState(() {
      _timestamp = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  @override
  Widget build(BuildContext context) {
    final courses = ref.watch(courseStoreProvider);

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Record progress milestone', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _selectedCourse?.id,
                    items: [
                      for (final course in courses)
                        DropdownMenuItem(value: course.id, child: Text(course.title)),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedCourse = courses.firstWhere((course) => course.id == value);
                        _selectedModule = _selectedCourse!.modules.first;
                      });
                    },
                    decoration: const InputDecoration(labelText: 'Course'),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _selectedModule?.id,
                    items: [
                      if (_selectedCourse != null)
                        for (final module in _selectedCourse!.modules)
                          DropdownMenuItem(value: module.id, child: Text(module.title)),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedModule = _selectedCourse!.modules.firstWhere((module) => module.id == value);
                      });
                    },
                    decoration: const InputDecoration(labelText: 'Module'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _lessonsController,
                    decoration: const InputDecoration(labelText: 'Completed lessons'),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Completion timestamp'),
                    subtitle: Text(DateFormat('EEE, MMM d • hh:mm a').format(_timestamp)),
                    trailing: IconButton(
                      icon: const Icon(Icons.calendar_today_outlined),
                      onPressed: _pickDateTime,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _notesController,
                    decoration: const InputDecoration(labelText: 'Highlights / blockers'),
                    minLines: 3,
                    maxLines: 6,
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    value: _queueOffline,
                    title: const Text('Queue for offline sync'),
                    subtitle: const Text('Store this update locally until connectivity returns.'),
                    onChanged: (value) {
                      setState(() {
                        _queueOffline = value;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      onPressed: () => _submit(),
                      child: const Text('Save log'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyProgressState extends StatelessWidget {
  const _EmptyProgressState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.insights_outlined, size: 64, color: Colors.blueGrey),
          SizedBox(height: 16),
          Text('No progress yet'),
          SizedBox(height: 8),
          Text('Record your first milestone to unlock learner analytics.'),
        ],
      ),
    );
  }
}
