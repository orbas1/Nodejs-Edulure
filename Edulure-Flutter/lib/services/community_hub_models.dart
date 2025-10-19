import 'package:intl/intl.dart';

class CommunityFeedPost {
  CommunityFeedPost({
    required this.id,
    required this.title,
    required this.body,
    required this.author,
    required this.createdAt,
    required this.updatedAt,
    this.communityId,
    this.coverImageUrl,
    this.tags = const <String>[],
    this.likes = 0,
    this.pinned = false,
    this.attachmentUrls = const <String>[],
  });

  final String id;
  final String title;
  final String body;
  final String author;
  final String? communityId;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? coverImageUrl;
  final List<String> tags;
  final int likes;
  final bool pinned;
  final List<String> attachmentUrls;

  CommunityFeedPost copyWith({
    String? title,
    String? body,
    String? author,
    String? communityId,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? coverImageUrl,
    List<String>? tags,
    int? likes,
    bool? pinned,
    List<String>? attachmentUrls,
  }) {
    return CommunityFeedPost(
      id: id,
      title: title ?? this.title,
      body: body ?? this.body,
      author: author ?? this.author,
      communityId: communityId ?? this.communityId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      coverImageUrl: coverImageUrl ?? this.coverImageUrl,
      tags: tags ?? this.tags,
      likes: likes ?? this.likes,
      pinned: pinned ?? this.pinned,
      attachmentUrls: attachmentUrls ?? this.attachmentUrls,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'body': body,
      'author': author,
      'communityId': communityId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'coverImageUrl': coverImageUrl,
      'tags': tags,
      'likes': likes,
      'pinned': pinned,
      'attachments': attachmentUrls,
    }..removeWhere((key, value) => value == null);
  }

  factory CommunityFeedPost.fromJson(Map<String, dynamic> json) {
    final attachments = <String>[];
    final rawAttachments = json['attachments'];
    if (rawAttachments is List) {
      for (final item in rawAttachments) {
        final value = item?.toString();
        if (value != null && value.isNotEmpty) {
          attachments.add(value);
        }
      }
    }

    final tags = <String>[];
    final rawTags = json['tags'];
    if (rawTags is List) {
      for (final item in rawTags) {
        final value = item?.toString();
        if (value != null && value.isNotEmpty) {
          tags.add(value);
        }
      }
    }

    return CommunityFeedPost(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled',
      body: json['body']?.toString() ?? '',
      author: json['author']?.toString() ?? 'Anonymous',
      communityId: json['communityId']?.toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
      coverImageUrl: json['coverImageUrl']?.toString(),
      tags: tags,
      likes: json['likes'] is int ? json['likes'] as int : int.tryParse(json['likes']?.toString() ?? '0') ?? 0,
      pinned: json['pinned'] == true || json['pinned']?.toString() == 'true',
      attachmentUrls: attachments,
    );
  }

  String get formattedTimestamp {
    return DateFormat('MMM d, yyyy · h:mm a').format(updatedAt);
  }
}

class CommunityClassroom {
  CommunityClassroom({
    required this.id,
    required this.title,
    required this.facilitator,
    required this.description,
    required this.startTime,
    required this.endTime,
    required this.deliveryMode,
    required this.capacity,
    required this.communityId,
    this.resources = const <String>[],
    this.enrolled = const <String>[],
    this.recordingUrl,
    this.coverImageUrl,
    this.tags = const <String>[],
  });

  final String id;
  final String title;
  final String facilitator;
  final String description;
  final DateTime startTime;
  final DateTime endTime;
  final String deliveryMode;
  final int capacity;
  final String communityId;
  final List<String> resources;
  final List<String> enrolled;
  final String? recordingUrl;
  final String? coverImageUrl;
  final List<String> tags;

  bool get isFull => enrolled.length >= capacity;

  CommunityClassroom copyWith({
    String? title,
    String? facilitator,
    String? description,
    DateTime? startTime,
    DateTime? endTime,
    String? deliveryMode,
    int? capacity,
    String? communityId,
    List<String>? resources,
    List<String>? enrolled,
    String? recordingUrl,
    String? coverImageUrl,
    List<String>? tags,
  }) {
    return CommunityClassroom(
      id: id,
      title: title ?? this.title,
      facilitator: facilitator ?? this.facilitator,
      description: description ?? this.description,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      deliveryMode: deliveryMode ?? this.deliveryMode,
      capacity: capacity ?? this.capacity,
      communityId: communityId ?? this.communityId,
      resources: resources ?? this.resources,
      enrolled: enrolled ?? this.enrolled,
      recordingUrl: recordingUrl ?? this.recordingUrl,
      coverImageUrl: coverImageUrl ?? this.coverImageUrl,
      tags: tags ?? this.tags,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'facilitator': facilitator,
      'description': description,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'deliveryMode': deliveryMode,
      'capacity': capacity,
      'communityId': communityId,
      'resources': resources,
      'enrolled': enrolled,
      'recordingUrl': recordingUrl,
      'coverImageUrl': coverImageUrl,
      'tags': tags,
    }..removeWhere((key, value) => value == null);
  }

  factory CommunityClassroom.fromJson(Map<String, dynamic> json) {
    return CommunityClassroom(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Classroom',
      facilitator: json['facilitator']?.toString() ?? 'Facilitator',
      description: json['description']?.toString() ?? '',
      startTime: DateTime.tryParse(json['startTime']?.toString() ?? '') ?? DateTime.now(),
      endTime: DateTime.tryParse(json['endTime']?.toString() ?? '') ?? DateTime.now().add(const Duration(hours: 1)),
      deliveryMode: json['deliveryMode']?.toString() ?? 'virtual',
      capacity: json['capacity'] is int
          ? json['capacity'] as int
          : int.tryParse(json['capacity']?.toString() ?? '0') ?? 0,
      communityId: json['communityId']?.toString() ?? '',
      resources: _castStringList(json['resources']),
      enrolled: _castStringList(json['enrolled']),
      recordingUrl: json['recordingUrl']?.toString(),
      coverImageUrl: json['coverImageUrl']?.toString(),
      tags: _castStringList(json['tags']),
    );
  }

  String get windowLabel {
    return '${DateFormat('MMM d · h:mm a').format(startTime)} - ${DateFormat('h:mm a').format(endTime)}';
  }
}

class CommunityCalendarEntry {
  CommunityCalendarEntry({
    required this.id,
    required this.title,
    required this.description,
    required this.startTime,
    required this.endTime,
    required this.location,
    required this.organiser,
    this.communityId,
    this.reminders = const <Duration>[],
    this.tags = const <String>[],
    this.coverImageUrl,
  });

  final String id;
  final String title;
  final String description;
  final DateTime startTime;
  final DateTime endTime;
  final String location;
  final String organiser;
  final String? communityId;
  final List<Duration> reminders;
  final List<String> tags;
  final String? coverImageUrl;

  CommunityCalendarEntry copyWith({
    String? title,
    String? description,
    DateTime? startTime,
    DateTime? endTime,
    String? location,
    String? organiser,
    String? communityId,
    List<Duration>? reminders,
    List<String>? tags,
    String? coverImageUrl,
  }) {
    return CommunityCalendarEntry(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      location: location ?? this.location,
      organiser: organiser ?? this.organiser,
      communityId: communityId ?? this.communityId,
      reminders: reminders ?? this.reminders,
      tags: tags ?? this.tags,
      coverImageUrl: coverImageUrl ?? this.coverImageUrl,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'description': description,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'location': location,
      'organiser': organiser,
      'communityId': communityId,
      'reminders': reminders.map((duration) => duration.inMinutes).toList(),
      'tags': tags,
      'coverImageUrl': coverImageUrl,
    }..removeWhere((key, value) => value == null);
  }

  factory CommunityCalendarEntry.fromJson(Map<String, dynamic> json) {
    final reminderList = <Duration>[];
    final rawReminders = json['reminders'];
    if (rawReminders is List) {
      for (final item in rawReminders) {
        final minutes = item is int ? item : int.tryParse(item?.toString() ?? '');
        if (minutes != null) {
          reminderList.add(Duration(minutes: minutes));
        }
      }
    }

    return CommunityCalendarEntry(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Event',
      description: json['description']?.toString() ?? '',
      startTime: DateTime.tryParse(json['startTime']?.toString() ?? '') ?? DateTime.now(),
      endTime: DateTime.tryParse(json['endTime']?.toString() ?? '') ?? DateTime.now().add(const Duration(hours: 1)),
      location: json['location']?.toString() ?? '',
      organiser: json['organiser']?.toString() ?? '',
      communityId: json['communityId']?.toString(),
      reminders: reminderList,
      tags: _castStringList(json['tags']),
      coverImageUrl: json['coverImageUrl']?.toString(),
    );
  }

  String get timelineLabel {
    return '${DateFormat('EEE, MMM d').format(startTime)} · ${DateFormat('h:mm a').format(startTime)} - ${DateFormat('h:mm a').format(endTime)}';
  }
}

class CommunityLivestream {
  CommunityLivestream({
    required this.id,
    required this.title,
    required this.host,
    required this.streamUrl,
    required this.scheduledAt,
    required this.status,
    required this.description,
    this.communityId,
    this.thumbnailUrl,
    this.tags = const <String>[],
    this.viewers = 0,
    this.duration,
  });

  final String id;
  final String title;
  final String host;
  final String streamUrl;
  final DateTime scheduledAt;
  final String status;
  final String description;
  final String? communityId;
  final String? thumbnailUrl;
  final List<String> tags;
  final int viewers;
  final Duration? duration;

  CommunityLivestream copyWith({
    String? title,
    String? host,
    String? streamUrl,
    DateTime? scheduledAt,
    String? status,
    String? description,
    String? communityId,
    String? thumbnailUrl,
    List<String>? tags,
    int? viewers,
    Duration? duration,
  }) {
    return CommunityLivestream(
      id: id,
      title: title ?? this.title,
      host: host ?? this.host,
      streamUrl: streamUrl ?? this.streamUrl,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      status: status ?? this.status,
      description: description ?? this.description,
      communityId: communityId ?? this.communityId,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      tags: tags ?? this.tags,
      viewers: viewers ?? this.viewers,
      duration: duration ?? this.duration,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'host': host,
      'streamUrl': streamUrl,
      'scheduledAt': scheduledAt.toIso8601String(),
      'status': status,
      'description': description,
      'communityId': communityId,
      'thumbnailUrl': thumbnailUrl,
      'tags': tags,
      'viewers': viewers,
      'duration': duration?.inMinutes,
    }..removeWhere((key, value) => value == null);
  }

  factory CommunityLivestream.fromJson(Map<String, dynamic> json) {
    return CommunityLivestream(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Livestream',
      host: json['host']?.toString() ?? 'Host',
      streamUrl: json['streamUrl']?.toString() ?? '',
      scheduledAt: DateTime.tryParse(json['scheduledAt']?.toString() ?? '') ?? DateTime.now(),
      status: json['status']?.toString() ?? 'scheduled',
      description: json['description']?.toString() ?? '',
      communityId: json['communityId']?.toString(),
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      tags: _castStringList(json['tags']),
      viewers: json['viewers'] is int
          ? json['viewers'] as int
          : int.tryParse(json['viewers']?.toString() ?? '0') ?? 0,
      duration: json['duration'] is int
          ? Duration(minutes: json['duration'] as int)
          : json['duration'] != null
              ? Duration(minutes: int.tryParse(json['duration'].toString()) ?? 0)
              : null,
    );
  }

  String get statusLabel => status[0].toUpperCase() + status.substring(1);
}

class CommunityPodcastEpisode {
  CommunityPodcastEpisode({
    required this.id,
    required this.title,
    required this.description,
    required this.audioUrl,
    required this.host,
    required this.publishedAt,
    required this.duration,
    this.artworkUrl,
    this.tags = const <String>[],
    this.communityId,
  });

  final String id;
  final String title;
  final String description;
  final String audioUrl;
  final String host;
  final DateTime publishedAt;
  final Duration duration;
  final String? artworkUrl;
  final List<String> tags;
  final String? communityId;

  CommunityPodcastEpisode copyWith({
    String? title,
    String? description,
    String? audioUrl,
    String? host,
    DateTime? publishedAt,
    Duration? duration,
    String? artworkUrl,
    List<String>? tags,
    String? communityId,
  }) {
    return CommunityPodcastEpisode(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      audioUrl: audioUrl ?? this.audioUrl,
      host: host ?? this.host,
      publishedAt: publishedAt ?? this.publishedAt,
      duration: duration ?? this.duration,
      artworkUrl: artworkUrl ?? this.artworkUrl,
      tags: tags ?? this.tags,
      communityId: communityId ?? this.communityId,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'description': description,
      'audioUrl': audioUrl,
      'host': host,
      'publishedAt': publishedAt.toIso8601String(),
      'duration': duration.inMinutes,
      'artworkUrl': artworkUrl,
      'tags': tags,
      'communityId': communityId,
    }..removeWhere((key, value) => value == null);
  }

  factory CommunityPodcastEpisode.fromJson(Map<String, dynamic> json) {
    return CommunityPodcastEpisode(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Episode',
      description: json['description']?.toString() ?? '',
      audioUrl: json['audioUrl']?.toString() ?? '',
      host: json['host']?.toString() ?? 'Host',
      publishedAt: DateTime.tryParse(json['publishedAt']?.toString() ?? '') ?? DateTime.now(),
      duration: json['duration'] is int
          ? Duration(minutes: json['duration'] as int)
          : Duration(minutes: int.tryParse(json['duration']?.toString() ?? '0') ?? 0),
      artworkUrl: json['artworkUrl']?.toString(),
      tags: _castStringList(json['tags']),
      communityId: json['communityId']?.toString(),
    );
  }

  String get durationLabel {
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;
    if (hours > 0) {
      return '${hours}h ${minutes}m';
    }
    return '${minutes}m';
  }
}

class CommunityLeaderboardEntry {
  CommunityLeaderboardEntry({
    required this.id,
    required this.memberName,
    required this.points,
    required this.avatarUrl,
    this.rank = 0,
    this.badges = const <String>[],
    this.trend = 0,
  });

  final String id;
  final String memberName;
  final int points;
  final String avatarUrl;
  final int rank;
  final List<String> badges;
  final int trend;

  CommunityLeaderboardEntry copyWith({
    String? memberName,
    int? points,
    String? avatarUrl,
    int? rank,
    List<String>? badges,
    int? trend,
  }) {
    return CommunityLeaderboardEntry(
      id: id,
      memberName: memberName ?? this.memberName,
      points: points ?? this.points,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      rank: rank ?? this.rank,
      badges: badges ?? this.badges,
      trend: trend ?? this.trend,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'memberName': memberName,
      'points': points,
      'avatarUrl': avatarUrl,
      'rank': rank,
      'badges': badges,
      'trend': trend,
    };
  }

  factory CommunityLeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return CommunityLeaderboardEntry(
      id: json['id']?.toString() ?? '',
      memberName: json['memberName']?.toString() ?? 'Member',
      points: json['points'] is int
          ? json['points'] as int
          : int.tryParse(json['points']?.toString() ?? '0') ?? 0,
      avatarUrl: json['avatarUrl']?.toString() ?? '',
      rank: json['rank'] is int
          ? json['rank'] as int
          : int.tryParse(json['rank']?.toString() ?? '0') ?? 0,
      badges: _castStringList(json['badges']),
      trend: json['trend'] is int
          ? json['trend'] as int
          : int.tryParse(json['trend']?.toString() ?? '0') ?? 0,
    );
  }
}

class CommunityEvent {
  CommunityEvent({
    required this.id,
    required this.title,
    required this.description,
    required this.startTime,
    required this.endTime,
    required this.location,
    required this.host,
    this.communityId,
    this.capacity,
    this.coverImageUrl,
    this.registrationUrl,
    this.tags = const <String>[],
    this.rsvpCount = 0,
  });

  final String id;
  final String title;
  final String description;
  final DateTime startTime;
  final DateTime endTime;
  final String location;
  final String host;
  final String? communityId;
  final int? capacity;
  final String? coverImageUrl;
  final String? registrationUrl;
  final List<String> tags;
  final int rsvpCount;

  CommunityEvent copyWith({
    String? title,
    String? description,
    DateTime? startTime,
    DateTime? endTime,
    String? location,
    String? host,
    String? communityId,
    int? capacity,
    String? coverImageUrl,
    String? registrationUrl,
    List<String>? tags,
    int? rsvpCount,
  }) {
    return CommunityEvent(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      location: location ?? this.location,
      host: host ?? this.host,
      communityId: communityId ?? this.communityId,
      capacity: capacity ?? this.capacity,
      coverImageUrl: coverImageUrl ?? this.coverImageUrl,
      registrationUrl: registrationUrl ?? this.registrationUrl,
      tags: tags ?? this.tags,
      rsvpCount: rsvpCount ?? this.rsvpCount,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'description': description,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'location': location,
      'host': host,
      'communityId': communityId,
      'capacity': capacity,
      'coverImageUrl': coverImageUrl,
      'registrationUrl': registrationUrl,
      'tags': tags,
      'rsvpCount': rsvpCount,
    }..removeWhere((key, value) => value == null);
  }

  factory CommunityEvent.fromJson(Map<String, dynamic> json) {
    return CommunityEvent(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Event',
      description: json['description']?.toString() ?? '',
      startTime: DateTime.tryParse(json['startTime']?.toString() ?? '') ?? DateTime.now(),
      endTime: DateTime.tryParse(json['endTime']?.toString() ?? '') ?? DateTime.now().add(const Duration(hours: 1)),
      location: json['location']?.toString() ?? '',
      host: json['host']?.toString() ?? '',
      communityId: json['communityId']?.toString(),
      capacity: json['capacity'] is int
          ? json['capacity'] as int
          : int.tryParse(json['capacity']?.toString() ?? ''),
      coverImageUrl: json['coverImageUrl']?.toString(),
      registrationUrl: json['registrationUrl']?.toString(),
      tags: _castStringList(json['tags']),
      rsvpCount: json['rsvpCount'] is int
          ? json['rsvpCount'] as int
          : int.tryParse(json['rsvpCount']?.toString() ?? '0') ?? 0,
    );
  }

  String get scheduleLabel {
    return '${DateFormat('MMM d, yyyy').format(startTime)} · ${DateFormat('h:mm a').format(startTime)}';
  }
}

List<String> _castStringList(dynamic value) {
  if (value is List) {
    return value
        .map((entry) => entry?.toString())
        .whereType<String>()
        .where((element) => element.isNotEmpty)
        .toList();
  }
  return const <String>[];
}
