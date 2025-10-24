import 'dart:async';
import 'dart:math';

import '../provider/learning/learning_models.dart';
import 'learning_persistence_service.dart';

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
  ProgressSyncService({LearningPersistence? persistence})
      : _persistence = persistence ?? LearningPersistenceService();

  final LearningPersistence _persistence;
  final Random _random = Random();

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
    return ProgressSyncResult(merged: merged, conflicts: conflicts);
  }

  Future<List<ModuleProgressLog>> fetchRemoteProgress(List<ModuleProgressLog> localLogs) async {
    await Future<void>.delayed(const Duration(milliseconds: 280));
    final localDeviceId = await _persistence.ensureDeviceId();
    final remote = <ModuleProgressLog>[];

    for (var index = 0; index < localLogs.length; index++) {
      final log = localLogs[index];
      if (index.isEven) {
        remote.add(
          log.copyWith(
            completedLessons: log.completedLessons + max(1, _random.nextInt(2) + 1),
            notes: log.notes.isEmpty
                ? 'Remote update captured automatically while $localDeviceId was offline.'
                : '${log.notes} (remote sync)',
            updatedAt: log.updatedAt.add(const Duration(hours: 2)),
            deviceId: 'remote-coach',
            revision: log.revision + 1,
            syncState: ProgressSyncState.synced,
            remoteSuggestion: null,
            conflictReason: null,
          ),
        );
      } else {
        remote.add(
          log.copyWith(
            deviceId: 'remote-coach',
            syncState: ProgressSyncState.synced,
            remoteSuggestion: null,
            conflictReason: null,
          ),
        );
      }
    }

    if (remote.isEmpty) {
      final now = DateTime.now();
      remote.add(
        ModuleProgressLog(
          id: 'remote-${now.microsecondsSinceEpoch}',
          courseId: 'course-1',
          moduleId: 'module-1',
          timestamp: now.subtract(const Duration(hours: 3)),
          notes: 'Remote tutor recorded quiz completions.',
          completedLessons: 1,
          syncState: ProgressSyncState.synced,
          updatedAt: now.subtract(const Duration(hours: 2, minutes: 30)),
          syncedAt: now.subtract(const Duration(hours: 2, minutes: 30)),
          deviceId: 'remote-coach',
          revision: 1,
        ),
      );
    }

    return remote;
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
}
