import 'dart:async';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';

import 'api_config.dart';
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
    Dio? httpClient,
    String? Function()? tokenProvider,
  }) {
    if (downloadBox == null && assessmentBox == null && progressBox == null && _sharedInstance != null) {
      return _sharedInstance!;
    }

    final instance = OfflineLearningService._internal(
      downloadBox: downloadBox ?? SessionManager.learningDownloadQueue,
      assessmentBox: assessmentBox ?? SessionManager.assessmentOutbox,
      progressBox: progressBox ?? SessionManager.learningProgressSnapshots,
      progressUpdateThrottle: progressUpdateThrottle,
      httpClient: httpClient ?? ApiConfig.createHttpClient(requiresAuth: true),
      tokenProvider: tokenProvider ?? SessionManager.getAccessToken,
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
    required Dio httpClient,
    required String? Function()? tokenProvider,
  })  : _downloadBox = downloadBox,
        _assessmentBox = assessmentBox,
        _progressBox = progressBox,
        _progressUpdateThrottle = progressUpdateThrottle,
        _httpClient = httpClient,
        _tokenProvider = tokenProvider;

  static OfflineLearningService? _sharedInstance;

  final Box<dynamic> _downloadBox;
  final Box<dynamic> _assessmentBox;
  final Box<dynamic> _progressBox;
  final Duration _progressUpdateThrottle;
  final Dio _httpClient;
  final String? Function()? _tokenProvider;

  final StreamController<OfflineLessonDownload> _downloadUpdates = StreamController<OfflineLessonDownload>.broadcast();
  final StreamController<OfflineAssessmentSubmission> _assessmentUpdates =
      StreamController<OfflineAssessmentSubmission>.broadcast();

  final Map<String, DateTime> _lastProgressEvent = <String, DateTime>{};
  final Map<String, DateTime> _lastAnalyticsEvent = <String, DateTime>{};
  final Random _random = Random();
  DateTime? _lastRemoteSync;
  bool _remoteSyncInFlight = false;

  Stream<OfflineLessonDownload> get downloadStream => _downloadUpdates.stream;
  Stream<OfflineAssessmentSubmission> get assessmentStream => _assessmentUpdates.stream;

  Future<List<OfflineLessonDownload>> listDownloads({bool refreshRemote = true}) async {
    if (refreshRemote) {
      await _refreshFromServer();
    }
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
    unawaited(_postDownload(status));
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
    unawaited(_patchDownload(
      assetId,
      {
        'state': _downloadStateToApi(updated.state),
        'progress': updated.progress,
        'filename': updated.filename,
        'lastProgressAt': updated.updatedAt.toIso8601String(),
        if (updated.courseId != null) 'courseId': updated.courseId,
        if (updated.moduleId != null) 'moduleId': updated.moduleId,
      },
    ));
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
    unawaited(_patchDownload(
      assetId,
      {
        'state': 'completed',
        'progress': 1,
        'filename': updated.filename,
        'filePath': filePath,
        'completedAt': updated.updatedAt.toIso8601String(),
        if (updated.courseId != null) 'courseId': updated.courseId,
        if (updated.moduleId != null) 'moduleId': updated.moduleId,
      },
    ));
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
    unawaited(_patchDownload(
      assetId,
      {
        'state': 'failed',
        'progress': updated.progress,
        'filename': updated.filename,
        'errorMessage': errorMessage,
        'failedAt': updated.updatedAt.toIso8601String(),
        if (updated.courseId != null) 'courseId': updated.courseId,
        if (updated.moduleId != null) 'moduleId': updated.moduleId,
      },
    ));
    return updated;
  }

  Future<List<OfflineAssessmentSubmission>> listAssessmentSubmissions({bool refreshRemote = true}) async {
    if (refreshRemote) {
      await _refreshFromServer();
    }
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
    unawaited(_postAssessment(submission));
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
    unawaited(_patchAssessment(updated));
    return updated;
  }

  Future<void> clearAssessmentSubmission(String submissionId) async {
    await _assessmentBox.delete(_assessmentKey(submissionId));
  }

  Future<void> syncAssessmentQueue([
    Future<bool> Function(OfflineAssessmentSubmission submission)? uploader,
  ]) async {
    final submissions = await listAssessmentSubmissions(refreshRemote: false);
    for (final submission in submissions) {
      if (!submission.isPending) {
        continue;
      }
      final syncing = await updateAssessmentSubmission(
        submissionId: submission.id,
        state: OfflineAssessmentState.syncing,
        errorMessage: null,
      );
      try {
        var success = await _syncAssessmentSubmission(syncing);
        if (!success && uploader != null) {
          success = await uploader(syncing);
          if (success) {
            final now = DateTime.now();
            final patched = syncing.copyWith(
              state: OfflineAssessmentState.completed,
              updatedAt: now,
              errorMessage: null,
            );
            await _patchAssessment(
              patched,
              overrides: {
                'syncedAt': now.toIso8601String(),
              },
            );
          }
        }
        if (success) {
          final completed = syncing.copyWith(
            state: OfflineAssessmentState.completed,
            updatedAt: DateTime.now(),
            errorMessage: null,
          );
          await clearAssessmentSubmission(submission.id);
          _assessmentUpdates.add(
            completed,
          );
        } else {
          await updateAssessmentSubmission(
            submissionId: submission.id,
            state: OfflineAssessmentState.failed,
            errorMessage: 'Remote server rejected submission',
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
    unawaited(_postModuleSnapshot(snapshot));
  }

  Future<List<OfflineModuleSnapshot>> listModuleSnapshots({bool refreshRemote = true}) async {
    if (refreshRemote) {
      await _refreshFromServer();
    }
    return _progressBox.values
        .whereType<Map>()
        .map((entry) => OfflineModuleSnapshot.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList(growable: false)
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }

  Future<void> _refreshFromServer({bool force = false}) async {
    if (_tokenProvider == null) {
      return;
    }
    if (_remoteSyncInFlight) {
      return;
    }
    final now = DateTime.now();
    if (!force && _lastRemoteSync != null && now.difference(_lastRemoteSync!) < const Duration(seconds: 30)) {
      return;
    }

    final headers = _authHeaders();
    if (headers == null) {
      return;
    }

    _remoteSyncInFlight = true;
    try {
      final response = await _httpClient.get(
        '/mobile/learning/offline',
        options: Options(headers: headers),
      );

      Map<String, dynamic> payload;
      if (response.data is Map<String, dynamic>) {
        payload = Map<String, dynamic>.from(response.data as Map<String, dynamic>);
      } else if (response.data is Map) {
        payload = Map<String, dynamic>.from(response.data as Map);
      } else {
        payload = const {};
      }

      if (payload['downloads'] == null && payload['assessments'] == null && payload['snapshots'] == null) {
        final data = payload['data'];
        if (data is Map) {
          payload = Map<String, dynamic>.from(data as Map);
        }
      }

      final downloads = _normaliseList(payload['downloads']);
      final assessments = _normaliseList(payload['assessments']);
      final snapshots = _normaliseList(payload['snapshots']);

      for (final downloadData in downloads) {
        final download = _downloadFromRemote(downloadData);
        if (download == null) continue;
        final key = _downloadKey(download.assetId);
        final existingRaw = _downloadBox.get(key);
        if (existingRaw is Map) {
          final existing = OfflineLessonDownload.fromJson(Map<String, dynamic>.from(existingRaw as Map));
          if (download.updatedAt.isBefore(existing.updatedAt)) {
            continue;
          }
        }
        await _downloadBox.put(key, download.toJson());
      }

      for (final assessmentData in assessments) {
        final submission = _assessmentFromRemote(assessmentData);
        if (submission == null) continue;
        final key = _assessmentKey(submission.id);
        final existingRaw = _assessmentBox.get(key);
        if (existingRaw is Map) {
          final existing = OfflineAssessmentSubmission.fromJson(Map<String, dynamic>.from(existingRaw as Map));
          if (submission.updatedAt.isBefore(existing.updatedAt)) {
            continue;
          }
        }
        await _assessmentBox.put(key, submission.toJson());
      }

      for (final snapshotData in snapshots) {
        final snapshot = _snapshotFromRemote(snapshotData);
        if (snapshot == null) continue;
        final key = _progressKey(snapshot.courseId, snapshot.moduleId);
        final existingRaw = _progressBox.get(key);
        if (existingRaw is Map) {
          final existing = OfflineModuleSnapshot.fromJson(Map<String, dynamic>.from(existingRaw as Map));
          if (snapshot.updatedAt.isBefore(existing.updatedAt)) {
            continue;
          }
        }
        await _progressBox.put(key, snapshot.toJson());
      }

      _lastRemoteSync = DateTime.now();
    } on DioException catch (error) {
      debugPrint('Failed to refresh offline snapshot: ${error.message}');
    } catch (error, stackTrace) {
      debugPrint('Unexpected offline snapshot error: $error');
      debugPrint('$stackTrace');
    } finally {
      _remoteSyncInFlight = false;
    }
  }

  Map<String, String>? _authHeaders() {
    final provider = _tokenProvider;
    if (provider == null) {
      return null;
    }
    final token = provider();
    if (token == null || token.isEmpty) {
      return null;
    }
    return {'Authorization': 'Bearer $token'};
  }

  List<Map<String, dynamic>> _normaliseList(dynamic input) {
    if (input is List) {
      return input
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList(growable: false);
    }
    return const [];
  }

  OfflineLessonDownload? _downloadFromRemote(Map<String, dynamic> json) {
    final assetId = json['assetId']?.toString();
    if (assetId == null || assetId.isEmpty) {
      return null;
    }
    final stateName = json['state']?.toString().toLowerCase();
    final state = _mapDownloadState(stateName);
    final queuedAt = DateTime.tryParse(json['queuedAt']?.toString() ?? '') ?? DateTime.now();
    final updatedAt = DateTime.tryParse(json['updatedAt']?.toString() ?? json['lastProgressAt']?.toString() ?? '') ?? queuedAt;
    final progress = (json['progress'] as num?)?.toDouble() ?? (json['progressRatio'] as num?)?.toDouble() ?? 0;
    return OfflineLessonDownload(
      id: json['id']?.toString() ?? _generateId('download'),
      assetId: assetId,
      filename: json['filename']?.toString() ?? assetId,
      courseId: json['courseId']?.toString(),
      moduleId: json['moduleId']?.toString(),
      state: state,
      progress: progress.clamp(0, 1).toDouble(),
      queuedAt: queuedAt,
      updatedAt: updatedAt,
      filePath: json['filePath']?.toString(),
      errorMessage: json['errorMessage']?.toString(),
    );
  }

  OfflineDownloadState _mapDownloadState(String? state) {
    switch (state) {
      case 'inprogress':
      case 'in_progress':
        return OfflineDownloadState.inProgress;
      case 'completed':
        return OfflineDownloadState.completed;
      case 'failed':
        return OfflineDownloadState.failed;
      default:
        return OfflineDownloadState.queued;
    }
  }

  OfflineAssessmentSubmission? _assessmentFromRemote(Map<String, dynamic> json) {
    final submissionId = json['submissionId']?.toString() ?? json['id']?.toString();
    if (submissionId == null || submissionId.isEmpty) {
      return null;
    }
    final stateName = json['state']?.toString().toLowerCase();
    final state = _mapAssessmentState(stateName);
    return OfflineAssessmentSubmission(
      id: submissionId,
      assessmentId: json['assessmentId']?.toString() ?? submissionId,
      payload: json['payload'] is Map
          ? Map<String, dynamic>.from(json['payload'] as Map)
          : <String, dynamic>{},
      state: state,
      queuedAt: DateTime.tryParse(json['queuedAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? json['syncedAt']?.toString() ?? '') ?? DateTime.now(),
      errorMessage: json['errorMessage']?.toString(),
    );
  }

  OfflineAssessmentState _mapAssessmentState(String? state) {
    switch (state) {
      case 'syncing':
        return OfflineAssessmentState.syncing;
      case 'completed':
        return OfflineAssessmentState.completed;
      case 'failed':
        return OfflineAssessmentState.failed;
      default:
        return OfflineAssessmentState.queued;
    }
  }

  OfflineModuleSnapshot? _snapshotFromRemote(Map<String, dynamic> json) {
    final courseId = json['courseId']?.toString();
    final moduleId = json['moduleId']?.toString();
    if (courseId == null || courseId.isEmpty || moduleId == null || moduleId.isEmpty) {
      return null;
    }
    final completion = (json['completionRatio'] as num?)?.toDouble() ?? 0;
    return OfflineModuleSnapshot(
      key: _progressKey(courseId, moduleId),
      courseId: courseId,
      moduleId: moduleId,
      completionRatio: completion.clamp(0, 1).toDouble(),
      updatedAt: DateTime.tryParse(json['capturedAt']?.toString() ?? json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
      notes: json['notes']?.toString(),
    );
  }

  String _downloadStateToApi(OfflineDownloadState state) {
    switch (state) {
      case OfflineDownloadState.inProgress:
        return 'inProgress';
      case OfflineDownloadState.completed:
        return 'completed';
      case OfflineDownloadState.failed:
        return 'failed';
      case OfflineDownloadState.queued:
      default:
        return 'queued';
    }
  }

  String _assessmentStateToApi(OfflineAssessmentState state) {
    switch (state) {
      case OfflineAssessmentState.syncing:
        return 'syncing';
      case OfflineAssessmentState.completed:
        return 'completed';
      case OfflineAssessmentState.failed:
        return 'failed';
      case OfflineAssessmentState.queued:
      default:
        return 'queued';
    }
  }

  Future<void> _postDownload(OfflineLessonDownload download) async {
    final headers = _authHeaders();
    if (headers == null) {
      return;
    }
    try {
      await _httpClient.post(
        '/mobile/learning/downloads',
        data: {
          'assetId': download.assetId,
          'filename': download.filename,
          'state': _downloadStateToApi(download.state),
          'progress': download.progress,
          'filePath': download.filePath,
          'errorMessage': download.errorMessage,
          'queuedAt': download.queuedAt.toIso8601String(),
          'completedAt': download.isComplete ? download.updatedAt.toIso8601String() : null,
          'failedAt': download.isFailed ? download.updatedAt.toIso8601String() : null,
          if (download.courseId != null) 'courseId': download.courseId,
          if (download.moduleId != null) 'moduleId': download.moduleId,
        },
        options: Options(headers: headers),
      );
    } on DioException catch (error) {
      debugPrint('Failed to publish offline download: ${error.message}');
    } catch (error, stackTrace) {
      debugPrint('Unexpected error publishing offline download: $error');
      debugPrint('$stackTrace');
    }
  }

  Future<void> _patchDownload(String assetId, Map<String, dynamic> patch) async {
    final headers = _authHeaders();
    if (headers == null || patch.isEmpty) {
      return;
    }
    try {
      await _httpClient.patch(
        '/mobile/learning/downloads/$assetId',
        data: patch,
        options: Options(headers: headers),
      );
    } on DioException catch (error) {
      debugPrint('Failed to update offline download $assetId: ${error.message}');
    } catch (error, stackTrace) {
      debugPrint('Unexpected error updating offline download $assetId: $error');
      debugPrint('$stackTrace');
    }
  }

  Future<void> _postAssessment(OfflineAssessmentSubmission submission) async {
    final headers = _authHeaders();
    if (headers == null) {
      return;
    }
    try {
      await _httpClient.post(
        '/mobile/learning/assessments',
        data: {
          'submissionId': submission.id,
          'assessmentId': submission.assessmentId,
          'payload': submission.payload,
          'state': _assessmentStateToApi(submission.state),
          'queuedAt': submission.queuedAt.toIso8601String(),
          if (submission.errorMessage != null) 'errorMessage': submission.errorMessage,
        },
        options: Options(headers: headers),
      );
    } on DioException catch (error) {
      debugPrint('Failed to publish offline assessment ${submission.id}: ${error.message}');
    } catch (error, stackTrace) {
      debugPrint('Unexpected error publishing offline assessment ${submission.id}: $error');
      debugPrint('$stackTrace');
    }
  }

  Future<void> _patchAssessment(
    OfflineAssessmentSubmission submission, {
    Map<String, dynamic>? overrides,
  }) async {
    final headers = _authHeaders();
    if (headers == null) {
      return;
    }
    final payload = <String, dynamic>{
      'state': _assessmentStateToApi(submission.state),
      'payload': submission.payload,
      'assessmentId': submission.assessmentId,
      'queuedAt': submission.queuedAt.toIso8601String(),
      'errorMessage': submission.errorMessage,
      'syncedAt': submission.updatedAt.toIso8601String(),
      if (overrides != null) ...overrides,
    }..removeWhere((key, value) => value == null);

    try {
      await _httpClient.patch(
        '/mobile/learning/assessments/${submission.id}',
        data: payload,
        options: Options(headers: headers),
      );
    } on DioException catch (error) {
      debugPrint('Failed to update offline assessment ${submission.id}: ${error.message}');
    } catch (error, stackTrace) {
      debugPrint('Unexpected error updating offline assessment ${submission.id}: $error');
      debugPrint('$stackTrace');
    }
  }

  Future<bool> _syncAssessmentSubmission(OfflineAssessmentSubmission submission) async {
    final headers = _authHeaders();
    if (headers == null) {
      throw StateError('Missing authentication token');
    }
    try {
      final response = await _httpClient.patch(
        '/mobile/learning/assessments/${submission.id}',
        data: {
          'state': _assessmentStateToApi(OfflineAssessmentState.completed),
          'payload': submission.payload,
          'assessmentId': submission.assessmentId,
          'queuedAt': submission.queuedAt.toIso8601String(),
          'syncedAt': DateTime.now().toIso8601String(),
        },
        options: Options(headers: headers),
      );
      return response.statusCode != null && response.statusCode! < 400;
    } on DioException catch (error) {
      debugPrint('Failed to sync offline assessment ${submission.id}: ${error.message}');
      return false;
    } catch (error, stackTrace) {
      debugPrint('Unexpected error syncing offline assessment ${submission.id}: $error');
      debugPrint('$stackTrace');
      return false;
    }
  }

  Future<void> _postModuleSnapshot(OfflineModuleSnapshot snapshot) async {
    final headers = _authHeaders();
    if (headers == null) {
      return;
    }
    try {
      await _httpClient.post(
        '/mobile/learning/modules/snapshots',
        data: {
          'courseId': snapshot.courseId,
          'moduleId': snapshot.moduleId,
          'completionRatio': snapshot.completionRatio,
          'capturedAt': snapshot.updatedAt.toIso8601String(),
          if (snapshot.notes != null) 'notes': snapshot.notes,
        },
        options: Options(headers: headers),
      );
    } on DioException catch (error) {
      debugPrint('Failed to publish offline module snapshot: ${error.message}');
    } catch (error, stackTrace) {
      debugPrint('Unexpected error publishing offline module snapshot: $error');
      debugPrint('$stackTrace');
    }
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
