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

class AssessmentOverviewMetric {
  AssessmentOverviewMetric({
    required this.label,
    required this.value,
    this.context,
    this.tone,
  });

  final String label;
  final String value;
  final String? context;
  final String? tone;

  factory AssessmentOverviewMetric.fromJson(Map<String, dynamic> json) {
    return AssessmentOverviewMetric(
      label: json['label']?.toString() ?? 'Metric',
      value: json['value']?.toString() ?? '0',
      context: json['context']?.toString(),
      tone: json['tone']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'value': value,
      if (context != null) 'context': context,
      if (tone != null) 'tone': tone,
    };
  }
}

class AssessmentTimelineItem {
  AssessmentTimelineItem({
    required this.id,
    required this.title,
    required this.course,
    this.type,
    this.due,
    this.dueIn,
    this.status,
    this.weight,
    this.mode,
    this.score,
    this.recommended,
    this.submissionUrl,
    this.instructions,
  });

  final String id;
  final String title;
  final String course;
  final String? type;
  final String? due;
  final String? dueIn;
  final String? status;
  final String? weight;
  final String? mode;
  final String? score;
  final String? recommended;
  final String? submissionUrl;
  final String? instructions;

  factory AssessmentTimelineItem.fromJson(Map<String, dynamic> json) {
    return AssessmentTimelineItem(
      id: json['id']?.toString() ?? json['title']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: json['title']?.toString() ?? 'Assessment',
      course: json['course']?.toString() ?? 'Course',
      type: json['type']?.toString(),
      due: json['due']?.toString(),
      dueIn: json['dueIn']?.toString(),
      status: json['status']?.toString(),
      weight: json['weight']?.toString(),
      mode: json['mode']?.toString(),
      score: json['score']?.toString(),
      recommended: json['recommended']?.toString(),
      submissionUrl: json['submissionUrl']?.toString(),
      instructions: json['instructions']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'course': course,
      if (type != null) 'type': type,
      if (due != null) 'due': due,
      if (dueIn != null) 'dueIn': dueIn,
      if (status != null) 'status': status,
      if (weight != null) 'weight': weight,
      if (mode != null) 'mode': mode,
      if (score != null) 'score': score,
      if (recommended != null) 'recommended': recommended,
      if (submissionUrl != null) 'submissionUrl': submissionUrl,
      if (instructions != null) 'instructions': instructions,
    };
  }
}

class AssessmentCourseReport {
  AssessmentCourseReport({
    required this.id,
    required this.name,
    required this.progress,
    required this.status,
    required this.upcoming,
    required this.awaitingFeedback,
    required this.overdue,
    this.averageScore,
  });

  final String id;
  final String name;
  final String progress;
  final String status;
  final int upcoming;
  final int awaitingFeedback;
  final int overdue;
  final String? averageScore;

  factory AssessmentCourseReport.fromJson(Map<String, dynamic> json) {
    return AssessmentCourseReport(
      id: json['id']?.toString() ?? json['name']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      name: json['name']?.toString() ?? 'Course',
      progress: json['progress']?.toString() ?? '0% complete',
      status: json['status']?.toString() ?? 'On track',
      upcoming: (json['upcoming'] is num) ? (json['upcoming'] as num).round() : int.tryParse('${json['upcoming'] ?? 0}') ?? 0,
      awaitingFeedback: (json['awaitingFeedback'] is num)
          ? (json['awaitingFeedback'] as num).round()
          : int.tryParse('${json['awaitingFeedback'] ?? 0}') ?? 0,
      overdue: (json['overdue'] is num) ? (json['overdue'] as num).round() : int.tryParse('${json['overdue'] ?? 0}') ?? 0,
      averageScore: json['averageScore']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'progress': progress,
      'status': status,
      'upcoming': upcoming,
      'awaitingFeedback': awaitingFeedback,
      'overdue': overdue,
      if (averageScore != null) 'averageScore': averageScore,
    };
  }
}

class AssessmentPlanBlock {
  AssessmentPlanBlock({
    required this.id,
    required this.focus,
    required this.course,
    required this.window,
    required this.duration,
    this.mode,
    this.submissionUrl,
  });

  final String id;
  final String focus;
  final String course;
  final String window;
  final String duration;
  final String? mode;
  final String? submissionUrl;

  factory AssessmentPlanBlock.fromJson(Map<String, dynamic> json) {
    return AssessmentPlanBlock(
      id: json['id']?.toString() ?? json['focus']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      focus: json['focus']?.toString() ?? 'Focus block',
      course: json['course']?.toString() ?? 'Course',
      window: json['window']?.toString() ?? 'Upcoming',
      duration: json['duration']?.toString() ?? '45 mins',
      mode: json['mode']?.toString(),
      submissionUrl: json['submissionUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'focus': focus,
      'course': course,
      'window': window,
      'duration': duration,
      if (mode != null) 'mode': mode,
      if (submissionUrl != null) 'submissionUrl': submissionUrl,
    };
  }
}

class AssessmentScheduleEvent {
  AssessmentScheduleEvent({
    required this.id,
    required this.title,
    required this.date,
  });

  final String id;
  final String title;
  final String date;

  factory AssessmentScheduleEvent.fromJson(Map<String, dynamic> json) {
    return AssessmentScheduleEvent(
      id: json['id']?.toString() ?? json['title']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: json['title']?.toString() ?? 'Event',
      date: json['date']?.toString() ?? 'Upcoming',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'date': date,
    };
  }
}

class AssessmentTypeInsight {
  AssessmentTypeInsight({
    required this.type,
    required this.count,
    this.weightShare,
    this.averageScore,
  });

  final String type;
  final int count;
  final int? weightShare;
  final int? averageScore;

  factory AssessmentTypeInsight.fromJson(Map<String, dynamic> json) {
    return AssessmentTypeInsight(
      type: json['type']?.toString() ?? 'Assessment',
      count: (json['count'] is num) ? (json['count'] as num).round() : int.tryParse('${json['count'] ?? 0}') ?? 0,
      weightShare: (json['weightShare'] is num)
          ? (json['weightShare'] as num).round()
          : int.tryParse('${json['weightShare'] ?? json['weight_share'] ?? 0}') ?? 0,
      averageScore: (json['averageScore'] is num)
          ? (json['averageScore'] as num).round()
          : int.tryParse('${json['averageScore'] ?? json['average_score'] ?? 0}') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'count': count,
      if (weightShare != null) 'weightShare': weightShare,
      if (averageScore != null) 'averageScore': averageScore,
    };
  }
}

class AssessmentAnalytics {
  AssessmentAnalytics({
    required this.byType,
    this.pendingReviews,
    this.overdue,
    this.averageLeadTimeDays,
    this.workloadWeight,
    this.completionRate,
  });

  final List<AssessmentTypeInsight> byType;
  final int? pendingReviews;
  final int? overdue;
  final int? averageLeadTimeDays;
  final num? workloadWeight;
  final int? completionRate;

  factory AssessmentAnalytics.fromJson(Map<String, dynamic> json) {
    final byTypeJson = json['byType'];
    return AssessmentAnalytics(
      byType: byTypeJson is List
          ? byTypeJson
              .map((item) => AssessmentTypeInsight.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <AssessmentTypeInsight>[],
      pendingReviews: (json['pendingReviews'] is num)
          ? (json['pendingReviews'] as num).round()
          : int.tryParse('${json['pendingReviews'] ?? 0}') ?? 0,
      overdue: (json['overdue'] is num)
          ? (json['overdue'] as num).round()
          : int.tryParse('${json['overdue'] ?? 0}') ?? 0,
      averageLeadTimeDays: (json['averageLeadTimeDays'] is num)
          ? (json['averageLeadTimeDays'] as num).round()
          : int.tryParse('${json['averageLeadTimeDays'] ?? 0}') ?? 0,
      workloadWeight: json['workloadWeight'] is num
          ? (json['workloadWeight'] as num)
          : num.tryParse(json['workloadWeight']?.toString() ?? ''),
      completionRate: (json['completionRate'] is num)
          ? (json['completionRate'] as num).round()
          : int.tryParse('${json['completionRate'] ?? 0}') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'byType': byType.map((entry) => entry.toJson()).toList(),
      if (pendingReviews != null) 'pendingReviews': pendingReviews,
      if (overdue != null) 'overdue': overdue,
      if (averageLeadTimeDays != null) 'averageLeadTimeDays': averageLeadTimeDays,
      if (workloadWeight != null) 'workloadWeight': workloadWeight,
      if (completionRate != null) 'completionRate': completionRate,
    };
  }
}

class LearnerAssessmentsData {
  LearnerAssessmentsData({
    required this.overview,
    required this.upcoming,
    required this.overdue,
    required this.completed,
    required this.courses,
    required this.studyPlan,
    required this.events,
    required this.analytics,
    required this.resources,
  });

  final List<AssessmentOverviewMetric> overview;
  final List<AssessmentTimelineItem> upcoming;
  final List<AssessmentTimelineItem> overdue;
  final List<AssessmentTimelineItem> completed;
  final List<AssessmentCourseReport> courses;
  final List<AssessmentPlanBlock> studyPlan;
  final List<AssessmentScheduleEvent> events;
  final AssessmentAnalytics analytics;
  final List<String> resources;

  factory LearnerAssessmentsData.fromJson(Map<String, dynamic> json) {
    final overviewJson = json['overview'];
    final timelineJson = json['timeline'] is Map ? Map<String, dynamic>.from(json['timeline'] as Map) : const {};
    final coursesJson = json['courses'];
    final scheduleJson = json['schedule'] is Map ? Map<String, dynamic>.from(json['schedule'] as Map) : const {};
    final analyticsJson = json['analytics'] is Map ? Map<String, dynamic>.from(json['analytics'] as Map) : const {};
    final resourcesJson = json['resources'];

    return LearnerAssessmentsData(
      overview: overviewJson is List
          ? overviewJson
              .map((item) => AssessmentOverviewMetric.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <AssessmentOverviewMetric>[],
      upcoming: timelineJson['upcoming'] is List
          ? (timelineJson['upcoming'] as List)
              .map((item) => AssessmentTimelineItem.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <AssessmentTimelineItem>[],
      overdue: timelineJson['overdue'] is List
          ? (timelineJson['overdue'] as List)
              .map((item) => AssessmentTimelineItem.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <AssessmentTimelineItem>[],
      completed: timelineJson['completed'] is List
          ? (timelineJson['completed'] as List)
              .map((item) => AssessmentTimelineItem.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <AssessmentTimelineItem>[],
      courses: coursesJson is List
          ? coursesJson
              .map((item) => AssessmentCourseReport.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <AssessmentCourseReport>[],
      studyPlan: scheduleJson['studyPlan'] is List
          ? (scheduleJson['studyPlan'] as List)
              .map((item) => AssessmentPlanBlock.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <AssessmentPlanBlock>[],
      events: scheduleJson['events'] is List
          ? (scheduleJson['events'] as List)
              .map((item) => AssessmentScheduleEvent.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <AssessmentScheduleEvent>[],
      analytics: AssessmentAnalytics.fromJson(analyticsJson),
      resources: resourcesJson is List
          ? resourcesJson.map((item) => item.toString()).toList()
          : <String>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'overview': overview.map((metric) => metric.toJson()).toList(),
      'timeline': {
        'upcoming': upcoming.map((item) => item.toJson()).toList(),
        'overdue': overdue.map((item) => item.toJson()).toList(),
        'completed': completed.map((item) => item.toJson()).toList(),
      },
      'courses': courses.map((course) => course.toJson()).toList(),
      'schedule': {
        'studyPlan': studyPlan.map((item) => item.toJson()).toList(),
        'events': events.map((event) => event.toJson()).toList(),
      },
      'analytics': analytics.toJson(),
      'resources': resources,
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
    this.assessments,
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
  final LearnerAssessmentsData? assessments;
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
    final assessmentsJson = learnerJson['assessments'] is Map
        ? Map<String, dynamic>.from(learnerJson['assessments'] as Map)
        : null;

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
      unreadMessages: (notificationsJson['unreadMessages'] is num)
          ? (notificationsJson['unreadMessages'] as num).round()
          : int.tryParse('${notificationsJson['unreadMessages'] ?? 0}') ?? 0,
      totalNotifications: (notificationsJson['total'] is num)
          ? (notificationsJson['total'] as num).round()
          : int.tryParse('${notificationsJson['total'] ?? 0}') ?? 0,
      syncedAt: syncedAt ?? DateTime.now(),
      assessments:
          assessmentsJson != null ? LearnerAssessmentsData.fromJson(assessmentsJson) : null,
    );
  }

  factory LearnerDashboardSnapshot.fromCache(Map<String, dynamic> json) {
    final profileJson = json['profile'] is Map ? Map<String, dynamic>.from(json['profile'] as Map) : <String, dynamic>{};
    final assessmentsJson = json['assessments'] is Map
        ? Map<String, dynamic>.from(json['assessments'] as Map)
        : null;
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
      unreadMessages: (json['unreadMessages'] is num)
          ? (json['unreadMessages'] as num).round()
          : int.tryParse('${json['unreadMessages'] ?? 0}') ?? 0,
      totalNotifications: (json['totalNotifications'] is num)
          ? (json['totalNotifications'] as num).round()
          : int.tryParse('${json['totalNotifications'] ?? 0}') ?? 0,
      syncedAt: json['syncedAt'] is String ? DateTime.tryParse(json['syncedAt'] as String) ?? DateTime.now() : DateTime.now(),
      assessments: assessmentsJson != null ? LearnerAssessmentsData.fromJson(assessmentsJson) : null,
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
      'unreadMessages': unreadMessages,
      'totalNotifications': totalNotifications,
      'syncedAt': syncedAt.toIso8601String(),
      if (assessments != null) 'assessments': assessments!.toJson(),
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
