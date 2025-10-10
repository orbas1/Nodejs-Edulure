import 'package:hive_flutter/hive_flutter.dart';

class SessionManager {
  static const _sessionBox = 'session';
  static const _assetsBox = 'content_assets';
  static const _downloadsBox = 'content_downloads';
  static const _sessionKey = 'current';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(_sessionBox);
    await Hive.openBox(_assetsBox);
    await Hive.openBox(_downloadsBox);
  }

  static Box get _session => Hive.box(_sessionBox);
  static Box get assetsCache => Hive.box(_assetsBox);
  static Box get downloadsCache => Hive.box(_downloadsBox);

  static Future<void> saveSession(Map<String, dynamic> session) async {
    await _session.put(_sessionKey, session);
  }

  static Map<String, dynamic>? getSession() {
    final data = _session.get(_sessionKey);
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    return null;
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
  }
}
