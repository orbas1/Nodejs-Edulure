import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/community/communities_controller.dart';
import '../provider/feed/live_feed_controller.dart';
import '../services/community_service.dart';
import '../services/live_feed_service.dart';
import '../widgets/community_switcher_sheet.dart';
import '../widgets/feed_composer_sheet.dart';
import '../widgets/feed_entry_card.dart';

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  @override
  void initState() {
    super.initState();
    Future<void>.delayed(Duration.zero, () async {
      await ref.read(communitiesControllerProvider.notifier).refresh();
      await ref.read(liveFeedControllerProvider.notifier).bootstrap();
    });
  }

  @override
  Widget build(BuildContext context) {
    final feedState = ref.watch(liveFeedControllerProvider);
    final communitiesState = ref.watch(communitiesControllerProvider);
    final controller = ref.read(liveFeedControllerProvider.notifier);

    final scopeLabel = feedState.context == FeedContext.global
        ? 'Global feed'
        : feedState.community?.name ?? 'Select community';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Live feed'),
            Text(
              scopeLabel,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filter feed',
            onPressed: () => _openFilterSheet(context, feedState, controller),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () => controller.refresh(),
          ),
        ],
      ),
      floatingActionButton: communitiesState.communities.isEmpty
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openComposer(context, communitiesState, feedState),
              icon: const Icon(Icons.add),
              label: const Text('New post'),
            ),
      body: RefreshIndicator(
        onRefresh: () => controller.refresh(),
        child: CustomScrollView(
          slivers: [
            if (feedState.loading)
              const SliverToBoxAdapter(
                child: LinearProgressIndicator(minHeight: 2),
              ),
            SliverPadding(
              padding: const EdgeInsets.all(20),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _buildScopeSelector(context, feedState, communitiesState, controller),
                  if (feedState.error != null) ...[
                    const SizedBox(height: 16),
                    _buildErrorBanner(context, feedState.error!),
                  ],
                  if (feedState.analytics != null) ...[
                    const SizedBox(height: 20),
                    _buildAnalyticsCard(context, feedState.analytics!),
                  ],
                  if (feedState.highlights.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    _buildHighlights(context, feedState.highlights),
                  ],
                  if (feedState.placements.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    _buildPlacements(context, feedState.placements),
                  ],
                  const SizedBox(height: 16),
                ]),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final entry = feedState.entries[index];
                    final community = _resolveCommunityForEntry(
                      entry,
                      communitiesState.communities,
                      feedState.community,
                    );
                    return Padding(
                      padding: EdgeInsets.only(bottom: index == feedState.entries.length - 1 ? 32 : 16),
                      child: FeedEntryCard(
                        entry: entry,
                        community: community,
                        showCommunity: feedState.context == FeedContext.global,
                        onViewCommunity: entry.post?.community != null
                            ? () => _openCommunityProfile(context, entry.post!.community!.id)
                            : null,
                        onEdit: entry.kind == FeedEntryKind.post
                            ? () => _editPost(context, entry.post!, community)
                            : null,
                        onArchive: entry.kind == FeedEntryKind.post
                            ? () => _archivePost(context, entry.post!, community)
                            : null,
                        onModerate: entry.kind == FeedEntryKind.post
                            ? () => _moderatePost(context, entry.post!, community, 'suppress')
                            : null,
                        onRestore: entry.kind == FeedEntryKind.post
                            ? () => _moderatePost(context, entry.post!, community, 'restore')
                            : null,
                      ),
                    );
                  },
                  childCount: feedState.entries.length,
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: feedState.loadingMore
                      ? const CircularProgressIndicator()
                      : feedState.canLoadMore
                          ? FilledButton.tonal(
                              onPressed: () => controller.loadMore(),
                              child: const Text('Load more'),
                            )
                          : const Text("You're up to date"),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScopeSelector(
    BuildContext context,
    LiveFeedState state,
    CommunitiesState communitiesState,
    LiveFeedController controller,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Scope', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        SegmentedButton<FeedContext>(
          segments: [
            const ButtonSegment(value: FeedContext.global, label: Text('Global')),
            ButtonSegment(
              value: FeedContext.community,
              label: Text(state.community?.name ?? 'Community'),
              icon: const Icon(Icons.groups_outlined),
            ),
          ],
          selected: {state.context},
          onSelectionChanged: (selection) async {
            final selected = selection.first;
            if (selected == FeedContext.community && state.community == null) {
              final chosen = await CommunitySwitcherSheet.show(context);
              if (chosen != null) {
                await controller.selectContext(FeedContext.community, community: chosen);
              }
            } else {
              await controller.selectContext(selected);
            }
          },
        ),
        if (state.context == FeedContext.community)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    state.community != null
                        ? 'Viewing ${state.community!.name} feed'
                        : 'Select a community to view updates',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
                TextButton.icon(
                  onPressed: () async {
                    final chosen = await CommunitySwitcherSheet.show(context, selected: state.community);
                    if (chosen != null) {
                      await controller.selectContext(FeedContext.community, community: chosen);
                    }
                  },
                  icon: const Icon(Icons.swap_horiz),
                  label: const Text('Switch'),
                ),
              ],
            ),
          ),
        if (communitiesState.communities.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: OutlinedButton.icon(
              onPressed: () => CommunitySwitcherSheet.show(context),
              icon: const Icon(Icons.group_add_outlined),
              label: const Text('Discover communities'),
            ),
          ),
      ],
    );
  }

  Widget _buildErrorBanner(BuildContext context, String message) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Theme.of(context).colorScheme.error),
          const SizedBox(width: 12),
          Expanded(child: Text(message)),
          TextButton(
            onPressed: () => ref.read(liveFeedControllerProvider.notifier).refresh(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildAnalyticsCard(BuildContext context, FeedAnalytics analytics) {
    final dateFormat = DateFormat('MMM d');
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Theme.of(context).colorScheme.primary.withOpacity(0.12), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Theme.of(context).colorScheme.primary.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.insights_outlined, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 12),
              Text('Engagement pulse', style: Theme.of(context).textTheme.titleMedium),
              const Spacer(),
              TextButton.icon(
                onPressed: () => ref.read(liveFeedControllerProvider.notifier).reloadAnalytics(),
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('Refresh'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _analyticsTile(context, 'Posts sampled', analytics.engagement.postsSampled.toString()),
              _analyticsTile(context, 'Comments', analytics.engagement.comments.toString()),
              _analyticsTile(context, 'Reactions', analytics.engagement.reactions.toString()),
              _analyticsTile(context, 'Communities', analytics.engagement.uniqueCommunities.toString()),
            ],
          ),
          const SizedBox(height: 16),
          if (analytics.engagement.trendingTags.isNotEmpty)
            Wrap(
              spacing: 8,
              children: analytics.engagement.trendingTags
                  .map(
                    (tag) => Chip(
                      label: Text('#${tag.tag} • ${tag.count}'),
                      avatar: const Icon(Icons.trending_up),
                    ),
                  )
                  .toList(),
            ),
          const SizedBox(height: 12),
          Text(
            'Range ${dateFormat.format(analytics.generatedAt.subtract(const Duration(days: 7)))} - ${dateFormat.format(analytics.generatedAt)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _analyticsTile(BuildContext context, String label, String value) {
    return Container(
      width: 140,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
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

  Widget _buildHighlights(BuildContext context, List<FeedHighlight> highlights) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Highlights', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        SizedBox(
          height: 180,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemBuilder: (context, index) {
              final highlight = highlights[index];
              return Container(
                width: 260,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(22),
                  gradient: LinearGradient(
                    colors: [const Color(0xFFEEF2FF), Colors.white],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Chip(
                      avatar: const Icon(Icons.workspace_premium_outlined, size: 16),
                      label: Text(highlight.type.toUpperCase()),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      highlight.title ?? highlight.name ?? 'Highlight',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const Spacer(),
                    Text(
                      DateFormat('MMM d, HH:mm').format(highlight.timestamp),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              );
            },
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemCount: highlights.length,
          ),
        ),
      ],
    );
  }

  Widget _buildPlacements(BuildContext context, List<FeedPlacement> placements) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Active placements', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        ...placements.map(
          (placement) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                const Icon(Icons.campaign_outlined),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(placement.headline, style: Theme.of(context).textTheme.bodyMedium),
                      Text(
                        'Campaign ${placement.campaignId}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
                Chip(label: Text(placement.slot)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _openFilterSheet(
    BuildContext context,
    LiveFeedState state,
    LiveFeedController controller,
  ) async {
    final searchController = TextEditingController(text: state.filters.search ?? '');
    String? postType = state.filters.postType;
    String range = state.filters.range;
    final result = await showModalBottomSheet<bool>(
      context: context,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            left: 24,
            right: 24,
            top: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text('Filter feed', style: Theme.of(context).textTheme.titleLarge),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: searchController,
                decoration: const InputDecoration(
                  labelText: 'Search keyword',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: postType,
                decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Post type'),
                items: const [
                  DropdownMenuItem(value: null, child: Text('Any type')),
                  DropdownMenuItem(value: 'update', child: Text('Update')),
                  DropdownMenuItem(value: 'event', child: Text('Event')),
                  DropdownMenuItem(value: 'resource', child: Text('Resource')),
                  DropdownMenuItem(value: 'classroom', child: Text('Classroom')),
                  DropdownMenuItem(value: 'poll', child: Text('Poll')),
                ],
                onChanged: (value) => postType = value,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: range,
                decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Analytics range'),
                items: const [
                  DropdownMenuItem(value: '7d', child: Text('Last 7 days')),
                  DropdownMenuItem(value: '30d', child: Text('Last 30 days')),
                  DropdownMenuItem(value: '90d', child: Text('Last 90 days')),
                  DropdownMenuItem(value: '180d', child: Text('Last 6 months')),
                ],
                onChanged: (value) => range = value ?? '30d',
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Apply filters'),
              ),
            ],
          ),
        );
      },
    );

    if (result == true) {
      await controller.applyFilters(
        LiveFeedFilters(
          search: searchController.text.trim().isEmpty ? null : searchController.text.trim(),
          postType: postType,
          range: range,
        ),
      );
    }
  }

  Future<void> _openComposer(
    BuildContext context,
    CommunitiesState communitiesState,
    LiveFeedState feedState,
  ) async {
    if (communitiesState.communities.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Join a community to post updates')));
      return;
    }
    final result = await showModalBottomSheet<FeedComposerResult>(
      context: context,
      isScrollControlled: true,
      builder: (context) => FeedComposerSheet(
        communities: communitiesState.communities,
        initialCommunity: feedState.context == FeedContext.community ? feedState.community : null,
      ),
    );

    if (result != null) {
      await ref
          .read(liveFeedControllerProvider.notifier)
          .createPost(community: result.community, input: result.input);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Post shared to ${result.community.name}')));
    }
  }

  Future<void> _editPost(BuildContext context, CommunityPost post, CommunitySummary community) async {
    final communitiesState = ref.read(communitiesControllerProvider);
    final result = await showModalBottomSheet<FeedComposerResult>(
      context: context,
      isScrollControlled: true,
      builder: (context) => FeedComposerSheet(
        communities: communitiesState.communities.isNotEmpty
            ? communitiesState.communities
            : [community],
        initialCommunity: community,
        initialPost: post,
      ),
    );
    if (result != null && result.existing != null) {
      await ref
          .read(liveFeedControllerProvider.notifier)
          .updatePost(community: result.community, post: post, input: result.input);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Post updated for ${result.community.name}')));
    }
  }

  Future<void> _archivePost(BuildContext context, CommunityPost post, CommunitySummary community) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Archive post'),
        content: const Text('Archived posts are removed from the feed but kept in the audit log. Continue?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Archive')),
        ],
      ),
    );
    if (confirm == true) {
      await ref
          .read(liveFeedControllerProvider.notifier)
          .removePost(community: community, post: post, reason: 'Archived via mobile app');
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Post archived from ${community.name} feed')));
    }
  }

  Future<void> _moderatePost(
    BuildContext context,
    CommunityPost post,
    CommunitySummary community,
    String action,
  ) async {
    final actions = {'suppress': 'Suppress', 'restore': 'Restore'};
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${actions[action]} post'),
        content: Text('Confirm to ${actions[action]?.toLowerCase()} this post?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: Text(actions[action]!)),
        ],
      ),
    );
    if (confirm == true) {
      await ref
          .read(liveFeedControllerProvider.notifier)
          .moderatePost(community: community, post: post, action: action);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Post ${actions[action]!.toLowerCase()}d')));
    }
  }

  CommunitySummary _resolveCommunityForEntry(
    FeedEntry entry,
    List<CommunitySummary> communities,
    CommunitySummary? selected,
  ) {
    final postCommunity = entry.post?.community;
    if (postCommunity != null) {
      final existing = communities.firstWhere(
        (element) => element.id == postCommunity.id,
        orElse: () => CommunitySummary(
          id: postCommunity.id,
          name: postCommunity.name,
          slug: postCommunity.slug,
          visibility: 'public',
          metadata: const {},
        ),
      );
      return existing;
    }
    return selected ??
        (communities.isNotEmpty
            ? communities.first
            : CommunitySummary(
                id: '0',
                name: 'Community',
                slug: 'community',
                visibility: 'public',
                metadata: const {},
              ));
  }

  Future<void> _openCommunityProfile(BuildContext context, String communityId) async {
    if (!mounted) return;
    await Navigator.of(context).pushNamed('/communities/profile', arguments: communityId);
  }
}
