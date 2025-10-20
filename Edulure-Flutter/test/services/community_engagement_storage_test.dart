import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

import 'package:edulure_mobile/services/community_engagement_storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;

  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('community_engagement_storage_test');
    Hive.init(tempDir.path);
  });

  tearDown(() async {
    for (final name in Hive.boxNames.toList(growable: false)) {
      if (Hive.isBoxOpen(name)) {
        final box = Hive.box(name);
        await box.close();
      }
      await Hive.deleteBoxFromDisk(name);
    }
  });

  test('writes, reads, and deletes engagement snapshots', () async {
    final storage = CommunityEngagementStorage(
      hive: Hive,
      boxName: 'community.engagement',
    );

    final snapshot = {
      'feed': [
        {'id': 'post-1', 'body': 'Welcome to the hub!'},
      ],
      'membersOnline': 32,
    };

    await storage.writeSnapshot('community-1', snapshot);

    final restored = await storage.readSnapshot('community-1');
    expect(restored, isNotNull);
    expect(restored!['membersOnline'], 32);

    await storage.deleteSnapshot('community-1');
    expect(await storage.readSnapshot('community-1'), isNull);
  });

  test('clear removes all cached engagement snapshots', () async {
    final storage = CommunityEngagementStorage(
      hive: Hive,
      boxName: 'community.engagement.clear',
    );

    await storage.writeSnapshot('community-1', {'membersOnline': 12});
    await storage.writeSnapshot('community-2', {'membersOnline': 7});

    await storage.clear();

    expect(await storage.readSnapshot('community-1'), isNull);
    expect(await storage.readSnapshot('community-2'), isNull);
  });
}
