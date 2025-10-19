import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/models/community_models.dart';
import '../core/state/community/community_controllers.dart';
import 'community_profile_screen.dart';
import 'community_switcher_screen.dart';

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _submittingComposer = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() {
    return ref.read(communityFeedControllerProvider.notifier).refresh();
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
        ),
      );
  }

  Future<void> _openComposer({FeedPost? editing}) async {
    final communitiesAsync = ref.read(communityDirectoryControllerProvider);
    final communities = communitiesAsync.value ?? const <CommunityModel>[];
    if (communities.isEmpty) {
      _showSnack('Create a community before posting updates.');
      return;
    }
    final activeCommunityId = editing?.communityId ?? ref.read(activeCommunityProvider) ?? communities.first.id;
    final messageController = TextEditingController(text: editing?.message ?? '');
    final mediaController = TextEditingController(text: editing?.mediaUrl ?? '');
    final authorController = TextEditingController(text: editing?.authorName ?? 'You');
    final roleController = TextEditingController(text: editing?.authorRole ?? 'Community Member');
    final tagController = TextEditingController();
    final Set<String> tags = {...(editing?.tags ?? const <String>[])};
    String selectedCommunity = activeCommunityId;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: StatefulBuilder(
            builder: (context, setModalState) {
              Future<void> handleSubmit() async {
                final message = messageController.text.trim();
                if (message.isEmpty) {
                  _showSnack('Share an update before publishing.');
                  return;
                }
                final draft = FeedPostDraft(
                  communityId: selectedCommunity,
                  message: message,
                  tags: tags.toList(growable: false),
                  mediaUrl: mediaController.text.trim().isEmpty ? null : mediaController.text.trim(),
                  authorName: authorController.text.trim().isEmpty ? 'You' : authorController.text.trim(),
                  authorRole: roleController.text.trim().isEmpty ? 'Community Member' : roleController.text.trim(),
                );
                setState(() {
                  _submittingComposer = true;
                });
                try {
                  if (editing == null) {
                    await ref.read(communityFeedControllerProvider.notifier).createPost(draft);
                    _showSnack('Post published to the community feed.');
                  } else {
                    await ref.read(communityFeedControllerProvider.notifier).updatePost(editing.id, draft);
                    _showSnack('Post updated successfully.');
                  }
                  if (mounted) {
                    Navigator.of(context).maybePop();
                  }
                } catch (error) {
                  _showSnack('Unable to publish post: $error');
                } finally {
                  if (mounted) {
                    setState(() {
                      _submittingComposer = false;
                    });
                  }
                }
              }

              void handleAddTag() {
                final tag = tagController.text.trim();
                if (tag.isEmpty) return;
                setModalState(() {
                  tags.add(tag);
                  tagController.clear();
                });
              }

              return SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          editing == null ? 'Share an update' : 'Edit post',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close),
                          tooltip: 'Close',
                          onPressed: () => Navigator.of(context).maybePop(),
                        )
                      ],
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: selectedCommunity,
                      decoration: const InputDecoration(
                        labelText: 'Post to community',
                        border: OutlineInputBorder(),
                      ),
                      items: [
                        for (final community in communities)
                          DropdownMenuItem<String>(
                            value: community.id,
                            child: Text(community.name),
                          ),
                      ],
                      onChanged: (value) {
                        if (value == null) return;
                        setModalState(() {
                          selectedCommunity = value;
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: authorController,
                      decoration: const InputDecoration(
                        labelText: 'Display name',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: roleController,
                      decoration: const InputDecoration(
                        labelText: 'Role or team',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: messageController,
                      maxLines: 6,
                      decoration: const InputDecoration(
                        labelText: 'What would you like to share?',
                        border: OutlineInputBorder(),
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: mediaController,
                      decoration: const InputDecoration(
                        labelText: 'Cover image or video URL (optional)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: tagController,
                      decoration: InputDecoration(
                        labelText: 'Add tag',
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.add),
                          onPressed: handleAddTag,
                        ),
                        border: const OutlineInputBorder(),
                      ),
                      onSubmitted: (_) => handleAddTag(),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final tag in tags)
                          Chip(
                            label: Text(tag),
                            onDeleted: () {
                              setModalState(() {
                                tags.remove(tag);
                              });
                            },
                          ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        icon: _submittingComposer
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.send),
                        onPressed: _submittingComposer ? null : handleSubmit,
                        label: Text(editing == null ? 'Publish update' : 'Save changes'),
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
  }

  void _openCommunitySwitcher() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => const CommunitySwitcherScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final feedAsync = ref.watch(communityFeedControllerProvider);
    final communitiesAsync = ref.watch(communityDirectoryControllerProvider);
    final activeCommunityId = ref.watch(activeCommunityProvider);
    final filter = ref.watch(feedFilterProvider);
    final tagCatalogueAsync = ref.watch(feedTagCatalogueProvider);

    if (_searchController.text != filter.query) {
      _searchController.text = filter.query;
      _searchController.selection = TextSelection.fromPosition(
        TextPosition(offset: _searchController.text.length),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live feed'),
        actions: [
          IconButton(
            icon: const Icon(Icons.swap_horiz_rounded),
            tooltip: 'Switch community',
            onPressed: _openCommunitySwitcher,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _submittingComposer ? null : _openComposer,
        icon: const Icon(Icons.edit_outlined),
        label: const Text('New post'),
      ),
      body: RefreshIndicator(
        onRefresh: _onRefresh,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildComposerHero(filter, activeCommunityId, communitiesAsync.value ?? const []),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _searchController,
                      textInputAction: TextInputAction.search,
                      onSubmitted: (value) {
                        ref.read(feedFilterProvider.notifier).state =
                            filter.copyWith(query: value.trim());
                      },
                      decoration: InputDecoration(
                        hintText: 'Search updates, tags, or members',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: filter.query.isEmpty
                            ? null
                            : IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  ref.read(feedFilterProvider.notifier).state =
                                      filter.copyWith(query: '', tags: <String>{});
                                },
                              ),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildScopeSelector(filter, activeCommunityId, communitiesAsync.value ?? const []),
                    const SizedBox(height: 16),
                    tagCatalogueAsync.when(
                      data: (tags) => Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final tag in tags.toList()..sort())
                            FilterChip(
                              label: Text('#$tag'),
                              selected: filter.tags.contains(tag),
                              onSelected: (_) => _toggleTag(tag),
                            ),
                        ],
                      ),
                      loading: () => const Center(child: CircularProgressIndicator()),
                      error: (error, _) => Text('Unable to load tags: $error'),
                    ),
                  ],
                ),
              ),
            ),
            feedAsync.when(
              data: (posts) {
                if (posts.isEmpty) {
                  return SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.forum_outlined, size: 48),
                          const SizedBox(height: 12),
                          Text(
                            'No updates to show just yet',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          const Text('Start a conversation with your community to see it here.'),
                        ],
                      ),
                    ),
                  );
                }
                return SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final post = posts[index];
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: _FeedPostCard(
                          post: post,
                          onEdit: () => _openComposer(editing: post),
                          onDelete: () async {
                            final confirmed = await showDialog<bool>(
                              context: context,
                              builder: (context) {
                                return AlertDialog(
                                  title: const Text('Remove post'),
                                  content: const Text('Are you sure you want to remove this update from the feed?'),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.of(context).pop(false),
                                      child: const Text('Cancel'),
                                    ),
                                    FilledButton(
                                      onPressed: () => Navigator.of(context).pop(true),
                                      child: const Text('Remove'),
                                    ),
                                  ],
                                );
                              },
                            );
                            if (confirmed == true) {
                              await ref
                                  .read(communityFeedControllerProvider.notifier)
                                  .deletePost(post.id);
                              _showSnack('Post removed.');
                            }
                          },
                        ),
                      );
                    },
                    childCount: posts.length,
                  ),
                );
              },
              loading: () => const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, stackTrace) => SliverFillRemaining(
                hasScrollBody: false,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48),
                      const SizedBox(height: 12),
                      Text(
                        'We could not load the feed',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '$error',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _onRefresh,
                        child: const Text('Retry'),
                      )
                    ],
                  ),
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }

  Widget _buildComposerHero(FeedFilter filter, String? activeCommunityId, List<CommunityModel> communities) {
    final communityName = filter.scope == FeedScope.activeCommunity
        ? communities.firstWhere(
            (element) => element.id == (filter.communityId ?? activeCommunityId),
            orElse: () => communities.isNotEmpty
                ? communities.first
                : CommunityModel(
                    id: 'placeholder',
                    name: 'Community',
                    description: '',
                    bannerImage: '',
                    accentColor: '#ffffff',
                    tags: const <String>[],
                    memberCount: 0,
                    joined: true,
                    members: const <CommunityMember>[],
                    events: const <CommunityEvent>[],
                  ),
          ).name
        : 'Global audience';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          colors: [
            Theme.of(context).colorScheme.primary.withOpacity(0.08),
            Theme.of(context).colorScheme.primary.withOpacity(0.02),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Ready to engage?',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            filter.scope == FeedScope.activeCommunity
                ? 'Share a note with members in $communityName.'
                : 'Broadcast across every community you are part of.',
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _openComposer,
            icon: const Icon(Icons.bolt_outlined),
            label: const Text('Compose update'),
          ),
        ],
      ),
    );
  }

  Widget _buildScopeSelector(FeedFilter filter, String? activeCommunityId, List<CommunityModel> communities) {
    final activeCommunityName = communities.firstWhere(
      (element) => element.id == (filter.communityId ?? activeCommunityId),
      orElse: () => communities.isNotEmpty ? communities.first : null,
    )?.name;
    return SegmentedButton<FeedScope>(
      segments: [
        const ButtonSegment<FeedScope>(value: FeedScope.all, label: Text('All communities'), icon: Icon(Icons.public)),
        ButtonSegment<FeedScope>(
          value: FeedScope.activeCommunity,
          label: Text(
            activeCommunityName == null ? 'My community' : 'My community · $activeCommunityName',
          ),
          icon: const Icon(Icons.groups_2_outlined),
        ),
        const ButtonSegment<FeedScope>(
          value: FeedScope.bookmarked,
          label: Text('Saved'),
          icon: Icon(Icons.bookmark_outline),
        ),
      ],
      selected: {filter.scope},
      onSelectionChanged: (selection) {
        final scope = selection.first;
        final controller = ref.read(feedFilterProvider.notifier);
        if (scope == FeedScope.activeCommunity) {
          final fallback = filter.communityId ?? activeCommunityId ?? (communities.isNotEmpty ? communities.first.id : null);
          controller.state = filter.copyWith(scope: scope, communityId: fallback);
        } else {
          controller.state = filter.copyWith(scope: scope);
        }
      },
    );
  }

  void _toggleTag(String tag) {
    final controller = ref.read(feedFilterProvider.notifier);
    final tags = controller.state.tags.toSet();
    if (tags.contains(tag)) {
      tags.remove(tag);
    } else {
      tags.add(tag);
    }
    controller.state = controller.state.copyWith(tags: tags);
  }
}

class _FeedPostCard extends ConsumerWidget {
  const _FeedPostCard({
    required this.post,
    required this.onEdit,
    required this.onDelete,
  });

  final FeedPost post;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final communityDirectory = ref.watch(communityDirectoryControllerProvider);
    final community = communityDirectory.value?.firstWhere(
      (element) => element.id == post.communityId,
      orElse: () => null,
    );

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            leading: CircleAvatar(backgroundImage: NetworkImage(post.authorAvatar)),
            title: Text(post.authorName),
            subtitle: Text('${post.authorRole} · ${DateFormat('MMM d, h:mm a').format(post.createdAt)}'),
            trailing: PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'edit':
                    onEdit();
                    break;
                  case 'delete':
                    onDelete();
                    break;
                  case 'view-community':
                    if (community != null) {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => CommunityProfileScreen(communityId: community.id),
                        ),
                      );
                    }
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem<String>(
                  value: 'edit',
                  child: ListTile(leading: Icon(Icons.edit_outlined), title: Text('Edit post')),
                ),
                const PopupMenuItem<String>(
                  value: 'delete',
                  child: ListTile(leading: Icon(Icons.delete_outline), title: Text('Delete post')),
                ),
                const PopupMenuItem<String>(
                  value: 'view-community',
                  child: ListTile(leading: Icon(Icons.group_outlined), title: Text('Open community profile')),
                ),
              ],
            ),
          ),
          if (post.mediaUrl != null)
            FeedMediaPreview(
              mediaUrl: post.mediaUrl!,
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (community != null)
                  Text(
                    community.name,
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(color: Theme.of(context).colorScheme.primary),
                  ),
                const SizedBox(height: 8),
                Text(post.message, style: Theme.of(context).textTheme.bodyLarge),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final tag in post.tags)
                      Chip(
                        label: Text('#$tag'),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    IconButton(
                      icon: Icon(post.liked ? Icons.favorite : Icons.favorite_border),
                      color: post.liked ? Theme.of(context).colorScheme.secondary : null,
                      onPressed: () => ref.read(communityFeedControllerProvider.notifier).toggleReaction(post.id),
                    ),
                    Text('${post.reactionCount}'),
                    const SizedBox(width: 16),
                    IconButton(
                      icon: Icon(post.bookmarked ? Icons.bookmark : Icons.bookmark_border),
                      onPressed: () => ref.read(communityFeedControllerProvider.notifier).toggleBookmark(post.id),
                    ),
                    const SizedBox(width: 16),
                    IconButton(
                      icon: const Icon(Icons.comment_outlined),
                      onPressed: () {},
                    ),
                    Text('${post.comments.length}'),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => CommunityProfileScreen(communityId: post.communityId),
                        ),
                      ),
                      icon: const Icon(Icons.arrow_outward_rounded),
                      label: const Text('Open space'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _CommentComposer(
                  onSubmit: (value) => ref
                      .read(communityFeedControllerProvider.notifier)
                      .addComment(post.id, const FeedCommentDraft(), value),
                ),
                const SizedBox(height: 12),
                for (final comment in post.comments)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CircleAvatar(radius: 16, backgroundImage: NetworkImage(comment.authorAvatar)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      comment.authorName,
                                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                  Text(DateFormat('MMM d, h:mm a').format(comment.createdAt),
                                      style: Theme.of(context).textTheme.bodySmall),
                                  IconButton(
                                    icon: const Icon(Icons.more_horiz, size: 18),
                                    onPressed: () async {
                                      final shouldDelete = await showDialog<bool>(
                                        context: context,
                                        builder: (context) {
                                          return AlertDialog(
                                            title: const Text('Remove comment'),
                                            content: const Text('Do you want to delete this comment?'),
                                            actions: [
                                              TextButton(
                                                onPressed: () => Navigator.of(context).pop(false),
                                                child: const Text('Cancel'),
                                              ),
                                              FilledButton(
                                                onPressed: () => Navigator.of(context).pop(true),
                                                child: const Text('Delete'),
                                              )
                                            ],
                                          );
                                        },
                                      );
                                      if (shouldDelete == true) {
                                        await ref
                                            .read(communityFeedControllerProvider.notifier)
                                            .removeComment(post.id, comment.id);
                                      }
                                    },
                                  )
                                ],
                              ),
                              Text(comment.message),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          )
        ],
      ),
    );
  }
}

class FeedMediaPreview extends StatefulWidget {
  const FeedMediaPreview({super.key, required this.mediaUrl});

  final String mediaUrl;

  @override
  State<FeedMediaPreview> createState() => _FeedMediaPreviewState();
}

class _FeedMediaPreviewState extends State<FeedMediaPreview> {
  static final RegExp _videoPattern =
      RegExp(r'\.(mp4|mov|m4v|webm|avi|mkv)$', caseSensitive: false);
  bool _launching = false;

  bool get _isVideo => _videoPattern.hasMatch(widget.mediaUrl);

  Future<void> _openMedia() async {
    final uri = Uri.tryParse(widget.mediaUrl);
    if (uri == null) {
      _showError('Media link is invalid.');
      return;
    }
    setState(() {
      _launching = true;
    });
    try {
      final launched =
          await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        _showError('Unable to open media link.');
      }
    } catch (error) {
      _showError('Unable to open media: $error');
    } finally {
      if (mounted) {
        setState(() {
          _launching = false;
        });
      }
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          _isVideo
              ? _buildVideoPlaceholder(context)
              : _buildImagePreview(context),
          if (_launching)
            Container(
              color: Colors.black26,
              child: const Center(
                child: CircularProgressIndicator.adaptive(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildImagePreview(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _openMedia,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Positioned.fill(
              child: Image.network(
                widget.mediaUrl,
                fit: BoxFit.cover,
                loadingBuilder: (context, child, progress) {
                  if (progress == null) return child;
                  final total = progress.expectedTotalBytes;
                  final loaded = progress.cumulativeBytesLoaded;
                  return Container(
                    color: Theme.of(context).colorScheme.surfaceVariant,
                    child: Center(
                      child: CircularProgressIndicator(
                        value: total != null ? loaded / total : null,
                      ),
                    ),
                  );
                },
                errorBuilder: (context, error, stackTrace) => _buildFallback(
                  context,
                  Icons.image_not_supported_outlined,
                  'Preview unavailable',
                ),
              ),
            ),
            Positioned(
              right: 12,
              bottom: 12,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.55),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.open_in_new_rounded,
                          size: 16, color: Colors.white),
                      SizedBox(width: 6),
                      Text(
                        'Open media',
                        style: TextStyle(color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVideoPlaceholder(BuildContext context) {
    final gradient = LinearGradient(
      colors: [
        Theme.of(context).colorScheme.primary.withOpacity(0.65),
        Theme.of(context).colorScheme.secondary.withOpacity(0.65),
      ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _openMedia,
        child: Container(
          decoration: BoxDecoration(gradient: gradient),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Icon(
                Icons.play_circle_fill,
                size: 72,
                color: Colors.white.withOpacity(0.92),
              ),
              Positioned(
                bottom: 18,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.9),
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    child: Text(
                      'Tap to launch video',
                      style: Theme.of(context)
                          .textTheme
                          .labelLarge
                          ?.copyWith(color: Colors.black87),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFallback(
    BuildContext context,
    IconData icon,
    String label,
  ) {
    return Container(
      color: Theme.of(context).colorScheme.surfaceVariant,
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon,
              size: 40,
              color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(height: 8),
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

class _CommentComposer extends StatefulWidget {
  const _CommentComposer({required this.onSubmit});

  final Future<void> Function(String value) onSubmit;

  @override
  State<_CommentComposer> createState() => _CommentComposerState();
}

class _CommentComposerState extends State<_CommentComposer> {
  final TextEditingController _controller = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final message = _controller.text.trim();
    if (message.isEmpty || _sending) return;
    setState(() {
      _sending = true;
    });
    try {
      await widget.onSubmit(message);
      _controller.clear();
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            decoration: const InputDecoration(
              hintText: 'Write a comment…',
              border: OutlineInputBorder(),
            ),
            onSubmitted: (_) => _submit(),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          icon: _sending
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.send),
          onPressed: _sending ? null : _submit,
        ),
      ],
    );
  }
}
