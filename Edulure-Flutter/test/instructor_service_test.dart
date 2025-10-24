import 'dart:io';

import 'package:edulure_mobile/services/instructor_service.dart';
import 'package:edulure_mobile/services/scheduling_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late InstructorQuickActionsService service;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('instructor-quick-actions-test');
    Hive.init(tempDir.path);
    service = InstructorQuickActionsService(
      hive: Hive,
      clock: () => DateTime(2024, 1, 1, 8, 0),
    );
    await service.ensureReady();
  });

  tearDown(() async {
    await service.dispose();
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  test('ensureReady seeds quick actions and emits cached values', () async {
    final seeded = await service.listActions();
    expect(seeded, isNotEmpty);

    final firstEmission = await service.watchActions().first;
    expect(firstEmission, isNotEmpty);
    expect(firstEmission.length, seeded.length);
  });

  test('create and transition quick action updates cache', () async {
    final created = await service.createAction(
      title: 'Publish cohort recap',
      description: 'Send weekly recap to async leadership cohort.',
      dueAt: DateTime(2024, 1, 1, 12),
      requiresSync: true,
    );

    expect(created.status, InstructorQuickActionStatus.pending);
    expect(created.requiresSync, isTrue);

    await service.markInProgress(created.id);
    var fetched = (await service.listActions()).firstWhere((action) => action.id == created.id);
    expect(fetched.status, InstructorQuickActionStatus.inProgress);

    await service.markCompleted(created.id, requiresSync: true);
    fetched = (await service.listActions()).firstWhere((action) => action.id == created.id);
    expect(fetched.status, InstructorQuickActionStatus.completed);
    expect(fetched.requiresSync, isTrue);
    expect(fetched.completedAt, isNotNull);

    await service.markFailed(created.id, 'network error');
    fetched = (await service.listActions()).firstWhere((action) => action.id == created.id);
    expect(fetched.status, InstructorQuickActionStatus.failed);
    expect(fetched.failureReason, contains('network error'));

    await service.retryAction(created.id);
    fetched = (await service.listActions()).firstWhere((action) => action.id == created.id);
    expect(fetched.status, InstructorQuickActionStatus.pending);
    expect(fetched.requiresSync, isTrue);
    expect(fetched.failureReason, isNull);
  });

  test('syncOfflineActions clears requiresSync flag', () async {
    final created = await service.createAction(
      title: 'Follow up with sponsors',
      description: 'Send session analytics to partner sponsors.',
      dueAt: DateTime(2024, 1, 1, 18),
      requiresSync: true,
    );

    var fetched = (await service.listActions()).firstWhere((action) => action.id == created.id);
    expect(fetched.requiresSync, isTrue);

    await service.syncOfflineActions();
    fetched = (await service.listActions()).firstWhere((action) => action.id == created.id);
    expect(fetched.requiresSync, isFalse);
  });

  test('scheduling service generates aligned slots and workload summary', () async {
    final scheduling = InstructorSchedulingService(clock: () => DateTime(2024, 1, 1, 9, 7));
    final actions = await service.listActions();

    final slots = scheduling.generateSlots(actions: actions, maxSlots: 2);
    expect(slots, isNotEmpty);
    expect(slots.length, lessThanOrEqualTo(2));
    expect(slots.first.start.minute % 15, 0);
    expect(slots.first.end.difference(slots.first.start).inMinutes, scheduling.slotLength.inMinutes);

    final summary = scheduling.describeWorkload(actions);
    expect(summary, contains('actions pending'));
  });
}
