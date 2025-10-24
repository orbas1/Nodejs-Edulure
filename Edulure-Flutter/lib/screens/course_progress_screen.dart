import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/learning/learning_models.dart';
import '../provider/learning/learning_store.dart';
import '../services/lesson_download_service.dart';

enum _ProgressAction { refresh, restoreSeed, sync }

class CourseProgressScreen extends ConsumerWidget {
  const CourseProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final courses = ref.watch(courseStoreProvider);
    final logs = ref.watch(progressStoreProvider);
    final downloadState = ref.watch(lessonDownloadStateProvider);
    final downloads = downloadState.value ?? const <String, LessonDownloadTask>{};
    final downloadService = ref.read(lessonDownloadServiceProvider);
    final grouped = <String, List<ModuleProgressLog>>{};
    for (final log in logs) {
      grouped.putIfAbsent(log.courseId, () => []).add(log);
    }
    final pendingCount = logs.where((log) => log.syncState == ProgressSyncState.pending).length;
    final conflictCount = logs.where((log) => log.syncState == ProgressSyncState.conflict).length;

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
              PopupMenuItem(
                value: _ProgressAction.sync,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.cloud_sync_outlined, size: 20),
                    SizedBox(width: 12),
                    Text('Sync offline progress'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: courses.isEmpty
          ? const _EmptyProgressState()
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: courses.length + (pendingCount > 0 || conflictCount > 0 ? 1 : 0),
              itemBuilder: (context, index) {
                if (pendingCount > 0 || conflictCount > 0) {
                  if (index == 0) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _ProgressSyncBanner(
                        pending: pendingCount,
                        conflicts: conflictCount,
                        onSync: () => _synchronise(context, ref),
                      ),
                    );
                  }
                  index -= 1;
                }
                final course = courses[index];
                final history = grouped[course.id] ?? [];
                return _CourseProgressCard(
                  course: course,
                  logs: history,
                  downloads: downloads,
                  onRecord: () => _openProgressForm(context, ref, course: course),
                  onDownload: (module) {
                    downloadService.enqueue(
                      courseId: course.id,
                      moduleId: module.id,
                      lessonId: module.id,
                      title: module.title,
                    );
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Downloading ${module.title} for offline access...')),
                    );
                  },
                  onCancelDownload: (module) {
                    final cancelled = downloadService.cancel(
                      courseId: course.id,
                      moduleId: module.id,
                      lessonId: module.id,
                    );
                    if (cancelled) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Cancelled download for ${module.title}.')),
                      );
                    }
                  },
                  onResolveConflict: (log, keepLocal) => ref
                      .read(progressStoreProvider.notifier)
                      .resolveConflict(log.id, keepLocal: keepLocal),
                );
              },
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
      case _ProgressAction.sync:
        await _synchronise(context, ref);
        break;
    }
  }

  Future<void> _synchronise(BuildContext context, WidgetRef ref) async {
    final notifier = ref.read(progressStoreProvider.notifier);
    final result = await notifier.synchronise();
    final conflicts = result.conflicts.length;
    final message = conflicts > 0
        ? 'Synced offline logs with $conflicts conflict${conflicts == 1 ? '' : 's'} to review.'
        : 'Offline progress synced successfully.';
    _showSnackBar(context, message);
  }

  void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
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
    required this.downloads,
    required this.onRecord,
    required this.onDownload,
    required this.onCancelDownload,
    required this.onResolveConflict,
  });

  final Course course;
  final List<ModuleProgressLog> logs;
  final Map<String, LessonDownloadTask> downloads;
  final VoidCallback onRecord;
  final void Function(CourseModule module) onDownload;
  final void Function(CourseModule module) onCancelDownload;
  final void Function(ModuleProgressLog log, bool keepLocal) onResolveConflict;

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat.percentPattern();
    final completionValue = course.overallProgress;
    final completion = formatter.format(completionValue);
    final pendingLogs = logs.where((log) => log.syncState == ProgressSyncState.pending).length;
    final conflictLogs = logs.where((log) => log.syncState == ProgressSyncState.conflict).length;
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
                  child: Semantics(
                    label: 'Overall course completion',
                    value: completion,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        CircularProgressIndicator(
                          value: completionValue,
                          strokeWidth: 12,
                        ),
                        Text(completion, style: Theme.of(context).textTheme.titleMedium),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (pendingLogs > 0 || conflictLogs > 0)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    if (pendingLogs > 0)
                      Chip(
                        avatar: const Icon(Icons.sync_problem_outlined, size: 18),
                        backgroundColor: Colors.blue.shade50,
                        label: Text('$pendingLogs update${pendingLogs == 1 ? '' : 's'} pending sync'),
                      ),
                    if (conflictLogs > 0)
                      Chip(
                        avatar: const Icon(Icons.warning_amber_rounded, size: 18, color: Colors.white),
                        backgroundColor: const Color(0xFFEF4444),
                        label: Text(
                          '$conflictLogs conflict${conflictLogs == 1 ? '' : 's'}',
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                  ],
                ),
              ),
            FilledButton.tonalIcon(
              onPressed: onRecord,
              icon: const Icon(Icons.add_task_outlined),
              label: const Text('Record module milestone'),
            ),
            const SizedBox(height: 16),
            _ModuleDownloadList(
              courseId: course.id,
              modules: course.modules,
              downloads: downloads,
              onDownload: onDownload,
              onCancel: onCancelDownload,
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
                    (log) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _ProgressLogTile(
                        log: log,
                        moduleTitle: _moduleTitle(course, log.moduleId),
                        onResolve: onResolveConflict,
                      ),
                    ),
                  )
                  .toList(),
          ],
        ),
      ),
    );
  }
}

class _ModuleDownloadList extends StatelessWidget {
  const _ModuleDownloadList({
    required this.courseId,
    required this.modules,
    required this.downloads,
    required this.onDownload,
    required this.onCancel,
  });

  final String courseId;
  final List<CourseModule> modules;
  final Map<String, LessonDownloadTask> downloads;
  final void Function(CourseModule module) onDownload;
  final void Function(CourseModule module) onCancel;

  @override
  Widget build(BuildContext context) {
    if (modules.isEmpty) {
      return const SizedBox.shrink();
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Offline module bundles',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        ...modules.map(
          (module) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _ModuleDownloadTile(
              module: module,
              task: downloads[_downloadKey(courseId, module.id)],
              onDownload: () => onDownload(module),
              onCancel: () => onCancel(module),
            ),
          ),
        ),
      ],
    );
  }
}

class _ModuleDownloadTile extends StatelessWidget {
  const _ModuleDownloadTile({
    required this.module,
    required this.task,
    required this.onDownload,
    required this.onCancel,
  });

  final CourseModule module;
  final LessonDownloadTask? task;
  final VoidCallback onDownload;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final status = task?.status;
    final isRunning = status == LessonDownloadStatus.running || status == LessonDownloadStatus.queued;
    final isCompleted = status == LessonDownloadStatus.completed;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(module.title),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${module.lessonCount} lessons • ${module.durationMinutes} minutes'),
          if (task != null) ...[
            const SizedBox(height: 6),
            LinearProgressIndicator(value: task!.progressFraction),
            const SizedBox(height: 4),
            Text(_downloadLabel(task!), style: Theme.of(context).textTheme.bodySmall),
          ],
        ],
      ),
      trailing: isRunning
          ? IconButton(
              tooltip: 'Cancel download',
              onPressed: onCancel,
              icon: const Icon(Icons.stop_circle_outlined),
            )
          : FilledButton.tonalIcon(
              icon: Icon(isCompleted ? Icons.check_circle_outlined : Icons.download_outlined),
              label: Text(isCompleted ? 'Available offline' : 'Download'),
              onPressed: isCompleted ? null : onDownload,
            ),
    );
  }

  String _downloadLabel(LessonDownloadTask task) {
    switch (task.status) {
      case LessonDownloadStatus.queued:
        return 'Queued • ${task.progress}%';
      case LessonDownloadStatus.running:
        return 'Downloading • ${task.progress}%';
      case LessonDownloadStatus.completed:
        return 'Ready offline';
      case LessonDownloadStatus.failed:
        return task.error ?? 'Download failed';
      case LessonDownloadStatus.cancelled:
        return 'Download cancelled';
    }
  }
}

class _ProgressLogTile extends StatelessWidget {
  const _ProgressLogTile({
    required this.log,
    required this.moduleTitle,
    required this.onResolve,
  });

  final ModuleProgressLog log;
  final String moduleTitle;
  final void Function(ModuleProgressLog log, bool keepLocal) onResolve;

  @override
  Widget build(BuildContext context) {
    final subtitle = '${DateFormat.yMMMd().format(log.timestamp)} — ${log.notes}';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: CircleAvatar(child: Text('${log.completedLessons}')),
          title: Text('$moduleTitle • completed lessons: ${log.completedLessons}'),
          subtitle: Text(subtitle),
          trailing: _syncChip(context),
        ),
        if (log.hasConflict && log.conflictReason != null)
          Padding(
            padding: const EdgeInsets.only(left: 16, bottom: 4),
            child: Text(log.conflictReason!, style: Theme.of(context).textTheme.bodySmall),
          ),
        if (log.hasConflict)
          ButtonBar(
            alignment: MainAxisAlignment.start,
            children: [
              TextButton(
                onPressed: () => onResolve(log, true),
                child: const Text('Keep local'),
              ),
              FilledButton(
                onPressed: () => onResolve(log, false),
                child: const Text('Accept remote'),
              ),
            ],
          ),
      ],
    );
  }

  Widget _syncChip(BuildContext context) {
    switch (log.syncState) {
      case ProgressSyncState.synced:
        return const Chip(label: Text('Synced'));
      case ProgressSyncState.pending:
        return const Chip(
          label: Text('Pending'),
          avatar: Icon(Icons.cloud_upload_outlined, size: 18),
        );
      case ProgressSyncState.syncing:
        return const Chip(
          label: Text('Syncing'),
          avatar: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
        );
      case ProgressSyncState.conflict:
        return const Chip(
          label: Text('Conflict', style: TextStyle(color: Colors.white)),
          avatar: Icon(Icons.warning_amber_rounded, size: 18, color: Colors.white),
          backgroundColor: Color(0xFFEF4444),
        );
    }
  }
}

class _ProgressSyncBanner extends StatelessWidget {
  const _ProgressSyncBanner({
    required this.pending,
    required this.conflicts,
    required this.onSync,
  });

  final int pending;
  final int conflicts;
  final VoidCallback onSync;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      color: theme.colorScheme.primaryContainer,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Offline progress sync',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              conflicts > 0
                  ? '$pending update${pending == 1 ? '' : 's'} ready. $conflicts conflict${conflicts == 1 ? '' : 's'} need attention.'
                  : '$pending update${pending == 1 ? '' : 's'} ready to sync.',
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: onSync,
              icon: const Icon(Icons.cloud_sync_outlined),
              label: const Text('Sync now'),
            ),
          ],
        ),
      ),
    );
  }
}

String _downloadKey(String courseId, String moduleId) => '$courseId::$moduleId::$moduleId';
String _moduleTitle(Course course, String moduleId) {
  return course.modules
      .firstWhere((module) => module.id == moduleId, orElse: () => course.modules.first)
      .title;
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

  @override
  void initState() {
    super.initState();
    final courses = ref.read(courseStoreProvider);
    _selectedCourse = widget.initialCourse ?? (courses.isNotEmpty ? courses.first : null);
    _selectedModule = _selectedCourse?.modules.first;
    _timestamp = DateTime.now();
    _lessonsController = TextEditingController(text: '1');
    _notesController = TextEditingController();
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
    await notifier.recordProgress(log);
    ref.read(courseStoreProvider.notifier).updateModuleProgress(
          courseId: _selectedCourse!.id,
          moduleId: _selectedModule!.id,
          completedLessons: int.tryParse(_lessonsController.text) ?? 0,
        );
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Progress recorded for ${_selectedCourse!.title}')),
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
