import 'dart:math';

import 'package:dio/dio.dart';

import 'api_config.dart';
import 'session_manager.dart';

class MobileAdsGovernanceService {
  MobileAdsGovernanceService()
      : _dio = Dio(
          BaseOptions(
            baseUrl: apiBaseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 30),
          ),
        );

  final Dio _dio;
  final Random _random = Random();

  static const _campaignListKey = 'campaigns.list';
  static const _campaignSyncedKey = 'campaigns.syncedAt';

  List<AdsCampaignSummary> loadCachedCampaigns() {
    final cache = SessionManager.adsGovernanceCache.get(_campaignListKey);
    if (cache is List) {
      return cache
          .whereType<Map>()
          .map(
            (entry) => AdsCampaignSummary.fromJson(
              Map<String, dynamic>.from(entry),
              fromCache: true,
            ),
          )
          .map(_mergePendingActions)
          .toList(growable: false);
    }
    return const <AdsCampaignSummary>[];
  }

  DateTime? loadLastSync() {
    final value = SessionManager.adsGovernanceCache.get(_campaignSyncedKey);
    if (value is String) {
      return DateTime.tryParse(value);
    }
    return null;
  }

  AdsCampaignSummary? loadCachedCampaign(String campaignId) {
    final entry = SessionManager.adsGovernanceCache.get(_campaignKey(campaignId));
    if (entry is Map) {
      return _mergePendingActions(
        AdsCampaignSummary.fromJson(
          Map<String, dynamic>.from(entry),
          fromCache: true,
        ),
      );
    }
    return null;
  }

  AdsCampaignInsights? loadCachedInsights(String campaignId) {
    final entry = SessionManager.adsGovernanceCache.get(_insightsKey(campaignId));
    if (entry is Map) {
      return AdsCampaignInsights.fromJson(
        Map<String, dynamic>.from(entry),
        fromCache: true,
      );
    }
    return null;
  }

  Future<List<AdsCampaignSummary>> fetchCampaigns({List<String>? statuses}) async {
    final token = SessionManager.getAccessToken();
    final cached = loadCachedCampaigns();
    if (token == null) {
      return cached;
    }

    try {
      final response = await _dio.get(
        '/ads/campaigns',
        queryParameters: <String, dynamic>{
          'limit': 50,
          if (statuses != null && statuses.isNotEmpty) 'status': statuses.join(','),
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final payload = response.data;
      if (payload is! Map || payload['data'] is! List) {
        throw Exception('Unexpected campaigns response');
      }
      final now = DateTime.now();
      final campaigns = (payload['data'] as List)
          .whereType<Map>()
          .map(
            (entry) => AdsCampaignSummary.fromJson(
              Map<String, dynamic>.from(entry),
              syncedAt: now,
            ),
          )
          .map(_mergePendingActions)
          .toList(growable: false);
      await _cacheCampaigns(campaigns, syncedAt: now);
      return campaigns;
    } on DioException catch (error) {
      if (_isOffline(error)) {
        return cached;
      }
      throw _wrapDioException(error, fallback: 'Unable to load campaigns');
    }
  }

  Future<AdsCampaignSummary> fetchCampaign(String campaignId) async {
    final token = SessionManager.getAccessToken();
    final cached = loadCachedCampaign(campaignId);
    if (token == null) {
      if (cached != null) return cached;
      throw Exception('Authentication required to load campaign');
    }

    try {
      final response = await _dio.get(
        '/ads/campaigns/$campaignId',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final payload = response.data;
      if (payload is! Map || payload['data'] is! Map) {
        throw Exception('Unexpected campaign response');
      }
      final campaign = _mergePendingActions(
        AdsCampaignSummary.fromJson(
          Map<String, dynamic>.from(payload['data'] as Map),
          syncedAt: DateTime.now(),
        ),
      );
      await _cacheCampaign(campaign);
      return campaign;
    } on DioException catch (error) {
      if (_isOffline(error) && cached != null) {
        return cached;
      }
      throw _wrapDioException(error, fallback: 'Unable to load campaign');
    }
  }

  Future<AdsCampaignInsights> fetchInsights(String campaignId, {int windowDays = 14}) async {
    final token = SessionManager.getAccessToken();
    final cached = loadCachedInsights(campaignId);
    if (token == null) {
      if (cached != null) return cached;
      throw Exception('Authentication required to load insights');
    }

    try {
      final response = await _dio.get(
        '/ads/campaigns/$campaignId/insights',
        queryParameters: {'windowDays': windowDays},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final payload = response.data;
      if (payload is! Map || payload['data'] is! Map) {
        throw Exception('Unexpected insights response');
      }
      final insights = AdsCampaignInsights.fromJson(
        Map<String, dynamic>.from(payload['data'] as Map),
        fetchedAt: DateTime.now(),
      );
      await _cacheInsights(campaignId, insights);
      return insights;
    } on DioException catch (error) {
      if (_isOffline(error) && cached != null) {
        return cached;
      }
      throw _wrapDioException(error, fallback: 'Unable to load campaign insights');
    }
  }

  Future<AdsCampaignActionResult> pauseCampaign(String campaignId) async {
    final token = SessionManager.getAccessToken();
    final cached = loadCachedCampaign(campaignId);
    if (token == null) {
      throw Exception('Authentication required to manage campaigns');
    }

    try {
      final response = await _dio.post(
        '/ads/campaigns/$campaignId/pause',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final payload = response.data;
      if (payload is! Map || payload['data'] is! Map) {
        throw Exception('Unexpected pause response');
      }
      final campaign = _mergePendingActions(
        AdsCampaignSummary.fromJson(
          Map<String, dynamic>.from(payload['data'] as Map),
          syncedAt: DateTime.now(),
        ),
      );
      await _cacheCampaign(campaign);
      return AdsCampaignActionResult(campaign: campaign, message: 'Campaign paused');
    } on DioException catch (error) {
      if (!_isOffline(error)) {
        throw _wrapDioException(error, fallback: 'Unable to pause campaign');
      }
      if (cached == null) {
        throw Exception('Campaign unavailable offline');
      }
      final action = await _queueAction(
        campaignId: campaignId,
        type: PendingAdsActionType.pause,
        description: 'Pause campaign',
        payload: const {},
      );
      final optimistic = cached.copyWith(
        status: 'paused',
        pendingActions: [...cached.pendingActions, action],
        updatedAt: DateTime.now(),
      );
      await _cacheCampaign(optimistic);
      return AdsCampaignActionResult(
        campaign: optimistic,
        queued: true,
        message: 'Pause request queued until you reconnect',
      );
    }
  }

  Future<AdsCampaignActionResult> resumeCampaign(String campaignId) async {
    final token = SessionManager.getAccessToken();
    final cached = loadCachedCampaign(campaignId);
    if (token == null) {
      throw Exception('Authentication required to manage campaigns');
    }

    try {
      final response = await _dio.post(
        '/ads/campaigns/$campaignId/resume',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final payload = response.data;
      if (payload is! Map || payload['data'] is! Map) {
        throw Exception('Unexpected resume response');
      }
      final campaign = _mergePendingActions(
        AdsCampaignSummary.fromJson(
          Map<String, dynamic>.from(payload['data'] as Map),
          syncedAt: DateTime.now(),
        ),
      );
      await _cacheCampaign(campaign);
      return AdsCampaignActionResult(campaign: campaign, message: 'Campaign resumed');
    } on DioException catch (error) {
      if (!_isOffline(error)) {
        throw _wrapDioException(error, fallback: 'Unable to resume campaign');
      }
      if (cached == null) {
        throw Exception('Campaign unavailable offline');
      }
      final action = await _queueAction(
        campaignId: campaignId,
        type: PendingAdsActionType.resume,
        description: 'Resume campaign',
        payload: const {},
      );
      final optimistic = cached.copyWith(
        status: 'scheduled',
        pendingActions: [...cached.pendingActions, action],
        updatedAt: DateTime.now(),
      );
      await _cacheCampaign(optimistic);
      return AdsCampaignActionResult(
        campaign: optimistic,
        queued: true,
        message: 'Resume request queued until you reconnect',
      );
    }
  }

  Future<AdsCampaignActionResult> submitFraudReport({
    required AdsCampaignSummary campaign,
    required String reason,
    required int riskScore,
    String? description,
  }) async {
    final token = SessionManager.getAccessToken();
    if (token == null) {
      throw Exception('Authentication required to flag fraud');
    }

    final payload = {
      'entityType': 'project',
      'entityId': campaign.id,
      'reason': reason.trim(),
      'description': description?.trim().isNotEmpty ?? false ? description!.trim() : null,
      'riskScore': riskScore,
      'context': {
        'campaignId': campaign.id,
        'campaignName': campaign.name,
        'status': campaign.status,
        'complianceStatus': campaign.complianceStatus,
        'riskScore': campaign.riskScore,
      },
      'channel': 'mobile_ads_governance',
    }..removeWhere((key, value) => value == null);

    try {
      await _dio.post(
        '/moderation/scam-reports',
        data: payload,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final refreshed = campaign.copyWith(
        lastGovernanceEvent: DateTime.now(),
      );
      await _cacheCampaign(refreshed);
      return AdsCampaignActionResult(
        campaign: refreshed,
        message: 'Fraud report submitted to trust & safety',
      );
    } on DioException catch (error) {
      if (!_isOffline(error)) {
        throw _wrapDioException(error, fallback: 'Unable to submit fraud report');
      }
      final action = await _queueAction(
        campaignId: campaign.id,
        type: PendingAdsActionType.flagFraud,
        description: 'Submit fraud report',
        payload: payload,
      );
      final optimistic = campaign.copyWith(
        pendingActions: [...campaign.pendingActions, action],
        lastGovernanceEvent: DateTime.now(),
      );
      await _cacheCampaign(optimistic);
      return AdsCampaignActionResult(
        campaign: optimistic,
        queued: true,
        message: 'Fraud report queued until you reconnect',
      );
    }
  }

  Future<void> syncPendingActions() async {
    final token = SessionManager.getAccessToken();
    if (token == null) return;

    final queue = SessionManager.adsGovernanceActionQueue;
    final keys = queue.keys.toList(growable: false);
    for (final key in keys) {
      final raw = queue.get(key);
      if (raw is! Map) {
        await queue.delete(key);
        continue;
      }
      final action = PendingAdsAction.fromJson(
        Map<String, dynamic>.from(raw),
        id: key.toString(),
      );
      try {
        switch (action.type) {
          case PendingAdsActionType.pause:
            await _replayPause(action, token);
            break;
          case PendingAdsActionType.resume:
            await _replayResume(action, token);
            break;
          case PendingAdsActionType.flagFraud:
            await _replayFraudReport(action, token);
            break;
        }
        await queue.delete(key);
        await _clearPendingAction(action);
      } on DioException catch (error) {
        if (_isOffline(error)) {
          return;
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
        if (statusCode == 404) {
          await _markActionFailed(
            action,
            'Campaign no longer exists on the server. Refresh to verify.',
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

  Future<void> _replayPause(PendingAdsAction action, String token) async {
    await _dio.post(
      '/ads/campaigns/${action.campaignId}/pause',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final campaign = await fetchCampaign(action.campaignId);
    await _clearPendingActionFromCache(action, campaign);
  }

  Future<void> _replayResume(PendingAdsAction action, String token) async {
    await _dio.post(
      '/ads/campaigns/${action.campaignId}/resume',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final campaign = await fetchCampaign(action.campaignId);
    await _clearPendingActionFromCache(action, campaign);
  }

  Future<void> _replayFraudReport(PendingAdsAction action, String token) async {
    final payload = action.payload;
    if (payload is! Map) {
      throw Exception('Invalid fraud report payload');
    }
    await _dio.post(
      '/moderation/scam-reports',
      data: payload,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final campaign = loadCachedCampaign(action.campaignId) ?? await fetchCampaign(action.campaignId);
    final refreshed = campaign.copyWith(lastGovernanceEvent: DateTime.now());
    await _cacheCampaign(refreshed);
    await _clearPendingActionFromCache(action, refreshed);
  }

  Future<void> _cacheCampaigns(List<AdsCampaignSummary> campaigns, {DateTime? syncedAt}) async {
    final box = SessionManager.adsGovernanceCache;
    await box.put(
      _campaignListKey,
      campaigns.map((campaign) => campaign.toJson()).toList(),
    );
    if (syncedAt != null) {
      await box.put(_campaignSyncedKey, syncedAt.toIso8601String());
    }
    for (final campaign in campaigns) {
      await box.put(_campaignKey(campaign.id), campaign.toJson());
    }
  }

  Future<void> _cacheCampaign(AdsCampaignSummary campaign) async {
    final box = SessionManager.adsGovernanceCache;
    final campaigns = loadCachedCampaigns();
    final next = [...campaigns];
    final index = next.indexWhere((entry) => entry.id == campaign.id);
    if (index >= 0) {
      next[index] = campaign;
    } else {
      next.add(campaign);
    }
    await box.put(
      _campaignListKey,
      next.map((entry) => entry.toJson()).toList(),
    );
    await box.put(_campaignKey(campaign.id), campaign.toJson());
    if (campaign.syncedAt != null) {
      await box.put(_campaignSyncedKey, campaign.syncedAt!.toIso8601String());
    }
  }

  Future<void> _cacheInsights(String campaignId, AdsCampaignInsights insights) async {
    await SessionManager.adsGovernanceCache.put(
      _insightsKey(campaignId),
      insights.toJson(),
    );
  }

  Future<PendingAdsAction> _queueAction({
    required String campaignId,
    required PendingAdsActionType type,
    required String description,
    required Map<String, dynamic> payload,
  }) async {
    final id = '${DateTime.now().millisecondsSinceEpoch}-${_random.nextInt(1 << 32)}';
    final action = PendingAdsAction(
      id: id,
      campaignId: campaignId,
      type: type,
      description: description,
      payload: payload,
      createdAt: DateTime.now(),
      status: PendingAdsActionStatus.pending,
    );
    await SessionManager.adsGovernanceActionQueue.put(id, action.toJson());
    return action;
  }

  Future<void> _markActionFailed(PendingAdsAction action, String? message) async {
    final cached = loadCachedCampaign(action.campaignId);
    if (cached == null) return;
    final updated = cached.copyWith(
      pendingActions: cached.pendingActions
          .map((pending) => pending.id == action.id
              ? pending.copyWith(
                  status: PendingAdsActionStatus.failed,
                  errorMessage: message,
                )
              : pending)
          .toList(),
    );
    await _cacheCampaign(updated);
  }

  Future<void> _markActionDeferred(PendingAdsAction action, String message) async {
    final cached = loadCachedCampaign(action.campaignId);
    if (cached == null) return;
    final updated = cached.copyWith(
      pendingActions: cached.pendingActions
          .map((pending) => pending.id == action.id
              ? pending.copyWith(errorMessage: message)
              : pending)
          .toList(),
    );
    await _cacheCampaign(updated);
  }

  Future<void> _clearPendingAction(PendingAdsAction action) async {
    final cached = loadCachedCampaign(action.campaignId);
    if (cached == null) return;
    final filtered = cached.copyWith(
      pendingActions: cached.pendingActions
          .where((pending) => pending.id != action.id)
          .toList(),
    );
    await _cacheCampaign(filtered);
  }

  Future<void> _clearPendingActionFromCache(
    PendingAdsAction action,
    AdsCampaignSummary campaign,
  ) async {
    final filtered = campaign.copyWith(
      pendingActions: campaign.pendingActions
          .where((pending) => pending.id != action.id)
          .toList(),
    );
    await _cacheCampaign(filtered);
  }

  AdsCampaignSummary _mergePendingActions(AdsCampaignSummary campaign) {
    final queueActions = _loadQueuedActionsForCampaign(campaign.id);
    if (queueActions.isEmpty) {
      return campaign;
    }
    final merged = <PendingAdsAction>[...campaign.pendingActions];
    for (final action in queueActions) {
      if (!merged.any((pending) => pending.id == action.id)) {
        merged.add(action);
      }
    }
    return campaign.copyWith(pendingActions: merged);
  }

  List<PendingAdsAction> _loadQueuedActionsForCampaign(String campaignId) {
    final queue = SessionManager.adsGovernanceActionQueue;
    final actions = <PendingAdsAction>[];
    for (final key in queue.keys) {
      final raw = queue.get(key);
      if (raw is! Map) continue;
      try {
        final action = PendingAdsAction.fromJson(
          Map<String, dynamic>.from(raw),
          id: key.toString(),
        );
        if (action.campaignId == campaignId) {
          actions.add(action);
        }
      } catch (_) {
        continue;
      }
    }
    return actions;
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

  static String _campaignKey(String id) => 'campaign:$id';

  static String _insightsKey(String id) => 'campaign:$id:insights';
}

class AdsCampaignActionResult {
  AdsCampaignActionResult({
    required this.campaign,
    this.queued = false,
    this.message,
  });

  final AdsCampaignSummary campaign;
  final bool queued;
  final String? message;
}

class AdsCampaignSummary {
  AdsCampaignSummary({
    required this.id,
    required this.name,
    required this.objective,
    required this.status,
    required this.performanceScore,
    required this.budget,
    required this.spend,
    required this.metrics,
    required this.targeting,
    required this.complianceStatus,
    required this.riskScore,
    required this.complianceViolations,
    required this.pendingActions,
    this.syncedAt,
    this.createdAt,
    this.updatedAt,
    this.schedule,
    this.lastGovernanceEvent,
    this.isFromCache = false,
  });

  factory AdsCampaignSummary.fromJson(
    Map<String, dynamic> json, {
    DateTime? syncedAt,
    bool fromCache = false,
  }) {
    final metrics = json['metrics'] is Map ? Map<String, dynamic>.from(json['metrics'] as Map) : <String, dynamic>{};
    final compliance = json['compliance'] is Map ? Map<String, dynamic>.from(json['compliance'] as Map) : <String, dynamic>{};
    final pending = json['pendingActions'] is List ? json['pendingActions'] as List : const [];
    return AdsCampaignSummary(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Campaign',
      objective: json['objective']?.toString() ?? 'awareness',
      status: json['status']?.toString() ?? 'draft',
      performanceScore: _toDouble(json['performanceScore']),
      budget: AdsBudget.fromJson(json['budget'] as Map? ?? const {}),
      spend: AdsSpend.fromJson(json['spend'] as Map? ?? const {}),
      metrics: AdsMetricsBlock.fromJson(metrics),
      targeting: AdsTargeting.fromJson(json['targeting'] as Map? ?? const {}),
      complianceStatus: compliance['status']?.toString() ?? 'pass',
      riskScore: _toInt(compliance['riskScore']),
      complianceViolations: (compliance['violations'] as List? ?? const [])
          .whereType<Map>()
          .map((entry) => AdsComplianceViolation.fromJson(Map<String, dynamic>.from(entry)))
          .toList(growable: false),
      pendingActions: pending
          .whereType<Map>()
          .map(
            (entry) => PendingAdsAction.fromJson(
              Map<String, dynamic>.from(entry),
            ),
          )
          .toList(growable: false),
      syncedAt: syncedAt ?? _parseDate(json['syncedAt']),
      createdAt: _parseDate(json['createdAt']),
      updatedAt: _parseDate(json['updatedAt']),
      schedule: AdsSchedule.fromJson(json['schedule'] as Map? ?? const {}),
      lastGovernanceEvent: _parseDate(json['lastGovernanceEvent']),
      isFromCache: fromCache,
    );
  }

  AdsCampaignSummary copyWith({
    String? status,
    double? performanceScore,
    AdsMetricsBlock? metrics,
    List<PendingAdsAction>? pendingActions,
    DateTime? updatedAt,
    DateTime? syncedAt,
    DateTime? lastGovernanceEvent,
  }) {
    return AdsCampaignSummary(
      id: id,
      name: name,
      objective: objective,
      status: status ?? this.status,
      performanceScore: performanceScore ?? this.performanceScore,
      budget: budget,
      spend: spend,
      metrics: metrics ?? this.metrics,
      targeting: targeting,
      complianceStatus: complianceStatus,
      riskScore: riskScore,
      complianceViolations: complianceViolations,
      pendingActions: pendingActions ?? this.pendingActions,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      schedule: schedule,
      syncedAt: syncedAt ?? this.syncedAt,
      lastGovernanceEvent: lastGovernanceEvent ?? this.lastGovernanceEvent,
      isFromCache: isFromCache,
    );
  }

  final String id;
  final String name;
  final String objective;
  final String status;
  final double performanceScore;
  final AdsBudget budget;
  final AdsSpend spend;
  final AdsMetricsBlock metrics;
  final AdsTargeting targeting;
  final String complianceStatus;
  final int riskScore;
  final List<AdsComplianceViolation> complianceViolations;
  final List<PendingAdsAction> pendingActions;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? syncedAt;
  final AdsSchedule? schedule;
  final DateTime? lastGovernanceEvent;
  final bool isFromCache;

  bool get requiresAttention =>
      complianceStatus != 'pass' || riskScore >= 70 || pendingActions.any((action) => action.status != PendingAdsActionStatus.pending);

  bool get isActive => status == 'active';

  bool get isPaused => status == 'paused';

  bool get isCompletable => status == 'completed' || status == 'archived';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'objective': objective,
      'status': status,
      'performanceScore': performanceScore,
      'budget': budget.toJson(),
      'spend': spend.toJson(),
      'metrics': metrics.toJson(),
      'targeting': targeting.toJson(),
      'compliance': {
        'status': complianceStatus,
        'riskScore': riskScore,
        'violations': complianceViolations.map((violation) => violation.toJson()).toList(),
      },
      'pendingActions': pendingActions.map((action) => action.toJson()).toList(),
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
      if (syncedAt != null) 'syncedAt': syncedAt!.toIso8601String(),
      if (schedule != null) 'schedule': schedule!.toJson(),
      if (lastGovernanceEvent != null) 'lastGovernanceEvent': lastGovernanceEvent!.toIso8601String(),
    };
  }
}

class AdsBudget {
  AdsBudget({required this.currency, required this.dailyCents});

  factory AdsBudget.fromJson(Map<String, dynamic> json) {
    return AdsBudget(
      currency: json['currency']?.toString() ?? 'USD',
      dailyCents: _toInt(json['dailyCents']),
    );
  }

  final String currency;
  final int dailyCents;

  Map<String, dynamic> toJson() => {'currency': currency, 'dailyCents': dailyCents};
}

class AdsSpend {
  AdsSpend({required this.currency, required this.totalCents});

  factory AdsSpend.fromJson(Map<String, dynamic> json) {
    return AdsSpend(
      currency: json['currency']?.toString() ?? 'USD',
      totalCents: _toInt(json['totalCents']),
    );
  }

  final String currency;
  final int totalCents;

  Map<String, dynamic> toJson() => {'currency': currency, 'totalCents': totalCents};
}

class AdsMetricsBlock {
  AdsMetricsBlock({required this.lifetime, required this.trailing, required this.forecast});

  factory AdsMetricsBlock.fromJson(Map<String, dynamic> json) {
    return AdsMetricsBlock(
      lifetime: AdsMetricSnapshot.fromJson(json['lifetime'] as Map? ?? const {}),
      trailing: AdsMetricSnapshot.fromJson(json['trailing7Days'] as Map? ?? const {}),
      forecast: AdsForecastSnapshot.fromJson(json['forecast'] as Map? ?? const {}),
    );
  }

  final AdsMetricSnapshot lifetime;
  final AdsMetricSnapshot trailing;
  final AdsForecastSnapshot forecast;

  Map<String, dynamic> toJson() => {
        'lifetime': lifetime.toJson(),
        'trailing7Days': trailing.toJson(),
        'forecast': forecast.toJson(),
      };
}

class AdsMetricSnapshot {
  AdsMetricSnapshot({
    required this.impressions,
    required this.clicks,
    required this.conversions,
    required this.spendCents,
    required this.revenueCents,
    required this.ctr,
    required this.conversionRate,
    required this.cpcCents,
    required this.cpaCents,
  });

  factory AdsMetricSnapshot.fromJson(Map<String, dynamic> json) {
    return AdsMetricSnapshot(
      impressions: _toInt(json['impressions']),
      clicks: _toInt(json['clicks']),
      conversions: _toInt(json['conversions']),
      spendCents: _toInt(json['spendCents']),
      revenueCents: _toInt(json['revenueCents']),
      ctr: _toDouble(json['ctr']),
      conversionRate: _toDouble(json['conversionRate']),
      cpcCents: _toDouble(json['cpcCents']),
      cpaCents: _toDouble(json['cpaCents']),
    );
  }

  final int impressions;
  final int clicks;
  final int conversions;
  final int spendCents;
  final int revenueCents;
  final double ctr;
  final double conversionRate;
  final double cpcCents;
  final double cpaCents;

  Map<String, dynamic> toJson() => {
        'impressions': impressions,
        'clicks': clicks,
        'conversions': conversions,
        'spendCents': spendCents,
        'revenueCents': revenueCents,
        'ctr': ctr,
        'conversionRate': conversionRate,
        'cpcCents': cpcCents,
        'cpaCents': cpaCents,
      };
}

class AdsForecastSnapshot {
  AdsForecastSnapshot({
    required this.expectedDailySpendCents,
    required this.expectedDailyConversions,
    this.projectedRoas,
  });

  factory AdsForecastSnapshot.fromJson(Map<String, dynamic> json) {
    return AdsForecastSnapshot(
      expectedDailySpendCents: _toInt(json['expectedDailySpendCents']),
      expectedDailyConversions: _toDouble(json['expectedDailyConversions']),
      projectedRoas: json['projectedRoas'] is num ? (json['projectedRoas'] as num).toDouble() : null,
    );
  }

  final int expectedDailySpendCents;
  final double expectedDailyConversions;
  final double? projectedRoas;

  Map<String, dynamic> toJson() => {
        'expectedDailySpendCents': expectedDailySpendCents,
        'expectedDailyConversions': expectedDailyConversions,
        if (projectedRoas != null) 'projectedRoas': projectedRoas,
      };
}

class AdsTargeting {
  AdsTargeting({
    required this.keywords,
    required this.audiences,
    required this.locations,
    required this.languages,
  });

  factory AdsTargeting.fromJson(Map<String, dynamic> json) {
    List<String> _normalise(dynamic value) {
      if (value is List) {
        return value.whereType<String>().toList(growable: false);
      }
      return const <String>[];
    }

    return AdsTargeting(
      keywords: _normalise(json['keywords']),
      audiences: _normalise(json['audiences']),
      locations: _normalise(json['locations']),
      languages: _normalise(json['languages']),
    );
  }

  final List<String> keywords;
  final List<String> audiences;
  final List<String> locations;
  final List<String> languages;

  Map<String, dynamic> toJson() => {
        'keywords': keywords,
        'audiences': audiences,
        'locations': locations,
        'languages': languages,
      };
}

class AdsComplianceViolation {
  AdsComplianceViolation({
    required this.code,
    required this.severity,
    required this.message,
  });

  factory AdsComplianceViolation.fromJson(Map<String, dynamic> json) {
    return AdsComplianceViolation(
      code: json['code']?.toString() ?? 'violation',
      severity: json['severity']?.toString() ?? 'warning',
      message: json['message']?.toString() ?? 'Compliance warning',
    );
  }

  final String code;
  final String severity;
  final String message;

  Map<String, dynamic> toJson() => {'code': code, 'severity': severity, 'message': message};
}

class AdsSchedule {
  AdsSchedule({this.startAt, this.endAt});

  factory AdsSchedule.fromJson(Map<String, dynamic> json) {
    return AdsSchedule(
      startAt: _parseDate(json['startAt']),
      endAt: _parseDate(json['endAt']),
    );
  }

  final DateTime? startAt;
  final DateTime? endAt;

  Map<String, dynamic> toJson() => {
        if (startAt != null) 'startAt': startAt!.toIso8601String(),
        if (endAt != null) 'endAt': endAt!.toIso8601String(),
      };
}

class AdsCampaignInsights {
  AdsCampaignInsights({
    required this.summary,
    required this.daily,
    required this.fetchedAt,
    this.isFromCache = false,
  });

  factory AdsCampaignInsights.fromJson(
    Map<String, dynamic> json, {
    DateTime? fetchedAt,
    bool fromCache = false,
  }) {
    final daily = json['daily'] is List ? json['daily'] as List : const [];
    return AdsCampaignInsights(
      summary: AdsMetricSnapshot.fromJson(json['summary'] as Map? ?? const {}),
      daily: daily
          .whereType<Map>()
          .map((entry) => AdsInsightDailyMetric.fromJson(Map<String, dynamic>.from(entry)))
          .toList(growable: false),
      fetchedAt: fetchedAt ?? _parseDate(json['fetchedAt']) ?? DateTime.now(),
      isFromCache: fromCache,
    );
  }

  final AdsMetricSnapshot summary;
  final List<AdsInsightDailyMetric> daily;
  final DateTime fetchedAt;
  final bool isFromCache;

  Map<String, dynamic> toJson() => {
        'summary': summary.toJson(),
        'daily': daily.map((entry) => entry.toJson()).toList(),
        'fetchedAt': fetchedAt.toIso8601String(),
      };
}

class AdsInsightDailyMetric {
  AdsInsightDailyMetric({
    required this.date,
    required this.impressions,
    required this.clicks,
    required this.conversions,
    required this.spendCents,
    required this.revenueCents,
    required this.ctr,
    required this.conversionRate,
    required this.cpcCents,
    required this.cpaCents,
  });

  factory AdsInsightDailyMetric.fromJson(Map<String, dynamic> json) {
    return AdsInsightDailyMetric(
      date: _parseDate(json['date']) ?? DateTime.now(),
      impressions: _toInt(json['impressions']),
      clicks: _toInt(json['clicks']),
      conversions: _toInt(json['conversions']),
      spendCents: _toInt(json['spendCents']),
      revenueCents: _toInt(json['revenueCents']),
      ctr: _toDouble(json['ctr']),
      conversionRate: _toDouble(json['conversionRate']),
      cpcCents: _toDouble(json['cpcCents']),
      cpaCents: _toDouble(json['cpaCents']),
    );
  }

  final DateTime date;
  final int impressions;
  final int clicks;
  final int conversions;
  final int spendCents;
  final int revenueCents;
  final double ctr;
  final double conversionRate;
  final double cpcCents;
  final double cpaCents;

  Map<String, dynamic> toJson() => {
        'date': date.toIso8601String(),
        'impressions': impressions,
        'clicks': clicks,
        'conversions': conversions,
        'spendCents': spendCents,
        'revenueCents': revenueCents,
        'ctr': ctr,
        'conversionRate': conversionRate,
        'cpcCents': cpcCents,
        'cpaCents': cpaCents,
      };
}

class PendingAdsAction {
  PendingAdsAction({
    required this.id,
    required this.campaignId,
    required this.type,
    required this.description,
    required this.payload,
    required this.createdAt,
    required this.status,
    this.errorMessage,
  });

  factory PendingAdsAction.fromJson(Map<String, dynamic> json, {String? id}) {
    return PendingAdsAction(
      id: id ?? json['id']?.toString() ?? 'pending',
      campaignId: json['campaignId']?.toString() ?? '',
      type: PendingAdsActionType.values.firstWhere(
        (value) => value.name == json['type'],
        orElse: () => PendingAdsActionType.pause,
      ),
      description: json['description']?.toString() ?? '',
      payload: json['payload'] is Map ? Map<String, dynamic>.from(json['payload'] as Map) : const <String, dynamic>{},
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
      status: PendingAdsActionStatus.values.firstWhere(
        (value) => value.name == json['status'],
        orElse: () => PendingAdsActionStatus.pending,
      ),
      errorMessage: json['errorMessage']?.toString(),
    );
  }

  PendingAdsAction copyWith({
    PendingAdsActionStatus? status,
    String? errorMessage,
  }) {
    return PendingAdsAction(
      id: id,
      campaignId: campaignId,
      type: type,
      description: description,
      payload: payload,
      createdAt: createdAt,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  final String id;
  final String campaignId;
  final PendingAdsActionType type;
  final String description;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final PendingAdsActionStatus status;
  final String? errorMessage;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'campaignId': campaignId,
      'type': type.name,
      'description': description,
      'payload': Map<String, dynamic>.from(payload),
      'createdAt': createdAt.toIso8601String(),
      'status': status.name,
      if (errorMessage != null) 'errorMessage': errorMessage,
    };
  }
}

enum PendingAdsActionType { pause, resume, flagFraud }

enum PendingAdsActionStatus { pending, failed }

DateTime? _parseDate(dynamic value) {
  if (value is DateTime) return value;
  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value);
  }
  return null;
}

int _toInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) {
    return int.tryParse(value) ?? 0;
  }
  return 0;
}

double _toDouble(dynamic value) {
  if (value is double) return value;
  if (value is num) return value.toDouble();
  if (value is String) {
    return double.tryParse(value) ?? 0;
  }
  return 0;
}
