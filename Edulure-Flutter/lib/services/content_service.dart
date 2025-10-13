import 'dart:io';

import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import 'api_config.dart';
import 'session_manager.dart';

class ContentService {
  ContentService()
      : _dio = Dio(
          BaseOptions(
            baseUrl: apiBaseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 30),
          ),
        );

  final Dio _dio;

  Future<List<ContentAsset>> fetchAssets() async {
    final token = SessionManager.getAccessToken();
    if (token == null) return loadCachedAssets();
    final response = await _dio.get(
      '/content/assets',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final data = response.data['data'] as List<dynamic>? ?? [];
    final assets = data.map((json) => ContentAsset.fromJson(json as Map<String, dynamic>)).toList();
    await SessionManager.assetsCache.put('items', assets.map((asset) => asset.toJson()).toList());
    return assets;
  }

  List<ContentAsset> loadCachedAssets() {
    final cached = SessionManager.assetsCache.get('items');
    if (cached is List) {
      return cached.map((item) => ContentAsset.fromJson(Map<String, dynamic>.from(item as Map))).toList();
    }
    return [];
  }

  Map<String, String> loadCachedDownloads() {
    final entries = <String, String>{};
    final box = SessionManager.downloadsCache;
    for (final key in box.keys) {
      final value = box.get(key);
      if (value is String) {
        entries[key.toString()] = value;
      }
    }
    return entries;
  }

  Map<String, EbookProgress> loadCachedEbookProgress() {
    final entries = <String, EbookProgress>{};
    final box = SessionManager.ebookProgressCache;
    for (final key in box.keys) {
      final value = box.get(key);
      if (value is Map) {
        entries[key.toString()] =
            EbookProgress.fromJson(Map<String, dynamic>.from(value as Map));
      }
    }
    return entries;
  }

  ReaderPreferences loadReaderPreferences() {
    final data = SessionManager.readerSettingsCache.get('preferences');
    if (data is Map) {
      return ReaderPreferences.fromJson(
        Map<String, dynamic>.from(data as Map),
      );
    }
    return const ReaderPreferences();
  }

  Future<void> saveReaderPreferences(ReaderPreferences preferences) async {
    await SessionManager.readerSettingsCache.put(
      'preferences',
      preferences.toJson(),
    );
  }

  Future<void> cacheEbookProgress(String assetId, EbookProgress progress) async {
    await SessionManager.ebookProgressCache.put(
      assetId,
      progress.toJson(),
    );
  }

  Future<ViewerToken> viewerToken(String assetId) async {
    final token = SessionManager.getAccessToken();
    if (token == null) {
      throw Exception('Authentication required');
    }
    final response = await _dio.get(
      '/content/assets/$assetId/viewer-token',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return ViewerToken.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<String> downloadAsset(ContentAsset asset, ViewerToken token) async {
    final directory = await getApplicationDocumentsDirectory();
    final contentDir = Directory('${directory.path}/edulure/content');
    if (!await contentDir.exists()) {
      await contentDir.create(recursive: true);
    }
    final filename = asset.originalFilename;
    final filePath = '${contentDir.path}/$filename';
    await _dio.download(token.url, filePath);
    await SessionManager.downloadsCache.put(asset.publicId, filePath);
    return filePath;
  }

  Future<void> openAsset(String path) async {
    await OpenFilex.open(path);
  }

  Future<void> updateProgress(String assetId, double progress) async {
    final token = SessionManager.getAccessToken();
    if (token == null) return;
    await _dio.post(
      '/content/assets/$assetId/progress',
      data: {
        'progressPercent': progress,
        'timeSpentSeconds': 60
      },
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
  }

  Future<void> recordDownload(String assetId) async {
    final token = SessionManager.getAccessToken();
    if (token == null) return;
    await _dio.post(
      '/content/assets/$assetId/events',
      data: {'eventType': 'download'},
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
  }
}

class ContentAsset {
  ContentAsset({
    required this.publicId,
    required this.originalFilename,
    required this.type,
    required this.status,
    required this.updatedAt,
    this.metadata,
  });

  final String publicId;
  final String originalFilename;
  final String type;
  final String status;
  final String? updatedAt;
  final Map<String, dynamic>? metadata;

  factory ContentAsset.fromJson(Map<String, dynamic> json) {
    return ContentAsset(
      publicId: json['publicId'] as String,
      originalFilename: json['originalFilename'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      updatedAt: json['updatedAt'] as String?,
      metadata: json['metadata'] != null
          ? Map<String, dynamic>.from(json['metadata'] as Map)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'publicId': publicId,
      'originalFilename': originalFilename,
      'type': type,
      'status': status,
      'updatedAt': updatedAt,
      'metadata': metadata
    };
  }
}

class ViewerToken {
  ViewerToken({
    required this.url,
    required this.expiresAt,
    required this.watermark,
    required this.contentType,
  });

  final String url;
  final String expiresAt;
  final String watermark;
  final String? contentType;

  factory ViewerToken.fromJson(Map<String, dynamic> json) {
    return ViewerToken(
      url: json['url'] as String,
      expiresAt: json['expiresAt'] as String,
      watermark: json['watermark'] as String,
      contentType: json['contentType'] as String?,
    );
  }
}

enum ReaderThemePreference { light, dark }

class ReaderPreferences {
  const ReaderPreferences({
    this.theme = ReaderThemePreference.light,
    this.fontScale = 1.0,
  });

  final ReaderThemePreference theme;
  final double fontScale;

  ReaderPreferences copyWith({
    ReaderThemePreference? theme,
    double? fontScale,
  }) {
    return ReaderPreferences(
      theme: theme ?? this.theme,
      fontScale: fontScale ?? this.fontScale,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'theme': theme.name,
      'fontScale': fontScale,
    };
  }

  factory ReaderPreferences.fromJson(Map<String, dynamic> json) {
    final themeValue = json['theme'] as String?;
    final fontScaleValue = (json['fontScale'] as num?)?.toDouble();
    return ReaderPreferences(
      theme: ReaderThemePreference.values.firstWhere(
        (mode) => mode.name == themeValue,
        orElse: () => ReaderThemePreference.light,
      ),
      fontScale: fontScaleValue != null && fontScaleValue > 0
          ? fontScaleValue.clamp(0.8, 1.6).toDouble()
          : 1.0,
    );
  }
}

class EbookProgress {
  EbookProgress({
    required this.progressPercent,
    this.cfi,
    DateTime? updatedAt,
  }) : updatedAt = updatedAt ?? DateTime.now();

  final double progressPercent;
  final String? cfi;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() {
    return {
      'progressPercent': progressPercent,
      'cfi': cfi,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory EbookProgress.fromJson(Map<String, dynamic> json) {
    return EbookProgress(
      progressPercent: (json['progressPercent'] as num?)?.toDouble() ?? 0,
      cfi: json['cfi'] as String?,
      updatedAt: json['updatedAt'] is String
          ? DateTime.tryParse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }

  EbookProgress copyWith({double? progressPercent, String? cfi}) {
    return EbookProgress(
      progressPercent: progressPercent ?? this.progressPercent,
      cfi: cfi ?? this.cfi,
      updatedAt: DateTime.now(),
    );
  }
}
