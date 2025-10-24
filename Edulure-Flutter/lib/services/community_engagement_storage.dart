import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';

class CommunityEngagementStorage {
  CommunityEngagementStorage({
    HiveInterface? hive,
    String boxName = _defaultBoxName,
  })  : _hive = hive ?? Hive,
        _boxName = boxName;

  static const String _defaultBoxName = 'community_engagement';
  static const String _feedPrefix = 'feed::';

  final HiveInterface _hive;
  final String _boxName;

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

  Future<Map<String, dynamic>?> readFeedSnapshot(String cacheKey) {
    return readSnapshot('$_feedPrefix$cacheKey');
  }

  Future<void> writeFeedSnapshot(String cacheKey, Map<String, dynamic> snapshot) {
    return writeSnapshot('$_feedPrefix$cacheKey', snapshot);
  }

  Future<void> deleteFeedSnapshot(String cacheKey) {
    return deleteSnapshot('$_feedPrefix$cacheKey');
  }
}
