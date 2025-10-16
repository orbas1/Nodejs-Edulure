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
  static const _sessionKey = 'current';
  static const _activeRoleKey = 'active_role';
  static const _secureAccessTokenKey = 'session.accessToken';
  static const _secureRefreshTokenKey = 'session.refreshToken';

  static String? _accessToken;
  static String? _refreshToken;

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(_sessionBox);
    await Hive.openBox(_assetsBox);
    await Hive.openBox(_downloadsBox);
    await Hive.openBox(_ebookProgressBox);
    await Hive.openBox(_readerSettingsBox);
    await Hive.openBox(_dashboardBox);
    await Hive.openBox(_privacyBox);
    await Hive.openBox(_creationProjectsBox);
    await Hive.openBox(_creationActionBox);
    await Hive.openBox(_adsGovernanceBox);
    await Hive.openBox(_adsActionBox);
    await Hive.openBox(_notificationPreferencesBox);
    await Hive.openBox(_notificationOutboxBox);
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
    await assetsCache.clear();
    await downloadsCache.clear();
    await ebookProgressCache.clear();
    await readerSettingsCache.clear();
    await privacyPreferences.clear();
    await creationProjectsCache.clear();
    await creationActionQueue.clear();
    await adsGovernanceCache.clear();
    await adsGovernanceActionQueue.clear();
    await notificationPreferencesCache.clear();
    await notificationOutbox.clear();
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
}
