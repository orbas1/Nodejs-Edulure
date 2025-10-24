import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';

typedef JsonMap = Map<String, dynamic>;

class FeedCacheRepository {
  FeedCacheRepository({
    HiveInterface? hive,
    String boxName = _defaultBoxName,
    Duration ttl = const Duration(minutes: 5),
  })  : _hive = hive ?? Hive,
        _boxName = boxName,
        _ttl = ttl;

  static const String _defaultBoxName = 'live_feed_cache';

  final HiveInterface _hive;
  final String _boxName;
  final Duration _ttl;

  Future<Box<dynamic>> _ensureBox() async {
    if (!_hive.isBoxOpen(_boxName)) {
      await _hive.openBox<dynamic>(_boxName);
    }
    return _hive.box<dynamic>(_boxName);
  }

  Future<FeedCacheEntry?> read(String key) async {
    final box = await _ensureBox();
    final value = box.get(key);
    FeedCacheEntry? entry;
    if (value is Map<String, dynamic>) {
      entry = FeedCacheEntry.fromJson(value);
    } else if (value is Map) {
      entry = FeedCacheEntry.fromJson(Map<String, dynamic>.from(value as Map));
    }
    if (entry == null) {
      return null;
    }
    if (entry.isStale(_ttl)) {
      await box.delete(key);
      return null;
    }
    return entry;
  }

  Future<void> write(
    String key,
    JsonMap payload, {
    DateTime? fetchedAt,
    Map<String, dynamic>? metadata,
  }) async {
    final box = await _ensureBox();
    await _pruneExpired(box);
    final entry = FeedCacheEntry(
      payload: Map<String, dynamic>.from(payload),
      fetchedAt: fetchedAt ?? DateTime.now(),
      metadata: metadata,
    );
    await box.put(key, entry.toJson());
  }

  Future<void> pruneExpired() async {
    final box = await _ensureBox();
    await _pruneExpired(box);
  }

  Future<void> clear() async {
    final box = await _ensureBox();
    await box.clear();
  }

  Future<void> _pruneExpired(Box<dynamic> box) async {
    final now = DateTime.now();
    final keysToDelete = <dynamic>[];
    for (final key in box.keys) {
      final value = box.get(key);
      if (value is Map<String, dynamic>) {
        final entry = FeedCacheEntry.fromJson(value);
        if (entry.isStale(_ttl, now: now)) {
          keysToDelete.add(key);
        }
      } else if (value is Map) {
        final entry = FeedCacheEntry.fromJson(Map<String, dynamic>.from(value as Map));
        if (entry.isStale(_ttl, now: now)) {
          keysToDelete.add(key);
        }
      }
    }
    if (keysToDelete.isNotEmpty) {
      await box.deleteAll(keysToDelete);
    }
  }
}

class FeedCacheEntry {
  FeedCacheEntry({
    required this.payload,
    required this.fetchedAt,
    Map<String, dynamic>? metadata,
  }) : metadata = metadata == null
            ? const <String, dynamic>{}
            : Map<String, dynamic>.from(metadata);

  final JsonMap payload;
  final DateTime fetchedAt;
  final Map<String, dynamic> metadata;

  bool isStale(Duration ttl, {DateTime? now}) {
    final reference = now ?? DateTime.now();
    return reference.difference(fetchedAt) > ttl;
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'payload': payload,
      'fetchedAt': fetchedAt.toIso8601String(),
      'metadata': metadata,
    };
  }

  factory FeedCacheEntry.fromJson(Map<String, dynamic> json) {
    final rawPayload = json['payload'];
    final payload = rawPayload is Map<String, dynamic>
        ? Map<String, dynamic>.from(rawPayload)
        : rawPayload is Map
            ? Map<String, dynamic>.from(rawPayload as Map)
            : <String, dynamic>{};
    final rawMetadata = json['metadata'];
    final metadata = rawMetadata is Map<String, dynamic>
        ? Map<String, dynamic>.from(rawMetadata)
        : rawMetadata is Map
            ? Map<String, dynamic>.from(rawMetadata as Map)
            : <String, dynamic>{};
    final fetchedAt = DateTime.tryParse(json['fetchedAt']?.toString() ?? '') ?? DateTime.now();
    return FeedCacheEntry(
      payload: payload,
      fetchedAt: fetchedAt,
      metadata: metadata,
    );
  }
}
