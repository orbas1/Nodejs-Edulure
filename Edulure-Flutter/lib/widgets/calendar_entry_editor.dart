
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/community_hub_models.dart';

class CalendarEntryFormResult {
  CalendarEntryFormResult({
    required this.title,
    required this.description,
    required this.startTime,
    required this.endTime,
    required this.location,
    required this.organiser,
    this.communityId,
    this.reminderMinutes = const <int>[],
    this.tags = const <String>[],
    this.coverImageUrl,
    this.meetingUrl,
    this.notes,
    this.attachments = const <String>[],
  });

  final String title;
  final String description;
  final DateTime startTime;
  final DateTime endTime;
  final String location;
  final String organiser;
  final String? communityId;
  final List<int> reminderMinutes;
  final List<String> tags;
  final String? coverImageUrl;
  final String? meetingUrl;
  final String? notes;
  final List<String> attachments;
}

Future<CalendarEntryFormResult?> showCalendarEntryEditor({
  required BuildContext context,
  CommunityCalendarEntry? initial,
}) async {
  final titleController = TextEditingController(text: initial?.title ?? '');
  final descriptionController = TextEditingController(text: initial?.description ?? '');
  final locationController = TextEditingController(text: initial?.location ?? '');
  final organiserController = TextEditingController(text: initial?.organiser ?? '');
  final communityController = TextEditingController(text: initial?.communityId ?? '');
  final tagsController = TextEditingController(text: (initial?.tags ?? const <String>[]).join(', '));
  final reminderController = TextEditingController(
    text: (initial?.reminders ?? const <Duration>[])
        .map((duration) => duration.inMinutes.toString())
        .join(', '),
  );
  final coverController = TextEditingController(text: initial?.coverImageUrl ?? '');
  final meetingController = TextEditingController(text: initial?.meetingUrl ?? '');
  final notesController = TextEditingController(text: initial?.notes ?? '');
  final attachmentsController =
      TextEditingController(text: (initial?.attachments ?? const <String>[]).join('\n'));
  DateTime start = initial?.startTime ?? DateTime.now().add(const Duration(hours: 2));
  DateTime end = initial?.endTime ?? start.add(const Duration(hours: 1));
  final formKey = GlobalKey<FormState>();
  final dateFormat = DateFormat.yMMMMd();
  final timeFormat = DateFormat.jm();

  final result = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) {
      return Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 24,
          right: 24,
          top: 12,
        ),
        child: StatefulBuilder(
          builder: (context, setState) {
            Future<void> pickStart() async {
              final date = await showDatePicker(
                context: context,
                initialDate: start,
                firstDate: DateTime(2020),
                lastDate: DateTime(2100),
              );
              if (date == null) return;
              final time = await showTimePicker(
                context: context,
                initialTime: TimeOfDay.fromDateTime(start),
              );
              if (time == null) return;
              setState(() {
                start = DateTime(date.year, date.month, date.day, time.hour, time.minute);
                if (!end.isAfter(start)) {
                  end = start.add(const Duration(hours: 1));
                }
              });
            }

            Future<void> pickEnd() async {
              final date = await showDatePicker(
                context: context,
                initialDate: end,
                firstDate: start,
                lastDate: DateTime(2100),
              );
              if (date == null) return;
              final time = await showTimePicker(
                context: context,
                initialTime: TimeOfDay.fromDateTime(end),
              );
              if (time == null) return;
              setState(() {
                end = DateTime(date.year, date.month, date.day, time.hour, time.minute);
              });
            }

            return SingleChildScrollView(
              child: Form(
                key: formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          initial == null ? 'Create calendar entry' : 'Update calendar entry',
                          style: Theme.of(context)
                              .textTheme
                              .titleLarge
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(context, false),
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: titleController,
                      decoration: const InputDecoration(labelText: 'Title'),
                      validator: (value) =>
                          value == null || value.trim().isEmpty ? 'Enter the event title' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: organiserController,
                      decoration: const InputDecoration(labelText: 'Organiser'),
                      validator: (value) => value == null || value.trim().isEmpty
                          ? 'Enter organiser'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: descriptionController,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        alignLabelWithHint: true,
                      ),
                      maxLines: 4,
                      validator: (value) => value == null || value.trim().isEmpty
                          ? 'Describe the event'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _DateTimeField(
                            label: 'Starts',
                            date: dateFormat.format(start),
                            time: timeFormat.format(start),
                            onTap: pickStart,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _DateTimeField(
                            label: 'Ends',
                            date: dateFormat.format(end),
                            time: timeFormat.format(end),
                            onTap: pickEnd,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: locationController,
                      decoration: const InputDecoration(labelText: 'Location'),
                      validator: (value) =>
                          value == null || value.trim().isEmpty ? 'Provide a location' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: communityController,
                      decoration: const InputDecoration(labelText: 'Community id (optional)'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: tagsController,
                      decoration: const InputDecoration(labelText: 'Tags', helperText: 'Comma separated'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: reminderController,
                      decoration: const InputDecoration(
                        labelText: 'Reminder offsets',
                        helperText: 'Minutes before start (comma separated)',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: coverController,
                      decoration:
                          const InputDecoration(labelText: 'Cover image URL (optional)'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: meetingController,
                      decoration: const InputDecoration(labelText: 'Meeting link (optional)'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: notesController,
                      decoration: const InputDecoration(
                        labelText: 'Internal notes',
                        alignLabelWithHint: true,
                      ),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: attachmentsController,
                      decoration: const InputDecoration(
                        labelText: 'Attachments',
                        helperText: 'One URL per line',
                        alignLabelWithHint: true,
                      ),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('Cancel'),
                        ),
                        const SizedBox(width: 12),
                        FilledButton(
                          onPressed: () {
                            if (!formKey.currentState!.validate()) {
                              return;
                            }
                            Navigator.pop(context, true);
                          },
                          child: Text(initial == null ? 'Create' : 'Save'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            );
          },
        ),
      );
    },
  );

  if (result != true) {
    return null;
  }

  final reminderMinutes = reminderController.text
      .split(',')
      .map((value) => value.trim())
      .where((value) => value.isNotEmpty)
      .map(int.tryParse)
      .whereType<int>()
      .toList();

  final tags = tagsController.text
      .split(',')
      .map((value) => value.trim())
      .where((value) => value.isNotEmpty)
      .toList();

  final attachments = attachmentsController.text
      .split('\n')
      .map((value) => value.trim())
      .where((value) => value.isNotEmpty)
      .toList();

  return CalendarEntryFormResult(
    title: titleController.text.trim(),
    description: descriptionController.text.trim(),
    startTime: start,
    endTime: end,
    location: locationController.text.trim(),
    organiser: organiserController.text.trim(),
    communityId: communityController.text.trim().isEmpty ? null : communityController.text.trim(),
    reminderMinutes: reminderMinutes,
    tags: tags,
    coverImageUrl: coverController.text.trim().isEmpty ? null : coverController.text.trim(),
    meetingUrl: meetingController.text.trim().isEmpty ? null : meetingController.text.trim(),
    notes: notesController.text.trim().isEmpty ? null : notesController.text.trim(),
    attachments: attachments,
  );
}

class _DateTimeField extends StatelessWidget {
  const _DateTimeField({
    required this.label,
    required this.date,
    required this.time,
    required this.onTap,
  });

  final String label;
  final String date;
  final String time;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: InputDecoration(labelText: label),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(date, style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 2),
                Text(time, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
            const Icon(Icons.edit_calendar_outlined),
          ],
        ),
      ),
    );
  }
}
