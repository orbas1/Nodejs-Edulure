import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../provider/learning/learning_models.dart';
import '../provider/learning/learning_store.dart';

class EbookLibraryScreen extends ConsumerStatefulWidget {
  const EbookLibraryScreen({super.key});

  @override
  ConsumerState<EbookLibraryScreen> createState() => _EbookLibraryScreenState();
}

class _EbookLibraryScreenState extends ConsumerState<EbookLibraryScreen> {
  String _languageFilter = 'All languages';
  String _searchTerm = '';

  @override
  Widget build(BuildContext context) {
    final ebooks = ref.watch(ebookStoreProvider);
    final filtered = ebooks.where((ebook) {
      final matchesLanguage = _languageFilter == 'All languages' || ebook.language == _languageFilter;
      final matchesSearch = ebook.title.toLowerCase().contains(_searchTerm.toLowerCase()) ||
          ebook.description.toLowerCase().contains(_searchTerm.toLowerCase()) ||
          ebook.tags.any((tag) => tag.toLowerCase().contains(_searchTerm.toLowerCase()));
      return matchesLanguage && matchesSearch;
    }).toList();

    final languages = {
      'All languages',
      ...ebooks.map((ebook) => ebook.language),
    };

    return Scaffold(
      appBar: AppBar(
        title: const Text('E-book studio'),
        actions: [
          IconButton(
            tooltip: 'Upload e-book',
            icon: const Icon(Icons.cloud_upload_outlined),
            onPressed: () => _openEbookForm(),
          )
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openEbookForm(),
        label: const Text('Add e-book'),
        icon: const Icon(Icons.add_circle_outline),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search),
                    hintText: 'Search by title, description, or tag',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onChanged: (value) => setState(() => _searchTerm = value),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    DropdownButton<String>(
                      value: _languageFilter,
                      onChanged: (value) => setState(() => _languageFilter = value ?? 'All languages'),
                      items: [
                        for (final language in languages)
                          DropdownMenuItem(
                            value: language,
                            child: Text(language),
                          )
                      ],
                    ),
                    FilledButton.tonalIcon(
                      onPressed: filtered.isEmpty ? null : () => _openBulkDownloadDialog(filtered),
                      icon: const Icon(Icons.download_outlined),
                      label: const Text('Download all'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? const _EmptyLibraryState()
                : GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 360,
                      mainAxisExtent: 330,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final ebook = filtered[index];
                      return _EbookCard(
                        ebook: ebook,
                        onTap: () => _openEbookDetail(ebook),
                        onDelete: () => _confirmDelete(ebook),
                        onEdit: () => _openEbookForm(ebook: ebook),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _openEbookDetail(Ebook ebook) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return FractionallySizedBox(
          heightFactor: 0.9,
          child: _EbookDetailSheet(
            ebook: ebook,
            onUpdateProgress: (progress) {
              ref.read(ebookStoreProvider.notifier).updateEbook(
                    ebook.copyWith(progress: progress),
                  );
            },
          ),
        );
      },
    );
  }

  Future<void> _openEbookForm({Ebook? ebook}) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _EbookFormSheet(ebook: ebook),
    );
  }

  Future<void> _confirmDelete(Ebook ebook) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete e-book'),
        content: Text('Remove "${ebook.title}" from the library?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      ref.read(ebookStoreProvider.notifier).deleteEbook(ebook.id);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${ebook.title} deleted')),
      );
    }
  }

  void _openBulkDownloadDialog(List<Ebook> ebooks) {
    showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Download selected e-books'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('This will queue downloads for:'),
              const SizedBox(height: 12),
              ...ebooks.map((ebook) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.file_download_outlined),
                    title: Text(ebook.title),
                    subtitle: Text(ebook.language),
                  )),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Queued ${ebooks.length} downloads')),
                );
              },
              child: const Text('Confirm'),
            )
          ],
        );
      },
    );
  }
}

class _EbookCard extends StatelessWidget {
  const _EbookCard({
    required this.ebook,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
  });

  final Ebook ebook;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 3,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: AspectRatio(
                  aspectRatio: 3 / 4,
                  child: Image.network(
                    '${ebook.coverUrl}?auto=format&fit=crop&w=400&q=80',
                    fit: BoxFit.cover,
                    errorBuilder: (context, _, __) => Container(
                      color: Colors.grey.shade200,
                      child: const Icon(Icons.menu_book_outlined, size: 48),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                ebook.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(
                ebook.author,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey),
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: ebook.progress.clamp(0, 1),
                borderRadius: BorderRadius.circular(12),
                minHeight: 8,
              ),
              const SizedBox(height: 4),
              Text('Progress ${(ebook.progress * 100).toStringAsFixed(0)}%'),
              const Spacer(),
              Wrap(
                spacing: 6,
                children: [
                  for (final tag in ebook.tags.take(3)) Chip(label: Text(tag)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  IconButton(
                    tooltip: 'Edit metadata',
                    icon: const Icon(Icons.edit_outlined),
                    onPressed: onEdit,
                  ),
                  IconButton(
                    tooltip: 'Delete e-book',
                    icon: const Icon(Icons.delete_outline),
                    onPressed: onDelete,
                  ),
                ],
              )
            ],
          ),
        ),
      ),
    );
  }
}

class _EbookDetailSheet extends StatefulWidget {
  const _EbookDetailSheet({
    required this.ebook,
    required this.onUpdateProgress,
  });

  final Ebook ebook;
  final void Function(double progress) onUpdateProgress;

  @override
  State<_EbookDetailSheet> createState() => _EbookDetailSheetState();
}

class _EbookDetailSheetState extends State<_EbookDetailSheet> {
  late double _progress;

  @override
  void initState() {
    super.initState();
    _progress = widget.ebook.progress;
  }

  Future<void> _launchExternal(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link is invalid')),
      );
      return;
    }
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open link')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(widget.ebook.title),
        actions: [
          if ((widget.ebook.previewVideoUrl ?? '').isNotEmpty)
            IconButton(
              tooltip: 'Play trailer',
              onPressed: () => _launchExternal(widget.ebook.previewVideoUrl!),
              icon: const Icon(Icons.play_circle_outline),
            ),
          if ((widget.ebook.audioSampleUrl ?? '').isNotEmpty)
            IconButton(
              tooltip: 'Listen to audio sample',
              onPressed: () => _launchExternal(widget.ebook.audioSampleUrl!),
              icon: const Icon(Icons.graphic_eq_outlined),
            ),
          IconButton(
            tooltip: 'Open reader',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Reader launching...')),
              );
            },
            icon: const Icon(Icons.menu_book_outlined),
          )
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.network(
                  '${widget.ebook.coverUrl}?auto=format&fit=crop&w=280&q=80',
                  height: 220,
                  width: 160,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.ebook.author, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 12),
                    Text(widget.ebook.description),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      children: [
                        Chip(label: Text(widget.ebook.language)),
                        for (final tag in widget.ebook.tags) Chip(label: Text(tag)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.download_done_outlined),
                        const SizedBox(width: 8),
                        Text(widget.ebook.downloaded ? 'Available offline' : 'Stream only'),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text('Progress ${( _progress * 100).toStringAsFixed(0)}%'),
                    Slider(
                      value: _progress,
                      onChanged: (value) => setState(() => _progress = value),
                      onChangeEnd: (value) => widget.onUpdateProgress(value),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      icon: const Icon(Icons.share_outlined),
                      label: const Text('Share reader link'),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Share link copied')), // placeholder share
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        if ((widget.ebook.previewVideoUrl ?? '').isNotEmpty)
                          FilledButton.tonalIcon(
                            onPressed: () => _launchExternal(widget.ebook.previewVideoUrl!),
                            icon: const Icon(Icons.play_circle_fill_outlined),
                            label: const Text('Watch trailer'),
                          ),
                        if ((widget.ebook.audioSampleUrl ?? '').isNotEmpty)
                          FilledButton.tonalIcon(
                            onPressed: () => _launchExternal(widget.ebook.audioSampleUrl!),
                            icon: const Icon(Icons.graphic_eq),
                            label: const Text('Audio sample'),
                          ),
                        FilledButton.tonalIcon(
                          onPressed: () => _launchExternal(widget.ebook.fileUrl),
                          icon: const Icon(Icons.picture_as_pdf_outlined),
                          label: const Text('Download e-book'),
                        ),
                      ],
                    ),
                  ],
                ),
              )
            ],
          ),
          const SizedBox(height: 24),
          Text('Chapters', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ...widget.ebook.chapters.map(
            (chapter) => Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  child: Text('${widget.ebook.chapters.indexOf(chapter) + 1}'),
                ),
                title: Text(chapter.title),
                subtitle: Text('${chapter.pageCount} pages'),
                trailing: IconButton(
                  icon: const Icon(Icons.play_circle_outline),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Opening ${chapter.title}...')),
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EbookFormSheet extends ConsumerStatefulWidget {
  const _EbookFormSheet({this.ebook});

  final Ebook? ebook;

  @override
  ConsumerState<_EbookFormSheet> createState() => _EbookFormSheetState();
}

class _EbookFormSheetState extends ConsumerState<_EbookFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _authorController;
  late final TextEditingController _coverController;
  late final TextEditingController _fileController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _languageController;
  late final TextEditingController _tagsController;
  late final TextEditingController _previewVideoController;
  late final TextEditingController _audioSampleController;
  double _progress = 0;
  double? _rating;
  bool _downloaded = false;
  final List<_ChapterFormData> _chapters = [];

  @override
  void initState() {
    super.initState();
    final ebook = widget.ebook;
    _titleController = TextEditingController(text: ebook?.title ?? '');
    _authorController = TextEditingController(text: ebook?.author ?? '');
    _coverController = TextEditingController(text: ebook?.coverUrl ?? '');
    _fileController = TextEditingController(text: ebook?.fileUrl ?? '');
    _descriptionController = TextEditingController(text: ebook?.description ?? '');
    _languageController = TextEditingController(text: ebook?.language ?? '');
    _tagsController = TextEditingController(text: ebook?.tags.join(', ') ?? '');
    _previewVideoController = TextEditingController(text: ebook?.previewVideoUrl ?? '');
    _audioSampleController = TextEditingController(text: ebook?.audioSampleUrl ?? '');
    _progress = ebook?.progress ?? 0;
    _rating = ebook?.rating;
    _downloaded = ebook?.downloaded ?? false;
    if (ebook != null) {
      for (final chapter in ebook.chapters) {
        _chapters.add(
          _ChapterFormData(
            id: chapter.id,
            titleController: TextEditingController(text: chapter.title),
            pagesController: TextEditingController(text: chapter.pageCount.toString()),
            summaryController: TextEditingController(text: chapter.summary),
          ),
        );
      }
    }
    if (_chapters.isEmpty) {
      _addChapter();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _authorController.dispose();
    _coverController.dispose();
    _fileController.dispose();
    _descriptionController.dispose();
    _languageController.dispose();
    _tagsController.dispose();
    _previewVideoController.dispose();
    _audioSampleController.dispose();
    for (final chapter in _chapters) {
      chapter.dispose();
    }
    super.dispose();
  }

  void _addChapter() {
    setState(() {
      _chapters.add(_ChapterFormData.newEmpty());
    });
  }

  void _removeChapter(_ChapterFormData chapter) {
    if (_chapters.length <= 1) return;
    setState(() {
      _chapters.remove(chapter);
      chapter.dispose();
    });
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final notifier = ref.read(ebookStoreProvider.notifier);
    final chapters = _chapters
        .map(
          (chapter) => EbookChapter(
            id: chapter.id,
            title: chapter.titleController.text.trim(),
            pageCount: int.tryParse(chapter.pagesController.text) ?? 0,
            summary: chapter.summaryController.text.trim(),
          ),
        )
        .toList();

    final ebook = notifier.buildEbookFromForm(
      id: widget.ebook?.id,
      title: _titleController.text.trim(),
      author: _authorController.text.trim(),
      coverUrl: _coverController.text.trim(),
      fileUrl: _fileController.text.trim(),
      description: _descriptionController.text.trim(),
      language: _languageController.text.trim().isEmpty ? 'English' : _languageController.text.trim(),
      tags: _tagsController.text.split(',').map((tag) => tag.trim()).where((tag) => tag.isNotEmpty).toList(),
      chapters: chapters,
      progress: _progress,
      rating: _rating,
      downloaded: _downloaded,
      previewVideoUrl: _previewVideoController.text.trim().isEmpty ? null : _previewVideoController.text.trim(),
      audioSampleUrl: _audioSampleController.text.trim().isEmpty ? null : _audioSampleController.text.trim(),
    );

    if (widget.ebook == null) {
      notifier.createEbook(ebook);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('E-book added to library')),
      );
    } else {
      notifier.updateEbook(ebook);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('E-book updated')), 
      );
    }
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.ebook == null ? 'Upload e-book' : 'Update e-book',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _titleController,
                    decoration: const InputDecoration(labelText: 'Title'),
                    validator: (value) => value == null || value.isEmpty ? 'Title required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _authorController,
                    decoration: const InputDecoration(labelText: 'Author'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(labelText: 'Description'),
                    minLines: 3,
                    maxLines: 6,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _coverController,
                    decoration: const InputDecoration(labelText: 'Cover image URL'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _fileController,
                    decoration: const InputDecoration(labelText: 'File URL'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _previewVideoController,
                    decoration: const InputDecoration(labelText: 'Preview trailer URL (optional)'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _audioSampleController,
                    decoration: const InputDecoration(labelText: 'Audio sample URL (optional)'),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _languageController,
                          decoration: const InputDecoration(labelText: 'Language'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          initialValue: _rating?.toString() ?? '',
                          decoration: const InputDecoration(labelText: 'Rating'),
                          keyboardType: TextInputType.number,
                          onChanged: (value) => _rating = double.tryParse(value),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _tagsController,
                    decoration: const InputDecoration(labelText: 'Tags (comma separated)'),
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile.adaptive(
                    value: _downloaded,
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Available offline'),
                    onChanged: (value) => setState(() => _downloaded = value),
                  ),
                  const SizedBox(height: 12),
                  Slider(
                    value: _progress,
                    onChanged: (value) => setState(() => _progress = value),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Text(
                        'Chapters',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const Spacer(),
                      TextButton.icon(
                        onPressed: _addChapter,
                        icon: const Icon(Icons.add),
                        label: const Text('Add chapter'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ..._chapters.map(
                    (chapter) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          color: Colors.grey.shade50,
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: chapter.titleController,
                                      decoration: const InputDecoration(labelText: 'Chapter title'),
                                      validator: (value) => value == null || value.isEmpty ? 'Title required' : null,
                                    ),
                                  ),
                                  IconButton(
                                    onPressed: () => _removeChapter(chapter),
                                    icon: const Icon(Icons.remove_circle_outline),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: chapter.summaryController,
                                decoration: const InputDecoration(labelText: 'Summary'),
                                minLines: 2,
                                maxLines: 3,
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: chapter.pagesController,
                                decoration: const InputDecoration(labelText: 'Page count'),
                                keyboardType: TextInputType.number,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      onPressed: _submit,
                      child: Text(widget.ebook == null ? 'Save e-book' : 'Save changes'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ChapterFormData {
  _ChapterFormData({
    required this.id,
    required this.titleController,
    required this.pagesController,
    required this.summaryController,
  });

  factory _ChapterFormData.newEmpty() {
    return _ChapterFormData(
      id: UniqueKey().toString(),
      titleController: TextEditingController(),
      pagesController: TextEditingController(text: '10'),
      summaryController: TextEditingController(),
    );
  }

  final String id;
  final TextEditingController titleController;
  final TextEditingController pagesController;
  final TextEditingController summaryController;

  void dispose() {
    titleController.dispose();
    pagesController.dispose();
    summaryController.dispose();
  }
}

class _EmptyLibraryState extends StatelessWidget {
  const _EmptyLibraryState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.menu_book_outlined, size: 64, color: Colors.blueGrey),
          SizedBox(height: 16),
          Text('No e-books available'),
          SizedBox(height: 8),
          Text('Upload your first e-book to share with learners.'),
        ],
      ),
    );
  }
}
