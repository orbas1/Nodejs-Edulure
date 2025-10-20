import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/communication/communication_models.dart';
import '../provider/communication/communication_store.dart';

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  String _statusFilter = 'open';
  String _priorityFilter = 'all';
  String? _selectedTicketId;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tickets = ref.watch(supportTicketStoreProvider);
    final notifier = ref.read(supportTicketStoreProvider.notifier);
    final filtered = tickets.where((ticket) {
      final matchesStatus = _statusFilter == 'all' || ticket.status.name == _statusFilter;
      final matchesPriority = _priorityFilter == 'all' || ticket.priority.name == _priorityFilter;
      final query = _searchController.text.trim().toLowerCase();
      final matchesSearch = query.isEmpty ||
          ticket.subject.toLowerCase().contains(query) ||
          ticket.description.toLowerCase().contains(query) ||
          ticket.tags.any((tag) => tag.toLowerCase().contains(query));
      return matchesStatus && matchesPriority && matchesSearch;
    }).toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));

    _selectedTicketId ??= filtered.isNotEmpty ? filtered.first.id : null;
    final selectedTicket = filtered.firstWhere(
      (ticket) => ticket.id == _selectedTicketId,
      orElse: () => filtered.isEmpty ? null : filtered.first,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Support operations'),
        actions: [
          IconButton(
            tooltip: 'Restore demo queue',
            onPressed: () async {
              await notifier.restoreSeedData();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Support queue restored to demo data')),
              );
            },
            icon: const Icon(Icons.restore_outlined),
          ),
          IconButton(
            tooltip: 'Refresh from cache',
            onPressed: () async {
              await notifier.refreshFromPersistence();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Reloaded saved tickets')), 
              );
            },
            icon: const Icon(Icons.sync),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openCreateSheet(context),
        icon: const Icon(Icons.add_task_outlined),
        label: const Text('Log ticket'),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 1024;
          final listView = _TicketList(
            tickets: filtered,
            selectedTicketId: selectedTicket?.id,
            onSelect: (ticket) => setState(() => _selectedTicketId = ticket.id),
          );
          final detailView = selectedTicket == null
              ? const _NoTicketSelectedView()
              : _TicketDetailView(
                  ticket: selectedTicket,
                  onStatusChanged: (status) => notifier.changeStatus(selectedTicket.id, status),
                  onAddUpdate: (body, internal, attachments) {
                    final update = notifier.buildUpdate(
                      author: internal ? 'Internal note' : 'You',
                      body: body,
                      internal: internal,
                      attachments: attachments,
                    );
                    notifier.addUpdate(selectedTicket.id, update);
                  },
                  onDelete: () {
                    notifier.deleteTicket(selectedTicket.id);
                    setState(() => _selectedTicketId = null);
                  },
                  onEscalate: () => notifier.updateTicket(
                    selectedTicket.copyWith(priority: SupportPriority.urgent, updatedAt: DateTime.now()),
                  ),
                  onAssign: (assignee) => notifier.updateTicket(
                    selectedTicket.copyWith(assignedTo: assignee, updatedAt: DateTime.now()),
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
                          SizedBox(width: 380, child: listView),
                          const VerticalDivider(width: 1),
                          Expanded(child: detailView),
                        ],
                      )
                    : Column(
                        children: [
                          Expanded(child: listView),
                          const Divider(height: 1),
                          SizedBox(height: constraints.maxHeight * 0.6, child: detailView),
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
              hintText: 'Search by subject, requester, or tag',
              suffixIcon: _searchController.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => setState(() => _searchController.clear()),
                    ),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              DropdownButton<String>(
                value: _statusFilter,
                items: const [
                  DropdownMenuItem(value: 'open', child: Text('Open')),
                  DropdownMenuItem(value: 'inProgress', child: Text('In progress')),
                  DropdownMenuItem(value: 'awaitingCustomer', child: Text('Awaiting customer')),
                  DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
                  DropdownMenuItem(value: 'closed', child: Text('Closed')),
                  DropdownMenuItem(value: 'all', child: Text('All statuses')),
                ],
                onChanged: (value) => setState(() => _statusFilter = value ?? 'all'),
              ),
              DropdownButton<String>(
                value: _priorityFilter,
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('All priorities')),
                  DropdownMenuItem(value: 'low', child: Text('Low')),
                  DropdownMenuItem(value: 'normal', child: Text('Normal')),
                  DropdownMenuItem(value: 'high', child: Text('High')),
                  DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                ],
                onChanged: (value) => setState(() => _priorityFilter = value ?? 'all'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _openCreateSheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _CreateTicketSheet(
        onCreated: (ticket) {
          ref.read(supportTicketStoreProvider.notifier).createTicket(ticket);
          setState(() => _selectedTicketId = ticket.id);
        },
      ),
    );
  }
}

class _TicketList extends StatelessWidget {
  const _TicketList({
    required this.tickets,
    required this.selectedTicketId,
    required this.onSelect,
  });

  final List<SupportTicket> tickets;
  final String? selectedTicketId;
  final ValueChanged<SupportTicket> onSelect;

  Color _priorityColor(SupportPriority priority, BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    switch (priority) {
      case SupportPriority.low:
        return scheme.secondaryContainer;
      case SupportPriority.normal:
        return scheme.primaryContainer;
      case SupportPriority.high:
        return scheme.errorContainer.withOpacity(0.7);
      case SupportPriority.urgent:
        return scheme.errorContainer;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (tickets.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text('No tickets match the current filters.'),
        ),
      );
    }

    final formatter = DateFormat('MMM d • HH:mm');

    return ListView.separated(
      itemCount: tickets.length,
      separatorBuilder: (_, __) => const Divider(height: 0),
      itemBuilder: (context, index) {
        final ticket = tickets[index];
        final selected = ticket.id == selectedTicketId;
        final color = _priorityColor(ticket.priority, context);
        return Material(
          color: selected ? Theme.of(context).colorScheme.primary.withOpacity(0.08) : Colors.transparent,
          child: InkWell(
            onTap: () => onSelect(ticket),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          ticket.subject,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      Chip(
                        label: Text(ticket.status.label),
                        backgroundColor: ticket.status == SupportStatus.resolved
                            ? Colors.green.shade100
                            : Colors.blueGrey.shade50,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    ticket.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      Chip(
                        label: Text('Priority ${ticket.priorityLabel()}'),
                        backgroundColor: color,
                      ),
                      Chip(
                        avatar: const Icon(Icons.person_outline, size: 16),
                        label: Text(ticket.contactName),
                      ),
                      if (ticket.assignedTo != null)
                        Chip(
                          avatar: const Icon(Icons.assignment_ind_outlined, size: 16),
                          label: Text('Assigned ${ticket.assignedTo}'),
                        ),
                      Chip(
                        avatar: const Icon(Icons.schedule_outlined, size: 16),
                        label: Text(formatter.format(ticket.updatedAt)),
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

class _TicketDetailView extends StatefulWidget {
  const _TicketDetailView({
    required this.ticket,
    required this.onStatusChanged,
    required this.onAddUpdate,
    required this.onDelete,
    required this.onEscalate,
    required this.onAssign,
  });

  final SupportTicket ticket;
  final ValueChanged<SupportStatus> onStatusChanged;
  final void Function(String body, bool internal, List<MessageAttachment> attachments) onAddUpdate;
  final VoidCallback onDelete;
  final VoidCallback onEscalate;
  final ValueChanged<String?> onAssign;

  @override
  State<_TicketDetailView> createState() => _TicketDetailViewState();
}

class _TicketDetailViewState extends State<_TicketDetailView> {
  final TextEditingController _noteController = TextEditingController();
  final TextEditingController _assigneeController = TextEditingController();
  bool _internal = false;
  final List<MessageAttachment> _attachments = <MessageAttachment>[];

  @override
  void didUpdateWidget(covariant _TicketDetailView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.ticket.id != widget.ticket.id) {
      _noteController.clear();
      _attachments.clear();
      _internal = false;
      _assigneeController.text = widget.ticket.assignedTo ?? '';
    }
  }

  @override
  void initState() {
    super.initState();
    _assigneeController.text = widget.ticket.assignedTo ?? '';
  }

  @override
  void dispose() {
    _noteController.dispose();
    _assigneeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat('MMM d, yyyy • HH:mm');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<SupportStatus>(
                      value: widget.ticket.status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: SupportStatus.values
                          .map((status) => DropdownMenuItem(
                                value: status,
                                child: Text(status.label),
                              ))
                          .toList(),
                      onChanged: (value) {
                        if (value != null) {
                          widget.onStatusChanged(value);
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _assigneeController,
                      decoration: const InputDecoration(labelText: 'Assign owner'),
                      onFieldSubmitted: widget.onAssign,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                widget.ticket.subject,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(widget.ticket.description),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: [
                  Chip(
                    avatar: const Icon(Icons.person_outline, size: 16),
                    label: Text(widget.ticket.contactName),
                  ),
                  Chip(
                    avatar: const Icon(Icons.email_outlined, size: 16),
                    label: Text(widget.ticket.contactEmail),
                  ),
                  Chip(
                    avatar: const Icon(Icons.language_outlined, size: 16),
                    label: Text(widget.ticket.channel.toUpperCase()),
                  ),
                  if (widget.ticket.slaDueAt != null)
                    Chip(
                      avatar: const Icon(Icons.timer_outlined, size: 16),
                      label: Text('SLA ${formatter.format(widget.ticket.slaDueAt!)}'),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: widget.ticket.tags.map((tag) => Chip(label: Text(tag))).toList(),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  FilledButton.tonal(
                    onPressed: widget.onEscalate,
                    child: const Text('Escalate priority'),
                  ),
                  const SizedBox(width: 12),
                  TextButton(
                    onPressed: widget.onDelete,
                    child: const Text('Delete ticket'),
                  ),
                ],
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              ...widget.ticket.updates.map(
                (update) => Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(update.author, style: const TextStyle(fontWeight: FontWeight.w600)),
                            Text(formatter.format(update.sentAt), style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(update.body),
                        if (update.attachments.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            children: update.attachments
                                .map(
                                  (attachment) => ActionChip(
                                    avatar: const Icon(Icons.link_outlined),
                                    label: Text(attachment.label),
                                    onPressed: () {},
                                  ),
                                )
                                .toList(),
                          ),
                        ],
                        if (update.internal)
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Chip(
                                avatar: const Icon(Icons.lock_outline, size: 16),
                                label: const Text('Internal note'),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      TextField(
                        controller: _noteController,
                        decoration: const InputDecoration(labelText: 'Add update'),
                        minLines: 2,
                        maxLines: 5,
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        children: _attachments
                            .map(
                              (attachment) => Chip(
                                label: Text(attachment.label),
                                onDeleted: () => setState(() => _attachments.remove(attachment)),
                              ),
                            )
                            .toList(),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          IconButton(
                            tooltip: 'Attach link',
                            onPressed: _openAttachmentDialog,
                            icon: const Icon(Icons.attach_file_outlined),
                          ),
                          const Spacer(),
                          Switch.adaptive(
                            value: _internal,
                            onChanged: (value) => setState(() => _internal = value),
                          ),
                          const Text('Internal'),
                          const SizedBox(width: 12),
                          FilledButton(
                            onPressed: _noteController.text.trim().isEmpty
                                ? null
                                : () {
                                    widget.onAddUpdate(
                                      _noteController.text.trim(),
                                      _internal,
                                      List<MessageAttachment>.from(_attachments),
                                    );
                                    setState(() {
                                      _noteController.clear();
                                      _attachments.clear();
                                      _internal = false;
                                    });
                                  },
                            child: const Text('Add update'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
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
      setState(() => _attachments.add(attachment));
    }
  }
}

class _CreateTicketSheet extends ConsumerStatefulWidget {
  const _CreateTicketSheet({required this.onCreated});

  final ValueChanged<SupportTicket> onCreated;

  @override
  ConsumerState<_CreateTicketSheet> createState() => _CreateTicketSheetState();
}

class _CreateTicketSheetState extends ConsumerState<_CreateTicketSheet> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _contactNameController = TextEditingController();
  final TextEditingController _contactEmailController = TextEditingController();
  final TextEditingController _tagsController = TextEditingController();
  SupportPriority _priority = SupportPriority.normal;
  SupportStatus _status = SupportStatus.open;
  DateTime? _slaDueAt;

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    _contactNameController.dispose();
    _contactEmailController.dispose();
    _tagsController.dispose();
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
                Text('Log new support ticket', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _subjectController,
                  decoration: const InputDecoration(labelText: 'Subject'),
                  validator: (value) => value == null || value.trim().isEmpty ? 'Subject required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(labelText: 'Description'),
                  minLines: 3,
                  maxLines: 6,
                  validator: (value) => value == null || value.trim().isEmpty ? 'Description required' : null,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<SupportPriority>(
                        value: _priority,
                        decoration: const InputDecoration(labelText: 'Priority'),
                        items: SupportPriority.values
                            .map(
                              (priority) => DropdownMenuItem(
                                value: priority,
                                child: Text(priority.name.toUpperCase()),
                              ),
                            )
                            .toList(),
                        onChanged: (value) => setState(() => _priority = value ?? SupportPriority.normal),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<SupportStatus>(
                        value: _status,
                        decoration: const InputDecoration(labelText: 'Initial status'),
                        items: SupportStatus.values
                            .map(
                              (status) => DropdownMenuItem(
                                value: status,
                                child: Text(status.label),
                              ),
                            )
                            .toList(),
                        onChanged: (value) => setState(() => _status = value ?? SupportStatus.open),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _contactNameController,
                  decoration: const InputDecoration(labelText: 'Requester name'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _contactEmailController,
                  decoration: const InputDecoration(labelText: 'Requester email'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _tagsController,
                  decoration: const InputDecoration(labelText: 'Tags (comma separated)'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _pickDueDate,
                        icon: const Icon(Icons.timer_outlined),
                        label: Text(
                          _slaDueAt == null
                              ? 'Set SLA due time'
                              : DateFormat('MMM d • HH:mm').format(_slaDueAt!),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton(
                    onPressed: _submit,
                    child: const Text('Create ticket'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _pickDueDate() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
    );
    if (date == null) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(now.add(const Duration(hours: 4))),
    );
    if (time == null) return;
    setState(() {
      _slaDueAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    final notifier = ref.read(supportTicketStoreProvider.notifier);
    final tags = _tagsController.text
        .split(',')
        .map((tag) => tag.trim())
        .where((tag) => tag.isNotEmpty)
        .toList();
    final ticket = notifier.buildTicket(
      subject: _subjectController.text.trim(),
      description: _descriptionController.text.trim(),
      priority: _priority,
      status: _status,
      contactName: _contactNameController.text.trim().isEmpty
          ? 'Unknown requester'
          : _contactNameController.text.trim(),
      contactEmail: _contactEmailController.text.trim(),
      tags: tags,
      slaDueAt: _slaDueAt,
    );
    widget.onCreated(ticket);
    Navigator.of(context).pop();
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
      title: const Text('Attach resource'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _labelController,
              decoration: const InputDecoration(labelText: 'Label'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _urlController,
              decoration: const InputDecoration(labelText: 'URL'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Required' : null,
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

class _NoTicketSelectedView extends StatelessWidget {
  const _NoTicketSelectedView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.support_agent_outlined, size: 72, color: Colors.blueGrey),
          SizedBox(height: 12),
          Text('Select a ticket to view its timeline'),
        ],
      ),
    );
  }
}
