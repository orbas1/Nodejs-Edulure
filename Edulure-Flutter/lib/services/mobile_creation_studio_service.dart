import 'dart:math';

import 'package:dio/dio.dart';

import 'api_config.dart';
import 'session_manager.dart';

class MobileCreationStudioService {
  MobileCreationStudioService()
      : _dio = Dio(
          BaseOptions(
            baseUrl: apiBaseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 30),
          ),
        );

  final Dio _dio;
  final Random _random = Random();

  static const _projectListKey = 'projects.list';
  static const _projectSyncedAtKey = 'projects.syncedAt';
  static const _communitiesKey = 'communities.list';
  static const _communitiesSyncedKey = 'communities.syncedAt';

  List<CreationProject> loadCachedProjects() {
    final box = SessionManager.creationProjectsCache;
    final ids = box.get(_projectListKey);
    if (ids is List) {
      final projects = <CreationProject>[];
      for (final id in ids) {
        final data = box.get('project:$id');
        if (data is Map) {
          projects.add(
            CreationProject.fromJson(
              Map<String, dynamic>.from(data as Map),
              fromCache: true,
            ),
          );
        }
      }
      return projects;
    }
    return const <CreationProject>[];
  }

  DateTime? loadLastProjectSync() {
    final syncedAt = SessionManager.creationProjectsCache.get(_projectSyncedAtKey);
    if (syncedAt is String) {
      return DateTime.tryParse(syncedAt);
    }
    return null;
  }

  List<CommunitySummary> loadCachedCommunities() {
    final data = SessionManager.creationProjectsCache.get(_communitiesKey);
    if (data is List) {
      return data
          .whereType<Map>()
          .map((entry) => CommunitySummary.fromJson(Map<String, dynamic>.from(entry)))
          .toList(growable: false);
    }
    return const <CommunitySummary>[];
  }

  DateTime? loadLastCommunitySync() {
    final syncedAt = SessionManager.creationProjectsCache.get(_communitiesSyncedKey);
    if (syncedAt is String) {
      return DateTime.tryParse(syncedAt);
    }
    return null;
  }

  Future<List<CreationProject>> fetchProjects({bool includeArchived = false}) async {
    final token = SessionManager.getAccessToken();
    final cached = loadCachedProjects();
    if (token == null) {
      return cached;
    }

    try {
      final response = await _dio.get(
        '/creation/projects',
        queryParameters: {
          'limit': 50,
          if (includeArchived) 'includeArchived': true,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final payload = response.data;
      if (payload is! Map || payload['data'] is! List) {
        throw Exception('Unexpected creation project response');
      }

      final now = DateTime.now();
      final projects = (payload['data'] as List)
          .whereType<Map>()
          .map(
            (entry) => CreationProject.fromJson(
              Map<String, dynamic>.from(entry),
              syncedAt: now,
            ),
          )
          .toList(growable: false);

      await _cacheProjects(projects, syncedAt: now);
      return projects;
    } on DioException catch (error) {
      if (_isOffline(error)) {
        return cached;
      }
      throw _wrapDioException(error, fallback: 'Unable to load creation projects');
    }
  }

  Future<CreationProject> fetchProject(String projectId) async {
    final token = SessionManager.getAccessToken();
    final cached = loadCachedProject(projectId);
    if (token == null) {
      if (cached != null) return cached;
      throw Exception('Authentication required to load project');
    }

    try {
      final response = await _dio.get(
        '/creation/projects/$projectId',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final payload = response.data;
      if (payload is! Map || payload['data'] is! Map) {
        throw Exception('Unexpected project detail response');
      }
      final project = CreationProject.fromJson(
        Map<String, dynamic>.from(payload['data'] as Map),
        syncedAt: DateTime.now(),
      );
      await _cacheProject(project);
      return project;
    } on DioException catch (error) {
      if (_isOffline(error) && cached != null) {
        return cached;
      }
      throw _wrapDioException(error, fallback: 'Unable to load project detail');
    }
  }

  CreationProject? loadCachedProject(String projectId) {
    final data = SessionManager.creationProjectsCache.get('project:$projectId');
    if (data is Map) {
      return CreationProject.fromJson(Map<String, dynamic>.from(data), fromCache: true);
    }
    return null;
  }

  Future<CreationProjectOperationResult> updateProjectStatus(
    String projectId,
    String status, {
    String? note,
  }) async {
    final token = SessionManager.getAccessToken();
    final cached = loadCachedProject(projectId);
    if (token == null) {
      throw Exception('Authentication required to update project status');
    }

    final body = <String, dynamic>{'status': status};
    if (note != null && note.trim().isNotEmpty) {
      final existing = cached?.complianceNotes ?? const <ComplianceNote>[];
      body['complianceNotes'] = [
        ...existing.map((entry) => entry.toJson()),
        {
          'type': 'policy',
          'message': note.trim(),
        },
      ];
    }

    try {
      final response = await _dio.patch(
        '/creation/projects/$projectId',
        data: body,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final payload = response.data;
      if (payload is! Map || payload['data'] is! Map) {
        throw Exception('Unexpected update response');
      }
      final project = CreationProject.fromJson(
        Map<String, dynamic>.from(payload['data'] as Map),
        syncedAt: DateTime.now(),
      );
      await _cacheProject(project);
      return CreationProjectOperationResult(project: project, message: 'Project status updated');
    } on DioException catch (error) {
      if (!_isOffline(error)) {
        throw _wrapDioException(error, fallback: 'Unable to update project status');
      }
      if (cached == null) {
        throw Exception('Project data unavailable offline');
      }

      final action = _buildPendingAction(
        projectId,
        PendingCreationActionType.updateStatus,
        description: 'Move to ${_humaniseStatus(status)}',
        payload: {
          'body': body,
          'optimisticStatus': status,
          'previousStatus': cached.status,
          if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
        },
      );
      await _queueAction(action);

      final optimistic = cached.copyWith(
        status: status,
        pendingActions: [...cached.pendingActions, action],
        updatedAt: DateTime.now(),
      );
      await _cacheProject(optimistic);

      return CreationProjectOperationResult(
        project: optimistic,
        queued: true,
        message: 'Status change queued while offline',
      );
    }
  }

  Future<CreationProjectOperationResult> recordOutlineReview({
    required String projectId,
    required String outlineId,
    required String status,
    String? notes,
  }) async {
    final token = SessionManager.getAccessToken();
    final cached = loadCachedProject(projectId);
    if (cached == null) {
      throw Exception('Project data unavailable');
    }
    if (token == null) {
      throw Exception('Authentication required to submit review');
    }

    final reviewerId = _resolveCurrentUserId();
    final metadata = _nextMetadataForReview(cached, outlineId, status, notes, reviewerId);

    try {
      final response = await _dio.patch(
        '/creation/projects/$projectId',
        data: {'metadata': metadata},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final payload = response.data;
      if (payload is! Map || payload['data'] is! Map) {
        throw Exception('Unexpected metadata update response');
      }
      final project = CreationProject.fromJson(
        Map<String, dynamic>.from(payload['data'] as Map),
        syncedAt: DateTime.now(),
      );
      await _cacheProject(project);
      return CreationProjectOperationResult(
        project: project,
        message: 'Review recorded',
      );
    } on DioException catch (error) {
      if (!_isOffline(error)) {
        throw _wrapDioException(error, fallback: 'Unable to submit review');
      }

      final action = _buildPendingAction(
        projectId,
        PendingCreationActionType.updateMetadata,
        description: 'Review ${outlineId.toUpperCase()}',
        payload: {
          'body': {'metadata': metadata},
          'outlineId': outlineId,
        },
      );
      await _queueAction(action);
      final optimistic = cached.copyWith(
        metadata: metadata,
        pendingActions: [...cached.pendingActions, action],
        updatedAt: DateTime.now(),
      );
      await _cacheProject(optimistic);
      return CreationProjectOperationResult(
        project: optimistic,
        queued: true,
        message: 'Review queued for sync',
      );
    }
  }

  Future<CreationProjectOperationResult> shareProjectUpdateToCommunity({
    required CreationProject project,
    required String communityId,
    String? communityName,
    required String body,
    String? title,
    List<String>? tags,
  }) async {
    final token = SessionManager.getAccessToken();
    if (token == null) {
      throw Exception('Authentication required to post to community');
    }

    final payload = {
      'postType': 'update',
      'title': title?.trim().isEmpty ?? true ? project.title : title!.trim(),
      'body': body.trim(),
      'tags': tags?.where((tag) => tag.trim().isNotEmpty).toList() ??
          project.deriveSuggestedTags(limit: 6),
      'metadata': {
        'sourceProjectId': project.id,
        'sourceProjectType': project.type,
        'status': project.status,
      },
    };

    try {
      await _dio.post(
        '/communities/$communityId/posts',
        data: payload,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return CreationProjectOperationResult(
        project: project,
        message: 'Community update published',
      );
    } on DioException catch (error) {
      if (!_isOffline(error)) {
        throw _wrapDioException(error, fallback: 'Unable to publish community update');
      }

      final action = _buildPendingAction(
        project.id,
        PendingCreationActionType.sharePost,
        description: 'Share to ${communityName ?? 'community'}',
        payload: {
          'communityId': communityId,
          'body': payload,
        },
      );
      await _queueAction(action);
      final optimistic = project.copyWith(
        pendingActions: [...project.pendingActions, action],
      );
      await _cacheProject(optimistic);
      return CreationProjectOperationResult(
        project: optimistic,
        queued: true,
        message: 'Community post queued until you reconnect',
      );
    }
  }

  Future<List<CommunitySummary>> fetchCommunities() async {
    final token = SessionManager.getAccessToken();
    final cached = loadCachedCommunities();
    if (token == null) {
      return cached;
    }

    try {
      final response = await _dio.get(
        '/communities',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final payload = response.data;
      if (payload is! Map || payload['data'] is! List) {
        throw Exception('Unexpected communities response');
      }
      final now = DateTime.now();
      final communities = (payload['data'] as List)
          .whereType<Map>()
          .map((entry) => CommunitySummary.fromJson(Map<String, dynamic>.from(entry)))
          .toList(growable: false);
      final box = SessionManager.creationProjectsCache;
      await box.put(
        _communitiesKey,
        communities.map((community) => community.toJson()).toList(),
      );
      await box.put(_communitiesSyncedKey, now.toIso8601String());
      return communities;
    } on DioException catch (error) {
      if (_isOffline(error)) {
        return cached;
      }
      throw _wrapDioException(error, fallback: 'Unable to load communities');
    }
  }

  Future<void> syncPendingActions() async {
    final token = SessionManager.getAccessToken();
    if (token == null) return;

    final queue = SessionManager.creationActionQueue;
    final keys = queue.keys.toList(growable: false);
    for (final key in keys) {
      final raw = queue.get(key);
      if (raw is! Map) {
        await queue.delete(key);
        continue;
      }
      final action = PendingCreationAction.fromJson(
        Map<String, dynamic>.from(raw),
        id: key.toString(),
      );
      try {
        switch (action.type) {
          case PendingCreationActionType.updateStatus:
            await _replayStatusAction(action, token);
            break;
          case PendingCreationActionType.updateMetadata:
            await _replayMetadataAction(action, token);
            break;
          case PendingCreationActionType.sharePost:
            await _replayShareAction(action, token);
            break;
        }
        await queue.delete(key);
      } on DioException catch (error) {
        if (_isOffline(error)) {
          return; // stop processing so we retry later when back online
        }

        final statusCode = error.response?.statusCode;
        if (statusCode != null && statusCode >= 500) {
          await _markActionDeferred(
            action,
            'Server responded with $statusCode. Will retry automatically when stable.',
          );
          continue;
        }

        await queue.delete(key);

        if (statusCode == 401 || statusCode == 403) {
          await _markActionFailed(
            action,
            'Session expired. Sign in again to sync pending updates.',
          );
          continue;
        }

        if (statusCode == 404 || statusCode == 410) {
          await _markActionFailed(
            action,
            'Project no longer exists on the server; remove it or retry from the studio.',
          );
          continue;
        }

        await _markActionFailed(action, _extractErrorMessage(error));
      } catch (error) {
        await queue.delete(key);
        await _markActionFailed(action, error.toString());
      }
    }
  }

  Future<void> _replayStatusAction(PendingCreationAction action, String token) async {
    final body = action.payload['body'];
    if (body is! Map) {
      throw Exception('Invalid queued payload');
    }
    final response = await _dio.patch(
      '/creation/projects/${action.projectId}',
      data: body,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final data = response.data;
    if (data is! Map || data['data'] is! Map) {
      throw Exception('Unexpected replay response');
    }
    final project = CreationProject.fromJson(
      Map<String, dynamic>.from(data['data'] as Map),
      syncedAt: DateTime.now(),
    );
    final cached = loadCachedProject(action.projectId);
    final remaining = cached?.pendingActions
            .where((pending) => pending.id != action.id)
            .toList() ??
        const <PendingCreationAction>[];
    await _cacheProject(project.copyWith(pendingActions: remaining));
  }

  Future<void> _replayMetadataAction(PendingCreationAction action, String token) async {
    final body = action.payload['body'];
    if (body is! Map) {
      throw Exception('Invalid queued metadata payload');
    }
    final response = await _dio.patch(
      '/creation/projects/${action.projectId}',
      data: body,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final data = response.data;
    if (data is! Map || data['data'] is! Map) {
      throw Exception('Unexpected metadata replay response');
    }
    final project = CreationProject.fromJson(
      Map<String, dynamic>.from(data['data'] as Map),
      syncedAt: DateTime.now(),
    );
    final filtered = project.copyWith(
      pendingActions: project.pendingActions
          .where((pending) => pending.id != action.id)
          .toList(),
    );
    await _cacheProject(filtered);
  }

  Future<void> _replayShareAction(PendingCreationAction action, String token) async {
    final payload = action.payload['body'];
    final communityId = action.payload['communityId'];
    if (payload is! Map || communityId is! String) {
      throw Exception('Invalid queued share payload');
    }
    await _dio.post(
      '/communities/$communityId/posts',
      data: payload,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final cached = loadCachedProject(action.projectId);
    if (cached == null) return;
    final filtered = cached.copyWith(
      pendingActions: cached.pendingActions
          .where((pending) => pending.id != action.id)
          .toList(),
    );
    await _cacheProject(filtered);
  }

  Future<void> _cacheProjects(List<CreationProject> projects, {DateTime? syncedAt}) async {
    final box = SessionManager.creationProjectsCache;
    await box.put(_projectListKey, projects.map((project) => project.id).toList());
    if (syncedAt != null) {
      await box.put(_projectSyncedAtKey, syncedAt.toIso8601String());
    }
    for (final project in projects) {
      final merged = _mergePendingActions(project);
      await box.put('project:${project.id}', merged.toJson());
    }
  }

  Future<void> _cacheProject(CreationProject project) async {
    final box = SessionManager.creationProjectsCache;
    final ids = box.get(_projectListKey);
    if (ids is List && !ids.contains(project.id)) {
      await box.put(_projectListKey, [...ids, project.id]);
    } else if (ids is! List) {
      await box.put(_projectListKey, [project.id]);
    }
    final merged = _mergePendingActions(project);
    await box.put('project:${project.id}', merged.toJson());
    await box.put(_projectSyncedAtKey, DateTime.now().toIso8601String());
  }

  CreationProject _mergePendingActions(CreationProject project) {
    final cached = loadCachedProject(project.id);
    final merged = <PendingCreationAction>[...project.pendingActions];
    if (cached != null && cached.pendingActions.isNotEmpty) {
      merged.addAll(cached.pendingActions);
    }
    final queued = _loadQueuedActionsForProject(project.id);
    if (queued.isNotEmpty) {
      merged.addAll(queued);
    }

    if (merged.isEmpty) {
      return project;
    }

    final deduped = <String, PendingCreationAction>{};
    for (final action in merged) {
      final existing = deduped[action.id];
      if (existing == null) {
        deduped[action.id] = action;
        continue;
      }

      final shouldReplace = action.createdAt.isAfter(existing.createdAt) ||
          (existing.status == PendingCreationActionStatus.pending &&
              action.status == PendingCreationActionStatus.failed);
      if (shouldReplace) {
        deduped[action.id] = action;
      }
    }

    final ordered = deduped.values.toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return project.copyWith(pendingActions: ordered);
  }

  PendingCreationAction _buildPendingAction(
    String projectId,
    PendingCreationActionType type, {
    required Map<String, dynamic> payload,
    required String description,
  }) {
    final id = 'act-${DateTime.now().millisecondsSinceEpoch}-${_random.nextInt(1 << 20)}';
    return PendingCreationAction(
      id: id,
      projectId: projectId,
      type: type,
      description: description,
      payload: payload,
      createdAt: DateTime.now(),
      status: PendingCreationActionStatus.pending,
    );
  }

  Future<void> _queueAction(PendingCreationAction action) async {
    await SessionManager.creationActionQueue.put(action.id, action.toJson());
  }

  Future<void> _markActionFailed(PendingCreationAction action, String? message) async {
    final cached = loadCachedProject(action.projectId);
    if (cached == null) return;
    final updated = cached.copyWith(
      pendingActions: cached.pendingActions
          .map((pending) => pending.id == action.id
              ? pending.copyWith(
                  status: PendingCreationActionStatus.failed,
                  errorMessage: message,
                )
              : pending)
          .toList(),
    );
    await _cacheProject(updated);
  }

  Future<void> _markActionDeferred(PendingCreationAction action, String message) async {
    final cached = loadCachedProject(action.projectId);
    if (cached == null) return;
    final updated = cached.copyWith(
      pendingActions: cached.pendingActions
          .map((pending) => pending.id == action.id
              ? pending.copyWith(errorMessage: message)
              : pending)
          .toList(),
    );
    await _cacheProject(updated);
  }

  bool _isOffline(DioException error) {
    if (error.type == DioExceptionType.unknown ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.connectionError) {
      return true;
    }
    return error.response == null;
  }

  Exception _wrapDioException(DioException error, {required String fallback}) {
    final message = _extractErrorMessage(error);
    final statusCode = error.response?.statusCode;
    final prefix = statusCode != null ? '[$statusCode] ' : '';
    return Exception('$prefix${message ?? fallback}');
  }

  String? _extractErrorMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map) {
      final message = data['message'];
      if (message is String && message.trim().isNotEmpty) {
        return message.trim();
      }
      final errors = data['errors'];
      if (errors is List && errors.isNotEmpty) {
        final first = errors.first;
        if (first is String) return first;
      }
    }
    return error.message;
  }

  List<PendingCreationAction> _loadQueuedActionsForProject(String projectId) {
    final queue = SessionManager.creationActionQueue;
    final actions = <PendingCreationAction>[];
    for (final key in queue.keys) {
      final raw = queue.get(key);
      if (raw is! Map) {
        continue;
      }
      try {
        final action = PendingCreationAction.fromJson(
          Map<String, dynamic>.from(raw),
          id: key.toString(),
        );
        if (action.projectId == projectId) {
          actions.add(action);
        }
      } catch (_) {
        continue;
      }
    }
    return actions;
  }

  int? _resolveCurrentUserId() {
    final session = SessionManager.getSession();
    final user = session?['user'];
    if (user is Map && user['id'] is num) {
      return (user['id'] as num).toInt();
    }
    return null;
  }

  Map<String, dynamic> _nextMetadataForReview(
    CreationProject project,
    String outlineId,
    String status,
    String? notes,
    int? reviewerId,
  ) {
    final metadata = project.metadataDeepCopy();
    final now = DateTime.now().toIso8601String();
    final review = metadata['mobileReview'] is Map
        ? Map<String, dynamic>.from(metadata['mobileReview'] as Map)
        : <String, dynamic>{};
    final outlineReviews = review['outlineReviews'] is Map
        ? Map<String, dynamic>.from(review['outlineReviews'] as Map)
        : <String, dynamic>{};
    outlineReviews[outlineId] = {
      'status': status,
      'notes': notes?.trim().isNotEmpty ?? false ? notes!.trim() : null,
      'updatedAt': now,
      'updatedBy': reviewerId,
    }..removeWhere((key, value) => value == null);
    review['outlineReviews'] = outlineReviews;
    review['lastReviewedAt'] = now;
    if (reviewerId != null) {
      review['lastReviewerId'] = reviewerId;
    }
    metadata['mobileReview'] = review;
    return metadata;
  }

  String _humaniseStatus(String status) {
    return status
        .split('_')
        .map((part) => part.isEmpty ? part : part[0].toUpperCase() + part.substring(1))
        .join(' ');
  }
}

class CreationProjectOperationResult {
  CreationProjectOperationResult({
    required this.project,
    this.queued = false,
    this.message,
  });

  final CreationProject project;
  final bool queued;
  final String? message;
}

class CreationProject {
  CreationProject._({
    required this.id,
    required this.title,
    required this.type,
    required this.status,
    required this.summary,
    required this.metadata,
    required this.contentOutline,
    required this.analyticsTargets,
    required this.publishingChannels,
    required this.collaborators,
    required this.complianceNotes,
    required this.latestVersion,
    required this.activeSessions,
    required this.collaboratorCount,
    required this.pendingActions,
    required this.reviewRequestedAt,
    required this.approvedAt,
    required this.publishedAt,
    required this.archivedAt,
    required this.createdAt,
    required this.updatedAt,
    required this.syncedAt,
    required this.isFromCache,
  });

  factory CreationProject({
    required String id,
    required String title,
    required String type,
    required String status,
    String? summary,
    Map<String, dynamic>? metadata,
    List<CreationOutlineItem>? contentOutline,
    Map<String, dynamic>? analyticsTargets,
    List<String>? publishingChannels,
    List<CreationCollaborator>? collaborators,
    List<ComplianceNote>? complianceNotes,
    CreationProjectVersion? latestVersion,
    List<CreationCollaborationSession>? activeSessions,
    int? collaboratorCount,
    List<PendingCreationAction>? pendingActions,
    DateTime? reviewRequestedAt,
    DateTime? approvedAt,
    DateTime? publishedAt,
    DateTime? archivedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? syncedAt,
    bool isFromCache = false,
  }) {
    final meta = metadata != null ? _immutableMap(metadata) : const <String, dynamic>{};
    return CreationProject._(
      id: id,
      title: title,
      type: type,
      status: status,
      summary: summary,
      metadata: meta,
      contentOutline: contentOutline != null
          ? List.unmodifiable(contentOutline)
          : const <CreationOutlineItem>[],
      analyticsTargets:
          analyticsTargets != null ? _immutableMap(analyticsTargets) : const <String, dynamic>{},
      publishingChannels: publishingChannels != null
          ? List.unmodifiable(publishingChannels)
          : const <String>[],
      collaborators:
          collaborators != null ? List.unmodifiable(collaborators) : const <CreationCollaborator>[],
      complianceNotes:
          complianceNotes != null ? List.unmodifiable(complianceNotes) : const <ComplianceNote>[],
      latestVersion: latestVersion,
      activeSessions:
          activeSessions != null ? List.unmodifiable(activeSessions) : const <CreationCollaborationSession>[],
      collaboratorCount: collaboratorCount,
      pendingActions:
          pendingActions != null ? List.unmodifiable(pendingActions) : const <PendingCreationAction>[],
      reviewRequestedAt: reviewRequestedAt,
      approvedAt: approvedAt,
      publishedAt: publishedAt,
      archivedAt: archivedAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      syncedAt: syncedAt,
      isFromCache: isFromCache,
    );
  }

  factory CreationProject.fromJson(
    Map<String, dynamic> json, {
    bool fromCache = false,
    DateTime? syncedAt,
  }) {
    final metadata = json['metadata'] is Map
        ? Map<String, dynamic>.from(json['metadata'] as Map)
        : const <String, dynamic>{};
    final outline = <CreationOutlineItem>[];
    if (json['contentOutline'] is List) {
      for (final item in json['contentOutline'] as List) {
        if (item is Map) {
          outline.add(CreationOutlineItem.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }
    final collaborators = <CreationCollaborator>[];
    if (json['collaborators'] is List) {
      for (final item in json['collaborators'] as List) {
        if (item is Map) {
          collaborators.add(CreationCollaborator.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }
    final notes = <ComplianceNote>[];
    if (json['complianceNotes'] is List) {
      for (final item in json['complianceNotes'] as List) {
        if (item is Map) {
          notes.add(ComplianceNote.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }
    final sessions = <CreationCollaborationSession>[];
    if (json['activeSessions'] is List) {
      for (final item in json['activeSessions'] as List) {
        if (item is Map) {
          sessions.add(CreationCollaborationSession.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }
    final pending = <PendingCreationAction>[];
    if (json['pendingActions'] is List) {
      for (final item in json['pendingActions'] as List) {
        if (item is Map) {
          pending.add(PendingCreationAction.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }

    return CreationProject(
      id: json['publicId']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled project',
      type: json['type']?.toString() ?? 'course',
      status: json['status']?.toString() ?? 'draft',
      summary: json['summary']?.toString(),
      metadata: metadata,
      contentOutline: outline,
      analyticsTargets: json['analyticsTargets'] is Map
          ? Map<String, dynamic>.from(json['analyticsTargets'] as Map)
          : const <String, dynamic>{},
      publishingChannels: json['publishingChannels'] is List
          ? (json['publishingChannels'] as List).map((entry) => entry.toString()).toList()
          : const <String>[],
      collaborators: collaborators,
      complianceNotes: notes,
      latestVersion: json['latestVersion'] is Map
          ? CreationProjectVersion.fromJson(Map<String, dynamic>.from(json['latestVersion'] as Map))
          : null,
      activeSessions: sessions,
      collaboratorCount: json['collaboratorCount'] is num
          ? (json['collaboratorCount'] as num).toInt()
          : null,
      pendingActions: pending,
      reviewRequestedAt: _parseDate(json['reviewRequestedAt']),
      approvedAt: _parseDate(json['approvedAt']),
      publishedAt: _parseDate(json['publishedAt']),
      archivedAt: _parseDate(json['archivedAt']),
      createdAt: _parseDate(json['createdAt']),
      updatedAt: _parseDate(json['updatedAt']),
      syncedAt: syncedAt,
      isFromCache: fromCache,
    );
  }

  final String id;
  final String title;
  final String type;
  final String status;
  final String? summary;
  final Map<String, dynamic> metadata;
  final List<CreationOutlineItem> contentOutline;
  final Map<String, dynamic> analyticsTargets;
  final List<String> publishingChannels;
  final List<CreationCollaborator> collaborators;
  final List<ComplianceNote> complianceNotes;
  final CreationProjectVersion? latestVersion;
  final List<CreationCollaborationSession> activeSessions;
  final int? collaboratorCount;
  final List<PendingCreationAction> pendingActions;
  final DateTime? reviewRequestedAt;
  final DateTime? approvedAt;
  final DateTime? publishedAt;
  final DateTime? archivedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? syncedAt;
  final bool isFromCache;

  CreationProject copyWith({
    String? title,
    String? type,
    String? status,
    String? summary,
    Map<String, dynamic>? metadata,
    List<CreationOutlineItem>? contentOutline,
    Map<String, dynamic>? analyticsTargets,
    List<String>? publishingChannels,
    List<CreationCollaborator>? collaborators,
    List<ComplianceNote>? complianceNotes,
    CreationProjectVersion? latestVersion,
    List<CreationCollaborationSession>? activeSessions,
    int? collaboratorCount,
    List<PendingCreationAction>? pendingActions,
    DateTime? reviewRequestedAt,
    DateTime? approvedAt,
    DateTime? publishedAt,
    DateTime? archivedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? syncedAt,
    bool? isFromCache,
  }) {
    return CreationProject(
      id: id,
      title: title ?? this.title,
      type: type ?? this.type,
      status: status ?? this.status,
      summary: summary ?? this.summary,
      metadata: metadata ?? this.metadata,
      contentOutline: contentOutline ?? this.contentOutline,
      analyticsTargets: analyticsTargets ?? this.analyticsTargets,
      publishingChannels: publishingChannels ?? this.publishingChannels,
      collaborators: collaborators ?? this.collaborators,
      complianceNotes: complianceNotes ?? this.complianceNotes,
      latestVersion: latestVersion ?? this.latestVersion,
      activeSessions: activeSessions ?? this.activeSessions,
      collaboratorCount: collaboratorCount ?? this.collaboratorCount,
      pendingActions: pendingActions ?? this.pendingActions,
      reviewRequestedAt: reviewRequestedAt ?? this.reviewRequestedAt,
      approvedAt: approvedAt ?? this.approvedAt,
      publishedAt: publishedAt ?? this.publishedAt,
      archivedAt: archivedAt ?? this.archivedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncedAt: syncedAt ?? this.syncedAt,
      isFromCache: isFromCache ?? this.isFromCache,
    );
  }

  bool get requiresAttention =>
      status == 'ready_for_review' || status == 'in_review' || status == 'changes_requested';

  Map<String, dynamic> metadataDeepCopy() {
    return _deepCopyMap(metadata);
  }

  List<String> deriveSuggestedTags({int limit = 6}) {
    final tags = <String>{};
    final analyticsKeywords = analyticsTargets['keywords'];
    if (analyticsKeywords is List) {
      tags.addAll(analyticsKeywords.whereType<String>());
    }
    final audience = metadata['audience'];
    if (audience is List) {
      tags.addAll(audience.whereType<String>());
    }
    final objectives = metadata['objectives'];
    if (objectives is List) {
      tags.addAll(objectives.whereType<String>());
    }
    return tags.take(limit).map((tag) => tag.toLowerCase()).toList();
  }

  Map<String, CreationOutlineReview> outlineReviews() {
    final review = metadata['mobileReview'];
    if (review is! Map) {
      return const <String, CreationOutlineReview>{};
    }
    final outline = review['outlineReviews'];
    if (outline is! Map) {
      return const <String, CreationOutlineReview>{};
    }
    final entries = <String, CreationOutlineReview>{};
    outline.forEach((key, value) {
      if (value is Map) {
        entries[key.toString()] = CreationOutlineReview.fromJson(
          Map<String, dynamic>.from(value),
        );
      }
    });
    return entries;
  }

  Map<String, dynamic> toJson() {
    return {
      'publicId': id,
      'title': title,
      'type': type,
      'status': status,
      if (summary != null) 'summary': summary,
      'metadata': _deepCopyMap(metadata),
      'contentOutline': contentOutline.map((item) => item.toJson()).toList(),
      'analyticsTargets': _deepCopyMap(analyticsTargets),
      'publishingChannels': List<String>.from(publishingChannels),
      'collaborators': collaborators.map((collaborator) => collaborator.toJson()).toList(),
      'complianceNotes': complianceNotes.map((note) => note.toJson()).toList(),
      if (latestVersion != null) 'latestVersion': latestVersion!.toJson(),
      'activeSessions': activeSessions.map((session) => session.toJson()).toList(),
      if (collaboratorCount != null) 'collaboratorCount': collaboratorCount,
      'pendingActions': pendingActions.map((action) => action.toJson()).toList(),
      if (reviewRequestedAt != null) 'reviewRequestedAt': reviewRequestedAt!.toIso8601String(),
      if (approvedAt != null) 'approvedAt': approvedAt!.toIso8601String(),
      if (publishedAt != null) 'publishedAt': publishedAt!.toIso8601String(),
      if (archivedAt != null) 'archivedAt': archivedAt!.toIso8601String(),
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
      if (syncedAt != null) 'syncedAt': syncedAt!.toIso8601String(),
    };
  }
}

class CreationOutlineReview {
  CreationOutlineReview({
    required this.status,
    this.notes,
    this.updatedAt,
    this.updatedBy,
  });

  factory CreationOutlineReview.fromJson(Map<String, dynamic> json) {
    return CreationOutlineReview(
      status: json['status']?.toString() ?? 'pending',
      notes: json['notes']?.toString(),
      updatedAt: _parseDate(json['updatedAt']),
      updatedBy: json['updatedBy'] is num ? (json['updatedBy'] as num).toInt() : null,
    );
  }

  final String status;
  final String? notes;
  final DateTime? updatedAt;
  final int? updatedBy;
}

class CreationOutlineItem {
  CreationOutlineItem({
    required this.id,
    required this.label,
    this.description,
    this.durationMinutes,
    List<CreationOutlineItem>? children,
  }) : children = children != null ? List.unmodifiable(children) : const <CreationOutlineItem>[];

  factory CreationOutlineItem.fromJson(Map<String, dynamic> json) {
    final children = <CreationOutlineItem>[];
    if (json['children'] is List) {
      for (final item in json['children'] as List) {
        if (item is Map) {
          children.add(CreationOutlineItem.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }
    return CreationOutlineItem(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      label: json['label']?.toString() ?? 'Outline item',
      description: json['description']?.toString(),
      durationMinutes: json['durationMinutes'] is num
          ? (json['durationMinutes'] as num).toInt()
          : null,
      children: children,
    );
  }

  final String id;
  final String label;
  final String? description;
  final int? durationMinutes;
  final List<CreationOutlineItem> children;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      if (description != null) 'description': description,
      if (durationMinutes != null) 'durationMinutes': durationMinutes,
      if (children.isNotEmpty) 'children': children.map((child) => child.toJson()).toList(),
    };
  }
}

class CreationCollaborator {
  CreationCollaborator({
    required this.userId,
    required this.role,
    required this.permissions,
    this.addedAt,
  });

  factory CreationCollaborator.fromJson(Map<String, dynamic> json) {
    return CreationCollaborator(
      userId: json['userId'] is num ? (json['userId'] as num).toInt() : 0,
      role: json['role']?.toString() ?? 'editor',
      permissions: json['permissions'] is List
          ? (json['permissions'] as List).map((entry) => entry.toString()).toList()
          : const <String>[],
      addedAt: _parseDate(json['addedAt']),
    );
  }

  final int userId;
  final String role;
  final List<String> permissions;
  final DateTime? addedAt;

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'role': role,
      'permissions': permissions,
      if (addedAt != null) 'addedAt': addedAt!.toIso8601String(),
    };
  }
}

class ComplianceNote {
  ComplianceNote({
    required this.type,
    required this.message,
  });

  factory ComplianceNote.fromJson(Map<String, dynamic> json) {
    return ComplianceNote(
      type: json['type']?.toString() ?? 'policy',
      message: json['message']?.toString() ?? '',
    );
  }

  final String type;
  final String message;

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'message': message,
    };
  }
}

class CreationProjectVersion {
  CreationProjectVersion({
    required this.versionNumber,
    required this.snapshot,
    required this.changeSummary,
    this.createdAt,
  });

  factory CreationProjectVersion.fromJson(Map<String, dynamic> json) {
    return CreationProjectVersion(
      versionNumber: json['versionNumber'] is num ? (json['versionNumber'] as num).toInt() : 1,
      snapshot: json['snapshot'] is Map ? Map<String, dynamic>.from(json['snapshot'] as Map) : const <String, dynamic>{},
      changeSummary:
          json['changeSummary'] is Map ? Map<String, dynamic>.from(json['changeSummary'] as Map) : const <String, dynamic>{},
      createdAt: _parseDate(json['createdAt']),
    );
  }

  final int versionNumber;
  final Map<String, dynamic> snapshot;
  final Map<String, dynamic> changeSummary;
  final DateTime? createdAt;

  Map<String, dynamic> toJson() {
    return {
      'versionNumber': versionNumber,
      'snapshot': _deepCopyMap(snapshot),
      'changeSummary': _deepCopyMap(changeSummary),
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
    };
  }
}

class CreationCollaborationSession {
  CreationCollaborationSession({
    required this.publicId,
    required this.participantId,
    required this.role,
    required this.capabilities,
    this.joinedAt,
    this.lastHeartbeatAt,
  });

  factory CreationCollaborationSession.fromJson(Map<String, dynamic> json) {
    return CreationCollaborationSession(
      publicId: json['publicId']?.toString() ?? '',
      participantId: json['participantId'] is num ? (json['participantId'] as num).toInt() : 0,
      role: json['role']?.toString() ?? 'editor',
      capabilities: json['capabilities'] is List
          ? (json['capabilities'] as List).map((entry) => entry.toString()).toList()
          : const <String>[],
      joinedAt: _parseDate(json['joinedAt']),
      lastHeartbeatAt: _parseDate(json['lastHeartbeatAt']),
    );
  }

  final String publicId;
  final int participantId;
  final String role;
  final List<String> capabilities;
  final DateTime? joinedAt;
  final DateTime? lastHeartbeatAt;

  Map<String, dynamic> toJson() {
    return {
      'publicId': publicId,
      'participantId': participantId,
      'role': role,
      'capabilities': capabilities,
      if (joinedAt != null) 'joinedAt': joinedAt!.toIso8601String(),
      if (lastHeartbeatAt != null) 'lastHeartbeatAt': lastHeartbeatAt!.toIso8601String(),
    };
  }
}

class PendingCreationAction {
  PendingCreationAction({
    required this.id,
    required this.projectId,
    required this.type,
    required this.description,
    required this.payload,
    required this.createdAt,
    required this.status,
    this.errorMessage,
  });

  factory PendingCreationAction.fromJson(Map<String, dynamic> json, {String? id}) {
    return PendingCreationAction(
      id: id ?? json['id']?.toString() ?? 'pending',
      projectId: json['projectId']?.toString() ?? '',
      type: PendingCreationActionType.values.firstWhere(
        (value) => value.name == json['type'],
        orElse: () => PendingCreationActionType.updateStatus,
      ),
      description: json['description']?.toString() ?? '',
      payload: json['payload'] is Map ? Map<String, dynamic>.from(json['payload'] as Map) : const <String, dynamic>{},
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
      status: PendingCreationActionStatus.values.firstWhere(
        (value) => value.name == json['status'],
        orElse: () => PendingCreationActionStatus.pending,
      ),
      errorMessage: json['errorMessage']?.toString(),
    );
  }

  PendingCreationAction copyWith({
    PendingCreationActionStatus? status,
    String? errorMessage,
  }) {
    return PendingCreationAction(
      id: id,
      projectId: projectId,
      type: type,
      description: description,
      payload: payload,
      createdAt: createdAt,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  final String id;
  final String projectId;
  final PendingCreationActionType type;
  final String description;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final PendingCreationActionStatus status;
  final String? errorMessage;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'projectId': projectId,
      'type': type.name,
      'description': description,
      'payload': _deepCopyMap(payload),
      'createdAt': createdAt.toIso8601String(),
      'status': status.name,
      if (errorMessage != null) 'errorMessage': errorMessage,
    };
  }
}

enum PendingCreationActionType { updateStatus, updateMetadata, sharePost }

enum PendingCreationActionStatus { pending, failed }

class CommunitySummary {
  CommunitySummary({
    required this.id,
    required this.name,
    required this.description,
    required this.visibility,
    required this.memberCount,
    this.membershipRole,
    this.membershipStatus,
  });

  factory CommunitySummary.fromJson(Map<String, dynamic> json) {
    final stats = json['stats'];
    final membership = json['membership'];
    return CommunitySummary(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Community',
      description: json['description']?.toString() ?? '',
      visibility: json['visibility']?.toString() ?? 'public',
      memberCount: stats is Map && stats['members'] is num ? (stats['members'] as num).toInt() : 0,
      membershipRole: membership is Map ? membership['role']?.toString() : null,
      membershipStatus: membership is Map ? membership['status']?.toString() : null,
    );
  }

  final String id;
  final String name;
  final String description;
  final String visibility;
  final int memberCount;
  final String? membershipRole;
  final String? membershipStatus;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'visibility': visibility,
      'stats': {'members': memberCount},
      if (membershipRole != null || membershipStatus != null)
        'membership': {
          if (membershipRole != null) 'role': membershipRole,
          if (membershipStatus != null) 'status': membershipStatus,
        },
    };
  }
}

Map<String, dynamic> _deepCopyMap(Map source) {
  final copy = <String, dynamic>{};
  source.forEach((key, value) {
    final stringKey = key.toString();
    if (value is Map) {
      copy[stringKey] = _deepCopyMap(value);
    } else if (value is List) {
      copy[stringKey] = value.map((item) {
        if (item is Map) {
          return _deepCopyMap(item);
        }
        return item;
      }).toList();
    } else {
      copy[stringKey] = value;
    }
  });
  return copy;
}

Map<String, dynamic> _immutableMap(Map source) {
  return Map.unmodifiable(_deepCopyMap(source));
}

DateTime? _parseDate(dynamic value) {
  if (value is String) {
    return DateTime.tryParse(value);
  }
  return null;
}
