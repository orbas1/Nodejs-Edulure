import 'dart:io';

import 'package:edulure_mobile/services/community_engagement_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late HiveInterface hive;
  late DateTime currentTime;
  late CommunityEngagementStorage storage;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('community-engagement');
    hive = HiveImpl()..init(tempDir.path);
    currentTime = DateTime.utc(2024, 1, 10, 12);
    storage = CommunityEngagementStorage(
      hive: hive,
      cacheLifetime: const Duration(hours: 2),
      clock: () => currentTime,
    );
  });

  tearDown(() async {
    await storage.clear();
    if (hive.isBoxOpen('community_engagement')) {
      final box = hive.box<dynamic>('community_engagement');
      await box.close();
    }
    await hive.deleteBoxFromDisk('community_engagement');
    await tempDir.delete(recursive: true);
  });

  test('reads and writes engagement snapshots within TTL window', () async {
    final snapshot = {'channels': 3, 'messages': 42};

    await storage.writeSnapshot('community-1', snapshot);
    final restored = await storage.readSnapshot('community-1');

    expect(restored, isNotNull);
    expect(restored, equals(snapshot));
  });

  test('drops snapshots once cache lifetime expires', () async {
    await storage.writeSnapshot('community-2', {'channels': 1});

    currentTime = currentTime.add(const Duration(hours: 3));

    final restored = await storage.readSnapshot('community-2');
    expect(restored, isNull);

    final box = await hive.openBox<dynamic>('community_engagement');
    expect(box.get('community-2'), isNull);
    await box.close();
  });

  test('restores legacy payloads saved before wrapper migration', () async {
    final legacyBox = await hive.openBox<dynamic>('community_engagement');
    await legacyBox.put('legacy-community', {'channels': 5});
    await legacyBox.close();

    final restored = await storage.readSnapshot('legacy-community');
    expect(restored, equals({'channels': 5}));
  });
}
