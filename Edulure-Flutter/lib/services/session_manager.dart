import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

class SessionManager {
  static const _sessionBox = 'session';
  static const _assetsBox = 'content_assets';
  static const _downloadsBox = 'content_downloads';
  static const _ebookProgressBox = 'ebook_progress';
  static const _readerSettingsBox = 'ebook_reader_settings';
  static const _dashboardBox = 'dashboard_snapshots';
  static const _sessionKey = 'current';
  static const _activeRoleKey = 'active_role';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(_sessionBox);
    await Hive.openBox(_assetsBox);
    await Hive.openBox(_downloadsBox);
    await Hive.openBox(_ebookProgressBox);
    await Hive.openBox(_readerSettingsBox);
    await Hive.openBox(_dashboardBox);
  }

  static Box get _session => Hive.box(_sessionBox);
  static Box get assetsCache => Hive.box(_assetsBox);
  static Box get downloadsCache => Hive.box(_downloadsBox);
  static Box get ebookProgressCache => Hive.box(_ebookProgressBox);
  static Box get readerSettingsCache => Hive.box(_readerSettingsBox);
  static Box get dashboardCache => Hive.box(_dashboardBox);

  static Future<void> saveSession(Map<String, dynamic> session) async {
    await _session.put(_sessionKey, session);
    final userRole = session['user'] is Map ? session['user']['role'] : null;
    if (userRole is String && userRole.isNotEmpty) {
      await _session.put(_activeRoleKey, userRole);
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

  static String? getAccessToken() {
    final session = getSession();
    final tokens = session?['tokens'];
    if (tokens is Map && tokens['accessToken'] is String) {
      return tokens['accessToken'] as String;
    }
    return null;
  }

  static Future<void> clear() async {
    await _session.delete(_sessionKey);
    await _session.delete(_activeRoleKey);
    await dashboardCache.clear();
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
