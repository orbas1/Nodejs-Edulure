import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/models/community_models.dart';
import '../core/state/community/community_controllers.dart';
import '../widgets/community_management_modals.dart';
import 'community_profile_screen.dart';
import 'community_switcher_screen.dart';

enum CommunityDirectoryFilter { joined, all, private }

class CommunitiesScreen extends ConsumerStatefulWidget {
  const CommunitiesScreen({super.key});

  @override
  ConsumerState<CommunitiesScreen> createState() => _CommunitiesScreenState();
}

class _CommunitiesScreenState extends ConsumerState<CommunitiesScreen> {
  final TextEditingController _searchController = TextEditingController();
  CommunityDirectoryFilter _filter = CommunityDirectoryFilter.joined;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  void _openSwitcher() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const CommunitySwitcherScreen(),
      ),
    );
  }

  List<CommunityModel> _filterCommunities(List<CommunityModel> communities) {
    final search = _searchController.text.trim().toLowerCase();
    return communities.where((community) {
      if (_filter == CommunityDirectoryFilter.joined && !community.joined) {
        return false;
      }
      if (_filter == CommunityDirectoryFilter.private && !community.isPrivate) {
        return false;
      }
      if (search.isEmpty) return true;
      final haystack = [
        community.name.toLowerCase(),
        community.description.toLowerCase(),
        ...community.tags.map((tag) => tag.toLowerCase()),
      ];
      return haystack.any((entry) => entry.contains(search));
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final communitiesAsync = ref.watch(communityDirectoryControllerProvider);
    final activeCommunityId = ref.watch(activeCommunityProvider);
    final feedAsync = ref.watch(communityFeedControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Communities'),
        actions: [
          IconButton(
            icon: const Icon(Icons.cached_outlined),
            tooltip: 'Switch community',
            onPressed: _openSwitcher,
          ),
          IconButton(
            icon: const Icon(Icons.add_home_work_outlined),
            tooltip: 'Create community',
            onPressed: () => showCommunityEditor(
              context: context,
              ref: ref,
              onMessage: _showSnack,
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showCommunityEditor(
          context: context,
          ref: ref,
          onMessage: _showSnack,
        ),
        icon: const Icon(Icons.add_chart_outlined),
        label: const Text('New community'),
      ),
      body: communitiesAsync.when(
        data: (communities) {
          final filtered = _filterCommunities(communities);
          CommunityModel? activeCommunity;
          if (communities.isNotEmpty) {
            if (activeCommunityId == null) {
              activeCommunity = communities.first;
            } else {
              activeCommunity = communities.firstWhere(
                (element) => element.id == activeCommunityId,
                orElse: () => communities.first,
              );
            }
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (activeCommunity != null)
                _ActiveCommunityHeader(
                  community: activeCommunity,
                  onOpenProfile: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => CommunityProfileScreen(communityId: activeCommunity.id),
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              TextField(
                controller: _searchController,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search),
                  hintText: 'Search communities, tags or focus areas',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 12),
              SegmentedButton<CommunityDirectoryFilter>(
                segments: const [
                  ButtonSegment<CommunityDirectoryFilter>(
                    value: CommunityDirectoryFilter.joined,
                    label: Text('Joined'),
                    icon: Icon(Icons.favorite_outline),
                  ),
                  ButtonSegment<CommunityDirectoryFilter>(
                    value: CommunityDirectoryFilter.all,
                    label: Text('All'),
                    icon: Icon(Icons.public),
                  ),
                  ButtonSegment<CommunityDirectoryFilter>(
                    value: CommunityDirectoryFilter.private,
                    label: Text('Private'),
                    icon: Icon(Icons.lock_outline),
                  ),
                ],
                selected: {_filter},
                onSelectionChanged: (selection) {
                  setState(() {
                    _filter = selection.first;
                  });
                },
              ),
              const SizedBox(height: 20),
              if (filtered.isEmpty)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Theme.of(context).colorScheme.primary.withOpacity(0.1)),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.sentiment_satisfied_alt_outlined, size: 48),
                      const SizedBox(height: 12),
                      Text(
                        'No communities match your filters',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      const Text('Adjust filters or create a new space to get started.'),
                    ],
                  ),
                ),
              for (final community in filtered)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: _CommunityCard(
                    community: community,
                    onJoinToggle: (value) async {
                      await ref
                          .read(communityDirectoryControllerProvider.notifier)
                          .toggleMembership(community.id, value);
                      _showSnack(
                        value ? 'Welcome to ${community.name}!' : 'You have left ${community.name}.',
                      );
                    },
                    onOpenProfile: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => CommunityProfileScreen(communityId: community.id),
                      ),
                    ),
                    onScheduleEvent: () => showCommunityEventPlanner(
                      context: context,
                      ref: ref,
                      community: community,
                      onMessage: _showSnack,
                    ),
                    onInviteMember: () => showCommunityMemberInvite(
                      context: context,
                      ref: ref,
                      community: community,
                      onMessage: _showSnack,
                    ),
                    onEdit: () => showCommunityEditor(
                      context: context,
                      ref: ref,
                      community: community,
                      onMessage: _showSnack,
                    ),
                    onDelete: () async {
                      final confirmed = await showDialog<bool>(
                        context: context,
                        builder: (context) {
                          return AlertDialog(
                            title: const Text('Archive community'),
                            content: Text('This will remove ${community.name} from the directory for everyone.'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.of(context).maybePop(false),
                                child: const Text('Cancel'),
                              ),
                              FilledButton(
                                onPressed: () => Navigator.of(context).maybePop(true),
                                child: const Text('Archive'),
                              )
                            ],
                          );
                        },
                      );
                      if (confirmed == true) {
                        await ref
                            .read(communityDirectoryControllerProvider.notifier)
                            .deleteCommunity(community.id);
                        _showSnack('${community.name} has been archived.');
                      }
                    },
                    onRemoveEvent: (eventId) async {
                      await ref
                          .read(communityDirectoryControllerProvider.notifier)
                          .removeEvent(community.id, eventId);
                    },
                  ),
                ),
              const SizedBox(height: 12),
              if (feedAsync.hasValue && feedAsync.value!.isNotEmpty)
                _FeedPreview(posts: feedAsync.value!.take(3).toList()),
              const SizedBox(height: 80),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48),
                const SizedBox(height: 12),
                Text('Unable to load communities', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Text('$error', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () =>
                      ref.read(communityDirectoryControllerProvider.notifier).refreshDirectory(),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ActiveCommunityHeader extends StatelessWidget {
  const _ActiveCommunityHeader({
    required this.community,
    required this.onOpenProfile,
  });

  final CommunityModel community;
  final VoidCallback onOpenProfile;

  Color _parseAccent(String hex) {
    final value = int.tryParse(hex.replaceAll('#', ''), radix: 16);
    if (value == null) return Colors.indigo.shade50;
    return Color(0xFF000000 | value).withOpacity(0.12);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          colors: [
            _parseAccent(community.accentColor),
            Theme.of(context).colorScheme.primary.withOpacity(0.05),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Active community',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(color: Theme.of(context).colorScheme.primary),
          ),
          const SizedBox(height: 8),
          Text(
            community.name,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            community.description,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              Chip(label: Text('${community.memberCount} members')),
              Chip(label: Text('${community.events.length} rituals scheduled')),
              Chip(label: Text(community.isPrivate ? 'Private' : 'Open')), 
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              FilledButton.icon(
                onPressed: onOpenProfile,
                icon: const Icon(Icons.dashboard_customize_outlined),
                label: const Text('Open community workspace'),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => CommunitySwitcherScreen(initialCommunityId: community.id),
                  ),
                ),
                icon: const Icon(Icons.swap_horiz_rounded),
                label: const Text('Switch'),
              ),
            ],
          )
        ],
      ),
    );
  }
}

class _CommunityCard extends StatelessWidget {
  const _CommunityCard({
    required this.community,
    required this.onJoinToggle,
    required this.onOpenProfile,
    required this.onScheduleEvent,
    required this.onInviteMember,
    required this.onEdit,
    required this.onDelete,
    required this.onRemoveEvent,
  });

  final CommunityModel community;
  final ValueChanged<bool> onJoinToggle;
  final VoidCallback onOpenProfile;
  final VoidCallback onScheduleEvent;
  final VoidCallback onInviteMember;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final ValueChanged<String> onRemoveEvent;

  Color _parseAccent(String hex) {
    final value = int.tryParse(hex.replaceAll('#', ''), radix: 16);
    if (value == null) return Colors.indigo.shade50;
    return Color(0xFF000000 | value).withOpacity(0.08);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        color: _parseAccent(community.accentColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(28),
              topRight: Radius.circular(28),
            ),
            child: AspectRatio(
              aspectRatio: 16 / 6,
              child: Image.network(
                community.bannerImage,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(color: Colors.grey.shade200),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            community.name,
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 6),
                          Text(community.description),
                        ],
                      ),
                    ),
                    Column(
                      children: [
                        Switch.adaptive(
                          value: community.joined,
                          onChanged: onJoinToggle,
                        ),
                        const SizedBox(height: 4),
                        Text(community.joined ? 'Joined' : 'Join',
                            style: Theme.of(context).textTheme.labelMedium),
                      ],
                    ),
                    PopupMenuButton<String>(
                      onSelected: (value) {
                        switch (value) {
                          case 'edit':
                            onEdit();
                            break;
                          case 'delete':
                            onDelete();
                            break;
                        }
                      },
                      itemBuilder: (context) => const [
                        PopupMenuItem(value: 'edit', child: ListTile(leading: Icon(Icons.edit_outlined), title: Text('Edit'))),
                        PopupMenuItem(
                          value: 'delete',
                          child: ListTile(leading: Icon(Icons.archive_outlined), title: Text('Archive')),
                        ),
                      ],
                    )
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final tag in community.tags) Chip(label: Text('#$tag')),
                    for (final focus in community.focusAreas)
                      Chip(
                        avatar: const Icon(Icons.bolt, size: 18),
                        label: Text(focus),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Community health', style: Theme.of(context).textTheme.labelLarge),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.people_alt_outlined, size: 18),
                              const SizedBox(width: 6),
                              Text('${community.memberCount} members'),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.event_available_outlined, size: 18),
                              const SizedBox(width: 6),
                              Text('${community.events.length} rituals upcoming'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    FilledButton.icon(
                      onPressed: onOpenProfile,
                      icon: const Icon(Icons.dashboard_outlined),
                      label: const Text('Open profile'),
                    ),
                    const SizedBox(width: 12),
                    OutlinedButton.icon(
                      onPressed: onScheduleEvent,
                      icon: const Icon(Icons.event_note_outlined),
                      label: const Text('Schedule ritual'),
                    ),
                    const SizedBox(width: 12),
                    TextButton.icon(
                      onPressed: onInviteMember,
                      icon: const Icon(Icons.mail_outline),
                      label: const Text('Invite member'),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                if (community.events.isNotEmpty)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Upcoming rituals', style: Theme.of(context).textTheme.labelMedium),
                      const SizedBox(height: 12),
                      for (final event in community.events.take(3))
                        Card(
                          child: ListTile(
                            leading: const Icon(Icons.calendar_month_outlined),
                            title: Text(event.title),
                            subtitle: Text('${DateFormat.MMMd().add_jm().format(event.start)} · ${event.location}'),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete_outline),
                              onPressed: () => onRemoveEvent(event.id),
                            ),
                          ),
                        ),
                    ],
                  ),
                if (community.members.isNotEmpty)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 12),
                      Text('Core operators', style: Theme.of(context).textTheme.labelMedium),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 12,
                        children: [
                          for (final member in community.members.take(6))
                            Chip(
                              avatar: CircleAvatar(backgroundImage: NetworkImage(member.avatarUrl)),
                              label: Text(member.name),
                            ),
                        ],
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeedPreview extends StatelessWidget {
  const _FeedPreview({required this.posts});

  final List<FeedPost> posts;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Live feed spotlight', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        for (final post in posts)
          Card(
            child: ListTile(
              leading: CircleAvatar(backgroundImage: NetworkImage(post.authorAvatar)),
              title: Text(post.authorName),
              subtitle: Text(post.message, maxLines: 2, overflow: TextOverflow.ellipsis),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.favorite_outline, size: 20),
                  Text('${post.reactionCount}')
                ],
              ),
            ),
          )
      ],
    );
  }
}
