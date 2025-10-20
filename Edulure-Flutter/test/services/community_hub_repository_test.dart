import 'dart:io';

import 'package:edulure_mobile/services/community_hub_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late HiveInterface hive;
  late CommunityHubRepository repository;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('community-hub');
    hive = HiveImpl()..init(tempDir.path);
    repository = CommunityHubRepository(hive: hive);
  });

  tearDown(() async {
    await repository.clear();
    if (hive.isBoxOpen('community_hub')) {
      final box = hive.box<dynamic>('community_hub');
      await box.close();
    }
    await hive.deleteBoxFromDisk('community_hub');
    await tempDir.delete(recursive: true);
  });

  test('seeds demo content exactly once with versioned metadata', () async {
    final box = await hive.openBox<dynamic>('community_hub');
    expect(box.get('seeded'), isNull);
    await box.close();

    await repository.seedIfNeeded();
    final snapshot = await repository.loadSnapshot();

    expect(snapshot.feed, isNotEmpty);
    expect(snapshot.classrooms, isNotEmpty);
    expect(snapshot.leaderboard, isNotEmpty);

    final seededBox = await hive.openBox<dynamic>('community_hub');
    final metadata = seededBox.get('seeded');
    expect(metadata, isA<Map>());
    expect((metadata as Map)['version'], greaterThanOrEqualTo(2));

    await seededBox.close();

    // Invoke again and verify the snapshot remains stable.
    await repository.seedIfNeeded();
    final repeatSnapshot = await repository.loadSnapshot();
    expect(repeatSnapshot.feed.length, snapshot.feed.length);
  });

  test('loaded collections are returned in deterministic order', () async {
    await repository.seedIfNeeded();
    final snapshot = await repository.loadSnapshot();

    final sortedFeed = [...snapshot.feed]..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    expect(snapshot.feed, sortedFeed);

    final sortedClassrooms = [...snapshot.classrooms]..sort((a, b) => a.startTime.compareTo(b.startTime));
    expect(snapshot.classrooms, sortedClassrooms);

    final sortedLeaderboard = [...snapshot.leaderboard]..sort((a, b) => a.rank.compareTo(b.rank));
    expect(snapshot.leaderboard, sortedLeaderboard);
  });
}
