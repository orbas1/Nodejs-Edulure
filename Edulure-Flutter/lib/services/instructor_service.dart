import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';
import 'package:uuid/uuid.dart';

@immutable
class InstructorQuickAction {
  const InstructorQuickAction({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.createdAt,
    this.dueAt,
    this.completedAt,
    this.failureReason,
    this.requiresSync = false,
    this.priority = 0,
  });

  final String id;
  final String title;
  final String description;
  final InstructorQuickActionStatus status;
  final DateTime createdAt;
  final DateTime? dueAt;
  final DateTime? completedAt;
  final String? failureReason;
  final bool requiresSync;
  final int priority;

  InstructorQuickAction copyWith({
    String? id,
    String? title,
    String? description,
    InstructorQuickActionStatus? status,
    DateTime? createdAt,
    DateTime? dueAt,
    DateTime? completedAt,
    String? failureReason,
    bool? requiresSync,
    int? priority,
  }) {
    return InstructorQuickAction(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      dueAt: dueAt ?? this.dueAt,
      completedAt: completedAt ?? this.completedAt,
      failureReason: failureReason,
      requiresSync: requiresSync ?? this.requiresSync,
      priority: priority ?? this.priority,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status.name,
      'createdAt': createdAt.toIso8601String(),
      'dueAt': dueAt?.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'failureReason': failureReason,
      'requiresSync': requiresSync,
      'priority': priority,
    };
  }

  factory InstructorQuickAction.fromJson(Map<String, dynamic> json) {
    return InstructorQuickAction(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      status: InstructorQuickActionStatus.values.firstWhere(
        (value) => value.name == json['status'],
        orElse: () => InstructorQuickActionStatus.pending,
      ),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      dueAt: DateTime.tryParse(json['dueAt'] as String? ?? ''),
      completedAt: DateTime.tryParse(json['completedAt'] as String? ?? ''),
      failureReason: json['failureReason'] as String?,
      requiresSync: json['requiresSync'] == true,
      priority: (json['priority'] as num?)?.toInt() ?? 0,
    );
  }
}

enum InstructorQuickActionStatus { pending, inProgress, completed, failed }

class InstructorQuickActionsService {
  InstructorQuickActionsService({
    HiveInterface? hive,
    DateTime Function()? clock,
  })  : _hive = hive ?? Hive,
        _clock = clock ?? DateTime.now;

  static const _boxName = 'instructor.quickActions';
  static const _actionsKey = 'actions';

  final HiveInterface _hive;
  final DateTime Function() _clock;
  final Uuid _uuid = const Uuid();

  Box<String>? _box;
  bool _ready = false;
  Future<void>? _initialising;
  List<InstructorQuickAction> _cache = const <InstructorQuickAction>[];
  late final StreamController<List<InstructorQuickAction>> _controller =
      StreamController<List<InstructorQuickAction>>.broadcast(onListen: () {
    if (_ready) {
      _controller.add(_cache);
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
      if (_cache.isEmpty) {
        _cache = _seedActions();
        await _persist();
      }
      _ready = true;
      _controller.add(_cache);
    } finally {
      _initialising = null;
    }
  }

  Future<void> _openBox() async {
    _box = await _hive.openBox<String>(_boxName);
    _cache = await _readActions();
  }

  Stream<List<InstructorQuickAction>> watchActions() {
    return _controller.stream;
  }

  Future<List<InstructorQuickAction>> listActions() async {
    await ensureReady();
    return List<InstructorQuickAction>.unmodifiable(_cache);
  }

  Future<InstructorQuickAction> createAction({
    required String title,
    required String description,
    DateTime? dueAt,
    bool requiresSync = false,
    int? priority,
  }) async {
    await ensureReady();
    final now = _clock();
    final resolvedPriority = priority ?? (_cache.isEmpty ? 0 : _cache.map((action) => action.priority).reduce(max) + 1);
    final action = InstructorQuickAction(
      id: _uuid.v4(),
      title: title,
      description: description,
      status: InstructorQuickActionStatus.pending,
      createdAt: now,
      dueAt: dueAt,
      requiresSync: requiresSync,
      priority: resolvedPriority,
    );
    _cache = <InstructorQuickAction>[..._cache, action];
    _sortCache();
    await _persist();
    return action;
  }

  Future<InstructorQuickAction?> markInProgress(String id) async {
    await ensureReady();
    return _updateAction(id, (action) {
      if (action.status == InstructorQuickActionStatus.completed) {
        return action;
      }
      return action.copyWith(status: InstructorQuickActionStatus.inProgress, failureReason: null);
    });
  }

  Future<InstructorQuickAction?> markCompleted(String id, {bool requiresSync = true}) async {
    await ensureReady();
    final now = _clock();
    return _updateAction(id, (action) {
      return action.copyWith(
        status: InstructorQuickActionStatus.completed,
        completedAt: now,
        requiresSync: requiresSync,
        failureReason: null,
      );
    });
  }

  Future<InstructorQuickAction?> markFailed(String id, String reason) async {
    await ensureReady();
    return _updateAction(id, (action) {
      return action.copyWith(
        status: InstructorQuickActionStatus.failed,
        failureReason: reason,
        requiresSync: true,
      );
    });
  }

  Future<InstructorQuickAction?> retryAction(String id) async {
    await ensureReady();
    return _updateAction(id, (action) {
      return action.copyWith(
        status: InstructorQuickActionStatus.pending,
        failureReason: null,
        requiresSync: true,
      );
    });
  }

  Future<void> syncOfflineActions() async {
    await ensureReady();
    var changed = false;
    _cache = _cache.map((action) {
      if (action.requiresSync) {
        changed = true;
        return action.copyWith(requiresSync: false);
      }
      return action;
    }).toList(growable: false);
    if (changed) {
      _sortCache();
      await _persist();
    }
  }

  Future<void> dispose() async {
    await _controller.close();
    await _box?.close();
  }

  Future<void> _persist() async {
    final box = _box;
    if (box == null) {
      return;
    }
    if (_cache.isEmpty) {
      await box.delete(_actionsKey);
    } else {
      final payload = jsonEncode(_cache.map((action) => action.toJson()).toList(growable: false));
      await box.put(_actionsKey, payload);
    }
    if (!_controller.isClosed) {
      _controller.add(_cache);
    }
  }

  Future<List<InstructorQuickAction>> _readActions() async {
    final box = _box;
    if (box == null) {
      return const <InstructorQuickAction>[];
    }
    final raw = box.get(_actionsKey);
    if (raw == null) {
      return const <InstructorQuickAction>[];
    }
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((entry) => InstructorQuickAction.fromJson((entry as Map).cast<String, dynamic>()))
          .toList(growable: false);
    } catch (_) {
      return const <InstructorQuickAction>[];
    }
  }

  InstructorQuickAction? _updateAction(
    String id,
    InstructorQuickAction Function(InstructorQuickAction action) transformer,
  ) {
    final index = _cache.indexWhere((action) => action.id == id);
    if (index == -1) {
      return null;
    }
    final updated = transformer(_cache[index]);
    _cache = <InstructorQuickAction>[
      for (var i = 0; i < _cache.length; i++)
        if (i == index) updated else _cache[i],
    ];
    _sortCache();
    unawaited(_persist());
    return updated;
  }

  void _sortCache() {
    _cache.sort((a, b) {
      final priorityCompare = a.priority.compareTo(b.priority);
      if (priorityCompare != 0) {
        return priorityCompare;
      }
      final dueA = a.dueAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final dueB = b.dueAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      if (dueA != dueB) {
        return dueA.compareTo(dueB);
      }
      return a.createdAt.compareTo(b.createdAt);
    });
  }

  List<InstructorQuickAction> _seedActions() {
    final now = _clock();
    return [
      InstructorQuickAction(
        id: _uuid.v4(),
        title: 'Approve grading backlog',
        description: 'Review the four pending project submissions for cohort A.',
        status: InstructorQuickActionStatus.pending,
        createdAt: now.subtract(const Duration(hours: 3)),
        dueAt: now.add(const Duration(hours: 2)),
        priority: 0,
      ),
      InstructorQuickAction(
        id: _uuid.v4(),
        title: 'Confirm attendance notes',
        description: 'Sync attendance for yesterday’s live lab and flag any no-shows.',
        status: InstructorQuickActionStatus.inProgress,
        createdAt: now.subtract(const Duration(hours: 5)),
        dueAt: now.add(const Duration(hours: 4)),
        priority: 1,
        requiresSync: true,
      ),
      InstructorQuickAction(
        id: _uuid.v4(),
        title: 'Schedule office hours',
        description: 'Pick next week’s office hour slots and publish reminders.',
        status: InstructorQuickActionStatus.pending,
        createdAt: now.subtract(const Duration(days: 1)),
        dueAt: now.add(const Duration(days: 2)),
        priority: 2,
      ),
    ];
  }
}
