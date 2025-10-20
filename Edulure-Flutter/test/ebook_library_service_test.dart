import 'dart:io';

import 'package:dio/dio.dart';
import 'package:edulure_mobile/provider/learning/learning_models.dart';
import 'package:edulure_mobile/services/content_service.dart';
import 'package:edulure_mobile/services/ebook_library_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late EbookLibraryService service;
  late _FakeDio fakeDio;
  late Future<Directory> Function() libraryBuilder;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('ebook-library-service-test');
    Hive.init(tempDir.path);
    fakeDio = _FakeDio();
    libraryBuilder = () async {
      final directory = Directory('${tempDir.path}/library');
      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }
      return directory;
    };
    service = EbookLibraryService(
      httpClient: fakeDio,
      libraryDirectoryBuilder: libraryBuilder,
    );
    await service.ensureReady();
  });

  tearDown(() async {
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
    );
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
