import 'package:flutter/foundation.dart';

@immutable
class FeedComment {
  const FeedComment({
    required this.id,
    required this.authorName,
    required this.authorAvatar,
    required this.message,
    required this.createdAt,
  });

  final String id;
  final String authorName;
  final String authorAvatar;
  final String message;
  final DateTime createdAt;

  FeedComment copyWith({
    String? id,
    String? authorName,
    String? authorAvatar,
    String? message,
    DateTime? createdAt,
  }) {
    return FeedComment(
      id: id ?? this.id,
      authorName: authorName ?? this.authorName,
      authorAvatar: authorAvatar ?? this.authorAvatar,
      message: message ?? this.message,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'authorName': authorName,
      'authorAvatar': authorAvatar,
      'message': message,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory FeedComment.fromJson(Map<String, dynamic> json) {
    return FeedComment(
      id: json['id'] as String,
      authorName: json['authorName'] as String,
      authorAvatar: json['authorAvatar'] as String,
      message: json['message'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

@immutable
class FeedPost {
  const FeedPost({
    required this.id,
    required this.communityId,
    required this.communityName,
    required this.authorName,
    required this.authorRole,
    required this.authorAvatar,
    required this.message,
    required this.tags,
    required this.createdAt,
    required this.reactionCount,
    required this.comments,
    this.mediaUrl,
    this.bookmarked = false,
    this.liked = false,
  });

  final String id;
  final String communityId;
  final String communityName;
  final String authorName;
  final String authorRole;
  final String authorAvatar;
  final String message;
  final List<String> tags;
  final DateTime createdAt;
  final int reactionCount;
  final List<FeedComment> comments;
  final String? mediaUrl;
  final bool bookmarked;
  final bool liked;

  FeedPost copyWith({
    String? id,
    String? communityId,
    String? communityName,
    String? authorName,
    String? authorRole,
    String? authorAvatar,
    String? message,
    List<String>? tags,
    DateTime? createdAt,
    int? reactionCount,
    List<FeedComment>? comments,
    String? mediaUrl,
    bool? bookmarked,
    bool? liked,
  }) {
    return FeedPost(
      id: id ?? this.id,
      communityId: communityId ?? this.communityId,
      communityName: communityName ?? this.communityName,
      authorName: authorName ?? this.authorName,
      authorRole: authorRole ?? this.authorRole,
      authorAvatar: authorAvatar ?? this.authorAvatar,
      message: message ?? this.message,
      tags: tags ?? this.tags,
      createdAt: createdAt ?? this.createdAt,
      reactionCount: reactionCount ?? this.reactionCount,
      comments: comments ?? this.comments,
      mediaUrl: mediaUrl ?? this.mediaUrl,
      bookmarked: bookmarked ?? this.bookmarked,
      liked: liked ?? this.liked,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'communityId': communityId,
      'communityName': communityName,
      'authorName': authorName,
      'authorRole': authorRole,
      'authorAvatar': authorAvatar,
      'message': message,
      'tags': tags,
      'createdAt': createdAt.toIso8601String(),
      'reactionCount': reactionCount,
      'comments': comments.map((e) => e.toJson()).toList(),
      'mediaUrl': mediaUrl,
      'bookmarked': bookmarked,
      'liked': liked,
    };
  }

  factory FeedPost.fromJson(Map<String, dynamic> json) {
    return FeedPost(
      id: json['id'] as String,
      communityId: json['communityId'] as String,
      communityName: json['communityName'] as String,
      authorName: json['authorName'] as String,
      authorRole: json['authorRole'] as String,
      authorAvatar: json['authorAvatar'] as String,
      message: json['message'] as String,
      tags: (json['tags'] as List).cast<String>(),
      createdAt: DateTime.parse(json['createdAt'] as String),
      reactionCount: json['reactionCount'] as int,
      comments: (json['comments'] as List)
          .map((entry) => FeedComment.fromJson(Map<String, dynamic>.from(entry as Map)))
          .toList(),
      mediaUrl: json['mediaUrl'] as String?,
      bookmarked: json['bookmarked'] as bool? ?? false,
      liked: json['liked'] as bool? ?? false,
    );
  }
}

@immutable
class CommunityMember {
  const CommunityMember({
    required this.id,
    required this.name,
    required this.role,
    required this.avatarUrl,
    required this.joinedAt,
  });

  final String id;
  final String name;
  final String role;
  final String avatarUrl;
  final DateTime joinedAt;

  CommunityMember copyWith({
    String? id,
    String? name,
    String? role,
    String? avatarUrl,
    DateTime? joinedAt,
  }) {
    return CommunityMember(
      id: id ?? this.id,
      name: name ?? this.name,
      role: role ?? this.role,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      joinedAt: joinedAt ?? this.joinedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'role': role,
      'avatarUrl': avatarUrl,
      'joinedAt': joinedAt.toIso8601String(),
    };
  }

  factory CommunityMember.fromJson(Map<String, dynamic> json) {
    return CommunityMember(
      id: json['id'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
      avatarUrl: json['avatarUrl'] as String,
      joinedAt: DateTime.parse(json['joinedAt'] as String),
    );
  }
}

@immutable
class CommunityEvent {
  const CommunityEvent({
    required this.id,
    required this.title,
    required this.description,
    required this.start,
    required this.end,
    required this.location,
    this.coverImage,
    this.meetingUrl,
  });

  final String id;
  final String title;
  final String description;
  final DateTime start;
  final DateTime end;
  final String location;
  final String? coverImage;
  final String? meetingUrl;

  CommunityEvent copyWith({
    String? id,
    String? title,
    String? description,
    DateTime? start,
    DateTime? end,
    String? location,
    String? coverImage,
    String? meetingUrl,
  }) {
    return CommunityEvent(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      start: start ?? this.start,
      end: end ?? this.end,
      location: location ?? this.location,
      coverImage: coverImage ?? this.coverImage,
      meetingUrl: meetingUrl ?? this.meetingUrl,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'start': start.toIso8601String(),
      'end': end.toIso8601String(),
      'location': location,
      'coverImage': coverImage,
      'meetingUrl': meetingUrl,
    };
  }

  factory CommunityEvent.fromJson(Map<String, dynamic> json) {
    return CommunityEvent(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      start: DateTime.parse(json['start'] as String),
      end: DateTime.parse(json['end'] as String),
      location: json['location'] as String,
      coverImage: json['coverImage'] as String?,
      meetingUrl: json['meetingUrl'] as String?,
    );
  }
}

@immutable
class CommunityModel {
  const CommunityModel({
    required this.id,
    required this.name,
    required this.description,
    required this.bannerImage,
    required this.accentColor,
    required this.tags,
    required this.memberCount,
    required this.joined,
    required this.members,
    required this.events,
    this.location,
    this.guidelines,
    this.focusAreas = const <String>[],
    this.isPrivate = false,
  });

  final String id;
  final String name;
  final String description;
  final String bannerImage;
  final String accentColor;
  final List<String> tags;
  final int memberCount;
  final bool joined;
  final List<CommunityMember> members;
  final List<CommunityEvent> events;
  final String? location;
  final List<String>? guidelines;
  final List<String> focusAreas;
  final bool isPrivate;

  CommunityModel copyWith({
    String? id,
    String? name,
    String? description,
    String? bannerImage,
    String? accentColor,
    List<String>? tags,
    int? memberCount,
    bool? joined,
    List<CommunityMember>? members,
    List<CommunityEvent>? events,
    String? location,
    List<String>? guidelines,
    List<String>? focusAreas,
    bool? isPrivate,
  }) {
    return CommunityModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      bannerImage: bannerImage ?? this.bannerImage,
      accentColor: accentColor ?? this.accentColor,
      tags: tags ?? this.tags,
      memberCount: memberCount ?? this.memberCount,
      joined: joined ?? this.joined,
      members: members ?? this.members,
      events: events ?? this.events,
      location: location ?? this.location,
      guidelines: guidelines ?? this.guidelines,
      focusAreas: focusAreas ?? this.focusAreas,
      isPrivate: isPrivate ?? this.isPrivate,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'bannerImage': bannerImage,
      'accentColor': accentColor,
      'tags': tags,
      'memberCount': memberCount,
      'joined': joined,
      'members': members.map((e) => e.toJson()).toList(),
      'events': events.map((e) => e.toJson()).toList(),
      'location': location,
      'guidelines': guidelines,
      'focusAreas': focusAreas,
      'isPrivate': isPrivate,
    };
  }

  factory CommunityModel.fromJson(Map<String, dynamic> json) {
    return CommunityModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      bannerImage: json['bannerImage'] as String,
      accentColor: json['accentColor'] as String,
      tags: (json['tags'] as List).cast<String>(),
      memberCount: json['memberCount'] as int,
      joined: json['joined'] as bool,
      members: (json['members'] as List)
          .map((entry) => CommunityMember.fromJson(Map<String, dynamic>.from(entry as Map)))
          .toList(),
      events: (json['events'] as List)
          .map((entry) => CommunityEvent.fromJson(Map<String, dynamic>.from(entry as Map)))
          .toList(),
      location: json['location'] as String?,
      guidelines: json['guidelines'] == null
          ? null
          : (json['guidelines'] as List).cast<String>(),
      focusAreas: (json['focusAreas'] as List?)?.cast<String>() ?? const <String>[],
      isPrivate: json['isPrivate'] as bool? ?? false,
    );
  }
}

@immutable
class ExplorerResource {
  const ExplorerResource({
    required this.id,
    required this.entityType,
    required this.title,
    required this.subtitle,
    required this.description,
    required this.tags,
    required this.updatedAt,
    this.coverImage,
    this.communityId,
    this.link,
    this.owner,
    this.isFavorite = false,
  });

  final String id;
  final String entityType;
  final String title;
  final String subtitle;
  final String description;
  final List<String> tags;
  final DateTime updatedAt;
  final String? coverImage;
  final String? communityId;
  final String? link;
  final String? owner;
  final bool isFavorite;

  ExplorerResource copyWith({
    String? id,
    String? entityType,
    String? title,
    String? subtitle,
    String? description,
    List<String>? tags,
    DateTime? updatedAt,
    String? coverImage,
    String? communityId,
    String? link,
    String? owner,
    bool? isFavorite,
  }) {
    return ExplorerResource(
      id: id ?? this.id,
      entityType: entityType ?? this.entityType,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      description: description ?? this.description,
      tags: tags ?? this.tags,
      updatedAt: updatedAt ?? this.updatedAt,
      coverImage: coverImage ?? this.coverImage,
      communityId: communityId ?? this.communityId,
      link: link ?? this.link,
      owner: owner ?? this.owner,
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'entityType': entityType,
      'title': title,
      'subtitle': subtitle,
      'description': description,
      'tags': tags,
      'updatedAt': updatedAt.toIso8601String(),
      'coverImage': coverImage,
      'communityId': communityId,
      'link': link,
      'owner': owner,
      'isFavorite': isFavorite,
    };
  }

  factory ExplorerResource.fromJson(Map<String, dynamic> json) {
    return ExplorerResource(
      id: json['id'] as String,
      entityType: json['entityType'] as String,
      title: json['title'] as String,
      subtitle: json['subtitle'] as String,
      description: json['description'] as String,
      tags: (json['tags'] as List).cast<String>(),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      coverImage: json['coverImage'] as String?,
      communityId: json['communityId'] as String?,
      link: json['link'] as String?,
      owner: json['owner'] as String?,
      isFavorite: json['isFavorite'] as bool? ?? false,
    );
  }
}

class FeedPostDraft {
  const FeedPostDraft({
    required this.communityId,
    required this.message,
    required this.tags,
    this.mediaUrl,
    this.authorName = 'You',
    this.authorRole = 'Community Member',
    this.authorAvatar,
  });

  final String communityId;
  final String message;
  final List<String> tags;
  final String? mediaUrl;
  final String authorName;
  final String authorRole;
  final String? authorAvatar;
}

class FeedCommentDraft {
  const FeedCommentDraft({
    this.authorName = 'You',
    this.authorAvatar,
  });

  final String authorName;
  final String? authorAvatar;
}

class CommunityDraft {
  const CommunityDraft({
    required this.name,
    required this.description,
    required this.bannerImage,
    required this.accentColor,
    required this.tags,
    this.location,
    this.guidelines,
    this.focusAreas = const <String>[],
    this.isPrivate = false,
  });

  final String name;
  final String description;
  final String bannerImage;
  final String accentColor;
  final List<String> tags;
  final String? location;
  final List<String>? guidelines;
  final List<String> focusAreas;
  final bool isPrivate;
}

class CommunityEventDraft {
  const CommunityEventDraft({
    required this.title,
    required this.description,
    required this.start,
    required this.end,
    required this.location,
    this.coverImage,
    this.meetingUrl,
  });

  final String title;
  final String description;
  final DateTime start;
  final DateTime end;
  final String location;
  final String? coverImage;
  final String? meetingUrl;
}

class CommunityMemberDraft {
  const CommunityMemberDraft({
    required this.name,
    required this.role,
    required this.avatarUrl,
  });

  final String name;
  final String role;
  final String avatarUrl;
}

class ExplorerResourceDraft {
  const ExplorerResourceDraft({
    required this.entityType,
    required this.title,
    required this.subtitle,
    required this.description,
    required this.tags,
    this.coverImage,
    this.communityId,
    this.link,
    this.owner,
  });

  final String entityType;
  final String title;
  final String subtitle;
  final String description;
  final List<String> tags;
  final String? coverImage;
  final String? communityId;
  final String? link;
  final String? owner;
}

class ExplorerQuery {
  const ExplorerQuery({
    required this.query,
    required this.entityTypes,
    required this.tags,
  });

  final String query;
  final Set<String> entityTypes;
  final Set<String> tags;
}
