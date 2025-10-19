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
      _tags.addAll(post.tags);
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
              width: 180,
              child: TextField(
                controller: _tagsController,
                decoration: const InputDecoration(
                  hintText: 'Add tag',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                onSubmitted: (value) {
                  final tag = value.trim();
                  if (tag.isNotEmpty) {
                    setState(() => _tags.add(tag));
                    _tagsController.clear();
                  }
                },
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
          controller: _imageController,
          decoration: const InputDecoration(
            labelText: 'Image URL',
            hintText: 'https://…',
            border: OutlineInputBorder(),
          ),
          keyboardType: TextInputType.url,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _videoController,
          decoration: const InputDecoration(
            labelText: 'Video link',
            hintText: 'https://…',
            border: OutlineInputBorder(),
          ),
          keyboardType: TextInputType.url,
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
          value: _status == 'published',
          onChanged: (value) {
            setState(() => _status = value ? 'published' : 'draft');
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

  void _submit() {
    final form = _formKey.currentState;
    if (form == null) return;
    if (!form.validate()) return;
    final community = _selectedCommunity;
    if (community == null) return;
    final metadata = <String, dynamic>{
      'media': <String, dynamic>{
        if (_imageController.text.trim().isNotEmpty) 'imageUrl': _imageController.text.trim(),
        if (_videoController.text.trim().isNotEmpty) 'videoUrl': _videoController.text.trim(),
      }
    };
    final input = CreateCommunityPostInput(
      body: _bodyController.text.trim(),
      title: _titleController.text.trim().isEmpty ? null : _titleController.text.trim(),
      tags: _tags.toList(),
      postType: _postType,
      visibility: _visibility,
      status: _status,
      scheduledAt: _scheduledAt,
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
