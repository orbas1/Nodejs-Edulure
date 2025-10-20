
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../provider/community/community_hub_controller.dart';
import '../services/community_hub_models.dart';
import '../widgets/calendar_entry_editor.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _includePast = false;
  final Set<String> _selectedTags = <String>{};
  String? _selectedCommunity;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(communityHubControllerProvider.notifier).bootstrap());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(communityHubControllerProvider);
    final controller = ref.read(communityHubControllerProvider.notifier);
    final now = DateTime.now();
    var entries = List<CommunityCalendarEntry>.from(state.snapshot.calendarEntries);

    if (!_includePast) {
      entries = entries.where((entry) => entry.endTime.isAfter(now)).toList();
    }

    final query = _searchController.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      entries = entries.where((entry) {
        final haystack = '${entry.title} ${entry.description} ${entry.organiser}'.toLowerCase();
        final tagMatch = entry.tags.any((tag) => tag.toLowerCase().contains(query));
        return haystack.contains(query) || tagMatch;
      }).toList();
    }

    if (_selectedTags.isNotEmpty) {
      entries = entries
          .where((entry) => _selectedTags.every((tag) => entry.tags.contains(tag)))
          .toList();
    }

    if (_selectedCommunity != null && _selectedCommunity!.isNotEmpty) {
      entries = entries.where((entry) => entry.communityId == _selectedCommunity).toList();
    }

    entries.sort((a, b) => a.startTime.compareTo(b.startTime));

    final allTags = state.snapshot.calendarEntries
        .expand((entry) => entry.tags)
        .toSet()
        .toList()
      ..sort();
    final communities = state.snapshot.calendarEntries
        .map((entry) => entry.communityId)
        .whereType<String>()
        .toSet()
        .toList()
      ..sort();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Community calendar'),
        actions: [
          IconButton(
            tooltip: 'Add entry',
            onPressed: () => _compose(context, controller),
            icon: const Icon(Icons.add_circle_outline),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: controller.refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 120),
          children: [
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search),
                labelText: 'Search events',
                suffixIcon: _searchController.text.isEmpty
                    ? null
                    : IconButton(
                        onPressed: () {
                          setState(() {
                            _searchController.clear();
                          });
                        },
                        icon: const Icon(Icons.clear),
                      ),
              ),
              onChanged: (_) => setState(() {}),
            ),
            SwitchListTile.adaptive(
              value: _includePast,
              contentPadding: EdgeInsets.zero,
              title: const Text('Show past events'),
              onChanged: (value) => setState(() => _includePast = value),
            ),
            if (communities.isNotEmpty)
              DropdownButtonFormField<String?>(
                value: _selectedCommunity,
                decoration: const InputDecoration(labelText: 'Community filter'),
                items: [
                  const DropdownMenuItem<String?>(
                    value: null,
                    child: Text('All communities'),
                  ),
                  for (final community in communities)
                    DropdownMenuItem<String?>(value: community, child: Text(community)),
                ],
                onChanged: (value) => setState(() => _selectedCommunity = value),
              ),
            if (allTags.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final tag in allTags)
                    FilterChip(
                      label: Text('#$tag'),
                      selected: _selectedTags.contains(tag),
                      onSelected: (value) => setState(() {
                        if (value) {
                          _selectedTags.add(tag);
                        } else {
                          _selectedTags.remove(tag);
                        }
                      }),
                    ),
                  if (_selectedTags.isNotEmpty)
                    TextButton(
                      onPressed: () => setState(_selectedTags.clear),
                      child: const Text('Clear tags'),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 16),
            if (entries.isEmpty)
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: const [
                      Icon(Icons.event_busy_outlined, size: 48),
                      SizedBox(height: 12),
                      Text('No events match the current filters.'),
                    ],
                  ),
                ),
              )
            else
              ...entries.map((entry) => Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _CalendarTimelineCard(
                      entry: entry,
                      onEdit: () => _compose(context, controller, initial: entry),
                      onDuplicate: () => _duplicate(controller, entry),
                      onDelete: () => controller.deleteCalendarEntry(entry.id),
                    ),
                  )),
          ],
        ),
      ),
    );
  }

  Future<void> _compose(
    BuildContext context,
    CommunityHubController controller, {
    CommunityCalendarEntry? initial,
  }) async {
    final result = await showCalendarEntryEditor(context: context, initial: initial);
    if (result == null) {
      return;
    }
    final reminders = result.reminderMinutes.map((value) => Duration(minutes: value)).toList();
    if (initial == null) {
      await controller.createCalendarEntry(
        title: result.title,
        description: result.description,
        startTime: result.startTime,
        endTime: result.endTime,
        location: result.location,
        organiser: result.organiser,
        communityId: result.communityId,
        reminders: reminders,
        tags: result.tags,
        coverImageUrl: result.coverImageUrl,
        meetingUrl: result.meetingUrl,
        notes: result.notes,
        attachments: result.attachments,
      );
    } else {
      await controller.updateCalendarEntry(
        initial.copyWith(
          title: result.title,
          description: result.description,
          startTime: result.startTime,
          endTime: result.endTime,
          location: result.location,
          organiser: result.organiser,
          communityId: result.communityId,
          reminders: reminders,
          tags: result.tags,
          coverImageUrl: result.coverImageUrl,
          meetingUrl: result.meetingUrl,
          notes: result.notes,
          attachments: result.attachments,
        ),
      );
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(initial == null ? 'Calendar entry created' : 'Calendar entry updated')),
    );
  }

  Future<void> _duplicate(
    CommunityHubController controller,
    CommunityCalendarEntry entry,
  ) async {
    final duration = entry.endTime.difference(entry.startTime);
    final cloneStart = entry.startTime.add(const Duration(days: 7));
    await controller.createCalendarEntry(
      title: entry.title,
      description: entry.description,
      startTime: cloneStart,
      endTime: cloneStart.add(duration),
      location: entry.location,
      organiser: entry.organiser,
      communityId: entry.communityId,
      reminders: entry.reminders,
      tags: entry.tags,
      coverImageUrl: entry.coverImageUrl,
      meetingUrl: entry.meetingUrl,
      notes: entry.notes,
      attachments: entry.attachments,
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Event duplicated to next week')),
      );
    }
  }
}

class _CalendarTimelineCard extends StatelessWidget {
  const _CalendarTimelineCard({
    required this.entry,
    required this.onEdit,
    required this.onDuplicate,
    required this.onDelete,
  });

  final CommunityCalendarEntry entry;
  final VoidCallback onEdit;
  final VoidCallback onDuplicate;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateRange =
        '${DateFormat.MMMd().format(entry.startTime)} • ${DateFormat.jm().format(entry.startTime)} - ${DateFormat.jm().format(entry.endTime)}';
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  backgroundColor: theme.colorScheme.primary.withOpacity(0.12),
                  child: const Icon(Icons.calendar_today_outlined),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.title,
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(dateRange, style: theme.textTheme.bodySmall),
                      const SizedBox(height: 4),
                      Text(entry.description),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    switch (value) {
                      case 'edit':
                        onEdit();
                        break;
                      case 'duplicate':
                        onDuplicate();
                        break;
                      case 'share':
                        _share(context, entry);
                        break;
                      case 'delete':
                        onDelete();
                        break;
                    }
                  },
                  itemBuilder: (context) => const [
                    PopupMenuItem(value: 'edit', child: Text('Edit')),
                    PopupMenuItem(value: 'duplicate', child: Text('Duplicate next week')),
                    PopupMenuItem(value: 'share', child: Text('Copy details')),
                    PopupMenuItem(value: 'delete', child: Text('Delete')),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 16),
                const SizedBox(width: 4),
                Text(entry.location),
              ],
            ),
            if ((entry.meetingUrl ?? '').isNotEmpty) ...[
              const SizedBox(height: 6),
              InkWell(
                onTap: () => _openLink(context, entry.meetingUrl!),
                child: Row(
                  children: [
                    const Icon(Icons.video_call_outlined, size: 16),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        entry.meetingUrl!,
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: theme.colorScheme.primary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if ((entry.notes ?? '').isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                entry.notes!,
                style: theme.textTheme.bodySmall
                    ?.copyWith(fontStyle: FontStyle.italic, color: Colors.grey[700]),
              ),
            ],
            if (entry.tags.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: entry.tags
                    .map((tag) => Chip(label: Text('#$tag')))
                    .toList(),
              ),
            ],
            if (entry.attachments.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final attachment in entry.attachments)
                    Tooltip(
                      message: attachment,
                      child: ActionChip(
                        avatar: const Icon(Icons.attach_file_outlined),
                        label: Text(_attachmentLabel(attachment)),
                        onPressed: () => _openLink(context, attachment),
                      ),
                    ),
                ],
              ),
            ],
            if (entry.reminders.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                children: entry.reminders
                    .map((duration) => Chip(label: Text('${duration.inMinutes} min reminder')))
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _share(BuildContext context, CommunityCalendarEntry entry) {
    final buffer = StringBuffer()
      ..writeln(entry.title)
      ..writeln(DateFormat('EEEE, MMM d · h:mm a').format(entry.startTime))
      ..writeln(entry.location)
      ..writeln(entry.description);
    if ((entry.meetingUrl ?? '').isNotEmpty) {
      buffer.writeln('Join: ${entry.meetingUrl}');
    }
    Clipboard.setData(ClipboardData(text: buffer.toString()));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Event details copied to clipboard')),
    );
  }

  Future<void> _openLink(BuildContext context, String url) async {
    final trimmed = url.trim();
    if (trimmed.isEmpty) {
      return;
    }
    var uri = Uri.tryParse(trimmed);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open link: invalid URL')),
      );
      return;
    }
    if (!uri.hasScheme) {
      uri = uri.replace(scheme: 'https');
    }
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to launch link')),
      );
    }
  }

  String _attachmentLabel(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      return 'Attachment';
    }
    final segments = uri.pathSegments.where((segment) => segment.isNotEmpty).toList();
    if (segments.isNotEmpty) {
      return segments.last;
    }
    return uri.host.isNotEmpty ? uri.host : 'Attachment';
  }
}
