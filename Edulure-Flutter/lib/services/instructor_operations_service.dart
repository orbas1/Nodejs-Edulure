import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';

import 'session_manager.dart';

enum InstructorActionState { queued, processing, completed, failed }

enum InstructorQuickActionType { announcement, attendance, grading, schedule, note }

class InstructorQuickAction {
  const InstructorQuickAction({
    required this.id,
    required this.type,
    required this.label,
    required this.description,
    required this.icon,
  });

  final String id;
  final InstructorQuickActionType type;
  final String label;
  final String description;
  final String icon;
}

class QueuedInstructorAction {
  const QueuedInstructorAction({
    required this.id,
    required this.type,
    required this.payload,
    required this.state,
    required this.queuedAt,
    required this.updatedAt,
    this.errorMessage,
  });

  final String id;
  final InstructorQuickActionType type;
  final Map<String, dynamic> payload;
  final InstructorActionState state;
  final DateTime queuedAt;
  final DateTime updatedAt;
  final String? errorMessage;

  QueuedInstructorAction copyWith({
    InstructorActionState? state,
    DateTime? updatedAt,
    String? errorMessage,
  }) {
    return QueuedInstructorAction(
      id: id,
      type: type,
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
      'type': type.name,
      'payload': payload,
      'state': state.name,
      'queuedAt': queuedAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'errorMessage': errorMessage,
    };
  }

  factory QueuedInstructorAction.fromJson(Map<String, dynamic> json) {
    final typeName = json['type']?.toString() ?? InstructorQuickActionType.announcement.name;
    final stateName = json['state']?.toString() ?? InstructorActionState.queued.name;
    return QueuedInstructorAction(
      id: json['id'] as String,
      type: InstructorQuickActionType.values.firstWhere(
        (candidate) => candidate.name == typeName,
        orElse: () => InstructorQuickActionType.announcement,
      ),
      payload: Map<String, dynamic>.from(json['payload'] as Map),
      state: InstructorActionState.values.firstWhere(
        (candidate) => candidate.name == stateName,
        orElse: () => InstructorActionState.queued,
      ),
      queuedAt: DateTime.tryParse(json['queuedAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
      errorMessage: json['errorMessage'] as String?,
    );
  }
}

class InstructorActionOutcome {
  const InstructorActionOutcome({required this.synced, required this.message});

  final bool synced;
  final String message;
}

class InstructorOperationsService {
  InstructorOperationsService({Box<dynamic>? queueBox})
      : _queueBox = queueBox ?? SessionManager.instructorActionQueue;

  final Box<dynamic> _queueBox;
  final StreamController<QueuedInstructorAction> _queueUpdates =
      StreamController<QueuedInstructorAction>.broadcast();
  final Random _random = Random();

  static const _actions = <InstructorQuickAction>[
    InstructorQuickAction(
      id: 'announcement',
      type: InstructorQuickActionType.announcement,
      label: 'Send announcement',
      description: 'Draft an urgent announcement for all enrolled learners.',
      icon: 'campaign',
    ),
    InstructorQuickAction(
      id: 'attendance',
      type: InstructorQuickActionType.attendance,
      label: 'Record attendance',
      description: 'Log attendance for a live session when offline.',
      icon: 'assignment_turned_in',
    ),
    InstructorQuickAction(
      id: 'grading',
      type: InstructorQuickActionType.grading,
      label: 'Approve grades',
      description: 'Approve or adjust assessment grades while on the go.',
      icon: 'grading',
    ),
    InstructorQuickAction(
      id: 'schedule',
      type: InstructorQuickActionType.schedule,
      label: 'Reschedule session',
      description: 'Request a reschedule for upcoming sessions.',
      icon: 'event_repeat',
    ),
    InstructorQuickAction(
      id: 'note',
      type: InstructorQuickActionType.note,
      label: 'Add field note',
      description: 'Capture a coaching note for later sync.',
      icon: 'note_add',
    ),
  ];

  List<InstructorQuickAction> listQuickActions() => _actions;

  Stream<QueuedInstructorAction> get queueStream => _queueUpdates.stream;

  Future<List<QueuedInstructorAction>> loadQueuedActions() async {
    return _queueBox.values
        .whereType<Map>()
        .map((entry) => QueuedInstructorAction.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList(growable: false)
      ..sort((a, b) => a.queuedAt.compareTo(b.queuedAt));
  }

  Future<InstructorActionOutcome> runQuickAction(
    InstructorQuickAction action,
    Map<String, dynamic> payload,
  ) async {
    final queued = await _enqueueAction(action, payload);
    try {
      await _updateAction(queued.id, InstructorActionState.processing);
      final success = await _simulateRemoteSubmission(queued);
      if (success) {
        await _queueBox.delete(_actionKey(queued.id));
        _queueUpdates.add(
          queued.copyWith(state: InstructorActionState.completed, updatedAt: DateTime.now()),
        );
        return const InstructorActionOutcome(synced: true, message: 'Action synced successfully');
      }
      await _updateAction(
        queued.id,
        InstructorActionState.failed,
        errorMessage: 'Remote system rejected the action',
      );
      return const InstructorActionOutcome(synced: false, message: 'Action queued but needs review');
    } catch (error, stackTrace) {
      debugPrint('Instructor quick action failed: $error');
      debugPrint('$stackTrace');
      await _updateAction(
        queued.id,
        InstructorActionState.failed,
        errorMessage: error.toString(),
      );
      return const InstructorActionOutcome(synced: false, message: 'Action saved offline and will retry later');
    }
  }

  Future<void> syncQueuedActions() async {
    final actions = await loadQueuedActions();
    for (final action in actions) {
      if (action.state == InstructorActionState.completed) {
        continue;
      }
      await _updateAction(action.id, InstructorActionState.processing);
      try {
        final success = await _simulateRemoteSubmission(action);
        if (success) {
          await _queueBox.delete(_actionKey(action.id));
          _queueUpdates.add(
            action.copyWith(state: InstructorActionState.completed, updatedAt: DateTime.now()),
          );
        } else {
          await _updateAction(
            action.id,
            InstructorActionState.failed,
            errorMessage: 'Remote workflow rejected the action',
          );
        }
      } catch (error, stackTrace) {
        debugPrint('Failed to sync instructor action ${action.id}: $error');
        debugPrint('$stackTrace');
        await _updateAction(action.id, InstructorActionState.failed, errorMessage: error.toString());
      }
    }
  }

  Future<void> dispose() async {
    await _queueUpdates.close();
  }

  Future<QueuedInstructorAction> _enqueueAction(
    InstructorQuickAction action,
    Map<String, dynamic> payload,
  ) async {
    final now = DateTime.now();
    final entry = QueuedInstructorAction(
      id: _generateId(action.id),
      type: action.type,
      payload: payload,
      state: InstructorActionState.queued,
      queuedAt: now,
      updatedAt: now,
    );
    await _queueBox.put(_actionKey(entry.id), entry.toJson());
    _queueUpdates.add(entry);
    return entry;
  }

  Future<void> _updateAction(
    String actionId,
    InstructorActionState state, {
    String? errorMessage,
  }) async {
    final raw = _queueBox.get(_actionKey(actionId));
    if (raw is! Map) {
      return;
    }
    final existing = QueuedInstructorAction.fromJson(Map<String, dynamic>.from(raw as Map));
    final updated = existing.copyWith(
      state: state,
      updatedAt: DateTime.now(),
      errorMessage: errorMessage,
    );
    await _queueBox.put(_actionKey(actionId), updated.toJson());
    _queueUpdates.add(updated);
  }

  Future<bool> _simulateRemoteSubmission(QueuedInstructorAction action) async {
    await Future<void>.delayed(const Duration(milliseconds: 450));
    if (action.type == InstructorQuickActionType.attendance &&
        (action.payload['attendees'] is num ? (action.payload['attendees'] as num) < 0 : false)) {
      return false;
    }
    return true;
  }

  String _actionKey(String id) => 'action:$id';

  String _generateId(String prefix) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final suffix = _random.nextInt(1 << 20);
    return '$prefix-$timestamp-$suffix';
  }
}
