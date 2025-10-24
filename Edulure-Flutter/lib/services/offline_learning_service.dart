import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';

import 'session_manager.dart';

enum OfflineDownloadState { queued, inProgress, completed, failed }

enum OfflineAssessmentState { queued, syncing, completed, failed }

class OfflineLessonDownload {
  const OfflineLessonDownload({
    required this.id,
    required this.assetId,
    required this.filename,
    required this.state,
    required this.progress,
    required this.queuedAt,
    required this.updatedAt,
    this.courseId,
    this.moduleId,
    this.filePath,
    this.errorMessage,
  });

  final String id;
  final String assetId;
  final String filename;
  final String? courseId;
  final String? moduleId;
  final OfflineDownloadState state;
  final double progress;
  final DateTime queuedAt;
  final DateTime updatedAt;
  final String? filePath;
  final String? errorMessage;

  bool get isComplete => state == OfflineDownloadState.completed;
  bool get isFailed => state == OfflineDownloadState.failed;

  OfflineLessonDownload copyWith({
    OfflineDownloadState? state,
    double? progress,
    DateTime? updatedAt,
    String? filePath,
    String? errorMessage,
    String? filename,
  }) {
    return OfflineLessonDownload(
      id: id,
      assetId: assetId,
      filename: filename ?? this.filename,
      state: state ?? this.state,
      progress: progress ?? this.progress,
      queuedAt: queuedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      courseId: courseId,
      moduleId: moduleId,
      filePath: filePath ?? this.filePath,
      errorMessage: errorMessage,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'assetId': assetId,
      'filename': filename,
      'courseId': courseId,
      'moduleId': moduleId,
      'state': state.name,
      'progress': progress,
      'queuedAt': queuedAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'filePath': filePath,
      'errorMessage': errorMessage,
    };
  }

  factory OfflineLessonDownload.fromJson(Map<String, dynamic> json) {
    final stateName = json['state']?.toString() ?? OfflineDownloadState.queued.name;
    final mappedState = OfflineDownloadState.values.firstWhere(
      (candidate) => candidate.name == stateName,
      orElse: () => OfflineDownloadState.queued,
    );
    return OfflineLessonDownload(
      id: json['id'] as String,
      assetId: json['assetId'] as String,
      filename: json['filename'] as String,
      courseId: json['courseId'] as String?,
      moduleId: json['moduleId'] as String?,
      state: mappedState,
      progress: (json['progress'] as num?)?.toDouble() ?? 0,
      queuedAt: DateTime.tryParse(json['queuedAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
      filePath: json['filePath'] as String?,
      errorMessage: json['errorMessage'] as String?,
    );
  }
}

class OfflineAssessmentSubmission {
  const OfflineAssessmentSubmission({
    required this.id,
    required this.assessmentId,
    required this.payload,
    required this.state,
    required this.queuedAt,
    required this.updatedAt,
    this.errorMessage,
  });

  final String id;
  final String assessmentId;
  final Map<String, dynamic> payload;
  final OfflineAssessmentState state;
  final DateTime queuedAt;
  final DateTime updatedAt;
  final String? errorMessage;

  bool get isPending => state == OfflineAssessmentState.queued || state == OfflineAssessmentState.syncing;

  OfflineAssessmentSubmission copyWith({
    OfflineAssessmentState? state,
    DateTime? updatedAt,
    String? errorMessage,
  }) {
    return OfflineAssessmentSubmission(
      id: id,
      assessmentId: assessmentId,
      payload: payload,
      state: state ?? this.state,
      queuedAt: queuedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      errorMessage: errorMessage,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'assessmentId': assessmentId,
      'payload': payload,
      'state': state.name,
      'queuedAt': queuedAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'errorMessage': errorMessage,
    };
  }

  factory OfflineAssessmentSubmission.fromJson(Map<String, dynamic> json) {
    final stateName = json['state']?.toString() ?? OfflineAssessmentState.queued.name;
    final mappedState = OfflineAssessmentState.values.firstWhere(
      (candidate) => candidate.name == stateName,
      orElse: () => OfflineAssessmentState.queued,
    );
    return OfflineAssessmentSubmission(
      id: json['id'] as String,
      assessmentId: json['assessmentId'] as String,
      payload: Map<String, dynamic>.from(json['payload'] as Map),
      state: mappedState,
      queuedAt: DateTime.tryParse(json['queuedAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
      errorMessage: json['errorMessage'] as String?,
    );
  }
}

class OfflineModuleSnapshot {
  const OfflineModuleSnapshot({
    required this.key,
    required this.courseId,
    required this.moduleId,
    required this.completionRatio,
    required this.updatedAt,
    this.notes,
  });

  final String key;
  final String courseId;
  final String moduleId;
  final double completionRatio;
  final DateTime updatedAt;
  final String? notes;

  Map<String, dynamic> toJson() {
    return {
      'key': key,
      'courseId': courseId,
      'moduleId': moduleId,
      'completionRatio': completionRatio,
      'updatedAt': updatedAt.toIso8601String(),
      'notes': notes,
    };
  }

  factory OfflineModuleSnapshot.fromJson(Map<String, dynamic> json) {
    return OfflineModuleSnapshot(
      key: json['key'] as String,
      courseId: json['courseId'] as String,
      moduleId: json['moduleId'] as String,
      completionRatio: (json['completionRatio'] as num?)?.toDouble() ?? 0,
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
      notes: json['notes'] as String?,
    );
  }
}

class OfflineLearningService {
  factory OfflineLearningService({
    Box<dynamic>? downloadBox,
    Box<dynamic>? assessmentBox,
    Box<dynamic>? progressBox,
    Duration progressUpdateThrottle = const Duration(milliseconds: 350),
  }) {
    if (downloadBox == null && assessmentBox == null && progressBox == null && _sharedInstance != null) {
      return _sharedInstance!;
    }

    final instance = OfflineLearningService._internal(
      downloadBox: downloadBox ?? SessionManager.learningDownloadQueue,
      assessmentBox: assessmentBox ?? SessionManager.assessmentOutbox,
      progressBox: progressBox ?? SessionManager.learningProgressSnapshots,
      progressUpdateThrottle: progressUpdateThrottle,
    );

    if (downloadBox == null && assessmentBox == null && progressBox == null) {
      _sharedInstance = instance;
    }
    return instance;
  }

  OfflineLearningService._internal({
    required Box<dynamic> downloadBox,
    required Box<dynamic> assessmentBox,
    required Box<dynamic> progressBox,
    required Duration progressUpdateThrottle,
  })  : _downloadBox = downloadBox,
        _assessmentBox = assessmentBox,
        _progressBox = progressBox,
        _progressUpdateThrottle = progressUpdateThrottle;

  static OfflineLearningService? _sharedInstance;

  final Box<dynamic> _downloadBox;
  final Box<dynamic> _assessmentBox;
  final Box<dynamic> _progressBox;
  final Duration _progressUpdateThrottle;

  final StreamController<OfflineLessonDownload> _downloadUpdates = StreamController<OfflineLessonDownload>.broadcast();
  final StreamController<OfflineAssessmentSubmission> _assessmentUpdates =
      StreamController<OfflineAssessmentSubmission>.broadcast();

  final Map<String, DateTime> _lastProgressEvent = <String, DateTime>{};
  final Map<String, DateTime> _lastAnalyticsEvent = <String, DateTime>{};
  final Random _random = Random();

  Stream<OfflineLessonDownload> get downloadStream => _downloadUpdates.stream;
  Stream<OfflineAssessmentSubmission> get assessmentStream => _assessmentUpdates.stream;

  Future<List<OfflineLessonDownload>> listDownloads() async {
    return _downloadBox.values
        .whereType<Map>()
        .map((entry) => OfflineLessonDownload.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList(growable: false);
  }

  Future<OfflineLessonDownload> ensureDownloadTask({
    required String assetId,
    required String filename,
    String? courseId,
    String? moduleId,
  }) async {
    final key = _downloadKey(assetId);
    final existingRaw = _downloadBox.get(key);
    if (existingRaw is Map) {
      final parsed = OfflineLessonDownload.fromJson(Map<String, dynamic>.from(existingRaw as Map));
      return parsed;
    }

    final now = DateTime.now();
    final status = OfflineLessonDownload(
      id: _generateId('download'),
      assetId: assetId,
      filename: filename,
      courseId: courseId,
      moduleId: moduleId,
      state: OfflineDownloadState.queued,
      progress: 0,
      queuedAt: now,
      updatedAt: now,
    );
    await _downloadBox.put(key, status.toJson());
    _downloadUpdates.add(status);
    return status;
  }

  Future<OfflineLessonDownload> markDownloadProgress({
    required String assetId,
    required double progress,
    String? filename,
  }) async {
    final existing = await ensureDownloadTask(assetId: assetId, filename: filename ?? assetId);
    final now = DateTime.now();
    final shouldEmit = _shouldEmitProgress(existing.assetId, now, progress);
    final updated = existing.copyWith(
      state: OfflineDownloadState.inProgress,
      progress: progress.clamp(0, 1),
      updatedAt: now,
      filename: filename,
    );
    await _downloadBox.put(_downloadKey(assetId), updated.toJson());
    if (shouldEmit) {
      _downloadUpdates.add(updated);
    }
    return updated;
  }

  Future<OfflineLessonDownload> markDownloadComplete({
    required String assetId,
    required String filePath,
    String? filename,
  }) async {
    final existing = await ensureDownloadTask(assetId: assetId, filename: filename ?? assetId);
    final updated = existing.copyWith(
      state: OfflineDownloadState.completed,
      progress: 1,
      filePath: filePath,
      errorMessage: null,
      updatedAt: DateTime.now(),
      filename: filename,
    );
    await _downloadBox.put(_downloadKey(assetId), updated.toJson());
    _downloadUpdates.add(updated);
    return updated;
  }

  Future<OfflineLessonDownload> markDownloadFailed({
    required String assetId,
    required String errorMessage,
    String? filename,
  }) async {
    final existing = await ensureDownloadTask(assetId: assetId, filename: filename ?? assetId);
    final updated = existing.copyWith(
      state: OfflineDownloadState.failed,
      progress: existing.progress,
      errorMessage: errorMessage,
      updatedAt: DateTime.now(),
      filename: filename,
    );
    await _downloadBox.put(_downloadKey(assetId), updated.toJson());
    _downloadUpdates.add(updated);
    return updated;
  }

  Future<List<OfflineAssessmentSubmission>> listAssessmentSubmissions() async {
    return _assessmentBox.values
        .whereType<Map>()
        .map((entry) => OfflineAssessmentSubmission.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList(growable: false)
      ..sort((a, b) => a.queuedAt.compareTo(b.queuedAt));
  }

  Future<OfflineAssessmentSubmission> queueAssessmentSubmission({
    required String assessmentId,
    required Map<String, dynamic> payload,
  }) async {
    final now = DateTime.now();
    final submission = OfflineAssessmentSubmission(
      id: _generateId('assessment'),
      assessmentId: assessmentId,
      payload: payload,
      state: OfflineAssessmentState.queued,
      queuedAt: now,
      updatedAt: now,
    );
    await _assessmentBox.put(_assessmentKey(submission.id), submission.toJson());
    _assessmentUpdates.add(submission);
    return submission;
  }

  Future<OfflineAssessmentSubmission> updateAssessmentSubmission({
    required String submissionId,
    required OfflineAssessmentState state,
    String? errorMessage,
  }) async {
    final existingRaw = _assessmentBox.get(_assessmentKey(submissionId));
    if (existingRaw is! Map) {
      throw StateError('Assessment submission $submissionId missing from queue');
    }
    final existing = OfflineAssessmentSubmission.fromJson(Map<String, dynamic>.from(existingRaw as Map));
    final updated = existing.copyWith(
      state: state,
      updatedAt: DateTime.now(),
      errorMessage: errorMessage,
    );
    await _assessmentBox.put(_assessmentKey(submissionId), updated.toJson());
    _assessmentUpdates.add(updated);
    return updated;
  }

  Future<void> clearAssessmentSubmission(String submissionId) async {
    await _assessmentBox.delete(_assessmentKey(submissionId));
  }

  Future<void> syncAssessmentQueue(
    Future<bool> Function(OfflineAssessmentSubmission submission) uploader,
  ) async {
    final submissions = await listAssessmentSubmissions();
    for (final submission in submissions) {
      if (!submission.isPending) {
        continue;
      }
      await updateAssessmentSubmission(
        submissionId: submission.id,
        state: OfflineAssessmentState.syncing,
        errorMessage: null,
      );
      try {
        final success = await uploader(submission);
        if (success) {
          await clearAssessmentSubmission(submission.id);
          _assessmentUpdates.add(
            submission.copyWith(
              state: OfflineAssessmentState.completed,
              updatedAt: DateTime.now(),
            ),
          );
        } else {
          await updateAssessmentSubmission(
            submissionId: submission.id,
            state: OfflineAssessmentState.failed,
            errorMessage: 'Server rejected submission',
          );
        }
      } catch (error, stackTrace) {
        debugPrint('Failed to sync assessment ${submission.id}: $error');
        debugPrint('$stackTrace');
        await updateAssessmentSubmission(
          submissionId: submission.id,
          state: OfflineAssessmentState.failed,
          errorMessage: error.toString(),
        );
      }
    }
  }

  Future<void> recordModuleProgressSnapshot({
    required String courseId,
    required String moduleId,
    required double completionRatio,
    String? notes,
  }) async {
    final key = _progressKey(courseId, moduleId);
    final snapshot = OfflineModuleSnapshot(
      key: key,
      courseId: courseId,
      moduleId: moduleId,
      completionRatio: completionRatio.clamp(0, 1),
      updatedAt: DateTime.now(),
      notes: notes,
    );
    await _progressBox.put(key, snapshot.toJson());
  }

  List<OfflineModuleSnapshot> listModuleSnapshots() {
    return _progressBox.values
        .whereType<Map>()
        .map((entry) => OfflineModuleSnapshot.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList(growable: false)
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }

  bool shouldEmitDownloadAnalytics(String assetId, {Duration interval = const Duration(minutes: 30)}) {
    final now = DateTime.now();
    final last = _lastAnalyticsEvent[assetId];
    if (last == null || now.difference(last) >= interval) {
      _lastAnalyticsEvent[assetId] = now;
      return true;
    }
    return false;
  }

  Future<void> resetDownloads() async {
    await _downloadBox.clear();
  }

  Future<void> resetAssessments() async {
    await _assessmentBox.clear();
  }

  Future<void> dispose() async {
    await _downloadUpdates.close();
    await _assessmentUpdates.close();
  }

  bool _shouldEmitProgress(String assetId, DateTime now, double progress) {
    final last = _lastProgressEvent[assetId];
    if (last == null || now.difference(last) >= _progressUpdateThrottle || progress >= 1) {
      _lastProgressEvent[assetId] = now;
      return true;
    }
    return false;
  }

  String _downloadKey(String assetId) => 'download:$assetId';
  String _assessmentKey(String id) => 'assessment:$id';
  String _progressKey(String courseId, String moduleId) => 'progress:$courseId:$moduleId';

  String _generateId(String prefix) {
    final timestamp = DateTime.now().microsecondsSinceEpoch;
    final suffix = _random.nextInt(1 << 20);
    return '$prefix-$timestamp-$suffix';
  }
}
