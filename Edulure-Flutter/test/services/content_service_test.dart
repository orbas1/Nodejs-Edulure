import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

import 'package:edulure_mobile/services/content_service.dart';

import 'test_http_adapter.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late Box assetsBox;
  late Box downloadsBox;
  late Box progressBox;
  late Box prefsBox;

  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('content_service_test');
    Hive.init(tempDir.path);
  });

  setUp(() async {
    assetsBox = await Hive.openBox('assets-cache');
    downloadsBox = await Hive.openBox('downloads-cache');
    progressBox = await Hive.openBox('progress-cache');
    prefsBox = await Hive.openBox('prefs-cache');
  });

  tearDown(() async {
    for (final name in Hive.boxNames.toList(growable: false)) {
      if (Hive.isBoxOpen(name)) {
        final box = Hive.box(name);
        await box.clear();
        await box.close();
      }
      await Hive.deleteBoxFromDisk(name);
    }
  });

  TestHttpClientAdapter buildAdapter(Map<String, dynamic> payload, {int statusCode = 200}) {
    return TestHttpClientAdapter((options, _) async {
      return ResponseBody.fromString(
        jsonEncode(payload),
        statusCode,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
      );
    });
  }

  ContentService buildService(Dio dio) {
    return ContentService(
      client: dio,
      tokenProvider: () => 'token',
      assetsCache: assetsBox,
      downloadsCache: downloadsBox,
      ebookProgressCache: progressBox,
      readerSettingsCache: prefsBox,
      documentsDirectoryProvider: () async => Directory.systemTemp,
    );
  }

  test('fetchAssets caches fetched content assets', () async {
    final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
    dio.httpClientAdapter = buildAdapter({
      'data': [
        {
          'publicId': 'asset-1',
          'originalFilename': 'playbook.pdf',
          'type': 'ebook',
          'status': 'available',
        },
      ],
    });

    final service = buildService(dio);

    final assets = await service.fetchAssets();

    expect(assets.single.publicId, 'asset-1');
    final cached = assetsBox.get('items') as List<dynamic>;
    expect(cached.length, 1);
  });

  test('fetchAssets clears cache when access denied', () async {
    await assetsBox.put('items', [
      {'publicId': 'asset-2', 'originalFilename': 'draft.pdf', 'type': 'ebook', 'status': 'processing'},
    ]);

    final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
    dio.httpClientAdapter = buildAdapter({'message': 'Forbidden'}, statusCode: 403);

    final service = buildService(dio);

    await expectLater(
      service.fetchAssets,
      throwsA(isA<ContentAccessDeniedException>()),
    );

    expect(assetsBox.get('items'), isNull);
  });

  test('loadCachedDownloads returns stored file paths', () async {
    await downloadsBox.put('asset-3', '/tmp/asset.pdf');

    final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
    final service = buildService(dio);

    final downloads = service.loadCachedDownloads();
    expect(downloads['asset-3'], '/tmp/asset.pdf');
  });
}
