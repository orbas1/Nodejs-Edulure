import 'dart:io';

import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import 'api_config.dart';
import 'ebook_reader_backend.dart';
import 'session_manager.dart';

class ContentService implements EbookReaderBackend {
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
    try {
      final response = await _dio.get(
        '/content/assets',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final data = response.data['data'] as List<dynamic>? ?? [];
      final assets = data.map((json) => ContentAsset.fromJson(json as Map<String, dynamic>)).toList();
      await SessionManager.assetsCache.put('items', assets.map((asset) => asset.toJson()).toList());
      return assets;
    } on DioException catch (error) {
      if (error.response?.statusCode == 403) {
        await SessionManager.assetsCache.delete('items');
        throw const ContentAccessDeniedException(
          'Instructor or admin Learnspace required to manage the content library.',
        );
      }
      final data = error.response?.data;
      final message = data is Map && data['message'] is String
          ? data['message'] as String
          : error.message ?? 'Unable to fetch content assets';
      throw Exception(message);
    }
  }

  Future<List<EbookMarketplaceItem>> fetchMarketplaceEbooks() async {
    final response = await _dio.get('/ebooks');
    final data = response.data['data'] as List<dynamic>? ?? [];
    return data
        .map((item) => EbookMarketplaceItem.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<EbookPurchaseIntent> createEbookPurchaseIntent(String ebookId) async {
    final token = SessionManager.getAccessToken();
    if (token == null) {
      throw Exception('Authentication required');
    }
    final response = await _dio.post(
      '/ebooks/$ebookId/purchase-intent',
      data: {'provider': 'stripe'},
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return EbookPurchaseIntent.fromJson(response.data['data'] as Map<String, dynamic>);
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

  @override
  ReaderPreferences loadReaderPreferences() {
    final data = SessionManager.readerSettingsCache.get('preferences');
    if (data is Map) {
      return ReaderPreferences.fromJson(
        Map<String, dynamic>.from(data as Map),
      );
    }
    return const ReaderPreferences();
  }

  @override
  Future<void> saveReaderPreferences(ReaderPreferences preferences) async {
    await SessionManager.readerSettingsCache.put(
      'preferences',
      preferences.toJson(),
    );
  }

  @override
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

  @override
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

  Future<ContentAsset> updateMaterialMetadata(
    String assetId,
    MaterialMetadataUpdate metadata,
  ) async {
    final token = SessionManager.getAccessToken();
    if (token == null) {
      throw Exception('Authentication required');
    }
    try {
      final response = await _dio.patch(
        '/content/assets/$assetId/metadata',
        data: metadata.toJson(),
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final updated = ContentAsset.fromJson(
        Map<String, dynamic>.from(response.data['data'] as Map<String, dynamic>),
      );
      final cache = loadCachedAssets();
      final next = cache
          .map((asset) => asset.publicId == updated.publicId ? updated : asset)
          .toList();
      await SessionManager.assetsCache
          .put('items', next.map((asset) => asset.toJson()).toList());
      return updated;
    } on DioException catch (error) {
      if (error.response?.statusCode == 403) {
        throw const ContentAccessDeniedException(
          'Instructor or admin Learnspace required to update material metadata.',
        );
      }
      final data = error.response?.data;
      final message = data is Map && data['message'] is String
          ? data['message'] as String
          : error.message ?? 'Unable to update material metadata';
      throw Exception(message);
    }
  }
}

class ContentAccessDeniedException implements Exception {
  const ContentAccessDeniedException(this.message);

  final String message;

  @override
  String toString() => message;
}

class ContentAsset {
  ContentAsset({
    required this.publicId,
    required this.originalFilename,
    required this.type,
    required this.status,
    required this.updatedAt,
    this.metadata,
    this.visibility,
  });

  final String publicId;
  final String originalFilename;
  final String type;
  final String status;
  final String? updatedAt;
  final Map<String, dynamic>? metadata;
  final String? visibility;

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
      visibility: json['visibility'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'publicId': publicId,
      'originalFilename': originalFilename,
      'type': type,
      'status': status,
      'updatedAt': updatedAt,
      'metadata': metadata,
      'visibility': visibility,
    };
  }

  Map<String, dynamic> get customMetadata {
    final custom = metadata?['custom'];
    if (custom is Map) {
      return Map<String, dynamic>.from(custom as Map);
    }
    return {};
  }

  List<String> get categories {
    final data = customMetadata['categories'];
    if (data is List) {
      return data.map((item) => item.toString()).toList();
    }
    return const [];
  }

  List<String> get tags {
    final data = customMetadata['tags'];
    if (data is List) {
      return data.map((item) => item.toString()).toList();
    }
    return const [];
  }

  String? get coverImageUrl {
    final media = customMetadata['media'];
    if (media is Map && media['coverImage'] is Map) {
      final cover = Map<String, dynamic>.from(media['coverImage'] as Map);
      final url = cover['url'];
      if (url is String && url.isNotEmpty) {
        return url;
      }
    }
    return null;
  }

  String? get coverImageAlt {
    final media = customMetadata['media'];
    if (media is Map && media['coverImage'] is Map) {
      final cover = Map<String, dynamic>.from(media['coverImage'] as Map);
      final alt = cover['alt'];
      if (alt is String && alt.isNotEmpty) {
        return alt;
      }
    }
    return null;
  }
}

enum MaterialMediaKind { image, video }

class MaterialMediaItem {
  MaterialMediaItem({
    required this.url,
    this.caption,
    this.kind = MaterialMediaKind.image,
  });

  final String url;
  final String? caption;
  final MaterialMediaKind kind;

  MaterialMediaItem copyWith({String? url, String? caption, MaterialMediaKind? kind}) {
    return MaterialMediaItem(
      url: url ?? this.url,
      caption: caption ?? this.caption,
      kind: kind ?? this.kind,
    );
  }

  factory MaterialMediaItem.fromJson(Map<String, dynamic> json) {
    final kindValue = json['kind'] as String?;
    final kind = MaterialMediaKind.values.firstWhere(
      (element) => element.name == kindValue,
      orElse: () => MaterialMediaKind.image,
    );
    return MaterialMediaItem(
      url: json['url'] as String? ?? '',
      caption: json['caption'] as String?,
      kind: kind,
    );
  }
}

class MaterialMetadataUpdate {
  MaterialMetadataUpdate({
    this.title,
    this.description,
    List<String>? categories,
    List<String>? tags,
    this.coverImageUrl,
    this.coverImageAlt,
    List<MaterialMediaItem>? gallery,
    this.videoUrl,
    this.videoPosterUrl,
    this.headline,
    this.subheadline,
    this.callToActionLabel,
    this.callToActionUrl,
    this.badge,
    this.visibility,
    this.showcasePinned = false,
  })  : categories = categories ?? <String>[],
        tags = tags ?? <String>[],
        gallery = gallery ?? <MaterialMediaItem>[];

  final String? title;
  final String? description;
  final List<String> categories;
  final List<String> tags;
  final String? coverImageUrl;
  final String? coverImageAlt;
  final List<MaterialMediaItem> gallery;
  final String? videoUrl;
  final String? videoPosterUrl;
  final String? headline;
  final String? subheadline;
  final String? callToActionLabel;
  final String? callToActionUrl;
  final String? badge;
  final String? visibility;
  final bool showcasePinned;

  factory MaterialMetadataUpdate.fromAsset(ContentAsset asset) {
    final custom = asset.customMetadata;
    final media = custom['media'];
    final showcase = custom['showcase'];
    final callToAction = showcase is Map ? showcase['callToAction'] : null;
    final galleryItems = <MaterialMediaItem>[];
    if (media is Map && media['gallery'] is List) {
      for (final item in media['gallery'] as List<dynamic>) {
        if (item is Map) {
          galleryItems.add(MaterialMediaItem.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }
    return MaterialMetadataUpdate(
      title: custom['title'] as String?,
      description: custom['description'] as String?,
      categories: asset.categories,
      tags: asset.tags,
      coverImageUrl: asset.coverImageUrl,
      coverImageAlt: asset.coverImageAlt,
      gallery: galleryItems,
      videoUrl: showcase is Map ? showcase['videoUrl'] as String? : null,
      videoPosterUrl: showcase is Map ? showcase['videoPosterUrl'] as String? : null,
      headline: showcase is Map ? showcase['headline'] as String? : null,
      subheadline: showcase is Map ? showcase['subheadline'] as String? : null,
      callToActionLabel: callToAction is Map ? callToAction['label'] as String? : null,
      callToActionUrl: callToAction is Map ? callToAction['url'] as String? : null,
      badge: showcase is Map ? showcase['badge'] as String? : null,
      visibility: asset.visibility,
      showcasePinned: custom['featureFlags'] is Map
          ? (custom['featureFlags'] as Map)['showcasePinned'] == true
          : false,
    );
  }

  MaterialMetadataUpdate copyWith({
    String? title,
    String? description,
    List<String>? categories,
    List<String>? tags,
    String? coverImageUrl,
    String? coverImageAlt,
    List<MaterialMediaItem>? gallery,
    String? videoUrl,
    String? videoPosterUrl,
    String? headline,
    String? subheadline,
    String? callToActionLabel,
    String? callToActionUrl,
    String? badge,
    String? visibility,
    bool? showcasePinned,
  }) {
    return MaterialMetadataUpdate(
      title: title ?? this.title,
      description: description ?? this.description,
      categories: categories ?? this.categories,
      tags: tags ?? this.tags,
      coverImageUrl: coverImageUrl ?? this.coverImageUrl,
      coverImageAlt: coverImageAlt ?? this.coverImageAlt,
      gallery: gallery ?? this.gallery,
      videoUrl: videoUrl ?? this.videoUrl,
      videoPosterUrl: videoPosterUrl ?? this.videoPosterUrl,
      headline: headline ?? this.headline,
      subheadline: subheadline ?? this.subheadline,
      callToActionLabel: callToActionLabel ?? this.callToActionLabel,
      callToActionUrl: callToActionUrl ?? this.callToActionUrl,
      badge: badge ?? this.badge,
      visibility: visibility ?? this.visibility,
      showcasePinned: showcasePinned ?? this.showcasePinned,
    );
  }

  Map<String, dynamic> toJson() {
    final normalisedCategories = _normaliseList(categories, maxItems: 12, maxLength: 40);
    final normalisedTags = _normaliseList(tags, maxItems: 24, maxLength: 32);
    final sanitisedGallery = <Map<String, dynamic>>[];
    for (final item in gallery) {
      final url = _sanitiseHttps(item.url);
      if (url == null) continue;
      sanitisedGallery.add({
        'url': url,
        'caption': _trimOrNull(item.caption, maxLength: 160),
        'kind': item.kind.name,
      });
      if (sanitisedGallery.length >= 8) break;
    }
    return {
      'title': _trimOrNull(title, maxLength: 140),
      'description': _trimOrNull(description, maxLength: 1500),
      'categories': normalisedCategories,
      'tags': normalisedTags,
      'coverImage': {
        'url': _sanitiseHttps(coverImageUrl),
        'alt': _trimOrNull(coverImageAlt, maxLength: 120),
      },
      'gallery': sanitisedGallery,
      'showcase': {
        'headline': _trimOrNull(headline, maxLength: 120),
        'subheadline': _trimOrNull(subheadline, maxLength: 200),
        'videoUrl': _sanitiseHttps(videoUrl),
        'videoPosterUrl': _sanitiseHttps(videoPosterUrl),
        'callToActionLabel': _trimOrNull(callToActionLabel, maxLength: 40),
        'callToActionUrl': _sanitiseHttps(callToActionUrl),
        'badge': _trimOrNull(badge, maxLength: 32),
      },
      if (visibility != null) 'visibility': visibility,
      'featureFlags': {
        'showcasePinned': showcasePinned,
      },
    };
  }
}

String? _trimOrNull(String? value, {int? maxLength}) {
  if (value == null) return null;
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  if (maxLength != null && trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength);
  }
  return trimmed;
}

String? _sanitiseHttps(String? value) {
  if (value == null) return null;
  final trimmed = value.trim();
  if (trimmed.isEmpty || !trimmed.toLowerCase().startsWith('https://')) {
    return null;
  }
  return trimmed;
}

List<String> _normaliseList(List<String> values, {required int maxItems, required int maxLength}) {
  final seen = <String>{};
  final result = <String>[];
  for (final entry in values) {
    final trimmed = entry.trim();
    if (trimmed.isEmpty) continue;
    final truncated = trimmed.length > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    final fingerprint = truncated.toLowerCase();
    if (seen.contains(fingerprint)) continue;
    seen.add(fingerprint);
    result.add(truncated);
    if (result.length >= maxItems) break;
  }
  return result;
}

class EbookMarketplaceItem {
  EbookMarketplaceItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.price,
    required this.downloads,
  });

  final String id;
  final String title;
  final String? subtitle;
  final String price;
  final int downloads;

  factory EbookMarketplaceItem.fromJson(Map<String, dynamic> json) {
    final analytics = json['analytics'] as Map<String, dynamic>? ?? {};
    final price = json['price'] as Map<String, dynamic>?;
    return EbookMarketplaceItem(
      id: json['id'] as String,
      title: json['title'] as String,
      subtitle: json['subtitle'] as String?,
      price: price != null ? (price['formatted'] as String? ?? 'Contact support') : 'Contact support',
      downloads: (analytics['downloads'] as num?)?.toInt() ?? 0,
    );
  }
}

class EbookPurchaseIntent {
  EbookPurchaseIntent({
    required this.paymentId,
    required this.provider,
    required this.status,
    this.clientSecret,
    this.approvalUrl,
  });

  final String paymentId;
  final String provider;
  final String status;
  final String? clientSecret;
  final String? approvalUrl;

  factory EbookPurchaseIntent.fromJson(Map<String, dynamic> json) {
    final payment = json['payment'] as Map<String, dynamic>? ?? {};
    return EbookPurchaseIntent(
      paymentId: payment['paymentId'] as String? ?? '',
      provider: payment['provider'] as String? ?? 'stripe',
      status: payment['status'] as String? ?? 'pending',
      clientSecret: payment['clientSecret'] as String?,
      approvalUrl: payment['approvalUrl'] as String?,
    );
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
