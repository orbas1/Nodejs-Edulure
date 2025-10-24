import 'dart:async';
import 'dart:math';

import 'package:dio/dio.dart';

import '../provider/learning/learning_models.dart';
import 'api_config.dart';
import 'learning_persistence_service.dart';
import 'session_manager.dart';

class ProgressSyncResult {
  ProgressSyncResult({
    required this.merged,
    required this.conflicts,
  });

  final List<ModuleProgressLog> merged;
  final List<ModuleProgressLog> conflicts;

  bool get hasConflicts => conflicts.isNotEmpty;
  int get pendingCount => merged.where((log) => log.syncState == ProgressSyncState.pending).length;
}

class ProgressSyncService {
  ProgressSyncService({LearningPersistence? persistence, Dio? httpClient})
      : _persistence = persistence ?? LearningPersistenceService(),
        _httpClient = httpClient ?? ApiConfig.createHttpClient(requiresAuth: true);

  final LearningPersistence _persistence;
  final Dio _httpClient;

  Future<ProgressSyncResult> synchronise(
    List<ModuleProgressLog> localLogs, {
    List<ModuleProgressLog>? remoteOverride,
  }) async {
    final remoteLogs = remoteOverride ?? await fetchRemoteProgress(localLogs);
    final dedupedLocal = _deduplicate(localLogs);
    final remoteById = {for (final log in remoteLogs) log.id: log};

    final merged = <ModuleProgressLog>[];
    final conflicts = <ModuleProgressLog>[];

    for (final local in dedupedLocal) {
      final remote = remoteById.remove(local.id);
      if (remote == null) {
        merged.add(local);
        continue;
      }

      if (_isConflict(local, remote)) {
        final conflict = local.copyWith(
          syncState: ProgressSyncState.conflict,
          conflictReason: _describeConflict(local, remote),
          remoteSuggestion: remote.copyWith(remoteSuggestion: null, syncState: ProgressSyncState.synced),
        );
        conflicts.add(conflict);
        merged.add(conflict);
        continue;
      }

      final preferRemote = remote.updatedAt.isAfter(local.updatedAt);
      final resolved = (preferRemote ? remote : local).copyWith(
        syncState: ProgressSyncState.synced,
        syncedAt: DateTime.now(),
        revision: max(local.revision, remote.revision),
        deviceId: preferRemote ? remote.deviceId : local.deviceId,
        remoteSuggestion: null,
        conflictReason: null,
      );
      merged.add(resolved);
    }

    for (final remote in remoteById.values) {
      merged.add(
        remote.copyWith(
          syncState: ProgressSyncState.synced,
          syncedAt: DateTime.now(),
          remoteSuggestion: null,
          conflictReason: null,
        ),
      );
    }

    merged.sort((a, b) => a.timestamp.compareTo(b.timestamp));
    await _pushMerged(merged);
    return ProgressSyncResult(merged: merged, conflicts: conflicts);
  }

  Future<List<ModuleProgressLog>> fetchRemoteProgress(List<ModuleProgressLog> localLogs) async {
    final token = SessionManager.getAccessToken();
    if (token == null) {
      throw ProgressSyncException('Authentication required to synchronise progress.');
    }

    final deviceId = await _persistence.ensureDeviceId();
    final payload = <String, dynamic>{
      'deviceId': deviceId,
      'logs': localLogs
          .map(
            (log) => {
              'id': log.id,
              'courseId': log.courseId,
              'moduleId': log.moduleId,
              'revision': log.revision,
              'updatedAt': log.updatedAt.toIso8601String(),
            },
          )
          .toList(growable: false),
    };

    try {
      final response = await _httpClient.post(
        '/learning/offline/progress-logs/preview',
        data: payload,
        options: _authorisedOptions(token),
      );

      final responseMap = _coerceMap(response.data);
      final data = _coerceMap(responseMap['data']);
      final logs = _coerceList(data['logs'])
          .whereType<Map>()
          .map((entry) => ModuleProgressLog.fromJson(Map<String, dynamic>.from(entry)))
          .toList(growable: false);
      return logs;
    } on DioException catch (error) {
      throw ProgressSyncException(
        _resolveErrorMessage(error) ?? 'Unable to load remote progress updates.',
      );
    } catch (_) {
      throw ProgressSyncException('Unable to load remote progress updates.');
    }
  }

  List<ModuleProgressLog> _deduplicate(List<ModuleProgressLog> logs) {
    final Map<String, ModuleProgressLog> latestByKey = {};
    for (final log in logs) {
      final bucket = (log.timestamp.toUtc().millisecondsSinceEpoch ~/ 60000);
      final key = '${log.courseId}|${log.moduleId}|$bucket';
      final existing = latestByKey[key];
      if (existing == null || log.updatedAt.isAfter(existing.updatedAt)) {
        latestByKey[key] = log;
      }
    }
    return latestByKey.values.toList();
  }

  bool _isConflict(ModuleProgressLog local, ModuleProgressLog remote) {
    final remoteNewer = remote.updatedAt.isAfter(local.updatedAt);
    final differs = local.completedLessons != remote.completedLessons || local.notes != remote.notes;
    final localPending = local.syncState == ProgressSyncState.pending || local.syncState == ProgressSyncState.syncing;
    return remoteNewer && differs && localPending;
  }

  String _describeConflict(ModuleProgressLog local, ModuleProgressLog remote) {
    final delta = remote.completedLessons - local.completedLessons;
    final direction = delta >= 0 ? '+' : '';
    return 'Remote logged $direction$delta lessons (${remote.completedLessons} total) on ${remote.updatedAt.toLocal()}';
  }

  Future<void> _pushMerged(List<ModuleProgressLog> logs) async {
    if (logs.isEmpty) {
      return;
    }

    final token = SessionManager.getAccessToken();
    if (token == null) {
      throw ProgressSyncException('Authentication required to synchronise progress.');
    }

    final deviceId = await _persistence.ensureDeviceId();
    final payloadLogs = logs
        .where((log) =>
            log.deviceId == deviceId || log.syncState != ProgressSyncState.synced || log.hasConflict)
        .map((log) => log.toJson())
        .toList(growable: false);

    if (payloadLogs.isEmpty) {
      return;
    }

    try {
      await _httpClient.post(
        '/learning/offline/progress-logs/commit',
        data: {
          'deviceId': deviceId,
          'logs': payloadLogs,
        },
        options: _authorisedOptions(token),
      );
    } on DioException catch (error) {
      throw ProgressSyncException(
        _resolveErrorMessage(error) ?? 'Unable to persist offline progress updates.',
      );
    } catch (_) {
      throw ProgressSyncException('Unable to persist offline progress updates.');
    }
  }

  Options _authorisedOptions(String token) {
    final baseHeaders = Map<String, dynamic>.from(_httpClient.options.headers);
    baseHeaders['Authorization'] = 'Bearer $token';
    return Options(
      headers: baseHeaders,
      extra: {
        ...?_httpClient.options.extra,
        'requiresAuth': true,
      },
    );
  }

  Map<String, dynamic> _coerceMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value as Map);
    }
    return <String, dynamic>{};
  }

  List<dynamic> _coerceList(dynamic value) {
    if (value is List<dynamic>) {
      return value;
    }
    if (value is List) {
      return List<dynamic>.from(value as List);
    }
    return const <dynamic>[];
  }

  String? _resolveErrorMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    if (data is Map && data['errors'] is List && data['errors'].isNotEmpty) {
      return data['errors'].first.toString();
    }
    return error.message;
  }
}

class ProgressSyncException implements Exception {
  ProgressSyncException(this.message);

  final String message;

  @override
  String toString() => 'ProgressSyncException: $message';
}
