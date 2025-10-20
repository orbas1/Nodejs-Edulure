import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/community_service.dart';
import '../services/live_feed_service.dart';

class FeedComposerResult {
  FeedComposerResult({
    required this.community,
    required this.input,
    this.existing,
  });

  final CommunitySummary community;
  final CreateCommunityPostInput input;
  final CommunityPost? existing;
}

class FeedComposerSheet extends StatefulWidget {
  const FeedComposerSheet({
    super.key,
    required this.communities,
    this.initialCommunity,
    this.initialPost,
  });

  final List<CommunitySummary> communities;
  final CommunitySummary? initialCommunity;
  final CommunityPost? initialPost;

  @override
  State<FeedComposerSheet> createState() => _FeedComposerSheetState();
}

class _FeedComposerSheetState extends State<FeedComposerSheet> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _titleController;
  late TextEditingController _bodyController;
  late TextEditingController _tagsController;
  late TextEditingController _imageController;
  late TextEditingController _videoController;
  CommunitySummary? _selectedCommunity;
  String _postType = 'update';
  String _visibility = 'members';
  String _status = 'published';
  DateTime? _scheduledAt;
  final Set<String> _tags = <String>{};

  @override
  void initState() {
    super.initState();
    final post = widget.initialPost;
    _titleController = TextEditingController(text: post?.title ?? '');
    _bodyController = TextEditingController(text: post?.body ?? '');
    _tagsController = TextEditingController();
    final metadata = post?.metadata ?? <String, dynamic>{};
    final media = metadata['media'] is Map ? Map<String, dynamic>.from(metadata['media'] as Map) : <String, dynamic>{};
    _imageController = TextEditingController(text: media['imageUrl']?.toString() ?? '');
    _videoController = TextEditingController(text: media['videoUrl']?.toString() ?? '');
    _selectedCommunity = widget.initialCommunity ?? (widget.communities.isNotEmpty ? widget.communities.first : null);
    if (post != null) {
      _postType = post.type;
      _visibility = post.visibility;
      _status = post.status;
      _scheduledAt = post.scheduledAt;
      for (final tag in post.tags) {
        final normalized = _normalizeTag(tag) ?? tag.trim();
        if (normalized.isEmpty) {
          continue;
        }
        _tags.add(normalized);
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    _tagsController.dispose();
    _imageController.dispose();
    _videoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.initialPost != null;
    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      maxChildSize: 0.96,
      minChildSize: 0.6,
      expand: false,
      builder: (context, scrollController) {
        return Material(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: Form(
            key: _formKey,
            child: CustomScrollView(
              controller: scrollController,
              slivers: [
                SliverAppBar(
                  automaticallyImplyLeading: false,
                  title: Text(isEditing ? 'Update post' : 'Compose update'),
                  centerTitle: false,
                  pinned: true,
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(context).maybePop(),
                    ),
                  ],
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 36),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      _buildCommunityPicker(context),
                      const SizedBox(height: 16),
                      _buildPostTypeSelector(context),
                      const SizedBox(height: 16),
                      TextFormField(
                        key: const ValueKey('feed_composer_title'),
                        controller: _titleController,
                        decoration: const InputDecoration(
                          labelText: 'Headline',
                          hintText: 'Optional headline for your update',
                          border: OutlineInputBorder(),
                        ),
                        maxLength: 120,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        key: const ValueKey('feed_composer_body'),
                        controller: _bodyController,
                        decoration: const InputDecoration(
                          labelText: 'Update',
                          alignLabelWithHint: true,
                          hintText: 'Share context, resources, or next actions...',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.multiline,
                        maxLines: 8,
                        minLines: 4,
                        validator: (value) {
                          if (value == null || value.trim().length < 20) {
                            return 'Share at least 20 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),
                      _buildTagEditor(context),
                      const SizedBox(height: 20),
                      _buildMediaSection(context),
                      const SizedBox(height: 20),
                      _buildVisibilityControls(context),
                      const SizedBox(height: 20),
                      _buildSchedulePicker(context),
                      const SizedBox(height: 24),
                      FilledButton.icon(
                        key: const ValueKey('feed_composer_submit'),
                        onPressed: _submit,
                        icon: Icon(isEditing ? Icons.save : Icons.send),
                        label: Text(isEditing ? 'Update post' : 'Publish to community'),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                        ),
                      ),
                    ]),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCommunityPicker(BuildContext context) {
    return DropdownButtonFormField<CommunitySummary>(
      value: _selectedCommunity,
      items: widget.communities
          .map(
            (community) => DropdownMenuItem(
              value: community,
              child: Text(community.name),
            ),
          )
          .toList(),
      onChanged: (value) => setState(() => _selectedCommunity = value),
      decoration: const InputDecoration(
        labelText: 'Post to community',
        border: OutlineInputBorder(),
      ),
      validator: (value) => value == null ? 'Select a community' : null,
    );
  }

  Widget _buildPostTypeSelector(BuildContext context) {
    final types = <String>['update', 'event', 'resource', 'classroom', 'poll'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Post type', style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: types
              .map(
                (type) => ChoiceChip(
                  label: Text(type[0].toUpperCase() + type.substring(1)),
                  selected: _postType == type,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() => _postType = type);
                    }
                  },
                ),
              )
              .toList(),
        ),
      ],
    );
  }

  Widget _buildTagEditor(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Tags', style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ..._tags.map((tag) => InputChip(
                  label: Text('#$tag'),
                  onDeleted: () => setState(() => _tags.remove(tag)),
                )),
            SizedBox(
              width: 200,
              child: TextField(
                key: const ValueKey('feed_composer_tag_input'),
                controller: _tagsController,
                decoration: InputDecoration(
                  hintText: 'Add tag',
                  helperText: 'Up to 12 tags',
                  border: const OutlineInputBorder(),
                  isDense: true,
                  suffixIcon: IconButton(
                    onPressed: () => _addTag(context, _tagsController.text),
                    icon: const Icon(Icons.add),
                    tooltip: 'Add tag',
                  ),
                ),
                textInputAction: TextInputAction.done,
                onSubmitted: (value) => _addTag(context, value),
              ),
            )
          ],
        ),
      ],
    );
  }

  Widget _buildMediaSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Media & links', style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 12),
        TextFormField(
          key: const ValueKey('feed_composer_image_url'),
          controller: _imageController,
          decoration: const InputDecoration(
            labelText: 'Image URL',
            hintText: 'https://…',
            border: OutlineInputBorder(),
          ),
          keyboardType: TextInputType.url,
          validator: _validateOptionalUrl,
        ),
        const SizedBox(height: 12),
        TextFormField(
          key: const ValueKey('feed_composer_video_url'),
          controller: _videoController,
          decoration: const InputDecoration(
            labelText: 'Video link',
            hintText: 'https://…',
            border: OutlineInputBorder(),
          ),
          keyboardType: TextInputType.url,
          validator: _validateOptionalUrl,
        ),
      ],
    );
  }

  Widget _buildVisibilityControls(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Visibility & publication', style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _visibility,
          items: const [
            DropdownMenuItem(value: 'public', child: Text('Public')),
            DropdownMenuItem(value: 'members', child: Text('Community members')),
            DropdownMenuItem(value: 'admins', child: Text('Admins & moderators')),
          ],
          onChanged: (value) => setState(() => _visibility = value ?? 'members'),
          decoration: const InputDecoration(border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        SwitchListTile.adaptive(
          title: const Text('Publish immediately'),
          subtitle: const Text('Turn off to keep as draft until scheduled'),
          value: _status != 'draft',
          onChanged: (value) {
            setState(() {
              if (value) {
                _status = _scheduledAt != null ? 'scheduled' : 'published';
              } else {
                _status = 'draft';
                _scheduledAt = null;
              }
            });
          },
        )
      ],
    );
  }

  Widget _buildSchedulePicker(BuildContext context) {
    final formatter = DateFormat('EEE, MMM d • HH:mm');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Schedule',
                style: Theme.of(context).textTheme.labelLarge,
              ),
            ),
            TextButton.icon(
              onPressed: () async {
                final now = DateTime.now();
                final initialDate = _scheduledAt ?? now.add(const Duration(hours: 2));
                final date = await showDatePicker(
                  context: context,
                  initialDate: initialDate,
                  firstDate: now,
                  lastDate: now.add(const Duration(days: 365)),
                );
                if (date == null) return;
                final time = await showTimePicker(
                  context: context,
                  initialTime: TimeOfDay.fromDateTime(initialDate),
                );
                if (time == null) return;
                setState(() =>
                    _scheduledAt = DateTime(date.year, date.month, date.day, time.hour, time.minute));
              },
              icon: const Icon(Icons.schedule),
              label: const Text('Pick time'),
            ),
          ],
        ),
        if (_scheduledAt != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              children: [
                Expanded(child: Text(formatter.format(_scheduledAt!))),
                IconButton(
                  onPressed: () => setState(() => _scheduledAt = null),
                  icon: const Icon(Icons.clear),
                )
              ],
            ),
          )
      ],
    );
  }

  void _addTag(BuildContext context, String raw) {
    final normalized = _normalizeTag(raw);
    _tagsController.clear();
    if (normalized == null) {
      if (raw.trim().isNotEmpty) {
        _showSnackBar(context, 'Tags can include letters, numbers, hyphen, or underscore.');
      }
      return;
    }
    if (_tags.length >= 12 && !_tags.contains(normalized)) {
      _showSnackBar(context, 'You can add up to 12 tags.');
      return;
    }
    setState(() {
      _tags.add(normalized);
    });
  }

  String? _validateOptionalUrl(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return null;
    }
    final uri = Uri.tryParse(trimmed);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      return 'Enter a valid https:// link';
    }
    if (uri.scheme != 'https') {
      return 'Enter a valid https:// link';
    }
    return null;
  }

  Map<String, dynamic>? _buildMediaMetadata() {
    final image = _imageController.text.trim();
    final video = _videoController.text.trim();
    final media = <String, dynamic>{
      if (image.isNotEmpty) 'imageUrl': image,
      if (video.isNotEmpty) 'videoUrl': video,
    };
    if (media.isEmpty) {
      return null;
    }
    return media;
  }

  String? _normalizeTag(String raw) {
    final trimmed = raw.replaceAll('#', '').trim();
    if (trimmed.isEmpty) {
      return null;
    }
    final collapsed = trimmed.replaceAll(RegExp(r'\s+'), '-');
    final filtered = collapsed.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '').toLowerCase();
    final normalized =
        filtered.replaceAll(RegExp(r'-{2,}'), '-').replaceAll(RegExp(r'^[-_]+|[-_]+$'), '');
    if (normalized.isEmpty) {
      return null;
    }
    return normalized;
  }

  void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message), duration: const Duration(seconds: 2)));
  }

  void _submit() {
    final form = _formKey.currentState;
    if (form == null) return;
    if (!form.validate()) return;
    final community = _selectedCommunity;
    if (community == null) return;
    final metadata = <String, dynamic>{};
    final media = _buildMediaMetadata();
    if (media != null) {
      metadata['media'] = media;
    }
    final normalizedStatus = _status == 'draft'
        ? 'draft'
        : (_scheduledAt != null ? 'scheduled' : 'published');
    final scheduledAt = normalizedStatus == 'draft' ? null : _scheduledAt;
    final tags = List<String>.from(_tags)..sort();
    final input = CreateCommunityPostInput(
      body: _bodyController.text.trim(),
      title: _titleController.text.trim().isEmpty ? null : _titleController.text.trim(),
      tags: tags,
      postType: _postType,
      visibility: _visibility,
      status: normalizedStatus,
      scheduledAt: scheduledAt,
      metadata: metadata,
    );
    Navigator.of(context).pop(
      FeedComposerResult(
        community: community,
        input: input,
        existing: widget.initialPost,
      ),
    );
  }
}
