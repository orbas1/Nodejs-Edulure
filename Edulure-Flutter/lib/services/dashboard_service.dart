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
}
