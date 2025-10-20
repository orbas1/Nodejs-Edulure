import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/learning/learning_models.dart';
import '../provider/learning/learning_store.dart';

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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Course progress & insights'),
        actions: [
          IconButton(
            icon: const Icon(Icons.note_add_outlined),
            tooltip: 'Record progress',
            onPressed: () => _openProgressForm(context, ref),
          )
        ],
      ),
      body: courses.isEmpty
          ? const _EmptyProgressState()
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: courses.length,
              itemBuilder: (context, index) {
                final course = courses[index];
                final history = grouped[course.id] ?? [];
                return _CourseProgressCard(course: course, logs: history, onRecord: () => _openProgressForm(context, ref, course: course));
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openProgressForm(context, ref),
        icon: const Icon(Icons.add_chart_outlined),
        label: const Text('Log milestone'),
      ),
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

  void _submit() {
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
                      onPressed: _submit,
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
