import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/learning/learning_models.dart';
import '../provider/learning/learning_store.dart';

class CourseViewerScreen extends ConsumerStatefulWidget {
  const CourseViewerScreen({super.key});

  @override
  ConsumerState<CourseViewerScreen> createState() => _CourseViewerScreenState();
}

class _CourseViewerScreenState extends ConsumerState<CourseViewerScreen> {
  String _searchTerm = '';
  String _levelFilter = 'All levels';
  String? _selectedCourseId;

  static const _levels = ['All levels', 'Beginner', 'Intermediate', 'Advanced'];

  @override
  Widget build(BuildContext context) {
    final courses = ref.watch(courseStoreProvider);
    final filteredCourses = courses.where((course) {
      final matchesSearch = course.title.toLowerCase().contains(_searchTerm.toLowerCase()) ||
          course.summary.toLowerCase().contains(_searchTerm.toLowerCase()) ||
          course.tags.any((tag) => tag.toLowerCase().contains(_searchTerm.toLowerCase()));
      final matchesLevel = _levelFilter == 'All levels' || course.level == _levelFilter;
      return matchesSearch && matchesLevel;
    }).toList();

    final selectedCourse = filteredCourses.firstWhere(
      (course) => course.id == _selectedCourseId,
      orElse: () => filteredCourses.isEmpty ? null : filteredCourses.first,
    );

    _selectedCourseId = selectedCourse?.id;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Course catalog'),
        actions: [
          IconButton(
            tooltip: 'Create course',
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () => _openCourseForm(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: selectedCourse == null ? null : () => _openCourseForm(course: selectedCourse),
        icon: const Icon(Icons.edit_note_outlined),
        label: const Text('Edit course'),
      ),
      body: Column(
        children: [
          _buildFilters(context),
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth > 900;
                if (filteredCourses.isEmpty) {
                  return _EmptyState(onCreate: _openCourseForm);
                }

                if (isWide) {
                  return Row(
                    children: [
                      SizedBox(
                        width: 360,
                        child: _CourseList(
                          courses: filteredCourses,
                          selectedId: selectedCourse?.id,
                          onTap: (course) => setState(() => _selectedCourseId = course.id),
                          onFavorite: (course) => ref.read(courseStoreProvider.notifier).toggleFavorite(course.id),
                          onDelete: (course) => _confirmDeletion(context, course),
                        ),
                      ),
                      const VerticalDivider(width: 1),
                      Expanded(
                        child: _CourseDetail(
                          course: selectedCourse!,
                          onUpdateModule: (moduleId, completed) {
                            ref
                                .read(courseStoreProvider.notifier)
                                .updateModuleProgress(courseId: selectedCourse.id, moduleId: moduleId, completedLessons: completed);
                          },
                        ),
                      ),
                    ],
                  );
                }

                return _CourseList(
                  courses: filteredCourses,
                  selectedId: selectedCourse?.id,
                  onTap: (course) => _showCourseDetailSheet(course),
                  onFavorite: (course) => ref.read(courseStoreProvider.notifier).toggleFavorite(course.id),
                  onDelete: (course) => _confirmDeletion(context, course),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search),
              hintText: 'Search by title, summary, or tag',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
            ),
            onChanged: (value) => setState(() => _searchTerm = value),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              DropdownButton<String>(
                value: _levelFilter,
                onChanged: (value) => setState(() => _levelFilter = value ?? 'All levels'),
                items: _levels
                    .map(
                      (level) => DropdownMenuItem(
                        value: level,
                        child: Text(level),
                      ),
                    )
                    .toList(),
              ),
              FilledButton.icon(
                icon: const Icon(Icons.add_chart_outlined),
                label: const Text('Create course'),
                onPressed: () => _openCourseForm(),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _openCourseForm({Course? course}) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return _CourseFormSheet(
          course: course,
          onSubmit: (created) {
            final notifier = ref.read(courseStoreProvider.notifier);
            if (course == null) {
              notifier.createCourse(created);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Course created successfully')),
              );
            } else {
              notifier.updateCourse(created);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Course updated')),
              );
            }
          },
        );
      },
    );
  }

  Future<void> _showCourseDetailSheet(Course course) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return FractionallySizedBox(
          heightFactor: 0.9,
          child: _CourseDetail(
            course: course,
            onUpdateModule: (moduleId, completed) {
              ref.read(courseStoreProvider.notifier).updateModuleProgress(
                    courseId: course.id,
                    moduleId: moduleId,
                    completedLessons: completed,
                  );
            },
          ),
        );
      },
    );
  }

  Future<void> _confirmDeletion(BuildContext context, Course course) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete course'),
        content: Text('Are you sure you want to remove "${course.title}" from the catalog?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      ref.read(courseStoreProvider.notifier).deleteCourse(course.id);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${course.title} removed')),
      );
    }
  }
}

class _CourseList extends StatelessWidget {
  const _CourseList({
    required this.courses,
    required this.onTap,
    required this.onFavorite,
    required this.onDelete,
    this.selectedId,
  });

  final List<Course> courses;
  final void Function(Course) onTap;
  final void Function(Course) onFavorite;
  final void Function(Course) onDelete;
  final String? selectedId;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: courses.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final course = courses[index];
        final price = NumberFormat.simpleCurrency().format(course.price);
        final progress = (course.overallProgress * 100).toStringAsFixed(0);
        return AnimatedContainer(
          duration: const Duration(milliseconds: 240),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: selectedId == course.id ? Theme.of(context).colorScheme.primaryContainer : Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => onTap(course),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.network(
                      '${course.thumbnailUrl}?auto=format&fit=crop&w=160&q=80',
                      height: 90,
                      width: 90,
                      fit: BoxFit.cover,
                      errorBuilder: (context, _, __) => Container(
                        height: 90,
                        width: 90,
                        color: Colors.grey.shade100,
                        alignment: Alignment.center,
                        child: const Icon(Icons.image_not_supported_outlined),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                course.title,
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                              ),
                            ),
                            IconButton(
                              tooltip: course.favorite ? 'Remove from favorites' : 'Mark as favorite',
                              icon: Icon(course.favorite ? Icons.favorite : Icons.favorite_border),
                              color: course.favorite ? Colors.pinkAccent : null,
                              onPressed: () => onFavorite(course),
                            ),
                            IconButton(
                              tooltip: 'Delete course',
                              icon: const Icon(Icons.delete_outline),
                              onPressed: () => onDelete(course),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            Chip(label: Text(course.category)),
                            Chip(label: Text(course.level)),
                            for (final tag in course.tags.take(3)) Chip(label: Text(tag)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          course.summary,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.play_circle_outline, color: Theme.of(context).colorScheme.primary, size: 20),
                            const SizedBox(width: 6),
                            Text('${course.modules.length} modules • $progress% complete'),
                            const Spacer(),
                            Text(price, style: const TextStyle(fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _CourseDetail extends StatefulWidget {
  const _CourseDetail({
    required this.course,
    required this.onUpdateModule,
  });

  final Course course;
  final void Function(String moduleId, int completedLessons) onUpdateModule;

  @override
  State<_CourseDetail> createState() => _CourseDetailState();
}

class _CourseDetailState extends State<_CourseDetail> {
  late Course _course;

  @override
  void initState() {
    super.initState();
    _course = widget.course;
  }

  @override
  void didUpdateWidget(covariant _CourseDetail oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.course.id != widget.course.id) {
      _course = widget.course;
    } else {
      _course = widget.course;
    }
  }

  @override
  Widget build(BuildContext context) {
    final progressText = (_course.overallProgress * 100).toStringAsFixed(0);
    final currency = NumberFormat.simpleCurrency().format(_course.price);
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(_course.title),
        actions: [
          IconButton(
            tooltip: 'Share course',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Share link copied to clipboard')), // placeholder copy action
              );
            },
            icon: const Icon(Icons.share_outlined),
          )
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: LinearGradient(
                colors: [
                  Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  Theme.of(context).colorScheme.secondary.withOpacity(0.08),
                ],
              ),
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: Image.network(
                        '${_course.thumbnailUrl}?auto=format&fit=crop&w=200&q=80',
                        height: 140,
                        width: 140,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _course.title,
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: [
                              Chip(label: Text(_course.category)),
                              Chip(label: Text(_course.level)),
                              Chip(label: Text(_course.language)),
                              if (_course.isPublished)
                                const Chip(
                                  avatar: Icon(Icons.public, size: 18),
                                  label: Text('Published'),
                                )
                              else
                                const Chip(
                                  avatar: Icon(Icons.edit_outlined, size: 18),
                                  label: Text('Draft'),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _course.summary,
                            style: Theme.of(context).textTheme.bodyLarge,
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Icon(Icons.play_circle_fill, color: Theme.of(context).colorScheme.primary),
                              const SizedBox(width: 8),
                              Text('${_course.modules.length} modules • $progressText% complete'),
                              const Spacer(),
                              Text(currency, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                            ],
                          ),
                        ],
                      ),
                    )
                  ],
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  children: [for (final tag in _course.tags) Chip(label: Text(tag))],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text('Modules', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ..._course.modules.map(
            (module) {
              final moduleProgress = module.completionRatio;
              return Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                margin: const EdgeInsets.only(bottom: 16),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              module.title,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                            ),
                          ),
                          Text('${module.lessonCount} lessons'),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(module.description),
                      const SizedBox(height: 12),
                      LinearProgressIndicator(
                        value: moduleProgress,
                        minHeight: 10,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Text('Progress: ${(moduleProgress * 100).toStringAsFixed(0)}%'),
                          const Spacer(),
                          FilledButton.tonalIcon(
                            icon: const Icon(Icons.checklist_outlined),
                            label: const Text('Update'),
                            onPressed: () => _openProgressUpdateDialog(module),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            icon: const Icon(Icons.timeline_outlined),
            label: const Text('Log progress event'),
            onPressed: () => _openProgressUpdateDialog(),
          ),
        ],
      ),
    );
  }

  Future<void> _openProgressUpdateDialog([CourseModule? module]) async {
    final controller = TextEditingController(text: module?.completedLessons.toString() ?? '0');
    final result = await showDialog<int>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Update ${module?.title ?? 'module'} progress'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(labelText: 'Completed lessons'),
            keyboardType: TextInputType.number,
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                final value = int.tryParse(controller.text) ?? 0;
                Navigator.pop(context, value);
              },
              child: const Text('Save'),
            )
          ],
        );
      },
    );

    if (result != null && module != null) {
      widget.onUpdateModule(module.id, result);
    }
  }
}

class _CourseFormSheet extends ConsumerStatefulWidget {
  const _CourseFormSheet({
    required this.onSubmit,
    this.course,
  });

  final Course? course;
  final void Function(Course course) onSubmit;

  @override
  ConsumerState<_CourseFormSheet> createState() => _CourseFormSheetState();
}

class _CourseFormSheetState extends ConsumerState<_CourseFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _categoryController;
  late final TextEditingController _levelController;
  late final TextEditingController _summaryController;
  late final TextEditingController _thumbnailController;
  late final TextEditingController _priceController;
  late final TextEditingController _languageController;
  late final TextEditingController _tagsController;
  bool _isPublished = false;
  bool _favorite = false;
  double? _rating;
  final List<_ModuleFormData> _modules = [];

  @override
  void initState() {
    super.initState();
    final course = widget.course;
    _titleController = TextEditingController(text: course?.title ?? '');
    _categoryController = TextEditingController(text: course?.category ?? '');
    _levelController = TextEditingController(text: course?.level ?? '');
    _summaryController = TextEditingController(text: course?.summary ?? '');
    _thumbnailController = TextEditingController(text: course?.thumbnailUrl ?? '');
    _priceController = TextEditingController(text: course?.price.toString() ?? '');
    _languageController = TextEditingController(text: course?.language ?? '');
    _tagsController = TextEditingController(text: course?.tags.join(', ') ?? '');
    _isPublished = course?.isPublished ?? true;
    _favorite = course?.favorite ?? false;
    _rating = course?.rating;
    if (course != null) {
      for (final module in course.modules) {
        _modules.add(
          _ModuleFormData(
            id: module.id,
            titleController: TextEditingController(text: module.title),
            lessonsController: TextEditingController(text: module.lessonCount.toString()),
            durationController: TextEditingController(text: module.durationMinutes.toString()),
            descriptionController: TextEditingController(text: module.description),
          ),
        );
      }
    }
    if (_modules.isEmpty) {
      _addModule();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _categoryController.dispose();
    _levelController.dispose();
    _summaryController.dispose();
    _thumbnailController.dispose();
    _priceController.dispose();
    _languageController.dispose();
    _tagsController.dispose();
    for (final module in _modules) {
      module.dispose();
    }
    super.dispose();
  }

  void _addModule() {
    setState(() {
      _modules.add(_ModuleFormData.newEmpty());
    });
  }

  void _removeModule(_ModuleFormData module) {
    if (_modules.length <= 1) return;
    setState(() {
      _modules.remove(module);
      module.dispose();
    });
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final notifier = ref.read(courseStoreProvider.notifier);
    final modules = _modules
        .map(
          (module) => CourseModule(
            id: module.id,
            title: module.titleController.text.trim(),
            lessonCount: int.tryParse(module.lessonsController.text) ?? 0,
            durationMinutes: int.tryParse(module.durationController.text) ?? 0,
            description: module.descriptionController.text.trim(),
          ),
        )
        .toList();

    final tags = _tagsController.text.split(',').map((tag) => tag.trim()).where((tag) => tag.isNotEmpty).toList();
    final course = notifier.buildCourseFromForm(
      id: widget.course?.id,
      title: _titleController.text.trim(),
      category: _categoryController.text.trim(),
      level: _levelController.text.trim().isEmpty ? 'Beginner' : _levelController.text.trim(),
      summary: _summaryController.text.trim(),
      thumbnailUrl: _thumbnailController.text.trim(),
      price: double.tryParse(_priceController.text) ?? 0,
      language: _languageController.text.trim().isEmpty ? 'English' : _languageController.text.trim(),
      tags: tags,
      modules: modules,
      isPublished: _isPublished,
      favorite: _favorite,
      rating: _rating,
    );
    widget.onSubmit(course);
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
                    widget.course == null ? 'Create course' : 'Update course',
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
                    controller: _summaryController,
                    decoration: const InputDecoration(labelText: 'Summary'),
                    minLines: 2,
                    maxLines: 4,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _categoryController,
                          decoration: const InputDecoration(labelText: 'Category'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _levelController,
                          decoration: const InputDecoration(labelText: 'Level'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _thumbnailController,
                    decoration: const InputDecoration(labelText: 'Thumbnail URL'),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _priceController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Price'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _languageController,
                          decoration: const InputDecoration(labelText: 'Language'),
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
                  Row(
                    children: [
                      Expanded(
                        child: SwitchListTile.adaptive(
                          title: const Text('Published'),
                          contentPadding: EdgeInsets.zero,
                          value: _isPublished,
                          onChanged: (value) => setState(() => _isPublished = value),
                        ),
                      ),
                      Expanded(
                        child: SwitchListTile.adaptive(
                          title: const Text('Favorite'),
                          contentPadding: EdgeInsets.zero,
                          value: _favorite,
                          onChanged: (value) => setState(() => _favorite = value),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    initialValue: _rating?.toString() ?? '',
                    decoration: const InputDecoration(labelText: 'Rating (optional)'),
                    keyboardType: TextInputType.number,
                    onChanged: (value) => _rating = double.tryParse(value),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Text(
                        'Modules',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const Spacer(),
                      TextButton.icon(
                        onPressed: _addModule,
                        icon: const Icon(Icons.add),
                        label: const Text('Add module'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ..._modules.map(
                    (module) => Padding(
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
                                      controller: module.titleController,
                                      decoration: const InputDecoration(labelText: 'Module title'),
                                      validator: (value) => value == null || value.isEmpty ? 'Title required' : null,
                                    ),
                                  ),
                                  IconButton(
                                    tooltip: 'Remove module',
                                    onPressed: () => _removeModule(module),
                                    icon: const Icon(Icons.remove_circle_outline),
                                  )
                                ],
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: module.descriptionController,
                                decoration: const InputDecoration(labelText: 'Description'),
                                minLines: 2,
                                maxLines: 4,
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: module.lessonsController,
                                      decoration: const InputDecoration(labelText: 'Lesson count'),
                                      keyboardType: TextInputType.number,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: TextFormField(
                                      controller: module.durationController,
                                      decoration: const InputDecoration(labelText: 'Duration (minutes)'),
                                      keyboardType: TextInputType.number,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      onPressed: _submit,
                      child: Text(widget.course == null ? 'Create course' : 'Save changes'),
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

class _ModuleFormData {
  _ModuleFormData({
    required this.id,
    required this.titleController,
    required this.lessonsController,
    required this.durationController,
    required this.descriptionController,
  });

  factory _ModuleFormData.newEmpty() {
    return _ModuleFormData(
      id: UniqueKey().toString(),
      titleController: TextEditingController(),
      lessonsController: TextEditingController(text: '4'),
      durationController: TextEditingController(text: '180'),
      descriptionController: TextEditingController(),
    );
  }

  final String id;
  final TextEditingController titleController;
  final TextEditingController lessonsController;
  final TextEditingController durationController;
  final TextEditingController descriptionController;

  void dispose() {
    titleController.dispose();
    lessonsController.dispose();
    durationController.dispose();
    descriptionController.dispose();
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onCreate});

  final void Function({Course? course}) onCreate;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.school_outlined, size: 64, color: Colors.blueGrey),
          const SizedBox(height: 16),
          Text(
            'No courses yet',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          const Text('Create your first course to launch an interactive learning journey.'),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () => onCreate(),
            icon: const Icon(Icons.add_circle_outline),
            label: const Text('Create course'),
          )
        ],
      ),
    );
  }
}
