import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/models/community_models.dart';
import '../core/state/community/community_controllers.dart';

class ExplorerScreen extends ConsumerStatefulWidget {
  const ExplorerScreen({super.key});

  @override
  ConsumerState<ExplorerScreen> createState() => _ExplorerScreenState();
}

class _ExplorerScreenState extends ConsumerState<ExplorerScreen> {
  final TextEditingController _searchController = TextEditingController();

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

  Future<void> _openResourceComposer({ExplorerResource? resource}) async {
    final titleController = TextEditingController(text: resource?.title ?? '');
    final subtitleController = TextEditingController(text: resource?.subtitle ?? '');
    final descriptionController = TextEditingController(text: resource?.description ?? '');
    final tagsController = TextEditingController(text: resource?.tags.join(', ') ?? '');
    final coverController = TextEditingController(text: resource?.coverImage ?? '');
    final ownerController = TextEditingController(text: resource?.owner ?? '');
    final linkController = TextEditingController(text: resource?.link ?? '');
    String entityType = resource?.entityType ?? 'playbook';

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
              return SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          resource == null ? 'Catalog new asset' : 'Update asset',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.of(context).maybePop(),
                        )
                      ],
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: entityType,
                      decoration: const InputDecoration(
                        labelText: 'Entity type',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'playbook', child: Text('Playbook')), 
                        DropdownMenuItem(value: 'event', child: Text('Event')), 
                        DropdownMenuItem(value: 'community', child: Text('Community')), 
                        DropdownMenuItem(value: 'insight', child: Text('Insight')), 
                      ],
                      onChanged: (value) => setModalState(() => entityType = value ?? entityType),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: subtitleController,
                      decoration: const InputDecoration(labelText: 'Subtitle', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descriptionController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: tagsController,
                      decoration: const InputDecoration(
                        labelText: 'Tags (comma separated)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: coverController,
                      decoration: const InputDecoration(
                        labelText: 'Cover image URL',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: linkController,
                      decoration: const InputDecoration(
                        labelText: 'External link (optional)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: ownerController,
                      decoration: const InputDecoration(
                        labelText: 'Owner or curator',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        icon: const Icon(Icons.library_add_outlined),
                        onPressed: () async {
                          if (titleController.text.trim().isEmpty) {
                            _showSnack('Add a title to catalog this resource.');
                            return;
                          }
                          final draft = ExplorerResourceDraft(
                            entityType: entityType,
                            title: titleController.text.trim(),
                            subtitle: subtitleController.text.trim(),
                            description: descriptionController.text.trim(),
                            tags: tagsController.text
                                .split(',')
                                .map((tag) => tag.trim())
                                .where((tag) => tag.isNotEmpty)
                                .toList(),
                            coverImage: coverController.text.trim().isEmpty
                                ? null
                                : coverController.text.trim(),
                            link: linkController.text.trim().isEmpty ? null : linkController.text.trim(),
                            owner: ownerController.text.trim().isEmpty ? null : ownerController.text.trim(),
                          );
                          if (resource == null) {
                            await ref.read(explorerControllerProvider.notifier).createResource(draft);
                            _showSnack('Resource added to explorer.');
                          } else {
                            await ref.read(explorerControllerProvider.notifier).updateResource(resource.id, draft);
                            _showSnack('Resource updated.');
                          }
                          if (mounted) Navigator.of(context).maybePop();
                        },
                        label: Text(resource == null ? 'Add to catalog' : 'Save changes'),
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

  @override
  Widget build(BuildContext context) {
    final explorerAsync = ref.watch(explorerControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Explorer'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh results',
            onPressed: () => ref.read(explorerControllerProvider.notifier).submitQuery(_searchController.text),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openResourceComposer(),
        icon: const Icon(Icons.add_outlined),
        label: const Text('Catalog asset'),
      ),
      body: explorerAsync.when(
        data: (state) {
          final availableTags = state.availableTags.toList()..sort();
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: _searchController,
                      textInputAction: TextInputAction.search,
                      onSubmitted: (value) => ref.read(explorerControllerProvider.notifier).submitQuery(value),
                      decoration: InputDecoration(
                        hintText: 'Search playbooks, events, communities, and insights',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: _searchController.text.isEmpty
                            ? null
                            : IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  _searchController.clear();
                                  ref.read(explorerControllerProvider.notifier).submitQuery('');
                                },
                              ),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      children: [
                        for (final entity in ExplorerController.defaultEntities)
                          FilterChip(
                            label: Text(entity[0].toUpperCase() + entity.substring(1)),
                            selected: state.entityFilters.contains(entity),
                            onSelected: (_) => ref.read(explorerControllerProvider.notifier).toggleEntity(entity),
                          ),
                      ],
                    ),
                    if (availableTags.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final tag in availableTags)
                            FilterChip(
                              label: Text('#$tag'),
                              selected: state.tagFilters.contains(tag),
                              onSelected: (_) => ref.read(explorerControllerProvider.notifier).toggleTag(tag),
                            ),
                        ],
                      ),
                    ],
                    if (state.query.isNotEmpty || state.tagFilters.isNotEmpty)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: () => ref.read(explorerControllerProvider.notifier).clearFilters(),
                          icon: const Icon(Icons.clear_all),
                          label: const Text('Clear filters'),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: state.results.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.search_off_outlined, size: 48),
                            SizedBox(height: 8),
                            Text('No results match your filters yet'),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: state.results.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final resource = state.results[index];
                          return _ExplorerResultCard(
                            resource: resource,
                            onEdit: () => _openResourceComposer(resource: resource),
                            onDelete: () async {
                              await ref.read(explorerControllerProvider.notifier).deleteResource(resource.id);
                              _showSnack('Resource removed from catalog.');
                            },
                            onToggleFavourite: () => ref
                                .read(explorerControllerProvider.notifier)
                                .toggleFavourite(resource.id),
                          );
                        },
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
              Text('Unable to load explorer results', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text('$error', textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () =>
                    ref.read(explorerControllerProvider.notifier).submitQuery(_searchController.text),
                child: const Text('Retry search'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ExplorerResultCard extends ConsumerWidget {
  const _ExplorerResultCard({
    required this.resource,
    required this.onEdit,
    required this.onDelete,
    required this.onToggleFavourite,
  });

  final ExplorerResource resource;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onToggleFavourite;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        resource.title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(resource.subtitle, style: Theme.of(context).textTheme.labelMedium),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(resource.isFavorite ? Icons.bookmark : Icons.bookmark_border),
                  onPressed: onToggleFavourite,
                ),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    switch (value) {
                      case 'edit':
                        onEdit();
                        break;
                      case 'delete':
                        onDelete();
                        break;
                    }
                  },
                  itemBuilder: (context) => const [
                    PopupMenuItem(value: 'edit', child: ListTile(leading: Icon(Icons.edit_outlined), title: Text('Edit'))),
                    PopupMenuItem(value: 'delete', child: ListTile(leading: Icon(Icons.delete_outline), title: Text('Delete'))),
                  ],
                ),
              ],
            ),
            if (resource.coverImage != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Image.network(
                      resource.coverImage!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(color: Colors.grey.shade200),
                    ),
                  ),
                ),
              ),
            Text(resource.description, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(label: Text(resource.entityType)),
                for (final tag in resource.tags) Chip(label: Text('#$tag')),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.update, size: 18),
                const SizedBox(width: 6),
                Text('Updated ${DateFormat.yMMMd().format(resource.updatedAt)}'),
                if (resource.owner != null && resource.owner!.isNotEmpty) ...[
                  const SizedBox(width: 16),
                  const Icon(Icons.person_outline, size: 18),
                  const SizedBox(width: 6),
                  Text(resource.owner!),
                ],
              ],
            ),
            if (resource.link != null && resource.link!.isNotEmpty) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => showDialog<void>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: Text(resource.title),
                    content: Text('Open external resource at ${resource.link}?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.of(context).maybePop(), child: const Text('Cancel')),
                      FilledButton(
                        onPressed: () => Navigator.of(context).maybePop(),
                        child: const Text('Ok'),
                      )
                    ],
                  ),
                ),
                icon: const Icon(Icons.open_in_new),
                label: const Text('Open link'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
