import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../provider/learning/learning_models.dart';
import '../provider/learning/learning_store.dart';

enum _LiveSessionAction { refresh, restoreSeed }

class LiveSessionsScreen extends ConsumerStatefulWidget {
  const LiveSessionsScreen({super.key});

  @override
  ConsumerState<LiveSessionsScreen> createState() => _LiveSessionsScreenState();
}

class _LiveSessionsScreenState extends ConsumerState<LiveSessionsScreen> {
  String _statusFilter = 'All';
  final DateFormat _dateFormat = DateFormat('EEE, MMM d • hh:mm a');

  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(liveSessionStoreProvider);
    final courses = ref.watch(courseStoreProvider);
    final tutors = ref.watch(tutorStoreProvider);

    final filtered = sessions.where((session) {
      if (_statusFilter == 'All') return true;
      final now = DateTime.now();
      if (_statusFilter == 'Upcoming') {
        return session.startTime.isAfter(now);
      } else {
        return session.endTime.isBefore(now);
      }
    }).toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live sessions & classrooms'),
        actions: [
          IconButton(
            tooltip: 'Schedule session',
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () => _openSessionForm(),
          ),
          PopupMenuButton<_LiveSessionAction>(
            tooltip: 'Session sync options',
            onSelected: _handleSessionAction,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: _LiveSessionAction.refresh,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.sync, size: 20),
                    SizedBox(width: 12),
                    Text('Reload saved sessions'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: _LiveSessionAction.restoreSeed,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.restore_outlined, size: 20),
                    SizedBox(width: 12),
                    Text('Restore demo sessions'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openSessionForm(),
        label: const Text('Schedule live session'),
        icon: const Icon(Icons.event_available_outlined),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'All', label: Text('All sessions')), 
                    ButtonSegment(value: 'Upcoming', label: Text('Upcoming')), 
                    ButtonSegment(value: 'Past', label: Text('Past recordings')), 
                  ],
                  selected: <String>{_statusFilter},
                  onSelectionChanged: (selection) => setState(() => _statusFilter = selection.first),
                ),
                const Spacer(),
                FilledButton.tonalIcon(
                  onPressed: filtered.isEmpty ? null : () => _openExportDialog(filtered),
                  icon: const Icon(Icons.file_download_outlined),
                  label: const Text('Export roster'),
                ),
              ],
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? const _EmptySessionsState()
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final session = filtered[index];
                      final course = courses.firstWhere((course) => course.id == session.courseId, orElse: () => courses.first);
                      final tutor = tutors.firstWhere((tutor) => tutor.id == session.tutorId, orElse: () => tutors.first);
                      return _SessionCard(
                        session: session,
                        course: course,
                        tutor: tutor,
                        dateFormat: _dateFormat,
                        onEdit: () => _openSessionForm(session: session),
                        onDelete: () => _confirmDelete(session),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleSessionAction(_LiveSessionAction action) async {
    final notifier = ref.read(liveSessionStoreProvider.notifier);
    switch (action) {
      case _LiveSessionAction.refresh:
        await notifier.refreshFromPersistence();
        if (!mounted) return;
        _showSnackbar('Reloaded saved sessions');
        break;
      case _LiveSessionAction.restoreSeed:
        await notifier.restoreSeedData();
        if (!mounted) return;
        _showSnackbar('Restored demo sessions');
        break;
    }
  }

  void _showSnackbar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _openSessionForm({LiveSession? session}) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _LiveSessionFormSheet(session: session),
    );
  }

  Future<void> _confirmDelete(LiveSession session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel session'),
        content: Text('Cancel ${session.title}? This will notify enrolled learners.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Cancel session'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      ref.read(liveSessionStoreProvider.notifier).deleteSession(session.id);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${session.title} cancelled')), 
      );
    }
  }

  void _openExportDialog(List<LiveSession> sessions) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Export roster'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Select the format for the roster export'),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              items: const [
                DropdownMenuItem(value: 'csv', child: Text('CSV')), 
                DropdownMenuItem(value: 'xlsx', child: Text('Excel workbook')), 
                DropdownMenuItem(value: 'ics', child: Text('Calendar (ICS)')), 
              ],
              onChanged: (_) {},
              decoration: const InputDecoration(labelText: 'File format'),
            ),
            const SizedBox(height: 12),
            Text('${sessions.length} sessions will be included'),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Export queued for ${sessions.length} sessions')),
              );
            },
            child: const Text('Export'),
          ),
        ],
      ),
    );
  }
}

class _SessionCard extends StatelessWidget {
  const _SessionCard({
    required this.session,
    required this.course,
    required this.tutor,
    required this.dateFormat,
    required this.onEdit,
    required this.onDelete,
  });

  final LiveSession session;
  final Course course;
  final Tutor tutor;
  final DateFormat dateFormat;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  Future<void> _launchExternal(BuildContext context, String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link is invalid')),
      );
      return;
    }
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open link')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateRange = '${dateFormat.format(session.startTime)} — ${dateFormat.format(session.endTime)}';
    final capacityText = '${session.enrolled}/${session.capacity} seats';
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 34,
                  backgroundImage: NetworkImage('${tutor.avatarUrl}?auto=format&fit=crop&w=200&q=80'),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session.title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: [
                          Chip(label: Text(course.title)),
                          Chip(label: Text(tutor.name)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(session.description),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.schedule, size: 20),
                          const SizedBox(width: 6),
                          Text(dateRange),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.people_outline, size: 20),
                          const SizedBox(width: 6),
                          Text(capacityText),
                          const Spacer(),
                          IconButton(onPressed: onEdit, icon: const Icon(Icons.edit_outlined)),
                          IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              children: [
                FilledButton.tonalIcon(
                  onPressed: () => _launchExternal(context, session.roomLink),
                  icon: const Icon(Icons.link_outlined),
                  label: const Text('Open classroom'),
                ),
                FilledButton.tonalIcon(
                  onPressed: session.isRecordingAvailable && (session.recordingUrl ?? '').isNotEmpty
                      ? () => _launchExternal(context, session.recordingUrl!)
                      : null,
                  icon: const Icon(Icons.play_circle_outline),
                  label: const Text('Share recording'),
                ),
                FilledButton.tonalIcon(
                  onPressed: () => _openResourcesDrawer(context),
                  icon: const Icon(Icons.folder_open_outlined),
                  label: const Text('Resources'),
                ),
              ],
            ),
            if (session.agenda.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text('Agenda', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ...session.agenda.map(
                (item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.check_circle_outline, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(item)),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _openResourcesDrawer(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Session resources', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                ...session.resources.map(
                  (resource) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.insert_drive_file_outlined),
                    title: Text(resource.label),
                    subtitle: Text(resource.url),
                    onTap: () => _launchExternal(context, resource.url),
                    trailing: IconButton(
                      icon: const Icon(Icons.copy_outlined),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Copied ${resource.label} link')),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _LiveSessionFormSheet extends ConsumerStatefulWidget {
  const _LiveSessionFormSheet({this.session});

  final LiveSession? session;

  @override
  ConsumerState<_LiveSessionFormSheet> createState() => _LiveSessionFormSheetState();
}

class _LiveSessionFormSheetState extends ConsumerState<_LiveSessionFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late DateTime _startTime;
  late DateTime _endTime;
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _roomController;
  late final TextEditingController _capacityController;
  late final TextEditingController _enrolledController;
  late final TextEditingController _recordingUrlController;
  late final TextEditingController _agendaController;
  final List<_ResourceFormData> _resources = [];
  String? _selectedCourse;
  String? _selectedTutor;
  bool _recordingAvailable = false;

  @override
  void initState() {
    super.initState();
    final session = widget.session;
    _startTime = session?.startTime ?? DateTime.now().add(const Duration(days: 1, hours: 1));
    _endTime = session?.endTime ?? _startTime.add(const Duration(hours: 1));
    _titleController = TextEditingController(text: session?.title ?? '');
    _descriptionController = TextEditingController(text: session?.description ?? '');
    _roomController = TextEditingController(text: session?.roomLink ?? '');
    _capacityController = TextEditingController(text: session?.capacity.toString() ?? '');
    _enrolledController = TextEditingController(text: session?.enrolled.toString() ?? '0');
    _recordingUrlController = TextEditingController(text: session?.recordingUrl ?? '');
    _agendaController = TextEditingController(
      text: session == null || session.agenda.isEmpty ? '' : session.agenda.join('\n'),
    );
    _selectedCourse = session?.courseId;
    _selectedTutor = session?.tutorId;
    _recordingAvailable = session?.isRecordingAvailable ?? false;
    if (session != null) {
      for (final resource in session.resources) {
        _resources.add(
          _ResourceFormData(
            id: resource.label,
            labelController: TextEditingController(text: resource.label),
            urlController: TextEditingController(text: resource.url),
          ),
        );
      }
    }
    if (_resources.isEmpty) {
      _addResource();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _roomController.dispose();
    _capacityController.dispose();
    _enrolledController.dispose();
    _recordingUrlController.dispose();
    _agendaController.dispose();
    for (final resource in _resources) {
      resource.dispose();
    }
    super.dispose();
  }

  void _addResource() {
    setState(() {
      _resources.add(_ResourceFormData.newEmpty());
    });
  }

  void _removeResource(_ResourceFormData resource) {
    if (_resources.length <= 1) return;
    setState(() {
      _resources.remove(resource);
      resource.dispose();
    });
  }

  Future<void> _selectDateTime({required bool start}) async {
    final initial = start ? _startTime : _endTime;
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null) return;
    final selected = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    setState(() {
      if (start) {
        _startTime = selected;
        if (_endTime.isBefore(_startTime)) {
          _endTime = _startTime.add(const Duration(hours: 1));
        }
      } else {
        _endTime = selected;
      }
    });
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final notifier = ref.read(liveSessionStoreProvider.notifier);
    final agenda = _agendaController.text
        .split('\n')
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();
    final session = notifier.buildSessionFromForm(
      id: widget.session?.id,
      title: _titleController.text.trim(),
      courseId: _selectedCourse ?? ref.read(courseStoreProvider).first.id,
      tutorId: _selectedTutor ?? ref.read(tutorStoreProvider).first.id,
      description: _descriptionController.text.trim(),
      startTime: _startTime,
      endTime: _endTime,
      roomLink: _roomController.text.trim(),
      resources: _resources
          .map(
            (resource) => LiveSessionResource(
              label: resource.labelController.text.trim(),
              url: resource.urlController.text.trim(),
            ),
          )
          .toList(),
      capacity: int.tryParse(_capacityController.text) ?? 0,
      enrolled: int.tryParse(_enrolledController.text) ?? 0,
      isRecordingAvailable: _recordingAvailable,
      recordingUrl: _recordingUrlController.text.trim().isEmpty ? null : _recordingUrlController.text.trim(),
      agenda: agenda,
    );

    if (widget.session == null) {
      notifier.createSession(session);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${session.title} scheduled')),
      );
    } else {
      notifier.updateSession(session);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session updated')),
      );
    }
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final courses = ref.watch(courseStoreProvider);
    final tutors = ref.watch(tutorStoreProvider);

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
                  Text(
                    widget.session == null ? 'Schedule live session' : 'Update session',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _titleController,
                    decoration: const InputDecoration(labelText: 'Session title'),
                    validator: (value) => value == null || value.isEmpty ? 'Title required' : null,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _selectedCourse ?? courses.first.id,
                    decoration: const InputDecoration(labelText: 'Course'),
                    items: [for (final course in courses) DropdownMenuItem(value: course.id, child: Text(course.title))],
                    onChanged: (value) => setState(() => _selectedCourse = value),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _selectedTutor ?? tutors.first.id,
                    decoration: const InputDecoration(labelText: 'Tutor'),
                    items: [for (final tutor in tutors) DropdownMenuItem(value: tutor.id, child: Text(tutor.name))],
                    onChanged: (value) => setState(() => _selectedTutor = value),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(labelText: 'Description'),
                    minLines: 3,
                    maxLines: 6,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Start time'),
                          subtitle: Text(DateFormat('EEE, MMM d • hh:mm a').format(_startTime)),
                          trailing: IconButton(
                            icon: const Icon(Icons.edit_outlined),
                            onPressed: () => _selectDateTime(start: true),
                          ),
                        ),
                      ),
                      Expanded(
                        child: ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('End time'),
                          subtitle: Text(DateFormat('EEE, MMM d • hh:mm a').format(_endTime)),
                          trailing: IconButton(
                            icon: const Icon(Icons.edit_outlined),
                            onPressed: () => _selectDateTime(start: false),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _roomController,
                    decoration: const InputDecoration(labelText: 'Room link'),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _capacityController,
                          decoration: const InputDecoration(labelText: 'Capacity'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _enrolledController,
                          decoration: const InputDecoration(labelText: 'Enrolled'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile.adaptive(
                    value: _recordingAvailable,
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Recording available'),
                    onChanged: (value) => setState(() => _recordingAvailable = value),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _recordingUrlController,
                    decoration: const InputDecoration(labelText: 'Recording URL (optional)'),
                    enabled: _recordingAvailable,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _agendaController,
                    decoration: const InputDecoration(labelText: 'Agenda (one item per line)'),
                    minLines: 3,
                    maxLines: 6,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Text('Resources', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                      const Spacer(),
                      TextButton.icon(
                        onPressed: _addResource,
                        icon: const Icon(Icons.add),
                        label: const Text('Add resource'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ..._resources.map(
                    (resource) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          color: Colors.grey.shade50,
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: resource.labelController,
                                      decoration: const InputDecoration(labelText: 'Label'),
                                    ),
                                  ),
                                  IconButton(onPressed: () => _removeResource(resource), icon: const Icon(Icons.remove_circle_outline)),
                                ],
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: resource.urlController,
                                decoration: const InputDecoration(labelText: 'URL'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      onPressed: _submit,
                      child: Text(widget.session == null ? 'Create session' : 'Save changes'),
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

class _ResourceFormData {
  _ResourceFormData({
    required this.id,
    required this.labelController,
    required this.urlController,
  });

  factory _ResourceFormData.newEmpty() {
    return _ResourceFormData(
      id: UniqueKey().toString(),
      labelController: TextEditingController(text: 'Session brief'),
      urlController: TextEditingController(text: 'https://example.com/resource.pdf'),
    );
  }

  final String id;
  final TextEditingController labelController;
  final TextEditingController urlController;

  void dispose() {
    labelController.dispose();
    urlController.dispose();
  }
}

class _EmptySessionsState extends StatelessWidget {
  const _EmptySessionsState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.video_camera_front_outlined, size: 64, color: Colors.blueGrey),
          SizedBox(height: 16),
          Text('No live sessions scheduled'),
          SizedBox(height: 8),
          Text('Schedule your first classroom to begin onboarding learners.'),
        ],
      ),
    );
  }
}
