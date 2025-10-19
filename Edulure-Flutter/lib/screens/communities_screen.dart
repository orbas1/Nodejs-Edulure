import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../provider/community/communities_controller.dart';
import '../provider/feed/live_feed_controller.dart';
import '../services/community_service.dart';
import '../widgets/community_switcher_sheet.dart';
import '../widgets/feed_entry_card.dart';

class CommunitiesScreen extends ConsumerStatefulWidget {
  const CommunitiesScreen({super.key});

  @override
  ConsumerState<CommunitiesScreen> createState() => _CommunitiesScreenState();
}

class _CommunitiesScreenState extends ConsumerState<CommunitiesScreen> {
  String _filter = 'all';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      await ref.read(communitiesControllerProvider.notifier).refresh();
      await ref.read(liveFeedControllerProvider.notifier).bootstrap();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final communitiesState = ref.watch(communitiesControllerProvider);
    final feedState = ref.watch(liveFeedControllerProvider);
    final communities = _applyFilters(communitiesState.communities);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Communities'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(communitiesControllerProvider.notifier).refresh(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => CommunitySwitcherSheet.show(context),
        icon: const Icon(Icons.groups_2_outlined),
        label: const Text('Switch'),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(communitiesControllerProvider.notifier).refresh(),
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.all(20),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _buildHero(context, communitiesState.communities),
                  const SizedBox(height: 24),
                  _buildFilterBar(context),
                  const SizedBox(height: 24),
                  _buildActionRow(context),
                  const SizedBox(height: 24),
                  Text('Your communities', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  if (communitiesState.loading)
                    const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
                  else if (communities.isEmpty)
                    _buildEmptyState(context)
                  else
                    Column(
                      children: communities
                          .map((community) => Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: _CommunityCard(
                                  community: community,
                                  onOpen: () => Navigator.of(context).pushNamed(
                                    '/communities/profile',
                                    arguments: community.id,
                                  ),
                                  onJoin: () => ref
                                      .read(communitiesControllerProvider.notifier)
                                      .joinCommunity(community.id),
                                  onLeave: community.permissions.canLeave
                                      ? () => ref
                                          .read(communitiesControllerProvider.notifier)
                                          .leaveCommunity(community.id)
                                      : null,
                                ),
                              ))
                          .toList(),
                    ),
                  const SizedBox(height: 32),
                  Text('Live feed preview', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  ...feedState.entries.take(3).map(
                        (entry) => Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: FeedEntryCard(
                            entry: entry,
                            showCommunity: true,
                            onViewCommunity: entry.post?.community != null
                                ? () => Navigator.of(context).pushNamed(
                                      '/communities/profile',
                                      arguments: entry.post!.community!.id,
                                    )
                                : null,
                          ),
                        ),
                      ),
                  if (feedState.entries.isEmpty)
                    const Text('No posts available yet. Join communities to see activity.'),
                  const SizedBox(height: 48),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHero(BuildContext context, List<CommunitySummary> communities) {
    final memberCount = communities.fold<int>(0, (sum, community) => sum + community.stats.members);
    final active = communities.where((community) => community.membership?.status == 'active').length;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          colors: [Theme.of(context).colorScheme.primary.withOpacity(0.12), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Chip(
            avatar: const Icon(Icons.handshake_outlined),
            label: Text('${communities.length} communities connected'),
          ),
          const SizedBox(height: 16),
          Text(
            'Nurture your learning networks',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'Collaborate across programmes, automate engagement, and celebrate member momentum.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.4),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _HeroMetric(value: active.toString(), label: 'Active memberships'),
              _HeroMetric(value: memberCount.toString(), label: 'Members represented'),
              _HeroMetric(value: '${communities.length}', label: 'Communities joined'),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildFilterBar(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: 'Search communities',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: _searchController.text.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _searchController.clear();
                      setState(() {});
                    },
                  ),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children: [
            ChoiceChip(
              label: const Text('All'),
              selected: _filter == 'all',
              onSelected: (_) => setState(() => _filter = 'all'),
            ),
            ChoiceChip(
              label: const Text('Joined'),
              selected: _filter == 'joined',
              onSelected: (_) => setState(() => _filter = 'joined'),
            ),
            ChoiceChip(
              label: const Text('Moderating'),
              selected: _filter == 'moderating',
              onSelected: (_) => setState(() => _filter = 'moderating'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionRow(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        FilledButton.icon(
          onPressed: () => CommunitySwitcherSheet.show(context),
          icon: const Icon(Icons.explore_outlined),
          label: const Text('Explore network'),
        ),
        FilledButton.tonal(
          onPressed: () => Navigator.of(context).pushNamed('/feed'),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.dynamic_feed_outlined),
              SizedBox(width: 8),
              Text('Open live feed'),
            ],
          ),
        ),
        OutlinedButton.icon(
          onPressed: () => Navigator.of(context).pushNamed('/dashboard/community'),
          icon: const Icon(Icons.analytics_outlined),
          label: const Text('Community analytics'),
        ),
        OutlinedButton.icon(
          onPressed: () => Navigator.of(context).pushNamed('/community/hub'),
          icon: const Icon(Icons.workspace_premium_outlined),
          label: const Text('Engagement hub'),
        ),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('No communities yet', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          const Text('Use the switcher to join or create your first community.'),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () => CommunitySwitcherSheet.show(context),
            child: const Text('Discover communities'),
          ),
        ],
      ),
    );
  }

  List<CommunitySummary> _applyFilters(List<CommunitySummary> input) {
    final query = _searchController.text.trim().toLowerCase();
    return input.where((community) {
      final matchesQuery = query.isEmpty ||
          community.name.toLowerCase().contains(query) ||
          (community.description ?? '').toLowerCase().contains(query);
      final membership = community.membership;
      final matchesFilter = switch (_filter) {
        'joined' => membership?.status == 'active',
        'moderating' => membership?.status == 'active' &&
            (membership?.role == 'owner' || membership?.role == 'admin' || membership?.role == 'moderator'),
        _ => true,
      };
      return matchesQuery && matchesFilter;
    }).toList();
  }
}

class _HeroMetric extends StatelessWidget {
  const _HeroMetric({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
        ],
      ),
    );
  }
}

class _CommunityCard extends StatelessWidget {
  const _CommunityCard({
    required this.community,
    required this.onOpen,
    required this.onJoin,
    this.onLeave,
  });

  final CommunitySummary community;
  final VoidCallback onOpen;
  final VoidCallback onJoin;
  final VoidCallback? onLeave;

  @override
  Widget build(BuildContext context) {
    final membership = community.membership;
    final isMember = membership?.status == 'active';
    return InkWell(
      onTap: onOpen,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.12),
                  child: Text(community.name.characters.first.toUpperCase()),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(community.name,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(
                        '${community.stats.members} members • ${community.stats.posts} posts',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
                FilledButton.tonal(
                  onPressed: isMember
                      ? onLeave
                      : onJoin,
                  child: Text(isMember ? 'Leave' : 'Join'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              community.description ?? 'No description yet',
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                Chip(
                  avatar: const Icon(Icons.lock_open, size: 16),
                  label: Text(community.visibility),
                ),
                if (membership != null)
                  Chip(
                    avatar: const Icon(Icons.verified_outlined, size: 16),
                    label: Text('${membership.role} • ${membership.status}'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
