import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/community/communities_controller.dart';
import '../provider/feed/live_feed_controller.dart';
import '../services/community_service.dart';
import '../services/live_feed_service.dart';
import '../widgets/feed_composer_sheet.dart';
import '../widgets/feed_entry_card.dart';

class CommunityProfileScreen extends ConsumerStatefulWidget {
  const CommunityProfileScreen({super.key, required this.communityId});

  final String communityId;

  @override
  ConsumerState<CommunityProfileScreen> createState() => _CommunityProfileScreenState();
}

class _CommunityProfileScreenState extends ConsumerState<CommunityProfileScreen> {
  CommunityDetail? _detail;
  List<FeedEntry> _entries = const <FeedEntry>[];
  FeedPagination? _pagination;
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final detail = await ref.read(communitiesControllerProvider.notifier).getDetail(widget.communityId);
      final feed = await ref
          .read(communitiesControllerProvider.notifier)
          .fetchFeed(widget.communityId, page: 1, perPage: 10);
      setState(() {
        _detail = detail;
        _entries = feed.items;
        _pagination = feed.pagination;
        _loading = false;
      });
    } catch (error) {
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || !(_pagination?.hasMore ?? false)) return;
    setState(() => _loadingMore = true);
    try {
      final nextPage = (_pagination?.page ?? 1) + 1;
      final feed = await ref
          .read(communitiesControllerProvider.notifier)
          .fetchFeed(widget.communityId, page: nextPage, perPage: _pagination?.perPage ?? 10);
      setState(() {
        _entries = [..._entries, ...feed.items];
        _pagination = feed.pagination;
        _loadingMore = false;
      });
    } catch (error) {
      setState(() {
        _loadingMore = false;
        _error = error.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = _detail;
    final loading = _loading;
    return Scaffold(
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : detail == null
              ? _buildErrorState(context)
              : RefreshIndicator(
                  onRefresh: _bootstrap,
                  child: CustomScrollView(
                    slivers: [
                      SliverAppBar(
                        pinned: true,
                        expandedHeight: 240,
                        flexibleSpace: FlexibleSpaceBar(
                          title: Text(detail.name),
                          background: Stack(
                            fit: StackFit.expand,
                            children: [
                              if (detail.coverImageUrl != null && detail.coverImageUrl!.isNotEmpty)
                                Image.network(
                                  detail.coverImageUrl!,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(color: Colors.indigo.shade900),
                                )
                              else
                                Container(color: Colors.indigo.shade900),
                              DecoratedBox(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [Colors.black.withOpacity(0.6), Colors.transparent],
                                    begin: Alignment.bottomCenter,
                                    end: Alignment.center,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        actions: [
                          IconButton(
                            icon: const Icon(Icons.refresh),
                            onPressed: _bootstrap,
                          ),
                        ],
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                        sliver: SliverList(
                          delegate: SliverChildListDelegate([
                            _buildSummary(context, detail),
                            const SizedBox(height: 24),
                            _buildActionBar(context, detail),
                            const SizedBox(height: 24),
                            _buildStatsGrid(context, detail),
                            const SizedBox(height: 24),
                            Text('Community feed', style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 16),
                            ..._entries.map(
                              (entry) => Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: FeedEntryCard(
                                  entry: entry,
                                  showCommunity: false,
                                  community: detail,
                                  onEdit: entry.kind == FeedEntryKind.post
                                      ? () => _editPost(context, entry.post!, detail)
                                      : null,
                                  onArchive: entry.kind == FeedEntryKind.post
                                      ? () => _archivePost(context, entry.post!, detail)
                                      : null,
                                  onModerate: entry.kind == FeedEntryKind.post
                                      ? () => _moderatePost(context, entry.post!, detail, 'suppress')
                                      : null,
                                  onRestore: entry.kind == FeedEntryKind.post
                                      ? () => _moderatePost(context, entry.post!, detail, 'restore')
                                      : null,
                                ),
                              ),
                            ),
                            if (_loadingMore)
                              const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
                            if (!_loadingMore && (_pagination?.hasMore ?? false))
                              Align(
                                alignment: Alignment.center,
                                child: FilledButton.tonal(
                                  onPressed: _loadMore,
                                  child: const Text('Load more'),
                                ),
                              ),
                            const SizedBox(height: 48),
                          ]),
                        ),
                      ),
                    ],
                  ),
                ),
      floatingActionButton: detail == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _compose(context, detail),
              icon: const Icon(Icons.post_add),
              label: const Text('Post update'),
            ),
    );
  }

  Widget _buildErrorState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48),
            const SizedBox(height: 12),
            Text(_error ?? 'Unable to load community', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: _bootstrap, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }

  Widget _buildSummary(BuildContext context, CommunityDetail detail) {
    final formatter = DateFormat('MMM d, yyyy');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(detail.description ?? 'No description provided',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.4)),
        const SizedBox(height: 8),
        Text('Visibility: ${detail.visibility} • Created ${formatter.format(detail.createdAt ?? DateTime.now())}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
      ],
    );
  }

  Widget _buildActionBar(BuildContext context, CommunityDetail detail) {
    final membership = detail.membership;
    final isMember = membership?.status == 'active';
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        FilledButton(
          onPressed: isMember ? null : () => _joinCommunity(detail),
          child: Text(isMember ? 'You are a member' : 'Join community'),
        ),
        FilledButton.tonal(
          onPressed: isMember && detail.permissions.canLeave ? () => _leaveCommunity(detail) : null,
          child: const Text('Leave'),
        ),
        OutlinedButton.icon(
          onPressed: () => _compose(context, detail),
          icon: const Icon(Icons.edit_outlined),
          label: const Text('Compose update'),
        ),
      ],
    );
  }

  Widget _buildStatsGrid(BuildContext context, CommunityDetail detail) {
    final tiles = [
      _StatTile(label: 'Members', value: detail.stats.members.toString(), icon: Icons.people_alt_outlined),
      _StatTile(label: 'Posts', value: detail.stats.posts.toString(), icon: Icons.post_add_outlined),
      _StatTile(label: 'Resources', value: detail.stats.resources.toString(), icon: Icons.library_books_outlined),
      _StatTile(label: 'Channels', value: detail.stats.channels.toString(), icon: Icons.hub_outlined),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: tiles.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 3,
      ),
      itemBuilder: (context, index) => tiles[index],
    );
  }

  Future<void> _joinCommunity(CommunitySummary community) async {
    await ref.read(communitiesControllerProvider.notifier).joinCommunity(community.id);
    await _bootstrap();
  }

  Future<void> _leaveCommunity(CommunitySummary community) async {
    await ref.read(communitiesControllerProvider.notifier).leaveCommunity(community.id);
    await _bootstrap();
  }

  Future<void> _compose(BuildContext context, CommunitySummary community) async {
    final result = await showModalBottomSheet<FeedComposerResult>(
      context: context,
      isScrollControlled: true,
      builder: (context) => FeedComposerSheet(
        communities: [community],
        initialCommunity: community,
      ),
    );
    if (result != null) {
      await ref
          .read(liveFeedControllerProvider.notifier)
          .createPost(community: community, input: result.input);
      await _bootstrap();
    }
  }

  Future<void> _editPost(BuildContext context, CommunityPost post, CommunitySummary community) async {
    final result = await showModalBottomSheet<FeedComposerResult>(
      context: context,
      isScrollControlled: true,
      builder: (context) => FeedComposerSheet(
        communities: [community],
        initialCommunity: community,
        initialPost: post,
      ),
    );
    if (result != null) {
      await ref
          .read(liveFeedControllerProvider.notifier)
          .updatePost(community: community, post: post, input: result.input);
      await _bootstrap();
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
          .removePost(community: community, post: post, reason: 'Archived via community profile');
      await _bootstrap();
    }
  }

  Future<void> _moderatePost(
    BuildContext context,
    CommunityPost post,
    CommunitySummary community,
    String action,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${action == 'suppress' ? 'Suppress' : 'Restore'} post'),
        content: const Text('Are you sure?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Confirm')),
        ],
      ),
    );
    if (confirm == true) {
      await ref
          .read(liveFeedControllerProvider.notifier)
          .moderatePost(community: community, post: post, action: action);
      await _bootstrap();
    }
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
            ],
          ),
        ],
      ),
    );
  }
}
