import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:edulure_mobile/services/content_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

class _RecordingAdapter extends HttpClientAdapter {
  _RecordingAdapter(this._handler);

  final ResponseBody Function(RequestOptions options) _handler;
  final List<RequestOptions> requests = <RequestOptions>[];

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return _handler(options);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late HiveInterface hive;
  late Box<dynamic> assetsBox;
  late Box<dynamic> downloadsBox;
  late Box<dynamic> progressBox;
  late Box<dynamic> readerBox;
  late Dio dio;
  late _RecordingAdapter adapter;
  late ContentService service;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('content-service');
    hive = HiveImpl()..init(tempDir.path);
    assetsBox = await hive.openBox<dynamic>('assets');
    downloadsBox = await hive.openBox<dynamic>('downloads');
    progressBox = await hive.openBox<dynamic>('progress');
    readerBox = await hive.openBox<dynamic>('reader');
    adapter = _RecordingAdapter((options) =>
        ResponseBody.fromString('{}', 500, headers: {Headers.contentTypeHeader: ['application/json']}));
    dio = Dio(BaseOptions(baseUrl: 'https://api.test'))..httpClientAdapter = adapter;
    service = ContentService(
      httpClient: dio,
      assetsCache: assetsBox,
      downloadsCache: downloadsBox,
      ebookProgressCache: progressBox,
      readerPreferencesCache: readerBox,
      accessTokenProvider: () => 'access-token',
    );
  });

  tearDown(() async {
    await assetsBox.clear();
    await downloadsBox.clear();
    await progressBox.clear();
    await readerBox.clear();
    await assetsBox.close();
    await downloadsBox.close();
    await progressBox.close();
    await readerBox.close();
    await hive.deleteBoxFromDisk('assets');
    await hive.deleteBoxFromDisk('downloads');
    await hive.deleteBoxFromDisk('progress');
    await hive.deleteBoxFromDisk('reader');
    await tempDir.delete(recursive: true);
  });

  test('fetchAssets hydrates cache and includes authorization header', () async {
    adapter = _RecordingAdapter((options) {
      final payload = jsonEncode({
        'data': [
          {
            'publicId': 'asset-1',
            'originalFilename': 'guide.pdf',
            'type': 'pdf',
            'status': 'ready',
          }
        ]
      });
      return ResponseBody.fromString(
        payload,
        200,
        headers: {Headers.contentTypeHeader: ['application/json']},
      );
    });
    dio.httpClientAdapter = adapter;

    final assets = await service.fetchAssets();

    expect(assets, hasLength(1));
    expect(assets.first.publicId, 'asset-1');
    expect(adapter.requests.single.headers['Authorization'], 'Bearer access-token');
    expect(assetsBox.get('items'), isNotEmpty);
  });

  test('fetchAssets falls back to cached data when unauthorized', () async {
    await assetsBox.put('items', [
      {
        'publicId': 'cached-1',
        'originalFilename': 'cached.pdf',
        'type': 'pdf',
        'status': 'ready',
      }
    ]);

    adapter = _RecordingAdapter((options) {
      return ResponseBody.fromString(
        jsonEncode({'message': 'expired'}),
        401,
        headers: {Headers.contentTypeHeader: ['application/json']},
      );
    });
    dio.httpClientAdapter = adapter;

    final assets = await service.fetchAssets();
    expect(assets, hasLength(1));
    expect(assets.single.publicId, 'cached-1');
    expect(assetsBox.get('items'), isNotEmpty);
  });

  test('fetchAssets surfaces access denials', () async {
    await assetsBox.put('items', []);
    adapter = _RecordingAdapter((options) {
      return ResponseBody.fromString(
        jsonEncode({'message': 'forbidden'}),
        403,
        headers: {Headers.contentTypeHeader: ['application/json']},
      );
    });
    dio.httpClientAdapter = adapter;

    expect(
      () => service.fetchAssets(),
      throwsA(isA<ContentAccessDeniedException>()),
    );
    expect(assetsBox.get('items'), isNull);
  });
}
