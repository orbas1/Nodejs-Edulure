import 'package:flutter/material.dart';

import '../services/content_service.dart';

const Color _brandPrimary = Color(0xFF2D62FF);
const Color _brandPrimaryDark = Color(0xFF1F3BB3);

class MaterialMetadataSheet extends StatefulWidget {
  const MaterialMetadataSheet({
    super.key,
    required this.asset,
    required this.service,
  });

  final ContentAsset asset;
  final ContentService service;

  @override
  State<MaterialMetadataSheet> createState() => _MaterialMetadataSheetState();
}

class _MaterialMetadataSheetState extends State<MaterialMetadataSheet> {
  late MaterialMetadataUpdate _draft;
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late TextEditingController _coverUrlController;
  late TextEditingController _coverAltController;
  late TextEditingController _videoUrlController;
  late TextEditingController _videoPosterController;
  late TextEditingController _headlineController;
  late TextEditingController _subheadlineController;
  late TextEditingController _badgeController;
  late TextEditingController _ctaLabelController;
  late TextEditingController _ctaUrlController;
  final TextEditingController _categoryInput = TextEditingController();
  final TextEditingController _tagInput = TextEditingController();
  late List<String> _categories;
  late List<String> _tags;
  late List<MaterialMediaItem> _gallery;
  late bool _pinned;
  late String _visibility;
  bool _saving = false;
  String? _feedback;
  String? _error;

  @override
  void initState() {
    super.initState();
    _draft = MaterialMetadataUpdate.fromAsset(widget.asset);
    _titleController = TextEditingController(text: _draft.title ?? '');
    _descriptionController = TextEditingController(text: _draft.description ?? '');
    _coverUrlController = TextEditingController(text: _draft.coverImageUrl ?? '');
    _coverAltController = TextEditingController(text: _draft.coverImageAlt ?? '');
    _videoUrlController = TextEditingController(text: _draft.videoUrl ?? '');
    _videoPosterController = TextEditingController(text: _draft.videoPosterUrl ?? '');
    _headlineController = TextEditingController(text: _draft.headline ?? '');
    _subheadlineController = TextEditingController(text: _draft.subheadline ?? '');
    _badgeController = TextEditingController(text: _draft.badge ?? '');
    _ctaLabelController = TextEditingController(text: _draft.callToActionLabel ?? '');
    _ctaUrlController = TextEditingController(text: _draft.callToActionUrl ?? '');
    _categories = List<String>.from(_draft.categories);
    _tags = List<String>.from(_draft.tags);
    _gallery = List<MaterialMediaItem>.from(_draft.gallery);
    _pinned = _draft.showcasePinned;
    _visibility = _draft.visibility ?? widget.asset.visibility ?? 'workspace';
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _coverUrlController.dispose();
    _coverAltController.dispose();
    _videoUrlController.dispose();
    _videoPosterController.dispose();
    _headlineController.dispose();
    _subheadlineController.dispose();
    _badgeController.dispose();
    _ctaLabelController.dispose();
    _ctaUrlController.dispose();
    _categoryInput.dispose();
    _tagInput.dispose();
    super.dispose();
  }

  void _addCategory() {
    final value = _categoryInput.text.trim();
    if (value.isEmpty) return;
    if (_categories.contains(value)) {
      _categoryInput.clear();
      return;
    }
    setState(() {
      _categories = List<String>.from(_categories)..add(value);
      _categoryInput.clear();
    });
  }

  void _removeCategory(String category) {
    setState(() {
      _categories = _categories.where((item) => item != category).toList();
    });
  }

  void _addTag() {
    final value = _tagInput.text.trim();
    if (value.isEmpty) return;
    if (_tags.contains(value)) {
      _tagInput.clear();
      return;
    }
    setState(() {
      _tags = List<String>.from(_tags)..add(value);
      _tagInput.clear();
    });
  }

  void _removeTag(String tag) {
    setState(() {
      _tags = _tags.where((item) => item != tag).toList();
    });
  }

  void _addGalleryItem() {
    if (_gallery.length >= 8) return;
    setState(() {
      _gallery = List<MaterialMediaItem>.from(_gallery)
        ..add(MaterialMediaItem(url: '', caption: '', kind: MaterialMediaKind.image));
    });
  }

  void _updateGalleryItem(int index, MaterialMediaItem item) {
    setState(() {
      final next = List<MaterialMediaItem>.from(_gallery);
      next[index] = item;
      _gallery = next;
    });
  }

  void _removeGalleryItem(int index) {
    setState(() {
      _gallery = List<MaterialMediaItem>.from(_gallery)..removeAt(index);
    });
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
      _feedback = null;
    });
    final update = MaterialMetadataUpdate(
      title: _titleController.text,
      description: _descriptionController.text,
      categories: _categories,
      tags: _tags,
      coverImageUrl: _coverUrlController.text,
      coverImageAlt: _coverAltController.text,
      gallery: _gallery,
      videoUrl: _videoUrlController.text,
      videoPosterUrl: _videoPosterController.text,
      headline: _headlineController.text,
      subheadline: _subheadlineController.text,
      callToActionLabel: _ctaLabelController.text,
      callToActionUrl: _ctaUrlController.text,
      badge: _badgeController.text,
      visibility: _visibility,
      showcasePinned: _pinned,
    );

    try {
      final updated = await widget.service.updateMaterialMetadata(widget.asset.publicId, update);
      if (!mounted) return;
      setState(() {
        _saving = false;
        _feedback = 'Material profile updated';
      });
      Navigator.of(context).pop(updated);
    } on ContentAccessDeniedException catch (error) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = error.message;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = 'Unable to save metadata: $error';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => FocusScope.of(context).unfocus(),
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 12,
          bottom: mediaQuery.viewInsets.bottom + 16,
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(28),
              topRight: Radius.circular(28),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 20,
                offset: const Offset(0, -6),
              )
            ],
          ),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 54,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.blueGrey.shade200,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Manage material',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: _brandPrimaryDark,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.asset.originalFilename,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey),
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    context,
                    controller: _titleController,
                    label: 'Title',
                    hint: 'Immersive data storytelling',
                    maxLength: 140,
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    context,
                    controller: _descriptionController,
                    label: 'Executive summary',
                    hint: 'Summarise learner outcomes and differentiators.',
                    maxLines: 4,
                    maxLength: 1500,
                  ),
                  const SizedBox(height: 16),
                  _buildChipEditor(
                    context,
                    title: 'Categories',
                    helper: 'Up to 12 categories for catalog placement.',
                    values: _categories,
                    controller: _categoryInput,
                    onAdd: _addCategory,
                    onRemove: _removeCategory,
                  ),
                  const SizedBox(height: 16),
                  _buildChipEditor(
                    context,
                    title: 'Tags',
                    helper: 'Long-tail tags to support discovery.',
                    values: _tags,
                    controller: _tagInput,
                    onAdd: _addTag,
                    onRemove: _removeTag,
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    context,
                    controller: _coverUrlController,
                    label: 'Cover image URL',
                    hint: 'https://cdn.example.com/material.jpg',
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    context,
                    controller: _coverAltController,
                    label: 'Cover image alt text',
                    hint: 'Learners collaborating around insights dashboard',
                    maxLength: 120,
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    context,
                    controller: _videoUrlController,
                    label: 'Showcase video URL',
                    hint: 'https://cdn.example.com/showcase.mp4',
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    context,
                    controller: _videoPosterController,
                    label: 'Video poster image',
                    hint: 'https://cdn.example.com/showcase-poster.jpg',
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    context,
                    controller: _headlineController,
                    label: 'Headline',
                    hint: 'Reimagine ESG storytelling',
                    maxLength: 120,
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    context,
                    controller: _subheadlineController,
                    label: 'Subheadline',
                    hint: 'Templates, walkthroughs, and analytics instrumentation ready to deploy.',
                    maxLength: 200,
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    context,
                    controller: _badgeController,
                    label: 'Badge',
                    hint: 'Featured',
                    maxLength: 32,
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    context,
                    controller: _ctaLabelController,
                    label: 'Call to action label',
                    hint: 'Book a walkthrough',
                    maxLength: 40,
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    context,
                    controller: _ctaUrlController,
                    label: 'Call to action URL',
                    hint: 'https://cal.com/edulure/demo',
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Gallery assets',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Add up to eight supporting images or videos hosted on HTTPS.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey),
                  ),
                  const SizedBox(height: 12),
                  ..._gallery.asMap().entries.map(
                    (entry) => _GalleryItemEditor(
                      index: entry.key,
                      item: entry.value,
                      onChanged: (item) => _updateGalleryItem(entry.key, item),
                      onRemove: () => _removeGalleryItem(entry.key),
                    ),
                  ),
                  if (_gallery.length < 8) ...[
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _addGalleryItem,
                      icon: const Icon(Icons.add),
                      label: const Text('Add gallery item'),
                    ),
                  ],
                  const SizedBox(height: 20),
                  DropdownButtonFormField<String>(
                    value: _visibility,
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() {
                        _visibility = value;
                      });
                    },
                    items: const [
                      DropdownMenuItem(value: 'workspace', child: Text('Learnspace access')),
                      DropdownMenuItem(value: 'private', child: Text('Private access')),
                      DropdownMenuItem(value: 'public', child: Text('Public marketplace')),
                    ],
                    decoration: InputDecoration(
                      labelText: 'Visibility',
                      filled: true,
                      fillColor: Colors.blueGrey.shade50,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile.adaptive(
                    value: _pinned,
                    onChanged: (value) => setState(() => _pinned = value),
                    title: const Text('Pin to marketplace highlights'),
                    subtitle: const Text('Surface this material across enterprise dashboards and storefronts.'),
                    activeColor: _brandPrimary,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.red.shade100),
                      ),
                      child: Text(
                        _error!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.red.shade700),
                      ),
                    ),
                  ],
                  if (_feedback != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.green.shade100),
                      ),
                      child: Text(
                        _feedback!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.green.shade700),
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _saving ? null : _save,
                      style: FilledButton.styleFrom(
                        backgroundColor: _brandPrimary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      child: Text(_saving ? 'Saving…' : 'Save material profile'),
                    ),
                  )
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(
    BuildContext context, {
    required TextEditingController controller,
    required String label,
    required String hint,
    int maxLines = 1,
    int? maxLength,
  }) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      maxLength: maxLength,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: Colors.blueGrey.shade50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        counterText: '',
      ),
    );
  }

  Widget _buildChipEditor(
    BuildContext context, {
    required String title,
    required String helper,
    required List<String> values,
    required TextEditingController controller,
    required VoidCallback onAdd,
    required ValueChanged<String> onRemove,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: values
              .map(
                (value) => InputChip(
                  label: Text(value),
                  onDeleted: () => onRemove(value),
                  backgroundColor: _brandPrimary.withOpacity(0.08),
                  labelStyle: const TextStyle(color: _brandPrimaryDark, fontWeight: FontWeight.w600),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          decoration: InputDecoration(
            hintText: 'Add and press done',
            suffixIcon: IconButton(
              onPressed: onAdd,
              icon: const Icon(Icons.add_circle, color: _brandPrimaryDark),
            ),
            filled: true,
            fillColor: Colors.blueGrey.shade50,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide.none,
            ),
          ),
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => onAdd(),
        ),
        const SizedBox(height: 4),
        Text(helper, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey)),
      ],
    );
  }
}

class _GalleryItemEditor extends StatelessWidget {
  const _GalleryItemEditor({
    required this.index,
    required this.item,
    required this.onChanged,
    required this.onRemove,
  });

  final int index;
  final MaterialMediaItem item;
  final ValueChanged<MaterialMediaItem> onChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Gallery item ${index + 1}', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            TextFormField(
              initialValue: item.url,
              decoration: const InputDecoration(
                labelText: 'Resource URL',
                hintText: 'https://cdn.example.com/media.jpg',
              ),
              onChanged: (value) => onChanged(item.copyWith(url: value)),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<MaterialMediaKind>(
              value: item.kind,
              onChanged: (value) {
                if (value == null) return;
                onChanged(item.copyWith(kind: value));
              },
              items: const [
                DropdownMenuItem(value: MaterialMediaKind.image, child: Text('Image')),
                DropdownMenuItem(value: MaterialMediaKind.video, child: Text('Video')),
              ],
              decoration: const InputDecoration(labelText: 'Asset type'),
            ),
            const SizedBox(height: 8),
            TextFormField(
              initialValue: item.caption ?? '',
              decoration: const InputDecoration(
                labelText: 'Caption',
                hintText: 'Add a concise caption',
              ),
              onChanged: (value) => onChanged(item.copyWith(caption: value)),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onRemove,
                icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                label: const Text('Remove', style: TextStyle(color: Colors.redAccent)),
              ),
            )
          ],
        ),
      ),
    );
  }
}
