import 'dart:io';

import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';

import '../provider/learning/learning_models.dart';
import 'content_service.dart';
import 'ebook_reader_backend.dart';

class EbookDownloadException implements Exception {
  const EbookDownloadException(this.message, [this.cause]);

  final String message;
  final Object? cause;

  @override
  String toString() => cause == null ? message : '$message (${cause.toString()})';
}

class EbookLibraryService implements EbookReaderBackend {
  EbookLibraryService({
    Dio? httpClient,
    Future<Directory> Function()? libraryDirectoryBuilder,
  })  : _client = httpClient ?? Dio(BaseOptions(receiveTimeout: const Duration(seconds: 30))),
        _libraryDirectoryBuilder =
            libraryDirectoryBuilder ?? _defaultLibraryDirectoryBuilder;

  static const _filesBoxName = 'ebook_library.files';
  static const _progressBoxName = 'ebook_library.progress';
  static const _preferencesBoxName = 'ebook_library.preferences';

  final Dio _client;
  final Future<Directory> Function() _libraryDirectoryBuilder;
  Box<dynamic>? _filesBox;
  Box<dynamic>? _progressBox;
  Box<dynamic>? _preferencesBox;
  Directory? _libraryDirectory;
  Future<void>? _ensureReadyFuture;
  bool _ready = false;

  Future<void> ensureReady() async {
    if (_ready) {
      _hydrateSynchronousCaches();
      return;
    }
    if (_ensureReadyFuture != null) {
      return _ensureReadyFuture!;
    }
    final future = _initialize();
    _ensureReadyFuture = future;
    try {
      await future;
      _ready = true;
    } finally {
      _ensureReadyFuture = null;
    }
  }

  Future<String> ensureDownloaded(Ebook ebook) async {
    await ensureReady();
    final cached = _filesBox?.get(ebook.id);
    if (cached is String && await File(cached).exists()) {
      return cached;
    }
    final fileName = _buildFileName(ebook);
    final directory = _libraryDirectory!;
    final filePath = '${directory.path}/$fileName';
    final file = File(filePath);
    try {
      await _client.download(ebook.fileUrl, filePath);
      await _filesBox?.put(ebook.id, filePath);
      return filePath;
    } on DioException catch (error) {
      await _cleanupFailedDownload(file, ebook.id);
      throw EbookDownloadException(
        'Failed to download "${ebook.title}". Check your connection and try again.',
        error,
      );
    } catch (error) {
      await _cleanupFailedDownload(file, ebook.id);
      throw EbookDownloadException(
        'Failed to save "${ebook.title}" to your offline library.',
        error,
      );
    }
  }

  Future<void> removeDownload(String ebookId) async {
    await ensureReady();
    final cached = _filesBox?.get(ebookId);
    if (cached is String) {
      final file = File(cached);
      if (await file.exists()) {
        await file.delete();
      }
      await _filesBox?.delete(ebookId);
    }
  }

  bool isDownloaded(String ebookId) {
    _filesBox ??= _maybeOpenBox(_filesBoxName);
    final cached = _filesBox?.get(ebookId);
    if (cached is String) {
      final file = File(cached);
      return file.existsSync();
    }
    return false;
  }

  Future<EbookProgress?> loadCachedProgress(String ebookId) async {
    await ensureReady();
    final data = _progressBox?.get(ebookId);
    if (data is Map) {
      return EbookProgress.fromJson(Map<String, dynamic>.from(data as Map));
    }
    return null;
  }

  Future<void> clearAll() async {
    await ensureReady();
    final downloads = List<MapEntry<dynamic, dynamic>>.from(_filesBox?.toMap().entries ?? const []);
    for (final entry in downloads) {
      final value = entry.value;
      if (value is String) {
        final file = File(value);
        if (await file.exists()) {
          await file.delete();
        }
      }
    }
    await _filesBox?.clear();
    await _progressBox?.clear();
  }

  @override
  ReaderPreferences loadReaderPreferences() {
    _preferencesBox ??= _maybeOpenBox(_preferencesBoxName);
    final raw = _preferencesBox?.get('preferences');
    if (raw is Map) {
      return ReaderPreferences.fromJson(Map<String, dynamic>.from(raw as Map));
    }
    return const ReaderPreferences();
  }

  @override
  Future<void> saveReaderPreferences(ReaderPreferences preferences) async {
    await ensureReady();
    await _preferencesBox?.put('preferences', preferences.toJson());
  }

  @override
  Future<void> cacheEbookProgress(String assetId, EbookProgress progress) async {
    await ensureReady();
    await _progressBox?.put(assetId, progress.toJson());
  }

  @override
  Future<void> updateProgress(String assetId, double progressPercent) async {
    await ensureReady();
    final previous = await loadCachedProgress(assetId);
    final next = (previous ?? EbookProgress(progressPercent: progressPercent)).copyWith(
      progressPercent: progressPercent,
    );
    await cacheEbookProgress(assetId, next);
  }

  Future<Directory> _prepareLibraryDirectory() async {
    return _libraryDirectoryBuilder();
  }

  String _buildFileName(Ebook ebook) {
    final uri = Uri.tryParse(ebook.fileUrl);
    final extension = uri?.pathSegments.isNotEmpty == true ? uri!.pathSegments.last.split('.').last : 'epub';
    final sanitized = ebook.title
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-');
    return '${ebook.id}-$sanitized.$extension';
  }

  Future<void> _initialize() async {
    _filesBox ??= await Hive.openBox<dynamic>(_filesBoxName);
    _progressBox ??= await Hive.openBox<dynamic>(_progressBoxName);
    _preferencesBox ??= await Hive.openBox<dynamic>(_preferencesBoxName);
    _libraryDirectory ??= await _prepareLibraryDirectory();
    _hydrateSynchronousCaches();
  }

  Future<void> _cleanupFailedDownload(File file, String ebookId) async {
    if (await file.exists()) {
      await file.delete();
    }
    await _filesBox?.delete(ebookId);
  }

  void _hydrateSynchronousCaches() {
    _filesBox ??= _maybeOpenBox(_filesBoxName);
    _progressBox ??= _maybeOpenBox(_progressBoxName);
    _preferencesBox ??= _maybeOpenBox(_preferencesBoxName);
  }

  Box<dynamic>? _maybeOpenBox(String name) {
    if (Hive.isBoxOpen(name)) {
      return Hive.box<dynamic>(name);
    }
    return null;
  }

  static Future<Directory> _defaultLibraryDirectoryBuilder() async {
    final root = await getApplicationDocumentsDirectory();
    final directory = Directory('${root.path}/edulure/library');
    if (!await directory.exists()) {
      await directory.create(recursive: true);
    }
    return directory;
  }
}
