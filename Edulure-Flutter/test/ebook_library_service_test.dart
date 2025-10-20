import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:edulure_mobile/provider/learning/learning_models.dart';
import 'package:edulure_mobile/services/ebook_library_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late EbookLibraryService service;
  late _FakeDio fakeDio;
  late Future<Directory> Function() libraryBuilder;
  late _TestClock testClock;
  late List<EbookLibraryService> disposables;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('ebook-library-service-test');
    Hive.init(tempDir.path);
    fakeDio = _FakeDio();
    testClock = _TestClock(DateTime(2024, 1, 1, 12));
    libraryBuilder = () async {
      final directory = Directory('${tempDir.path}/library');
      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }
      return directory;
    };
    disposables = <EbookLibraryService>[];
    service = EbookLibraryService(
      httpClient: fakeDio,
      libraryDirectoryBuilder: libraryBuilder,
      clock: testClock.call,
    );
    disposables.add(service);
    await service.ensureReady();
  });

  tearDown(() async {
    for (final instance in disposables.reversed) {
      await instance.dispose();
    }
    disposables.clear();
    await _disposeBox('ebook_library.files');
    await _disposeBox('ebook_library.progress');
    await _disposeBox('ebook_library.preferences');
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  test('ensureDownloaded caches file path and avoids duplicate downloads', () async {
    final ebook = _buildEbook(
      id: 'ebook-1',
      title: "Where's my E-Book?",
      fileUrl: 'https://cdn.edulure.com/assets/library/ebook-1.epub?signature=abc',
    );

    final firstPath = await service.ensureDownloaded(ebook);
    final firstFile = File(firstPath);
    expect(firstFile.existsSync(), isTrue);
    expect(firstFile.readAsStringSync(), contains('ebook-1'));
    expect(
      firstPath.split(Platform.pathSeparator).last,
      matches(RegExp(r'^ebook-1-wheres-my-e-book\.epub$')),
    );

    expect(fakeDio.downloadCalls, 1);

    final secondPath = await service.ensureDownloaded(ebook);
    expect(secondPath, firstPath);
    expect(fakeDio.downloadCalls, 1);
  });

  test('ensureDownloaded reuses in-flight download for duplicate requests', () async {
    final controlledDio = _ControlledDio();
    testClock = _TestClock(DateTime(2024, 1, 1, 12));
    service = EbookLibraryService(
      httpClient: controlledDio,
      libraryDirectoryBuilder: libraryBuilder,
      clock: testClock.call,
    );
    disposables.add(service);
    await service.ensureReady();

    final ebook = _buildEbook(
      id: 'ebook-3',
      fileUrl: 'https://cdn.edulure.com/assets/library/ebook-3.epub',
    );

    final firstFuture = service.ensureDownloaded(ebook);
    await controlledDio.started.future;
    final secondFuture = service.ensureDownloaded(ebook);

    controlledDio.allowCompletion.complete();

    final results = await Future.wait([firstFuture, secondFuture]);
    expect(results[0], results[1]);
    expect(controlledDio.downloadCalls, 1);
  });

  test('ensureDownloaded recreates missing directory and invalidates stale entries', () async {
    final ebook = _buildEbook(
      id: 'ebook-4',
      fileUrl: 'https://cdn.edulure.com/assets/library/ebook-4.pdf',
    );

    final firstPath = await service.ensureDownloaded(ebook);
    final firstFile = File(firstPath);
    expect(firstFile.existsSync(), isTrue);

    final libraryDir = Directory('${tempDir.path}/library');
    await libraryDir.delete(recursive: true);
    expect(await libraryDir.exists(), isFalse);

    final secondPath = await service.ensureDownloaded(ebook);
    expect(secondPath, firstPath);
    expect(File(secondPath).existsSync(), isTrue);
    expect(fakeDio.downloadCalls, 2);

    final filesBox = Hive.box<dynamic>('ebook_library.files');
    final cached = filesBox.get(ebook.id);
    expect(cached, isA<Map>());
    final cachedMap = Map<String, dynamic>.from(cached as Map);
    expect(cachedMap['path'], secondPath);
    expect(cachedMap['size'], greaterThan(0));
  });

  test('loadReaderPreferences restores persisted settings', () async {
    const saved = ReaderPreferences(
      theme: ReaderThemePreference.dark,
      fontScale: 1.2,
    );

    await service.saveReaderPreferences(saved);

    final freshService = EbookLibraryService(
      httpClient: fakeDio,
      libraryDirectoryBuilder: libraryBuilder,
    );
    disposables.add(freshService);
    await freshService.ensureReady();

    final restored = freshService.loadReaderPreferences();

    expect(restored.theme, ReaderThemePreference.dark);
    expect(restored.fontScale, closeTo(1.2, 0.001));
  });

  test('ensureDownloaded cleans up partial files when download fails', () async {
    final failingDio = _FailingDio();
    final failingService = EbookLibraryService(
      httpClient: failingDio,
      libraryDirectoryBuilder: libraryBuilder,
      clock: testClock.call,
    );
    disposables.add(failingService);
    await failingService.ensureReady();

    final ebook = _buildEbook(
      id: 'ebook-2',
      fileUrl: 'https://cdn.edulure.com/assets/library/ebook-2.epub',
    );

    expect(
      () => failingService.ensureDownloaded(ebook),
      throwsA(isA<EbookDownloadException>()),
    );

    final libraryDir = await libraryBuilder();
    final contents = libraryDir.listSync(recursive: true, followLinks: false);
    expect(contents, isEmpty);

    final filesBox = Hive.box<dynamic>('ebook_library.files');
    expect(filesBox.get(ebook.id), isNull);
  });

  test('ensureDownloaded persists metadata and updates lastAccessed on reuse', () async {
    final ebook = _buildEbook(
      id: 'ebook-meta',
      fileUrl: 'https://cdn.edulure.com/assets/library/ebook-meta.epub',
    );

    final path = await service.ensureDownloaded(ebook);
    final filesBox = Hive.box<dynamic>('ebook_library.files');
    final cached = Map<String, dynamic>.from(filesBox.get(ebook.id) as Map);

    expect(cached['path'], path);
    expect(cached['size'], greaterThan(0));
    final firstAccessed = cached['lastAccessed'] as int;

    testClock.advance(const Duration(minutes: 5));
    final reusedPath = await service.ensureDownloaded(ebook);

    expect(reusedPath, path);

    final updated = Map<String, dynamic>.from(filesBox.get(ebook.id) as Map);
    expect(updated['lastAccessed'], greaterThan(firstAccessed));
    expect(updated['ebook'], isA<Map>());
  });

  test('max cache size evicts least recently used downloads', () async {
    final limitedService = EbookLibraryService(
      httpClient: _SizedDio(40),
      libraryDirectoryBuilder: libraryBuilder,
      maxCacheSizeBytes: 100,
      clock: testClock.call,
    );
    disposables.add(limitedService);
    await limitedService.ensureReady();

    final ebookA = _buildEbook(
      id: 'ebook-a',
      fileUrl: 'https://cdn.edulure.com/assets/library/ebook-a.epub',
    );
    final ebookB = _buildEbook(
      id: 'ebook-b',
      fileUrl: 'https://cdn.edulure.com/assets/library/ebook-b.epub',
    );
    final ebookC = _buildEbook(
      id: 'ebook-c',
      fileUrl: 'https://cdn.edulure.com/assets/library/ebook-c.epub',
    );

    final pathA = await limitedService.ensureDownloaded(ebookA);
    final pathB = await limitedService.ensureDownloaded(ebookB);

    testClock.advance(const Duration(minutes: 1));
    await limitedService.ensureDownloaded(ebookA);

    testClock.advance(const Duration(minutes: 1));
    final pathC = await limitedService.ensureDownloaded(ebookC);

    expect(limitedService.isDownloaded(ebookA.id), isTrue);
    expect(limitedService.isDownloaded(ebookC.id), isTrue);

    await Future<void>.delayed(const Duration(milliseconds: 10));

    expect(limitedService.isDownloaded(ebookB.id), isFalse);
    expect(File(pathB).existsSync(), isFalse);
    expect(File(pathA).existsSync(), isTrue);
    expect(File(pathC).existsSync(), isTrue);

    final filesBox = Hive.box<dynamic>('ebook_library.files');
    expect(filesBox.get(ebookB.id), isNull);
  });

  test('isDownloaded upgrades legacy string cache entries', () async {
    final filesBox = Hive.box<dynamic>('ebook_library.files');
    final legacy = _buildEbook(
      id: 'legacy-ebook',
      fileUrl: 'https://cdn.edulure.com/assets/library/legacy.epub',
    );
    final legacyPath = '${tempDir.path}/library/legacy.epub';
    final legacyFile = File(legacyPath)..createSync(recursive: true);
    legacyFile.writeAsStringSync('legacy data');

    await filesBox.put(legacy.id, legacyPath);

    expect(service.isDownloaded(legacy.id), isTrue);

    await Future<void>.delayed(const Duration(milliseconds: 10));

    final upgraded = filesBox.get(legacy.id);
    expect(upgraded, isA<Map>());
    final map = Map<String, dynamic>.from(upgraded as Map);
    expect(map['path'], legacyPath);
    expect(map['size'], greaterThan(0));

    final downloaded = await service.getDownload(legacy.id);
    expect(downloaded, isNotNull);
    expect(downloaded!.path, legacyPath);
    expect(downloaded.ebook.title, legacy.id);
  });

  test('listDownloads returns enriched metadata sorted by recency', () async {
    final ebookA = _buildEbook(
      id: 'ebook-alpha',
      title: 'Alpha Case Study',
      author: 'Author A',
      fileUrl: 'https://cdn.edulure.com/assets/library/ebook-alpha.epub',
    );
    final ebookB = _buildEbook(
      id: 'ebook-beta',
      title: 'Beta Playbook',
      author: 'Author B',
      fileUrl: 'https://cdn.edulure.com/assets/library/ebook-beta.epub',
    );

    final pathA = await service.ensureDownloaded(ebookA);
    testClock.advance(const Duration(minutes: 2));
    await service.ensureDownloaded(ebookB);
    testClock.advance(const Duration(minutes: 1));
    await service.ensureDownloaded(ebookA);

    final downloads = await service.listDownloads();

    expect(downloads, hasLength(2));
    expect(downloads.first.ebook.id, ebookA.id);
    expect(downloads.first.ebook.title, 'Alpha Case Study');
    expect(downloads.first.ebook.downloaded, isTrue);
    expect(downloads.first.path, pathA);
    expect(downloads.first.sizeBytes, greaterThan(0));
    expect(downloads.first.lastAccessedAt.isAfter(downloads.first.downloadedAt) ||
        downloads.first.lastAccessedAt == downloads.first.downloadedAt, isTrue);
    expect(downloads.last.ebook.id, ebookB.id);
  });

  test('ensureDownloaded refreshes stored metadata when ebook changes', () async {
    final ebook = _buildEbook(
      id: 'ebook-refresh',
      title: 'First Edition',
      author: 'Original Author',
      fileUrl: 'https://cdn.edulure.com/assets/library/ebook-refresh.epub',
    );

    final path = await service.ensureDownloaded(ebook);
    expect(fakeDio.downloadCalls, 1);

    final updated = ebook.copyWith(
      title: 'Updated Edition',
      author: 'Revised Author',
    );
    final refreshedPath = await service.ensureDownloaded(updated);

    expect(fakeDio.downloadCalls, 1);
    expect(refreshedPath, path);

    final metadata = await service.getDownload(ebook.id);
    expect(metadata, isNotNull);
    expect(metadata!.path, path);
    expect(metadata.ebook.title, 'Updated Edition');
    expect(metadata.ebook.author, 'Revised Author');
  });

  test('watchDownloads emits updates for library lifecycle events', () async {
    final updates = <List<DownloadedEbook>>[];
    final subscription = service.watchDownloads().listen(updates.add);

    await pumpEventQueue();

    expect(updates, isNotEmpty);
    expect(updates.last, isEmpty);

    final ebookA = _buildEbook(
      id: 'watch-1',
      title: 'Watch One',
      fileUrl: 'https://cdn.edulure.com/assets/library/watch-1.epub',
    );
    final ebookB = _buildEbook(
      id: 'watch-2',
      title: 'Watch Two',
      fileUrl: 'https://cdn.edulure.com/assets/library/watch-2.epub',
    );

    await service.ensureDownloaded(ebookA);
    await pumpEventQueue();
    expect(updates.last.map((download) => download.ebook.id), contains(ebookA.id));

    await service.ensureDownloaded(ebookB);
    await pumpEventQueue();
    expect(
      updates.last.map((download) => download.ebook.id),
      containsAll(<String>[ebookA.id, ebookB.id]),
    );

    await service.removeDownload(ebookA.id);
    await pumpEventQueue();
    expect(updates.last.map((download) => download.ebook.id), [ebookB.id]);

    await service.clearAll();
    await pumpEventQueue();
    expect(updates.last, isEmpty);

    final recorded = updates.length;
    await subscription.cancel();

    await service.ensureDownloaded(_buildEbook(
      id: 'watch-3',
      fileUrl: 'https://cdn.edulure.com/assets/library/watch-3.epub',
    ));
    await pumpEventQueue();
    expect(updates.length, recorded);
  });
}

Future<void> _disposeBox(String name) async {
  if (Hive.isBoxOpen(name)) {
    final box = Hive.box(name);
    await box.clear();
    await box.close();
  }
  try {
    await Hive.deleteBoxFromDisk(name);
  } catch (_) {
    // Box may already be removed; ignore.
  }
}

Ebook _buildEbook({
  required String id,
  required String fileUrl,
  String title = 'Sample Ebook',
}) {
  return Ebook(
    id: id,
    title: title,
    author: 'Jane Author',
    coverUrl: 'https://cdn.edulure.com/covers/$id.png',
    fileUrl: fileUrl,
    description: 'An educational case study.',
    language: 'English',
    tags: const ['case-study'],
    chapters: const [],
  );
}

class _FakeDio extends Dio {
  int downloadCalls = 0;

  @override
  Future<Response<dynamic>> download(
    String urlPath,
    dynamic savePath, {
    ProgressCallback? onReceiveProgress,
    CancelToken? cancelToken,
    bool deleteOnError = true,
    String lengthHeader = Headers.contentLengthHeader,
    Object? data,
    Options? options,
  }) async {
    downloadCalls++;
    final file = File(savePath.toString());
    await file.create(recursive: true);
    await file.writeAsString('mocked data for $urlPath');
    return Response<dynamic>(
      requestOptions: RequestOptions(path: urlPath),
      statusCode: 200,
    );
  }
}

class _ControlledDio extends Dio {
  final Completer<void> started = Completer<void>();
  final Completer<void> allowCompletion = Completer<void>();
  int downloadCalls = 0;

  @override
  Future<Response<dynamic>> download(
    String urlPath,
    dynamic savePath, {
    ProgressCallback? onReceiveProgress,
    CancelToken? cancelToken,
    bool deleteOnError = true,
    String lengthHeader = Headers.contentLengthHeader,
    Object? data,
    Options? options,
  }) async {
    downloadCalls++;
    if (!started.isCompleted) {
      started.complete();
    }
    await allowCompletion.future;
    final file = File(savePath.toString());
    await file.create(recursive: true);
    await file.writeAsString('controlled data for $urlPath');
    return Response<dynamic>(
      requestOptions: RequestOptions(path: urlPath),
      statusCode: 200,
    );
  }
}

class _FailingDio extends Dio {
  int attempts = 0;

  @override
  Future<Response<dynamic>> download(
    String urlPath,
    dynamic savePath, {
    ProgressCallback? onReceiveProgress,
    CancelToken? cancelToken,
    bool deleteOnError = true,
    String lengthHeader = Headers.contentLengthHeader,
    Object? data,
    Options? options,
  }) async {
    attempts++;
    final file = File(savePath.toString());
    await file.create(recursive: true);
    await file.writeAsString('partial data');
    throw DioException(
      requestOptions: RequestOptions(path: urlPath),
      error: 'Simulated offline mode',
      type: DioExceptionType.connectionError,
    );
  }
}

class _SizedDio extends Dio {
  _SizedDio(this.bytes);

  final int bytes;
  int downloadCalls = 0;

  @override
  Future<Response<dynamic>> download(
    String urlPath,
    dynamic savePath, {
    ProgressCallback? onReceiveProgress,
    CancelToken? cancelToken,
    bool deleteOnError = true,
    String lengthHeader = Headers.contentLengthHeader,
    Object? data,
    Options? options,
  }) async {
    downloadCalls++;
    final file = File(savePath.toString());
    await file.create(recursive: true);
    await file.writeAsBytes(List<int>.filled(bytes, downloadCalls));
    return Response<dynamic>(
      requestOptions: RequestOptions(path: urlPath),
      statusCode: 200,
    );
  }
}

class _TestClock {
  _TestClock(DateTime seed) : _current = seed;

  DateTime _current;

  DateTime call() => _current;

  void advance(Duration delta) {
    _current = _current.add(delta);
  }
}
