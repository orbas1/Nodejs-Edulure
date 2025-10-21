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
    _categories = _dedupeCaseInsensitive(
      _draft.categories.map((value) => _normalizeCategory(value) ?? value),
    );
    _tags = _dedupeCaseInsensitive(
      _draft.tags.map((value) => _normalizeTag(value) ?? value),
    );
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

  void _addCategory(BuildContext context) {
    final normalized = _normalizeCategory(_categoryInput.text);
    _categoryInput.clear();
    if (normalized == null) {
      return;
    }
    final exists = _categories.any((value) => value.toLowerCase() == normalized.toLowerCase());
    if (_categories.length >= 12 && !exists) {
      _showSnackBar(context, 'You can add up to 12 categories.');
      return;
    }
    setState(() {
      final next = List<String>.from(_categories);
      if (!exists) {
        next.add(normalized);
      }
      _categories = next;
    });
  }

  void _removeCategory(String category) {
    setState(() {
      _categories = _categories
          .where((item) => item.toLowerCase() != category.toLowerCase())
          .toList();
    });
  }

  void _addTag(BuildContext context) {
    final raw = _tagInput.text;
    final normalized = _normalizeTag(raw);
    _tagInput.clear();
    if (normalized == null) {
      if (raw.trim().isNotEmpty) {
        _showSnackBar(context, 'Tags can include letters, numbers, hyphen, or underscore.');
      }
      return;
    }
    final exists = _tags.any((value) => value.toLowerCase() == normalized.toLowerCase());
    if (_tags.length >= 24 && !exists) {
      _showSnackBar(context, 'You can add up to 24 tags.');
      return;
    }
    setState(() {
      final next = List<String>.from(_tags);
      if (!exists) {
        next.add(normalized);
      }
      _tags = next;
    });
  }

  void _removeTag(String tag) {
    setState(() {
      _tags = _tags.where((item) => item.toLowerCase() != tag.toLowerCase()).toList();
    });
  }

  void _addGalleryItem(BuildContext context) {
    if (_gallery.length >= 8) {
      _showSnackBar(context, 'Gallery supports up to 8 items.');
      return;
    }
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

  String? _normalizeCategory(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) {
      return null;
    }
    return trimmed.replaceAll(RegExp(r'\s+'), ' ');
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

  String? _validateBeforeSave() {
    final urlChecks = <String, String>{
      'Cover image URL': _coverUrlController.text,
      'Video URL': _videoUrlController.text,
      'Video poster image': _videoPosterController.text,
      'Call to action URL': _ctaUrlController.text,
    };
    for (final entry in urlChecks.entries) {
      final value = entry.value.trim();
      if (value.isEmpty) {
        continue;
      }
      final error = _validateHttpsUrl(
        value,
        invalidSchemeMessage: '${entry.key} must be a valid https:// link.',
        privateHostMessage: '${entry.key} must point to a public host.',
      );
      if (error != null) {
        return error;
      }
    }
    for (var i = 0; i < _gallery.length; i++) {
      final url = _gallery[i].url.trim();
      if (url.isEmpty) {
        continue;
      }
      final error = _validateHttpsUrl(
        url,
        invalidSchemeMessage: 'Gallery item ${i + 1} must use a valid https:// link.',
        privateHostMessage: 'Gallery item ${i + 1} must target a public host.',
      );
      if (error != null) {
        return error;
      }
    }
    final coverUrl = _coverUrlController.text.trim();
    if (coverUrl.isNotEmpty && _coverAltController.text.trim().isEmpty) {
      return 'Add alternative text for the cover image to ensure accessibility.';
    }
    final ctaLabel = _ctaLabelController.text.trim();
    final ctaUrl = _ctaUrlController.text.trim();
    if (ctaLabel.isNotEmpty && ctaUrl.isEmpty) {
      return 'Provide a call-to-action link when setting a label.';
    }
    if (ctaUrl.isNotEmpty && ctaLabel.isEmpty) {
      return 'Provide a call-to-action label when linking out.';
    }
    return null;
  }

  String? _validateHttpsUrl(
    String value, {
    required String invalidSchemeMessage,
    required String privateHostMessage,
  }) {
    final uri = Uri.tryParse(value.trim());
    if (uri == null || !uri.hasScheme || uri.host.isEmpty || uri.scheme != 'https') {
      return invalidSchemeMessage;
    }
    if (!_isPublicHost(uri.host)) {
      return privateHostMessage;
    }
    return null;
  }

  bool _isPublicHost(String host) {
    final lower = host.toLowerCase();
    if (lower == 'localhost' || lower == '::1' || lower == '0:0:0:0:0:0:0:1') {
      return false;
    }
    if (lower.endsWith('.local')) {
      return false;
    }
    final privatePrefixes = <String>['10.', '127.', '169.254.', '192.168.', '0.'];
    if (privatePrefixes.any(lower.startsWith)) {
      return false;
    }
    final match172 = RegExp(r'^172\.(1[6-9]|2[0-9]|3[0-1])\.');
    if (match172.hasMatch(lower)) {
      return false;
    }
    return true;
  }

  List<String> _dedupeCaseInsensitive(Iterable<String> values) {
    final seen = <String>{};
    final result = <String>[];
    for (final value in values) {
      final trimmed = value.trim();
      if (trimmed.isEmpty) {
        continue;
      }
      final key = trimmed.toLowerCase();
      if (seen.add(key)) {
        result.add(trimmed);
      }
    }
    return result;
  }

  String? _valueOrNull(String text) {
    final trimmed = text.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
      _feedback = null;
    });
    final validationError = _validateBeforeSave();
    if (validationError != null) {
      setState(() {
        _saving = false;
        _error = validationError;
      });
      return;
    }
    final categories = _dedupeCaseInsensitive(
      _categories.map((value) => _normalizeCategory(value) ?? value),
    );
    final tags = _dedupeCaseInsensitive(
      _tags.map((value) => _normalizeTag(value) ?? value),
    );
    final gallery = _gallery
        .where((item) => item.url.trim().isNotEmpty)
        .map(
          (item) => item.copyWith(
            url: item.url.trim(),
            caption: _valueOrNull(item.caption ?? ''),
          ),
        )
        .toList();
    final update = MaterialMetadataUpdate(
      title: _valueOrNull(_titleController.text),
      description: _valueOrNull(_descriptionController.text),
      categories: categories,
      tags: tags,
      coverImageUrl: _valueOrNull(_coverUrlController.text),
      coverImageAlt: _valueOrNull(_coverAltController.text),
      gallery: gallery,
      videoUrl: _valueOrNull(_videoUrlController.text),
      videoPosterUrl: _valueOrNull(_videoPosterController.text),
      headline: _valueOrNull(_headlineController.text),
      subheadline: _valueOrNull(_subheadlineController.text),
      callToActionLabel: _valueOrNull(_ctaLabelController.text),
      callToActionUrl: _valueOrNull(_ctaUrlController.text),
      badge: _valueOrNull(_badgeController.text),
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
                    onAdd: () => _addCategory(context),
                    onRemove: _removeCategory,
                  ),
                  const SizedBox(height: 16),
                  _buildChipEditor(
                    context,
                    title: 'Tags',
                    helper: 'Up to 24 long-tail tags to support discovery.',
                    values: _tags,
                    controller: _tagInput,
                    onAdd: () => _addTag(context),
                    onRemove: _removeTag,
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    context,
                    controller: _coverUrlController,
                    label: 'Cover image URL',
                    hint: 'https://cdn.example.com/material.jpg',
                    fieldKey: const ValueKey('material_cover_url'),
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    context,
                    controller: _coverAltController,
                    label: 'Cover image alt text',
                    hint: 'Learners collaborating around insights dashboard',
                    maxLength: 120,
                    fieldKey: const ValueKey('material_cover_alt'),
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    context,
                    controller: _videoUrlController,
                    label: 'Showcase video URL',
                    hint: 'https://cdn.example.com/showcase.mp4',
                    fieldKey: const ValueKey('material_video_url'),
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    context,
                    controller: _videoPosterController,
                    label: 'Video poster image',
                    hint: 'https://cdn.example.com/showcase-poster.jpg',
                    fieldKey: const ValueKey('material_video_poster'),
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
                    fieldKey: const ValueKey('material_cta_label'),
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    context,
                    controller: _ctaUrlController,
                    label: 'Call to action URL',
                    hint: 'https://cal.com/edulure/demo',
                    fieldKey: const ValueKey('material_cta_url'),
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
                      onPressed: () => _addGalleryItem(context),
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
    Key? fieldKey,
  }) {
    return TextField(
      key: fieldKey,
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
