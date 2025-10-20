import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';

import '../provider/learning/learning_models.dart';
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
    int? maxCacheSizeBytes,
    DateTime Function()? clock,
  })  : assert(maxCacheSizeBytes == null || maxCacheSizeBytes > 0,
            'maxCacheSizeBytes must be a positive integer.'),
        _client = httpClient ?? Dio(BaseOptions(receiveTimeout: const Duration(seconds: 30))),
        _libraryDirectoryBuilder =
            libraryDirectoryBuilder ?? _defaultLibraryDirectoryBuilder,
        _maxCacheSizeBytes = maxCacheSizeBytes,
        _clock = clock ?? () => DateTime.now();

  static const _filesBoxName = 'ebook_library.files';
  static const _progressBoxName = 'ebook_library.progress';
  static const _preferencesBoxName = 'ebook_library.preferences';

  final Dio _client;
  final Future<Directory> Function() _libraryDirectoryBuilder;
  final int? _maxCacheSizeBytes;
  final DateTime Function() _clock;
  Box<dynamic>? _filesBox;
  Box<dynamic>? _progressBox;
  Box<dynamic>? _preferencesBox;
  Directory? _libraryDirectory;
  Future<void>? _ensureReadyFuture;
  bool _ready = false;
  final Map<String, Future<String>> _inFlightDownloads = <String, Future<String>>{};

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
    final cachedPath = await _validateCachedDownload(ebook.id);
    if (cachedPath != null) {
      return cachedPath;
    }

    return _inFlightDownloads.putIfAbsent(ebook.id, () async {
      try {
        final cachedWhileQueued = await _validateCachedDownload(ebook.id);
        if (cachedWhileQueued != null) {
          return cachedWhileQueued;
        }

        final directory = await _resolveLibraryDirectory();
        final fileName = _buildFileName(ebook);
        final filePath = '${directory.path}/$fileName';
        final file = File(filePath);
        await file.parent.create(recursive: true);

        try {
          await _client.download(ebook.fileUrl, filePath);
          final metadata = await _buildCacheEntry(filePath);
          await _filesBox?.put(ebook.id, metadata.toJson());
          await _rebalanceCache(exemptId: ebook.id);
          return metadata.path;
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
      } finally {
        _inFlightDownloads.remove(ebook.id);
      }
    });
  }

  Future<void> removeDownload(String ebookId) async {
    await ensureReady();
    final cached = await _resolveCacheEntry(ebookId);
    if (cached != null) {
      final file = File(cached.path);
      if (await file.exists()) {
        await file.delete();
      }
    }
    await _filesBox?.delete(ebookId);
  }

  bool isDownloaded(String ebookId) {
    _filesBox ??= _maybeOpenBox(_filesBoxName);
    final raw = _filesBox?.get(ebookId);
    final cached = _CachedFile.fromHive(raw);
    if (cached == null) {
      if (raw != null) {
        unawaited(_filesBox?.delete(ebookId));
      }
      return false;
    }
    final file = File(cached.path);
    final exists = file.existsSync();
    if (!exists) {
      unawaited(_filesBox?.delete(ebookId));
      return false;
    }
    final touched = cached.touch(_clock());
    unawaited(_filesBox?.put(ebookId, touched.toJson()));
    return true;
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
      final cached = _CachedFile.fromHive(entry.value);
      if (cached == null) {
        continue;
      }
      final file = File(cached.path);
      if (await file.exists()) {
        await file.delete();
      }
    }
    await _filesBox?.clear();
    await _progressBox?.clear();
    await _preferencesBox?.clear();
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
    await _rebalanceCache();
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

  Future<String?> _validateCachedDownload(String ebookId) async {
    final cached = await _resolveCacheEntry(ebookId);
    if (cached == null) {
      return null;
    }
    final touched = cached.touch(_clock());
    await _filesBox?.put(ebookId, touched.toJson());
    return touched.path;
  }

  Box<dynamic>? _maybeOpenBox(String name) {
    if (Hive.isBoxOpen(name)) {
      return Hive.box<dynamic>(name);
    }
    return null;
  }

  Future<Directory> _resolveLibraryDirectory() async {
    final directory = _libraryDirectory ??= await _prepareLibraryDirectory();
    if (!await directory.exists()) {
      await directory.create(recursive: true);
    }
    return directory;
  }

  static Future<Directory> _defaultLibraryDirectoryBuilder() async {
    final root = await getApplicationDocumentsDirectory();
    final directory = Directory('${root.path}/edulure/library');
    if (!await directory.exists()) {
      await directory.create(recursive: true);
    }
    return directory;
  }

  Future<_CachedFile> _buildCacheEntry(String path) async {
    final file = File(path);
    final stat = await file.stat();
    return _CachedFile(
      path: path,
      sizeBytes: stat.size,
      lastAccessedAt: _clock(),
    );
  }

  Future<_CachedFile?> _resolveCacheEntry(String ebookId) async {
    final raw = _filesBox?.get(ebookId);
    if (raw == null) {
      return null;
    }
    final cached = _CachedFile.fromHive(raw);
    if (cached == null) {
      await _filesBox?.delete(ebookId);
      return null;
    }
    final file = File(cached.path);
    if (!await file.exists()) {
      await _filesBox?.delete(ebookId);
      return null;
    }
    if (cached.sizeBytes > 0) {
      return cached;
    }
    final stat = await file.stat();
    final enriched = cached.copyWith(sizeBytes: stat.size);
    await _filesBox?.put(ebookId, enriched.toJson());
    return enriched;
  }

  Future<void> _rebalanceCache({String? exemptId}) async {
    final box = _filesBox;
    if (box == null || box.isEmpty) {
      return;
    }

    final List<_CacheRecord> validEntries = <_CacheRecord>[];
    var totalSize = 0;
    final staleKeys = <dynamic>[];

    for (final entry in box.toMap().entries) {
      final cached = _CachedFile.fromHive(entry.value);
      if (cached == null) {
        staleKeys.add(entry.key);
        continue;
      }
      final file = File(cached.path);
      if (!await file.exists()) {
        staleKeys.add(entry.key);
        continue;
      }
      final resolved = cached.sizeBytes > 0
          ? cached
          : cached.copyWith(sizeBytes: (await file.stat()).size);
      if (!identical(resolved, cached)) {
        await box.put(entry.key, resolved.toJson());
      }
      validEntries.add(_CacheRecord(entry.key, resolved));
      totalSize += resolved.sizeBytes;
    }

    for (final key in staleKeys) {
      await box.delete(key);
    }

    final limit = _maxCacheSizeBytes;
    if (limit == null || totalSize <= limit) {
      return;
    }

    final prioritized = <_CacheRecord>[]
      ..addAll(validEntries.where((record) => record.key.toString() != exemptId))
      ..addAll(validEntries.where((record) => record.key.toString() == exemptId));

    prioritized.sort(
      (a, b) => a.file.lastAccessedAt.compareTo(b.file.lastAccessedAt),
    );

    var remaining = totalSize;
    for (final record in prioritized) {
      if (remaining <= limit) {
        break;
      }
      final file = File(record.file.path);
      if (await file.exists()) {
        await file.delete();
      }
      await box.delete(record.key);
      remaining -= record.file.sizeBytes;
    }
  }
}

class _CacheRecord {
  _CacheRecord(this.key, this.file);

  final dynamic key;
  final _CachedFile file;
}

class _CachedFile {
  const _CachedFile({
    required this.path,
    required this.sizeBytes,
    required this.lastAccessedAt,
  })  : assert(sizeBytes >= 0, 'sizeBytes cannot be negative.');

  final String path;
  final int sizeBytes;
  final DateTime lastAccessedAt;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'path': path,
        'size': sizeBytes,
        'lastAccessed': lastAccessedAt.millisecondsSinceEpoch,
      };

  _CachedFile copyWith({
    String? path,
    int? sizeBytes,
    DateTime? lastAccessedAt,
  }) {
    return _CachedFile(
      path: path ?? this.path,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      lastAccessedAt: lastAccessedAt ?? this.lastAccessedAt,
    );
  }

  _CachedFile touch(DateTime timestamp) {
    return copyWith(lastAccessedAt: timestamp);
  }

  static _CachedFile? fromHive(Object? value) {
    if (value is String) {
      return _CachedFile(
        path: value,
        sizeBytes: 0,
        lastAccessedAt: DateTime.fromMillisecondsSinceEpoch(0),
      );
    }
    if (value is Map) {
      final map = Map<String, dynamic>.from(value as Map);
      final path = map['path'];
      if (path is! String || path.isEmpty) {
        return null;
      }
      final dynamic sizeRaw = map['size'];
      final size = sizeRaw is int
          ? sizeRaw
          : int.tryParse(sizeRaw?.toString() ?? '') ?? 0;
      final dynamic lastRaw = map['lastAccessed'];
      final lastAccessed = lastRaw is int
          ? DateTime.fromMillisecondsSinceEpoch(lastRaw)
          : lastRaw is String
              ? DateTime.tryParse(lastRaw) ??
                  DateTime.fromMillisecondsSinceEpoch(0)
              : DateTime.fromMillisecondsSinceEpoch(0);
      return _CachedFile(
        path: path,
        sizeBytes: size,
        lastAccessedAt: lastAccessed,
      );
    }
    return null;
  }
}
