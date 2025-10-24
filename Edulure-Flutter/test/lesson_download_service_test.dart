import 'dart:io';

import 'package:edulure_mobile/services/lesson_download_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late LessonDownloadService service;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('lesson-download-service-test');
    Hive.init(tempDir.path);
    service = LessonDownloadService(
      hive: Hive,
      simulateDownloads: false,
      clock: () => DateTime(2024, 1, 1, 12),
    );
    await service.ensureReady();
  });

  tearDown(() async {
    await service.dispose();
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  test('queueDownload persists record and emits through watcher', () async {
    final streamFuture = service.watchDownloads().skip(1).first;
    final record = await service.queueDownload(
      courseId: 'course-1',
      moduleId: 'module-1',
      moduleTitle: 'Launch Readiness',
      assetUrls: const ['https://cdn.edulure.com/courses/course-1/module-1.zip'],
      expectedSizeBytes: 2048,
    );

    expect(record.status, LessonDownloadStatus.queued);
    final records = await streamFuture;
    expect(records, hasLength(1));
    expect(records.first.moduleId, 'module-1');
    expect(records.first.assetUrls, isNotEmpty);
  });

  test('updateProgress and markCompleted update manifest details', () async {
    final record = await service.queueDownload(
      courseId: 'course-2',
      moduleId: 'module-2',
      moduleTitle: 'Persona Frameworks',
      assetUrls: const ['https://cdn.edulure.com/courses/course-2/module-2.mp4'],
      expectedSizeBytes: 4096,
    );

    await service.updateProgress(record.id, 0.5, downloadedBytes: 2048);
    final midway = (await service.listDownloads()).single;
    expect(midway.progress, closeTo(0.5, 0.01));
    expect(midway.downloadedBytes, 2048);

    await service.markCompleted(record.id, downloadedBytes: 4096, manifestPath: '/offline/custom');
    final completed = (await service.listDownloads()).single;
    expect(completed.status, LessonDownloadStatus.completed);
    expect(completed.manifestPath, '/offline/custom');
    expect(completed.downloadedBytes, 4096);
  });

  test('cancelDownload marks record failed and removeDownload clears it', () async {
    final record = await service.queueDownload(
      courseId: 'course-3',
      moduleId: 'module-3',
      moduleTitle: 'Telemetry Fundamentals',
      assetUrls: const ['https://cdn.edulure.com/courses/course-3/module-3.pdf'],
    );

    await service.cancelDownload(record.id, reason: 'user aborted');
    final cancelled = (await service.listDownloads()).single;
    expect(cancelled.status, LessonDownloadStatus.failed);
    expect(cancelled.errorMessage, contains('user aborted'));

    await service.removeDownload(record.id);
    final remaining = await service.listDownloads();
    expect(remaining, isEmpty);
  });
}
