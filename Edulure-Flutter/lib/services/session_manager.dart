import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../core/security/secure_storage_service.dart';

class SessionManager {
  static const _sessionBox = 'session';
  static const _assetsBox = 'content_assets';
  static const _downloadsBox = 'content_downloads';
  static const _ebookProgressBox = 'ebook_progress';
  static const _readerSettingsBox = 'ebook_reader_settings';
  static const _dashboardBox = 'dashboard_snapshots';
  static const _privacyBox = 'privacy_preferences';
  static const _creationProjectsBox = 'creation_projects';
  static const _creationActionBox = 'creation_project_actions';
  static const _adsGovernanceBox = 'ads_governance';
  static const _adsActionBox = 'ads_governance_actions';
  static const _notificationPreferencesBox = 'notification_preferences';
  static const _notificationOutboxBox = 'notification_outbox';
  static const _providerTransitionBox = 'provider_transition_announcements';
  static const _billingAccountBox = 'billing_account';
  static const _billingOutboxBox = 'billing_outbox';
  static const _communicationOutboxBox = 'communication_outbox';
  static const _communicationMetadataBox = 'communication_metadata';
  static const _authAuditBox = 'auth_audit';
  static const int _authAuditRetention = 50;
  static const _sessionKey = 'current';
  static const _activeRoleKey = 'active_role';
  static const _secureAccessTokenKey = 'session.accessToken';
  static const _secureRefreshTokenKey = 'session.refreshToken';

  static String? _accessToken;
  static String? _refreshToken;
  static final Set<String> _disabledCaches = <String>{};

  static Future<void> init() async {
    await Hive.initFlutter();
    await _openBox(_sessionBox);
    await _openBox(_assetsBox, optional: true);
    await _openBox(_downloadsBox, optional: true);
    await _openBox(_ebookProgressBox, optional: true);
    await _openBox(_readerSettingsBox, optional: true);
    await _openBox(_dashboardBox);
    await _openBox(_privacyBox, optional: true);
    await _openBox(_creationProjectsBox, optional: true);
    await _openBox(_creationActionBox, optional: true);
    await _openBox(_adsGovernanceBox, optional: true);
    await _openBox(_adsActionBox, optional: true);
    await _openBox(_notificationPreferencesBox, optional: true);
    await _openBox(_notificationOutboxBox, optional: true);
    await _openBox(_providerTransitionBox, optional: true);
    await _openBox(_billingAccountBox, optional: true);
    await _openBox(_billingOutboxBox, optional: true);
    await _openBox(_communicationOutboxBox, optional: true);
    await _openBox(_communicationMetadataBox, optional: true);
    await _openBox(_authAuditBox, optional: true);
    _accessToken = await SecureStorageService.instance.read(key: _secureAccessTokenKey);
    _refreshToken = await SecureStorageService.instance.read(key: _secureRefreshTokenKey);
  }

  static Box get _session => Hive.box(_sessionBox);
  static Box get assetsCache => Hive.box(_assetsBox);
  static Box get downloadsCache => Hive.box(_downloadsBox);
  static Box get ebookProgressCache => Hive.box(_ebookProgressBox);
  static Box get readerSettingsCache => Hive.box(_readerSettingsBox);
  static Box get dashboardCache => Hive.box(_dashboardBox);
  static Box get privacyPreferences => Hive.box(_privacyBox);
  static Box get creationProjectsCache => Hive.box(_creationProjectsBox);
  static Box get creationActionQueue => Hive.box(_creationActionBox);
  static Box get adsGovernanceCache => Hive.box(_adsGovernanceBox);
  static Box get adsGovernanceActionQueue => Hive.box(_adsActionBox);
  static Box get notificationPreferencesCache =>
      Hive.box(_notificationPreferencesBox);
  static Box get notificationOutbox => Hive.box(_notificationOutboxBox);
  static Box? get providerTransitionCache =>
      Hive.isBoxOpen(_providerTransitionBox) ? Hive.box(_providerTransitionBox) : null;
  static Box get billingAccountCache => Hive.box(_billingAccountBox);
  static Box get billingOutbox => Hive.box(_billingOutboxBox);
  static Box get communicationOutbox => Hive.box(_communicationOutboxBox);
  static Box get communicationMetadata => Hive.box(_communicationMetadataBox);
  static Box? get _authAudit => Hive.isBoxOpen(_authAuditBox) ? Hive.box(_authAuditBox) : null;

  static Future<void> saveSession(Map<String, dynamic> session) async {
    final sanitized = Map<String, dynamic>.from(session);
    final tokens = sanitized.remove('tokens');
    await _session.put(_sessionKey, sanitized);
    final userRole = session['user'] is Map ? session['user']['role'] : null;
    if (userRole is String && userRole.isNotEmpty) {
      await _session.put(_activeRoleKey, userRole);
    }
    if (tokens is Map) {
      final accessToken = tokens['accessToken'];
      final refreshToken = tokens['refreshToken'];
      if (accessToken is String && accessToken.isNotEmpty) {
        _accessToken = accessToken;
        await SecureStorageService.instance.write(
          key: _secureAccessTokenKey,
          value: accessToken,
        );
      }
      if (refreshToken is String && refreshToken.isNotEmpty) {
        _refreshToken = refreshToken;
        await SecureStorageService.instance.write(
          key: _secureRefreshTokenKey,
          value: refreshToken,
        );
      }
    }
  }

  static Map<String, dynamic>? getSession() {
    final data = _session.get(_sessionKey);
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    return null;
  }

  static ValueListenable<Box<dynamic>> sessionListenable() {
    return _session.listenable();
  }

  static String? getActiveRole() {
    final stored = _session.get(_activeRoleKey);
    if (stored is String && stored.isNotEmpty) {
      return stored;
    }
    final session = getSession();
    final role = session?['user'] is Map ? session?['user']['role'] : null;
    return role is String && role.isNotEmpty ? role : null;
  }

  static Future<void> setActiveRole(String role) async {
    await _session.put(_activeRoleKey, role);
  }

  static String? getAccessToken() => _accessToken;

  static String? getRefreshToken() => _refreshToken;

  static Future<void> persistAccessToken(String accessToken) async {
    _accessToken = accessToken;
    await SecureStorageService.instance.write(
      key: _secureAccessTokenKey,
      value: accessToken,
    );
  }

  static Future<void> persistRefreshToken(String refreshToken) async {
    _refreshToken = refreshToken;
    await SecureStorageService.instance.write(
      key: _secureRefreshTokenKey,
      value: refreshToken,
    );
  }

  static Future<void> clear() async {
    await _session.delete(_sessionKey);
    await _session.delete(_activeRoleKey);
    await dashboardCache.clear();
    await _clearIfAvailable(_assetsBox);
    await _clearIfAvailable(_downloadsBox);
    await _clearIfAvailable(_ebookProgressBox);
    await _clearIfAvailable(_readerSettingsBox);
    await _clearIfAvailable(_privacyBox);
    await _clearIfAvailable(_creationProjectsBox);
    await _clearIfAvailable(_creationActionBox);
    await _clearIfAvailable(_adsGovernanceBox);
    await _clearIfAvailable(_adsActionBox);
    await _clearIfAvailable(_notificationPreferencesBox);
    await _clearIfAvailable(_notificationOutboxBox);
    await _clearIfAvailable(_providerTransitionBox);
    await _clearIfAvailable(_billingAccountBox);
    await _clearIfAvailable(_billingOutboxBox);
    await _clearIfAvailable(_communicationOutboxBox);
    await _clearIfAvailable(_communicationMetadataBox);
    await _clearIfAvailable(_authAuditBox);
    await SecureStorageService.instance.deleteAll(
      keys: const {
        _secureAccessTokenKey,
        _secureRefreshTokenKey,
      },
    );
    _accessToken = null;
    _refreshToken = null;
  }

  static Future<void> cacheDashboardSnapshot(String role, Map<String, dynamic> snapshot) async {
    await dashboardCache.put(role, snapshot);
  }

  static Map<String, dynamic>? loadCachedDashboardSnapshot(String role) {
    final data = dashboardCache.get(role);
    if (data is Map) {
      return Map<String, dynamic>.from(data as Map);
    }
    return null;
  }

  static Future<Box?> ensureProviderTransitionCache() async {
    if (_disabledCaches.contains(_providerTransitionBox)) {
      return null;
    }
    if (Hive.isBoxOpen(_providerTransitionBox)) {
      return Hive.box(_providerTransitionBox);
    }
    try {
      return await Hive.openBox(_providerTransitionBox);
    } catch (error, stackTrace) {
      debugPrint('Provider transition cache unavailable: $error');
      _disabledCaches.add(_providerTransitionBox);
      debugPrintStack(stackTrace: stackTrace);
      return null;
    }
  }

  static Future<void> appendAuthEvent(AuthAuditEvent event) async {
    if (_disabledCaches.contains(_authAuditBox)) {
      return;
    }
    Box<dynamic> box;
    if (Hive.isBoxOpen(_authAuditBox)) {
      box = Hive.box<dynamic>(_authAuditBox);
    } else {
      try {
        box = await Hive.openBox<dynamic>(_authAuditBox);
      } catch (error, stackTrace) {
        debugPrint('Auth audit trail unavailable: $error');
        debugPrintStack(stackTrace: stackTrace);
        _disabledCaches.add(_authAuditBox);
        return;
      }
    }

    try {
      await box.add(event.toJson());
      if (box.length > _authAuditRetention) {
        final overflow = box.length - _authAuditRetention;
        final keys = box.keys.take(overflow).toList();
        await box.deleteAll(keys);
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to append auth audit event: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  static List<AuthAuditEvent> recentAuthEvents({int limit = 20}) {
    final box = _authAudit;
    if (box == null || box.isEmpty) {
      return const <AuthAuditEvent>[];
    }
    final events = <AuthAuditEvent>[];
    for (final entry in box.values) {
      if (entry is Map<String, dynamic>) {
        events.add(AuthAuditEvent.fromJson(entry));
      } else if (entry is Map) {
        events.add(AuthAuditEvent.fromJson(Map<String, dynamic>.from(entry as Map)));
      }
    }
    events.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    if (events.length <= limit) {
      return events;
    }
    return events.sublist(0, limit);
  }

  static ValueListenable<Box<dynamic>>? authAuditListenable() {
    final box = _authAudit;
    return box?.listenable();
  }

  static Future<void> _openBox(String name, {bool optional = false}) async {
    try {
      await Hive.openBox(name);
    } catch (error, stackTrace) {
      if (!optional) {
        rethrow;
      }
      _disabledCaches.add(name);
      debugPrint('Optional Hive cache "$name" disabled: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  static Future<void> _clearIfAvailable(String name) async {
    if (Hive.isBoxOpen(name)) {
      await Hive.box(name).clear();
    }
  }
}

class AuthAuditEvent {
  const AuthAuditEvent({
    required this.type,
    required this.status,
    required this.timestamp,
    this.metadata = const <String, dynamic>{},
  });

  final String type;
  final String status;
  final DateTime timestamp;
  final Map<String, dynamic> metadata;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type,
      'status': status,
      'timestamp': timestamp.toIso8601String(),
      if (metadata.isNotEmpty) 'metadata': metadata,
    };
  }

  factory AuthAuditEvent.fromJson(Map<String, dynamic> json) {
    return AuthAuditEvent(
      type: json['type']?.toString() ?? 'event',
      status: json['status']?.toString() ?? 'unknown',
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ?? DateTime.now(),
      metadata: json['metadata'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['metadata'] as Map<String, dynamic>)
          : json['metadata'] is Map
              ? Map<String, dynamic>.from(json['metadata'] as Map)
              : const <String, dynamic>{},
    );
  }
}
