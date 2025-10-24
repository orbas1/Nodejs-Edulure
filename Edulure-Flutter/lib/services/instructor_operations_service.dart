import 'dart:async';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';

import 'api_config.dart';
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
  InstructorOperationsService({
    Box<dynamic>? queueBox,
    Dio? httpClient,
    String? Function()? tokenProvider,
  })  : _queueBox = queueBox ?? SessionManager.instructorActionQueue,
        _httpClient = httpClient ?? ApiConfig.createHttpClient(requiresAuth: true),
        _tokenProvider = tokenProvider ?? SessionManager.getAccessToken;

  final Box<dynamic> _queueBox;
  final Dio _httpClient;
  final String? Function()? _tokenProvider;
  final StreamController<QueuedInstructorAction> _queueUpdates =
      StreamController<QueuedInstructorAction>.broadcast();
  final Random _random = Random();
  DateTime? _lastRemoteSync;
  bool _remoteSyncInFlight = false;

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

  Future<List<QueuedInstructorAction>> loadQueuedActions({bool refreshRemote = true}) async {
    if (refreshRemote) {
      await _refreshFromServer();
    }
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
      final processing = await _updateAction(
        queued.id,
        InstructorActionState.processing,
        errorMessage: null,
      );
      if (processing != null) {
        await _patchAction(
          processing,
          overrides: {'processedAt': processing.updatedAt.toIso8601String()},
        );
      }
      final submissionError = processing != null ? await _submitAction(processing) : 'Unable to load queued action';
      if (submissionError == null) {
        await _queueBox.delete(_actionKey(queued.id));
        await _clearRemoteAction(queued.id);
        final completed = (processing ?? queued).copyWith(
          state: InstructorActionState.completed,
          updatedAt: DateTime.now(),
          errorMessage: null,
        );
        _queueUpdates.add(completed);
        return const InstructorActionOutcome(synced: true, message: 'Action synced successfully');
      }
      final failed = await _updateAction(
        queued.id,
        InstructorActionState.failed,
        errorMessage: submissionError,
      );
      if (failed != null) {
        await _patchAction(
          failed,
          overrides: {'failedAt': failed.updatedAt.toIso8601String()},
        );
      }
      return const InstructorActionOutcome(synced: false, message: 'Action queued but needs review');
    } catch (error, stackTrace) {
      debugPrint('Instructor quick action failed: $error');
      debugPrint('$stackTrace');
      final failed = await _updateAction(
        queued.id,
        InstructorActionState.failed,
        errorMessage: error.toString(),
      );
      if (failed != null) {
        await _patchAction(
          failed,
          overrides: {'failedAt': failed.updatedAt.toIso8601String()},
        );
      }
      return const InstructorActionOutcome(synced: false, message: 'Action saved offline and will retry later');
    }
  }

  Future<void> syncQueuedActions() async {
    final actions = await loadQueuedActions(refreshRemote: false);
    for (final action in actions) {
      if (action.state == InstructorActionState.completed) {
        continue;
      }
      final processing = await _updateAction(action.id, InstructorActionState.processing, errorMessage: null);
      try {
        if (processing != null) {
          await _patchAction(
            processing,
            overrides: {'processedAt': processing.updatedAt.toIso8601String()},
          );
        }
        final submissionError = processing != null ? await _submitAction(processing) : 'Unable to load queued action';
        if (submissionError == null) {
          await _queueBox.delete(_actionKey(action.id));
          await _clearRemoteAction(action.id);
          _queueUpdates.add(
            (processing ?? action).copyWith(state: InstructorActionState.completed, updatedAt: DateTime.now()),
          );
        } else {
          final failed = await _updateAction(
            action.id,
            InstructorActionState.failed,
            errorMessage: submissionError,
          );
          if (failed != null) {
            await _patchAction(
              failed,
              overrides: {'failedAt': failed.updatedAt.toIso8601String()},
            );
          }
        }
      } catch (error, stackTrace) {
        debugPrint('Failed to sync instructor action ${action.id}: $error');
        debugPrint('$stackTrace');
        final failed = await _updateAction(action.id, InstructorActionState.failed, errorMessage: error.toString());
        if (failed != null) {
          await _patchAction(
            failed,
            overrides: {'failedAt': failed.updatedAt.toIso8601String()},
          );
        }
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
    unawaited(_postAction(entry));
    return entry;
  }

  Future<QueuedInstructorAction?> _updateAction(
    String actionId,
    InstructorActionState state, {
    String? errorMessage,
  }) async {
    final raw = _queueBox.get(_actionKey(actionId));
    if (raw is! Map) {
      return null;
    }
    final existing = QueuedInstructorAction.fromJson(Map<String, dynamic>.from(raw as Map));
    final updated = existing.copyWith(
      state: state,
      updatedAt: DateTime.now(),
      errorMessage: errorMessage,
    );
    await _queueBox.put(_actionKey(actionId), updated.toJson());
    _queueUpdates.add(updated);
    return updated;
  }

  Future<void> _postAction(QueuedInstructorAction action) async {
    final headers = _authHeaders();
    if (headers == null) {
      return;
    }
    try {
      await _httpClient.post(
        '/mobile/instructor/actions',
        data: {
          'clientActionId': action.id,
          'type': action.type.name,
          'state': _actionStateToApi(action.state),
          'payload': action.payload,
          'queuedAt': action.queuedAt.toIso8601String(),
          if (action.errorMessage != null) 'errorMessage': action.errorMessage,
        },
        options: Options(headers: headers),
      );
    } on DioException catch (error) {
      debugPrint('Failed to publish instructor action ${action.id}: ${error.message}');
    } catch (error, stackTrace) {
      debugPrint('Unexpected error publishing instructor action ${action.id}: $error');
      debugPrint('$stackTrace');
    }
  }

  Future<void> _patchAction(
    QueuedInstructorAction action, {
    Map<String, dynamic>? overrides,
  }) async {
    final headers = _authHeaders();
    if (headers == null) {
      return;
    }
    final payload = <String, dynamic>{
      'type': action.type.name,
      'state': _actionStateToApi(action.state),
      'payload': action.payload,
      'queuedAt': action.queuedAt.toIso8601String(),
      'errorMessage': action.errorMessage,
      if (overrides != null) ...overrides,
    }..removeWhere((key, value) => value == null);

    try {
      await _httpClient.patch(
        '/mobile/instructor/actions/${action.id}',
        data: payload,
        options: Options(headers: headers),
      );
    } on DioException catch (error) {
      debugPrint('Failed to update instructor action ${action.id}: ${error.message}');
    } catch (error, stackTrace) {
      debugPrint('Unexpected error updating instructor action ${action.id}: $error');
      debugPrint('$stackTrace');
    }
  }

  Future<String?> _submitAction(QueuedInstructorAction action) async {
    final headers = _authHeaders();
    if (headers == null) {
      return 'Missing authentication token';
    }
    final completedAt = DateTime.now();
    try {
      final response = await _httpClient.patch(
        '/mobile/instructor/actions/${action.id}',
        data: {
          'type': action.type.name,
          'state': 'completed',
          'payload': action.payload,
          'queuedAt': action.queuedAt.toIso8601String(),
          'processedAt': action.updatedAt.toIso8601String(),
          'completedAt': completedAt.toIso8601String(),
        },
        options: Options(headers: headers),
      );
      final ok = response.statusCode != null && response.statusCode! < 400;
      if (!ok) {
        return 'Remote workflow rejected the action';
      }
      return null;
    } on DioException catch (error) {
      return error.message ?? 'Network error while syncing action';
    } catch (error, stackTrace) {
      debugPrint('Unexpected error syncing instructor action ${action.id}: $error');
      debugPrint('$stackTrace');
      return error.toString();
    }
  }

  Future<void> _clearRemoteAction(String actionId) async {
    final headers = _authHeaders();
    if (headers == null) {
      return;
    }
    try {
      await _httpClient.delete(
        '/mobile/instructor/actions/$actionId',
        options: Options(headers: headers),
      );
    } on DioException catch (error) {
      debugPrint('Failed to clear instructor action $actionId: ${error.message}');
    } catch (error, stackTrace) {
      debugPrint('Unexpected error clearing instructor action $actionId: $error');
      debugPrint('$stackTrace');
    }
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
        '/mobile/instructor/actions',
        options: Options(headers: headers),
      );
      dynamic payload = response.data;
      if (payload is Map && payload['actions'] == null && payload['data'] is Map) {
        payload = payload['data'];
      }
      final actions = _normaliseList(payload is Map ? payload['actions'] : payload);
      for (final actionData in actions) {
        final remote = _actionFromRemote(actionData);
        if (remote == null) continue;
        if (remote.state == InstructorActionState.completed) {
          await _queueBox.delete(_actionKey(remote.id));
          continue;
        }
        final key = _actionKey(remote.id);
        final existingRaw = _queueBox.get(key);
        if (existingRaw is Map) {
          final existing = QueuedInstructorAction.fromJson(Map<String, dynamic>.from(existingRaw as Map));
          if (remote.updatedAt.isBefore(existing.updatedAt)) {
            continue;
          }
        }
        await _queueBox.put(key, remote.toJson());
      }
      _lastRemoteSync = DateTime.now();
    } on DioException catch (error) {
      debugPrint('Failed to refresh instructor queue: ${error.message}');
    } catch (error, stackTrace) {
      debugPrint('Unexpected error refreshing instructor queue: $error');
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

  QueuedInstructorAction? _actionFromRemote(Map<String, dynamic> json) {
    final actionId = json['actionId']?.toString() ?? json['clientActionId']?.toString() ?? json['id']?.toString();
    if (actionId == null || actionId.isEmpty) {
      return null;
    }
    final queuedAt = DateTime.tryParse(json['queuedAt']?.toString() ?? '') ?? DateTime.now();
    final candidates = <DateTime?>[
      DateTime.tryParse(json['updatedAt']?.toString() ?? ''),
      DateTime.tryParse(json['processedAt']?.toString() ?? ''),
      DateTime.tryParse(json['completedAt']?.toString() ?? ''),
      DateTime.tryParse(json['failedAt']?.toString() ?? ''),
    ].whereType<DateTime>();
    final updatedAt = candidates.fold<DateTime>(queuedAt, (previousValue, element) {
      if (element.isAfter(previousValue)) {
        return element;
      }
      return previousValue;
    });
    final payload = json['payload'] is Map
        ? Map<String, dynamic>.from(json['payload'] as Map)
        : <String, dynamic>{};
    final typeName = json['type']?.toString() ?? InstructorQuickActionType.announcement.name;
    final stateName = json['state']?.toString() ?? InstructorActionState.queued.name;
    return QueuedInstructorAction(
      id: actionId,
      type: InstructorQuickActionType.values.firstWhere(
        (candidate) => candidate.name == typeName,
        orElse: () => InstructorQuickActionType.announcement,
      ),
      payload: payload,
      state: InstructorActionState.values.firstWhere(
        (candidate) => candidate.name == stateName,
        orElse: () => InstructorActionState.queued,
      ),
      queuedAt: queuedAt,
      updatedAt: updatedAt,
      errorMessage: json['errorMessage']?.toString(),
    );
  }

  String _actionStateToApi(InstructorActionState state) {
    switch (state) {
      case InstructorActionState.processing:
        return 'processing';
      case InstructorActionState.completed:
        return 'completed';
      case InstructorActionState.failed:
        return 'failed';
      case InstructorActionState.queued:
      default:
        return 'queued';
    }
  }

  String _actionKey(String id) => 'action:$id';

  String _generateId(String prefix) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final suffix = _random.nextInt(1 << 20);
    return '$prefix-$timestamp-$suffix';
  }
}
