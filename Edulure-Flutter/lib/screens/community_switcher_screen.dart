import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/models/community_models.dart';
import '../core/state/community/community_controllers.dart';
import '../widgets/community_management_modals.dart';
import 'community_profile_screen.dart';

class CommunitySwitcherScreen extends ConsumerStatefulWidget {
  const CommunitySwitcherScreen({super.key, this.initialCommunityId});

  final String? initialCommunityId;

  @override
  ConsumerState<CommunitySwitcherScreen> createState() => _CommunitySwitcherScreenState();
}

class _CommunitySwitcherScreenState extends ConsumerState<CommunitySwitcherScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _joinedOnly = false;
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    _selectedId = widget.initialCommunityId;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  List<CommunityModel> _filterCommunities(List<CommunityModel> communities) {
    final query = _searchController.text.trim().toLowerCase();
    return communities.where((community) {
      if (_joinedOnly && !community.joined) return false;
      if (query.isEmpty) return true;
      final haystack = [
        community.name.toLowerCase(),
        community.description.toLowerCase(),
        ...community.tags.map((tag) => tag.toLowerCase()),
      ];
      return haystack.any((value) => value.contains(query));
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final communitiesAsync = ref.watch(communityDirectoryControllerProvider);
    final activeId = ref.watch(activeCommunityProvider);
    if (activeId != null) {
      _selectedId = activeId;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Switch community'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_home_work_outlined),
            tooltip: 'Create community',
            onPressed: () => showCommunityEditor(
              context: context,
              ref: ref,
              onMessage: _showSnack,
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: communitiesAsync.when(
          data: (communities) {
            final filtered = _filterCommunities(communities);
            return Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search communities or tags',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                SwitchListTile.adaptive(
                  value: _joinedOnly,
                  onChanged: (value) => setState(() => _joinedOnly = value),
                  title: const Text('Show joined communities only'),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: filtered.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.groups_outlined, size: 48),
                              const SizedBox(height: 8),
                              Text(
                                'No communities found',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final community = filtered[index];
                            final selected = _selectedId == community.id;
                            return Card(
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                                  child: Text(
                                    community.name.isNotEmpty
                                        ? community.name.substring(0, 1).toUpperCase()
                                        : '?',
                                  ),
                                ),
                                title: Text(community.name),
                                subtitle: Text(community.description, maxLines: 2, overflow: TextOverflow.ellipsis),
                                trailing: Radio<String>(
                                  value: community.id,
                                  groupValue: _selectedId,
                                  onChanged: (value) async {
                                    if (value == null) return;
                                    setState(() => _selectedId = value);
                                    await ref.read(activeCommunityProvider.notifier).setActive(value);
                                    if (mounted) Navigator.of(context).maybePop();
                                  },
                                ),
                                onTap: () async {
                                  setState(() => _selectedId = community.id);
                                  await ref.read(activeCommunityProvider.notifier).setActive(community.id);
                                  if (mounted) Navigator.of(context).maybePop();
                                },
                                onLongPress: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) => CommunityProfileScreen(communityId: community.id),
                                    ),
                                  );
                                },
                              ),
                            );
                          },
                        ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.edit_outlined),
                    onPressed: _selectedId == null
                        ? null
                        : () async {
                            final community = communities.firstWhere(
                              (element) => element.id == _selectedId,
                              orElse: () => communities.first,
                            );
                            await showCommunityEditor(
                              context: context,
                              ref: ref,
                              community: community,
                              onMessage: _showSnack,
                            );
                          },
                    label: const Text('Edit selected community'),
                  ),
                ),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48),
                const SizedBox(height: 12),
                Text('Unable to load communities', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Text('$error', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () =>
                      ref.read(communityDirectoryControllerProvider.notifier).refreshDirectory(),
                  child: const Text('Retry'),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
