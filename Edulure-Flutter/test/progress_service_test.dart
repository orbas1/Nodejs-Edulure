import 'dart:io';

import 'package:edulure_mobile/provider/learning/learning_models.dart';
import 'package:edulure_mobile/services/progress_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

class _FakePersistence extends LearningPersistence {
  List<ModuleProgressLog>? _logs;

  @override
  Future<List<Course>?> loadCourses() async => null;

  @override
  Future<void> saveCourses(List<Course> courses) async {}

  @override
  Future<List<Ebook>?> loadEbooks() async => null;

  @override
  Future<void> saveEbooks(List<Ebook> ebooks) async {}

  @override
  Future<List<Tutor>?> loadTutors() async => null;

  @override
  Future<void> saveTutors(List<Tutor> tutors) async {}

  @override
  Future<List<LiveSession>?> loadLiveSessions() async => null;

  @override
  Future<void> saveLiveSessions(List<LiveSession> sessions) async {}

  @override
  Future<List<ModuleProgressLog>?> loadProgressLogs() async => _logs;

  @override
  Future<void> saveProgressLogs(List<ModuleProgressLog> logs) async {
    _logs = List<ModuleProgressLog>.from(logs);
  }

  @override
  Future<void> reset() async {
    _logs = null;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late _FakePersistence persistence;
  late ProgressService service;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('progress-service-test');
    Hive.init(tempDir.path);
    persistence = _FakePersistence();
    service = ProgressService(
      persistence: persistence,
      hive: Hive,
      clock: () => DateTime(2024, 1, 8, 12),
    );
    await service.ensureReady();
  });

  tearDown(() async {
    await service.dispose();
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  test('enqueueLog stores pending task and emits through stream', () async {
    final log = ModuleProgressLog(
      id: 'log-1',
      courseId: 'course-1',
      moduleId: 'module-1',
      timestamp: DateTime(2024, 1, 7, 9),
      notes: 'Completed two lessons',
      completedLessons: 2,
    );

    final streamFuture = service.watchQueue().skip(1).first;
    await service.enqueueLog(log, offline: true);
    final queue = await service.listQueue();
    expect(queue, hasLength(1));
    expect(queue.first.status, ProgressSyncStatus.pending);

    final emitted = await streamFuture;
    expect(emitted, hasLength(1));
    expect(emitted.first.logId, 'log-1');
  });

  test('markSynced removes task from queue', () async {
    final log = ModuleProgressLog(
      id: 'log-2',
      courseId: 'course-1',
      moduleId: 'module-2',
      timestamp: DateTime(2024, 1, 6, 10),
      notes: 'Uploaded blocker notes',
      completedLessons: 1,
    );

    final task = await service.enqueueLog(log, offline: true);
    expect(task, isNotNull);
    await service.markSynced(task!.id);
    final queue = await service.listQueue();
    expect(queue, isEmpty);
  });

  test('retryFailed transitions task back to pending', () async {
    final log = ModuleProgressLog(
      id: 'log-3',
      courseId: 'course-1',
      moduleId: 'module-2',
      timestamp: DateTime(2024, 1, 5, 15),
      notes: 'Drafted assessments',
      completedLessons: 1,
    );

    final task = await service.enqueueLog(log, offline: true);
    expect(task, isNotNull);
    await service.markFailed(task!.id, 'network unreachable');
    var queue = await service.listQueue();
    expect(queue.single.status, ProgressSyncStatus.failed);

    await service.retryFailed(task.id);
    queue = await service.listQueue();
    expect(queue.single.status, ProgressSyncStatus.pending);
    expect(queue.single.errorMessage, isNull);
  });

  test('buildPortfolioAnalytics summarises lessons and queue state', () async {
    final course = Course(
      id: 'course-1',
      title: 'Launch Playbook',
      category: 'Operations',
      level: 'Intermediate',
      summary: 'Ship repeatable launch cadences.',
      thumbnailUrl: 'https://example.com/thumbnail.png',
      price: 0,
      modules: const [
        CourseModule(
          id: 'module-1',
          title: 'Foundation',
          lessonCount: 4,
          durationMinutes: 120,
          completedLessons: 2,
        ),
        CourseModule(
          id: 'module-2',
          title: 'Execution',
          lessonCount: 5,
          durationMinutes: 140,
          completedLessons: 1,
        ),
      ],
      language: 'English',
      tags: const ['Launch', 'Playbook'],
      isPublished: true,
    );

    final logs = [
      ModuleProgressLog(
        id: 'log-a',
        courseId: 'course-1',
        moduleId: 'module-1',
        timestamp: DateTime(2024, 1, 6, 8),
        notes: 'Completed discovery interviews',
        completedLessons: 2,
      ),
      ModuleProgressLog(
        id: 'log-b',
        courseId: 'course-1',
        moduleId: 'module-2',
        timestamp: DateTime(2024, 1, 7, 18),
        notes: 'Drafted assessment rubric',
        completedLessons: 1,
      ),
    ];

    await service.enqueueLog(logs[0], offline: true);
    await service.enqueueLog(logs[1], offline: true);

    final analytics = service.buildPortfolioAnalytics(courses: [course], logs: logs);
    expect(analytics.averageCourseCompletion, closeTo(0.333, 0.001));
    expect(analytics.logsThisWeek, 2);
    expect(analytics.pendingSyncs, 2);
    expect(analytics.backlogLessons, 6);
    expect(analytics.averageLessonsPerLog, closeTo(1.5, 0.001));
    expect(analytics.averageDailyVelocity, closeTo(1.0, 0.001));
    expect(analytics.activeCourseCount, 1);
  });
}
