import 'dart:async';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'api_config.dart';
import 'session_manager.dart';

const _kPreferencesCacheKey = 'preferences';
const _kDeviceRegistrationKey = 'device.registration';

class NotificationPreferenceException implements Exception {
  NotificationPreferenceException(this.message);

  final String message;

  @override
  String toString() => 'NotificationPreferenceException: $message';
}

class NotificationPreferences {
  const NotificationPreferences({
    required this.emailEnabled,
    required this.pushEnabled,
    required this.smsEnabled,
    required this.slackEnabled,
    required this.categoryOverrides,
    required this.updatedAt,
    this.slackChannel,
    this.slackWorkspace,
    this.lastSyncedAt,
    this.syncPending = false,
  });

  factory NotificationPreferences.initial() {
    final now = DateTime.now();
    return NotificationPreferences(
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      slackEnabled: false,
      categoryOverrides: const <String, bool>{},
      updatedAt: now,
      lastSyncedAt: null,
      slackChannel: null,
      slackWorkspace: null,
      syncPending: false,
    );
  }

  factory NotificationPreferences.fromCache(Map<String, dynamic> json) {
    return NotificationPreferences(
      emailEnabled: json['emailEnabled'] == true,
      pushEnabled: json['pushEnabled'] != false,
      smsEnabled: json['smsEnabled'] == true,
      slackEnabled: json['slackEnabled'] == true,
      slackChannel: json['slackChannel'] as String?,
      slackWorkspace: json['slackWorkspace'] as String?,
      updatedAt: json['updatedAt'] is String
          ? DateTime.tryParse(json['updatedAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      lastSyncedAt: json['lastSyncedAt'] is String
          ? DateTime.tryParse(json['lastSyncedAt'] as String)
          : null,
      categoryOverrides: json['categoryOverrides'] is Map
          ? Map<String, bool>.fromEntries(
              (json['categoryOverrides'] as Map).entries.map(
                (entry) => MapEntry(entry.key.toString(), entry.value == true),
              ),
            )
          : const <String, bool>{},
      syncPending: json['syncPending'] == true,
    );
  }

  factory NotificationPreferences.fromApi(Map<String, dynamic> json) {
    final channels = json['channels'] is Map
        ? Map<String, dynamic>.from(json['channels'] as Map)
        : const <String, dynamic>{};
    final categories = json['categories'] is Map
        ? Map<String, dynamic>.from(json['categories'] as Map)
        : const <String, dynamic>{};

    bool readChannelEnabled(String key, {bool fallback = false}) {
      final channel = channels[key];
      if (channel is Map) {
        final enabled = channel['enabled'];
        if (enabled is bool) {
          return enabled;
        }
      } else if (channel is bool) {
        return channel;
      }
      return fallback;
    }

    String? readChannelString(String key, String field) {
      final channel = channels[key];
      if (channel is Map && channel[field] is String) {
        final value = channel[field].toString().trim();
        return value.isNotEmpty ? value : null;
      }
      return null;
    }

    final overrides = <String, bool>{};
    categories.forEach((categoryKey, value) {
      if (value is Map) {
        for (final entry in value.entries) {
          final channelKey = entry.key.toString();
          final boolValue = entry.value == true;
          overrides['$channelKey:$categoryKey'] = boolValue;
        }
      } else if (value is bool) {
        overrides['category:$categoryKey'] = value;
      }
    });

    final updatedAtRaw = json['updatedAt'];
    final lastSyncedRaw = json['lastSyncedAt'];

    return NotificationPreferences(
      emailEnabled: readChannelEnabled('email', fallback: true),
      pushEnabled: readChannelEnabled('push', fallback: true),
      smsEnabled: readChannelEnabled('sms'),
      slackEnabled: readChannelEnabled('slack'),
      slackChannel: readChannelString('slack', 'channel'),
      slackWorkspace: readChannelString('slack', 'workspace'),
      updatedAt: updatedAtRaw is String
          ? DateTime.tryParse(updatedAtRaw) ?? DateTime.now()
          : DateTime.now(),
      lastSyncedAt:
          lastSyncedRaw is String ? DateTime.tryParse(lastSyncedRaw) : null,
      categoryOverrides: overrides,
      syncPending: json['syncPending'] == true,
    );
  }

  final bool emailEnabled;
  final bool pushEnabled;
  final bool smsEnabled;
  final bool slackEnabled;
  final String? slackChannel;
  final String? slackWorkspace;
  final Map<String, bool> categoryOverrides;
  final DateTime updatedAt;
  final DateTime? lastSyncedAt;
  final bool syncPending;

  NotificationPreferences copyWith({
    bool? emailEnabled,
    bool? pushEnabled,
    bool? smsEnabled,
    bool? slackEnabled,
    String? slackChannel,
    String? slackWorkspace,
    Map<String, bool>? categoryOverrides,
    DateTime? updatedAt,
    DateTime? lastSyncedAt,
    bool? syncPending,
  }) {
    return NotificationPreferences(
      emailEnabled: emailEnabled ?? this.emailEnabled,
      pushEnabled: pushEnabled ?? this.pushEnabled,
      smsEnabled: smsEnabled ?? this.smsEnabled,
      slackEnabled: slackEnabled ?? this.slackEnabled,
      slackChannel: slackChannel ?? this.slackChannel,
      slackWorkspace: slackWorkspace ?? this.slackWorkspace,
      categoryOverrides: categoryOverrides ?? this.categoryOverrides,
      updatedAt: updatedAt ?? this.updatedAt,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      syncPending: syncPending ?? this.syncPending,
    );
  }

  Map<String, dynamic> toCacheJson() {
    return {
      'emailEnabled': emailEnabled,
      'pushEnabled': pushEnabled,
      'smsEnabled': smsEnabled,
      'slackEnabled': slackEnabled,
      'slackChannel': slackChannel,
      'slackWorkspace': slackWorkspace,
      'categoryOverrides': categoryOverrides,
      'updatedAt': updatedAt.toIso8601String(),
      if (lastSyncedAt != null) 'lastSyncedAt': lastSyncedAt!.toIso8601String(),
      'syncPending': syncPending,
    };
  }

  Map<String, dynamic> toApiPayload() {
    final categoriesPayload = <String, Map<String, bool>>{};
    for (final entry in categoryOverrides.entries) {
      if (!entry.key.contains(':')) {
        categoriesPayload[entry.key] = {
          ...?categoriesPayload[entry.key],
          'all': entry.value,
        };
        continue;
      }
      final parts = entry.key.split(':');
      if (parts.length != 2) {
        continue;
      }
      final channel = parts[0];
      final category = parts[1];
      final existing = categoriesPayload[category] ?? <String, bool>{};
      existing[channel] = entry.value;
      categoriesPayload[category] = existing;
    }

    return {
      'channels': {
        'email': {'enabled': emailEnabled},
        'push': {'enabled': pushEnabled},
        'sms': {'enabled': smsEnabled},
        'slack': {
          'enabled': slackEnabled,
          if (slackChannel != null) 'channel': slackChannel,
          if (slackWorkspace != null) 'workspace': slackWorkspace,
        },
      },
      'categories': categoriesPayload,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  bool allowsChannel(String channel, {String? category}) {
    bool channelEnabled;
    switch (channel) {
      case 'email':
        channelEnabled = emailEnabled;
        break;
      case 'push':
        channelEnabled = pushEnabled;
        break;
      case 'sms':
        channelEnabled = smsEnabled;
        break;
      case 'slack':
        channelEnabled = slackEnabled;
        break;
      default:
        channelEnabled = true;
    }

    if (!channelEnabled) {
      return false;
    }

    if (category == null || category.isEmpty) {
      return true;
    }

    final override = categoryOverrides['$channel:$category'] ??
        categoryOverrides['category:$category'];
    return override ?? true;
  }
}

enum PendingNotificationActionType {
  updatePreferences,
  registerDevice,
  slackEvent,
}

class PendingNotificationAction {
  PendingNotificationAction({
    required this.id,
    required this.type,
    required this.payload,
    required this.createdAt,
    this.attempts = 0,
    this.lastAttemptAt,
  });

  factory PendingNotificationAction.fromJson(
    Map<String, dynamic> json, {
    required String id,
  }) {
    final type = _parseType(json['type']);
    return PendingNotificationAction(
      id: id,
      type: type,
      payload: json['payload'] is Map
          ? Map<String, dynamic>.from(json['payload'] as Map)
          : const <String, dynamic>{},
      createdAt: json['createdAt'] is String
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      attempts: json['attempts'] is int
          ? json['attempts'] as int
          : int.tryParse(json['attempts']?.toString() ?? '') ?? 0,
      lastAttemptAt: json['lastAttemptAt'] is String
          ? DateTime.tryParse(json['lastAttemptAt'] as String)
          : null,
    );
  }

  final String id;
  final PendingNotificationActionType type;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final int attempts;
  final DateTime? lastAttemptAt;

  PendingNotificationAction copyWith({
    int? attempts,
    DateTime? lastAttemptAt,
  }) {
    return PendingNotificationAction(
      id: id,
      type: type,
      payload: payload,
      createdAt: createdAt,
      attempts: attempts ?? this.attempts,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': _stringifyType(type),
      'payload': payload,
      'createdAt': createdAt.toIso8601String(),
      'attempts': attempts,
      if (lastAttemptAt != null) 'lastAttemptAt': lastAttemptAt!.toIso8601String(),
    };
  }

  static PendingNotificationActionType _parseType(dynamic raw) {
    switch (raw) {
      case 'register-device':
        return PendingNotificationActionType.registerDevice;
      case 'slack-event':
        return PendingNotificationActionType.slackEvent;
      case 'update-preferences':
      default:
        return PendingNotificationActionType.updatePreferences;
    }
  }

  static String _stringifyType(PendingNotificationActionType type) {
    switch (type) {
      case PendingNotificationActionType.registerDevice:
        return 'register-device';
      case PendingNotificationActionType.slackEvent:
        return 'slack-event';
      case PendingNotificationActionType.updatePreferences:
        return 'update-preferences';
    }
  }
}

class PreferenceUpdateResult {
  const PreferenceUpdateResult({
    required this.preferences,
    required this.queued,
    this.message,
  });

  final NotificationPreferences preferences;
  final bool queued;
  final String? message;
}

class NotificationPreferenceService {
  NotificationPreferenceService._()
      : _dio = Dio(
          BaseOptions(
            baseUrl: apiBaseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 20),
          ),
        );

  static final NotificationPreferenceService instance =
      NotificationPreferenceService._();

  final Dio _dio;
  final ValueNotifier<NotificationPreferences?> _preferencesNotifier =
      ValueNotifier<NotificationPreferences?>(null);
  NotificationPreferences? _cached;
  Future<void>? _syncInFlight;

  ValueListenable<NotificationPreferences?> get preferencesListenable =>
      _preferencesNotifier;

  NotificationPreferences? get cachedPreferences => _cached;

  Future<NotificationPreferences> loadPreferences({
    bool forceRefresh = false,
  }) async {
    final cached = _readCachedPreferences();
    if (cached != null && _cached == null) {
      _setPreferences(cached);
    }

    if (!forceRefresh) {
      final lastSynced = _cached?.lastSyncedAt;
      if (lastSynced != null &&
          DateTime.now().difference(lastSynced) < const Duration(minutes: 10)) {
        return _cached!;
      }
    }

    final token = SessionManager.getAccessToken();
    if (token == null) {
      if (_cached != null) {
        return _cached!;
      }
      throw NotificationPreferenceException(
        'Authentication required before loading notification preferences.',
      );
    }

    try {
      final response = await _dio.get(
        '/notifications/preferences',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final raw = response.data;
      final data = raw is Map && raw['data'] is Map
          ? Map<String, dynamic>.from(raw['data'] as Map)
          : raw is Map
              ? Map<String, dynamic>.from(raw)
              : <String, dynamic>{};
      final preferences = NotificationPreferences.fromApi(data).copyWith(
        lastSyncedAt: DateTime.now(),
        syncPending: _hasPendingOperations(),
      );
      await _persistPreferences(preferences);
      _setPreferences(preferences);
      return preferences;
    } on DioException catch (error) {
      if (_isOffline(error)) {
        if (_cached != null) {
          final fallback = _cached!.copyWith(syncPending: _hasPendingOperations());
          _setPreferences(fallback);
          return fallback;
        }
        throw NotificationPreferenceException(
          'Offline and no cached notification preferences available.',
        );
      }
      final message = _extractErrorMessage(error) ??
          'Unable to load notification preferences.';
      throw NotificationPreferenceException(message);
    } catch (error) {
      throw NotificationPreferenceException(error.toString());
    }
  }

  Future<PreferenceUpdateResult> updatePreferences({
    bool? emailEnabled,
    bool? pushEnabled,
    bool? smsEnabled,
    bool? slackEnabled,
    String? slackChannel,
    String? slackWorkspace,
    Map<String, bool>? categoryOverrides,
  }) async {
    final current = _cached ??
        _readCachedPreferences() ??
        NotificationPreferences.initial();
    final updated = current.copyWith(
      emailEnabled: emailEnabled,
      pushEnabled: pushEnabled,
      smsEnabled: smsEnabled,
      slackEnabled: slackEnabled,
      slackChannel: slackChannel,
      slackWorkspace: slackWorkspace,
      categoryOverrides: categoryOverrides ?? current.categoryOverrides,
      updatedAt: DateTime.now(),
    );

    final payload = updated.toApiPayload();
    final token = SessionManager.getAccessToken();
    if (token == null) {
      final pending = updated.copyWith(syncPending: true);
      await _persistPreferences(pending);
      await _enqueueAction(
        PendingNotificationActionType.updatePreferences,
        payload,
      );
      _setPreferences(pending);
      return PreferenceUpdateResult(
        preferences: pending,
        queued: true,
        message: 'Changes queued locally. Sign in to sync notification preferences.',
      );
    }

    try {
      await _dio.put(
        '/notifications/preferences',
        data: payload,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final synced = updated.copyWith(
        lastSyncedAt: DateTime.now(),
        syncPending: _hasPendingOperations(),
      );
      await _persistPreferences(synced);
      _setPreferences(synced);
      return PreferenceUpdateResult(preferences: synced, queued: false);
    } on DioException catch (error) {
      if (_isOffline(error) ||
          error.response?.statusCode == 503 ||
          error.response?.statusCode == 504) {
        final pending = updated.copyWith(syncPending: true);
        await _persistPreferences(pending);
        await _enqueueAction(
          PendingNotificationActionType.updatePreferences,
          payload,
        );
        _setPreferences(pending);
        return PreferenceUpdateResult(
          preferences: pending,
          queued: true,
          message:
              'Network instability detected. Preferences queued for automatic sync.',
        );
      }
      final message = _extractErrorMessage(error) ??
          'Failed to update notification preferences.';
      throw NotificationPreferenceException(message);
    }
  }

  Future<void> updateCategory(String category, String channel, bool enabled) {
    final current = _cached ??
        _readCachedPreferences() ??
        NotificationPreferences.initial();
    final updatedOverrides = Map<String, bool>.from(current.categoryOverrides);
    updatedOverrides['$channel:$category'] = enabled;
    return updatePreferences(categoryOverrides: updatedOverrides);
  }

  Future<void> registerDeviceToken(String token,
      {String platform = 'flutter'}) async {
    if (token.isEmpty) {
      return;
    }
    final record = SessionManager.notificationPreferencesCache
        .get(_kDeviceRegistrationKey);
    if (record is Map) {
      final storedToken = record['token']?.toString();
      final timestamp = record['updatedAt'] is String
          ? DateTime.tryParse(record['updatedAt'] as String)
          : null;
      if (storedToken == token &&
          timestamp != null &&
          DateTime.now().difference(timestamp) < const Duration(hours: 6)) {
        return;
      }
    }

    final tokenData = await _buildDevicePayload(token, platform: platform);
    final authToken = SessionManager.getAccessToken();
    if (authToken == null) {
      await _enqueueAction(
        PendingNotificationActionType.registerDevice,
        tokenData,
      );
      await SessionManager.notificationPreferencesCache.put(
        _kDeviceRegistrationKey,
        {
          'token': token,
          'updatedAt': DateTime.now().toIso8601String(),
          'queued': true,
        },
      );
      return;
    }

    try {
      await _dio.post(
        '/notifications/devices',
        data: tokenData,
        options: Options(headers: {'Authorization': 'Bearer $authToken'}),
      );
      await SessionManager.notificationPreferencesCache.put(
        _kDeviceRegistrationKey,
        {
          'token': token,
          'updatedAt': DateTime.now().toIso8601String(),
          'queued': false,
        },
      );
    } on DioException catch (error) {
      if (_isOffline(error)) {
        await _enqueueAction(
          PendingNotificationActionType.registerDevice,
          tokenData,
        );
        await SessionManager.notificationPreferencesCache.put(
          _kDeviceRegistrationKey,
          {
            'token': token,
            'updatedAt': DateTime.now().toIso8601String(),
            'queued': true,
          },
        );
        return;
      }
      debugPrint('Device registration failed: ${error.message}');
    }
  }

  Future<void> sendSlackTestEvent() async {
    final prefs = _cached ??
        _readCachedPreferences() ??
        NotificationPreferences.initial();
    final channel = prefs.slackChannel;
    if (!prefs.slackEnabled || channel == null) {
      throw NotificationPreferenceException(
        'Connect a Slack channel before sending a test notification.',
      );
    }
    await sendSlackEvent(
      eventKey: 'mobile-test',
      message:
          'Mobile test notification from Edulure. This validates Slack routing.',
      channel: channel,
      metadata: {
        'source': 'mobile-app',
        'syncedAt': DateTime.now().toIso8601String(),
      },
    );
  }

  Future<void> sendSlackEvent({
    required String eventKey,
    required String message,
    String? channel,
    Map<String, dynamic>? metadata,
  }) async {
    final prefs = _cached ??
        _readCachedPreferences() ??
        NotificationPreferences.initial();
    if (!prefs.slackEnabled) {
      throw NotificationPreferenceException(
        'Slack notifications are disabled in your preferences.',
      );
    }
    final resolvedChannel = channel ?? prefs.slackChannel;
    if (resolvedChannel == null || resolvedChannel.trim().isEmpty) {
      throw NotificationPreferenceException(
        'Select a Slack channel to receive notifications.',
      );
    }

    final token = SessionManager.getAccessToken();
    final payload = {
      'eventKey': eventKey,
      'channel': resolvedChannel,
      'message': message,
      'metadata': {
        if (metadata != null) ...metadata,
        'workspace': prefs.slackWorkspace,
        'category': 'mobile',
      },
    };

    if (token == null) {
      await _enqueueAction(
        PendingNotificationActionType.slackEvent,
        payload,
      );
      _markPreferencesQueued();
      return;
    }

    try {
      await _dio.post(
        '/integrations/slack/events',
        data: payload,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } on DioException catch (error) {
      if (_isOffline(error) ||
          error.response?.statusCode == 503 ||
          error.response?.statusCode == 504) {
        await _enqueueAction(
          PendingNotificationActionType.slackEvent,
          payload,
        );
        _markPreferencesQueued();
        return;
      }
      final message = _extractErrorMessage(error) ??
          'Failed to dispatch Slack notification.';
      throw NotificationPreferenceException(message);
    }
  }

  Future<void> synchronizePendingOperations() async {
    _syncInFlight ??= _drainPendingOperations();
    try {
      await _syncInFlight;
    } finally {
      _syncInFlight = null;
    }
  }

  Future<void> _drainPendingOperations() async {
    final queue = SessionManager.notificationOutbox;
    final token = SessionManager.getAccessToken();
    if (token == null) {
      _markPreferencesQueued();
      return;
    }

    final keys = queue.keys.toList();
    for (final key in keys) {
      final raw = queue.get(key);
      if (raw is! Map) {
        await queue.delete(key);
        continue;
      }
      final action = PendingNotificationAction.fromJson(
        Map<String, dynamic>.from(raw),
        id: key.toString(),
      );
      try {
        switch (action.type) {
          case PendingNotificationActionType.updatePreferences:
            await _dio.put(
              '/notifications/preferences',
              data: action.payload,
              options: Options(headers: {'Authorization': 'Bearer $token'}),
            );
            await queue.delete(key);
            final updated = (_cached ?? NotificationPreferences.initial())
                .copyWith(lastSyncedAt: DateTime.now(), syncPending: false);
            await _persistPreferences(updated);
            _setPreferences(updated);
            break;
          case PendingNotificationActionType.registerDevice:
            await _dio.post(
              '/notifications/devices',
              data: action.payload,
              options: Options(headers: {'Authorization': 'Bearer $token'}),
            );
            await queue.delete(key);
            await SessionManager.notificationPreferencesCache.put(
              _kDeviceRegistrationKey,
              {
                'token': action.payload['token'],
                'updatedAt': DateTime.now().toIso8601String(),
                'queued': false,
              },
            );
            break;
          case PendingNotificationActionType.slackEvent:
            await _dio.post(
              '/integrations/slack/events',
              data: action.payload,
              options: Options(headers: {'Authorization': 'Bearer $token'}),
            );
            await queue.delete(key);
            break;
        }
      } on DioException catch (error) {
        if (_isOffline(error) || error.response?.statusCode == 503) {
          final updatedAction = action.copyWith(
            attempts: action.attempts + 1,
            lastAttemptAt: DateTime.now(),
          );
          await queue.put(key, updatedAction.toJson());
          _markPreferencesQueued();
          return;
        }
        if (error.response?.statusCode == 401 ||
            error.response?.statusCode == 403) {
          _markPreferencesQueued();
          return;
        }
        debugPrint('Pending notification action ${action.type} failed: '
            '${error.response?.statusCode} ${error.message}');
        await queue.delete(key);
      } catch (error) {
        debugPrint('Unexpected pending notification error: $error');
        await queue.delete(key);
      }
    }
    _markPreferencesSynced();
  }

  Future<Map<String, dynamic>> _buildDevicePayload(String token,
      {required String platform}) async {
    String? version;
    String? buildNumber;
    try {
      final info = await PackageInfo.fromPlatform();
      version = info.version;
      buildNumber = info.buildNumber;
    } catch (error) {
      debugPrint('Unable to read package info for device payload: $error');
    }

    return {
      'token': token,
      'platform': platform,
      'appVersion': version,
      'buildNumber': buildNumber,
      'queuedAt': DateTime.now().toIso8601String(),
    };
  }

  NotificationPreferences? _readCachedPreferences() {
    final cache = SessionManager.notificationPreferencesCache
        .get(_kPreferencesCacheKey);
    if (cache is Map) {
      final prefs = NotificationPreferences.fromCache(
        Map<String, dynamic>.from(cache),
      ).copyWith(syncPending: _hasPendingOperations());
      _cached = prefs;
      return prefs;
    }
    return null;
  }

  Future<void> _persistPreferences(NotificationPreferences preferences) async {
    await SessionManager.notificationPreferencesCache.put(
      _kPreferencesCacheKey,
      preferences.toCacheJson(),
    );
    _cached = preferences;
  }

  Future<void> _enqueueAction(
    PendingNotificationActionType type,
    Map<String, dynamic> payload,
  ) async {
    final queue = SessionManager.notificationOutbox;
    final id = _generateQueueId();
    final action = PendingNotificationAction(
      id: id,
      type: type,
      payload: payload,
      createdAt: DateTime.now(),
    );
    await queue.put(id, action.toJson());
  }

  String _generateQueueId() {
    final random = Random();
    final timestamp = DateTime.now().microsecondsSinceEpoch;
    final suffix = random.nextInt(999999).toString().padLeft(6, '0');
    return '$timestamp$suffix';
  }

  bool _hasPendingOperations() {
    return SessionManager.notificationOutbox.isNotEmpty;
  }

  void _markPreferencesQueued() {
    final current = _cached;
    if (current == null) {
      return;
    }
    final queued = current.copyWith(syncPending: true);
    _cached = queued;
    _preferencesNotifier.value = queued;
    SessionManager.notificationPreferencesCache.put(
      _kPreferencesCacheKey,
      queued.toCacheJson(),
    );
  }

  void _markPreferencesSynced() {
    final current = _cached;
    if (current == null) {
      return;
    }
    final synced = current.copyWith(
      syncPending: false,
      lastSyncedAt: DateTime.now(),
    );
    _cached = synced;
    _preferencesNotifier.value = synced;
    SessionManager.notificationPreferencesCache.put(
      _kPreferencesCacheKey,
      synced.toCacheJson(),
    );
  }

  void _setPreferences(NotificationPreferences preferences) {
    _cached = preferences;
    _preferencesNotifier.value = preferences;
  }

  bool _isOffline(DioException error) {
    return error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.unknown;
  }

  String? _extractErrorMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map) {
      final message = data['message'];
      if (message is String && message.trim().isNotEmpty) {
        return message;
      }
      final errors = data['errors'];
      if (errors is List && errors.isNotEmpty) {
        final first = errors.first;
        if (first is String) {
          return first;
        }
        if (first is Map && first['message'] is String) {
          return first['message'] as String;
        }
      }
    }
    return error.message;
  }
}
