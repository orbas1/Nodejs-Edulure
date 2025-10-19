import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/models/community_models.dart';
import '../core/state/community/community_controllers.dart';
import '../widgets/community_management_modals.dart';

class CommunityProfileScreen extends ConsumerStatefulWidget {
  const CommunityProfileScreen({super.key, required this.communityId});

  final String communityId;

  @override
  ConsumerState<CommunityProfileScreen> createState() => _CommunityProfileScreenState();
}

class _CommunityProfileScreenState extends ConsumerState<CommunityProfileScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Color _parseAccent(String hex) {
    final value = int.tryParse(hex.replaceAll('#', ''), radix: 16);
    if (value == null) return Colors.indigo.shade50;
    return Color(0xFF000000 | value).withOpacity(0.08);
  }

  @override
  Widget build(BuildContext context) {
    final communitiesAsync = ref.watch(communityDirectoryControllerProvider);

    return communitiesAsync.when(
      data: (communities) {
        CommunityModel? community;
        if (communities.isNotEmpty) {
          try {
            community = communities.firstWhere((element) => element.id == widget.communityId);
          } catch (_) {
            community = null;
          }
        }

        if (community == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Community')),
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.groups_outlined, size: 48),
                  SizedBox(height: 8),
                  Text('Community not found or has been archived'),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(community.name),
            actions: [
              IconButton(
                icon: const Icon(Icons.edit_outlined),
                tooltip: 'Edit community',
                onPressed: () => showCommunityEditor(
                  context: context,
                  ref: ref,
                  community: community,
                  onMessage: _showSnack,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.archive_outlined),
                tooltip: 'Archive community',
                onPressed: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (context) {
                      return AlertDialog(
                        title: const Text('Archive community'),
                        content: const Text(
                          'Archiving will remove this community from member discovery and clear scheduled rituals. Continue?',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(context).maybePop(false),
                            child: const Text('Cancel'),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.of(context).maybePop(true),
                            child: const Text('Archive'),
                          ),
                        ],
                      );
                    },
                  );
                  if (confirmed == true) {
                    await ref.read(communityDirectoryControllerProvider.notifier).deleteCommunity(community.id);
                    if (mounted) Navigator.of(context).maybePop();
                  }
                },
              ),
            ],
            bottom: TabBar(
              controller: _tabController,
              tabs: const [
                Tab(icon: Icon(Icons.insights_outlined), text: 'Overview'),
                Tab(icon: Icon(Icons.event_available_outlined), text: 'Events'),
                Tab(icon: Icon(Icons.people_alt_outlined), text: 'Members'),
              ],
            ),
          ),
          floatingActionButton: AnimatedBuilder(
            animation: _tabController.animation ?? _tabController,
            builder: (context, child) {
              switch (_tabController.index) {
                case 0:
                  return FloatingActionButton.extended(
                    onPressed: () => showCommunityEditor(
                      context: context,
                      ref: ref,
                      community: community,
                      onMessage: _showSnack,
                    ),
                    icon: const Icon(Icons.edit_outlined),
                    label: const Text('Edit community'),
                  );
                case 1:
                  return FloatingActionButton.extended(
                    onPressed: () => showCommunityEventPlanner(
                      context: context,
                      ref: ref,
                      community: community,
                      onMessage: _showSnack,
                    ),
                    icon: const Icon(Icons.event_available_outlined),
                    label: const Text('Add event'),
                  );
                case 2:
                  return FloatingActionButton.extended(
                    onPressed: () => showCommunityMemberInvite(
                      context: context,
                      ref: ref,
                      community: community,
                      onMessage: _showSnack,
                    ),
                    icon: const Icon(Icons.person_add_alt_1_outlined),
                    label: const Text('Invite member'),
                  );
                default:
                  return const SizedBox.shrink();
              }
            },
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildOverview(community),
              _buildEvents(community),
              _buildMembers(community),
            ],
          ),
        );
      },
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, stackTrace) => Scaffold(
        appBar: AppBar(title: const Text('Community')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 12),
              Text('$error', textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOverview(CommunityModel community) {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(
                aspectRatio: 16 / 7,
                child: Image.network(
                  community.bannerImage,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(color: Colors.grey.shade200),
                ),
              ),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      _parseAccent(community.accentColor),
                      Theme.of(context).colorScheme.primary.withOpacity(0.05),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      community.name,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(community.description, style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        Chip(
                          avatar: const Icon(Icons.people_outline, size: 18),
                          label: Text('${community.memberCount} members'),
                        ),
                        Chip(
                          avatar: const Icon(Icons.lock_outline, size: 18),
                          label: Text(community.isPrivate ? 'Private' : 'Public'),
                        ),
                        Chip(
                          avatar: const Icon(Icons.bolt_outlined, size: 18),
                          label: Text('${community.events.length} rituals scheduled'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (community.tags.isNotEmpty) ...[
                      Text('Focus tags', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: [
                          for (final tag in community.tags) Chip(label: Text('#$tag')),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (community.focusAreas.isNotEmpty) ...[
                      Text('Strategic programs', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: [
                          for (final focus in community.focusAreas)
                            Chip(
                              avatar: const Icon(Icons.auto_awesome_outlined, size: 18),
                              label: Text(focus),
                            ),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                    if ((community.guidelines ?? []).isNotEmpty) ...[
                      Text('Participation guidelines', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      for (final guideline in community.guidelines!)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.check_circle_outline),
                          title: Text(guideline),
                        ),
                      const SizedBox(height: 16),
                    ],
                    if (community.location != null && community.location!.isNotEmpty)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.public_outlined),
                        title: Text('Primary region'),
                        subtitle: Text(community.location!),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEvents(CommunityModel community) {
    final events = [...community.events]..sort((a, b) => a.start.compareTo(b.start));
    if (events.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.event_busy_outlined, size: 48),
            const SizedBox(height: 8),
            const Text('No rituals scheduled yet'),
          ],
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: events.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final event = events[index];
        return Card(
          child: ListTile(
            leading: event.coverImage != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      event.coverImage!,
                      width: 56,
                      height: 56,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return const Icon(Icons.event_available_outlined);
                      },
                    ),
                  )
                : const Icon(Icons.calendar_today_outlined),
            title: Text(event.title),
            subtitle: Text(
              '${DateFormat.yMMMd().add_jm().format(event.start)} · ${event.location}',
            ),
            trailing: PopupMenuButton<String>(
              onSelected: (value) async {
                switch (value) {
                  case 'edit':
                    await showCommunityEventPlanner(
                      context: context,
                      ref: ref,
                      community: community,
                      editing: event,
                      onMessage: _showSnack,
                    );
                    break;
                  case 'delete':
                    await ref
                        .read(communityDirectoryControllerProvider.notifier)
                        .removeEvent(community.id, event.id);
                    _showSnack('Event removed');
                    break;
                }
              },
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'edit', child: Text('Edit details')),
                PopupMenuItem(
                  value: 'delete',
                  child: Text('Delete event'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMembers(CommunityModel community) {
    final members = [...community.members]
      ..sort((a, b) => a.joinedAt.compareTo(b.joinedAt));
    if (members.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.person_search_outlined, size: 48),
            SizedBox(height: 8),
            Text('No members added yet'),
          ],
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: members.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final member = members[index];
        return Card(
          child: ListTile(
            leading: CircleAvatar(backgroundImage: NetworkImage(member.avatarUrl)),
            title: Text(member.name),
            subtitle: Text('${member.role} · Joined ${DateFormat.yMMMd().format(member.joinedAt)}'),
            trailing: PopupMenuButton<String>(
              onSelected: (value) async {
                switch (value) {
                  case 'edit':
                    await showCommunityMemberInvite(
                      context: context,
                      ref: ref,
                      community: community,
                      editing: member,
                      onMessage: _showSnack,
                    );
                    break;
                  case 'remove':
                    await ref
                        .read(communityDirectoryControllerProvider.notifier)
                        .removeMember(community.id, member.id);
                    _showSnack('${member.name} removed');
                    break;
                }
              },
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'edit', child: Text('Edit member')),
                PopupMenuItem(value: 'remove', child: Text('Remove from community')),
              ],
            ),
          ),
        );
      },
    );
  }
}
