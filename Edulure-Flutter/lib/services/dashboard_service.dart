import 'package:dio/dio.dart';

import 'api_config.dart';
import 'session_manager.dart';

class DashboardException implements Exception {
  DashboardException(this.message);
  final String message;

  @override
  String toString() => message;
}

class DashboardMetric {
  DashboardMetric({
    required this.label,
    required this.value,
    this.change,
    this.trend,
  });

  final String label;
  final String value;
  final String? change;
  final String? trend;

  factory DashboardMetric.fromJson(Map<String, dynamic> json) {
    return DashboardMetric(
      label: json['label']?.toString() ?? 'Metric',
      value: json['value']?.toString() ?? '0',
      change: json['change']?.toString(),
      trend: json['trend']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'value': value,
      if (change != null) 'change': change,
      if (trend != null) 'trend': trend,
    };
  }
}

class PaceEntry {
  PaceEntry({
    required this.label,
    required this.minutes,
  });

  final String label;
  final int minutes;

  factory PaceEntry.fromJson(Map<String, dynamic> json) {
    return PaceEntry(
      label: json['label']?.toString() ?? json['day']?.toString() ?? 'Day',
      minutes: (json['minutes'] is num) ? (json['minutes'] as num).round() : int.tryParse('${json['minutes'] ?? 0}') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'minutes': minutes,
    };
  }
}

class UpcomingEvent {
  UpcomingEvent({
    required this.id,
    required this.type,
    required this.date,
    required this.title,
    required this.host,
    required this.action,
  });

  final String id;
  final String type;
  final String date;
  final String title;
  final String host;
  final String action;

  factory UpcomingEvent.fromJson(Map<String, dynamic> json) {
    final idValue = json['id'];
    return UpcomingEvent(
      id: idValue?.toString() ?? json['title']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      type: json['type']?.toString() ?? 'Session',
      date: json['date']?.toString() ?? json['time']?.toString() ?? 'TBC',
      title: json['title']?.toString() ?? 'Upcoming session',
      host: json['host']?.toString() ?? 'Edulure team',
      action: json['action']?.toString() ?? 'View details',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'date': date,
      'title': title,
      'host': host,
      'action': action,
    };
  }
}

class FeedHighlight {
  FeedHighlight({
    required this.id,
    required this.time,
    required this.tags,
    required this.headline,
    required this.reactions,
    required this.comments,
  });

  final String id;
  final String time;
  final List<String> tags;
  final int reactions;
  final int comments;

  factory FeedHighlight.fromJson(Map<String, dynamic> json) {
    final rawTags = json['tags'];
    return FeedHighlight(
      id: json['id']?.toString() ?? json['headline']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      time: json['time']?.toString() ?? 'Moments ago',
      tags: rawTags is List ? rawTags.map((tag) => tag.toString()).toList() : <String>[],
      headline: json['headline']?.toString() ?? 'New activity in your network',
      reactions: (json['reactions'] is num)
          ? (json['reactions'] as num).round()
          : int.tryParse('${json['reactions'] ?? 0}') ?? 0,
      comments: (json['comments'] is num)
          ? (json['comments'] as num).round()
          : int.tryParse('${json['comments'] ?? 0}') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'time': time,
      'tags': tags,
      'headline': headline,
      'reactions': reactions,
      'comments': comments,
    };
  }
}

class CommunityEngagement {
  CommunityEngagement({
    required this.name,
    required this.participation,
  });

  final String name;
  final int participation;

  factory CommunityEngagement.fromJson(Map<String, dynamic> json) {
    return CommunityEngagement(
      name: json['name']?.toString() ?? 'Community',
      participation: (json['participation'] is num)
          ? (json['participation'] as num).round()
          : int.tryParse('${json['participation'] ?? 0}') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'participation': participation,
    };
  }
}

class DashboardNotification {
  DashboardNotification({
    required this.id,
    required this.title,
    required this.timestamp,
    required this.type,
  });

  final String id;
  final String title;
  final String timestamp;
  final String type;

  factory DashboardNotification.fromJson(Map<String, dynamic> json) {
    final idValue = json['id'];
    return DashboardNotification(
      id: idValue?.toString() ?? json['title']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: json['title']?.toString() ?? 'Dashboard update',
      timestamp: json['timestamp']?.toString() ?? 'Just now',
      type: json['type']?.toString() ?? 'update',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'timestamp': timestamp,
      'type': type,
    };
  }
}

class LiveClassOccupancy {
  LiveClassOccupancy({
    required this.reserved,
    this.capacity,
    this.rate,
  });

  final int reserved;
  final int? capacity;
  final int? rate;

  factory LiveClassOccupancy.fromJson(Map<String, dynamic> json) {
    final capacityValue = json['capacity'];
    final rateValue = json['rate'];
    return LiveClassOccupancy(
      reserved: json['reserved'] is num
          ? (json['reserved'] as num).round()
          : int.tryParse('${json['reserved'] ?? 0}') ?? 0,
      capacity: capacityValue is num ? capacityValue.round() : int.tryParse('${capacityValue ?? ''}'),
      rate: rateValue is num ? rateValue.round() : int.tryParse('${rateValue ?? ''}'),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'reserved': reserved,
      if (capacity != null) 'capacity': capacity,
      if (rate != null) 'rate': rate,
    };
  }
}

class LiveClassSecurity {
  LiveClassSecurity({
    required this.waitingRoom,
    required this.passcodeRequired,
    required this.recordingConsent,
  });

  final bool waitingRoom;
  final bool passcodeRequired;
  final bool recordingConsent;

  factory LiveClassSecurity.fromJson(Map<String, dynamic> json) {
    return LiveClassSecurity(
      waitingRoom: json['waitingRoom'] != false,
      passcodeRequired: json['passcodeRequired'] == true,
      recordingConsent: json['recordingConsent'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'waitingRoom': waitingRoom,
      'passcodeRequired': passcodeRequired,
      'recordingConsent': recordingConsent,
    };
  }
}

class LiveClassWhiteboard {
  LiveClassWhiteboard({
    this.template,
    required this.ready,
    this.lastUpdatedLabel,
    required this.facilitators,
  });

  final String? template;
  final bool ready;
  final String? lastUpdatedLabel;
  final List<String> facilitators;

  factory LiveClassWhiteboard.fromJson(Map<String, dynamic> json) {
    final facilitatorsRaw = json['facilitators'];
    return LiveClassWhiteboard(
      template: json['template']?.toString(),
      ready: json['ready'] == true,
      lastUpdatedLabel: json['lastUpdatedLabel']?.toString(),
      facilitators: facilitatorsRaw is List
          ? facilitatorsRaw.map((item) => item.toString()).where((item) => item.isNotEmpty).toList()
          : <String>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (template != null) 'template': template,
      'ready': ready,
      if (lastUpdatedLabel != null) 'lastUpdatedLabel': lastUpdatedLabel,
      'facilitators': facilitators,
    };
  }
}

class LiveClassCallToAction {
  LiveClassCallToAction({
    required this.label,
    required this.action,
    required this.enabled,
  });

  final String label;
  final String action;
  final bool enabled;

  factory LiveClassCallToAction.fromJson(Map<String, dynamic> json) {
    return LiveClassCallToAction(
      label: json['label']?.toString() ?? 'View details',
      action: json['action']?.toString() ?? 'details',
      enabled: json['enabled'] != false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'action': action,
      'enabled': enabled,
    };
  }
}

class LiveClassSessionSummary {
  LiveClassSessionSummary({
    required this.id,
    required this.title,
    required this.stage,
    required this.status,
    required this.startLabel,
    this.timezone,
    this.community,
    this.summary,
    required this.occupancy,
    required this.security,
    this.whiteboard,
    this.callToAction,
    required this.isGroup,
    required this.breakoutRooms,
  });

  final String id;
  final String title;
  final String stage;
  final String status;
  final String startLabel;
  final String? timezone;
  final String? community;
  final String? summary;
  final LiveClassOccupancy occupancy;
  final LiveClassSecurity security;
  final LiveClassWhiteboard? whiteboard;
  final LiveClassCallToAction? callToAction;
  final bool isGroup;
  final List<String> breakoutRooms;

  factory LiveClassSessionSummary.fromJson(Map<String, dynamic> json) {
    final occupancyJson = json['occupancy'];
    final securityJson = json['security'];
    final whiteboardJson = json['whiteboard'];
    final callToActionJson = json['callToAction'];
    final breakoutRoomsRaw = json['breakoutRooms'];
    return LiveClassSessionSummary(
      id: json['id']?.toString() ?? json['slug']?.toString() ?? 'live-${DateTime.now().millisecondsSinceEpoch}',
      title: json['title']?.toString() ?? 'Live classroom',
      stage: json['stage']?.toString() ?? 'Preparation',
      status: json['status']?.toString() ?? 'upcoming',
      startLabel: json['startLabel']?.toString() ?? 'TBD',
      timezone: json['timezone']?.toString(),
      community: json['community']?.toString(),
      summary: json['summary']?.toString(),
      occupancy: LiveClassOccupancy.fromJson(
        occupancyJson is Map ? Map<String, dynamic>.from(occupancyJson as Map) : const {},
      ),
      security: LiveClassSecurity.fromJson(
        securityJson is Map ? Map<String, dynamic>.from(securityJson as Map) : const {},
      ),
      whiteboard: whiteboardJson is Map
          ? LiveClassWhiteboard.fromJson(Map<String, dynamic>.from(whiteboardJson as Map))
          : null,
      callToAction: callToActionJson is Map
          ? LiveClassCallToAction.fromJson(Map<String, dynamic>.from(callToActionJson as Map))
          : null,
      isGroup: json['isGroupSession'] == true,
      breakoutRooms: breakoutRoomsRaw is List
          ? breakoutRoomsRaw
              .map((room) => room is Map
                  ? room['name']?.toString() ?? room['title']?.toString() ?? ''
                  : room?.toString() ?? '')
              .where((value) => value.isNotEmpty)
              .toList()
          : <String>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'stage': stage,
      'status': status,
      'startLabel': startLabel,
      if (timezone != null) 'timezone': timezone,
      if (community != null) 'community': community,
      if (summary != null) 'summary': summary,
      'occupancy': occupancy.toJson(),
      'security': security.toJson(),
      if (whiteboard != null) 'whiteboard': whiteboard!.toJson(),
      if (callToAction != null) 'callToAction': callToAction!.toJson(),
      'isGroupSession': isGroup,
      'breakoutRooms': breakoutRooms,
    };
  }
}

class LiveClassReadinessItem {
  LiveClassReadinessItem({
    required this.id,
    required this.label,
    required this.status,
    required this.detail,
  });

  final String id;
  final String label;
  final String status;
  final String detail;

  factory LiveClassReadinessItem.fromJson(Map<String, dynamic> json) {
    return LiveClassReadinessItem(
      id: json['id']?.toString() ?? json['label']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      label: json['label']?.toString() ?? 'Readiness check',
      status: json['status']?.toString() ?? 'ready',
      detail: json['detail']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'status': status,
      'detail': detail,
    };
  }
}

class LiveClassWhiteboardSnapshot {
  LiveClassWhiteboardSnapshot({
    required this.id,
    required this.title,
    required this.template,
    required this.ready,
    this.lastUpdatedLabel,
    required this.facilitators,
  });

  final String id;
  final String title;
  final String template;
  final bool ready;
  final String? lastUpdatedLabel;
  final List<String> facilitators;

  factory LiveClassWhiteboardSnapshot.fromJson(Map<String, dynamic> json) {
    final facilitatorsRaw = json['facilitators'];
    return LiveClassWhiteboardSnapshot(
      id: json['id']?.toString() ?? json['title']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: json['title']?.toString() ?? 'Live board',
      template: json['template']?.toString() ?? 'Collaborative board',
      ready: json['ready'] == true,
      lastUpdatedLabel: json['lastUpdatedLabel']?.toString(),
      facilitators: facilitatorsRaw is List
          ? facilitatorsRaw.map((item) => item.toString()).where((item) => item.isNotEmpty).toList()
          : <String>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'template': template,
      'ready': ready,
      if (lastUpdatedLabel != null) 'lastUpdatedLabel': lastUpdatedLabel,
      'facilitators': facilitators,
    };
  }
}

class LiveClassroomsSnapshot {
  LiveClassroomsSnapshot({
    required this.metrics,
    required this.active,
    required this.upcoming,
    required this.completed,
    required this.groups,
    required this.whiteboardSnapshots,
    required this.readiness,
  });

  final List<DashboardMetric> metrics;
  final List<LiveClassSessionSummary> active;
  final List<LiveClassSessionSummary> upcoming;
  final List<LiveClassSessionSummary> completed;
  final List<LiveClassSessionSummary> groups;
  final List<LiveClassWhiteboardSnapshot> whiteboardSnapshots;
  final List<LiveClassReadinessItem> readiness;

  factory LiveClassroomsSnapshot.fromJson(Map<String, dynamic> json) {
    final whiteboardJson = json['whiteboard'] is Map
        ? Map<String, dynamic>.from(json['whiteboard'] as Map)
        : const <String, dynamic>{};
    final parseSessions = (String key) {
      final value = json[key];
      if (value is List) {
        return value
            .map((item) => LiveClassSessionSummary.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList();
      }
      return <LiveClassSessionSummary>[];
    };

    return LiveClassroomsSnapshot(
      metrics: json['metrics'] is List
          ? (json['metrics'] as List)
              .map((item) => DashboardMetric.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <DashboardMetric>[],
      active: parseSessions('active'),
      upcoming: parseSessions('upcoming'),
      completed: parseSessions('completed'),
      groups: parseSessions('groups'),
      whiteboardSnapshots: whiteboardJson['snapshots'] is List
          ? (whiteboardJson['snapshots'] as List)
              .map((item) => LiveClassWhiteboardSnapshot.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <LiveClassWhiteboardSnapshot>[],
      readiness: whiteboardJson['readiness'] is List
          ? (whiteboardJson['readiness'] as List)
              .map((item) => LiveClassReadinessItem.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <LiveClassReadinessItem>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'metrics': metrics.map((metric) => metric.toJson()).toList(),
      'active': active.map((session) => session.toJson()).toList(),
      'upcoming': upcoming.map((session) => session.toJson()).toList(),
      'completed': completed.map((session) => session.toJson()).toList(),
      'groups': groups.map((session) => session.toJson()).toList(),
      'whiteboard': {
        'snapshots': whiteboardSnapshots.map((snapshot) => snapshot.toJson()).toList(),
        'readiness': readiness.map((item) => item.toJson()).toList(),
      },
    };
  }
}

class ProfileStat {
  ProfileStat({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  factory ProfileStat.fromJson(Map<String, dynamic> json) {
    return ProfileStat(
      label: json['label']?.toString() ?? 'Stat',
      value: json['value']?.toString() ?? '0',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'value': value,
    };
  }
}

class VerificationSummary {
  VerificationSummary({
    required this.status,
    required this.documentsRequired,
    required this.documentsSubmitted,
  });

  final String status;
  final int documentsRequired;
  final int documentsSubmitted;

  factory VerificationSummary.fromJson(Map<String, dynamic> json) {
    return VerificationSummary(
      status: json['status']?.toString() ?? 'collecting',
      documentsRequired: (json['documentsRequired'] is num)
          ? (json['documentsRequired'] as num).round()
          : int.tryParse('${json['documentsRequired'] ?? 0}') ?? 0,
      documentsSubmitted: (json['documentsSubmitted'] is num)
          ? (json['documentsSubmitted'] as num).round()
          : int.tryParse('${json['documentsSubmitted'] ?? 0}') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'status': status,
      'documentsRequired': documentsRequired,
      'documentsSubmitted': documentsSubmitted,
    };
  }
}

class PrivacySettings {
  PrivacySettings({
    required this.visibility,
    required this.followApprovalRequired,
    required this.shareActivity,
    required this.messagePermission,
  });

  final String visibility;
  final bool followApprovalRequired;
  final bool shareActivity;
  final String messagePermission;

  factory PrivacySettings.fromJson(Map<String, dynamic> json) {
    return PrivacySettings(
      visibility: json['visibility']?.toString() ?? 'workspace',
      followApprovalRequired: json['followApprovalRequired'] == true,
      shareActivity: json['shareActivity'] == true,
      messagePermission: json['messagePermission']?.toString() ?? 'everyone',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'visibility': visibility,
      'followApprovalRequired': followApprovalRequired,
      'shareActivity': shareActivity,
      'messagePermission': messagePermission,
    };
  }
}

class MessagingSettings {
  MessagingSettings({
    required this.notificationsEnabled,
  });

  final bool notificationsEnabled;

  factory MessagingSettings.fromJson(Map<String, dynamic> json) {
    return MessagingSettings(
      notificationsEnabled: json['notificationsEnabled'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'notificationsEnabled': notificationsEnabled,
    };
  }
}

class FollowersSummary {
  FollowersSummary({
    required this.followers,
    required this.following,
    required this.pending,
    required this.outgoing,
  });

  final int followers;
  final int following;
  final int pending;
  final int outgoing;

  factory FollowersSummary.fromJson(Map<String, dynamic> json) {
    final pendingList = json['pending'];
    final outgoingList = json['outgoing'];
    return FollowersSummary(
      followers: (json['followers'] is num)
          ? (json['followers'] as num).round()
          : int.tryParse('${json['followers'] ?? 0}') ?? 0,
      following: (json['following'] is num)
          ? (json['following'] as num).round()
          : int.tryParse('${json['following'] ?? 0}') ?? 0,
      pending: pendingList is List ? pendingList.length : int.tryParse('${json['pendingCount'] ?? 0}') ?? 0,
      outgoing: outgoingList is List ? outgoingList.length : int.tryParse('${json['outgoingCount'] ?? 0}') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'followers': followers,
      'following': following,
      'pending': pending,
      'outgoing': outgoing,
    };
  }
}

class DashboardProfile {
  DashboardProfile({
    required this.name,
    required this.title,
    required this.bio,
    required this.avatar,
    required this.email,
    required this.stats,
    required this.verification,
  });

  final String name;
  final String title;
  final String bio;
  final String avatar;
  final String email;
  final List<ProfileStat> stats;
  final VerificationSummary verification;

  factory DashboardProfile.fromJson(Map<String, dynamic> json) {
    final stats = json['stats'];
    return DashboardProfile(
      name: json['name']?.toString() ?? 'Learner',
      title: json['title']?.toString() ?? 'Active learner',
      bio: json['bio']?.toString() ?? 'Welcome to your learning control centre.',
      avatar: json['avatar']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      stats: stats is List
          ? stats.map((item) => ProfileStat.fromJson(Map<String, dynamic>.from(item as Map))).toList()
          : <ProfileStat>[],
      verification: VerificationSummary.fromJson(
        json['verification'] is Map ? Map<String, dynamic>.from(json['verification'] as Map) : const {},
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'title': title,
      'bio': bio,
      'avatar': avatar,
      'email': email,
      'stats': stats.map((stat) => stat.toJson()).toList(),
      'verification': verification.toJson(),
    };
  }
}

class LearnerDashboardSnapshot {
  LearnerDashboardSnapshot({
    required this.profile,
    required this.metrics,
    required this.learningPace,
    required this.upcomingEvents,
    required this.feedHighlights,
    required this.communityEngagement,
    required this.notifications,
    required this.privacySettings,
    required this.messagingSettings,
    required this.followers,
    required this.unreadMessages,
    required this.totalNotifications,
    required this.syncedAt,
    this.liveClassrooms,
    this.isFromCache = false,
  });

  final DashboardProfile profile;
  final List<DashboardMetric> metrics;
  final List<PaceEntry> learningPace;
  final List<UpcomingEvent> upcomingEvents;
  final List<FeedHighlight> feedHighlights;
  final List<CommunityEngagement> communityEngagement;
  final List<DashboardNotification> notifications;
  final PrivacySettings privacySettings;
  final MessagingSettings messagingSettings;
  final FollowersSummary followers;
  final int unreadMessages;
  final int totalNotifications;
  final DateTime syncedAt;
  final LiveClassroomsSnapshot? liveClassrooms;
  final bool isFromCache;

  LearnerDashboardSnapshot copyWith({bool? isFromCache}) {
    return LearnerDashboardSnapshot(
      profile: profile,
      metrics: metrics,
      learningPace: learningPace,
      upcomingEvents: upcomingEvents,
      feedHighlights: feedHighlights,
      communityEngagement: communityEngagement,
      notifications: notifications,
      privacySettings: privacySettings,
      messagingSettings: messagingSettings,
      followers: followers,
      unreadMessages: unreadMessages,
      totalNotifications: totalNotifications,
      syncedAt: syncedAt,
      liveClassrooms: liveClassrooms,
      isFromCache: isFromCache ?? this.isFromCache,
    );
  }

  factory LearnerDashboardSnapshot.fromApi(Map<String, dynamic> json, {DateTime? syncedAt}) {
    final profileJson = json['profile'] is Map ? Map<String, dynamic>.from(json['profile'] as Map) : <String, dynamic>{};
    final dashboardsJson = json['dashboards'] is Map
        ? Map<String, dynamic>.from(json['dashboards'] as Map)
        : <String, dynamic>{};
    final learnerJson = dashboardsJson['learner'] is Map
        ? Map<String, dynamic>.from(dashboardsJson['learner'] as Map)
        : <String, dynamic>{};
    final analyticsJson = learnerJson['analytics'] is Map
        ? Map<String, dynamic>.from(learnerJson['analytics'] as Map)
        : <String, dynamic>{};
    final settingsJson = learnerJson['settings'] is Map
        ? Map<String, dynamic>.from(learnerJson['settings'] as Map)
        : <String, dynamic>{};
    final notificationsJson = learnerJson['notifications'] is Map
        ? Map<String, dynamic>.from(learnerJson['notifications'] as Map)
        : <String, dynamic>{};
    final followersJson = learnerJson['followers'] is Map
        ? Map<String, dynamic>.from(learnerJson['followers'] as Map)
        : <String, dynamic>{};
    final liveClassroomsJson = learnerJson['liveClassrooms'] is Map
        ? Map<String, dynamic>.from(learnerJson['liveClassrooms'] as Map)
        : <String, dynamic>{};

    return LearnerDashboardSnapshot(
      profile: DashboardProfile.fromJson(profileJson),
      metrics: (learnerJson['metrics'] is List)
          ? (learnerJson['metrics'] as List)
              .map((item) => DashboardMetric.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <DashboardMetric>[],
      learningPace: (analyticsJson['learningPace'] is List)
          ? (analyticsJson['learningPace'] as List)
              .map((item) => PaceEntry.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <PaceEntry>[],
      upcomingEvents: (learnerJson['upcoming'] is List)
          ? (learnerJson['upcoming'] as List)
              .map((item) => UpcomingEvent.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <UpcomingEvent>[],
      feedHighlights: (profileJson['feedHighlights'] is List)
          ? (profileJson['feedHighlights'] as List)
              .map((item) => FeedHighlight.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <FeedHighlight>[],
      communityEngagement: (analyticsJson['communityEngagement'] is List)
          ? (analyticsJson['communityEngagement'] as List)
              .map((item) => CommunityEngagement.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityEngagement>[],
      notifications: (notificationsJson['items'] is List)
          ? (notificationsJson['items'] as List)
              .map((item) => DashboardNotification.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <DashboardNotification>[],
      privacySettings: PrivacySettings.fromJson(
        settingsJson['privacy'] is Map ? Map<String, dynamic>.from(settingsJson['privacy'] as Map) : const {},
      ),
      messagingSettings: MessagingSettings.fromJson(
        settingsJson['messaging'] is Map ? Map<String, dynamic>.from(settingsJson['messaging'] as Map) : const {},
      ),
      followers: FollowersSummary.fromJson(followersJson),
      liveClassrooms:
          liveClassroomsJson.isEmpty ? null : LiveClassroomsSnapshot.fromJson(liveClassroomsJson),
      unreadMessages: (notificationsJson['unreadMessages'] is num)
          ? (notificationsJson['unreadMessages'] as num).round()
          : int.tryParse('${notificationsJson['unreadMessages'] ?? 0}') ?? 0,
      totalNotifications: (notificationsJson['total'] is num)
          ? (notificationsJson['total'] as num).round()
          : int.tryParse('${notificationsJson['total'] ?? 0}') ?? 0,
      syncedAt: syncedAt ?? DateTime.now(),
    );
  }

  factory LearnerDashboardSnapshot.fromCache(Map<String, dynamic> json) {
    final profileJson = json['profile'] is Map ? Map<String, dynamic>.from(json['profile'] as Map) : <String, dynamic>{};
    return LearnerDashboardSnapshot(
      profile: DashboardProfile.fromJson(profileJson),
      metrics: json['metrics'] is List
          ? (json['metrics'] as List)
              .map((item) => DashboardMetric.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <DashboardMetric>[],
      learningPace: json['learningPace'] is List
          ? (json['learningPace'] as List)
              .map((item) => PaceEntry.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <PaceEntry>[],
      upcomingEvents: json['upcomingEvents'] is List
          ? (json['upcomingEvents'] as List)
              .map((item) => UpcomingEvent.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <UpcomingEvent>[],
      feedHighlights: json['feedHighlights'] is List
          ? (json['feedHighlights'] as List)
              .map((item) => FeedHighlight.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <FeedHighlight>[],
      communityEngagement: json['communityEngagement'] is List
          ? (json['communityEngagement'] as List)
              .map((item) => CommunityEngagement.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityEngagement>[],
      notifications: json['notifications'] is List
          ? (json['notifications'] as List)
              .map((item) => DashboardNotification.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <DashboardNotification>[],
      privacySettings: PrivacySettings.fromJson(
        json['privacy'] is Map ? Map<String, dynamic>.from(json['privacy'] as Map) : const {},
      ),
      messagingSettings: MessagingSettings.fromJson(
        json['messaging'] is Map ? Map<String, dynamic>.from(json['messaging'] as Map) : const {},
      ),
      followers: FollowersSummary.fromJson(
        json['followers'] is Map ? Map<String, dynamic>.from(json['followers'] as Map) : const {},
      ),
      liveClassrooms: json['liveClassrooms'] is Map
          ? LiveClassroomsSnapshot.fromJson(Map<String, dynamic>.from(json['liveClassrooms'] as Map))
          : null,
      unreadMessages: (json['unreadMessages'] is num)
          ? (json['unreadMessages'] as num).round()
          : int.tryParse('${json['unreadMessages'] ?? 0}') ?? 0,
      totalNotifications: (json['totalNotifications'] is num)
          ? (json['totalNotifications'] as num).round()
          : int.tryParse('${json['totalNotifications'] ?? 0}') ?? 0,
      syncedAt: json['syncedAt'] is String ? DateTime.tryParse(json['syncedAt'] as String) ?? DateTime.now() : DateTime.now(),
      isFromCache: true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'profile': profile.toJson(),
      'metrics': metrics.map((metric) => metric.toJson()).toList(),
      'learningPace': learningPace.map((entry) => entry.toJson()).toList(),
      'upcomingEvents': upcomingEvents.map((event) => event.toJson()).toList(),
      'feedHighlights': feedHighlights.map((highlight) => highlight.toJson()).toList(),
      'communityEngagement': communityEngagement.map((entry) => entry.toJson()).toList(),
      'notifications': notifications.map((notification) => notification.toJson()).toList(),
      'privacy': privacySettings.toJson(),
      'messaging': messagingSettings.toJson(),
      'followers': followers.toJson(),
      if (liveClassrooms != null) 'liveClassrooms': liveClassrooms!.toJson(),
      'unreadMessages': unreadMessages,
      'totalNotifications': totalNotifications,
      'syncedAt': syncedAt.toIso8601String(),
    };
  }
}

class CommunityHealthEntry {
  CommunityHealthEntry({
    required this.id,
    required this.name,
    required this.members,
    required this.health,
    required this.trend,
    required this.incidentsOpen,
    required this.escalationsOpen,
  });

  final String id;
  final String name;
  final String members;
  final String health;
  final String trend;
  final int incidentsOpen;
  final int escalationsOpen;

  factory CommunityHealthEntry.fromJson(Map<String, dynamic> json) {
    return CommunityHealthEntry(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      name: json['name']?.toString() ?? 'Community',
      members: json['members']?.toString() ?? '0 members',
      health: json['health']?.toString() ?? 'Stable',
      trend: json['trend']?.toString() ?? 'Steady',
      incidentsOpen: (json['incidentsOpen'] is num)
          ? (json['incidentsOpen'] as num).round()
          : int.tryParse('${json['incidentsOpen'] ?? 0}') ?? 0,
      escalationsOpen: (json['escalationsOpen'] is num)
          ? (json['escalationsOpen'] as num).round()
          : int.tryParse('${json['escalationsOpen'] ?? 0}') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'members': members,
      'health': health,
      'trend': trend,
      'incidentsOpen': incidentsOpen,
      'escalationsOpen': escalationsOpen,
    };
  }
}

class CommunityRunbook {
  CommunityRunbook({
    required this.id,
    required this.title,
    required this.owner,
    required this.updatedAt,
    required this.tags,
    required this.automationReady,
  });

  final String id;
  final String title;
  final String owner;
  final String updatedAt;
  final List<String> tags;
  final bool automationReady;

  factory CommunityRunbook.fromJson(Map<String, dynamic> json) {
    final rawTags = json['tags'];
    return CommunityRunbook(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: json['title']?.toString() ?? json['name']?.toString() ?? 'Runbook',
      owner: json['owner']?.toString() ?? 'Community team',
      updatedAt: json['updatedAt']?.toString() ?? json['duration']?.toString() ?? 'Draft',
      tags: rawTags is List
          ? rawTags.map((tag) => tag?.toString() ?? '').where((tag) => tag.isNotEmpty).toList()
          : <String>[],
      automationReady: json['automationReady'] == true || json['automation_ready'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'owner': owner,
      'updatedAt': updatedAt,
      'tags': tags,
      'automationReady': automationReady,
    };
  }
}

class CommunityEscalation {
  CommunityEscalation({
    required this.id,
    required this.title,
    required this.owner,
    required this.status,
    required this.due,
    required this.community,
  });

  final String id;
  final String title;
  final String owner;
  final String status;
  final String due;
  final String community;

  factory CommunityEscalation.fromJson(Map<String, dynamic> json) {
    return CommunityEscalation(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: json['title']?.toString() ?? 'Escalation',
      owner: json['owner']?.toString() ?? 'Operations',
      status: json['status']?.toString() ?? 'open',
      due: json['due']?.toString() ?? 'TBC',
      community: json['community']?.toString() ?? 'Community',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'owner': owner,
      'status': status,
      'due': due,
      'community': community,
    };
  }
}

class CommunityEventCard {
  CommunityEventCard({
    required this.id,
    required this.title,
    required this.date,
    required this.facilitator,
    required this.seats,
    required this.status,
  });

  final String id;
  final String title;
  final String date;
  final String facilitator;
  final String seats;
  final String status;

  factory CommunityEventCard.fromJson(Map<String, dynamic> json) {
    return CommunityEventCard(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: json['title']?.toString() ?? 'Event',
      date: json['date']?.toString() ?? 'TBC',
      facilitator: json['facilitator']?.toString() ?? 'Host',
      seats: json['seats']?.toString() ?? '0/0 booked',
      status: json['status']?.toString() ?? 'scheduled',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'date': date,
      'facilitator': facilitator,
      'seats': seats,
      'status': status,
    };
  }
}

class CommunityTutorPod {
  CommunityTutorPod({
    required this.id,
    required this.mentor,
    required this.focus,
    required this.scheduled,
    required this.status,
  });

  final String id;
  final String mentor;
  final String focus;
  final String scheduled;
  final String status;

  factory CommunityTutorPod.fromJson(Map<String, dynamic> json) {
    return CommunityTutorPod(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      mentor: json['mentor']?.toString() ?? 'Mentor',
      focus: json['focus']?.toString() ?? 'Session',
      scheduled: json['scheduled']?.toString() ?? 'Unscheduled',
      status: json['status']?.toString() ?? 'pending',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'mentor': mentor,
      'focus': focus,
      'scheduled': scheduled,
      'status': status,
    };
  }
}

class CommunityTier {
  CommunityTier({
    required this.id,
    required this.name,
    required this.price,
    required this.members,
    required this.churn,
    required this.renewal,
  });

  final String id;
  final String name;
  final String price;
  final String members;
  final String churn;
  final String renewal;

  factory CommunityTier.fromJson(Map<String, dynamic> json) {
    return CommunityTier(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      name: json['name']?.toString() ?? 'Premium tier',
      price: json['price']?.toString() ?? '0',
      members: json['members']?.toString() ?? '0 active',
      churn: json['churn']?.toString() ?? 'Retention steady',
      renewal: json['renewal']?.toString() ?? 'Auto-renewal',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'members': members,
      'churn': churn,
      'renewal': renewal,
    };
  }
}

class CommunityExperiment {
  CommunityExperiment({
    required this.id,
    required this.name,
    required this.community,
    required this.status,
    required this.hypothesis,
  });

  final String id;
  final String name;
  final String community;
  final String status;
  final String hypothesis;

  factory CommunityExperiment.fromJson(Map<String, dynamic> json) {
    return CommunityExperiment(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      name: json['name']?.toString() ?? 'Experiment',
      community: json['community']?.toString() ?? 'Community',
      status: json['status']?.toString() ?? 'draft',
      hypothesis: json['hypothesis']?.toString() ?? 'Awaiting telemetry',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'community': community,
      'status': status,
      'hypothesis': hypothesis,
    };
  }
}

class CommunityIncident {
  CommunityIncident({
    required this.id,
    required this.communityName,
    required this.summary,
    required this.severity,
    required this.owner,
    required this.openedAt,
  });

  final String id;
  final String communityName;
  final String summary;
  final String severity;
  final String owner;
  final String openedAt;

  factory CommunityIncident.fromJson(Map<String, dynamic> json) {
    return CommunityIncident(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      communityName: json['communityName']?.toString() ?? 'Community',
      summary: json['summary']?.toString() ?? 'Incident',
      severity: json['severity']?.toString() ?? 'medium',
      owner: json['owner']?.toString() ?? 'Moderator',
      openedAt: json['openedAt']?.toString() ?? 'Recently',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'communityName': communityName,
      'summary': summary,
      'severity': severity,
      'owner': owner,
      'openedAt': openedAt,
    };
  }
}

class CommunityHighlight {
  CommunityHighlight({
    required this.id,
    required this.community,
    required this.preview,
    required this.postedAt,
    required this.reactions,
    required this.tags,
  });

  final String id;
  final String community;
  final String preview;
  final String postedAt;
  final int reactions;
  final List<String> tags;

  factory CommunityHighlight.fromJson(Map<String, dynamic> json) {
    final rawTags = json['tags'];
    return CommunityHighlight(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      community: json['community']?.toString() ?? 'Community',
      preview: json['preview']?.toString() ?? json['message']?.toString() ?? 'Highlight',
      postedAt: json['postedAt']?.toString() ?? 'Recently',
      reactions: (json['reactions'] is num)
          ? (json['reactions'] as num).round()
          : int.tryParse('${json['reactions'] ?? 0}') ?? 0,
      tags: rawTags is List
          ? rawTags.map((tag) => tag?.toString() ?? '').where((tag) => tag.isNotEmpty).toList()
          : <String>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'community': community,
      'preview': preview,
      'postedAt': postedAt,
      'reactions': reactions,
      'tags': tags,
    };
  }
}

class CommunityTrend {
  CommunityTrend({
    required this.id,
    required this.metric,
    required this.current,
    required this.previous,
  });

  final String id;
  final String metric;
  final String current;
  final String previous;

  factory CommunityTrend.fromJson(Map<String, dynamic> json) {
    return CommunityTrend(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      metric: json['metric']?.toString() ?? 'Metric',
      current: json['current']?.toString() ?? '0',
      previous: json['previous']?.toString() ?? '0',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'metric': metric,
      'current': current,
      'previous': previous,
    };
  }
}

class CommunityDashboardSnapshot {
  CommunityDashboardSnapshot({
    required this.metrics,
    required this.health,
    required this.runbooks,
    required this.escalations,
    required this.events,
    required this.tutorPods,
    required this.tiers,
    required this.experiments,
    required this.insights,
    required this.incidents,
    required this.highlights,
    required this.trends,
    required this.syncedAt,
    this.isFromCache = false,
  });

  final List<DashboardMetric> metrics;
  final List<CommunityHealthEntry> health;
  final List<CommunityRunbook> runbooks;
  final List<CommunityEscalation> escalations;
  final List<CommunityEventCard> events;
  final List<CommunityTutorPod> tutorPods;
  final List<CommunityTier> tiers;
  final List<CommunityExperiment> experiments;
  final List<String> insights;
  final List<CommunityIncident> incidents;
  final List<CommunityHighlight> highlights;
  final List<CommunityTrend> trends;
  final DateTime syncedAt;
  final bool isFromCache;

  CommunityDashboardSnapshot copyWith({bool? isFromCache}) {
    return CommunityDashboardSnapshot(
      metrics: metrics,
      health: health,
      runbooks: runbooks,
      escalations: escalations,
      events: events,
      tutorPods: tutorPods,
      tiers: tiers,
      experiments: experiments,
      insights: insights,
      incidents: incidents,
      highlights: highlights,
      trends: trends,
      syncedAt: syncedAt,
      isFromCache: isFromCache ?? this.isFromCache,
    );
  }

  factory CommunityDashboardSnapshot.fromApi(Map<String, dynamic> json, {DateTime? syncedAt}) {
    final dashboardsJson = json['dashboards'] is Map
        ? Map<String, dynamic>.from(json['dashboards'] as Map)
        : <String, dynamic>{};
    final communityJson = dashboardsJson['community'] is Map
        ? Map<String, dynamic>.from(dashboardsJson['community'] as Map)
        : <String, dynamic>{};

    return CommunityDashboardSnapshot(
      metrics: (communityJson['metrics'] is List)
          ? (communityJson['metrics'] as List)
              .map((item) => DashboardMetric.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <DashboardMetric>[],
      health: (communityJson['health'] is Map && (communityJson['health'] as Map)['overview'] is List)
          ? ((communityJson['health'] as Map)['overview'] as List)
              .map((item) => CommunityHealthEntry.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityHealthEntry>[],
      runbooks: (communityJson['operations'] is Map && (communityJson['operations'] as Map)['runbooks'] is List)
          ? ((communityJson['operations'] as Map)['runbooks'] as List)
              .map((item) => CommunityRunbook.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityRunbook>[],
      escalations: (communityJson['operations'] is Map && (communityJson['operations'] as Map)['escalations'] is List)
          ? ((communityJson['operations'] as Map)['escalations'] as List)
              .map((item) => CommunityEscalation.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityEscalation>[],
      events: (communityJson['programming'] is Map && (communityJson['programming'] as Map)['upcomingEvents'] is List)
          ? ((communityJson['programming'] as Map)['upcomingEvents'] as List)
              .map((item) => CommunityEventCard.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityEventCard>[],
      tutorPods: (communityJson['programming'] is Map && (communityJson['programming'] as Map)['tutorPods'] is List)
          ? ((communityJson['programming'] as Map)['tutorPods'] as List)
              .map((item) => CommunityTutorPod.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityTutorPod>[],
      tiers: (communityJson['monetisation'] is Map && (communityJson['monetisation'] as Map)['tiers'] is List)
          ? ((communityJson['monetisation'] as Map)['tiers'] as List)
              .map((item) => CommunityTier.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityTier>[],
      experiments: (communityJson['monetisation'] is Map && (communityJson['monetisation'] as Map)['experiments'] is List)
          ? ((communityJson['monetisation'] as Map)['experiments'] as List)
              .map((item) => CommunityExperiment.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityExperiment>[],
      insights: (communityJson['monetisation'] is Map && (communityJson['monetisation'] as Map)['insights'] is List)
          ? ((communityJson['monetisation'] as Map)['insights'] as List)
              .map((item) => item?.toString() ?? '')
              .where((item) => item.isNotEmpty)
              .toList()
          : <String>[],
      incidents: (communityJson['safety'] is Map && (communityJson['safety'] as Map)['incidents'] is List)
          ? ((communityJson['safety'] as Map)['incidents'] as List)
              .map((item) => CommunityIncident.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityIncident>[],
      highlights: (communityJson['communications'] is Map && (communityJson['communications'] as Map)['highlights'] is List)
          ? ((communityJson['communications'] as Map)['highlights'] as List)
              .map((item) => CommunityHighlight.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityHighlight>[],
      trends: (communityJson['communications'] is Map && (communityJson['communications'] as Map)['trends'] is List)
          ? ((communityJson['communications'] as Map)['trends'] as List)
              .map((item) => CommunityTrend.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityTrend>[],
      syncedAt: syncedAt ?? DateTime.now(),
    );
  }

  factory CommunityDashboardSnapshot.fromCache(Map<String, dynamic> json) {
    return CommunityDashboardSnapshot(
      metrics: json['metrics'] is List
          ? (json['metrics'] as List)
              .map((item) => DashboardMetric.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <DashboardMetric>[],
      health: json['health'] is List
          ? (json['health'] as List)
              .map((item) => CommunityHealthEntry.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityHealthEntry>[],
      runbooks: json['runbooks'] is List
          ? (json['runbooks'] as List)
              .map((item) => CommunityRunbook.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityRunbook>[],
      escalations: json['escalations'] is List
          ? (json['escalations'] as List)
              .map((item) => CommunityEscalation.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityEscalation>[],
      events: json['events'] is List
          ? (json['events'] as List)
              .map((item) => CommunityEventCard.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityEventCard>[],
      tutorPods: json['tutorPods'] is List
          ? (json['tutorPods'] as List)
              .map((item) => CommunityTutorPod.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityTutorPod>[],
      tiers: json['tiers'] is List
          ? (json['tiers'] as List)
              .map((item) => CommunityTier.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityTier>[],
      experiments: json['experiments'] is List
          ? (json['experiments'] as List)
              .map((item) => CommunityExperiment.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityExperiment>[],
      insights: json['insights'] is List
          ? (json['insights'] as List).map((item) => item?.toString() ?? '').where((item) => item.isNotEmpty).toList()
          : <String>[],
      incidents: json['incidents'] is List
          ? (json['incidents'] as List)
              .map((item) => CommunityIncident.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityIncident>[],
      highlights: json['highlights'] is List
          ? (json['highlights'] as List)
              .map((item) => CommunityHighlight.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityHighlight>[],
      trends: json['trends'] is List
          ? (json['trends'] as List)
              .map((item) => CommunityTrend.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <CommunityTrend>[],
      syncedAt: json['syncedAt'] is String ? DateTime.tryParse(json['syncedAt'] as String) ?? DateTime.now() : DateTime.now(),
      isFromCache: true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'metrics': metrics.map((metric) => metric.toJson()).toList(),
      'health': health.map((item) => item.toJson()).toList(),
      'runbooks': runbooks.map((item) => item.toJson()).toList(),
      'escalations': escalations.map((item) => item.toJson()).toList(),
      'events': events.map((item) => item.toJson()).toList(),
      'tutorPods': tutorPods.map((item) => item.toJson()).toList(),
      'tiers': tiers.map((item) => item.toJson()).toList(),
      'experiments': experiments.map((item) => item.toJson()).toList(),
      'insights': insights,
      'incidents': incidents.map((item) => item.toJson()).toList(),
      'highlights': highlights.map((item) => item.toJson()).toList(),
      'trends': trends.map((item) => item.toJson()).toList(),
      'syncedAt': syncedAt.toIso8601String(),
    };
  }
}

class DashboardService {
  DashboardService()
      : _dio = Dio(
          BaseOptions(
            baseUrl: apiBaseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 20),
          ),
        );

  final Dio _dio;

  LearnerDashboardSnapshot? loadCachedLearnerSnapshot() {
    final cached = SessionManager.loadCachedDashboardSnapshot('learner');
    if (cached == null) return null;
    return LearnerDashboardSnapshot.fromCache(cached);
  }

  Future<LearnerDashboardSnapshot> fetchLearnerDashboard() async {
    final token = SessionManager.getAccessToken();
    if (token == null) {
      throw DashboardException('Authentication required to load dashboard data.');
    }

    try {
      final response = await _dio.get(
        '/dashboard/me',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final data = response.data['data'];
      if (data is! Map<String, dynamic>) {
        throw DashboardException('Unexpected dashboard response.');
      }
      final snapshot = LearnerDashboardSnapshot.fromApi(data, syncedAt: DateTime.now());
      await SessionManager.cacheDashboardSnapshot('learner', snapshot.toJson());
      return snapshot;
    } on DioException catch (error) {
      final cached = loadCachedLearnerSnapshot();
      if (cached != null) {
        return cached.copyWith(isFromCache: true);
      }
      final message = error.response?.statusCode == 401
          ? 'Your session has expired. Please sign in again.'
          : error.message ?? 'Unable to load dashboard data.';
      throw DashboardException(message);
    } catch (error) {
      final cached = loadCachedLearnerSnapshot();
      if (cached != null) {
        return cached.copyWith(isFromCache: true);
      }
      throw DashboardException('Unable to load dashboard data.');
    }
  }

  CommunityDashboardSnapshot? loadCachedCommunitySnapshot() {
    final cached = SessionManager.loadCachedDashboardSnapshot('community');
    if (cached == null) return null;
    return CommunityDashboardSnapshot.fromCache(cached);
  }

  Future<CommunityDashboardSnapshot> fetchCommunityDashboard() async {
    final token = SessionManager.getAccessToken();
    if (token == null) {
      throw DashboardException('Authentication required to load dashboard data.');
    }

    try {
      final response = await _dio.get(
        '/dashboard/me',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final data = response.data['data'];
      if (data is! Map<String, dynamic>) {
        throw DashboardException('Unexpected dashboard response.');
      }
      final snapshot = CommunityDashboardSnapshot.fromApi(data, syncedAt: DateTime.now());
      await SessionManager.cacheDashboardSnapshot('community', snapshot.toJson());
      return snapshot;
    } on DioException catch (error) {
      final cached = loadCachedCommunitySnapshot();
      if (cached != null) {
        return cached.copyWith(isFromCache: true);
      }
      final message = error.response?.statusCode == 401
          ? 'Your session has expired. Please sign in again.'
          : error.message ?? 'Unable to load community dashboard data.';
      throw DashboardException(message);
    } catch (error) {
      final cached = loadCachedCommunitySnapshot();
      if (cached != null) {
        return cached.copyWith(isFromCache: true);
      }
      throw DashboardException('Unable to load community dashboard data.');
    }
  }
}
