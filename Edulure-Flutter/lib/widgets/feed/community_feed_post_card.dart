import 'package:flutter/material.dart';

import '../../services/community_hub_models.dart';
import '../../services/community_service.dart';
import '../../services/live_feed_service.dart';
import '../feed_entry_card.dart';

FeedEntry mapCommunityFeedPostToFeedEntry(
  CommunityFeedPost post, {
  CommunitySummary? community,
}) {
  final authorId = post.author.isEmpty
      ? 'legacy-author'
      : post.author
          .toLowerCase()
          .replaceAll(RegExp('[^a-z0-9]+'), '-')
          .replaceAll(RegExp('-{2,}'), '-')
          .trim()
          .replaceAll(RegExp(r'^-|-$'), '');

  final metadata = <String, dynamic>{};
  if (post.attachmentUrls.isNotEmpty) {
    metadata['attachments'] = post.attachmentUrls.join(', ');
  }
  if (post.coverImageUrl != null && post.coverImageUrl!.isNotEmpty) {
    metadata['media'] = {'imageUrl': post.coverImageUrl};
  }

  final communityReference = community != null
      ? CommunityReference(id: community.id, name: community.name, slug: community.slug)
      : post.communityId != null
          ? CommunityReference(id: post.communityId!, name: 'Community', slug: post.communityId!)
          : null;

  final communityPost = CommunityPost(
    id: post.id,
    type: 'update',
    body: post.body,
    publishedAt: post.updatedAt,
    scheduledAt: null,
    status: 'published',
    visibility: 'members',
    author: CommunityMemberSummary(
      id: authorId.isEmpty ? 'legacy-author' : authorId,
      name: post.author.isEmpty ? 'Community member' : post.author,
      role: 'Member',
      avatarUrl: '',
    ),
    title: post.title,
    tags: post.tags,
    channel: null,
    community: communityReference,
    metadata: metadata,
    stats: CommunityPostStats(reactions: post.likes, comments: 0),
    moderation: const CommunityPostModeration(),
  );

  return FeedEntry(kind: FeedEntryKind.post, post: communityPost);
}

class CommunityFeedPostCard extends StatelessWidget {
  const CommunityFeedPostCard({
    super.key,
    required this.post,
    required this.onEdit,
    required this.onDelete,
    required this.onTogglePin,
    required this.onShare,
    this.community,
  });

  final CommunityFeedPost post;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onTogglePin;
  final VoidCallback onShare;
  final CommunitySummary? community;

  @override
  Widget build(BuildContext context) {
    final entry = mapCommunityFeedPostToFeedEntry(post, community: community);
    return Stack(
      children: [
        FeedEntryCard(
          entry: entry,
          showCommunity: community != null,
          community: community,
          headerAction: IconButton(
            tooltip: post.pinned ? 'Unpin post' : 'Pin post',
            onPressed: onTogglePin,
            icon: Icon(post.pinned ? Icons.push_pin : Icons.push_pin_outlined),
          ),
          footerActions: [
            FilledButton.tonalIcon(
              onPressed: onShare,
              icon: const Icon(Icons.share_outlined),
              label: const Text('Share'),
            ),
            TextButton.icon(
              onPressed: onEdit,
              icon: const Icon(Icons.edit_outlined),
              label: const Text('Edit'),
            ),
            TextButton.icon(
              onPressed: onDelete,
              icon: const Icon(Icons.delete_outline),
              label: const Text('Delete'),
            ),
          ],
        ),
        if (post.pinned)
          Positioned(
            top: 12,
            left: 12,
            child: Chip(
              avatar: const Icon(Icons.star_rate_rounded, size: 16),
              label: const Text('Pinned'),
              visualDensity: VisualDensity.compact,
            ),
          ),
      ],
    );
  }
}
