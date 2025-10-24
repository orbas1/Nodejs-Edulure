import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';
import 'package:uuid/uuid.dart';

import '../provider/learning/learning_models.dart';
import 'learning_persistence_service.dart';

enum ProgressSyncStatus { pending, syncing, failed, completed }

@immutable
class ProgressSyncTask {
  const ProgressSyncTask({
    required this.id,
    required this.logId,
    required this.courseId,
    required this.moduleId,
    required this.status,
    required this.createdAt,
    this.lastAttempt,
    this.attempts = 0,
    this.errorMessage,
  });

  final String id;
  final String logId;
  final String courseId;
  final String moduleId;
  final ProgressSyncStatus status;
  final DateTime createdAt;
  final DateTime? lastAttempt;
  final int attempts;
  final String? errorMessage;

  ProgressSyncTask copyWith({
    String? id,
    String? logId,
    String? courseId,
    String? moduleId,
    ProgressSyncStatus? status,
    DateTime? createdAt,
    DateTime? lastAttempt,
    int? attempts,
    String? errorMessage,
  }) {
    return ProgressSyncTask(
      id: id ?? this.id,
      logId: logId ?? this.logId,
      courseId: courseId ?? this.courseId,
      moduleId: moduleId ?? this.moduleId,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      lastAttempt: lastAttempt ?? this.lastAttempt,
      attempts: attempts ?? this.attempts,
      errorMessage: errorMessage,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'logId': logId,
      'courseId': courseId,
      'moduleId': moduleId,
      'status': status.name,
      'createdAt': createdAt.toIso8601String(),
      'lastAttempt': lastAttempt?.toIso8601String(),
      'attempts': attempts,
      'errorMessage': errorMessage,
    };
  }

  factory ProgressSyncTask.fromJson(Map<String, dynamic> json) {
    return ProgressSyncTask(
      id: json['id'] as String,
      logId: json['logId'] as String,
      courseId: json['courseId'] as String,
      moduleId: json['moduleId'] as String,
      status: ProgressSyncStatus.values.firstWhere(
        (value) => value.name == json['status'],
        orElse: () => ProgressSyncStatus.pending,
      ),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
      lastAttempt: DateTime.tryParse(json['lastAttempt'] as String? ?? ''),
      attempts: (json['attempts'] as num?)?.toInt() ?? 0,
      errorMessage: json['errorMessage'] as String?,
    );
  }
}

@immutable
class ProgressAnalytics {
  const ProgressAnalytics({
    required this.averageCourseCompletion,
    required this.totalLogs,
    required this.logsThisWeek,
    required this.pendingSyncs,
    required this.backlogLessons,
    required this.activeCourseCount,
    required this.averageLessonsPerLog,
    required this.averageDailyVelocity,
  });

  final double averageCourseCompletion;
  final int totalLogs;
  final int logsThisWeek;
  final int pendingSyncs;
  final int backlogLessons;
  final int activeCourseCount;
  final double averageLessonsPerLog;
  final double averageDailyVelocity;
}

class ProgressService {
  ProgressService({
    LearningPersistence? persistence,
    HiveInterface? hive,
    DateTime Function()? clock,
  })  : _persistence = persistence ?? LearningPersistenceService(),
        _hive = hive ?? Hive,
        _clock = clock ?? DateTime.now;

  static const _queueBoxName = 'learning.progress.queue';
  static const _queueKey = 'tasks';

  final LearningPersistence _persistence;
  final HiveInterface _hive;
  final DateTime Function() _clock;
  final Uuid _uuid = const Uuid();

  Box<String>? _queueBox;
  bool _ready = false;
  Future<void>? _initialising;
  List<ProgressSyncTask> _queueCache = const <ProgressSyncTask>[];

  late final StreamController<List<ProgressSyncTask>> _queueController =
      StreamController<List<ProgressSyncTask>>.broadcast(onListen: () {
    if (_ready) {
      _queueController.add(_queueCache);
    }
  });

  Future<void> ensureReady() async {
    if (_ready) {
      return;
    }
    if (_initialising != null) {
      return _initialising!;
    }
    final future = _openQueueBox();
    _initialising = future;
    try {
      await future;
      _ready = true;
      _queueController.add(_queueCache);
    } finally {
      _initialising = null;
    }
  }

  Future<void> _openQueueBox() async {
    _queueBox = await _hive.openBox<String>(_queueBoxName);
    _queueCache = await _readQueue();
  }

  Future<List<ModuleProgressLog>> loadLogs() async {
    return _persistence.loadProgressLogs() ?? <ModuleProgressLog>[];
  }

  Future<void> saveLogs(List<ModuleProgressLog> logs) {
    return _persistence.saveProgressLogs(logs);
  }

  Future<ProgressSyncTask?> enqueueLog(ModuleProgressLog log, {bool offline = false}) async {
    await ensureReady();
    if (!offline) {
      return null;
    }
    final task = ProgressSyncTask(
      id: _uuid.v4(),
      logId: log.id,
      courseId: log.courseId,
      moduleId: log.moduleId,
      status: ProgressSyncStatus.pending,
      createdAt: _clock(),
    );
    final existing = _queueCache.indexWhere((entry) => entry.logId == log.id);
    if (existing != -1) {
      _queueCache = <ProgressSyncTask>[
        for (var i = 0; i < _queueCache.length; i++)
          if (i == existing) task else _queueCache[i],
      ];
    } else {
      _queueCache = <ProgressSyncTask>[..._queueCache, task];
    }
    await _persistQueue();
    return task;
  }

  Future<List<ProgressSyncTask>> listQueue() async {
    await ensureReady();
    return List<ProgressSyncTask>.unmodifiable(_queueCache);
  }

  Stream<List<ProgressSyncTask>> watchQueue() {
    return _queueController.stream;
  }

  Future<void> markSynced(String taskId) async {
    await ensureReady();
    _queueCache = _queueCache.where((task) => task.id != taskId).toList(growable: false);
    await _persistQueue();
  }

  Future<void> markFailed(String taskId, String error) async {
    await ensureReady();
    final index = _queueCache.indexWhere((task) => task.id == taskId);
    if (index == -1) {
      return;
    }
    final now = _clock();
    final updated = _queueCache[index].copyWith(
      status: ProgressSyncStatus.failed,
      attempts: _queueCache[index].attempts + 1,
      lastAttempt: now,
      errorMessage: error,
    );
    _queueCache = <ProgressSyncTask>[
      for (var i = 0; i < _queueCache.length; i++)
        if (i == index) updated else _queueCache[i],
    ];
    await _persistQueue();
  }

  Future<void> retryFailed(String taskId) async {
    await ensureReady();
    final index = _queueCache.indexWhere((task) => task.id == taskId);
    if (index == -1) {
      return;
    }
    final updated = _queueCache[index].copyWith(
      status: ProgressSyncStatus.pending,
      errorMessage: null,
    );
    _queueCache = <ProgressSyncTask>[
      for (var i = 0; i < _queueCache.length; i++)
        if (i == index) updated else _queueCache[i],
    ];
    await _persistQueue();
  }

  Future<void> markBatchSynced(Iterable<String> taskIds) async {
    await ensureReady();
    final ids = Set<String>.from(taskIds);
    _queueCache = _queueCache.where((task) => !ids.contains(task.id)).toList(growable: false);
    await _persistQueue();
  }

  Future<void> clearCompleted({Duration? olderThan}) async {
    await ensureReady();
    final threshold = olderThan == null ? null : _clock().subtract(olderThan);
    _queueCache = _queueCache.where((task) {
      if (task.status != ProgressSyncStatus.completed) {
        return true;
      }
      if (threshold == null) {
        return false;
      }
      final timestamp = task.lastAttempt ?? task.createdAt;
      return timestamp.isAfter(threshold);
    }).toList(growable: false);
    await _persistQueue();
  }

  ProgressAnalytics buildPortfolioAnalytics({
    required List<Course> courses,
    required List<ModuleProgressLog> logs,
  }) {
    final now = _clock();
    final averageCompletion = courses.isEmpty
        ? 0
        : courses.map((course) => course.overallProgress).fold<double>(0, (total, value) => total + value) / courses.length;

    final logsThisWeek = logs
        .where((log) => now.difference(log.timestamp).inDays <= 7)
        .length;

    final backlogLessons = courses.fold<int>(0, (total, course) {
      return total + course.modules.fold<int>(0, (sum, module) {
        final remaining = module.lessonCount - module.completedLessons;
        return sum + max(0, remaining);
      });
    });

    final averageLessonsPerLog = logs.isEmpty
        ? 0
        : logs.fold<int>(0, (total, log) => total + max(0, log.completedLessons)) / logs.length;

    DateTime? earliest;
    DateTime? latest;
    for (final log in logs) {
      earliest = earliest == null || log.timestamp.isBefore(earliest!) ? log.timestamp : earliest;
      latest = latest == null || log.timestamp.isAfter(latest!) ? log.timestamp : latest;
    }
    final spanDays = earliest == null || latest == null
        ? 1
        : max(1, latest!.difference(earliest!).inDays + 1);
    final lessonsLogged = logs.fold<int>(0, (total, log) => total + max(0, log.completedLessons));
    final dailyVelocity = lessonsLogged / spanDays;

    final activeCourseCount = logs.map((log) => log.courseId).toSet().length;
    final pendingSyncs = _queueCache.where((task) => task.status != ProgressSyncStatus.completed).length;

    return ProgressAnalytics(
      averageCourseCompletion: averageCompletion,
      totalLogs: logs.length,
      logsThisWeek: logsThisWeek,
      pendingSyncs: pendingSyncs,
      backlogLessons: backlogLessons,
      activeCourseCount: activeCourseCount,
      averageLessonsPerLog: averageLessonsPerLog,
      averageDailyVelocity: dailyVelocity,
    );
  }

  Future<void> dispose() async {
    await _queueBox?.close();
    await _queueController.close();
  }

  Future<void> _persistQueue() async {
    final box = _queueBox;
    if (box == null) {
      return;
    }
    if (_queueCache.isEmpty) {
      await box.delete(_queueKey);
    } else {
      final payload = jsonEncode(
        _queueCache.map((task) => task.toJson()).toList(growable: false),
      );
      await box.put(_queueKey, payload);
    }
    if (!_queueController.isClosed) {
      _queueController.add(_queueCache);
    }
  }

  Future<List<ProgressSyncTask>> _readQueue() async {
    final box = _queueBox;
    if (box == null) {
      return const <ProgressSyncTask>[];
    }
    final raw = box.get(_queueKey);
    if (raw == null) {
      return const <ProgressSyncTask>[];
    }
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((entry) => ProgressSyncTask.fromJson((entry as Map).cast<String, dynamic>()))
          .toList(growable: false);
    } catch (_) {
      return const <ProgressSyncTask>[];
    }
  }
}
