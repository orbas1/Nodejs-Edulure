import 'package:hive_flutter/hive_flutter.dart';

class CommunityEngagementStorage {
  CommunityEngagementStorage({HiveInterface? hive}) : _hive = hive ?? Hive;

  static const String _boxName = 'community_engagement';

  final HiveInterface _hive;

  Future<Box<dynamic>> _ensureBox() async {
    if (!_hive.isBoxOpen(_boxName)) {
      await _hive.openBox<dynamic>(_boxName);
    }
    return _hive.box<dynamic>(_boxName);
  }

  Future<Map<String, dynamic>?> readSnapshot(String communityId) async {
    final box = await _ensureBox();
    final value = box.get(communityId);
    if (value is Map) {
      return Map<String, dynamic>.from(value as Map);
    }
    if (value is Map<String, dynamic>) {
      return value;
    }
    return null;
  }

  Future<void> writeSnapshot(String communityId, Map<String, dynamic> snapshot) async {
    final box = await _ensureBox();
    await box.put(communityId, snapshot);
  }

  Future<void> deleteSnapshot(String communityId) async {
    final box = await _ensureBox();
    await box.delete(communityId);
  }

  Future<void> clear() async {
    final box = await _ensureBox();
    await box.clear();
  }
}
