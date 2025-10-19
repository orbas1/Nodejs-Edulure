import 'dart:io';

import 'package:edulure_mobile/provider/community/community_hub_controller.dart';
import 'package:edulure_mobile/services/community_hub_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  const boxName = 'community_hub';

  late Directory hiveDir;
  late HiveInterface hive;
  late CommunityHubRepository repository;
  late CommunityHubController controller;

  setUp(() async {
    hiveDir = await Directory.systemTemp.createTemp('community_hub_test');
    hive = HiveImpl()..init(hiveDir.path);
    repository = CommunityHubRepository(hive: hive);
    controller = CommunityHubController(repository: repository);
    await controller.bootstrap();
  });

  tearDown(() async {
    try {
      if (hive.isBoxOpen(boxName)) {
        await hive.box<dynamic>(boxName).close();
      }
      if (await hive.boxExists(boxName)) {
        await hive.deleteBoxFromDisk(boxName);
      }
      await hive.close();
    } finally {
      if (await hiveDir.exists()) {
        await hiveDir.delete(recursive: true);
      }
    }
  });

  test('bootstrap seeds snapshot with all collections', () {
    final snapshot = controller.state.snapshot;

    expect(snapshot.feed, isNotEmpty);
    expect(snapshot.classrooms, isNotEmpty);
    expect(snapshot.calendarEntries, isNotEmpty);
    expect(snapshot.livestreams, isNotEmpty);
    expect(snapshot.podcasts, isNotEmpty);
    expect(snapshot.leaderboard, isNotEmpty);
    expect(snapshot.events, isNotEmpty);
  });

  group('feed', () {
    test('create updates state and persists ordering', () async {
      final previousFirst = controller.state.snapshot.feed.first;

      await controller.createFeedPost(
        title: 'Release Notes',
        body: 'Shipping the community hub updates.',
        author: 'Automation Bot',
      );

      final snapshot = controller.state.snapshot;
      expect(snapshot.feed.first.title, 'Release Notes');
      expect(snapshot.feed.length, greaterThan(1));
      expect(snapshot.feed[1].id, previousFirst.id);
    });

    test('update and delete mutate targeted entry', () async {
      final post = controller.state.snapshot.feed.first;
      final updated = post.copyWith(title: 'Updated Title');

      await controller.updateFeedPost(updated);
      final refreshed =
          controller.state.snapshot.feed.firstWhere((element) => element.id == post.id);
      expect(refreshed.title, 'Updated Title');

      await controller.deleteFeedPost(post.id);
      expect(
        controller.state.snapshot.feed.where((element) => element.id == post.id),
        isEmpty,
      );
    });

    test('pin toggle flips state', () async {
      final post = controller.state.snapshot.feed.first;
      final initialPinned = post.pinned;

      await controller.togglePostPin(post.id);

      final toggled =
          controller.state.snapshot.feed.firstWhere((element) => element.id == post.id);
      expect(toggled.pinned, isNot(initialPinned));
    });
  });

  group('classrooms', () {
    test('create, enroll, cancel, and delete maintain enrollments', () async {
      await controller.createClassroom(
        title: 'Deep Dive',
        facilitator: 'Jordan',
        description: 'Advanced community strategy.',
        startTime: DateTime.now().add(const Duration(days: 1)),
        endTime: DateTime.now().add(const Duration(days: 1, hours: 1)),
        deliveryMode: 'Virtual',
        capacity: 50,
        communityId: 'global',
      );

      final classroom = controller.state.snapshot.classrooms.first;
      await controller.enrollInClassroom(classroom.id, 'Taylor');
      expect(
        controller.state.snapshot.classrooms.first.enrolled,
        contains('Taylor'),
      );

      await controller.cancelClassroomEnrollment(classroom.id, 'Taylor');
      expect(
        controller.state.snapshot.classrooms.first.enrolled,
        isNot(contains('Taylor')),
      );

      await controller.deleteClassroom(classroom.id);
      expect(
        controller.state.snapshot.classrooms.where((element) => element.id == classroom.id),
        isEmpty,
      );
    });
  });

  group('calendar', () {
    test('create maintains chronological ordering', () async {
      final baseCount = controller.state.snapshot.calendarEntries.length;

      await controller.createCalendarEntry(
        title: 'Morning Sync',
        description: 'Daily standup.',
        startTime: DateTime(2030, 1, 1, 9),
        endTime: DateTime(2030, 1, 1, 10),
        location: 'Zoom',
        organiser: 'Ops',
      );

      await controller.createCalendarEntry(
        title: 'Early Briefing',
        description: 'Pre-sync.',
        startTime: DateTime(2030, 1, 1, 8, 30),
        endTime: DateTime(2030, 1, 1, 8, 50),
        location: 'Zoom',
        organiser: 'Ops',
      );

      final entries = controller.state.snapshot.calendarEntries;
      expect(entries.length, baseCount + 2);
      expect(entries.first.title, 'Early Briefing');
      expect(entries[1].title, 'Morning Sync');
    });
  });

  group('livestreams', () {
    test('crud operations retain chronological order', () async {
      await controller.createLivestream(
        title: 'Product AMA',
        host: 'Product Team',
        streamUrl: 'https://example.com/live',
        scheduledAt: DateTime(2030, 1, 1, 18),
        status: 'scheduled',
        description: 'Ask us anything.',
      );

      final stream = controller.state.snapshot.livestreams.first;
      expect(stream.title, 'Product AMA');

      final updated = stream.copyWith(status: 'live');
      await controller.updateLivestream(updated);
      final refreshed = controller.state.snapshot.livestreams.first;
      expect(refreshed.status, 'live');

      await controller.deleteLivestream(stream.id);
      expect(
        controller.state.snapshot.livestreams.where((element) => element.id == stream.id),
        isEmpty,
      );
    });
  });

  group('podcasts', () {
    test('newer episode floats to top and supports updates', () async {
      final initialFirst = controller.state.snapshot.podcasts.first;
      await controller.createPodcastEpisode(
        title: 'Fresh Insights',
        description: 'Latest interview.',
        audioUrl: 'https://cdn.example.com/fresh.mp3',
        host: 'Community Lab',
        publishedAt: DateTime.now(),
        duration: const Duration(minutes: 30),
      );

      final snapshot = controller.state.snapshot.podcasts;
      expect(snapshot.first.title, 'Fresh Insights');

      final episode = snapshot.first;
      await controller.updatePodcastEpisode(episode.copyWith(description: 'Updated show.'));
      final refreshed = controller.state.snapshot.podcasts.first;
      expect(refreshed.description, 'Updated show.');

      await controller.deletePodcastEpisode(episode.id);
      expect(
        controller.state.snapshot.podcasts.where((element) => element.id == episode.id),
        isEmpty,
      );
      expect(controller.state.snapshot.podcasts.first.id, initialFirst.id);
    });
  });

  group('leaderboard', () {
    test('ranks members by score and reacts to updates', () async {
      final initialLength = controller.state.snapshot.leaderboard.length;

      await controller.createLeaderboardEntry(
        memberName: 'Casey',
        points: 9999,
        avatarUrl: 'https://cdn.example.com/casey.png',
      );

      final snapshot = controller.state.snapshot.leaderboard;
      expect(snapshot.length, initialLength + 1);
      expect(snapshot.first.memberName, 'Casey');
      expect(snapshot.first.rank, 1);

      final entry = snapshot.first;
      await controller.updateLeaderboardEntry(entry.copyWith(points: 10));
      final reordered = controller.state.snapshot.leaderboard;
      final updatedEntry = reordered.firstWhere((element) => element.id == entry.id);
      expect(updatedEntry.points, 10);
      expect(updatedEntry.rank, greaterThan(1));

      await controller.deleteLeaderboardEntry(entry.id);
      expect(
        controller.state.snapshot.leaderboard.where((element) => element.id == entry.id),
        isEmpty,
      );
      expect(controller.state.snapshot.leaderboard.length, initialLength);
    });
  });

  group('events', () {
    test('create, update and delete maintain sorted agenda', () async {
      await controller.createEvent(
        title: 'Town Hall',
        description: 'Quarterly briefing.',
        startTime: DateTime(2030, 2, 1, 12),
        endTime: DateTime(2030, 2, 1, 13),
        location: 'Hybrid',
        host: 'Exec Team',
      );

      final event = controller.state.snapshot.events
          .firstWhere((element) => element.title == 'Town Hall');
      final updated = event.copyWith(description: 'Updated briefing.');
      await controller.updateEvent(updated);

      final refreshed = controller.state.snapshot.events
          .firstWhere((element) => element.id == event.id);
      expect(refreshed.description, 'Updated briefing.');

      await controller.deleteEvent(event.id);
      expect(
        controller.state.snapshot.events.where((element) => element.id == event.id),
        isEmpty,
      );
    });
  });
}
