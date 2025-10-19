import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../provider/community/communities_controller.dart';
import '../provider/community/community_engagement_controller.dart';
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
      final detail = await ref.read(communitiesControllerProvider.notifier).getDetail(widget.communityId, forceRefresh: true);
      await ref.read(communityEngagementControllerProvider.notifier).bootstrap(detail);
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
    final engagementState = ref.watch(communityEngagementControllerProvider);
    final communitySnapshot =
        detail == null ? null : engagementState.snapshotFor(detail.id) ?? engagementState.snapshotFor(widget.communityId);
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
                        expandedHeight: 260,
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
                                    colors: [Colors.black.withOpacity(0.65), Colors.transparent],
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
                            _buildSummary(context, detail, communitySnapshot),
                            const SizedBox(height: 24),
                            _buildActionBar(context, detail),
                            const SizedBox(height: 24),
                            _buildStatsGrid(context, detail, communitySnapshot),
                            const SizedBox(height: 24),
                            Text(
                              'Community collaborations',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 12),
                            _CommunityEngagementArea(detail: detail),
                            const SizedBox(height: 32),
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

  Widget _buildSummary(
    BuildContext context,
    CommunityDetail detail,
    CommunityEngagementSnapshot? snapshot,
  ) {
    final formatter = DateFormat('MMM d, yyyy');
    final members = snapshot?.members ?? const <CommunityMemberProfile>[];
    final memberCount = members.isEmpty ? detail.stats.members : members.length;
    final onlineCount = members.where((member) => member.isOnline).length;
    final moderatorCount = members.where((member) => member.isModerator).length;
    final pendingInvites = members.where((member) => member.status == CommunityMemberStatus.pending).length;
    final about = snapshot?.about;
    final metadata = detail.metadata;
    final website = about?.website.isNotEmpty == true
        ? about!.website
        : metadata['website']?.toString() ?? '';
    final contactEmail = about?.contactEmail.isNotEmpty == true
        ? about!.contactEmail
        : metadata['contactEmail']?.toString() ?? '';
    final codeOfConduct = about?.codeOfConductUrl ?? metadata['codeOfConduct']?.toString() ?? '';
    final partnerDeck = about?.partnerDeckUrl ?? metadata['partnerDeck']?.toString() ?? '';
    final pressKit = about?.pressKitUrl ?? metadata['pressKit']?.toString() ?? '';
    final highlightMembers = members.take(8).toList();
    final lastUpdated = snapshot?.lastUpdatedAt ?? detail.updatedAt ?? detail.createdAt ?? DateTime.now();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.indigo.shade100),
        boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 24, offset: Offset(0, 10))],
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: SizedBox(
                  width: 72,
                  height: 72,
                  child: detail.coverImageUrl != null && detail.coverImageUrl!.isNotEmpty
                      ? Image.network(
                          detail.coverImageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(color: Colors.indigo.shade200),
                        )
                      : Container(
                          alignment: Alignment.center,
                          color: Colors.indigo.shade200,
                          child: Text(
                            detail.name.isNotEmpty ? detail.name[0].toUpperCase() : '?',
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      detail.name,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      detail.description ?? 'No description provided yet. Use the about tab to craft a compelling story.',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.5),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Chip(
                          avatar: const Icon(Icons.lock_open_outlined),
                          label: Text('${detail.visibility} community'),
                        ),
                        Chip(
                          avatar: const Icon(Icons.calendar_month_outlined),
                          label: Text('Founded ${formatter.format(detail.createdAt ?? DateTime.now())}'),
                        ),
                        Chip(
                          avatar: const Icon(Icons.people_alt_outlined),
                          label: Text('$memberCount members'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _ProfileMetricPill(
                icon: Icons.people_outline,
                label: 'Members',
                value: memberCount.toString(),
              ),
              _ProfileMetricPill(
                icon: Icons.wifi_tethering,
                label: 'Online now',
                value: onlineCount.toString(),
                accentColor: Colors.green,
              ),
              _ProfileMetricPill(
                icon: Icons.shield_outlined,
                label: 'Community admins',
                value: moderatorCount.toString(),
              ),
              _ProfileMetricPill(
                icon: Icons.hourglass_top_outlined,
                label: 'Pending invites',
                value: pendingInvites.toString(),
                accentColor: Colors.orange,
              ),
            ],
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              if (website.isNotEmpty)
                ActionChip(
                  avatar: const Icon(Icons.public),
                  label: const Text('Visit website'),
                  onPressed: () => _launchExternal(website),
                ),
              if (contactEmail.isNotEmpty)
                ActionChip(
                  avatar: const Icon(Icons.mail_outline),
                  label: const Text('Contact team'),
                  onPressed: () => _launchEmail(contactEmail),
                ),
              if (codeOfConduct.isNotEmpty)
                ActionChip(
                  avatar: const Icon(Icons.rule_folder_outlined),
                  label: const Text('Code of conduct'),
                  onPressed: () => _launchExternal(codeOfConduct),
                ),
              if (partnerDeck.isNotEmpty)
                ActionChip(
                  avatar: const Icon(Icons.slideshow_outlined),
                  label: const Text('Partner deck'),
                  onPressed: () => _launchExternal(partnerDeck),
                ),
              if (pressKit.isNotEmpty)
                ActionChip(
                  avatar: const Icon(Icons.collections_bookmark_outlined),
                  label: const Text('Press kit'),
                  onPressed: () => _launchExternal(pressKit),
                ),
            ],
          ),
          if (highlightMembers.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text('Recently active members', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            _MemberAvatarStack(members: highlightMembers),
          ],
          const SizedBox(height: 20),
          Text(
            'Last updated ${DateFormat('MMM d, h:mm a').format(lastUpdated)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade700),
          ),
        ],
      ),
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

  Widget _buildStatsGrid(
    BuildContext context,
    CommunityDetail detail,
    CommunityEngagementSnapshot? snapshot,
  ) {
    final members = snapshot?.members ?? const <CommunityMemberProfile>[];
    final memberCount = members.isEmpty ? detail.stats.members : members.length;
    final online = members.where((member) => member.isOnline).length;
    final moderators = members.where((member) => member.isModerator).length;
    final pending = members.where((member) => member.status == CommunityMemberStatus.pending).length;
    final lastActivity = detail.stats.lastActivityAt ?? snapshot?.lastUpdatedAt;
    final lastActivityLabel = lastActivity != null
        ? DateFormat('MMM d, h:mm a').format(lastActivity)
        : 'No recent activity';
    final tiles = [
      _StatTile(label: 'Members', value: memberCount.toString(), icon: Icons.people_alt_outlined),
      _StatTile(label: 'Posts', value: detail.stats.posts.toString(), icon: Icons.post_add_outlined),
      _StatTile(label: 'Resources', value: detail.stats.resources.toString(), icon: Icons.library_books_outlined),
      _StatTile(label: 'Channels', value: detail.stats.channels.toString(), icon: Icons.hub_outlined),
      _StatTile(label: 'Online now', value: online.toString(), icon: Icons.online_prediction_outlined),
      _StatTile(label: 'Admins', value: moderators.toString(), icon: Icons.shield_moon_outlined),
      _StatTile(label: 'Pending', value: pending.toString(), icon: Icons.hourglass_bottom_outlined),
      _StatTile(label: 'Last activity', value: lastActivityLabel, icon: Icons.timeline_outlined),
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

  Future<void> _launchExternal(String url) async {
    if (url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _launchEmail(String email) async {
    if (email.isEmpty) return;
    final uri = Uri(scheme: 'mailto', path: email);
    await launchUrl(uri);
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

class _ProfileMetricPill extends StatelessWidget {
  const _ProfileMetricPill({
    required this.icon,
    required this.label,
    required this.value,
    this.accentColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? accentColor;

  @override
  Widget build(BuildContext context) {
    final color = accentColor ?? Theme.of(context).colorScheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700, color: color),
              ),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ],
      ),
    );
  }
}

class _MemberAvatarStack extends StatelessWidget {
  const _MemberAvatarStack({required this.members});

  final List<CommunityMemberProfile> members;

  @override
  Widget build(BuildContext context) {
    final display = members.take(8).toList();
    final overflow = members.length - display.length;
    final width = 48 + (display.length > 1 ? (display.length - 1) * 28 : 0) + (overflow > 0 ? 40 : 0);
    return SizedBox(
      height: 48,
      width: width.toDouble(),
      child: Stack(
        children: [
          for (var i = 0; i < display.length; i++)
            Positioned(
              left: (i * 28).toDouble(),
              child: Tooltip(
                message: '${display[i].name}\n${display[i].role}',
                child: CircleAvatar(
                  radius: 24,
                  backgroundColor: Colors.white,
                  child: CircleAvatar(
                    radius: 22,
                    backgroundImage: NetworkImage(display[i].avatarUrl),
                  ),
                ),
              ),
            ),
          if (overflow > 0)
            Positioned(
              left: (display.length * 28).toDouble(),
              child: CircleAvatar(
                radius: 24,
                backgroundColor: Colors.indigo.shade100,
                child: Text(
                  '+$overflow',
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(fontWeight: FontWeight.bold, color: Colors.indigo.shade700),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

enum _EngagementTab { chats, members, map, about }
class _CommunityEngagementArea extends ConsumerStatefulWidget {
  const _CommunityEngagementArea({required this.detail});

  final CommunityDetail detail;

  @override
  ConsumerState<_CommunityEngagementArea> createState() => _CommunityEngagementAreaState();
}

class _CommunityEngagementAreaState extends ConsumerState<_CommunityEngagementArea> {
  Set<_EngagementTab> _selection = const {_EngagementTab.chats};
  final TextEditingController _channelSearchController = TextEditingController();
  final TextEditingController _memberSearchController = TextEditingController();
  final Set<CommunityChatChannelType> _channelTypeFilters = <CommunityChatChannelType>{};
  CommunityMemberStatus? _memberStatusFilter;
  bool _membersOnlyModerators = false;
  String _memberSort = 'name';
  String _mapRoleFilter = 'All roles';
  bool _showArchivedChannels = false;
  bool _mapOnlyOnline = false;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(communityEngagementControllerProvider.notifier).bootstrap(widget.detail);
    });
  }

  @override
  void dispose() {
    _channelSearchController.dispose();
    _memberSearchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.read(communityEngagementControllerProvider.notifier);
    final state = ref.watch(communityEngagementControllerProvider);
    final snapshot = state.snapshotFor(widget.detail.id);
    final loading = state.isLoading(widget.detail.id);
    final error = state.errorFor(widget.detail.id);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          colors: [Theme.of(context).colorScheme.primary.withOpacity(0.08), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: Colors.indigo.shade100, width: 1.2),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome_mosaic_outlined),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Engagement operating suite',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              IconButton(
                tooltip: 'Refresh modules',
                onPressed: () => controller.bootstrap(widget.detail),
                icon: const Icon(Icons.sync_outlined),
              )
            ],
          ),
          const SizedBox(height: 16),
          SegmentedButton<_EngagementTab>(
            segments: const <ButtonSegment<_EngagementTab>>[
              ButtonSegment(value: _EngagementTab.chats, label: Text('Chats'), icon: Icon(Icons.forum_outlined)),
              ButtonSegment(value: _EngagementTab.members, label: Text('Members'), icon: Icon(Icons.people_outline)),
              ButtonSegment(value: _EngagementTab.map, label: Text('Map'), icon: Icon(Icons.map_outlined)),
              ButtonSegment(value: _EngagementTab.about, label: Text('About'), icon: Icon(Icons.info_outline)),
            ],
            selected: _selection,
            showSelectedIcon: false,
            onSelectionChanged: (value) => setState(() => _selection = value),
          ),
          const SizedBox(height: 20),
          if (loading && snapshot == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (error != null)
            _buildError(context, error)
          else if (snapshot != null)
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: switch (_selection.first) {
                _EngagementTab.chats => _buildChatsTab(context, controller, snapshot),
                _EngagementTab.members => _buildMembersTab(context, controller, snapshot),
                _EngagementTab.map => _buildMapTab(context, controller, snapshot),
                _EngagementTab.about => _buildAboutTab(context, controller, snapshot),
              },
            )
          else
            const SizedBox.shrink(),
          const SizedBox(height: 20),
          if (snapshot != null)
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                'Synced ${DateFormat('MMM d • h:mm a').format(snapshot.lastSyncedAt)} · Updated ${DateFormat('h:mm a').format(snapshot.lastUpdatedAt)}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade700),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildError(BuildContext context, String error) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('We could not load the engagement modules',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Colors.red.shade700, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(error, style: TextStyle(color: Colors.red.shade700)),
        ],
      ),
    );
  }
  Widget _buildChatsTab(
    BuildContext context,
    CommunityEngagementController controller,
    CommunityEngagementSnapshot snapshot,
  ) {
    final searchQuery = _channelSearchController.text.trim().toLowerCase();
    var channels = snapshot.channels.where((channel) => _showArchivedChannels || !channel.archived).toList();
    if (_channelTypeFilters.isNotEmpty) {
      channels = channels.where((channel) => _channelTypeFilters.contains(channel.type)).toList();
    }
    if (searchQuery.isNotEmpty) {
      channels = channels
          .where((channel) =>
              channel.name.toLowerCase().contains(searchQuery) || channel.description.toLowerCase().contains(searchQuery))
          .toList();
    }
    channels.sort((a, b) => a.name.compareTo(b.name));
    final defaultAuthor = snapshot.members.isNotEmpty
        ? snapshot.members.first
        :
        CommunityMemberProfile(
          id: 'fallback-author',
          name: 'Community automation',
          email: 'ops@edulure.io',
          role: 'Automation',
          status: CommunityMemberStatus.active,
          isModerator: true,
          avatarUrl: 'https://i.pravatar.cc/150?u=automation',
          biography: 'Virtual concierge for community tooling.',
          location: const CommunityMemberLocation(latitude: 0, longitude: 0, city: 'Remote', country: 'Global'),
          joinedAt: DateTime.now(),
          expertise: const ['Automation'],
          availability: '24/7',
          isOnline: true,
          lastActiveAt: DateTime.now(),
        );

    return Column(
      key: const ValueKey('chats'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            SizedBox(
              width: 280,
              child: TextField(
                controller: _channelSearchController,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search),
                  hintText: 'Search channels',
                  suffixIcon: _channelSearchController.text.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _channelSearchController.clear();
                            setState(() {});
                          },
                        ),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
            FilterChip(
              label: const Text('Show archived'),
              selected: _showArchivedChannels,
              onSelected: (value) => setState(() => _showArchivedChannels = value),
            ),
            Wrap(
              spacing: 8,
              children: CommunityChatChannelType.values
                  .map(
                    (type) => FilterChip(
                      label: Text(type.displayName),
                      selected: _channelTypeFilters.contains(type),
                      onSelected: (selected) {
                        setState(() {
                          if (selected) {
                            _channelTypeFilters.add(type);
                          } else {
                            _channelTypeFilters.remove(type);
                          }
                        });
                      },
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: () => _openChannelComposer(context, controller, snapshot),
          icon: const Icon(Icons.add_comment_outlined),
          label: const Text('Create channel'),
        ),
        const SizedBox(height: 16),
        if (channels.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.indigo.shade100),
            ),
            child: const Text('No channels match your filters yet. Create one to spark collaboration!'),
          ),
        ...channels.map(
          (channel) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _ChannelCard(
              communityId: widget.detail.id,
              channel: channel,
              defaultAuthor: defaultAuthor,
              controller: controller,
              messages: snapshot.messages[channel.id] ?? const <CommunityChatMessage>[],
            ),
          ),
        ),
      ],
    );
  }
  Widget _buildMembersTab(
    BuildContext context,
    CommunityEngagementController controller,
    CommunityEngagementSnapshot snapshot,
  ) {
    final members = _filteredMembers(snapshot.members);
    final stats = _memberStats(snapshot.members);
    return Column(
      key: const ValueKey('members'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            SizedBox(
              width: 260,
              child: TextField(
                controller: _memberSearchController,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search),
                  hintText: 'Search people or roles',
                  suffixIcon: _memberSearchController.text.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _memberSearchController.clear();
                            setState(() {});
                          },
                        ),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
            DropdownButton<CommunityMemberStatus?>(
              value: _memberStatusFilter,
              hint: const Text('Status'),
              onChanged: (value) => setState(() => _memberStatusFilter = value),
              items: const [
                DropdownMenuItem<CommunityMemberStatus?>(value: null, child: Text('All statuses')),
                DropdownMenuItem(value: CommunityMemberStatus.active, child: Text('Active')),
                DropdownMenuItem(value: CommunityMemberStatus.pending, child: Text('Pending')),
                DropdownMenuItem(value: CommunityMemberStatus.suspended, child: Text('Suspended')),
              ],
            ),
            FilterChip(
              label: const Text('Moderators only'),
              selected: _membersOnlyModerators,
              onSelected: (value) => setState(() => _membersOnlyModerators = value),
            ),
            DropdownButton<String>(
              value: _memberSort,
              onChanged: (value) => setState(() => _memberSort = value ?? 'name'),
              items: const [
                DropdownMenuItem(value: 'name', child: Text('Sort by name')),
                DropdownMenuItem(value: 'role', child: Text('Sort by role')),
                DropdownMenuItem(value: 'tenure', child: Text('Sort by tenure')),
              ],
            ),
            FilledButton.icon(
              onPressed: () => _openMemberComposer(context, controller),
              icon: const Icon(Icons.person_add_alt_1),
              label: const Text('Invite member'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: stats.entries
              .map(
                (entry) => Chip(
                  avatar: CircleAvatar(
                    backgroundColor: entry.value.color.withOpacity(0.15),
                    child: Icon(entry.value.icon, color: entry.value.color),
                  ),
                  label: Text('${entry.key}: ${entry.value.count}'),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 20),
        if (members.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.indigo.shade100),
            ),
            child: const Text('No members match your filters. Try broadening the search.'),
          )
        else
          Column(
            children: members
                .map((member) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _MemberCard(
                        communityId: widget.detail.id,
                        member: member,
                        onEdit: () => _openMemberComposer(context, controller, existing: member),
                        onRemove: () => controller.removeMember(widget.detail.id, member.id),
                        onToggleModerator: () => controller.toggleModerator(widget.detail.id, member.id),
                        onTogglePresence: () {
                          controller
                              .upsertMember(
                                widget.detail.id,
                                member.copyWith(
                                  isOnline: !member.isOnline,
                                  lastActiveAt: DateTime.now(),
                                ),
                              )
                              .then((_) {
                            if (mounted) setState(() {});
                          });
                        },
                      ),
                    ))
                .toList(),
          ),
      ],
    );
  }

  Map<String, _MemberStatSummary> _memberStats(List<CommunityMemberProfile> members) {
    final roleSummary = <String, _MemberStatSummary>{};
    for (final member in members) {
      roleSummary.update(
        member.role,
        (value) => value.copyWith(count: value.count + 1),
        ifAbsent: () => _MemberStatSummary(
          count: 1,
          icon: member.isModerator ? Icons.shield_moon_outlined : Icons.person_outline,
          color: member.isModerator ? Colors.indigo : Colors.blueGrey,
        ),
      );
    }
    final online = members.where((member) => member.isOnline).length;
    final moderators = members.where((member) => member.isModerator).length;
    final pending = members.where((member) => member.status == CommunityMemberStatus.pending).length;
    final summary = <String, _MemberStatSummary>{
      'Online now': _MemberStatSummary(
        count: online,
        icon: Icons.wifi_tethering_outlined,
        color: Colors.green,
      ),
      'Moderators': _MemberStatSummary(
        count: moderators,
        icon: Icons.shield_outlined,
        color: Colors.indigo,
      ),
      'Pending invites': _MemberStatSummary(
        count: pending,
        icon: Icons.hourglass_top_outlined,
        color: Colors.orange,
      ),
      ...roleSummary,
    };
    return summary;
  }

  List<CommunityMemberProfile> _filteredMembers(List<CommunityMemberProfile> members) {
    final query = _memberSearchController.text.trim().toLowerCase();
    var filtered = members.where((member) {
      final matchesSearch = query.isEmpty ||
          member.name.toLowerCase().contains(query) ||
          member.role.toLowerCase().contains(query) ||
          member.email.toLowerCase().contains(query);
      final matchesStatus = _memberStatusFilter == null || member.status == _memberStatusFilter;
      final matchesModerator = !_membersOnlyModerators || member.isModerator;
      return matchesSearch && matchesStatus && matchesModerator;
    }).toList();

    switch (_memberSort) {
      case 'role':
        filtered.sort((a, b) => a.role.compareTo(b.role));
        break;
      case 'tenure':
        filtered.sort((a, b) => a.joinedAt.compareTo(b.joinedAt));
        break;
      case 'name':
      default:
        filtered.sort((a, b) {
          if (a.isOnline != b.isOnline) {
            return a.isOnline ? -1 : 1;
          }
          return a.name.compareTo(b.name);
        });
        break;
    }
    return filtered;
  }
  Widget _buildMapTab(
    BuildContext context,
    CommunityEngagementController controller,
    CommunityEngagementSnapshot snapshot,
  ) {
    final members = snapshot.members;
    final filtered = members
        .where((member) {
          final matchesRole = _mapRoleFilter == 'All roles' || member.role == _mapRoleFilter;
          final matchesPresence = !_mapOnlyOnline || member.isOnline;
          return matchesRole && matchesPresence;
        })
        .toList();
    final center = _averageLatLng(filtered.isEmpty ? members : filtered);
    final markers = filtered
        .map(
          (member) => Marker(
            point: LatLng(member.location.latitude, member.location.longitude),
            width: 44,
            height: 44,
            builder: (_) => GestureDetector(
              onTap: () => _showMapMemberActions(context, controller, member),
              child: Tooltip(
                message:
                    '${member.name}\n${member.location.city}, ${member.location.country}\n${member.isOnline ? 'Online' : 'Last active ${_relativePresence(member.lastActiveAt)} ago'}',
                triggerMode: TooltipTriggerMode.tap,
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: member.isOnline ? Colors.greenAccent : Colors.indigo.shade200,
                      width: 3,
                    ),
                  ),
                  child: CircleAvatar(
                    backgroundImage: NetworkImage(member.avatarUrl),
                  ),
                ),
              ),
            ),
          ),
        )
        .toList();
    final roles = {
      'All roles',
      ...members.map((member) => member.role).toSet(),
    }.toList()
      ..sort();
    final onlineCount = filtered.where((member) => member.isOnline).length;

    return Column(
      key: const ValueKey('map'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            DropdownButton<String>(
              value: _mapRoleFilter,
              items: roles
                  .map((role) => DropdownMenuItem<String>(value: role, child: Text(role)))
                  .toList(),
              onChanged: (value) => setState(() => _mapRoleFilter = value ?? 'All roles'),
            ),
            FilterChip(
              label: const Text('Online only'),
              selected: _mapOnlyOnline,
              onSelected: (value) => setState(() => _mapOnlyOnline = value),
            ),
            Chip(
              avatar: const Icon(Icons.place_outlined),
              label: Text('${filtered.length} people visualised'),
            ),
            Chip(
              avatar: const Icon(Icons.wifi_tethering),
              label: Text('$onlineCount online now'),
            ),
            FilledButton.icon(
              onPressed: () => _openMemberComposer(context, controller),
              icon: const Icon(Icons.person_pin_circle_outlined),
              label: const Text('Invite or add member'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: SizedBox(
            height: 320,
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: center,
                initialZoom: 2.8,
                minZoom: 1,
                maxZoom: 18,
                interactionOptions: const InteractionOptions(enableMultiFingerGestureRace: true),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.edulure.app',
                ),
                MarkerLayer(markers: markers),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (filtered.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.indigo.shade100),
            ),
            child: const Text('No members match the current filters yet. Adjust filters or invite teammates.'),
          )
        else ...[
          Text('Location roster', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          ...filtered.take(6).map(
                (member) => Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: ListTile(
                    leading: CircleAvatar(backgroundImage: NetworkImage(member.avatarUrl)),
                    title: Text(member.name),
                    subtitle: Text('${member.role} • ${member.location.city}, ${member.location.country}'),
                    trailing: Wrap(
                      spacing: 0,
                      children: [
                        IconButton(
                          tooltip: 'Focus on map',
                          icon: const Icon(Icons.navigation_outlined),
                          onPressed: () => _focusOnMember(member),
                        ),
                        IconButton(
                          tooltip: 'Edit location',
                          icon: const Icon(Icons.edit_location_alt_outlined),
                          onPressed: () => _openLocationEditor(context, controller, member),
                        ),
                      ],
                    ),
                    onTap: () => _showMapMemberActions(context, controller, member),
                  ),
                ),
              ),
          if (filtered.length > 6)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  builder: (context) {
                    final height = MediaQuery.of(context).size.height * 0.6;
                    return SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('All mapped members',
                                style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 12),
                            SizedBox(
                              height: height,
                              child: ListView(
                                children: filtered
                                    .map(
                                      (member) => ListTile(
                                        leading: CircleAvatar(
                                            backgroundImage: NetworkImage(member.avatarUrl)),
                                        title: Text(member.name),
                                        subtitle: Text(
                                            '${member.location.city}, ${member.location.country} • ${member.role}'),
                                        trailing: Text(
                                          member.isOnline
                                              ? 'Online'
                                              : 'Active ${_relativePresence(member.lastActiveAt)} ago',
                                        ),
                                        onTap: () {
                                          Navigator.of(context).pop();
                                          _focusOnMember(member);
                                          _showMapMemberActions(context, controller, member);
                                        },
                                      ),
                                    )
                                    .toList(),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                icon: const Icon(Icons.list_alt_outlined),
                label: const Text('View full list'),
              ),
            ),
        ],
      ],
    );
  }

  LatLng _averageLatLng(List<CommunityMemberProfile> members) {
    if (members.isEmpty) {
      return const LatLng(0, 0);
    }
    final sumLat = members.fold<double>(0, (value, member) => value + member.location.latitude);
    final sumLng = members.fold<double>(0, (value, member) => value + member.location.longitude);
    return LatLng(sumLat / members.length, sumLng / members.length);
  }

  void _focusOnMember(CommunityMemberProfile member) {
    _mapController.move(member.location.toLatLng(), 5.6);
  }

  Future<void> _openLocationEditor(
    BuildContext context,
    CommunityEngagementController controller,
    CommunityMemberProfile member,
  ) async {
    final formKey = GlobalKey<FormState>();
    final latController = TextEditingController(text: member.location.latitude.toStringAsFixed(4));
    final lngController = TextEditingController(text: member.location.longitude.toStringAsFixed(4));
    final cityController = TextEditingController(text: member.location.city);
    final countryController = TextEditingController(text: member.location.country);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Update ${member.name}\'s location'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: latController,
                decoration: const InputDecoration(labelText: 'Latitude'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                validator: (value) => double.tryParse(value ?? '') == null ? 'Enter a valid latitude' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: lngController,
                decoration: const InputDecoration(labelText: 'Longitude'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                validator: (value) => double.tryParse(value ?? '') == null ? 'Enter a valid longitude' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: cityController,
                decoration: const InputDecoration(labelText: 'City'),
                validator: (value) => value == null || value.trim().isEmpty ? 'City is required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: countryController,
                decoration: const InputDecoration(labelText: 'Country'),
                validator: (value) => value == null || value.trim().isEmpty ? 'Country is required' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              if (formKey.currentState?.validate() ?? false) {
                Navigator.of(context).pop(true);
              }
            },
            child: const Text('Save location'),
          )
        ],
      ),
    );

    if (confirmed == true) {
      final updated = member.copyWith(
        location: CommunityMemberLocation(
          latitude: double.parse(latController.text.trim()),
          longitude: double.parse(lngController.text.trim()),
          city: cityController.text.trim(),
          country: countryController.text.trim(),
        ),
      );
      await controller.upsertMember(widget.detail.id, updated);
      if (mounted) {
        setState(() {});
      }
    }
  }

  Future<void> _showMapMemberActions(
    BuildContext context,
    CommunityEngagementController controller,
    CommunityMemberProfile member,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: CircleAvatar(backgroundImage: NetworkImage(member.avatarUrl)),
                title: Text(member.name),
                subtitle: Text('${member.role} • ${member.location.city}, ${member.location.country}'),
              ),
              ListTile(
                leading: const Icon(Icons.navigation_outlined),
                title: const Text('Focus on map'),
                onTap: () {
                  Navigator.of(context).pop();
                  _focusOnMember(member);
                },
              ),
              ListTile(
                leading: const Icon(Icons.edit_location_alt_outlined),
                title: const Text('Edit location'),
                onTap: () {
                  Navigator.of(context).pop();
                  _openLocationEditor(context, controller, member);
                },
              ),
              ListTile(
                leading: Icon(member.isOnline ? Icons.toggle_on : Icons.toggle_off_outlined),
                title: Text(member.isOnline ? 'Mark offline' : 'Mark online'),
                onTap: () {
                  Navigator.of(context).pop();
                  controller
                      .upsertMember(
                        widget.detail.id,
                        member.copyWith(
                          isOnline: !member.isOnline,
                          lastActiveAt: DateTime.now(),
                        ),
                      )
                      .then((_) {
                    if (mounted) setState(() {});
                  });
                },
              ),
              ListTile(
                leading: const Icon(Icons.person_outline),
                title: const Text('Edit member profile'),
                onTap: () {
                  Navigator.of(context).pop();
                  _openMemberComposer(context, controller, existing: member);
                },
              ),
              ListTile(
                leading: const Icon(Icons.person_remove_alt_1_outlined, color: Colors.redAccent),
                title: const Text('Remove from community'),
                textColor: Colors.redAccent,
                onTap: () {
                  Navigator.of(context).pop();
                  controller.removeMember(widget.detail.id, member.id).then((_) {
                    if (mounted) setState(() {});
                  });
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  String _relativePresence(DateTime? timestamp) {
    if (timestamp == null) {
      return 'unknown';
    }
    final diff = DateTime.now().difference(timestamp);
    if (diff.inMinutes < 1) {
      return 'just now';
    }
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m';
    }
    if (diff.inHours < 24) {
      return '${diff.inHours}h';
    }
    if (diff.inDays < 7) {
      return '${diff.inDays}d';
    }
    final weeks = (diff.inDays / 7).floor();
    if (weeks < 5) {
      return '${weeks}w';
    }
    final months = (diff.inDays / 30).floor();
    if (months < 12) {
      return '${months}mo';
    }
    final years = (diff.inDays / 365).floor();
    return '${years}y';
  }

  Widget _buildAboutTab(
    BuildContext context,
    CommunityEngagementController controller,
    CommunityEngagementSnapshot snapshot,
  ) {
    final about = snapshot.about;
    return Column(
      key: const ValueKey('about'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.icon(
            onPressed: () => _openAboutEditor(context, controller, about),
            icon: const Icon(Icons.manage_history_outlined),
            label: const Text('Update about'),
          ),
        ),
        const SizedBox(height: 16),
        _AboutTile(
          icon: Icons.bolt_outlined,
          title: 'Mission',
          content: about.mission,
        ),
        const SizedBox(height: 12),
        _AboutTile(
          icon: Icons.auto_awesome,
          title: 'Vision',
          content: about.vision,
        ),
        const SizedBox(height: 12),
        _AboutListTile(
          icon: Icons.favorite_outline,
          title: 'Values we protect',
          items: about.values,
        ),
        const SizedBox(height: 12),
        _AboutListTile(
          icon: Icons.rocket_launch_outlined,
          title: 'Onboarding ritual',
          items: about.onboardingSteps,
        ),
        const SizedBox(height: 12),
        _AboutTile(
          icon: Icons.schedule_outlined,
          title: 'Livestream preset',
          content:
              'Platform: ${about.livestreamPreset.platform}\nLatency mode: ${about.livestreamPreset.latencyMode}\nDVR: ${about.livestreamPreset.enableDvr ? 'Enabled' : 'Disabled'} · Auto-archive: ${about.livestreamPreset.autoArchive ? 'On' : 'Off'}',
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _LinkChip(label: 'Website', value: about.website, icon: Icons.language_outlined),
            _LinkChip(label: 'Contact', value: about.contactEmail, icon: Icons.mail_outline),
            if (about.codeOfConductUrl.isNotEmpty)
              _LinkChip(label: 'Code of conduct', value: about.codeOfConductUrl, icon: Icons.rule_folder_outlined),
            if (about.partnerDeckUrl.isNotEmpty)
              _LinkChip(label: 'Partner deck', value: about.partnerDeckUrl, icon: Icons.slideshow_outlined),
            if (about.pressKitUrl.isNotEmpty)
              _LinkChip(label: 'Press kit', value: about.pressKitUrl, icon: Icons.collections_bookmark_outlined),
          ],
        ),
        const SizedBox(height: 16),
        Text('Maintained by ${about.lastUpdatedBy} · ${DateFormat('MMM d, h:mm a').format(about.lastUpdatedAt)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.indigo.shade700)),
      ],
    );
  }
  Future<void> _openChannelComposer(
    BuildContext context,
    CommunityEngagementController controller,
    CommunityEngagementSnapshot snapshot,
  ) async {
    final formKey = GlobalKey<FormState>();
    CommunityChatChannelType selectedType = CommunityChatChannelType.text;
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    bool isPrivate = false;
    bool allowsThreads = true;
    bool allowsVoice = true;
    bool allowsBroadcasts = true;
    Duration cooldown = const Duration(minutes: 2);
    final moderators = <String>{};
    final tagsController = TextEditingController();

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: StatefulBuilder(
            builder: (context, setModalState) {
              return SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Create channel', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: nameController,
                        decoration: const InputDecoration(labelText: 'Channel name'),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Name is required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: descriptionController,
                        decoration: const InputDecoration(labelText: 'Purpose / description'),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<CommunityChatChannelType>(
                        value: selectedType,
                        decoration: const InputDecoration(labelText: 'Channel type'),
                        items: CommunityChatChannelType.values
                            .map((type) => DropdownMenuItem(
                                  value: type,
                                  child: Text(type.displayName),
                                ))
                            .toList(),
                        onChanged: (value) => setModalState(() => selectedType = value ?? CommunityChatChannelType.text),
                      ),
                      const SizedBox(height: 12),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        value: isPrivate,
                        onChanged: (value) => setModalState(() => isPrivate = value),
                        title: const Text('Private membership'),
                        subtitle: const Text('Only invited members can join'),
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        value: allowsThreads,
                        onChanged: (value) => setModalState(() => allowsThreads = value),
                        title: const Text('Allow threaded replies'),
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        value: allowsVoice,
                        onChanged: (value) => setModalState(() => allowsVoice = value),
                        title: const Text('Enable voice lounges / live rooms'),
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        value: allowsBroadcasts,
                        onChanged: (value) => setModalState(() => allowsBroadcasts = value),
                        title: const Text('Allow broadcast-style announcements'),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<int>(
                        value: cooldown.inMinutes,
                        decoration: const InputDecoration(labelText: 'Slow mode cooldown (minutes)'),
                        items: const [1, 2, 5, 10, 15, 30]
                            .map((minutes) => DropdownMenuItem(value: minutes, child: Text('$minutes minutes')))
                            .toList(),
                        onChanged: (value) => setModalState(() => cooldown = Duration(minutes: value ?? 2)),
                      ),
                      const SizedBox(height: 12),
                      Autocomplete<String>(
                        optionsBuilder: (textEditingValue) {
                          final query = textEditingValue.text.trim().toLowerCase();
                          if (query.isEmpty) {
                            return const Iterable<String>.empty();
                          }
                          return snapshot.members
                              .where((member) => member.name.toLowerCase().contains(query))
                              .map((member) => member.name);
                        },
                        onSelected: (value) => setModalState(() => moderators.add(value)),
                        fieldViewBuilder: (context, controller, focusNode, onEditingComplete) {
                          return TextField(
                            controller: controller,
                            focusNode: focusNode,
                            decoration: const InputDecoration(
                              labelText: 'Add moderators',
                              hintText: 'Type a name and press enter',
                            ),
                            onSubmitted: (value) {
                              if (value.trim().isNotEmpty) {
                                setModalState(() => moderators.add(value.trim()));
                              }
                              controller.clear();
                            },
                          );
                        },
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: moderators
                            .map((name) => Chip(
                                  label: Text(name),
                                  onDeleted: () => setModalState(() => moderators.remove(name)),
                                ))
                            .toList(),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: tagsController,
                        decoration: const InputDecoration(
                          labelText: 'Channel tags',
                          helperText: 'Comma separated keywords (events, labs, outreach...)',
                        ),
                      ),
                      const SizedBox(height: 20),
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton(
                          onPressed: () {
                            if (formKey.currentState!.validate()) {
                              Navigator.of(context).pop(true);
                            }
                          },
                          child: const Text('Create channel'),
                        ),
                      )
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );

    if (result == true) {
      final tags = tagsController.text
          .split(',')
          .map((tag) => tag.trim())
          .where((tag) => tag.isNotEmpty)
          .toList();
      await controller.createChannel(
        widget.detail.id,
        CommunityChatChannelInput(
          name: nameController.text.trim(),
          description: descriptionController.text.trim(),
          type: selectedType,
          isPrivate: isPrivate,
          allowsThreads: allowsThreads,
          allowsVoiceSessions: allowsVoice,
          allowsBroadcasts: allowsBroadcasts,
          slowModeCooldown: cooldown,
          moderators: moderators,
          tags: tags,
        ),
      );
      setState(() {});
    }
  }
  Future<void> _openMemberComposer(
    BuildContext context,
    CommunityEngagementController controller, {
    CommunityMemberProfile? existing,
  }) async {
    final draft = CommunityMemberDraft(
      id: existing?.id,
      name: existing?.name ?? '',
      email: existing?.email ?? '',
      role: existing?.role ?? 'Member',
      status: existing?.status ?? CommunityMemberStatus.active,
      isModerator: existing?.isModerator ?? false,
      avatarUrl: existing?.avatarUrl ?? '',
      biography: existing?.biography ?? '',
      latitude: existing?.location.latitude,
      longitude: existing?.location.longitude,
      city: existing?.location.city ?? '',
      country: existing?.location.country ?? '',
      joinedAt: existing?.joinedAt,
      expertise: existing?.expertise ?? const <String>[],
      availability: existing?.availability ?? '',
      isOnline: existing?.isOnline ?? true,
      lastActiveAt: existing?.lastActiveAt,
    );
    final formKey = GlobalKey<FormState>();
    final expertiseController = TextEditingController(text: draft.expertise.join(', '));
    final joinedController = TextEditingController(
      text: draft.joinedAt != null ? DateFormat('yyyy-MM-dd').format(draft.joinedAt!) : '',
    );

    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: StatefulBuilder(
            builder: (context, setModalState) {
              return SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(existing == null ? 'Invite member' : 'Update member',
                          style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: draft.name,
                        decoration: const InputDecoration(labelText: 'Full name'),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Name is required' : null,
                        onChanged: (value) => draft.name = value,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: draft.email,
                        decoration: const InputDecoration(labelText: 'Email'),
                        validator: (value) => value == null || !value.contains('@') ? 'Valid email required' : null,
                        onChanged: (value) => draft.email = value,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: draft.role,
                        decoration: const InputDecoration(labelText: 'Role / title'),
                        onChanged: (value) => draft.role = value,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<CommunityMemberStatus>(
                        value: draft.status,
                        decoration: const InputDecoration(labelText: 'Status'),
                        items: CommunityMemberStatus.values
                            .map((status) => DropdownMenuItem(
                                  value: status,
                                  child: Text(status.displayName),
                                ))
                            .toList(),
                        onChanged: (value) => setModalState(() => draft.status = value ?? CommunityMemberStatus.active),
                      ),
                      SwitchListTile(
                        value: draft.isModerator,
                        onChanged: (value) => setModalState(() => draft.isModerator = value),
                        title: const Text('Grant moderator permissions'),
                      ),
                      SwitchListTile(
                        value: draft.isOnline,
                        onChanged: (value) => setModalState(() => draft.isOnline = value),
                        title: const Text('Show as online now'),
                        subtitle:
                            const Text('Toggle presence for the leaderboard, map highlights, and quick filters.'),
                      ),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.schedule_outlined),
                        title: const Text('Last active'),
                        subtitle: Text(
                          draft.lastActiveAt != null
                              ? DateFormat('MMM d, h:mm a').format(draft.lastActiveAt!)
                              : 'No recent activity recorded',
                        ),
                        trailing: TextButton(
                          onPressed: () async {
                            final initial = draft.lastActiveAt ?? DateTime.now();
                            final date = await showDatePicker(
                              context: context,
                              initialDate: initial,
                              firstDate: DateTime.now().subtract(const Duration(days: 365 * 5)),
                              lastDate: DateTime.now(),
                            );
                            if (date != null) {
                              final time = await showTimePicker(
                                context: context,
                                initialTime: TimeOfDay.fromDateTime(initial),
                              );
                              if (time != null) {
                                final combined = DateTime(
                                  date.year,
                                  date.month,
                                  date.day,
                                  time.hour,
                                  time.minute,
                                );
                                setModalState(() => draft.lastActiveAt = combined);
                              }
                            }
                          },
                          child: const Text('Change'),
                        ),
                        onTap: () async {
                          final initial = draft.lastActiveAt ?? DateTime.now();
                          final date = await showDatePicker(
                            context: context,
                            initialDate: initial,
                            firstDate: DateTime.now().subtract(const Duration(days: 365 * 5)),
                            lastDate: DateTime.now(),
                          );
                          if (date != null) {
                            final time = await showTimePicker(
                              context: context,
                              initialTime: TimeOfDay.fromDateTime(initial),
                            );
                            if (time != null) {
                              final combined = DateTime(
                                date.year,
                                date.month,
                                date.day,
                                time.hour,
                                time.minute,
                              );
                              setModalState(() => draft.lastActiveAt = combined);
                            }
                          }
                        },
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () => setModalState(() => draft.lastActiveAt = DateTime.now()),
                          child: const Text('Set to now'),
                        ),
                      ),
                      TextFormField(
                        initialValue: draft.avatarUrl,
                        decoration: const InputDecoration(labelText: 'Avatar URL (optional)'),
                        onChanged: (value) => draft.avatarUrl = value,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: draft.biography,
                        decoration: const InputDecoration(labelText: 'Bio'),
                        maxLines: 3,
                        onChanged: (value) => draft.biography = value,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: draft.city,
                              decoration: const InputDecoration(labelText: 'City'),
                              onChanged: (value) => draft.city = value,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              initialValue: draft.country,
                              decoration: const InputDecoration(labelText: 'Country'),
                              onChanged: (value) => draft.country = value,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: draft.latitude?.toStringAsFixed(4) ?? '',
                              decoration: const InputDecoration(labelText: 'Latitude'),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              onChanged: (value) => draft.latitude = double.tryParse(value),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              initialValue: draft.longitude?.toStringAsFixed(4) ?? '',
                              decoration: const InputDecoration(labelText: 'Longitude'),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              onChanged: (value) => draft.longitude = double.tryParse(value),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: expertiseController,
                        decoration: const InputDecoration(labelText: 'Expertise tags', helperText: 'Comma separated list'),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: joinedController,
                        decoration: const InputDecoration(labelText: 'Joined on (yyyy-mm-dd)'),
                        onTap: () async {
                          FocusScope.of(context).unfocus();
                          final now = DateTime.now();
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: draft.joinedAt ?? now,
                            firstDate: now.subtract(const Duration(days: 3650)),
                            lastDate: now,
                          );
                          if (picked != null) {
                            setModalState(() {
                              draft.joinedAt = picked;
                              joinedController.text = DateFormat('yyyy-MM-dd').format(picked);
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: draft.availability,
                        decoration: const InputDecoration(labelText: 'Availability'),
                        onChanged: (value) => draft.availability = value,
                      ),
                      const SizedBox(height: 20),
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton(
                          onPressed: () {
                            if (formKey.currentState!.validate()) {
                              draft.expertise = expertiseController.text
                                  .split(',')
                                  .map((entry) => entry.trim())
                                  .where((entry) => entry.isNotEmpty)
                                  .toList();
                              Navigator.of(context).pop(true);
                            }
                          },
                          child: Text(existing == null ? 'Invite' : 'Save changes'),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );

    if (submitted == true) {
      await controller.upsertMember(widget.detail.id, draft.toProfile());
      setState(() {});
    }
  }
  Future<void> _openAboutEditor(
    BuildContext context,
    CommunityEngagementController controller,
    CommunityAbout about,
  ) async {
    final missionController = TextEditingController(text: about.mission);
    final visionController = TextEditingController(text: about.vision);
    final valuesController = TextEditingController(text: about.values.join('\n'));
    final onboardingController = TextEditingController(text: about.onboardingSteps.join('\n'));
    final conductController = TextEditingController(text: about.codeOfConductUrl);
    final partnerController = TextEditingController(text: about.partnerDeckUrl);
    final contactController = TextEditingController(text: about.contactEmail);
    final websiteController = TextEditingController(text: about.website);
    final pressController = TextEditingController(text: about.pressKitUrl);
    final timeZoneController = TextEditingController(text: about.timeZone);
    final platformController = TextEditingController(text: about.livestreamPreset.platform);
    final latencyController = TextEditingController(text: about.livestreamPreset.latencyMode);
    bool enableDvr = about.livestreamPreset.enableDvr;
    bool autoArchive = about.livestreamPreset.autoArchive;

    final updated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: StatefulBuilder(
            builder: (context, setModalState) {
              return SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Update about section', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 16),
                    TextField(
                      controller: missionController,
                      decoration: const InputDecoration(labelText: 'Mission'),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: visionController,
                      decoration: const InputDecoration(labelText: 'Vision'),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: valuesController,
                      decoration: const InputDecoration(labelText: 'Values (one per line)'),
                      maxLines: 4,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: onboardingController,
                      decoration: const InputDecoration(labelText: 'Onboarding steps (one per line)'),
                      maxLines: 4,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: platformController,
                      decoration: const InputDecoration(labelText: 'Livestream platform'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: latencyController,
                      decoration: const InputDecoration(labelText: 'Latency mode'),
                    ),
                    SwitchListTile(
                      value: enableDvr,
                      title: const Text('Enable DVR'),
                      onChanged: (value) => setModalState(() => enableDvr = value),
                    ),
                    SwitchListTile(
                      value: autoArchive,
                      title: const Text('Auto archive livestreams'),
                      onChanged: (value) => setModalState(() => autoArchive = value),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: contactController,
                      decoration: const InputDecoration(labelText: 'Contact email'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: websiteController,
                      decoration: const InputDecoration(labelText: 'Website URL'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: conductController,
                      decoration: const InputDecoration(labelText: 'Code of conduct URL'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: partnerController,
                      decoration: const InputDecoration(labelText: 'Partner deck URL'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: pressController,
                      decoration: const InputDecoration(labelText: 'Press kit URL'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: timeZoneController,
                      decoration: const InputDecoration(labelText: 'Primary timezone'),
                    ),
                    const SizedBox(height: 20),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        child: const Text('Save about section'),
                      ),
                    )
                  ],
                ),
              );
            },
          ),
        );
      },
    );

    if (updated == true) {
      await controller.updateAbout(
        widget.detail.id,
        about.copyWith(
          mission: missionController.text.trim(),
          vision: visionController.text.trim(),
          values: valuesController.text.split('\n').map((line) => line.trim()).where((line) => line.isNotEmpty).toList(),
          onboardingSteps:
              onboardingController.text.split('\n').map((line) => line.trim()).where((line) => line.isNotEmpty).toList(),
          codeOfConductUrl: conductController.text.trim(),
          partnerDeckUrl: partnerController.text.trim(),
          contactEmail: contactController.text.trim(),
          website: websiteController.text.trim(),
          pressKitUrl: pressController.text.trim(),
          timeZone: timeZoneController.text.trim(),
          livestreamPreset: about.livestreamPreset.copyWith(
            platform: platformController.text.trim(),
            latencyMode: latencyController.text.trim(),
            enableDvr: enableDvr,
            autoArchive: autoArchive,
          ),
          lastUpdatedBy: 'Mobile steward',
          lastUpdatedAt: DateTime.now(),
        ),
      );
      setState(() {});
    }
  }
}

class _MemberStatSummary {
  const _MemberStatSummary({required this.count, required this.icon, required this.color});

  final int count;
  final IconData icon;
  final Color color;

  _MemberStatSummary copyWith({int? count, IconData? icon, Color? color}) {
    return _MemberStatSummary(
      count: count ?? this.count,
      icon: icon ?? this.icon,
      color: color ?? this.color,
    );
  }
}

class _ChannelCard extends ConsumerStatefulWidget {
  const _ChannelCard({
    required this.communityId,
    required this.channel,
    required this.messages,
    required this.controller,
    required this.defaultAuthor,
  });

  final String communityId;
  final CommunityChatChannel channel;
  final List<CommunityChatMessage> messages;
  final CommunityEngagementController controller;
  final CommunityMemberProfile defaultAuthor;

  @override
  ConsumerState<_ChannelCard> createState() => _ChannelCardState();
}

class _ChannelCardState extends ConsumerState<_ChannelCard> {
  late final TextEditingController _messageController;
  final List<CommunityMediaAttachment> _attachments = <CommunityMediaAttachment>[];
  bool _priority = false;
  bool _threaded = false;

  @override
  void initState() {
    super.initState();
    _messageController = TextEditingController();
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final channel = widget.channel;
    final messages = widget.messages;
    final headerColor = channel.type.badgeColor.withOpacity(0.12);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.indigo.shade100),
        boxShadow: const [
          BoxShadow(color: Color(0x0F000000), blurRadius: 18, offset: Offset(0, 8)),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: headerColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: channel.type.badgeColor.withOpacity(0.16),
                  child: Icon(channel.type.icon, color: channel.type.badgeColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(channel.name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(channel.description, style: Theme.of(context).textTheme.bodySmall),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          Chip(
                            padding: EdgeInsets.zero,
                            label: Text(channel.isPrivate ? 'Private' : 'Open'),
                          ),
                          Chip(
                            padding: EdgeInsets.zero,
                            label: Text('Slow mode ${channel.slowModeCooldown.inMinutes}m'),
                          ),
                          if (channel.tags.isNotEmpty)
                            ...channel.tags.map((tag) => Chip(label: Text(tag))).toList(),
                        ],
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    switch (value) {
                      case 'edit':
                        _openChannelEditor(context);
                        break;
                      case 'archive':
                        widget.controller.archiveChannel(widget.communityId, channel);
                        break;
                      case 'delete':
                        _confirmDeleteChannel(context);
                        break;
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(value: 'edit', child: Text('Edit channel')),
                    PopupMenuItem(value: 'archive', child: Text(channel.archived ? 'Unarchive' : 'Archive channel')),
                    const PopupMenuItem(value: 'delete', child: Text('Delete channel')),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (messages.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.indigo.shade50,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text('No conversations yet. Kick things off with a message.',
                        style: Theme.of(context).textTheme.bodyMedium),
                  )
                else
                  ...messages.take(4).map((message) => _buildMessageCard(context, message)),
                if (messages.length > 4)
                  TextButton.icon(
                    onPressed: () => _openMessageLog(context),
                    icon: const Icon(Icons.history_toggle_off),
                    label: Text('View full log (${messages.length})'),
                  ),
                const Divider(height: 28),
                _buildComposer(context),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildComposer(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _messageController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Share an update, resource, or win...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _attachments
              .map(
                (attachment) => Chip(
                  avatar: Icon(attachment.icon, color: attachment.color),
                  label: Text(attachment.description ?? attachment.url),
                  onDeleted: () => setState(() => _attachments.remove(attachment)),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            IconButton(
              tooltip: 'Add attachment',
              icon: const Icon(Icons.attach_file),
              onPressed: _addAttachment,
            ),
            IconButton(
              tooltip: 'Mark as priority broadcast',
              color: _priority ? Theme.of(context).colorScheme.primary : null,
              icon: const Icon(Icons.outlined_flag),
              onPressed: () => setState(() => _priority = !_priority),
            ),
            IconButton(
              tooltip: 'Start threaded conversation',
              color: _threaded ? Theme.of(context).colorScheme.primary : null,
              icon: const Icon(Icons.forum_outlined),
              onPressed: () => setState(() => _threaded = !_threaded),
            ),
            const Spacer(),
            FilledButton.icon(
              onPressed: _messageController.text.trim().isEmpty ? null : () => _submitMessage(context),
              icon: const Icon(Icons.send),
              label: const Text('Send'),
            ),
          ],
        )
      ],
    );
  }
  Widget _buildMessageCard(BuildContext context, CommunityChatMessage message) {
    final timestamp = DateFormat('MMM d, h:mm a').format(message.updatedAt);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(backgroundImage: NetworkImage(message.authorAvatarUrl)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(message.authorName,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                        ),
                        Text(timestamp, style: Theme.of(context).textTheme.bodySmall),
                        PopupMenuButton<String>(
                          onSelected: (value) {
                            switch (value) {
                              case 'edit':
                                _editMessage(context, message);
                                break;
                              case 'delete':
                                widget.controller.deleteMessage(widget.communityId, widget.channel, message);
                                break;
                            }
                          },
                          itemBuilder: (context) => const [
                            PopupMenuItem(value: 'edit', child: Text('Edit message')),
                            PopupMenuItem(value: 'delete', child: Text('Delete message')),
                          ],
                        ),
                      ],
                    ),
                    Text(message.authorRole, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
                    const SizedBox(height: 6),
                    Text(message.content),
                    if (message.attachments.isNotEmpty) const SizedBox(height: 8),
                    if (message.attachments.isNotEmpty)
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: message.attachments
                            .map(
                              (attachment) => Chip(
                                avatar: Icon(attachment.icon, color: attachment.color),
                                label: Text(attachment.description ?? attachment.url),
                              ),
                            )
                            .toList(),
                      ),
                    if (message.isPriority || message.isThreaded)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Wrap(
                          spacing: 8,
                          children: [
                            if (message.isPriority)
                              Chip(
                                label: const Text('Priority'),
                                backgroundColor: Colors.red.shade50,
                                avatar: const Icon(Icons.priority_high, size: 18, color: Colors.redAccent),
                              ),
                            if (message.isThreaded)
                              Chip(
                                label: const Text('Thread started'),
                                backgroundColor: Colors.blue.shade50,
                                avatar: const Icon(Icons.forum, size: 18, color: Colors.blueAccent),
                              ),
                          ],
                        ),
                      ),
                    if (message.reactions.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Wrap(
                          spacing: 6,
                          children: message.reactions.entries
                              .map((entry) => Chip(label: Text('${entry.key} ${entry.value}')))
                              .toList(),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _openMessageLog(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) {
        final messages = widget.messages;
        return SafeArea(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: messages.length,
            itemBuilder: (context, index) => _buildMessageCard(context, messages[index]),
          ),
        );
      },
    );
  }

  Future<void> _submitMessage(BuildContext context) async {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;
    await widget.controller.postMessage(
      widget.communityId,
      channel: widget.channel,
      input: CommunityChatMessageInput(
        authorName: widget.defaultAuthor.name,
        authorRole: widget.defaultAuthor.role,
        authorAvatarUrl: widget.defaultAuthor.avatarUrl,
        content: content,
        attachments: List<CommunityMediaAttachment>.from(_attachments),
        isPriority: _priority,
        isThreaded: _threaded,
        metadata: const {'source': 'mobile-app'},
      ),
    );
    setState(() {
      _messageController.clear();
      _attachments.clear();
      _priority = false;
      _threaded = false;
    });
  }

  Future<void> _addAttachment() async {
    final urlController = TextEditingController();
    final descriptionController = TextEditingController();
    CommunityMediaType type = CommunityMediaType.link;

    final attachment = await showDialog<CommunityMediaAttachment>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Add attachment'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: urlController,
                decoration: const InputDecoration(labelText: 'URL or reference'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(labelText: 'Label (optional)'),
              ),
              const SizedBox(height: 12),
              DropdownButton<CommunityMediaType>(
                value: type,
                onChanged: (value) => setState(() => type = value ?? CommunityMediaType.link),
                items: const [
                  DropdownMenuItem(value: CommunityMediaType.image, child: Text('Image')),
                  DropdownMenuItem(value: CommunityMediaType.video, child: Text('Video')),
                  DropdownMenuItem(value: CommunityMediaType.file, child: Text('File')),
                  DropdownMenuItem(value: CommunityMediaType.link, child: Text('Link')),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                if (urlController.text.trim().isNotEmpty) {
                  Navigator.of(context).pop(
                    CommunityMediaAttachment(
                      type: type,
                      url: urlController.text.trim(),
                      description: descriptionController.text.trim().isEmpty
                          ? null
                          : descriptionController.text.trim(),
                    ),
                  );
                }
              },
              child: const Text('Add'),
            )
          ],
        );
      },
    );

    if (attachment != null) {
      setState(() => _attachments.add(attachment));
    }
  }

  Future<void> _editMessage(BuildContext context, CommunityChatMessage message) async {
    final controller = TextEditingController(text: message.content);
    final attachments = List<CommunityMediaAttachment>.from(message.attachments);
    bool priority = message.isPriority;
    bool threaded = message.isThreaded;

    final updated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: StatefulBuilder(
            builder: (context, setModalState) {
              return SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Edit message', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 12),
                    TextField(
                      controller: controller,
                      maxLines: 4,
                      decoration: const InputDecoration(labelText: 'Message body'),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: attachments
                          .map((attachment) => Chip(
                                avatar: Icon(attachment.icon, color: attachment.color),
                                label: Text(attachment.description ?? attachment.url),
                                onDeleted: () => setModalState(() => attachments.remove(attachment)),
                              ))
                          .toList(),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        FilledButton.tonal(
                          onPressed: () async {
                            final added = await showDialog<CommunityMediaAttachment>(
                              context: context,
                              builder: (context) {
                                final urlController = TextEditingController();
                                final labelController = TextEditingController();
                                CommunityMediaType type = CommunityMediaType.link;
                                return AlertDialog(
                                  title: const Text('Add attachment'),
                                  content: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      TextField(
                                        controller: urlController,
                                        decoration: const InputDecoration(labelText: 'URL or file reference'),
                                      ),
                                      const SizedBox(height: 12),
                                      TextField(
                                        controller: labelController,
                                        decoration: const InputDecoration(labelText: 'Label (optional)'),
                                      ),
                                      DropdownButton<CommunityMediaType>(
                                        value: type,
                                        onChanged: (value) => setState(() => type = value ?? CommunityMediaType.link),
                                        items: const [
                                          DropdownMenuItem(value: CommunityMediaType.image, child: Text('Image')),
                                          DropdownMenuItem(value: CommunityMediaType.video, child: Text('Video')),
                                          DropdownMenuItem(value: CommunityMediaType.file, child: Text('File')),
                                          DropdownMenuItem(value: CommunityMediaType.link, child: Text('Link')),
                                        ],
                                      ),
                                    ],
                                  ),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
                                    FilledButton(
                                      onPressed: () {
                                        if (urlController.text.trim().isNotEmpty) {
                                          Navigator.of(context).pop(
                                            CommunityMediaAttachment(
                                              type: type,
                                              url: urlController.text.trim(),
                                              description: labelController.text.trim().isEmpty
                                                  ? null
                                                  : labelController.text.trim(),
                                            ),
                                          );
                                        }
                                      },
                                      child: const Text('Add'),
                                    )
                                  ],
                                );
                              },
                            );
                            if (added != null) {
                              setModalState(() => attachments.add(added));
                            }
                          },
                          icon: const Icon(Icons.attach_file),
                          label: const Text('Add attachment'),
                        ),
                        const Spacer(),
                        SwitchListTile(
                          value: priority,
                          title: const Text('Priority'),
                          onChanged: (value) => setModalState(() => priority = value),
                        ),
                        SwitchListTile(
                          value: threaded,
                          title: const Text('Threaded'),
                          onChanged: (value) => setModalState(() => threaded = value),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        child: const Text('Save changes'),
                      ),
                    )
                  ],
                ),
              );
            },
          ),
        );
      },
    );

    if (updated == true) {
      await widget.controller.updateMessage(
        widget.communityId,
        channel: widget.channel,
        message: message,
        input: CommunityChatMessageInput(
          authorName: message.authorName,
          authorRole: message.authorRole,
          authorAvatarUrl: message.authorAvatarUrl,
          content: controller.text.trim(),
          attachments: attachments,
          isPriority: priority,
          isThreaded: threaded,
          messageType: message.messageType,
          metadata: message.metadata,
          threadRootId: message.threadRootId,
          replyToMessageId: message.replyToMessageId,
        ),
      );
    }
  }

  Future<void> _openChannelEditor(BuildContext context) async {
    final channel = widget.channel;
    final nameController = TextEditingController(text: channel.name);
    final descriptionController = TextEditingController(text: channel.description);
    CommunityChatChannelType type = channel.type;
    bool isPrivate = channel.isPrivate;
    bool allowsThreads = channel.allowsThreads;
    bool allowsVoice = channel.allowsVoiceSessions;
    bool allowsBroadcasts = channel.allowsBroadcasts;
    Duration cooldown = channel.slowModeCooldown;
    final moderators = channel.moderators.toSet();
    final tagsController = TextEditingController(text: channel.tags.join(', '));

    final updated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: StatefulBuilder(
            builder: (context, setModalState) {
              return SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Edit channel', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 12),
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Name'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descriptionController,
                      decoration: const InputDecoration(labelText: 'Description'),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 12),
                    DropdownButton<CommunityChatChannelType>(
                      value: type,
                      onChanged: (value) => setModalState(() => type = value ?? channel.type),
                      items: CommunityChatChannelType.values
                          .map((type) => DropdownMenuItem(
                                value: type,
                                child: Text(type.displayName),
                              ))
                          .toList(),
                    ),
                    SwitchListTile(
                      value: isPrivate,
                      title: const Text('Private'),
                      onChanged: (value) => setModalState(() => isPrivate = value),
                    ),
                    SwitchListTile(
                      value: allowsThreads,
                      title: const Text('Allow threads'),
                      onChanged: (value) => setModalState(() => allowsThreads = value),
                    ),
                    SwitchListTile(
                      value: allowsVoice,
                      title: const Text('Voice sessions'),
                      onChanged: (value) => setModalState(() => allowsVoice = value),
                    ),
                    SwitchListTile(
                      value: allowsBroadcasts,
                      title: const Text('Broadcasts'),
                      onChanged: (value) => setModalState(() => allowsBroadcasts = value),
                    ),
                    DropdownButton<int>(
                      value: cooldown.inMinutes,
                      onChanged: (value) => setModalState(() => cooldown = Duration(minutes: value ?? 1)),
                      items: const [1, 2, 5, 10, 15, 30]
                          .map((minutes) => DropdownMenuItem(value: minutes, child: Text('$minutes minutes')))
                          .toList(),
                    ),
                    const SizedBox(height: 12),
                    Autocomplete<String>(
                      optionsBuilder: (textEditingValue) {
                        final query = textEditingValue.text.trim().toLowerCase();
                        if (query.isEmpty) return const Iterable<String>.empty();
                        return widget.controller
                            .snapshotFor(widget.communityId)!
                            .members
                            .where((member) => member.name.toLowerCase().contains(query))
                            .map((member) => member.name);
                      },
                      onSelected: (value) => setModalState(() => moderators.add(value)),
                      fieldViewBuilder: (context, controller, focusNode, onEditingComplete) {
                        return TextField(
                          controller: controller,
                          focusNode: focusNode,
                          decoration: const InputDecoration(labelText: 'Add moderator'),
                          onSubmitted: (value) {
                            if (value.trim().isNotEmpty) {
                              setModalState(() => moderators.add(value.trim()));
                            }
                            controller.clear();
                          },
                        );
                      },
                    ),
                    Wrap(
                      spacing: 8,
                      children: moderators
                          .map((name) => Chip(
                                label: Text(name),
                                onDeleted: () => setModalState(() => moderators.remove(name)),
                              ))
                          .toList(),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: tagsController,
                      decoration: const InputDecoration(labelText: 'Tags (comma separated)'),
                    ),
                    const SizedBox(height: 16),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        child: const Text('Save channel'),
                      ),
                    )
                  ],
                ),
              );
            },
          ),
        );
      },
    );

    if (updated == true) {
      await widget.controller.updateChannel(
        widget.communityId,
        channel,
        CommunityChatChannelInput(
          name: nameController.text.trim(),
          description: descriptionController.text.trim(),
          type: type,
          isPrivate: isPrivate,
          allowsThreads: allowsThreads,
          allowsVoiceSessions: allowsVoice,
          allowsBroadcasts: allowsBroadcasts,
          slowModeCooldown: cooldown,
          moderators: moderators,
          tags: tagsController.text
              .split(',')
              .map((tag) => tag.trim())
              .where((tag) => tag.isNotEmpty)
              .toList(),
        ),
      );
    }
  }

  Future<void> _confirmDeleteChannel(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete ${widget.channel.name}?'),
        content: const Text('Deleting a channel removes all of its messages. This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await widget.controller.deleteChannel(widget.communityId, widget.channel);
    }
  }
}
class _MemberCard extends StatelessWidget {
  const _MemberCard({
    required this.communityId,
    required this.member,
    required this.onEdit,
    required this.onRemove,
    required this.onToggleModerator,
    required this.onTogglePresence,
  });

  final String communityId;
  final CommunityMemberProfile member;
  final VoidCallback onEdit;
  final VoidCallback onRemove;
  final VoidCallback onToggleModerator;
  final VoidCallback onTogglePresence;

  @override
  Widget build(BuildContext context) {
    final tenure = DateTime.now().difference(member.joinedAt).inDays;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 14, offset: Offset(0, 6))],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(radius: 28, backgroundImage: NetworkImage(member.avatarUrl)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(member.name,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                        ),
                        PopupMenuButton<String>(
                          onSelected: (value) {
                            switch (value) {
                              case 'edit':
                                onEdit();
                                break;
                              case 'remove':
                                _confirmRemove(context);
                                break;
                            }
                          },
                          itemBuilder: (context) => const [
                            PopupMenuItem(value: 'edit', child: Text('Edit member')),
                            PopupMenuItem(value: 'remove', child: Text('Remove from community')),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('${member.role} · ${member.location.city}, ${member.location.country}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
                    const SizedBox(height: 8),
                    Text(member.biography, style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Chip(
                          avatar: Icon(
                            member.isOnline ? Icons.circle : Icons.schedule_outlined,
                            color: member.isOnline ? Colors.green : Colors.blueGrey,
                          ),
                          label: Text(
                            member.isOnline
                                ? 'Online now'
                                : 'Active ${_relativeTime(member.lastActiveAt)} ago',
                          ),
                          backgroundColor:
                              (member.isOnline ? Colors.green : Colors.blueGrey).withOpacity(0.12),
                          labelStyle: TextStyle(
                            color: member.isOnline ? Colors.green.shade800 : Colors.blueGrey.shade700,
                          ),
                        ),
                        Chip(
                          avatar: Icon(member.status.badgeColor == Colors.green
                              ? Icons.verified_user
                              : member.status == CommunityMemberStatus.pending
                                  ? Icons.hourglass_bottom
                                  : Icons.block),
                          label: Text(member.status.displayName),
                          backgroundColor: member.status.badgeColor.withOpacity(0.1),
                          labelStyle: TextStyle(color: member.status.badgeColor),
                        ),
                        Chip(label: Text('Tenure ${tenure ~/ 30} months')),
                        Chip(label: Text(member.availability)),
                        ...member.expertise.map((skill) => Chip(label: Text(skill))).toList(),
                      ],
                    ),
                    Row(
                      children: [
                        TextButton.icon(
                          onPressed: onTogglePresence,
                          icon: Icon(
                            member.isOnline ? Icons.toggle_on : Icons.toggle_off_outlined,
                            color: member.isOnline ? Colors.green : null,
                          ),
                          label: Text(member.isOnline ? 'Mark offline' : 'Mark online'),
                        ),
                        TextButton.icon(
                          onPressed: onToggleModerator,
                          icon: Icon(member.isModerator ? Icons.shield : Icons.shield_outlined),
                          label: Text(member.isModerator ? 'Moderator' : 'Promote to moderator'),
                        ),
                        TextButton.icon(
                          onPressed: onEdit,
                          icon: const Icon(Icons.edit_outlined),
                          label: const Text('Edit'),
                        ),
                        TextButton.icon(
                          onPressed: () => _confirmRemove(context),
                          icon: const Icon(Icons.person_remove_alt_1),
                          label: const Text('Remove'),
                        ),
                      ],
                    )
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _confirmRemove(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Remove ${member.name}?'),
        content: const Text('They will lose access to this community immediately.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      onRemove();
    }
  }

  String _relativeTime(DateTime? timestamp) {
    if (timestamp == null) {
      return 'unknown';
    }
    final diff = DateTime.now().difference(timestamp);
    if (diff.inMinutes < 1) {
      return 'just now';
    }
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m';
    }
    if (diff.inHours < 24) {
      return '${diff.inHours}h';
    }
    if (diff.inDays < 7) {
      return '${diff.inDays}d';
    }
    final weeks = (diff.inDays / 7).floor();
    if (weeks < 5) {
      return '${weeks}w';
    }
    final months = (diff.inDays / 30).floor();
    if (months < 12) {
      return '${months}mo';
    }
    final years = (diff.inDays / 365).floor();
    return '${years}y';
  }
}

class _AboutTile extends StatelessWidget {
  const _AboutTile({required this.icon, required this.title, required this.content});

  final IconData icon;
  final String title;
  final String content;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Text(content, style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.4)),
              ],
            ),
          )
        ],
      ),
    );
  }
}

class _AboutListTile extends StatelessWidget {
  const _AboutListTile({required this.icon, required this.title, required this.items});

  final IconData icon;
  final String title;
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                ...items
                    .map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('• '),
                            Expanded(child: Text(item, style: Theme.of(context).textTheme.bodyMedium)),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LinkChip extends StatelessWidget {
  const _LinkChip({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InputChip(
      avatar: Icon(icon, color: theme.colorScheme.primary),
      label: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary)),
          Text(value.isEmpty ? 'Not configured' : value, style: theme.textTheme.bodyMedium),
        ],
      ),
      onPressed: value.isEmpty
          ? null
          : () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Launching $value')), // placeholder for actual launch
              );
            },
    );
  }
}
