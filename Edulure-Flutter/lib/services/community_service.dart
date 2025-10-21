import 'package:dio/dio.dart';

import 'api_config.dart';
import 'live_feed_service.dart';
import 'session_manager.dart';

typedef JsonMap = Map<String, dynamic>;

class CommunityService {
  CommunityService({
    Dio? client,
    String? Function()? tokenProvider,
  })  : _dio = client ?? ApiConfig.createHttpClient(requiresAuth: true),
        _tokenProvider = tokenProvider ?? SessionManager.getAccessToken;

  final Dio _dio;
  final String? Function() _tokenProvider;

  Options _authOptions() {
    final token = _tokenProvider();
    if (token == null || token.isEmpty) {
      throw const CommunityServiceException('Authentication required to manage communities.');
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

  Future<T> _guard<T>(Future<T> Function() action) async {
    try {
      return await action();
    } on CommunityServiceException {
      rethrow;
    } on DioException catch (error) {
      throw CommunityServiceException(_resolveErrorMessage(error), cause: error);
    } catch (error) {
      throw CommunityServiceException('Community request failed.', cause: error);
    }
  }

  String _resolveErrorMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    if (data is Map && data['errors'] is List && data['errors'].isNotEmpty) {
      return data['errors'].first.toString();
    }
    return error.message ?? 'Community request failed.';
  }

  Future<List<CommunitySummary>> listCommunities() async {
    return _guard(() async {
      final response = await _dio.get('/communities', options: _authOptions());
      final data = response.data;
      dynamic payload;
      if (data is Map<String, dynamic>) {
        payload = data['data'];
      } else if (data is Map) {
        payload = Map<String, dynamic>.from(data as Map)['data'];
      }
      if (payload is List) {
        return payload
            .whereType<Map>()
            .map((entry) => CommunitySummary.fromJson(Map<String, dynamic>.from(entry as Map)))
            .toList(growable: false);
      }
      return const <CommunitySummary>[];
    });
  }

  Future<CommunityDetail> getCommunity(String communityId) async {
    return _guard(() async {
      final response = await _dio.get('/communities/$communityId', options: _authOptions());
      final data = _ensureMap(response.data)['data'];
      if (data is Map<String, dynamic>) {
        return CommunityDetail.fromJson(data);
      }
      if (data is Map) {
        return CommunityDetail.fromJson(Map<String, dynamic>.from(data as Map));
      }
      throw const CommunityServiceException('Unexpected community payload.');
    });
  }

  Future<CommunitySummary> createCommunity(CreateCommunityInput input) async {
    return _guard(() async {
      final response = await _dio.post(
        '/communities',
        data: input.toJson(),
        options: _authOptions(),
      );
      final payload = _ensureMap(response.data)['data'];
      if (payload is Map<String, dynamic>) {
        return CommunitySummary.fromJson(payload);
      }
      if (payload is Map) {
        return CommunitySummary.fromJson(Map<String, dynamic>.from(payload as Map));
      }
      throw const CommunityServiceException('Unexpected community creation payload.');
    });
  }

  Future<CommunitySummary> joinCommunity(String communityId) async {
    return _guard(() async {
      final response = await _dio.post('/communities/$communityId/join', options: _authOptions());
      final payload = _ensureMap(response.data)['data'];
      if (payload is Map<String, dynamic>) {
        return CommunitySummary.fromJson(payload);
      }
      if (payload is Map) {
        return CommunitySummary.fromJson(Map<String, dynamic>.from(payload as Map));
      }
      throw const CommunityServiceException('Unexpected join response payload.');
    });
  }

  Future<CommunityLeaveSummary> leaveCommunity(String communityId, {String? reason}) async {
    return _guard(() async {
      final response = await _dio.post(
        '/communities/$communityId/leave',
        data: reason != null && reason.isNotEmpty ? {'reason': reason} : null,
        options: _authOptions(),
      );
      final payload = _ensureMap(response.data)['data'];
      if (payload is Map<String, dynamic>) {
        return CommunityLeaveSummary.fromJson(payload);
      }
      if (payload is Map) {
        return CommunityLeaveSummary.fromJson(Map<String, dynamic>.from(payload as Map));
      }
      throw const CommunityServiceException('Unexpected leave response payload.');
    });
  }

  Future<CommunityFeedPage> fetchCommunityFeed(
    String communityId, {
    int page = 1,
    int perPage = 10,
    String? query,
    String? postType,
  }) async {
    return _guard(() async {
      final response = await _dio.get(
        '/communities/$communityId/posts',
        queryParameters: <String, dynamic>{
          'page': page,
          'perPage': perPage,
          if (query != null && query.trim().isNotEmpty) 'query': query.trim(),
          if (postType != null && postType.trim().isNotEmpty) 'postType': postType.trim(),
        },
        options: _authOptions(),
      );

      final data = _ensureMap(response.data);
      return CommunityFeedPage.fromJson({
        'data': data['data'],
        'meta': data['meta'],
      });
    });
  }

  Future<CommunityPost> createPost(String communityId, CreateCommunityPostInput input) async {
    return _guard(() async {
      final response = await _dio.post(
        '/communities/$communityId/posts',
        data: input.toJson(),
        options: _authOptions(),
      );
      final payload = _ensureMap(response.data)['data'];
      if (payload is Map<String, dynamic>) {
        return CommunityPost.fromJson(payload);
      }
      if (payload is Map) {
        return CommunityPost.fromJson(Map<String, dynamic>.from(payload as Map));
      }
      throw const CommunityServiceException('Unexpected create post payload.');
    });
  }

  Future<CommunityPost> moderatePost(
    String communityId,
    String postId, {
    required String action,
    String? reason,
  }) async {
    return _guard(() async {
      final response = await _dio.post(
        '/communities/$communityId/posts/$postId/moderate',
        data: <String, dynamic>{
          'action': action,
          if (reason != null && reason.isNotEmpty) 'reason': reason,
        },
        options: _authOptions(),
      );
      final payload = _ensureMap(response.data)['data'];
      if (payload is Map<String, dynamic>) {
        return CommunityPost.fromJson(payload);
      }
      if (payload is Map) {
        return CommunityPost.fromJson(Map<String, dynamic>.from(payload as Map));
      }
      throw const CommunityServiceException('Unexpected moderation payload.');
    });
  }

  Future<CommunityPost> removePost(String communityId, String postId, {String? reason}) async {
    return _guard(() async {
      final response = await _dio.delete(
        '/communities/$communityId/posts/$postId',
        data: reason != null && reason.isNotEmpty ? {'reason': reason} : null,
        options: _authOptions(),
      );
      final payload = _ensureMap(response.data)['data'];
      if (payload is Map<String, dynamic>) {
        return CommunityPost.fromJson(payload);
      }
      if (payload is Map) {
        return CommunityPost.fromJson(Map<String, dynamic>.from(payload as Map));
      }
      throw const CommunityServiceException('Unexpected remove payload.');
    });
  }

  Future<CommunityPost> updatePost(
    String communityId,
    String postId,
    CreateCommunityPostInput input,
  ) async {
    return _guard(() async {
      final metadata = {
        ...input.metadata,
        'replacementFor': postId,
      };
      await moderatePost(
        communityId,
        postId,
        action: 'suppress',
        reason: 'Edited via mobile app',
      );
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
          featured: input.featured,
          attachments: input.attachments,
        ),
      );
    });
  }

  Map<String, dynamic> _ensureMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value as Map);
    }
    throw const CommunityServiceException('Unexpected response payload.');
  }
}

class CommunityServiceException implements Exception {
  const CommunityServiceException(this.message, {this.cause});

  final String message;
  final Object? cause;

  @override
  String toString() => 'CommunityServiceException: $message';
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
