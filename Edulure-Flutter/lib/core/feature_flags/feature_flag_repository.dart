import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';

class FeatureFlagRepository {
  FeatureFlagRepository(this._dio);

  final Dio _dio;

  static const _boxName = 'feature_flags';
  static const _cacheKey = 'flags';
  static const _timestampKey = 'timestamp';
  static const _cacheDuration = Duration(minutes: 30);

  Future<Box> _ensureBox() async {
    if (!Hive.isBoxOpen(_boxName)) {
      await Hive.openBox(_boxName);
    }
    return Hive.box(_boxName);
  }

  Future<Map<String, bool>> loadCachedFlags() async {
    final box = await _ensureBox();
    final cached = box.get(_cacheKey);
    final timestamp = box.get(_timestampKey);
    if (cached is Map && timestamp is String) {
      final updatedAt = DateTime.tryParse(timestamp);
      if (updatedAt != null && DateTime.now().difference(updatedAt) <= _cacheDuration) {
        return cached.map((key, value) => MapEntry(key.toString(), value == true));
      }
    }
    return <String, bool>{};
  }

  Future<Map<String, bool>> refresh({bool force = false}) async {
    final box = await _ensureBox();
    if (!force) {
      final timestamp = box.get(_timestampKey);
      if (timestamp is String) {
        final updatedAt = DateTime.tryParse(timestamp);
        if (updatedAt != null && DateTime.now().difference(updatedAt) <= _cacheDuration) {
          final cached = box.get(_cacheKey);
          if (cached is Map) {
            return cached.map((key, value) => MapEntry(key.toString(), value == true));
          }
        }
      }
    }

    final response = await _dio.get(
      '/runtime/feature-flags/mobile',
      options: Options(extra: {'requiresAuth': false}),
    );
    final payload = response.data;
    final data = payload is Map<String, dynamic>
        ? payload['data']
        : null;

    final flags = <String, bool>{};
    if (data is Map) {
      for (final entry in data.entries) {
        flags[entry.key.toString()] = entry.value == true;
      }
    }

    await box.put(_cacheKey, flags);
    await box.put(_timestampKey, DateTime.now().toIso8601String());
    return flags;
  }
}
