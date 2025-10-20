import 'package:dio/dio.dart';

import 'api_config.dart';
import 'live_feed_service.dart';
import 'session_manager.dart';

typedef JsonMap = Map<String, dynamic>;

class CommunityServiceException implements Exception {
  CommunityServiceException(this.message, {this.cause, this.stackTrace});

  final String message;
  final Object? cause;
  final StackTrace? stackTrace;

  @override
  String toString() => 'CommunityServiceException: $message';
}

class CommunityService {
  CommunityService({Dio? client})
      : _dio = client ?? ApiConfig.createHttpClient(requiresAuth: true);

  final Dio _dio;

  Options _authorizedOptions() {
    final token = SessionManager.getAccessToken();
    if (token == null || token.isEmpty) {
      throw CommunityServiceException('Authentication required to manage communities.');
    }
    return Options(
      headers: {
        ..._dio.options.headers,
        'Authorization': 'Bearer $token',
      },
      extra: {
        ...?_dio.options.extra,
        'requiresAuth': true,
      },
    );
  }

  Future<List<CommunitySummary>> listCommunities() {
    return _withAuth(
      (options) => _dio.get('/communities', options: options),
      'Unable to load communities.',
      (response) {
        final entries = _asMapList(_unwrapData(response));
        return entries.map(CommunitySummary.fromJson).toList(growable: false);
      },
    );
  }

  Future<CommunityDetail> getCommunity(String communityId) {
    return _withAuth(
      (options) => _dio.get('/communities/$communityId', options: options),
      'Unable to load community.',
      (response) => CommunityDetail.fromJson(
        _asMap(_unwrapData(response), 'Unable to load community.'),
      ),
    );
  }

  Future<CommunitySummary> createCommunity(CreateCommunityInput input) {
    return _withAuth(
      (options) => _dio.post(
        '/communities',
        data: input.toJson(),
        options: options,
      ),
      'Unable to create community.',
      (response) => CommunitySummary.fromJson(
        _asMap(_unwrapData(response), 'Unable to create community.'),
      ),
    );
  }

  Future<CommunitySummary> joinCommunity(String communityId) {
    return _withAuth(
      (options) => _dio.post('/communities/$communityId/join', options: options),
      'Unable to join community.',
      (response) => CommunitySummary.fromJson(
        _asMap(_unwrapData(response), 'Unable to join community.'),
      ),
    );
  }

  Future<CommunityLeaveSummary> leaveCommunity(String communityId, {String? reason}) {
    return _withAuth(
      (options) => _dio.post(
        '/communities/$communityId/leave',
        data: reason != null && reason.isNotEmpty ? {'reason': reason} : null,
        options: options,
      ),
      'Unable to leave community.',
      (response) => CommunityLeaveSummary.fromJson(
        _asMap(_unwrapData(response), 'Unable to leave community.'),
      ),
    );
  }

  Future<CommunityFeedPage> fetchCommunityFeed(
    String communityId, {
    int page = 1,
    int perPage = 10,
    String? query,
    String? postType,
  }) {
    return _withAuth(
      (options) => _dio.get(
        '/communities/$communityId/posts',
        queryParameters: <String, dynamic>{
          'page': page,
          'perPage': perPage,
          if (query != null && query.trim().isNotEmpty) 'query': query.trim(),
          if (postType != null && postType.trim().isNotEmpty) 'postType': postType.trim(),
        },
        options: options,
      ),
      'Unable to load community feed.',
      (response) {
        final root = _asMap(response.data, 'Unable to load community feed.');
        final items = _asMapList(root['data']);
        final meta = _asMap(root['meta'], 'Unable to load community feed metadata.', allowEmpty: true);
        return CommunityFeedPage.fromJson({
          'data': items,
          'meta': meta,
        });
      },
    );
  }

  Future<CommunityPost> createPost(String communityId, CreateCommunityPostInput input) {
    return _withAuth(
      (options) => _dio.post(
        '/communities/$communityId/posts',
        data: input.toJson(),
        options: options,
      ),
      'Unable to create post.',
      (response) => CommunityPost.fromJson(
        _asMap(_unwrapData(response), 'Unable to create post.'),
      ),
    );
  }

  Future<CommunityPost> moderatePost(
    String communityId,
    String postId, {
    required String action,
    String? reason,
  }) {
    return _withAuth(
      (options) => _dio.post(
        '/communities/$communityId/posts/$postId/moderate',
        data: <String, dynamic>{
          'action': action,
          if (reason != null && reason.isNotEmpty) 'reason': reason,
        },
        options: options,
      ),
      'Unable to moderate post.',
      (response) => CommunityPost.fromJson(
        _asMap(_unwrapData(response), 'Unable to moderate post.'),
      ),
    );
  }

  Future<CommunityPost> removePost(String communityId, String postId, {String? reason}) {
    return _withAuth(
      (options) => _dio.delete(
        '/communities/$communityId/posts/$postId',
        data: reason != null && reason.isNotEmpty ? {'reason': reason} : null,
        options: options,
      ),
      'Unable to remove post.',
      (response) => CommunityPost.fromJson(
        _asMap(_unwrapData(response), 'Unable to remove post.'),
      ),
    );
  }

  Future<CommunityPost> updatePost(
    String communityId,
    String postId,
    CreateCommunityPostInput input,
  ) async {
    final metadata = {
      ...input.metadata,
      'replacementFor': postId,
    };
    await moderatePost(communityId, postId, action: 'suppress', reason: 'Edited via mobile app');
    return createPost(
      communityId,
      CreateCommunityPostInput(
        body: input.body,
        channelId: input.channelId,
        postType: input.postType,
        title: input.title,
        tags: input.tags,
        visibility: input.visibility,
        status: input.status,
        scheduledAt: input.scheduledAt,
        metadata: metadata,
      ),
    );
  }

  Future<T> _withAuth<T>(
    Future<Response<dynamic>> Function(Options options) action,
    String fallbackMessage,
    T Function(Response response) parser,
  ) async {
    final options = _authorizedOptions();
    try {
      final response = await action(options);
      return parser(response);
    } on DioException catch (error) {
      final message = _extractErrorMessage(error) ?? fallbackMessage;
      throw CommunityServiceException(
        message,
        cause: error,
        stackTrace: error.stackTrace,
      );
    } catch (error, stackTrace) {
      throw CommunityServiceException(
        fallbackMessage,
        cause: error,
        stackTrace: stackTrace,
      );
    }
  }

  dynamic _unwrapData(Response response) {
    final data = response.data;
    if (data is Map && data.containsKey('data')) {
      return data['data'];
    }
    return data;
  }

  Map<String, dynamic> _asMap(
    dynamic value,
    String message, {
    bool allowEmpty = false,
  }) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value as Map);
    }
    if (allowEmpty) {
      return <String, dynamic>{};
    }
    throw CommunityServiceException(message);
  }

  List<Map<String, dynamic>> _asMapList(dynamic value) {
    if (value is List) {
      return value
          .whereType<Map>()
          .map((entry) => Map<String, dynamic>.from(entry as Map))
          .toList(growable: false);
    }
    return const <Map<String, dynamic>>[];
  }

  String? _extractErrorMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    if (data is Map && data['errors'] is List && data['errors'].isNotEmpty) {
      return data['errors'].first.toString();
    }
    return error.message;
  }
}

class CreateCommunityInput {
  CreateCommunityInput({
    required this.name,
    this.description,
    this.coverImageUrl,
    this.visibility = 'public',
    this.metadata = const <String, dynamic>{},
  });

  final String name;
  final String? description;
  final String? coverImageUrl;
  final String visibility;
  final JsonMap metadata;

  JsonMap toJson() {
    return <String, dynamic>{
      'name': name,
      'description': description,
      'coverImageUrl': coverImageUrl,
      'visibility': visibility,
      'metadata': metadata,
    }..removeWhere((key, value) => value == null);
  }
}

class CommunitySummary {
  CommunitySummary({
    required this.id,
    required this.name,
    required this.slug,
    required this.visibility,
    this.description,
    this.coverImageUrl,
    this.ownerId,
    this.metadata = const <String, dynamic>{},
    this.stats = const CommunityStats(),
    this.membership,
    this.permissions = const CommunityPermissions(),
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String slug;
  final String visibility;
  final String? description;
  final String? coverImageUrl;
  final String? ownerId;
  final JsonMap metadata;
  final CommunityStats stats;
  final CommunityMembership? membership;
  final CommunityPermissions permissions;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isMember => membership?.status == 'active';
  bool get canModerate => permissions.canModeratePosts;
  bool get canLeave => permissions.canLeave;

  factory CommunitySummary.fromJson(JsonMap json) {
    return CommunitySummary(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Community',
      slug: json['slug']?.toString() ?? '',
      visibility: json['visibility']?.toString() ?? 'public',
      description: json['description']?.toString(),
      coverImageUrl: json['coverImageUrl']?.toString(),
      ownerId: json['ownerId']?.toString(),
      metadata: json['metadata'] is Map<String, dynamic>
          ? json['metadata'] as Map<String, dynamic>
          : json['metadata'] is Map
              ? Map<String, dynamic>.from(json['metadata'] as Map)
              : const <String, dynamic>{},
      stats: CommunityStats.fromJson(_extractNested(json, 'stats')),
      membership: json['membership'] is Map<String, dynamic>
          ? CommunityMembership.fromJson(json['membership'] as Map<String, dynamic>)
          : json['membership'] is Map
              ? CommunityMembership.fromJson(Map<String, dynamic>.from(json['membership'] as Map))
              : null,
      permissions: json['permissions'] is Map<String, dynamic>
          ? CommunityPermissions.fromJson(json['permissions'] as Map<String, dynamic>)
          : json['permissions'] is Map
              ? CommunityPermissions.fromJson(Map<String, dynamic>.from(json['permissions'] as Map))
              : const CommunityPermissions(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? ''),
    );
  }

  CommunitySummary copyWith({
    CommunityMembership? membership,
    CommunityPermissions? permissions,
  }) {
    return CommunitySummary(
      id: id,
      name: name,
      slug: slug,
      visibility: visibility,
      description: description,
      coverImageUrl: coverImageUrl,
      ownerId: ownerId,
      metadata: metadata,
      stats: stats,
      membership: membership ?? this.membership,
      permissions: permissions ?? this.permissions,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

class CommunityDetail extends CommunitySummary {
  CommunityDetail({
    required super.id,
    required super.name,
    required super.slug,
    required super.visibility,
    super.description,
    super.coverImageUrl,
    super.ownerId,
    super.metadata = const <String, dynamic>{},
    super.stats = const CommunityStats(),
    super.membership,
    super.permissions = const CommunityPermissions(),
    super.createdAt,
    super.updatedAt,
    this.channels = const <CommunityChannel>[],
    this.sponsorships = const CommunitySponsorships(),
  });

  final List<CommunityChannel> channels;
  final CommunitySponsorships sponsorships;

  factory CommunityDetail.fromJson(JsonMap json) {
    final summary = CommunitySummary.fromJson(json);
    final channels = <CommunityChannel>[];
    final rawChannels = json['channels'];
    if (rawChannels is List) {
      for (final entry in rawChannels) {
        if (entry is Map) {
          channels.add(CommunityChannel.fromJson(Map<String, dynamic>.from(entry as Map)));
        }
      }
    }
    return CommunityDetail(
      id: summary.id,
      name: summary.name,
      slug: summary.slug,
      visibility: summary.visibility,
      description: summary.description,
      coverImageUrl: summary.coverImageUrl,
      ownerId: summary.ownerId,
      metadata: summary.metadata,
      stats: summary.stats,
      membership: summary.membership,
      permissions: summary.permissions,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      channels: channels,
      sponsorships: json['sponsorships'] is Map<String, dynamic>
          ? CommunitySponsorships.fromJson(json['sponsorships'] as Map<String, dynamic>)
          : json['sponsorships'] is Map
              ? CommunitySponsorships.fromJson(Map<String, dynamic>.from(json['sponsorships'] as Map))
              : const CommunitySponsorships(),
    );
  }
}

class CommunitySponsorships {
  const CommunitySponsorships({this.blockedPlacementIds = const <String>[]});

  final List<String> blockedPlacementIds;

  factory CommunitySponsorships.fromJson(JsonMap json) {
    final blocked = <String>[];
    final raw = json['blockedPlacementIds'];
    if (raw is List) {
      for (final entry in raw) {
        final value = entry?.toString();
        if (value != null && value.isNotEmpty) {
          blocked.add(value);
        }
      }
    }
    return CommunitySponsorships(blockedPlacementIds: blocked);
  }
}

class CommunityChannel {
  CommunityChannel({
    required this.id,
    required this.name,
    required this.slug,
    required this.type,
    this.description,
    this.metadata = const <String, dynamic>{},
    this.isDefault = false,
  });

  final String id;
  final String name;
  final String slug;
  final String type;
  final String? description;
  final JsonMap metadata;
  final bool isDefault;

  factory CommunityChannel.fromJson(JsonMap json) {
    return CommunityChannel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Channel',
      slug: json['slug']?.toString() ?? '',
      type: json['type']?.toString() ?? 'discussion',
      description: json['description']?.toString(),
      metadata: json['metadata'] is Map<String, dynamic>
          ? json['metadata'] as Map<String, dynamic>
          : json['metadata'] is Map
              ? Map<String, dynamic>.from(json['metadata'] as Map)
              : const <String, dynamic>{},
      isDefault: json['isDefault'] == true,
    );
  }
}

class CommunityStats {
  const CommunityStats({
    this.members = 0,
    this.resources = 0,
    this.posts = 0,
    this.channels = 0,
    this.lastActivityAt,
  });

  final int members;
  final int resources;
  final int posts;
  final int channels;
  final DateTime? lastActivityAt;

  factory CommunityStats.fromJson(JsonMap json) {
    return CommunityStats(
      members: _parseInt(json['members']) ?? 0,
      resources: _parseInt(json['resources']) ?? 0,
      posts: _parseInt(json['posts']) ?? 0,
      channels: _parseInt(json['channels']) ?? 0,
      lastActivityAt: DateTime.tryParse(json['lastActivityAt']?.toString() ?? ''),
    );
  }
}

class CommunityMembership {
  const CommunityMembership({required this.role, required this.status});

  final String role;
  final String status;

  factory CommunityMembership.fromJson(JsonMap json) {
    return CommunityMembership(
      role: json['role']?.toString() ?? 'member',
      status: json['status']?.toString() ?? 'pending',
    );
  }
}

class CommunityPermissions {
  const CommunityPermissions({
    this.canModeratePosts = false,
    this.canManageSponsorships = false,
    this.canLeave = false,
  });

  final bool canModeratePosts;
  final bool canManageSponsorships;
  final bool canLeave;

  factory CommunityPermissions.fromJson(JsonMap json) {
    return CommunityPermissions(
      canModeratePosts: json['canModeratePosts'] == true,
      canManageSponsorships: json['canManageSponsorships'] == true,
      canLeave: json['canLeave'] == true,
    );
  }
}

class CommunityLeaveSummary {
  const CommunityLeaveSummary({this.communityId, this.status, this.processedAt});

  final String? communityId;
  final String? status;
  final DateTime? processedAt;

  factory CommunityLeaveSummary.fromJson(JsonMap json) {
    return CommunityLeaveSummary(
      communityId: json['communityId']?.toString(),
      status: json['status']?.toString(),
      processedAt: DateTime.tryParse(json['processedAt']?.toString() ?? ''),
    );
  }
}

JsonMap _extractNested(JsonMap json, String key) {
  final value = json[key];
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return Map<String, dynamic>.from(value as Map);
  }
  return <String, dynamic>{};
}

int? _parseInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}
