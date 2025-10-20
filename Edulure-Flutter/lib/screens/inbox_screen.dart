import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/communication/communication_models.dart';
import '../provider/communication/communication_store.dart';

class InboxScreen extends ConsumerStatefulWidget {
  const InboxScreen({super.key});

  @override
  ConsumerState<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends ConsumerState<InboxScreen> {
  final TextEditingController _searchController = TextEditingController();
  String? _selectedThreadId;
  String _channelFilter = 'all';
  bool _showArchived = false;
  bool _showOnlyPinned = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final threads = ref.watch(inboxStoreProvider);
    final notifier = ref.read(inboxStoreProvider.notifier);
    final filtered = threads.where((thread) {
      if (!_showArchived && thread.archived) {
        return false;
      }
      if (_showOnlyPinned && !thread.pinned) {
        return false;
      }
      if (_channelFilter != 'all' && thread.channel != _channelFilter) {
        return false;
      }
      final search = _searchController.text.trim().toLowerCase();
      if (search.isEmpty) {
        return true;
      }
      return thread.title.toLowerCase().contains(search) ||
          (thread.topic?.toLowerCase().contains(search) ?? false) ||
          thread.participants
              .any((participant) => participant.displayName.toLowerCase().contains(search)) ||
          thread.messages.any((message) => message.body.toLowerCase().contains(search));
    }).toList()
      ..sort((a, b) {
        if (a.pinned != b.pinned) {
          return a.pinned ? -1 : 1;
        }
        return b.updatedAt.compareTo(a.updatedAt);
      });

    _selectedThreadId ??= filtered.isNotEmpty ? filtered.first.id : null;
    final selectedThread = filtered.firstWhere(
      (thread) => thread.id == _selectedThreadId,
      orElse: () => filtered.isEmpty ? null : filtered.first,
    );

    if (selectedThread != null) {
      notifier.markRead(selectedThread.id, DateTime.now());
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inbox & chat'),
        actions: [
          IconButton(
            tooltip: 'Restore demo threads',
            onPressed: () async {
              await notifier.restoreSeedData();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Restored sample conversations')),
              );
            },
            icon: const Icon(Icons.restore_outlined),
          ),
          IconButton(
            tooltip: 'Reload from local storage',
            onPressed: () async {
              await notifier.refreshFromPersistence();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Reloaded saved inbox state')),
              );
            },
            icon: const Icon(Icons.sync),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openComposeSheet(context),
        icon: const Icon(Icons.create_outlined),
        label: const Text('New thread'),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 900;
          final threadList = _ThreadColumn(
            threads: filtered,
            selectedThreadId: selectedThread?.id,
            onSelect: (thread) {
              setState(() => _selectedThreadId = thread.id);
            },
            onTogglePinned: notifier.togglePinned,
            onToggleArchived: notifier.toggleArchived,
            onToggleMuted: notifier.toggleMuted,
          );

          final conversation = selectedThread == null
              ? const _EmptyConversationState()
              : _ConversationPane(
                  thread: selectedThread,
                  onSend: (text, attachments, internal) {
                    final message = notifier.buildMessage(
                      author: internal ? 'Internal note' : 'You',
                      body: text,
                      fromMe: !internal,
                      attachments: attachments,
                    );
                    notifier.sendMessage(selectedThread.id, message);
                    notifier.markRead(selectedThread.id, DateTime.now());
                  },
                  onRename: (name) => notifier.updateThread(
                    selectedThread.copyWith(title: name, updatedAt: DateTime.now()),
                  ),
                  onTopicChange: (topic) => notifier.updateThread(
                    selectedThread.copyWith(topic: topic, updatedAt: DateTime.now()),
                  ),
                  onParticipantsUpdate: (participants) => notifier.updateThread(
                    selectedThread.copyWith(participants: participants, updatedAt: DateTime.now()),
                  ),
                );

          return Column(
            children: [
              _buildFilters(),
              const Divider(height: 1),
              Expanded(
                child: isWide
                    ? Row(
                        children: [
                          SizedBox(width: 340, child: threadList),
                          const VerticalDivider(width: 1),
                          Expanded(child: conversation),
                        ],
                      )
                    : Column(
                        children: [
                          Expanded(child: threadList),
                          const Divider(height: 1),
                          SizedBox(height: constraints.maxHeight * 0.55, child: conversation),
                        ],
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFilters() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search),
              hintText: 'Search by participant, keyword, or tag',
              suffixIcon: _searchController.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        setState(() {
                          _searchController.clear();
                        });
                      },
                    ),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                FilterChip(
                  label: const Text('Pinned'),
                  selected: _showOnlyPinned,
                  onSelected: (value) => setState(() => _showOnlyPinned = value),
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Archived'),
                  selected: _showArchived,
                  onSelected: (value) => setState(() => _showArchived = value),
                ),
                const SizedBox(width: 8),
                DropdownButton<String>(
                  value: _channelFilter,
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('All channels')),
                    DropdownMenuItem(value: 'team', child: Text('Team')),
                    DropdownMenuItem(value: 'support', child: Text('Support')),
                    DropdownMenuItem(value: 'community', child: Text('Community')),
                  ],
                  onChanged: (value) => setState(() => _channelFilter = value ?? 'all'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openComposeSheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return _ComposeThreadSheet(
          onCreated: (thread) {
            final notifier = ref.read(inboxStoreProvider.notifier);
            notifier.createThread(thread);
            setState(() => _selectedThreadId = thread.id);
          },
        );
      },
    );
  }
}

class _ThreadColumn extends StatelessWidget {
  const _ThreadColumn({
    required this.threads,
    required this.onSelect,
    required this.onTogglePinned,
    required this.onToggleArchived,
    required this.onToggleMuted,
    this.selectedThreadId,
  });

  final List<ConversationThread> threads;
  final String? selectedThreadId;
  final ValueChanged<ConversationThread> onSelect;
  final void Function(String id) onTogglePinned;
  final void Function(String id) onToggleArchived;
  final void Function(String id) onToggleMuted;

  @override
  Widget build(BuildContext context) {
    if (threads.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('No conversations yet. Create a new thread to get started.'),
        ),
      );
    }

    return ListView.separated(
      itemCount: threads.length,
      separatorBuilder: (_, __) => const Divider(height: 0),
      itemBuilder: (context, index) {
        final thread = threads[index];
        final isSelected = thread.id == selectedThreadId;
        return Material(
          color: isSelected
              ? Theme.of(context).colorScheme.primary.withOpacity(0.08)
              : Colors.transparent,
          child: InkWell(
            onTap: () => onSelect(thread),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          thread.title,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: thread.hasUnread ? FontWeight.w700 : FontWeight.w500,
                              ),
                        ),
                      ),
                      PopupMenuButton<String>(
                        onSelected: (value) {
                          switch (value) {
                            case 'pin':
                              onTogglePinned(thread.id);
                              break;
                            case 'mute':
                              onToggleMuted(thread.id);
                              break;
                            case 'archive':
                              onToggleArchived(thread.id);
                              break;
                          }
                        },
                        itemBuilder: (context) => [
                          PopupMenuItem(
                            value: 'pin',
                            child: Text(thread.pinned ? 'Unpin' : 'Pin'),
                          ),
                          PopupMenuItem(
                            value: 'mute',
                            child: Text(thread.muted ? 'Unmute' : 'Mute notifications'),
                          ),
                          PopupMenuItem(
                            value: 'archive',
                            child: Text(thread.archived ? 'Unarchive' : 'Archive thread'),
                          ),
                        ],
                      )
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    thread.lastMessage?.body ?? 'No messages yet',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      Chip(
                        label: Text(thread.channel.toUpperCase()),
                        visualDensity: VisualDensity.compact,
                      ),
                      if (thread.topic != null && thread.topic!.isNotEmpty)
                        Chip(
                          label: Text(thread.topic!),
                          visualDensity: VisualDensity.compact,
                        ),
                      if (thread.hasUnread)
                        Chip(
                          avatar: const Icon(Icons.mark_unread_chat_alt, size: 16),
                          label: Text('${thread.unreadCount} unread'),
                          backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                        ),
                      if (thread.muted)
                        const Chip(
                          avatar: Icon(Icons.notifications_off_outlined, size: 16),
                          label: Text('Muted'),
                        ),
                      if (thread.archived)
                        const Chip(
                          avatar: Icon(Icons.inventory_2_outlined, size: 16),
                          label: Text('Archived'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ConversationPane extends StatefulWidget {
  const _ConversationPane({
    required this.thread,
    required this.onSend,
    required this.onRename,
    required this.onTopicChange,
    required this.onParticipantsUpdate,
  });

  final ConversationThread thread;
  final void Function(String text, List<MessageAttachment> attachments, bool internal) onSend;
  final ValueChanged<String> onRename;
  final ValueChanged<String?> onTopicChange;
  final ValueChanged<List<ConversationParticipant>> onParticipantsUpdate;

  @override
  State<_ConversationPane> createState() => _ConversationPaneState();
}

class _ConversationPaneState extends State<_ConversationPane> {
  final TextEditingController _composerController = TextEditingController();
  final TextEditingController _renameController = TextEditingController();
  final TextEditingController _topicController = TextEditingController();
  final List<MessageAttachment> _pendingAttachments = <MessageAttachment>[];
  bool _internalNote = false;

  @override
  void initState() {
    super.initState();
    _renameController.text = widget.thread.title;
    _topicController.text = widget.thread.topic ?? '';
  }

  @override
  void didUpdateWidget(covariant _ConversationPane oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.thread.id != widget.thread.id) {
      _composerController.clear();
      _pendingAttachments.clear();
      _internalNote = false;
      _renameController.text = widget.thread.title;
      _topicController.text = widget.thread.topic ?? '';
    }
  }

  @override
  void dispose() {
    _composerController.dispose();
    _renameController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messages = widget.thread.messages;
    final formatter = DateFormat('MMM d • hh:mm a');
    return Column(
      children: [
        _ConversationHeader(
          thread: widget.thread,
          renameController: _renameController,
          topicController: _topicController,
          onRename: widget.onRename,
          onTopicChange: widget.onTopicChange,
          onParticipantsUpdate: widget.onParticipantsUpdate,
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            itemCount: messages.length,
            itemBuilder: (context, index) {
              final message = messages[index];
              final previousAuthor = index > 0 ? messages[index - 1].author : null;
              final showAvatar = previousAuthor != message.author;
              return Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: _MessageBubble(
                  message: message,
                  formatter: formatter,
                  showAvatar: showAvatar,
                ),
              );
            },
          ),
        ),
        if (_pendingAttachments.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.4),
            child: Wrap(
              spacing: 8,
              children: _pendingAttachments
                  .map(
                    (attachment) => Chip(
                      label: Text(attachment.label),
                      onDeleted: () {
                        setState(() => _pendingAttachments.remove(attachment));
                      },
                    ),
                  )
                  .toList(),
            ),
          ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _composerController,
                        minLines: 1,
                        maxLines: 6,
                        decoration: const InputDecoration(
                          hintText: 'Write a reply…',
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    IconButton(
                      tooltip: 'Attach link',
                      onPressed: _openAttachmentDialog,
                      icon: const Icon(Icons.attach_file_outlined),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Switch.adaptive(
                      value: _internalNote,
                      onChanged: (value) => setState(() => _internalNote = value),
                    ),
                    const Text('Internal note'),
                    const Spacer(),
                    FilledButton(
                      onPressed: _composerController.text.trim().isEmpty
                          ? null
                          : () {
                              widget.onSend(
                                _composerController.text.trim(),
                                List<MessageAttachment>.from(_pendingAttachments),
                                _internalNote,
                              );
                              setState(() {
                                _composerController.clear();
                                _pendingAttachments.clear();
                                _internalNote = false;
                              });
                            },
                      child: const Text('Send'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _openAttachmentDialog() async {
    final attachment = await showDialog<MessageAttachment>(
      context: context,
      builder: (context) => const _LinkAttachmentDialog(),
    );
    if (attachment != null) {
      setState(() => _pendingAttachments.add(attachment));
    }
  }
}

class _ConversationHeader extends StatefulWidget {
  const _ConversationHeader({
    required this.thread,
    required this.renameController,
    required this.topicController,
    required this.onRename,
    required this.onTopicChange,
    required this.onParticipantsUpdate,
  });

  final ConversationThread thread;
  final TextEditingController renameController;
  final TextEditingController topicController;
  final ValueChanged<String> onRename;
  final ValueChanged<String?> onTopicChange;
  final ValueChanged<List<ConversationParticipant>> onParticipantsUpdate;

  @override
  State<_ConversationHeader> createState() => _ConversationHeaderState();
}

class _ConversationHeaderState extends State<_ConversationHeader> {
  late List<ConversationParticipant> _participants;

  @override
  void initState() {
    super.initState();
    _participants = List<ConversationParticipant>.from(widget.thread.participants);
  }

  @override
  void didUpdateWidget(covariant _ConversationHeader oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.thread.id != widget.thread.id) {
      _participants = List<ConversationParticipant>.from(widget.thread.participants);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: widget.renameController,
            decoration: const InputDecoration(border: InputBorder.none),
            style: Theme.of(context).textTheme.titleLarge,
            onSubmitted: widget.onRename,
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              InputChip(
                avatar: const Icon(Icons.topic_outlined),
                label: SizedBox(
                  width: 160,
                  child: TextField(
                    controller: widget.topicController,
                    decoration: const InputDecoration.collapsed(hintText: 'Add topic'),
                    onSubmitted: (value) => widget.onTopicChange(
                      value.trim().isEmpty ? null : value.trim(),
                    ),
                  ),
                ),
              ),
              ActionChip(
                avatar: const Icon(Icons.group_add_outlined),
                label: const Text('Manage participants'),
                onPressed: _openParticipantsDialog,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _openParticipantsDialog() async {
    final updated = await showDialog<List<ConversationParticipant>>(
      context: context,
      builder: (context) => _ParticipantsDialog(initialParticipants: _participants),
    );
    if (updated != null) {
      setState(() => _participants = updated);
      widget.onParticipantsUpdate(updated);
    }
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    required this.formatter,
    required this.showAvatar,
  });

  final InboxMessage message;
  final DateFormat formatter;
  final bool showAvatar;

  @override
  Widget build(BuildContext context) {
    final alignment = message.fromMe ? Alignment.centerRight : Alignment.centerLeft;
    final background = message.fromMe
        ? Theme.of(context).colorScheme.primary.withOpacity(0.12)
        : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.7);
    final radius = BorderRadius.only(
      topLeft: const Radius.circular(18),
      topRight: const Radius.circular(18),
      bottomLeft: message.fromMe ? const Radius.circular(18) : Radius.zero,
      bottomRight: message.fromMe ? Radius.zero : const Radius.circular(18),
    );

    return Align(
      alignment: alignment,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Column(
          crossAxisAlignment: message.fromMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (showAvatar)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  message.author,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
            DecoratedBox(
              decoration: BoxDecoration(
                color: background,
                borderRadius: radius,
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment:
                      message.fromMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                  children: [
                    Text(message.body),
                    if (message.attachments.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      ...message.attachments.map(
                        (attachment) => InkWell(
                          onTap: () {},
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.link, size: 16),
                              const SizedBox(width: 6),
                              Text(
                                attachment.label,
                                style: const TextStyle(decoration: TextDecoration.underline),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              formatter.format(message.sentAt),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey),
            ),
          ],
        ),
      ),
    );
  }
}

class _ComposeThreadSheet extends ConsumerStatefulWidget {
  const _ComposeThreadSheet({required this.onCreated});

  final ValueChanged<ConversationThread> onCreated;

  @override
  ConsumerState<_ComposeThreadSheet> createState() => _ComposeThreadSheetState();
}

class _ComposeThreadSheetState extends ConsumerState<_ComposeThreadSheet> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _participantsController = TextEditingController(text: 'You, New participant');
  final TextEditingController _topicController = TextEditingController();
  final TextEditingController _initialMessageController = TextEditingController();
  String _channel = 'team';
  bool _pinThread = false;
  bool _muteThread = false;
  int _idCounter = 0;

  @override
  void dispose() {
    _titleController.dispose();
    _participantsController.dispose();
    _topicController.dispose();
    _initialMessageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Start a new conversation',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(labelText: 'Thread title'),
                  validator: (value) => value == null || value.trim().isEmpty ? 'Title is required' : null,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _channel,
                  decoration: const InputDecoration(labelText: 'Channel'),
                  items: const [
                    DropdownMenuItem(value: 'team', child: Text('Team')), 
                    DropdownMenuItem(value: 'support', child: Text('Support desk')), 
                    DropdownMenuItem(value: 'community', child: Text('Community chat')),
                  ],
                  onChanged: (value) => setState(() => _channel = value ?? 'team'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _participantsController,
                  decoration: const InputDecoration(
                    labelText: 'Participants',
                    helperText: 'Comma separated names',
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _topicController,
                  decoration: const InputDecoration(labelText: 'Topic (optional)'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _initialMessageController,
                  decoration: const InputDecoration(labelText: 'Initial message'),
                  minLines: 2,
                  maxLines: 5,
                ),
                const SizedBox(height: 12),
                SwitchListTile.adaptive(
                  value: _pinThread,
                  onChanged: (value) => setState(() => _pinThread = value),
                  title: const Text('Pin thread to top'),
                ),
                SwitchListTile.adaptive(
                  value: _muteThread,
                  onChanged: (value) => setState(() => _muteThread = value),
                  title: const Text('Mute notifications'),
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton(
                    onPressed: _submit,
                    child: const Text('Create thread'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    final notifier = ref.read(inboxStoreProvider.notifier);
    final participants = _participantsController.text
        .split(',')
        .map((name) => name.trim())
        .where((name) => name.isNotEmpty)
        .map(
          (name) => ConversationParticipant(
            id: _nextId('participant'),
            displayName: name,
          ),
        )
        .toList();
    final thread = notifier.buildThread(
      title: _titleController.text.trim(),
      channel: _channel,
      topic: _topicController.text.trim().isEmpty ? null : _topicController.text.trim(),
      participants: participants,
      pinned: _pinThread,
      muted: _muteThread,
    );
    if (_initialMessageController.text.trim().isNotEmpty) {
      final message = notifier.buildMessage(
        author: 'You',
        body: _initialMessageController.text.trim(),
        fromMe: true,
      );
      notifier.createThread(
        thread.copyWith(messages: [message], updatedAt: message.sentAt),
      );
    } else {
      notifier.createThread(thread);
    }
    widget.onCreated(thread);
    Navigator.of(context).pop();
  }

  String _nextId(String prefix) {
    _idCounter++;
    return '$prefix-${DateTime.now().microsecondsSinceEpoch}$_idCounter';
  }
}

class _ParticipantsDialog extends StatefulWidget {
  const _ParticipantsDialog({required this.initialParticipants});

  final List<ConversationParticipant> initialParticipants;

  @override
  State<_ParticipantsDialog> createState() => _ParticipantsDialogState();
}

class _ParticipantsDialogState extends State<_ParticipantsDialog> {
  late List<ConversationParticipant> _participants;
  final TextEditingController _newParticipantController = TextEditingController();
  int _idCounter = 0;

  @override
  void initState() {
    super.initState();
    _participants = List<ConversationParticipant>.from(widget.initialParticipants);
  }

  @override
  void dispose() {
    _newParticipantController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Update participants'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Wrap(
            spacing: 8,
            children: _participants
                .map(
                  (participant) => InputChip(
                    label: Text(participant.displayName),
                    onDeleted: () {
                      setState(() => _participants.remove(participant));
                    },
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _newParticipantController,
            decoration: const InputDecoration(labelText: 'Add participant'),
            onSubmitted: (_) => _addParticipant(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, _participants),
          child: const Text('Save'),
        ),
      ],
    );
  }

  void _addParticipant() {
    final name = _newParticipantController.text.trim();
    if (name.isEmpty) return;
    setState(() {
      _participants.add(
        ConversationParticipant(id: _nextId(), displayName: name),
      );
      _newParticipantController.clear();
    });
  }

  String _nextId() {
    _idCounter++;
    return 'participant-${DateTime.now().microsecondsSinceEpoch}$_idCounter';
  }
}

class _LinkAttachmentDialog extends StatefulWidget {
  const _LinkAttachmentDialog();

  @override
  State<_LinkAttachmentDialog> createState() => _LinkAttachmentDialogState();
}

class _LinkAttachmentDialogState extends State<_LinkAttachmentDialog> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _labelController = TextEditingController();
  final TextEditingController _urlController = TextEditingController();

  @override
  void dispose() {
    _labelController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Attach link'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _labelController,
              decoration: const InputDecoration(labelText: 'Label'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Label required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _urlController,
              decoration: const InputDecoration(labelText: 'URL'),
              validator: (value) => value == null || value.trim().isEmpty ? 'URL required' : null,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            if (!_formKey.currentState!.validate()) return;
            Navigator.pop(
              context,
              MessageAttachment(
                label: _labelController.text.trim(),
                url: _urlController.text.trim(),
              ),
            );
          },
          child: const Text('Attach'),
        ),
      ],
    );
  }
}

class _EmptyConversationState extends StatelessWidget {
  const _EmptyConversationState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.chat_bubble_outline, size: 64, color: Colors.blueGrey),
          SizedBox(height: 12),
          Text('Select a thread to view messages'),
        ],
      ),
    );
  }
}
