import 'package:flutter/material.dart';

import '../services/mobile_creation_studio_service.dart';

class MobileCreationCompanionScreen extends StatefulWidget {
  const MobileCreationCompanionScreen({super.key});

  @override
  State<MobileCreationCompanionScreen> createState() => _MobileCreationCompanionScreenState();
}

class _MobileCreationCompanionScreenState extends State<MobileCreationCompanionScreen> {
  final MobileCreationStudioService _service = MobileCreationStudioService();
  final Set<String> _busyProjects = <String>{};

  List<CreationProject> _projects = const <CreationProject>[];
  List<CommunitySummary> _communities = const <CommunitySummary>[];
  bool _loading = false;
  String? _error;
  DateTime? _lastSyncedAt;
  _ProjectFilter _filter = _ProjectFilter.attention;

  @override
  void initState() {
    super.initState();
    _projects = _service.loadCachedProjects();
    _communities = _service.loadCachedCommunities();
    _lastSyncedAt = _service.loadLastProjectSync();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _service.syncPendingActions();
      if (!mounted) return;
      setState(() {
        _projects = _service.loadCachedProjects();
      });
      await Future.wait([_refresh(), _loadCommunities()]);
    });
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _service.syncPendingActions();
      final projects = await _service.fetchProjects();
      if (!mounted) return;
      setState(() {
        _projects = projects;
        _lastSyncedAt = DateTime.now();
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error is Exception ? error.toString() : 'Unable to load creation projects';
        _projects = _service.loadCachedProjects();
        _lastSyncedAt = _service.loadLastProjectSync();
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _loadCommunities() async {
    try {
      final communities = await _service.fetchCommunities();
      if (!mounted) return;
      setState(() {
        _communities = communities;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _communities = _service.loadCachedCommunities();
      });
    }
  }

  List<CreationProject> get _filteredProjects {
    final projects = _projects.where((project) {
      switch (_filter) {
        case _ProjectFilter.attention:
          return project.requiresAttention || project.pendingActions.isNotEmpty;
        case _ProjectFilter.inProgress:
          return project.status == 'draft' || project.status == 'ready_for_review' || project.status == 'in_review';
        case _ProjectFilter.published:
          return project.status == 'published';
        case _ProjectFilter.archived:
          return project.status == 'archived';
      }
    }).toList();

    projects.sort((a, b) {
      final aTime = a.updatedAt ?? a.syncedAt ?? a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bTime = b.updatedAt ?? b.syncedAt ?? b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bTime.compareTo(aTime);
    });
    return projects;
  }

  Future<void> _handleStatusChange(CreationProject project, String status, {String? note}) async {
    setState(() {
      _busyProjects.add(project.id);
    });
    try {
      final result = await _service.updateProjectStatus(project.id, status, note: note);
      if (!mounted) return;
      _replaceProject(result.project);
      _showSnack(result.message ?? (result.queued ? 'Status change queued for sync' : 'Status updated'));
    } catch (error) {
      if (!mounted) return;
      _showSnack(error is Exception ? error.toString() : 'Failed to update project');
    } finally {
      if (mounted) {
        setState(() {
          _busyProjects.remove(project.id);
        });
      }
    }
  }

  Future<void> _handleOutlineReview(
    CreationProject project,
    String outlineId,
    String status,
    StateSetter setModalState, {
    String? notes,
  }) async {
    setModalState(() {
      _busyProjects.add('${project.id}::$outlineId');
    });
    try {
      final result = await _service.recordOutlineReview(
        projectId: project.id,
        outlineId: outlineId,
        status: status,
        notes: notes,
      );
      if (!mounted) return;
      _replaceProject(result.project);
      setModalState(() {
        _busyProjects.remove('${project.id}::$outlineId');
      });
      _showSnack(result.message ?? (result.queued ? 'Review queued for sync' : 'Review recorded'));
    } catch (error) {
      if (!mounted) return;
      setModalState(() {
        _busyProjects.remove('${project.id}::$outlineId');
      });
      _showSnack(error is Exception ? error.toString() : 'Failed to record review');
    }
  }

  Future<void> _handleShare(
    CreationProject project,
    String communityId,
    String? communityName,
    String body,
    String? title,
    List<String> tags,
  ) async {
    setState(() {
      _busyProjects.add('${project.id}::share');
    });
    try {
      final result = await _service.shareProjectUpdateToCommunity(
        project: project,
        communityId: communityId,
        communityName: communityName,
        body: body,
        title: title,
        tags: tags,
      );
      if (!mounted) return;
      _replaceProject(result.project);
      _showSnack(result.message ?? (result.queued ? 'Post queued for sync' : 'Community update published'));
    } catch (error) {
      if (!mounted) return;
      _showSnack(error is Exception ? error.toString() : 'Failed to publish community update');
    } finally {
      if (mounted) {
        setState(() {
          _busyProjects.remove('${project.id}::share');
        });
      }
    }
  }

  void _replaceProject(CreationProject project) {
    final next = [..._projects];
    final index = next.indexWhere((item) => item.id == project.id);
    if (index >= 0) {
      next[index] = project;
    } else {
      next.add(project);
    }
    setState(() {
      _projects = next;
    });
  }

  String _syncLabel() {
    if (_lastSyncedAt == null) {
      return 'Showing cached projects';
    }
    final difference = DateTime.now().difference(_lastSyncedAt!);
    if (difference.inMinutes < 1) {
      return 'Synced just now';
    }
    if (difference.inMinutes < 60) {
      return 'Synced ${difference.inMinutes} minute${difference.inMinutes == 1 ? '' : 's'} ago';
    }
    if (difference.inHours < 24) {
      return 'Synced ${difference.inHours} hour${difference.inHours == 1 ? '' : 's'} ago';
    }
    final date = _lastSyncedAt!.toLocal().toString().split('.').first;
    return 'Last synced $date';
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<String?> _promptForNote({required String title, String? hint}) async {
    final controller = TextEditingController();
    final result = await showDialog<String?>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(title),
          content: TextField(
            controller: controller,
            minLines: 2,
            maxLines: 4,
            decoration: InputDecoration(hintText: hint ?? 'Add reviewer notes'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(null),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(controller.text.trim()),
              child: const Text('Submit'),
            ),
          ],
        );
      },
    );
    controller.dispose();
    if (result == null || result.trim().isEmpty) {
      return null;
    }
    return result.trim();
  }

  void _openProjectDetail(CreationProject project) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        CreationProject current = project;
        final busyOutline = <String>{};
        return StatefulBuilder(
          builder: (context, setModalState) {
            final reviews = current.outlineReviews();
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    current.title,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Status: ${_humaniseStatus(current.status)}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  if (current.summary != null && current.summary!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(current.summary!, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                  const SizedBox(height: 16),
                  _PendingActionStrip(actions: current.pendingActions),
                  const SizedBox(height: 16),
                  Text('Outline review', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  _OutlineList(
                    outline: current.contentOutline,
                    reviews: reviews,
                    onAction: (outlineId, status) async {
                      final note = status == 'needs_revision'
                          ? await _promptForNote(title: 'Request revisions', hint: 'Explain what needs to change')
                          : null;
                      await _handleOutlineReview(
                        current,
                        outlineId,
                        status,
                        setModalState,
                        notes: note,
                      );
                      current = _projects.firstWhere((element) => element.id == current.id, orElse: () => current);
                      setModalState(() {});
                    },
                    busyOutline: busyOutline,
                    toggleBusy: (outlineId, active) => setModalState(() {
                      if (active) {
                        busyOutline.add(outlineId);
                      } else {
                        busyOutline.remove(outlineId);
                      }
                    }),
                  ),
                  const SizedBox(height: 24),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: FilledButton.icon(
                      onPressed: _busyProjects.contains('${project.id}::share')
                          ? null
                          : () async {
                              final updated = await _openShareDialog(current);
                              if (updated != null) {
                                current = updated;
                                setModalState(() {});
                              }
                            },
                      icon: const Icon(Icons.campaign_outlined),
                      label: const Text('Share update'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<CreationProject?> _openShareDialog(CreationProject project) async {
    if (_communities.isEmpty) {
      await _loadCommunities();
      if (!mounted) return null;
    }
    final communities = List<CommunitySummary>.from(_communities);
    if (communities.isEmpty) {
      _showSnack('Join a community to share updates');
      return null;
    }

    String selectedCommunity = communities.first.id;
    final bodyController = TextEditingController(text: project.summary?.trim().isNotEmpty ?? false ? project.summary : 'Project ${project.title} ready for review. Highlights and next steps attached.');
    final tagsController = TextEditingController(text: project.deriveSuggestedTags(limit: 5).join(', '));

    final result = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Share with community'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DropdownButtonFormField<String>(
                value: selectedCommunity,
                decoration: const InputDecoration(labelText: 'Community'),
                items: communities
                    .map(
                      (community) => DropdownMenuItem<String>(
                        value: community.id,
                        child: Text('${community.name} (${community.memberCount} members)'),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value == null) return;
                  selectedCommunity = value;
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: bodyController,
                minLines: 3,
                maxLines: 5,
                decoration: const InputDecoration(labelText: 'Message'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: tagsController,
                decoration: const InputDecoration(
                  labelText: 'Tags (comma separated)',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Share'),
            ),
          ],
        );
      },
    );

    if (result != true) {
      bodyController.dispose();
      tagsController.dispose();
      return null;
    }

    FocusScope.of(context).unfocus();
    final trimmedBody = bodyController.text.trim();
    if (trimmedBody.length < 10) {
      _showSnack('Share message should summarise the update (min 10 characters).');
      bodyController.dispose();
      tagsController.dispose();
      return null;
    }

    final tags = tagsController.text
        .split(',')
        .map((tag) => tag.trim())
        .where((tag) => tag.isNotEmpty)
        .toSet()
        .take(8)
        .toList();
    final community = communities.firstWhere(
      (element) => element.id == selectedCommunity,
      orElse: () => communities.first,
    );
    await _handleShare(
      project,
      selectedCommunity,
      community.name,
      trimmedBody,
      project.title,
      tags,
    );
    final updated = _projects.firstWhere((element) => element.id == project.id, orElse: () => project);
    bodyController.dispose();
    tagsController.dispose();
    return updated;
  }

  Color _statusColor(String status, ThemeData theme) {
    switch (status) {
      case 'approved':
      case 'published':
        return Colors.green.shade600;
      case 'ready_for_review':
      case 'in_review':
        return Colors.orange.shade700;
      case 'changes_requested':
        return Colors.red.shade700;
      case 'archived':
        return theme.colorScheme.outline;
      default:
        return theme.colorScheme.primary;
    }
  }

  String _humaniseStatus(String status) {
    return status
        .split('_')
        .map((part) => part.isEmpty ? part : part[0].toUpperCase() + part.substring(1))
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final projects = _filteredProjects;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Creation companion'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : _refresh,
            icon: const Icon(Icons.refresh),
          )
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
            children: [
              Text(
                'Mobile creation companion',
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'Review projects, approve assets, and keep communities in the loop when you are away from the studio.',
                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600),
              ),
              const SizedBox(height: 12),
              Text(
                _syncLabel(),
                style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
              ),
              const SizedBox(height: 16),
              SegmentedButton<_ProjectFilter>(
                segments: _ProjectFilter.values
                    .map(
                      (filter) => ButtonSegment<_ProjectFilter>(
                        value: filter,
                        label: Text(filter.label),
                        icon: Icon(filter.icon),
                      ),
                    )
                    .toList(),
                selected: <_ProjectFilter>{_filter},
                onSelectionChanged: (selection) {
                  if (selection.isEmpty) {
                    return;
                  }
                  setState(() {
                    _filter = selection.first;
                  });
                },
              ),
              const SizedBox(height: 20),
              if (_error != null)
                _ErrorBanner(
                  message: _error!,
                  onRetry: _refresh,
                ),
              if (_loading && projects.isEmpty)
                const SizedBox(
                  height: 280,
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (projects.isEmpty)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.blueGrey.shade50,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.blueGrey.shade100),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Nothing to review right now',
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Text(
                        'Create projects from the studio or invite collaborators to assign tasks. Updates will appear here automatically.',
                        style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600),
                      ),
                    ],
                  ),
                )
              else
                ...projects.map((project) => _ProjectCard(
                      project: project,
                      busy: _busyProjects.contains(project.id) ||
                          _busyProjects.any((entry) => entry.startsWith('${project.id}::')),
                      onApprove: () => _handleStatusChange(project, 'approved'),
                      onRequestChanges: () async {
                        final note = await _promptForNote(
                          title: 'Request changes',
                          hint: 'Share context for the collaborator',
                        );
                        if (note == null) return;
                        await _handleStatusChange(project, 'changes_requested', note: note);
                      },
                      onOpenDetail: () => _openProjectDetail(project),
                      statusColor: _statusColor(project.status, theme),
                      onShare: () async {
                        final updated = await _openShareDialog(project);
                        if (updated != null && mounted) {
                          _replaceProject(updated);
                        }
                      },
                    )),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({
    required this.project,
    required this.busy,
    required this.onApprove,
    required this.onRequestChanges,
    required this.onOpenDetail,
    required this.statusColor,
    required this.onShare,
  });

  final CreationProject project;
  final bool busy;
  final VoidCallback onApprove;
  final VoidCallback onRequestChanges;
  final VoidCallback onOpenDetail;
  final VoidCallback onShare;
  final Color statusColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pending = project.pendingActions;
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 0,
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(project.type.toUpperCase(),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.blue.shade700,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.6,
                      )),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    project.status.replaceAll('_', ' '),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: statusColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const Spacer(),
                IconButton(
                  tooltip: 'View details',
                  onPressed: onOpenDetail,
                  icon: const Icon(Icons.open_in_new),
                )
              ],
            ),
            const SizedBox(height: 12),
            Text(project.title, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            if (project.summary != null && project.summary!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(project.summary!, style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600)),
            ],
            if (project.publishingChannels.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: project.publishingChannels
                    .map((channel) => Chip(
                          label: Text(channel),
                          backgroundColor: Colors.blueGrey.shade50,
                        ))
                    .toList(),
              ),
            ],
            if (pending.isNotEmpty) ...[
              const SizedBox(height: 12),
              _PendingActionStrip(actions: pending),
            ],
            const SizedBox(height: 12),
            ButtonBar(
              alignment: MainAxisAlignment.start,
              children: [
                if (project.requiresAttention)
                  FilledButton.icon(
                    onPressed: busy ? null : onApprove,
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Approve'),
                  ),
                if (project.requiresAttention)
                  OutlinedButton.icon(
                    onPressed: busy ? null : onRequestChanges,
                    icon: const Icon(Icons.edit_note_outlined),
                    label: const Text('Request changes'),
                  ),
                TextButton.icon(
                  onPressed: onOpenDetail,
                  icon: const Icon(Icons.fact_check_outlined),
                  label: const Text('Inspect outline'),
                ),
                IconButton(
                  tooltip: 'Share update',
                  onPressed: busy ? null : onShare,
                  icon: const Icon(Icons.campaign_outlined),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _OutlineList extends StatelessWidget {
  const _OutlineList({
    required this.outline,
    required this.reviews,
    required this.onAction,
    required this.busyOutline,
    required this.toggleBusy,
  });

  final List<CreationOutlineItem> outline;
  final Map<String, CreationOutlineReview> reviews;
  final Future<void> Function(String outlineId, String status) onAction;
  final Set<String> busyOutline;
  final void Function(String outlineId, bool active) toggleBusy;

  @override
  Widget build(BuildContext context) {
    if (outline.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.blueGrey.shade50,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.blueGrey.shade100),
        ),
        child: Text(
          'No outline steps provided. Use the studio to add curriculum milestones.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600),
        ),
      );
    }
    return Column(
      children: outline
          .map(
            (item) => _OutlineTile(
              item: item,
              reviews: reviews,
              onAction: onAction,
              busyOutline: busyOutline,
              toggleBusy: toggleBusy,
              depth: 0,
            ),
          )
          .toList(),
    );
  }
}

class _OutlineTile extends StatelessWidget {
  const _OutlineTile({
    required this.item,
    required this.reviews,
    required this.onAction,
    required this.busyOutline,
    required this.toggleBusy,
    required this.depth,
  });

  final CreationOutlineItem item;
  final Map<String, CreationOutlineReview> reviews;
  final Future<void> Function(String outlineId, String status) onAction;
  final Set<String> busyOutline;
  final void Function(String outlineId, bool active) toggleBusy;
  final int depth;

  @override
  Widget build(BuildContext context) {
    final review = reviews[item.id];
    final status = review?.status ?? 'pending';
    final isBusy = busyOutline.contains(item.id);
    final theme = Theme.of(context);
    final color = _outlineStatusColor(status, theme);
    return Container(
      margin: EdgeInsets.only(left: depth * 16.0, bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blueGrey.shade100),
        boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  item.label,
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              PopupMenuButton<String>(
                enabled: !isBusy,
                tooltip: 'Update status',
                onSelected: (value) async {
                  toggleBusy(item.id, true);
                  try {
                    await onAction(item.id, value);
                  } finally {
                    toggleBusy(item.id, false);
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'approved', child: Text('Mark as approved')),
                  const PopupMenuItem(value: 'needs_revision', child: Text('Needs revision')),
                  const PopupMenuItem(value: 'flagged', child: Text('Flag for review')),
                ],
                child: Chip(
                  label: Text(status.replaceAll('_', ' ')),
                  backgroundColor: color.withOpacity(0.12),
                  labelStyle: theme.textTheme.labelSmall?.copyWith(color: color, fontWeight: FontWeight.w600),
                ),
              ),
              if (isBusy) ...[
                const SizedBox(width: 8),
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ]
            ],
          ),
          if (item.description != null && item.description!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(item.description!, style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600)),
          ],
          if (item.durationMinutes != null) ...[
            const SizedBox(height: 6),
            Text('Estimated ${item.durationMinutes} minutes',
                style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade500)),
          ],
          if (review?.notes != null && review!.notes!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('Notes: ${review.notes}', style: theme.textTheme.bodySmall),
          ],
          if (item.children.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Column(
                children: item.children
                    .map((child) => _OutlineTile(
                          item: child,
                          reviews: reviews,
                          onAction: onAction,
                          busyOutline: busyOutline,
                          toggleBusy: toggleBusy,
                          depth: depth + 1,
                        ))
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }

  Color _outlineStatusColor(String status, ThemeData theme) {
    switch (status) {
      case 'approved':
        return Colors.green.shade600;
      case 'needs_revision':
        return Colors.red.shade700;
      case 'flagged':
        return Colors.orange.shade700;
      default:
        return theme.colorScheme.primary;
    }
  }
}

class _PendingActionStrip extends StatelessWidget {
  const _PendingActionStrip({required this.actions});

  final List<PendingCreationAction> actions;

  @override
  Widget build(BuildContext context) {
    if (actions.isEmpty) {
      return const SizedBox.shrink();
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: actions
          .map(
            (action) => Chip(
              avatar: Icon(
                action.status == PendingCreationActionStatus.failed ? Icons.warning_amber : Icons.cloud_sync,
                size: 18,
                color: action.status == PendingCreationActionStatus.failed
                    ? Colors.red.shade700
                    : Colors.blue.shade700,
              ),
              label: Text(
                action.status == PendingCreationActionStatus.failed
                    ? 'Failed: ${action.description}'
                    : 'Queued: ${action.description}',
              ),
              backgroundColor: action.status == PendingCreationActionStatus.failed
                  ? Colors.red.shade50
                  : Colors.blue.shade50,
              labelStyle: TextStyle(
                color: action.status == PendingCreationActionStatus.failed
                    ? Colors.red.shade700
                    : Colors.blue.shade700,
              ),
            ),
          )
          .toList(),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('We could not refresh projects',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: Colors.red.shade700,
              )),
          const SizedBox(height: 6),
          Text(message, style: theme.textTheme.bodySmall?.copyWith(color: Colors.red.shade700)),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

enum _ProjectFilter { attention, inProgress, published, archived }

extension on _ProjectFilter {
  String get label {
    switch (this) {
      case _ProjectFilter.attention:
        return 'Needs action';
      case _ProjectFilter.inProgress:
        return 'In progress';
      case _ProjectFilter.published:
        return 'Published';
      case _ProjectFilter.archived:
        return 'Archived';
    }
  }

  IconData get icon {
    switch (this) {
      case _ProjectFilter.attention:
        return Icons.flag_outlined;
      case _ProjectFilter.inProgress:
        return Icons.playlist_add_check_outlined;
      case _ProjectFilter.published:
        return Icons.check_circle_outline;
      case _ProjectFilter.archived:
        return Icons.inventory_2_outlined;
    }
  }
}
