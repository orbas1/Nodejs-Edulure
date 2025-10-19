import 'package:dio/dio.dart';

import 'api_config.dart';
import 'session_manager.dart';

typedef JsonMap = Map<String, dynamic>;

class CommunityChatService {
  CommunityChatService()
      : _dio = Dio(
          BaseOptions(
            baseUrl: apiBaseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 20),
          ),
        );

  final Dio _dio;

  Options _authOptions() {
    final token = SessionManager.getAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('Authentication required');
    }
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  Future<List<CommunityChatChannelSummary>> listChannels(String communityId) async {
    final response = await _dio.get(
      '/communities/$communityId/chat/channels',
      options: _authOptions(),
    );
    final data = response.data;
    if (data is JsonMap && data['data'] is List) {
      return (data['data'] as List)
          .whereType<Map>()
          .map((entry) => CommunityChatChannelSummary.fromJson(Map<String, dynamic>.from(entry as Map)))
          .toList();
    }
    return const <CommunityChatChannelSummary>[];
  }

  Future<List<CommunityChatMessageDto>> listMessages(
    String communityId,
    String channelId, {
    int? limit,
    DateTime? before,
    DateTime? after,
    int? threadRootId,
    bool includeHidden = false,
  }) async {
    final query = <String, dynamic>{
      if (limit != null) 'limit': limit,
      if (before != null) 'before': before.toIso8601String(),
      if (after != null) 'after': after.toIso8601String(),
      if (threadRootId != null) 'threadRootId': threadRootId,
      if (includeHidden) 'includeHidden': true,
    };

    final response = await _dio.get(
      '/communities/$communityId/chat/channels/$channelId/messages',
      queryParameters: query.isEmpty ? null : query,
      options: _authOptions(),
    );
    final data = response.data;
    if (data is JsonMap && data['data'] is List) {
      return (data['data'] as List)
          .whereType<Map>()
          .map((entry) => CommunityChatMessageDto.fromJson(Map<String, dynamic>.from(entry as Map)))
          .toList();
    }
    return const <CommunityChatMessageDto>[];
  }

  Future<CommunityChatMessageDto> postMessage(
    String communityId,
    String channelId,
    CommunityChatMessageDraft draft,
  ) async {
    final response = await _dio.post(
      '/communities/$communityId/chat/channels/$channelId/messages',
      data: draft.toJson(),
      options: _authOptions(),
    );
    final data = response.data;
    if (data is JsonMap && data['data'] is Map) {
      return CommunityChatMessageDto.fromJson(Map<String, dynamic>.from(data['data'] as Map));
    }
    throw Exception('Unexpected message payload');
  }

  Future<void> acknowledgeRead(String communityId, String channelId, {int? messageId, DateTime? timestamp}) async {
    await _dio.post(
      '/communities/$communityId/chat/channels/$channelId/read',
      data: <String, dynamic>{
        if (messageId != null) 'messageId': messageId,
        if (timestamp != null) 'timestamp': timestamp.toIso8601String(),
      },
      options: _authOptions(),
    );
  }

  Future<CommunityChatReactionSummary> addReaction(
    String communityId,
    String channelId,
    String messageId,
    String emoji,
  ) async {
    final response = await _dio.post(
      '/communities/$communityId/chat/channels/$channelId/messages/$messageId/reactions',
      data: <String, dynamic>{'emoji': emoji},
      options: _authOptions(),
    );
    final data = response.data;
    if (data is JsonMap && data['data'] is Map) {
      return CommunityChatReactionSummary.fromJson(Map<String, dynamic>.from(data['data'] as Map));
    }
    throw Exception('Unexpected reaction payload');
  }

  Future<CommunityChatReactionSummary> removeReaction(
    String communityId,
    String channelId,
    String messageId,
    String emoji,
  ) async {
    final response = await _dio.delete(
      '/communities/$communityId/chat/channels/$channelId/messages/$messageId/reactions',
      data: <String, dynamic>{'emoji': emoji},
      options: _authOptions(),
    );
    final data = response.data;
    if (data is JsonMap && data['data'] is Map) {
      return CommunityChatReactionSummary.fromJson(Map<String, dynamic>.from(data['data'] as Map));
    }
    throw Exception('Unexpected reaction payload');
  }

  Future<CommunityChatMessageModeration> moderateMessage(
    String communityId,
    String channelId,
    String messageId,
    CommunityChatModeration moderation,
  ) async {
    final response = await _dio.post(
      '/communities/$communityId/chat/channels/$channelId/messages/$messageId/moderate',
      data: moderation.toJson(),
      options: _authOptions(),
    );
    final data = response.data;
    if (data is JsonMap && data['data'] is Map) {
      return CommunityChatMessageModeration.fromJson(Map<String, dynamic>.from(data['data'] as Map));
    }
    throw Exception('Unexpected moderation payload');
  }

  Future<List<CommunityPresenceSession>> listPresence(String communityId) async {
    final response = await _dio.get(
      '/communities/$communityId/chat/presence',
      options: _authOptions(),
    );
    final data = response.data;
    if (data is JsonMap && data['data'] is List) {
      return (data['data'] as List)
          .whereType<Map>()
          .map((entry) => CommunityPresenceSession.fromJson(Map<String, dynamic>.from(entry as Map)))
          .toList();
    }
    return const <CommunityPresenceSession>[];
  }

  Future<CommunityPresenceSession> updatePresence(CommunityPresenceDraft draft) async {
    final response = await _dio.post(
      '/communities/${draft.communityId}/chat/presence',
      data: draft.toJson(),
      options: _authOptions(),
    );
    final data = response.data;
    if (data is JsonMap && data['data'] is Map) {
      return CommunityPresenceSession.fromJson(Map<String, dynamic>.from(data['data'] as Map));
    }
    throw Exception('Unexpected presence payload');
  }
}

class CommunityChatChannelSummary {
  CommunityChatChannelSummary({
    required this.channel,
    required this.membership,
    required this.unreadCount,
    this.latestMessage,
  });

  factory CommunityChatChannelSummary.fromJson(JsonMap json) {
    return CommunityChatChannelSummary(
      channel: CommunityChatChannelDto.fromJson(_map(json['channel'])),
      membership: CommunityChannelMembershipDto.fromJson(_map(json['membership'])),
      latestMessage: json['latestMessage'] != null
          ? CommunityChatMessageDto.fromJson(_map(json['latestMessage']))
          : null,
      unreadCount: json['unreadCount'] is num ? (json['unreadCount'] as num).toInt() : 0,
    );
  }

  final CommunityChatChannelDto channel;
  final CommunityChannelMembershipDto membership;
  final CommunityChatMessageDto? latestMessage;
  final int unreadCount;
}

class CommunityChatChannelDto {
  CommunityChatChannelDto({
    required this.id,
    required this.communityId,
    required this.name,
    required this.slug,
    required this.channelType,
    required this.description,
    required this.metadata,
    required this.isDefault,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CommunityChatChannelDto.fromJson(JsonMap json) {
    return CommunityChatChannelDto(
      id: json['id'].toString(),
      communityId: json['communityId'].toString(),
      name: json['name']?.toString() ?? 'Channel',
      slug: json['slug']?.toString() ?? '',
      channelType: json['channelType']?.toString() ?? 'text',
      description: json['description']?.toString(),
      metadata: json['metadata'] is Map ? Map<String, dynamic>.from(json['metadata'] as Map) : <String, dynamic>{},
      isDefault: json['isDefault'] == true,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  final String id;
  final String communityId;
  final String name;
  final String slug;
  final String channelType;
  final String? description;
  final Map<String, dynamic> metadata;
  final bool isDefault;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class CommunityChannelMembershipDto {
  CommunityChannelMembershipDto({
    required this.id,
    required this.channelId,
    required this.userId,
    required this.role,
    required this.notificationsEnabled,
    this.lastReadAt,
    this.muteUntil,
  });

  factory CommunityChannelMembershipDto.fromJson(JsonMap json) {
    return CommunityChannelMembershipDto(
      id: json['id'].toString(),
      channelId: json['channelId'].toString(),
      userId: json['userId'].toString(),
      role: json['role']?.toString() ?? 'member',
      notificationsEnabled: json['notificationsEnabled'] == true,
      lastReadAt: DateTime.tryParse(json['lastReadAt']?.toString() ?? ''),
      muteUntil: DateTime.tryParse(json['muteUntil']?.toString() ?? ''),
    );
  }

  final String id;
  final String channelId;
  final String userId;
  final String role;
  final bool notificationsEnabled;
  final DateTime? lastReadAt;
  final DateTime? muteUntil;
}

class CommunityChatMessageDto {
  CommunityChatMessageDto({
    required this.id,
    required this.communityId,
    required this.channelId,
    required this.authorId,
    required this.messageType,
    required this.body,
    required this.attachments,
    required this.metadata,
    required this.status,
    required this.pinned,
    required this.threadRootId,
    required this.replyToMessageId,
    required this.deliveredAt,
    required this.deletedAt,
    required this.createdAt,
    required this.updatedAt,
    required this.author,
    required this.reactions,
    required this.viewerReactions,
  });

  factory CommunityChatMessageDto.fromJson(JsonMap json) {
    return CommunityChatMessageDto(
      id: json['id'].toString(),
      communityId: json['communityId'].toString(),
      channelId: json['channelId'].toString(),
      authorId: json['authorId'].toString(),
      messageType: json['messageType']?.toString() ?? 'text',
      body: json['body']?.toString() ?? '',
      attachments: json['attachments'] is List
          ? List<Map<String, dynamic>>.from(
              (json['attachments'] as List).whereType<Map>().map((entry) => Map<String, dynamic>.from(entry as Map)),
            )
          : const <Map<String, dynamic>>[],
      metadata: json['metadata'] is Map ? Map<String, dynamic>.from(json['metadata'] as Map) : <String, dynamic>{},
      status: json['status']?.toString() ?? 'visible',
      pinned: json['pinned'] == true,
      threadRootId: json['threadRootId'] != null ? int.tryParse(json['threadRootId'].toString()) : null,
      replyToMessageId: json['replyToMessageId'] != null ? int.tryParse(json['replyToMessageId'].toString()) : null,
      deliveredAt: DateTime.tryParse(json['deliveredAt']?.toString() ?? ''),
      deletedAt: DateTime.tryParse(json['deletedAt']?.toString() ?? ''),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
      author: json['author'] is Map
          ? CommunityChatAuthorDto.fromJson(Map<String, dynamic>.from(json['author'] as Map))
          : CommunityChatAuthorDto.unknown(),
      reactions: json['reactions'] is List
          ? List<CommunityChatReactionDto>.from(
              (json['reactions'] as List).whereType<Map>().map(
                    (entry) => CommunityChatReactionDto.fromJson(Map<String, dynamic>.from(entry as Map)),
                  ),
            )
          : const <CommunityChatReactionDto>[],
      viewerReactions: json['viewerReactions'] is List
          ? List<String>.from((json['viewerReactions'] as List).whereType<String>())
          : const <String>[],
    );
  }

  final String id;
  final String communityId;
  final String channelId;
  final String authorId;
  final String messageType;
  final String body;
  final List<Map<String, dynamic>> attachments;
  final Map<String, dynamic> metadata;
  final String status;
  final bool pinned;
  final int? threadRootId;
  final int? replyToMessageId;
  final DateTime? deliveredAt;
  final DateTime? deletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final CommunityChatAuthorDto author;
  final List<CommunityChatReactionDto> reactions;
  final List<String> viewerReactions;
}

class CommunityChatAuthorDto {
  CommunityChatAuthorDto({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.role,
  });

  factory CommunityChatAuthorDto.fromJson(JsonMap json) {
    return CommunityChatAuthorDto(
      id: json['id'].toString(),
      firstName: json['firstName']?.toString() ?? '',
      lastName: json['lastName']?.toString(),
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'Member',
    );
  }

  factory CommunityChatAuthorDto.unknown() {
    return CommunityChatAuthorDto(id: '0', firstName: 'Unknown', lastName: null, email: '', role: 'Member');
  }

  final String id;
  final String firstName;
  final String? lastName;
  final String email;
  final String role;

  String get displayName => [firstName, lastName].where((part) => part != null && part!.isNotEmpty).join(' ').trim();
}

class CommunityChatReactionDto {
  CommunityChatReactionDto({
    required this.emoji,
    required this.count,
  });

  factory CommunityChatReactionDto.fromJson(JsonMap json) {
    return CommunityChatReactionDto(
      emoji: json['emoji']?.toString() ?? '',
      count: json['count'] is num ? (json['count'] as num).toInt() : 0,
    );
  }

  final String emoji;
  final int count;
}

class CommunityChatReactionSummary {
  CommunityChatReactionSummary({
    required this.messageId,
    required this.reactions,
    required this.viewerReactions,
  });

  factory CommunityChatReactionSummary.fromJson(JsonMap json) {
    return CommunityChatReactionSummary(
      messageId: json['messageId'].toString(),
      reactions: json['reactions'] is List
          ? List<CommunityChatReactionDto>.from(
              (json['reactions'] as List).whereType<Map>().map(
                    (entry) => CommunityChatReactionDto.fromJson(Map<String, dynamic>.from(entry as Map)),
                  ),
            )
          : const <CommunityChatReactionDto>[],
      viewerReactions: json['viewerReactions'] is List
          ? List<String>.from((json['viewerReactions'] as List).whereType<String>())
          : const <String>[],
    );
  }

  final String messageId;
  final List<CommunityChatReactionDto> reactions;
  final List<String> viewerReactions;
}

class CommunityChatMessageModeration {
  CommunityChatMessageModeration({
    required this.messageId,
    required this.action,
    required this.status,
  });

  factory CommunityChatMessageModeration.fromJson(JsonMap json) {
    return CommunityChatMessageModeration(
      messageId: json['messageId']?.toString() ?? '',
      action: json['action']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
    );
  }

  final String messageId;
  final String action;
  final String status;
}

class CommunityPresenceSession {
  CommunityPresenceSession({
    required this.id,
    required this.userId,
    required this.status,
    required this.client,
    required this.metadata,
    this.connectedAt,
    this.expiresAt,
  });

  factory CommunityPresenceSession.fromJson(JsonMap json) {
    return CommunityPresenceSession(
      id: json['id'].toString(),
      userId: json['userId'].toString(),
      status: json['status']?.toString() ?? 'offline',
      client: json['client']?.toString() ?? 'mobile',
      metadata: json['metadata'] is Map ? Map<String, dynamic>.from(json['metadata'] as Map) : <String, dynamic>{},
      connectedAt: DateTime.tryParse(json['connectedAt']?.toString() ?? ''),
      expiresAt: DateTime.tryParse(json['expiresAt']?.toString() ?? ''),
    );
  }

  final String id;
  final String userId;
  final String status;
  final String client;
  final Map<String, dynamic> metadata;
  final DateTime? connectedAt;
  final DateTime? expiresAt;
}

class CommunityPresenceDraft {
  CommunityPresenceDraft({
    required this.communityId,
    this.status = 'online',
    this.client = 'mobile',
    this.ttlMinutes,
    this.metadata = const <String, dynamic>{},
    this.connectedAt,
  });

  final String communityId;
  final String status;
  final String client;
  final int? ttlMinutes;
  final Map<String, dynamic> metadata;
  final DateTime? connectedAt;

  JsonMap toJson() {
    return <String, dynamic>{
      'status': status,
      'client': client,
      if (ttlMinutes != null) 'ttlMinutes': ttlMinutes,
      if (metadata.isNotEmpty) 'metadata': metadata,
      if (connectedAt != null) 'connectedAt': connectedAt!.toIso8601String(),
    };
  }
}

class CommunityChatMessageDraft {
  CommunityChatMessageDraft({
    required this.body,
    this.messageType = 'text',
    this.attachments = const <JsonMap>[],
    this.metadata = const <String, dynamic>{},
    this.replyToMessageId,
    this.threadRootId,
  });

  final String body;
  final String messageType;
  final List<JsonMap> attachments;
  final Map<String, dynamic> metadata;
  final int? replyToMessageId;
  final int? threadRootId;

  JsonMap toJson() {
    return <String, dynamic>{
      'messageType': messageType,
      'body': body,
      'attachments': attachments,
      if (metadata.isNotEmpty) 'metadata': metadata,
      if (replyToMessageId != null) 'replyToMessageId': replyToMessageId,
      if (threadRootId != null) 'threadRootId': threadRootId,
    };
  }
}

class CommunityChatModeration {
  CommunityChatModeration({
    required this.action,
    this.reason,
    this.metadata = const <String, dynamic>{},
  });

  final String action;
  final String? reason;
  final Map<String, dynamic> metadata;

  JsonMap toJson() {
    return <String, dynamic>{
      'action': action,
      if (reason != null && reason!.isNotEmpty) 'reason': reason,
      if (metadata.isNotEmpty) 'metadata': metadata,
    };
  }
}

JsonMap _map(Object? value) {
  if (value is JsonMap) return value;
  if (value is Map) {
    return Map<String, dynamic>.from(value as Map);
  }
  return <String, dynamic>{};
}

