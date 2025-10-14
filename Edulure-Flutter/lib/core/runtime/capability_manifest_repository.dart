import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'capability_manifest_models.dart';

class CapabilityManifestLoadResult {
  CapabilityManifestLoadResult({
    required this.manifest,
    required this.fetchedAt,
    required this.fromCache,
  });

  final CapabilityManifest manifest;
  final DateTime fetchedAt;
  final bool fromCache;
}

class CapabilityManifestRepository {
  CapabilityManifestRepository(this._dio, {this.audience});

  final Dio _dio;
  final String? audience;

  static const _manifestKey = 'manifest';
  static const _timestampKey = 'timestamp';
  static const Duration _cacheTtl = Duration(minutes: 5);

  String get _boxName {
    if (audience == null || audience!.isEmpty) {
      return 'capability_manifest';
    }
    final normalised = audience!
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
        .replaceAll(RegExp(r'_+$'), '')
        .replaceAll(RegExp(r'^_+'), '');
    if (normalised.isEmpty) {
      return 'capability_manifest';
    }
    return 'capability_manifest_$normalised';
  }

  Future<Box> _ensureBox() async {
    if (!Hive.isBoxOpen(_boxName)) {
      await Hive.openBox(_boxName);
    }
    return Hive.box(_boxName);
  }

  Future<CapabilityManifestLoadResult?> loadCachedManifest() async {
    final box = await _ensureBox();
    final rawManifest = box.get(_manifestKey);
    final timestamp = box.get(_timestampKey);

    if (rawManifest is Map && timestamp is String) {
      final parsedManifest = CapabilityManifest.fromJson(Map<String, dynamic>.from(rawManifest));
      final fetchedAt = DateTime.tryParse(timestamp) ?? DateTime.now().toUtc();
      return CapabilityManifestLoadResult(
        manifest: parsedManifest,
        fetchedAt: fetchedAt,
        fromCache: true,
      );
    }

    return null;
  }

  Future<CapabilityManifestLoadResult> getManifest({bool force = false}) async {
    if (!force) {
      final cached = await loadCachedManifest();
      if (cached != null) {
        final age = DateTime.now().toUtc().difference(cached.fetchedAt);
        if (age <= _cacheTtl) {
          return cached;
        }
      }
    }

    final fresh = await _fetchManifest();
    await _cacheManifest(fresh);
    return fresh;
  }

  Future<CapabilityManifestLoadResult> refresh() async {
    final fresh = await _fetchManifest();
    await _cacheManifest(fresh);
    return fresh;
  }

  Future<CapabilityManifestLoadResult> _fetchManifest() async {
    final response = await _dio.get(
      '/runtime/manifest',
      queryParameters: audience == null ? null : {'audience': audience},
      options: Options(
        extra: const {'requiresAuth': false},
      ),
    );

    final payload = response.data;
    final data = payload is Map<String, dynamic>
        ? payload['data']
        : payload;

    if (data is! Map) {
      throw StateError('Manifest response missing data payload');
    }

    final manifest = CapabilityManifest.fromJson(Map<String, dynamic>.from(data as Map));
    return CapabilityManifestLoadResult(
      manifest: manifest,
      fetchedAt: DateTime.now().toUtc(),
      fromCache: false,
    );
  }

  Future<void> _cacheManifest(CapabilityManifestLoadResult result) async {
    final box = await _ensureBox();
    await box.put(_manifestKey, result.manifest.toJson());
    await box.put(_timestampKey, result.fetchedAt.toIso8601String());
  }
}
