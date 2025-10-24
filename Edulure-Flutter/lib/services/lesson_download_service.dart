import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';
import 'package:uuid/uuid.dart';

@immutable
class LessonDownloadRecord {
  const LessonDownloadRecord({
    required this.id,
    required this.courseId,
    required this.moduleId,
    required this.moduleTitle,
    required this.assetUrls,
    required this.status,
    required this.progress,
    required this.createdAt,
    required this.updatedAt,
    this.expectedSizeBytes,
    this.downloadedBytes,
    this.manifestPath,
    this.errorMessage,
  });

  final String id;
  final String courseId;
  final String moduleId;
  final String moduleTitle;
  final List<String> assetUrls;
  final LessonDownloadStatus status;
  final double progress;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int? expectedSizeBytes;
  final int? downloadedBytes;
  final String? manifestPath;
  final String? errorMessage;

  bool get isComplete => status == LessonDownloadStatus.completed;

  LessonDownloadRecord copyWith({
    String? id,
    String? courseId,
    String? moduleId,
    String? moduleTitle,
    List<String>? assetUrls,
    LessonDownloadStatus? status,
    double? progress,
    DateTime? createdAt,
    DateTime? updatedAt,
    int? expectedSizeBytes,
    int? downloadedBytes,
    String? manifestPath,
    String? errorMessage,
  }) {
    return LessonDownloadRecord(
      id: id ?? this.id,
      courseId: courseId ?? this.courseId,
      moduleId: moduleId ?? this.moduleId,
      moduleTitle: moduleTitle ?? this.moduleTitle,
      assetUrls: assetUrls ?? this.assetUrls,
      status: status ?? this.status,
      progress: progress ?? this.progress,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      expectedSizeBytes: expectedSizeBytes ?? this.expectedSizeBytes,
      downloadedBytes: downloadedBytes ?? this.downloadedBytes,
      manifestPath: manifestPath ?? this.manifestPath,
      errorMessage: errorMessage,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'courseId': courseId,
      'moduleId': moduleId,
      'moduleTitle': moduleTitle,
      'assetUrls': assetUrls,
      'status': status.name,
      'progress': progress,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'expectedSizeBytes': expectedSizeBytes,
      'downloadedBytes': downloadedBytes,
      'manifestPath': manifestPath,
      'errorMessage': errorMessage,
    };
  }

  factory LessonDownloadRecord.fromJson(Map<String, dynamic> json) {
    return LessonDownloadRecord(
      id: json['id'] as String,
      courseId: json['courseId'] as String,
      moduleId: json['moduleId'] as String,
      moduleTitle: json['moduleTitle'] as String,
      assetUrls: (json['assetUrls'] as List<dynamic>? ?? const <dynamic>[])\
          .map((entry) => entry.toString())
          .toList(growable: false),
      status: LessonDownloadStatus.values.firstWhere(
        (value) => value.name == json['status'],
        orElse: () => LessonDownloadStatus.failed,
      ),
      progress: (json['progress'] as num?)?.toDouble() ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
      expectedSizeBytes: (json['expectedSizeBytes'] as num?)?.toInt(),
      downloadedBytes: (json['downloadedBytes'] as num?)?.toInt(),
      manifestPath: json['manifestPath'] as String?,
      errorMessage: json['errorMessage'] as String?,
    );
  }
}

enum LessonDownloadStatus { queued, downloading, completed, failed }

class LessonDownloadService {
  LessonDownloadService({
    HiveInterface? hive,
    DateTime Function()? clock,
    bool simulateDownloads = true,
  })  : _hive = hive ?? Hive,
        _clock = clock ?? DateTime.now,
        _simulateDownloads = simulateDownloads;

  static const _boxName = 'lesson_downloads.v1';
  static const _recordsKey = 'records';

  final HiveInterface _hive;
  final DateTime Function() _clock;
  final bool _simulateDownloads;
  final Uuid _uuid = const Uuid();
  final Random _random = Random();

  Box<String>? _box;
  bool _ready = false;
  Future<void>? _initialising;
  List<LessonDownloadRecord> _cache = const <LessonDownloadRecord>[];
  final Map<String, Timer> _simulations = <String, Timer>{};

  late final StreamController<List<LessonDownloadRecord>> _downloadsController =
      StreamController<List<LessonDownloadRecord>>.broadcast(onListen: () {
    if (_ready) {
      _downloadsController.add(_cache);
    }
  });

  Future<void> ensureReady() async {
    if (_ready) {
      return;
    }
    if (_initialising != null) {
      return _initialising!;
    }
    final future = _openBox();
    _initialising = future;
    try {
      await future;
      _ready = true;
      _downloadsController.add(_cache);
    } finally {
      _initialising = null;
    }
  }

  Future<void> _openBox() async {
    _box = await _hive.openBox<String>(_boxName);
    _cache = await _readRecords();
  }

  Future<List<LessonDownloadRecord>> listDownloads() async {
    await ensureReady();
    return List<LessonDownloadRecord>.unmodifiable(_cache);
  }

  Stream<List<LessonDownloadRecord>> watchDownloads() {
    return _downloadsController.stream;
  }

  Future<LessonDownloadRecord> queueDownload({
    required String courseId,
    required String moduleId,
    required String moduleTitle,
    List<String> assetUrls = const <String>[],
    int? expectedSizeBytes,
  }) async {
    await ensureReady();
    final now = _clock();
    final existingIndex = _cache.indexWhere((record) =>
        record.courseId == courseId && record.moduleId == moduleId);
    LessonDownloadRecord record;
    if (existingIndex != -1) {
      final existing = _cache[existingIndex];
      record = existing.copyWith(
        status: LessonDownloadStatus.queued,
        progress: 0,
        updatedAt: now,
        downloadedBytes: 0,
        expectedSizeBytes: expectedSizeBytes ?? existing.expectedSizeBytes,
        errorMessage: null,
      );
      _cache = <LessonDownloadRecord>[
        for (var i = 0; i < _cache.length; i++)
          if (i == existingIndex) record else _cache[i],
      ];
    } else {
      record = LessonDownloadRecord(
        id: _uuid.v4(),
        courseId: courseId,
        moduleId: moduleId,
        moduleTitle: moduleTitle,
        assetUrls: List<String>.from(assetUrls),
        status: LessonDownloadStatus.queued,
        progress: 0,
        createdAt: now,
        updatedAt: now,
        expectedSizeBytes: expectedSizeBytes,
        downloadedBytes: 0,
      );
      _cache = <LessonDownloadRecord>[..._cache, record];
    }
    await _persist();
    if (_simulateDownloads) {
      _startSimulation(record.id);
    }
    return record;
  }

  Future<LessonDownloadRecord?> getRecord(String id) async {
    await ensureReady();
    return _cache.firstWhere((record) => record.id == id, orElse: () => null);
  }

  Future<LessonDownloadRecord?> getRecordForModule(String courseId, String moduleId) async {
    await ensureReady();
    return _cache.firstWhere(
      (record) => record.courseId == courseId && record.moduleId == moduleId,
      orElse: () => null,
    );
  }

  Future<LessonDownloadRecord?> updateProgress(
    String recordId,
    double progress, {
    int? downloadedBytes,
  }) async {
    await ensureReady();
    final index = _cache.indexWhere((record) => record.id == recordId);
    if (index == -1) {
      return null;
    }
    final clamped = progress.clamp(0, 1).toDouble();
    final now = _clock();
    var updated = _cache[index].copyWith(
      progress: clamped,
      status: clamped >= 1 ? LessonDownloadStatus.completed : LessonDownloadStatus.downloading,
      updatedAt: now,
      downloadedBytes: downloadedBytes ?? _cache[index].downloadedBytes,
      errorMessage: null,
    );
    if (clamped >= 1 && updated.manifestPath == null) {
      updated = updated.copyWith(
        manifestPath: _defaultManifestPath(updated.courseId, updated.moduleId),
      );
    }
    _cache = <LessonDownloadRecord>[
      for (var i = 0; i < _cache.length; i++)
        if (i == index) updated else _cache[i],
    ];
    await _persist();
    if (updated.isComplete) {
      _stopSimulation(updated.id);
    }
    return updated;
  }

  Future<LessonDownloadRecord?> markCompleted(
    String recordId, {
    int? downloadedBytes,
    int? expectedSizeBytes,
    String? manifestPath,
  }) async {
    await ensureReady();
    final index = _cache.indexWhere((record) => record.id == recordId);
    if (index == -1) {
      return null;
    }
    final now = _clock();
    final updated = _cache[index].copyWith(
      status: LessonDownloadStatus.completed,
      progress: 1,
      updatedAt: now,
      downloadedBytes: downloadedBytes ?? expectedSizeBytes ?? _cache[index].downloadedBytes,
      expectedSizeBytes: expectedSizeBytes ?? _cache[index].expectedSizeBytes,
      manifestPath: manifestPath ?? _defaultManifestPath(_cache[index].courseId, _cache[index].moduleId),
      errorMessage: null,
    );
    _cache = <LessonDownloadRecord>[
      for (var i = 0; i < _cache.length; i++)
        if (i == index) updated else _cache[i],
    ];
    await _persist();
    _stopSimulation(updated.id);
    return updated;
  }

  Future<LessonDownloadRecord?> cancelDownload(String recordId, {String? reason}) async {
    await ensureReady();
    final index = _cache.indexWhere((record) => record.id == recordId);
    if (index == -1) {
      return null;
    }
    final now = _clock();
    final updated = _cache[index].copyWith(
      status: LessonDownloadStatus.failed,
      progress: 0,
      updatedAt: now,
      errorMessage: reason ?? 'Cancelled by user',
    );
    _cache = <LessonDownloadRecord>[
      for (var i = 0; i < _cache.length; i++)
        if (i == index) updated else _cache[i],
    ];
    await _persist();
    _stopSimulation(updated.id);
    return updated;
  }

  Future<void> removeDownload(String recordId) async {
    await ensureReady();
    _stopSimulation(recordId);
    _cache = _cache.where((record) => record.id != recordId).toList(growable: false);
    await _persist();
  }

  Future<void> retryDownload(String recordId) async {
    await ensureReady();
    final index = _cache.indexWhere((record) => record.id == recordId);
    if (index == -1) {
      return;
    }
    final now = _clock();
    final updated = _cache[index].copyWith(
      status: LessonDownloadStatus.queued,
      progress: 0,
      updatedAt: now,
      errorMessage: null,
    );
    _cache = <LessonDownloadRecord>[
      for (var i = 0; i < _cache.length; i++)
        if (i == index) updated else _cache[i],
    ];
    await _persist();
    if (_simulateDownloads) {
      _startSimulation(updated.id);
    }
  }

  bool isDownloaded(String courseId, String moduleId) {
    return _cache.any((record) =>
        record.courseId == courseId &&
        record.moduleId == moduleId &&
        record.status == LessonDownloadStatus.completed);
  }

  Future<void> clearAll() async {
    await ensureReady();
    for (final entry in _simulations.entries) {
      entry.value.cancel();
    }
    _simulations.clear();
    _cache = const <LessonDownloadRecord>[];
    await _persist();
  }

  Future<void> dispose() async {
    for (final timer in _simulations.values) {
      timer.cancel();
    }
    _simulations.clear();
    await _box?.close();
    await _downloadsController.close();
  }

  Future<void> _persist() async {
    final box = _box;
    if (box == null) {
      return;
    }
    if (_cache.isEmpty) {
      await box.delete(_recordsKey);
    } else {
      final payload = jsonEncode(
        _cache.map((record) => record.toJson()).toList(growable: false),
      );
      await box.put(_recordsKey, payload);
    }
    if (!_downloadsController.isClosed) {
      _downloadsController.add(_cache);
    }
  }

  Future<List<LessonDownloadRecord>> _readRecords() async {
    final box = _box;
    if (box == null) {
      return const <LessonDownloadRecord>[];
    }
    final raw = box.get(_recordsKey);
    if (raw == null) {
      return const <LessonDownloadRecord>[];
    }
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((entry) => LessonDownloadRecord.fromJson((entry as Map).cast<String, dynamic>()))
          .toList(growable: false);
    } catch (_) {
      return const <LessonDownloadRecord>[];
    }
  }

  void _startSimulation(String recordId) {
    _stopSimulation(recordId);
    var progress = 0.0;
    final timer = Timer.periodic(const Duration(milliseconds: 700), (timer) async {
      final increment = 0.2 + _random.nextDouble() * 0.3;
      progress = (progress + increment).clamp(0, 1);
      await updateProgress(
        recordId,
        progress,
        downloadedBytes: progress >= 1
            ? (_cache.firstWhere((record) => record.id == recordId).expectedSizeBytes ?? 12 * 1024 * 1024)
            : null,
      );
      if (progress >= 1) {
        timer.cancel();
        await markCompleted(recordId);
      }
    });
    _simulations[recordId] = timer;
  }

  void _stopSimulation(String recordId) {
    final timer = _simulations.remove(recordId);
    timer?.cancel();
  }

  String _defaultManifestPath(String courseId, String moduleId) {
    return '/offline/lessons/$courseId/$moduleId.bundle.json';
  }
}
