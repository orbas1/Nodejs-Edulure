import 'package:hive/hive.dart';

class CommunityEngagementStorage {
  CommunityEngagementStorage({
    HiveInterface? hive,
    Duration cacheLifetime = const Duration(hours: 12),
    DateTime Function()? clock,
  })  : _hive = hive ?? Hive,
        _cacheLifetime = cacheLifetime,
        _clock = clock ?? DateTime.now;

  static const String _boxName = 'community_engagement';
  static const String _payloadKey = '__payload';
  static const String _storedAtKey = '__storedAt';

  final HiveInterface _hive;
  final Duration _cacheLifetime;
  final DateTime Function() _clock;

  Future<Box<dynamic>> _ensureBox() async {
    if (!_hive.isBoxOpen(_boxName)) {
      await _hive.openBox<dynamic>(_boxName);
    }
    return _hive.box<dynamic>(_boxName);
  }

  Future<Map<String, dynamic>?> readSnapshot(String communityId) async {
    final box = await _ensureBox();
    final value = box.get(communityId);
    if (value is Map<String, dynamic>) {
      return _extractPayload(communityId, value);
    }
    if (value is Map) {
      return _extractPayload(communityId, Map<String, dynamic>.from(value as Map));
    }
    return null;
  }

  Future<void> writeSnapshot(String communityId, Map<String, dynamic> snapshot) async {
    final box = await _ensureBox();
    final payload = <String, dynamic>{
      _payloadKey: Map<String, dynamic>.from(snapshot),
      _storedAtKey: _clock().toIso8601String(),
    };
    await box.put(communityId, payload);
  }

  Future<void> deleteSnapshot(String communityId) async {
    final box = await _ensureBox();
    await box.delete(communityId);
  }

  Future<void> clear() async {
    final box = await _ensureBox();
    await box.clear();
  }

  Future<Map<String, dynamic>?> _extractPayload(
    String communityId,
    Map<String, dynamic> value,
  ) async {
    if (!value.containsKey(_payloadKey)) {
      return value;
    }

    final storedAtRaw = value[_storedAtKey]?.toString();
    if (storedAtRaw != null) {
      final storedAt = DateTime.tryParse(storedAtRaw);
      if (storedAt != null) {
        final expiresAt = storedAt.add(_cacheLifetime);
        if (_clock().isAfter(expiresAt)) {
          // The cache is stale; clean it up to avoid surfacing outdated engagement data.
          await _hive.box<dynamic>(_boxName).delete(communityId);
          return null;
        }
      }
    }

    final payload = value[_payloadKey];
    if (payload is Map<String, dynamic>) {
      return Map<String, dynamic>.from(payload);
    }
    if (payload is Map) {
      return Map<String, dynamic>.from(payload as Map);
    }
    return null;
  }
}
