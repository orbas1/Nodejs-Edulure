import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../provider/learning/learning_models.dart';
import '../provider/learning/learning_store.dart';
import '../services/lesson_download_service.dart';

enum _CourseCatalogAction { refresh, restoreSeed }

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
            tooltip: 'Guided course wizard',
            icon: const Icon(Icons.auto_fix_high_outlined),
            onPressed: _openCourseWizard,
          ),
          IconButton(
            tooltip: 'Create course',
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () => _openCourseForm(),
          ),
          PopupMenuButton<_CourseCatalogAction>(
            tooltip: 'Catalog sync options',
            onSelected: _handleCatalogAction,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: _CourseCatalogAction.refresh,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.sync, size: 20),
                    SizedBox(width: 12),
                    Text('Reload saved catalog'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: _CourseCatalogAction.restoreSeed,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.restore_outlined, size: 20),
                    SizedBox(width: 12),
                    Text('Restore demo catalog'),
                  ],
                ),
              ),
            ],
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

  Future<void> _handleCatalogAction(_CourseCatalogAction action) async {
    final notifier = ref.read(courseStoreProvider.notifier);
    switch (action) {
      case _CourseCatalogAction.refresh:
        await notifier.refreshFromPersistence();
        if (!mounted) return;
        _showSnackBar('Reloaded saved catalog');
        break;
      case _CourseCatalogAction.restoreSeed:
        await notifier.restoreSeedData();
        if (!mounted) return;
        setState(() => _selectedCourseId = null);
        _showSnackBar('Restored demo catalog');
        break;
    }
  }

  void _showSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
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

  void _openCourseWizard() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return _CourseWizardSheet(
          onSubmit: (course) {
            ref.read(courseStoreProvider.notifier).createCourse(course);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('"${course.title}" drafted via guided wizard')),
            );
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

class _CourseDetail extends ConsumerStatefulWidget {
  const _CourseDetail({
    required this.course,
    required this.onUpdateModule,
  });

  final Course course;
  final void Function(String moduleId, int completedLessons) onUpdateModule;

  @override
  ConsumerState<_CourseDetail> createState() => _CourseDetailState();
}

class _CourseDetailState extends ConsumerState<_CourseDetail> {
  late Course _course;
  final Set<String> _pendingDownloads = <String>{};

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

  bool _isPending(String moduleId) => _pendingDownloads.contains(moduleId);

  void _setPending(String moduleId, bool value) {
    setState(() {
      if (value) {
        _pendingDownloads.add(moduleId);
      } else {
        _pendingDownloads.remove(moduleId);
      }
    });
  }

  LessonDownloadRecord? _downloadForModule(
    List<LessonDownloadRecord> downloads,
    String moduleId,
  ) {
    for (final record in downloads) {
      if (record.courseId == _course.id && record.moduleId == moduleId) {
        return record;
      }
    }
    return null;
  }

  Future<void> _queueModuleDownload(CourseModule module) async {
    final service = ref.read(lessonDownloadServiceProvider);
    _setPending(module.id, true);
    try {
      await service.queueDownload(
        courseId: _course.id,
        moduleId: module.id,
        moduleTitle: module.title,
        assetUrls: _moduleAssets(module),
        expectedSizeBytes: max(1, module.lessonCount) * 15 * 1024 * 1024,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Queued offline bundle for ${module.title}')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to queue download: $error')),
      );
    } finally {
      if (mounted) {
        _setPending(module.id, false);
      }
    }
  }

  Future<void> _cancelModuleDownload(LessonDownloadRecord record) async {
    final service = ref.read(lessonDownloadServiceProvider);
    _setPending(record.moduleId, true);
    try {
      await service.cancelDownload(record.id, reason: 'Cancelled from course viewer');
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Cancelled offline download for ${record.moduleTitle}')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to cancel download: $error')),
      );
    } finally {
      if (mounted) {
        _setPending(record.moduleId, false);
      }
    }
  }

  Future<void> _retryModuleDownload(LessonDownloadRecord record) async {
    final service = ref.read(lessonDownloadServiceProvider);
    _setPending(record.moduleId, true);
    try {
      await service.retryDownload(record.id);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Retrying offline bundle for ${record.moduleTitle}')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to retry download: $error')),
      );
    } finally {
      if (mounted) {
        _setPending(record.moduleId, false);
      }
    }
  }

  Future<void> _removeModuleDownload(LessonDownloadRecord record) async {
    final service = ref.read(lessonDownloadServiceProvider);
    _setPending(record.moduleId, true);
    try {
      await service.removeDownload(record.id);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Removed offline bundle for ${record.moduleTitle}')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to remove download: $error')),
      );
    } finally {
      if (mounted) {
        _setPending(record.moduleId, false);
      }
    }
  }

  Future<void> _showManifest(LessonDownloadRecord record) async {
    if (!mounted) {
      return;
    }
    final manifest = record.manifestPath ?? 'Manifest path unavailable';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(manifest)),
    );
  }

  List<String> _moduleAssets(CourseModule module) {
    return <String>[
      'https://cdn.edulure.com/courses/${_course.id}/${module.id}/lesson-pack.zip',
      'https://cdn.edulure.com/courses/${_course.id}/${module.id}/notes.pdf',
    ];
  }

  String _formatDownloadSize(LessonDownloadRecord record) {
    final bytes = record.downloadedBytes ?? record.expectedSizeBytes;
    if (bytes == null || bytes <= 0) {
      return '';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    var value = bytes.toDouble();
    var unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    final formatted = value >= 10 ? value.toStringAsFixed(0) : value.toStringAsFixed(1);
    return '$formatted ${units[unitIndex]}';
  }

  Widget _buildOfflineSection(
    BuildContext context,
    CourseModule module,
    LessonDownloadRecord? record, {
    required bool isLoading,
    required Object? error,
  }) {
    final theme = Theme.of(context);
    final pending = _isPending(module.id);

    String statusText;
    IconData icon;
    Color? iconColor;

    if (record == null) {
      if (isLoading) {
        statusText = 'Loading offline status…';
        icon = Icons.sync;
        iconColor = theme.colorScheme.primary;
      } else if (error != null) {
        statusText = 'Offline status unavailable';
        icon = Icons.error_outline;
        iconColor = theme.colorScheme.error;
      } else {
        statusText = 'Offline bundle not cached yet';
        icon = Icons.cloud_download_outlined;
        iconColor = theme.colorScheme.primary;
      }
    } else {
      switch (record.status) {
        case LessonDownloadStatus.queued:
          statusText = 'Queued for download — preparing offline bundle';
          icon = Icons.schedule_outlined;
          iconColor = theme.colorScheme.primary;
          break;
        case LessonDownloadStatus.downloading:
          final progressLabel = (record.progress * 100).clamp(0, 100).toStringAsFixed(0);
          statusText = 'Downloading $progressLabel%';
          icon = Icons.cloud_download;
          iconColor = theme.colorScheme.primary;
          break;
        case LessonDownloadStatus.completed:
          final size = _formatDownloadSize(record);
          statusText = 'Available offline${size.isEmpty ? '' : ' • $size'}';
          icon = Icons.offline_pin_outlined;
          iconColor = theme.colorScheme.secondary;
          break;
        case LessonDownloadStatus.failed:
          statusText = record.errorMessage == null
              ? 'Download failed'
              : 'Download failed — ${record.errorMessage}';
          icon = Icons.error_outline;
          iconColor = theme.colorScheme.error;
          break;
      }
    }

    final actions = <Widget>[];
    if (record == null) {
      actions.add(
        FilledButton.tonalIcon(
          onPressed: pending || isLoading ? null : () => _queueModuleDownload(module),
          icon: const Icon(Icons.download_outlined),
          label: const Text('Download for offline'),
        ),
      );
    } else {
      switch (record.status) {
        case LessonDownloadStatus.queued:
        case LessonDownloadStatus.downloading:
          actions.add(
            TextButton.icon(
              onPressed: pending ? null : () => _cancelModuleDownload(record),
              icon: const Icon(Icons.cancel_outlined),
              label: const Text('Cancel download'),
            ),
          );
          break;
        case LessonDownloadStatus.completed:
          actions.add(
            TextButton.icon(
              onPressed: pending ? null : () => _removeModuleDownload(record),
              icon: const Icon(Icons.delete_outline),
              label: const Text('Remove offline copy'),
            ),
          );
          actions.add(
            TextButton.icon(
              onPressed: record.manifestPath == null ? null : () => _showManifest(record),
              icon: const Icon(Icons.description_outlined),
              label: const Text('View manifest path'),
            ),
          );
          break;
        case LessonDownloadStatus.failed:
          actions.add(
            FilledButton.tonalIcon(
              onPressed: pending ? null : () => _retryModuleDownload(record),
              icon: const Icon(Icons.refresh_outlined),
              label: const Text('Retry download'),
            ),
          );
          actions.add(
            TextButton.icon(
              onPressed: pending ? null : () => _removeModuleDownload(record),
              icon: const Icon(Icons.delete_outline),
              label: const Text('Clear record'),
            ),
          );
          break;
      }
    }

    final showProgress = record != null &&
        (record.status == LessonDownloadStatus.downloading || record.status == LessonDownloadStatus.queued);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: iconColor ?? theme.colorScheme.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                statusText,
                style: theme.textTheme.bodyMedium,
              ),
            ),
          ],
        ),
        if (showProgress) ...[
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: record!.progress > 0 ? record.progress.clamp(0, 1) : null,
            minHeight: 6,
            borderRadius: BorderRadius.circular(8),
          ),
        ],
        const SizedBox(height: 8),
        Wrap(
          spacing: 12,
          runSpacing: 8,
          children: actions,
        ),
      ],
    );
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
    final progressText = (_course.overallProgress * 100).toStringAsFixed(0);
    final currency = NumberFormat.simpleCurrency().format(_course.price);
    final downloadsAsync = ref.watch(lessonDownloadManifestProvider);
    final downloads = downloadsAsync.value ?? const <LessonDownloadRecord>[];
    final offlineError = downloadsAsync.hasError ? downloadsAsync.error : null;
    final offlineLoading = downloadsAsync.isLoading;
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
                if ((_course.promoVideoUrl ?? '').isNotEmpty) ...[
                  const SizedBox(height: 16),
                  GestureDetector(
                    onTap: () => _launchExternal(_course.promoVideoUrl!),
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: Image.network(
                              '${_course.thumbnailUrl}?auto=format&fit=crop&w=900&q=80',
                              fit: BoxFit.cover,
                            ),
                          ),
                          Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20),
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.black.withOpacity(0.05),
                                  Colors.black.withOpacity(0.45),
                                ],
                              ),
                            ),
                          ),
                          Center(
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.65),
                                shape: BoxShape.circle,
                              ),
                              child: const Padding(
                                padding: EdgeInsets.all(18),
                                child: Icon(Icons.play_arrow_rounded, color: Colors.white, size: 36),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                if ((_course.syllabusUrl ?? '').isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: FilledButton.tonalIcon(
                      onPressed: () => _launchExternal(_course.syllabusUrl!),
                      icon: const Icon(Icons.picture_as_pdf_outlined),
                      label: const Text('Download syllabus'),
                    ),
                  ),
                ],
                if (_course.learningOutcomes.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Learner outcomes',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 12),
                          ..._course.learningOutcomes.map(
                            (outcome) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(Icons.check_circle_outline, color: Theme.of(context).colorScheme.primary),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(outcome)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text('Modules', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ..._course.modules.map(
            (module) {
              final moduleProgress = module.completionRatio;
              final downloadRecord = _downloadForModule(downloads, module.id);
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
                      const SizedBox(height: 12),
                      _buildOfflineSection(
                        context,
                        module,
                        downloadRecord,
                        isLoading: offlineLoading,
                        error: offlineError,
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

class _CourseWizardSheet extends ConsumerStatefulWidget {
  const _CourseWizardSheet({
    required this.onSubmit,
    this.template,
  });

  final Course? template;
  final void Function(Course course) onSubmit;

  @override
  ConsumerState<_CourseWizardSheet> createState() => _CourseWizardSheetState();
}

class _CourseWizardSheetState extends ConsumerState<_CourseWizardSheet> {
  final _formKey = GlobalKey<FormState>();
  int _currentStep = 0;
  late final TextEditingController _titleController;
  late final TextEditingController _summaryController;
  late final TextEditingController _categoryController;
  late final TextEditingController _levelController;
  late final TextEditingController _languageController;
  late final TextEditingController _thumbnailController;
  late final TextEditingController _promoVideoController;
  late final TextEditingController _syllabusController;
  late final TextEditingController _priceController;
  late final TextEditingController _tagsController;
  late final TextEditingController _outcomesController;
  bool _isPublished = true;
  bool _favorite = false;
  double? _rating;
  final List<_ModuleFormData> _modules = [];

  @override
  void initState() {
    super.initState();
    final template = widget.template;
    _titleController = TextEditingController(text: template?.title ?? '');
    _summaryController = TextEditingController(text: template?.summary ?? '');
    _categoryController = TextEditingController(text: template?.category ?? '');
    _levelController = TextEditingController(text: template?.level ?? '');
    _languageController = TextEditingController(text: template?.language ?? '');
    _thumbnailController = TextEditingController(text: template?.thumbnailUrl ?? '');
    _promoVideoController = TextEditingController(text: template?.promoVideoUrl ?? '');
    _syllabusController = TextEditingController(text: template?.syllabusUrl ?? '');
    _priceController = TextEditingController(text: template?.price.toString() ?? '');
    _tagsController = TextEditingController(text: template?.tags.join(', ') ?? '');
    _outcomesController = TextEditingController(
      text: template == null || template.learningOutcomes.isEmpty
          ? ''
          : template.learningOutcomes.join('\n'),
    );
    _isPublished = template?.isPublished ?? true;
    _favorite = template?.favorite ?? false;
    _rating = template?.rating;
    if (template != null) {
      for (final module in template.modules) {
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
    _summaryController.dispose();
    _categoryController.dispose();
    _levelController.dispose();
    _languageController.dispose();
    _thumbnailController.dispose();
    _promoVideoController.dispose();
    _syllabusController.dispose();
    _priceController.dispose();
    _tagsController.dispose();
    _outcomesController.dispose();
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

  void _removeModule(_ModuleFormData data) {
    if (_modules.length <= 1) return;
    setState(() {
      _modules.remove(data);
      data.dispose();
    });
  }

  Course _buildCourseDraft() {
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

    final tags = _tagsController.text
        .split(',')
        .map((tag) => tag.trim())
        .where((tag) => tag.isNotEmpty)
        .toList();
    final outcomes = _outcomesController.text
        .split('\n')
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();

    return notifier.buildCourseFromForm(
      id: widget.template?.id,
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
      promoVideoUrl: _promoVideoController.text.trim().isEmpty ? null : _promoVideoController.text.trim(),
      syllabusUrl: _syllabusController.text.trim().isEmpty ? null : _syllabusController.text.trim(),
      learningOutcomes: outcomes,
    );
  }

  void _handleContinue() {
    if (_currentStep == 3) {
      _submit();
      return;
    }
    if (_formKey.currentState?.validate() ?? false) {
      setState(() => _currentStep += 1);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please complete the highlighted fields.')),
      );
    }
  }

  void _handleBack() {
    if (_currentStep == 0) {
      Navigator.pop(context);
    } else {
      setState(() => _currentStep -= 1);
    }
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please complete the highlighted fields.')),
      );
      return;
    }
    final course = _buildCourseDraft();
    widget.onSubmit(course);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final steps = [
      Step(
        title: const Text('Overview'),
        isActive: _currentStep >= 0,
        state: _currentStep > 0 ? StepState.complete : StepState.indexed,
        content: Column(
          children: [
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(labelText: 'Course title'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Title required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _summaryController,
              decoration: const InputDecoration(labelText: 'Course narrative'),
              minLines: 3,
              maxLines: 5,
              validator: (value) => value == null || value.trim().isEmpty ? 'Storytelling summary required' : null,
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
                    decoration: const InputDecoration(labelText: 'Learner level'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _languageController,
              decoration: const InputDecoration(labelText: 'Delivery language'),
            ),
          ],
        ),
      ),
      Step(
        title: const Text('Media & pricing'),
        isActive: _currentStep >= 1,
        state: _currentStep > 1 ? StepState.complete : StepState.indexed,
        content: Column(
          children: [
            TextFormField(
              controller: _thumbnailController,
              decoration: const InputDecoration(labelText: 'Cover image URL'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _promoVideoController,
              decoration: const InputDecoration(labelText: 'Promo video URL (optional)'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _syllabusController,
              decoration: const InputDecoration(labelText: 'Syllabus or brochure URL (optional)'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _priceController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Tuition'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _tagsController,
                    decoration: const InputDecoration(labelText: 'Tags (comma separated)'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: SwitchListTile.adaptive(
                    value: _isPublished,
                    onChanged: (value) => setState(() => _isPublished = value),
                    title: const Text('Publish immediately'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                Expanded(
                  child: SwitchListTile.adaptive(
                    value: _favorite,
                    onChanged: (value) => setState(() => _favorite = value),
                    title: const Text('Mark as featured'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              initialValue: _rating?.toString() ?? '',
              decoration: const InputDecoration(labelText: 'Quality benchmark rating (optional)'),
              keyboardType: TextInputType.number,
              onChanged: (value) => _rating = double.tryParse(value),
            ),
          ],
        ),
      ),
      Step(
        title: const Text('Curriculum'),
        isActive: _currentStep >= 2,
        state: _currentStep > 2 ? StepState.complete : StepState.indexed,
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              controller: _outcomesController,
              decoration: const InputDecoration(labelText: 'Learning outcomes (one per line)'),
              minLines: 3,
              maxLines: 5,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Text('Modules', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                const Spacer(),
                TextButton.icon(onPressed: _addModule, icon: const Icon(Icons.add), label: const Text('Add module')),
              ],
            ),
            const SizedBox(height: 12),
            ..._modules.map(
              (module) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
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
                                validator: (value) {
                                  if (_currentStep < 2) return null;
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Module title required';
                                  }
                                  return null;
                                },
                              ),
                            ),
                            IconButton(
                              tooltip: 'Remove module',
                              onPressed: () => _removeModule(module),
                              icon: const Icon(Icons.remove_circle_outline),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: module.descriptionController,
                          decoration: const InputDecoration(labelText: 'Module description'),
                          minLines: 2,
                          maxLines: 4,
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: module.lessonsController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(labelText: 'Lessons'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                controller: module.durationController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(labelText: 'Duration (minutes)'),
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
          ],
        ),
      ),
      Step(
        title: const Text('Review & launch'),
        isActive: _currentStep >= 3,
        state: _currentStep == 3 ? StepState.editing : StepState.indexed,
        content: Builder(
          builder: (context) {
            final draft = _buildCourseDraft();
            final price = NumberFormat.simpleCurrency().format(draft.price);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(backgroundImage: NetworkImage('${draft.thumbnailUrl}?w=120&fit=crop')),
                  title: Text(draft.title, style: Theme.of(context).textTheme.titleMedium),
                  subtitle: Text('${draft.category} • ${draft.level}'),
                  trailing: Text(price, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                const SizedBox(height: 12),
                Text(draft.summary),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  children: [for (final tag in draft.tags) Chip(label: Text(tag))],
                ),
                const SizedBox(height: 12),
                if (draft.learningOutcomes.isNotEmpty)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Learner outcomes', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      ...draft.learningOutcomes.map(
                        (outcome) => Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.check_circle_outline, size: 18),
                            const SizedBox(width: 8),
                            Expanded(child: Text(outcome)),
                          ],
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 12),
                Text('${draft.modules.length} modules ready to publish'),
              ],
            );
          },
        ),
      ),
    ];

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Stepper(
                currentStep: _currentStep,
                controlsBuilder: (context, details) {
                  final isLast = _currentStep == steps.length - 1;
                  return Row(
                    children: [
                      FilledButton(
                        onPressed: _handleContinue,
                        child: Text(isLast ? 'Launch course' : 'Next'),
                      ),
                      const SizedBox(width: 12),
                      TextButton(
                        onPressed: _handleBack,
                        child: Text(_currentStep == 0 ? 'Cancel' : 'Back'),
                      ),
                    ],
                  );
                },
                onStepCancel: _handleBack,
                onStepContinue: _handleContinue,
                onStepTapped: (index) => setState(() => _currentStep = index),
                steps: steps,
              ),
            ),
          ),
        ),
      ),
    );
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
  late final TextEditingController _promoVideoController;
  late final TextEditingController _syllabusController;
  late final TextEditingController _outcomesController;
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
    _promoVideoController = TextEditingController(text: course?.promoVideoUrl ?? '');
    _syllabusController = TextEditingController(text: course?.syllabusUrl ?? '');
    _outcomesController = TextEditingController(
      text: course == null || course.learningOutcomes.isEmpty
          ? ''
          : course.learningOutcomes.join('\n'),
    );
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
    _promoVideoController.dispose();
    _syllabusController.dispose();
    _outcomesController.dispose();
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
    final promoVideo = _promoVideoController.text.trim();
    final syllabusUrl = _syllabusController.text.trim();
    final outcomes = _outcomesController.text
        .split('\n')
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();
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
      promoVideoUrl: promoVideo.isEmpty ? null : promoVideo,
      syllabusUrl: syllabusUrl.isEmpty ? null : syllabusUrl,
      learningOutcomes: outcomes,
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
                  TextFormField(
                    controller: _promoVideoController,
                    decoration: const InputDecoration(labelText: 'Promo video URL (optional)'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _syllabusController,
                    decoration: const InputDecoration(labelText: 'Syllabus or brochure URL (optional)'),
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
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _outcomesController,
                    decoration: const InputDecoration(
                      labelText: 'Learning outcomes (one per line)',
                    ),
                    minLines: 3,
                    maxLines: 5,
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
