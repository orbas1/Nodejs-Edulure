import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

import 'package:edulure_mobile/services/community_hub_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;

  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('community_hub_repository_test');
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

  test('seedIfNeeded populates default hub data only once', () async {
    final repository = CommunityHubRepository(
      hive: Hive,
      boxName: 'community.hub.seed',
    );

    await repository.seedIfNeeded();
    final firstSnapshot = await repository.loadSnapshot();
    expect(firstSnapshot.feed, isNotEmpty);

    await repository.seedIfNeeded();
    final secondSnapshot = await repository.loadSnapshot();
    expect(secondSnapshot.feed.length, firstSnapshot.feed.length);
  });

  test('saveSnapshot overwrites cached hub data', () async {
    final repository = CommunityHubRepository(
      hive: Hive,
      boxName: 'community.hub.save',
    );

    await repository.seedIfNeeded();

    final snapshot = await repository.loadSnapshot();
    final updated = snapshot.copyWith(feed: []);

    await repository.saveSnapshot(updated);

    final restored = await repository.loadSnapshot();
    expect(restored.feed, isEmpty);
    expect(restored.classrooms, isNotEmpty);
  });
}
