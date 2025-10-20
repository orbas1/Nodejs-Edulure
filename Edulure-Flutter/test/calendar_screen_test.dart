import 'dart:io';

import 'package:edulure_mobile/provider/community/community_hub_controller.dart';
import 'package:edulure_mobile/screens/calendar_screen.dart';
import 'package:edulure_mobile/services/community_hub_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const boxName = 'community_hub';
  late Directory hiveDir;
  late HiveInterface hive;
  late CommunityHubRepository repository;

  setUp(() async {
    hiveDir = await Directory.systemTemp.createTemp('calendar_screen_test');
    hive = HiveImpl()..init(hiveDir.path);
    repository = CommunityHubRepository(hive: hive);
    await repository.clear();
  });

  tearDown(() async {
    if (hive.isBoxOpen(boxName)) {
      await hive.box<dynamic>(boxName).close();
    }
    if (await hive.boxExists(boxName)) {
      await hive.deleteBoxFromDisk(boxName);
    }
    await hive.close();
    if (await hiveDir.exists()) {
      await hiveDir.delete(recursive: true);
    }
  });

  testWidgets('filters events by query', (tester) async {
    ProviderContainer? container;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          communityHubRepositoryProvider.overrideWithValue(repository),
        ],
        child: MaterialApp(
          home: Builder(
            builder: (context) {
              container = ProviderScope.containerOf(context);
              return const CalendarScreen();
            },
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(container!.read(communityHubControllerProvider).snapshot.calendarEntries, isNotEmpty);
    expect(find.text('Mentor office hours'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, 'mentor');
    await tester.pumpAndSettle();
    expect(find.text('Mentor office hours'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, 'non matching query');
    await tester.pumpAndSettle();
    expect(find.text('No events match the current filters.'), findsOneWidget);
  });

  testWidgets('duplicate action schedules entry for the next week', (tester) async {
    ProviderContainer? container;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          communityHubRepositoryProvider.overrideWithValue(repository),
        ],
        child: MaterialApp(
          home: Builder(
            builder: (context) {
              container = ProviderScope.containerOf(context);
              return const CalendarScreen();
            },
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    final entriesBefore =
        List.of(container!.read(communityHubControllerProvider).snapshot.calendarEntries);
    final anchorEntry = entriesBefore.first;

    await tester.tap(find.byIcon(Icons.more_vert).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Duplicate next week'));
    await tester.pumpAndSettle();

    expect(find.text('Event duplicated to next week'), findsOneWidget);

    final entriesAfter =
        container!.read(communityHubControllerProvider).snapshot.calendarEntries;
    expect(entriesAfter.length, entriesBefore.length + 1);

    final duplicate = entriesAfter.lastWhere((entry) => entry.title == anchorEntry.title);
    expect(duplicate.startTime.difference(anchorEntry.startTime), const Duration(days: 7));
    expect(
      duplicate.endTime.difference(duplicate.startTime),
      anchorEntry.endTime.difference(anchorEntry.startTime),
    );
  });
}
