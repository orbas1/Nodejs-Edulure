import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../provider/community/communities_controller.dart';
import '../services/community_service.dart';

class CommunitySwitcherSheet extends ConsumerStatefulWidget {
  const CommunitySwitcherSheet({super.key, this.selected});

  final CommunitySummary? selected;

  static Future<CommunitySummary?> show(BuildContext context, {CommunitySummary? selected}) {
    return showModalBottomSheet<CommunitySummary>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => FractionallySizedBox(
        heightFactor: 0.9,
        child: CommunitySwitcherSheet(selected: selected),
      ),
    );
  }

  @override
  ConsumerState<CommunitySwitcherSheet> createState() => _CommunitySwitcherSheetState();
}

class _CommunitySwitcherSheetState extends ConsumerState<CommunitySwitcherSheet> {
  final TextEditingController _searchController = TextEditingController();
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() => ref.read(communitiesControllerProvider.notifier).refresh());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(communitiesControllerProvider);
    final communities = _filteredCommunities(state.communities);
    return Material(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 6,
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Switch community', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 12),
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
                      onSelected: (value) => setState(() => _filter = 'all'),
                    ),
                    ChoiceChip(
                      label: const Text('Joined'),
                      selected: _filter == 'joined',
                      onSelected: (value) => setState(() => _filter = 'joined'),
                    ),
                    ChoiceChip(
                      label: const Text('Moderating'),
                      selected: _filter == 'moderating',
                      onSelected: (value) => setState(() => _filter = 'moderating'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: () => _showCreateCommunitySheet(context),
                  icon: const Icon(Icons.add_circle_outline),
                  label: const Text('New community'),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: state.loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () => ref.read(communitiesControllerProvider.notifier).refresh(),
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                      itemBuilder: (context, index) {
                        final community = communities[index];
                        return _buildCommunityTile(context, community);
                      },
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemCount: communities.length,
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  List<CommunitySummary> _filteredCommunities(List<CommunitySummary> input) {
    final query = _searchController.text.trim().toLowerCase();
    return input.where((community) {
      final matchesQuery = query.isEmpty ||
          community.name.toLowerCase().contains(query) ||
          (community.description ?? '').toLowerCase().contains(query);
      final membership = community.membership?.status;
      final role = community.membership?.role;
      final matchesFilter = switch (_filter) {
        'joined' => membership == 'active',
        'moderating' => membership == 'active' && (role == 'owner' || role == 'admin' || role == 'moderator'),
        _ => true,
      };
      return matchesQuery && matchesFilter;
    }).toList();
  }

  Widget _buildCommunityTile(BuildContext context, CommunitySummary community) {
    final isSelected = widget.selected?.id == community.id;
    final membership = community.membership;
    final subtitle = StringBuffer()
      ..write('${community.stats.members} members')
      ..write(' • ')
      ..write('${community.stats.posts} posts');
    return InkWell(
      onTap: () => Navigator.of(context).pop(community),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? Theme.of(context).colorScheme.primary.withOpacity(0.08) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? Theme.of(context).colorScheme.primary
                : Colors.grey.withOpacity(0.2),
          ),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
              child: Text(community.name.characters.first.toUpperCase()),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    community.name,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle.toString(),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                  ),
                  if (community.description != null && community.description!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        community.description!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (membership?.status == 'active')
                  FilledButton.tonal(
                    onPressed: community.permissions.canLeave
                        ? () => _leaveCommunity(context, community)
                        : null,
                    child: const Text('Leave'),
                  )
                else
                  FilledButton(
                    onPressed: () => _joinCommunity(context, community),
                    child: const Text('Join'),
                  ),
                const SizedBox(height: 6),
                Text(
                  membership?.status == 'active'
                      ? 'You ${membership?.role ?? 'member'}'
                      : community.visibility == 'private'
                          ? 'Private'
                          : 'Public',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }

  Future<void> _showCreateCommunitySheet(BuildContext context) async {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    final imageController = TextEditingController();
    String visibility = 'public';
    final formKey = GlobalKey<FormState>();

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return FractionallySizedBox(
          heightFactor: 0.9,
          child: Material(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            child: Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Form(
                key: formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text('Create community',
                              style: Theme.of(context).textTheme.headlineSmall),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.of(context).pop(),
                        )
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: 'Name',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) =>
                          value == null || value.trim().length < 3 ? 'Enter at least 3 characters' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: descriptionController,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 4,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: imageController,
                      decoration: const InputDecoration(
                        labelText: 'Cover image URL',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: visibility,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'public', child: Text('Public')), 
                        DropdownMenuItem(value: 'private', child: Text('Private')),
                      ],
                      onChanged: (value) => visibility = value ?? 'public',
                    ),
                    const Spacer(),
                    FilledButton.icon(
                      onPressed: () {
                        if (formKey.currentState?.validate() ?? false) {
                          Navigator.of(context).pop(true);
                        }
                      },
                      icon: const Icon(Icons.check),
                      label: const Text('Create community'),
                      style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                    )
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );

    if (result == true) {
      final summary = await ref.read(communitiesControllerProvider.notifier).createCommunity(
            CreateCommunityInput(
              name: nameController.text.trim(),
              description: descriptionController.text.trim().isEmpty
                  ? null
                  : descriptionController.text.trim(),
              coverImageUrl: imageController.text.trim().isEmpty ? null : imageController.text.trim(),
              visibility: visibility,
            ),
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Community ${summary.name} created')), 
        );
      }
    }
  }

  Future<void> _joinCommunity(BuildContext context, CommunitySummary community) async {
    await ref.read(communitiesControllerProvider.notifier).joinCommunity(community.id);
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Joined ${community.name}')));
    }
  }

  Future<void> _leaveCommunity(BuildContext context, CommunitySummary community) async {
    await ref.read(communitiesControllerProvider.notifier).leaveCommunity(community.id);
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Left ${community.name}')));
    }
  }
}
