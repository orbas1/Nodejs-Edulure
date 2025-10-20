import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:hive/hive.dart';
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
  StreamController<List<DownloadedEbook>>? _downloadsController;
  StreamSubscription<BoxEvent>? _downloadsSubscription;

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
    final cachedPath = await _validateCachedDownload(ebook.id, ebook);
    if (cachedPath != null) {
      return cachedPath;
    }

    return _inFlightDownloads.putIfAbsent(ebook.id, () async {
      try {
        final cachedWhileQueued = await _validateCachedDownload(ebook.id, ebook);
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
          final metadata = await _buildCacheEntry(ebook, filePath);
          await _filesBox?.put(ebook.id, metadata.toJson());
          await _rebalanceCache(exemptId: ebook.id);
          _notifyLibraryChanged();
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
    _notifyLibraryChanged();
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
    _notifyLibraryChanged();
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
    _notifyLibraryChanged();
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

  Future<List<DownloadedEbook>> listDownloads() async {
    await ensureReady();
    final box = _filesBox;
    if (box == null || box.isEmpty) {
      return const <DownloadedEbook>[];
    }
    final downloads = <DownloadedEbook>[];
    for (final entry in box.toMap().entries) {
      final cached = await _resolveCacheEntry(entry.key.toString());
      if (cached == null) {
        continue;
      }
      downloads.add(DownloadedEbook.fromCache(entry.key.toString(), cached));
    }
    downloads.sort((a, b) => b.lastAccessedAt.compareTo(a.lastAccessedAt));
    return downloads;
  }

  Future<DownloadedEbook?> getDownload(String ebookId) async {
    await ensureReady();
    final cached = await _resolveCacheEntry(ebookId);
    if (cached == null) {
      return null;
    }
    return DownloadedEbook.fromCache(ebookId, cached);
  }

  Stream<List<DownloadedEbook>> watchDownloads() {
    _downloadsController ??= StreamController<List<DownloadedEbook>>.broadcast(
      onListen: () {
        unawaited(() async {
          await ensureReady();
          await _startDownloadsWatch();
          await _emitCurrentDownloads();
        }());
      },
      onCancel: () {
        final controller = _downloadsController;
        if (controller == null || controller.hasListener) {
          return;
        }
        unawaited(_teardownDownloadsWatch());
      },
    );
    return _downloadsController!.stream;
  }

  Future<void> dispose() async {
    await _teardownDownloadsWatch();
    final controller = _downloadsController;
    if (controller != null && !controller.isClosed) {
      await controller.close();
    }
    _downloadsController = null;
    await _filesBox?.close();
    await _progressBox?.close();
    await _preferencesBox?.close();
    _filesBox = null;
    _progressBox = null;
    _preferencesBox = null;
    _libraryDirectory = null;
    _ready = false;
    _ensureReadyFuture = null;
    _inFlightDownloads.clear();
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

  Future<void> _startDownloadsWatch() async {
    if (_downloadsSubscription != null) {
      return;
    }
    final box = _filesBox;
    if (box == null) {
      return;
    }
    _downloadsSubscription = box.watch().listen((_) {
      _notifyLibraryChanged();
    });
  }

  Future<void> _teardownDownloadsWatch() async {
    await _downloadsSubscription?.cancel();
    _downloadsSubscription = null;
  }

  Future<void> _emitCurrentDownloads() async {
    final controller = _downloadsController;
    if (controller == null || controller.isClosed) {
      return;
    }
    final snapshot = await listDownloads();
    if (controller.isClosed) {
      return;
    }
    controller.add(snapshot);
  }

  void _notifyLibraryChanged() {
    final controller = _downloadsController;
    if (controller == null || controller.isClosed) {
      return;
    }
    unawaited(_emitCurrentDownloads());
  }

  Future<void> _initialize() async {
    _filesBox ??= await Hive.openBox<dynamic>(_filesBoxName);
    _progressBox ??= await Hive.openBox<dynamic>(_progressBoxName);
    _preferencesBox ??= await Hive.openBox<dynamic>(_preferencesBoxName);
    _libraryDirectory ??= await _prepareLibraryDirectory();
    _hydrateSynchronousCaches();
    await _rebalanceCache();
    _notifyLibraryChanged();
  }

  Future<void> _cleanupFailedDownload(File file, String ebookId) async {
    if (await file.exists()) {
      await file.delete();
    }
    await _filesBox?.delete(ebookId);
    _notifyLibraryChanged();
  }

  void _hydrateSynchronousCaches() {
    _filesBox ??= _maybeOpenBox(_filesBoxName);
    _progressBox ??= _maybeOpenBox(_progressBoxName);
    _preferencesBox ??= _maybeOpenBox(_preferencesBoxName);
  }

  Future<String?> _validateCachedDownload(String ebookId, [Ebook? ebook]) async {
    final cached = await _resolveCacheEntry(ebookId);
    if (cached == null) {
      return null;
    }
    final touched = cached.touch(_clock());
    final enriched = ebook != null
        ? touched.copyWith(ebookJson: _serializeEbook(ebook))
        : touched;
    await _filesBox?.put(ebookId, enriched.toJson());
    _notifyLibraryChanged();
    return enriched.path;
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

  Future<_CachedFile> _buildCacheEntry(Ebook ebook, String path) async {
    final file = File(path);
    final stat = await file.stat();
    final now = _clock();
    return _CachedFile(
      path: path,
      sizeBytes: stat.size,
      lastAccessedAt: now,
      downloadedAt: now,
      ebookJson: _serializeEbook(ebook),
    );
  }

  Map<String, dynamic> _serializeEbook(Ebook ebook) {
    final serialized = ebook.copyWith(downloaded: true).toJson();
    return Map<String, dynamic>.from(serialized);
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
    _notifyLibraryChanged();
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
    var modified = false;

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
        modified = true;
      }
      validEntries.add(_CacheRecord(entry.key, resolved));
      totalSize += resolved.sizeBytes;
    }

    for (final key in staleKeys) {
      await box.delete(key);
      modified = true;
    }

    final limit = _maxCacheSizeBytes;
    if (limit == null || totalSize <= limit) {
      if (modified) {
        _notifyLibraryChanged();
      }
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
      modified = true;
    }

    if (modified) {
      _notifyLibraryChanged();
    }
  }
}

class _CacheRecord {
  _CacheRecord(this.key, this.file);

  final dynamic key;
  final _CachedFile file;
}

class DownloadedEbook {
  const DownloadedEbook({
    required this.ebook,
    required this.path,
    required this.sizeBytes,
    required this.downloadedAt,
    required this.lastAccessedAt,
  });

  final Ebook ebook;
  final String path;
  final int sizeBytes;
  final DateTime downloadedAt;
  final DateTime lastAccessedAt;

  DownloadedEbook copyWith({
    Ebook? ebook,
    String? path,
    int? sizeBytes,
    DateTime? downloadedAt,
    DateTime? lastAccessedAt,
  }) {
    return DownloadedEbook(
      ebook: ebook ?? this.ebook,
      path: path ?? this.path,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      downloadedAt: downloadedAt ?? this.downloadedAt,
      lastAccessedAt: lastAccessedAt ?? this.lastAccessedAt,
    );
  }

  static DownloadedEbook fromCache(String id, _CachedFile cached) {
    final ebookJson = cached.ebookJson;
    final ebook = ebookJson != null
        ? Ebook.fromJson(ebookJson)
        : Ebook(
            id: id,
            title: id,
            author: 'Unknown Author',
            coverUrl: '',
            fileUrl: cached.path,
            description: '',
            language: 'Unknown',
            tags: const <String>[],
            chapters: const <EbookChapter>[],
            downloaded: true,
          );
    final normalized = ebook.copyWith(
      downloaded: true,
      fileUrl: ebook.fileUrl.isEmpty ? cached.path : ebook.fileUrl,
    );
    return DownloadedEbook(
      ebook: normalized,
      path: cached.path,
      sizeBytes: cached.sizeBytes,
      downloadedAt: cached.downloadedAt,
      lastAccessedAt: cached.lastAccessedAt,
    );
  }
}

class _CachedFile {
  const _CachedFile({
    required this.path,
    required this.sizeBytes,
    required this.lastAccessedAt,
    required this.downloadedAt,
    this.ebookJson,
  })  : assert(sizeBytes >= 0, 'sizeBytes cannot be negative.');

  final String path;
  final int sizeBytes;
  final DateTime lastAccessedAt;
  final DateTime downloadedAt;
  final Map<String, dynamic>? ebookJson;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'path': path,
        'size': sizeBytes,
        'lastAccessed': lastAccessedAt.millisecondsSinceEpoch,
        'downloadedAt': downloadedAt.millisecondsSinceEpoch,
        if (ebookJson != null) 'ebook': ebookJson,
      };

  _CachedFile copyWith({
    String? path,
    int? sizeBytes,
    DateTime? lastAccessedAt,
    DateTime? downloadedAt,
    Map<String, dynamic>? ebookJson,
  }) {
    return _CachedFile(
      path: path ?? this.path,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      lastAccessedAt: lastAccessedAt ?? this.lastAccessedAt,
      downloadedAt: downloadedAt ?? this.downloadedAt,
      ebookJson: ebookJson ?? this.ebookJson,
    );
  }

  _CachedFile touch(DateTime timestamp) {
    return copyWith(lastAccessedAt: timestamp);
  }

  static _CachedFile? fromHive(Object? value) {
    if (value is String) {
      final epoch = DateTime.fromMillisecondsSinceEpoch(0);
      return _CachedFile(
        path: value,
        sizeBytes: 0,
        lastAccessedAt: epoch,
        downloadedAt: epoch,
      );
    }
    if (value is Map) {
      final map = Map<String, dynamic>.from(value as Map);
      final path = map['path'];
      if (path is! String || path.isEmpty) {
        return null;
      }
      final dynamic sizeRaw = map['size'];
      final size = sizeRaw is int ? sizeRaw : int.tryParse(sizeRaw?.toString() ?? '') ?? 0;
      final dynamic lastRaw = map['lastAccessed'];
      final lastAccessed = lastRaw is int
          ? DateTime.fromMillisecondsSinceEpoch(lastRaw)
          : lastRaw is String
              ? DateTime.tryParse(lastRaw) ?? DateTime.fromMillisecondsSinceEpoch(0)
              : DateTime.fromMillisecondsSinceEpoch(0);
      final dynamic downloadedRaw = map['downloadedAt'] ?? map['downloaded_at'];
      final downloadedAt = downloadedRaw is int
          ? DateTime.fromMillisecondsSinceEpoch(downloadedRaw)
          : downloadedRaw is String
              ? DateTime.tryParse(downloadedRaw) ?? lastAccessed
              : lastAccessed;
      final ebookRaw = map['ebook'];
      final ebookJson = ebookRaw is Map ? Map<String, dynamic>.from(ebookRaw as Map) : null;
      return _CachedFile(
        path: path,
        sizeBytes: size,
        lastAccessedAt: lastAccessed,
        downloadedAt: downloadedAt,
        ebookJson: ebookJson,
      );
    }
    return null;
  }
}
