import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/community_service.dart';
import '../services/live_feed_service.dart';

class FeedEntryCard extends StatelessWidget {
  const FeedEntryCard({
    super.key,
    required this.entry,
    this.onEdit,
    this.onArchive,
    this.onModerate,
    this.onRestore,
    this.onViewCommunity,
    this.showCommunity = true,
    this.community,
  });

  final FeedEntry entry;
  final VoidCallback? onEdit;
  final VoidCallback? onArchive;
  final VoidCallback? onModerate;
  final VoidCallback? onRestore;
  final VoidCallback? onViewCommunity;
  final bool showCommunity;
  final CommunitySummary? community;

  @override
  Widget build(BuildContext context) {
    switch (entry.kind) {
      case FeedEntryKind.post:
        final post = entry.post!;
        return Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          elevation: 0,
          margin: EdgeInsets.zero,
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildPostHeader(context, post),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: _buildPostBody(context, post),
              ),
              if (_hasMedia(post)) _buildMediaSection(context, post),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (post.tags.isNotEmpty) _buildTags(post.tags, context),
                    const SizedBox(height: 12),
                    _buildStats(context, post),
                    if (post.metadata.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _buildMetadata(context, post),
                    ],
                  ],
                ),
              )
            ],
          ),
        );
      case FeedEntryKind.ad:
        final ad = entry.ad!;
        return Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          margin: EdgeInsets.zero,
          color: const Color(0xFF0B1120),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    Chip(
                      label: Text('Sponsored'),
                      avatar: Icon(Icons.auto_graph, size: 16),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  ad.headline,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
                ),
                if (ad.description != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    ad.description!,
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: Colors.white70, height: 1.4),
                  ),
                ],
                if (ad.ctaUrl != null && ad.ctaUrl!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => _openExternalUrl(context, ad.ctaUrl!),
                    style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.black),
                    child: const Text('Open campaign'),
                  )
                ]
              ],
            ),
          ),
        );
    }
  }

  Widget _buildPostHeader(BuildContext context, CommunityPost post) {
    final time = post.publishedAt ?? post.scheduledAt;
    final formatter = DateFormat('MMM d • HH:mm');
    final timeLabel = time != null ? formatter.format(time) : 'Unscheduled';
    final menuItems = <PopupMenuEntry<String>>[];
    if (onEdit != null) {
      menuItems.add(const PopupMenuItem(value: 'edit', child: Text('Edit post')));
    }
    if (onArchive != null) {
      menuItems.add(const PopupMenuItem(value: 'archive', child: Text('Archive post')));
    }
    if (onModerate != null) {
      menuItems.add(const PopupMenuItem(value: 'suppress', child: Text('Suppress post')));
    }
    if (onRestore != null) {
      menuItems.add(const PopupMenuItem(value: 'restore', child: Text('Restore post')));
    }

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      leading: CircleAvatar(
        radius: 24,
        backgroundImage: post.author.avatarUrl.isNotEmpty
            ? NetworkImage(post.author.avatarUrl)
            : null,
        child: post.author.avatarUrl.isEmpty
            ? Text(post.author.name.isNotEmpty ? post.author.name.characters.first.toUpperCase() : '?')
            : null,
      ),
      title: Text(
        post.author.name,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(post.author.role, style: Theme.of(context).textTheme.bodySmall),
          Text(timeLabel, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
          if (showCommunity && post.community != null)
            InkWell(
              onTap: onViewCommunity,
              child: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  post.community!.name,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: Theme.of(context).colorScheme.primary),
                ),
              ),
            ),
        ],
      ),
      trailing: menuItems.isEmpty
          ? null
          : PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'edit':
                    onEdit?.call();
                    break;
                  case 'archive':
                    onArchive?.call();
                    break;
                  case 'suppress':
                    onModerate?.call();
                    break;
                  case 'restore':
                    onRestore?.call();
                    break;
                }
              },
              itemBuilder: (_) => menuItems,
            ),
    );
  }

  Widget _buildPostBody(BuildContext context, CommunityPost post) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (post.title != null && post.title!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              post.title!,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600, color: const Color(0xFF1F2937)),
            ),
          ),
        Text(
          post.body,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.42),
        ),
      ],
    );
  }

  bool _hasMedia(CommunityPost post) {
    final media = post.metadata['media'];
    if (media is Map && media['imageUrl'] is String && (media['imageUrl'] as String).isNotEmpty) {
      return true;
    }
    if (media is Map && media['videoUrl'] is String && (media['videoUrl'] as String).isNotEmpty) {
      return true;
    }
    return false;
  }

  Widget _buildMediaSection(BuildContext context, CommunityPost post) {
    final media = post.metadata['media'];
    final imageUrl = media is Map && media['imageUrl'] is String ? media['imageUrl'] as String : null;
    final videoUrl = media is Map && media['videoUrl'] is String ? media['videoUrl'] as String : null;
    return Padding(
      padding: const EdgeInsets.only(left: 20, right: 20, bottom: 16, top: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (imageUrl != null && imageUrl.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) {
                  return Container(
                    color: Colors.grey.shade100,
                    child: const Center(child: Icon(Icons.image_not_supported_outlined)),
                  );
                }),
              ),
            ),
          if (videoUrl != null && videoUrl.isNotEmpty) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => _openExternalUrl(context, videoUrl),
              icon: const Icon(Icons.play_circle_outline),
              label: const Text('Open linked video'),
            )
          ],
        ],
      ),
    );
  }

  Widget _buildTags(List<String> tags, BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: tags
          .map(
            (tag) => Chip(
              label: Text('#$tag'),
              side: BorderSide(color: Theme.of(context).colorScheme.primary.withOpacity(0.3)),
              backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.08),
            ),
          )
          .toList(),
    );
  }

  Widget _buildStats(BuildContext context, CommunityPost post) {
    final chips = <Widget>[
      _StatChip(icon: Icons.thumb_up_alt_outlined, label: '${post.stats.reactions} reactions'),
      _StatChip(icon: Icons.forum_outlined, label: '${post.stats.comments} comments'),
      _StatChip(icon: Icons.visibility_outlined, label: post.visibility),
    ];
    if (post.status != 'published') {
      chips.add(_StatChip(icon: Icons.schedule_outlined, label: post.status));
    }
    if (post.moderation.state != 'clean') {
      chips.add(
        _StatChip(
          icon: Icons.shield_outlined,
          label: post.moderation.state,
          color: Theme.of(context).colorScheme.error,
        ),
      );
    }
    return Wrap(spacing: 8, runSpacing: 8, children: chips);
  }

  Future<void> _openExternalUrl(BuildContext context, String url) async {
    final parsed = Uri.tryParse(url.trim());
    if (parsed == null || !parsed.hasScheme || parsed.host.isEmpty) {
      _notifyLaunchFailure(context);
      return;
    }
    if (parsed.scheme != 'https' && parsed.scheme != 'http') {
      _notifyLaunchFailure(context);
      return;
    }
    try {
      final launched = await launchUrl(parsed, mode: LaunchMode.externalApplication);
      if (!launched) {
        _notifyLaunchFailure(context);
      }
    } catch (_) {
      _notifyLaunchFailure(context);
    }
  }

  void _notifyLaunchFailure(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Unable to open the link. Please try again later.')),
    );
  }

  Widget _buildMetadata(BuildContext context, CommunityPost post) {
    final metadata = post.metadata;
    final entries = metadata.entries
        .where((entry) => entry.value != null && entry.key != 'media')
        .map((entry) => MapEntry(entry.key, entry.value.toString()))
        .toList();
    if (entries.isEmpty) {
      return const SizedBox.shrink();
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Metadata', style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 8),
        ...entries.map(
          (entry) => Row(
            children: [
              Expanded(
                child: Text(
                  entry.key,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(entry.value, style: Theme.of(context).textTheme.bodyMedium),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.icon, required this.label, this.color});

  final IconData icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: Icon(icon, size: 16, color: color ?? Theme.of(context).colorScheme.primary),
      label: Text(label),
      side: BorderSide(color: (color ?? Theme.of(context).colorScheme.primary).withOpacity(0.25)),
      backgroundColor: (color ?? Theme.of(context).colorScheme.primary).withOpacity(0.08),
      labelStyle: Theme.of(context).textTheme.bodySmall,
    );
  }
}
