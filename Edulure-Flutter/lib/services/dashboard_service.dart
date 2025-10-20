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

  bool get hasSubmission => (submissionUrl ?? '').isNotEmpty;
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

  double? get occupancyRate {
    if (capacity == null || capacity == 0) {
      return null;
    }
    return reserved / capacity!;
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
      upcoming: json['upcoming'] is num ? (json['upcoming'] as num).round() : int.tryParse('${json['upcoming'] ?? 0}') ?? 0,
      awaitingFeedback: json['awaitingFeedback'] is num
          ? (json['awaitingFeedback'] as num).round()
          : int.tryParse('${json['awaitingFeedback'] ?? 0}') ?? 0,
      overdue: json['overdue'] is num ? (json['overdue'] as num).round() : int.tryParse('${json['overdue'] ?? 0}') ?? 0,
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
          ? facilitatorsRaw.map((value) => value.toString()).where((value) => value.isNotEmpty).toList()
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
        occupancyJson is Map ? Map<String, dynamic>.from(occupancyJson as Map) : const <String, dynamic>{},
      ),
      security: LiveClassSecurity.fromJson(
        securityJson is Map ? Map<String, dynamic>.from(securityJson as Map) : const <String, dynamic>{},
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

  bool get hasCapacity => occupancy.capacity != null && occupancy.capacity! > 0;
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
    final weightRaw = json['weightShare'] ?? json['weight_share'];
    final averageRaw = json['averageScore'] ?? json['average_score'];
    return AssessmentTypeInsight(
      type: json['type']?.toString() ?? 'Assessment',
      count: json['count'] is num ? (json['count'] as num).round() : int.tryParse('${json['count'] ?? 0}') ?? 0,
      weightShare: weightRaw is num
          ? (weightRaw as num).round()
          : (weightRaw != null ? int.tryParse(weightRaw.toString()) : null),
      averageScore: averageRaw is num
          ? (averageRaw as num).round()
          : (averageRaw != null ? int.tryParse(averageRaw.toString()) : null),
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
    int? _asInt(dynamic value) {
      if (value is num) {
        return value.round();
      }
      if (value == null) {
        return null;
      }
      return int.tryParse(value.toString());
    }

    final byTypeJson = json['byType'];
    final weightRaw = json['workloadWeight'];

    return AssessmentAnalytics(
      byType: byTypeJson is List
          ? byTypeJson
              .map((item) => AssessmentTypeInsight.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <AssessmentTypeInsight>[],
      pendingReviews: _asInt(json['pendingReviews']),
      overdue: _asInt(json['overdue']),
      averageLeadTimeDays: _asInt(json['averageLeadTimeDays']),
      workloadWeight: weightRaw is num ? weightRaw : num.tryParse(weightRaw?.toString() ?? ''),
      completionRate: _asInt(json['completionRate']),
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
          ? facilitatorsRaw.map((value) => value.toString()).where((value) => value.isNotEmpty).toList()
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
    final timelineJson = json['timeline'] is Map ? Map<String, dynamic>.from(json['timeline'] as Map) : const <String, dynamic>{};
    final coursesJson = json['courses'];
    final scheduleJson = json['schedule'] is Map ? Map<String, dynamic>.from(json['schedule'] as Map) : const <String, dynamic>{};
    final analyticsJson = json['analytics'] is Map ? Map<String, dynamic>.from(json['analytics'] as Map) : const <String, dynamic>{};
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
      resources: resourcesJson is List ? resourcesJson.map((item) => item.toString()).toList() : <String>[],
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

    List<LiveClassSessionSummary> parseSessions(String key) {
      final value = json[key];
      if (value is List) {
        return value
            .map((item) => LiveClassSessionSummary.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList();
      }
      return <LiveClassSessionSummary>[];
    }

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

int? _asInt(dynamic value) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

double? _asDouble(dynamic value) {
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

bool _asBool(dynamic value, [bool fallback = false]) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    final lower = value.toLowerCase();
    if (lower == 'true' || lower == 'yes' || lower == '1') return true;
    if (lower == 'false' || lower == 'no' || lower == '0') return false;
  }
  return fallback;
}

class FieldServiceSummaryCard {
  FieldServiceSummaryCard({
    required this.key,
    required this.label,
    required this.value,
    required this.hint,
    required this.tone,
  });

  final String key;
  final String label;
  final String value;
  final String hint;
  final String tone;

  factory FieldServiceSummaryCard.fromJson(Map<String, dynamic> json) {
    return FieldServiceSummaryCard(
      key: json['key']?.toString() ?? json['label']?.toString() ?? 'card',
      label: json['label']?.toString() ?? 'Metric',
      value: json['value']?.toString() ?? '—',
      hint: json['hint']?.toString() ?? '',
      tone: json['tone']?.toString() ?? 'muted',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'key': key,
      'label': label,
      'value': value,
      'hint': hint,
      'tone': tone,
    };
  }
}

class FieldServiceSummary {
  FieldServiceSummary({
    required this.total,
    required this.active,
    required this.completed,
    required this.incidents,
    required this.slaBreaches,
    this.averageEtaMinutes,
    this.averageResolutionMinutes,
    this.onTimeRate,
    required this.cards,
    this.updatedAt,
  });

  final int total;
  final int active;
  final int completed;
  final int incidents;
  final int slaBreaches;
  final int? averageEtaMinutes;
  final int? averageResolutionMinutes;
  final int? onTimeRate;
  final List<FieldServiceSummaryCard> cards;
  final DateTime? updatedAt;

  factory FieldServiceSummary.fromJson(Map<String, dynamic> json) {
    final totals = json['totals'] is Map
        ? Map<String, dynamic>.from(json['totals'] as Map)
        : <String, dynamic>{};
    final averages = json['averages'] is Map
        ? Map<String, dynamic>.from(json['averages'] as Map)
        : <String, dynamic>{};
    final performance = json['performance'] is Map
        ? Map<String, dynamic>.from(json['performance'] as Map)
        : <String, dynamic>{};

    return FieldServiceSummary(
      total: _asInt(totals['total']) ?? 0,
      active: _asInt(totals['active']) ?? 0,
      completed: _asInt(totals['completed']) ?? 0,
      incidents: _asInt(totals['incidents']) ?? 0,
      slaBreaches: _asInt(totals['slaBreaches']) ?? 0,
      averageEtaMinutes: _asInt(averages['etaMinutes']),
      averageResolutionMinutes: _asInt(averages['resolutionMinutes']),
      onTimeRate: _asInt(performance['onTimeRate']),
      cards: json['cards'] is List
          ? (json['cards'] as List)
              .map((item) => FieldServiceSummaryCard.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <FieldServiceSummaryCard>[],
      updatedAt:
          json['updatedAt'] is String ? DateTime.tryParse(json['updatedAt'] as String) : DateTime.tryParse('${json['updated_at']}'),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totals': {
        'total': total,
        'active': active,
        'completed': completed,
        'incidents': incidents,
        'slaBreaches': slaBreaches,
      },
      'averages': {
        'etaMinutes': averageEtaMinutes,
        'resolutionMinutes': averageResolutionMinutes,
      },
      'performance': {
        'onTimeRate': onTimeRate,
      },
      'cards': cards.map((card) => card.toJson()).toList(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }
}

class FieldServiceAddress {
  FieldServiceAddress({
    this.line1,
    this.line2,
    this.city,
    this.region,
    this.postalCode,
    this.country,
  });

  final String? line1;
  final String? line2;
  final String? city;
  final String? region;
  final String? postalCode;
  final String? country;

  factory FieldServiceAddress.fromJson(Map<String, dynamic> json) {
    return FieldServiceAddress(
      line1: json['line1']?.toString(),
      line2: json['line2']?.toString(),
      city: json['city']?.toString(),
      region: json['region']?.toString(),
      postalCode: json['postalCode']?.toString() ?? json['postal_code']?.toString(),
      country: json['country']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (line1 != null) 'line1': line1,
      if (line2 != null) 'line2': line2,
      if (city != null) 'city': city,
      if (region != null) 'region': region,
      if (postalCode != null) 'postalCode': postalCode,
      if (country != null) 'country': country,
    };
  }
}

class FieldServiceLocation {
  FieldServiceLocation({
    this.label,
    this.lat,
    this.lng,
    this.address,
  });

  final String? label;
  final double? lat;
  final double? lng;
  final FieldServiceAddress? address;

  factory FieldServiceLocation.fromJson(Map<String, dynamic> json) {
    return FieldServiceLocation(
      label: json['label']?.toString(),
      lat: _asDouble(json['lat']),
      lng: _asDouble(json['lng']),
      address: json['address'] is Map
          ? FieldServiceAddress.fromJson(Map<String, dynamic>.from(json['address'] as Map))
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (label != null) 'label': label,
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
      if (address != null) 'address': address!.toJson(),
    };
  }
}

class FieldServiceParty {
  FieldServiceParty({
    this.id,
    this.name,
    this.email,
  });

  final int? id;
  final String? name;
  final String? email;

  factory FieldServiceParty.fromJson(Map<String, dynamic> json) {
    return FieldServiceParty(
      id: _asInt(json['id']),
      name: json['name']?.toString(),
      email: json['email']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (email != null) 'email': email,
    };
  }
}

class FieldServiceAssignmentMetrics {
  FieldServiceAssignmentMetrics({
    this.elapsedMinutes,
    this.resolutionMinutes,
    this.onTime,
  });

  final int? elapsedMinutes;
  final int? resolutionMinutes;
  final bool? onTime;

  factory FieldServiceAssignmentMetrics.fromJson(Map<String, dynamic> json) {
    return FieldServiceAssignmentMetrics(
      elapsedMinutes: _asInt(json['elapsedMinutes']),
      resolutionMinutes: _asInt(json['resolutionMinutes']),
      onTime: json['onTime'] is bool ? json['onTime'] as bool : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'elapsedMinutes': elapsedMinutes,
      'resolutionMinutes': resolutionMinutes,
      'onTime': onTime,
    };
  }
}

class FieldServiceTimelineEvent {
  FieldServiceTimelineEvent({
    required this.id,
    required this.orderId,
    required this.label,
    this.status,
    this.timestamp,
    this.occurredAt,
    this.relativeTime,
    this.notes,
    this.author,
    this.isIncident = false,
    this.severity,
    this.metadata = const {},
  });

  final String id;
  final int orderId;
  final String label;
  final String? status;
  final String? timestamp;
  final DateTime? occurredAt;
  final String? relativeTime;
  final String? notes;
  final String? author;
  final bool isIncident;
  final String? severity;
  final Map<String, dynamic> metadata;

  factory FieldServiceTimelineEvent.fromJson(Map<String, dynamic> json) {
    return FieldServiceTimelineEvent(
      id: json['id']?.toString() ?? '${json['orderId'] ?? DateTime.now().millisecondsSinceEpoch}-event',
      orderId: _asInt(json['orderId']) ?? 0,
      label: json['label']?.toString() ?? 'Update',
      status: json['status']?.toString(),
      timestamp: json['timestamp']?.toString(),
      occurredAt: json['occurredAt'] is String
          ? DateTime.tryParse(json['occurredAt'] as String)
          : DateTime.tryParse('${json['occurred_at']}'),
      relativeTime: json['relativeTime']?.toString(),
      notes: json['notes']?.toString(),
      author: json['author']?.toString(),
      isIncident: _asBool(json['isIncident']),
      severity: json['severity']?.toString(),
      metadata: json['metadata'] is Map
          ? Map<String, dynamic>.from(json['metadata'] as Map)
          : <String, dynamic>{},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'label': label,
      if (status != null) 'status': status,
      if (timestamp != null) 'timestamp': timestamp,
      if (occurredAt != null) 'occurredAt': occurredAt!.toIso8601String(),
      if (relativeTime != null) 'relativeTime': relativeTime,
      if (notes != null) 'notes': notes,
      if (author != null) 'author': author,
      'isIncident': isIncident,
      if (severity != null) 'severity': severity,
      'metadata': metadata,
    };
  }
}

class FieldServiceIncident {
  FieldServiceIncident({
    required this.id,
    required this.orderId,
    required this.orderReference,
    this.serviceType,
    this.severity,
    this.occurredAt,
    this.timestamp,
    this.relativeTime,
    this.notes,
    this.status,
    this.owner,
    this.nextAction,
  });

  final String id;
  final int orderId;
  final String orderReference;
  final String? serviceType;
  final String? severity;
  final DateTime? occurredAt;
  final String? timestamp;
  final String? relativeTime;
  final String? notes;
  final String? status;
  final String? owner;
  final String? nextAction;

  factory FieldServiceIncident.fromJson(Map<String, dynamic> json) {
    return FieldServiceIncident(
      id: json['id']?.toString() ?? '${json['orderId'] ?? ''}-incident',
      orderId: _asInt(json['orderId']) ?? 0,
      orderReference: json['orderReference']?.toString() ?? 'Service order',
      serviceType: json['serviceType']?.toString(),
      severity: json['severity']?.toString(),
      occurredAt: json['occurredAt'] is String
          ? DateTime.tryParse(json['occurredAt'] as String)
          : DateTime.tryParse('${json['occurred_at']}'),
      timestamp: json['timestamp']?.toString(),
      relativeTime: json['relativeTime']?.toString(),
      notes: json['notes']?.toString(),
      status: json['status']?.toString(),
      owner: json['owner']?.toString(),
      nextAction: json['nextAction']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'orderReference': orderReference,
      if (serviceType != null) 'serviceType': serviceType,
      if (severity != null) 'severity': severity,
      if (occurredAt != null) 'occurredAt': occurredAt!.toIso8601String(),
      if (timestamp != null) 'timestamp': timestamp,
      if (relativeTime != null) 'relativeTime': relativeTime,
      if (notes != null) 'notes': notes,
      if (status != null) 'status': status,
      if (owner != null) 'owner': owner,
      if (nextAction != null) 'nextAction': nextAction,
    };
  }
}

class FieldServiceProviderMetrics {
  FieldServiceProviderMetrics({
    required this.totalAssignments,
    required this.activeAssignments,
    required this.completedAssignments,
    required this.assignments30d,
    required this.incidentCount,
    this.averageEtaMinutes,
    this.averageResolutionMinutes,
    this.onTimeRate,
  });

  final int totalAssignments;
  final int activeAssignments;
  final int completedAssignments;
  final int assignments30d;
  final int incidentCount;
  final int? averageEtaMinutes;
  final int? averageResolutionMinutes;
  final int? onTimeRate;

  factory FieldServiceProviderMetrics.fromJson(Map<String, dynamic> json) {
    return FieldServiceProviderMetrics(
      totalAssignments: _asInt(json['totalAssignments']) ?? 0,
      activeAssignments: _asInt(json['activeAssignments']) ?? 0,
      completedAssignments: _asInt(json['completedAssignments']) ?? 0,
      assignments30d: _asInt(json['assignments30d']) ?? 0,
      incidentCount: _asInt(json['incidentCount']) ?? 0,
      averageEtaMinutes: _asInt(json['averageEtaMinutes']),
      averageResolutionMinutes: _asInt(json['averageResolutionMinutes']),
      onTimeRate: _asInt(json['onTimeRate']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalAssignments': totalAssignments,
      'activeAssignments': activeAssignments,
      'completedAssignments': completedAssignments,
      'assignments30d': assignments30d,
      'incidentCount': incidentCount,
      'averageEtaMinutes': averageEtaMinutes,
      'averageResolutionMinutes': averageResolutionMinutes,
      'onTimeRate': onTimeRate,
    };
  }
}

class FieldServiceProviderLocation {
  FieldServiceProviderLocation({
    this.label,
    this.lat,
    this.lng,
    this.updatedAt,
    this.relative,
  });

  final String? label;
  final double? lat;
  final double? lng;
  final DateTime? updatedAt;
  final String? relative;

  factory FieldServiceProviderLocation.fromJson(Map<String, dynamic> json) {
    return FieldServiceProviderLocation(
      label: json['label']?.toString(),
      lat: _asDouble(json['lat']),
      lng: _asDouble(json['lng']),
      updatedAt: json['updatedAt'] is String
          ? DateTime.tryParse(json['updatedAt'] as String)
          : DateTime.tryParse('${json['updated_at']}'),
      relative: json['relative']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (label != null) 'label': label,
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
      if (relative != null) 'relative': relative,
    };
  }
}

class FieldServiceProviderSummary {
  FieldServiceProviderSummary({
    required this.id,
    this.userId,
    required this.name,
    this.email,
    this.phone,
    this.status,
    this.rating,
    this.specialties = const [],
    this.avatar,
    this.location,
    this.lastCheckInAt,
    this.lastCheckInRelative,
    this.metrics,
  });

  final int id;
  final int? userId;
  final String name;
  final String? email;
  final String? phone;
  final String? status;
  final double? rating;
  final List<String> specialties;
  final String? avatar;
  final FieldServiceProviderLocation? location;
  final DateTime? lastCheckInAt;
  final String? lastCheckInRelative;
  final FieldServiceProviderMetrics? metrics;

  factory FieldServiceProviderSummary.fromJson(Map<String, dynamic> json) {
    return FieldServiceProviderSummary(
      id: _asInt(json['id']) ?? 0,
      userId: _asInt(json['userId']),
      name: json['name']?.toString() ?? 'Provider',
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      status: json['status']?.toString(),
      rating: _asDouble(json['rating']),
      specialties: json['specialties'] is List
          ? (json['specialties'] as List).map((item) => item?.toString() ?? '').where((item) => item.isNotEmpty).toList()
          : <String>[],
      avatar: json['avatar']?.toString(),
      location: json['location'] is Map
          ? FieldServiceProviderLocation.fromJson(Map<String, dynamic>.from(json['location'] as Map))
          : null,
      lastCheckInAt: json['lastCheckInAt'] is String
          ? DateTime.tryParse(json['lastCheckInAt'] as String)
          : DateTime.tryParse('${json['lastCheckIn'] ?? json['last_check_in_at']}'),
      lastCheckInRelative: json['lastCheckInRelative']?.toString(),
      metrics: json['metrics'] is Map
          ? FieldServiceProviderMetrics.fromJson(Map<String, dynamic>.from(json['metrics'] as Map))
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'email': email,
      'phone': phone,
      'status': status,
      'rating': rating,
      'specialties': specialties,
      'avatar': avatar,
      if (location != null) 'location': location!.toJson(),
      if (lastCheckInAt != null) 'lastCheckInAt': lastCheckInAt!.toIso8601String(),
      if (lastCheckInRelative != null) 'lastCheckInRelative': lastCheckInRelative,
      if (metrics != null) 'metrics': metrics!.toJson(),
    };
  }
}

class FieldServiceAssignment {
  FieldServiceAssignment({
    required this.id,
    required this.reference,
    required this.status,
    this.statusLabel,
    this.priority,
    this.serviceType,
    this.summary,
    this.requestedAt,
    this.requestedAtLabel,
    this.scheduledFor,
    this.scheduledForLabel,
    this.etaMinutes,
    this.slaMinutes,
    this.distanceKm,
    this.riskLevel,
    this.slaBreached = false,
    this.nextAction,
    this.lastUpdate,
    this.lastUpdateLabel,
    this.metrics,
    this.location,
    this.customer,
    this.provider,
    this.timeline = const [],
    this.incidents = const [],
  });

  final int id;
  final String reference;
  final String status;
  final String? statusLabel;
  final String? priority;
  final String? serviceType;
  final String? summary;
  final DateTime? requestedAt;
  final String? requestedAtLabel;
  final DateTime? scheduledFor;
  final String? scheduledForLabel;
  final int? etaMinutes;
  final int? slaMinutes;
  final double? distanceKm;
  final String? riskLevel;
  final bool slaBreached;
  final String? nextAction;
  final DateTime? lastUpdate;
  final String? lastUpdateLabel;
  final FieldServiceAssignmentMetrics? metrics;
  final FieldServiceLocation? location;
  final FieldServiceParty? customer;
  final FieldServiceProviderSummary? provider;
  final List<FieldServiceTimelineEvent> timeline;
  final List<FieldServiceIncident> incidents;

  factory FieldServiceAssignment.fromJson(Map<String, dynamic> json) {
    return FieldServiceAssignment(
      id: _asInt(json['id']) ?? 0,
      reference: json['reference']?.toString() ?? 'Assignment',
      status: json['status']?.toString() ?? 'pending',
      statusLabel: json['statusLabel']?.toString(),
      priority: json['priority']?.toString(),
      serviceType: json['serviceType']?.toString(),
      summary: json['summary']?.toString(),
      requestedAt: json['requestedAt'] is String
          ? DateTime.tryParse(json['requestedAt'] as String)
          : DateTime.tryParse('${json['requested_at']}'),
      requestedAtLabel: json['requestedAtLabel']?.toString(),
      scheduledFor: json['scheduledFor'] is String
          ? DateTime.tryParse(json['scheduledFor'] as String)
          : DateTime.tryParse('${json['scheduled_for']}'),
      scheduledForLabel: json['scheduledForLabel']?.toString(),
      etaMinutes: _asInt(json['etaMinutes']),
      slaMinutes: _asInt(json['slaMinutes']),
      distanceKm: _asDouble(json['distanceKm']),
      riskLevel: json['riskLevel']?.toString(),
      slaBreached: _asBool(json['slaBreached']),
      nextAction: json['nextAction']?.toString(),
      lastUpdate: json['lastUpdate'] is String
          ? DateTime.tryParse(json['lastUpdate'] as String)
          : DateTime.tryParse('${json['last_update']}'),
      lastUpdateLabel: json['lastUpdateLabel']?.toString(),
      metrics: json['metrics'] is Map
          ? FieldServiceAssignmentMetrics.fromJson(Map<String, dynamic>.from(json['metrics'] as Map))
          : null,
      location: json['location'] is Map
          ? FieldServiceLocation.fromJson(Map<String, dynamic>.from(json['location'] as Map))
          : null,
      customer: json['customer'] is Map
          ? FieldServiceParty.fromJson(Map<String, dynamic>.from(json['customer'] as Map))
          : null,
      provider: json['provider'] is Map
          ? FieldServiceProviderSummary.fromJson(Map<String, dynamic>.from(json['provider'] as Map))
          : null,
      timeline: json['timeline'] is List
          ? (json['timeline'] as List)
              .map((item) => FieldServiceTimelineEvent.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <FieldServiceTimelineEvent>[],
      incidents: json['incidents'] is List
          ? (json['incidents'] as List)
              .map((item) => FieldServiceIncident.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <FieldServiceIncident>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'reference': reference,
      'status': status,
      if (statusLabel != null) 'statusLabel': statusLabel,
      if (priority != null) 'priority': priority,
      if (serviceType != null) 'serviceType': serviceType,
      if (summary != null) 'summary': summary,
      if (requestedAt != null) 'requestedAt': requestedAt!.toIso8601String(),
      if (requestedAtLabel != null) 'requestedAtLabel': requestedAtLabel,
      if (scheduledFor != null) 'scheduledFor': scheduledFor!.toIso8601String(),
      if (scheduledForLabel != null) 'scheduledForLabel': scheduledForLabel,
      'etaMinutes': etaMinutes,
      'slaMinutes': slaMinutes,
      'distanceKm': distanceKm,
      if (riskLevel != null) 'riskLevel': riskLevel,
      'slaBreached': slaBreached,
      if (nextAction != null) 'nextAction': nextAction,
      if (lastUpdate != null) 'lastUpdate': lastUpdate!.toIso8601String(),
      if (lastUpdateLabel != null) 'lastUpdateLabel': lastUpdateLabel,
      if (metrics != null) 'metrics': metrics!.toJson(),
      if (location != null) 'location': location!.toJson(),
      if (customer != null) 'customer': customer!.toJson(),
      if (provider != null) 'provider': provider!.toJson(),
      'timeline': timeline.map((event) => event.toJson()).toList(),
      'incidents': incidents.map((incident) => incident.toJson()).toList(),
    };
  }
}

class FieldServiceMapPoint {
  FieldServiceMapPoint({
    this.lat,
    this.lng,
    this.label,
  });

  final double? lat;
  final double? lng;
  final String? label;

  factory FieldServiceMapPoint.fromJson(Map<String, dynamic> json) {
    return FieldServiceMapPoint(
      lat: _asDouble(json['lat']),
      lng: _asDouble(json['lng']),
      label: json['label']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'lat': lat,
      'lng': lng,
      if (label != null) 'label': label,
    };
  }
}

class FieldServiceMapBounds {
  FieldServiceMapBounds({
    this.minLat,
    this.maxLat,
    this.minLng,
    this.maxLng,
  });

  final double? minLat;
  final double? maxLat;
  final double? minLng;
  final double? maxLng;

  factory FieldServiceMapBounds.fromJson(Map<String, dynamic> json) {
    return FieldServiceMapBounds(
      minLat: _asDouble(json['minLat']),
      maxLat: _asDouble(json['maxLat']),
      minLng: _asDouble(json['minLng']),
      maxLng: _asDouble(json['maxLng']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'minLat': minLat,
      'maxLat': maxLat,
      'minLng': minLng,
      'maxLng': maxLng,
    };
  }
}

class FieldServiceMapAssignment {
  FieldServiceMapAssignment({
    required this.orderId,
    required this.reference,
    required this.status,
    this.priority,
    this.etaMinutes,
    this.riskLevel,
    this.customer,
    this.provider,
    this.path = const [],
  });

  final int orderId;
  final String reference;
  final String status;
  final String? priority;
  final int? etaMinutes;
  final String? riskLevel;
  final FieldServiceMapPoint? customer;
  final FieldServiceMapPoint? provider;
  final List<List<double>> path;

  factory FieldServiceMapAssignment.fromJson(Map<String, dynamic> json) {
    final rawPath = json['path'];
    return FieldServiceMapAssignment(
      orderId: _asInt(json['orderId']) ?? 0,
      reference: json['reference']?.toString() ?? 'Order',
      status: json['status']?.toString() ?? 'pending',
      priority: json['priority']?.toString(),
      etaMinutes: _asInt(json['etaMinutes']),
      riskLevel: json['riskLevel']?.toString(),
      customer: json['customer'] is Map
          ? FieldServiceMapPoint.fromJson(Map<String, dynamic>.from(json['customer'] as Map))
          : null,
      provider: json['provider'] is Map
          ? FieldServiceMapPoint.fromJson(Map<String, dynamic>.from(json['provider'] as Map))
          : null,
      path: rawPath is List
          ? rawPath
              .map((segment) =>
                  segment is List ? segment.map((point) => _asDouble(point) ?? 0).toList() : <double>[])
              .where((segment) => segment.isNotEmpty)
              .toList()
          : <List<double>>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'orderId': orderId,
      'reference': reference,
      'status': status,
      if (priority != null) 'priority': priority,
      'etaMinutes': etaMinutes,
      if (riskLevel != null) 'riskLevel': riskLevel,
      if (customer != null) 'customer': customer!.toJson(),
      if (provider != null) 'provider': provider!.toJson(),
      'path': path,
    };
  }
}

class FieldServiceMap {
  FieldServiceMap({
    this.center,
    this.bounds,
    this.assignments = const [],
  });

  final FieldServiceMapPoint? center;
  final FieldServiceMapBounds? bounds;
  final List<FieldServiceMapAssignment> assignments;

  factory FieldServiceMap.fromJson(Map<String, dynamic> json) {
    return FieldServiceMap(
      center: json['center'] is Map
          ? FieldServiceMapPoint.fromJson(Map<String, dynamic>.from(json['center'] as Map))
          : null,
      bounds: json['bounds'] is Map
          ? FieldServiceMapBounds.fromJson(Map<String, dynamic>.from(json['bounds'] as Map))
          : null,
      assignments: json['assignments'] is List
          ? (json['assignments'] as List)
              .map((item) => FieldServiceMapAssignment.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <FieldServiceMapAssignment>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (center != null) 'center': center!.toJson(),
      if (bounds != null) 'bounds': bounds!.toJson(),
      'assignments': assignments.map((assignment) => assignment.toJson()).toList(),
    };
  }
}

class FieldServiceWorkspace {
  FieldServiceWorkspace({
    required this.scope,
    required this.summary,
    required this.assignments,
    required this.timeline,
    required this.incidents,
    required this.providers,
    this.map,
    this.lastUpdated,
  });

  final String scope;
  final FieldServiceSummary summary;
  final List<FieldServiceAssignment> assignments;
  final List<FieldServiceTimelineEvent> timeline;
  final List<FieldServiceIncident> incidents;
  final List<FieldServiceProviderSummary> providers;
  final FieldServiceMap? map;
  final DateTime? lastUpdated;

  factory FieldServiceWorkspace.fromJson(Map<String, dynamic> json) {
    return FieldServiceWorkspace(
      scope: json['scope']?.toString() ?? 'customer',
      summary: FieldServiceSummary.fromJson(
        json['summary'] is Map ? Map<String, dynamic>.from(json['summary'] as Map) : <String, dynamic>{},
      ),
      assignments: json['assignments'] is List
          ? (json['assignments'] as List)
              .map((item) => FieldServiceAssignment.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <FieldServiceAssignment>[],
      timeline: json['timeline'] is List
          ? (json['timeline'] as List)
              .map((item) => FieldServiceTimelineEvent.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <FieldServiceTimelineEvent>[],
      incidents: json['incidents'] is List
          ? (json['incidents'] as List)
              .map((item) => FieldServiceIncident.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <FieldServiceIncident>[],
      providers: json['providers'] is List
          ? (json['providers'] as List)
              .map((item) => FieldServiceProviderSummary.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <FieldServiceProviderSummary>[],
      map: json['map'] is Map ? FieldServiceMap.fromJson(Map<String, dynamic>.from(json['map'] as Map)) : null,
      lastUpdated: json['lastUpdated'] is String
          ? DateTime.tryParse(json['lastUpdated'] as String)
          : DateTime.tryParse('${json['last_updated']}'),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'scope': scope,
      'summary': summary.toJson(),
      'assignments': assignments.map((assignment) => assignment.toJson()).toList(),
      'timeline': timeline.map((event) => event.toJson()).toList(),
      'incidents': incidents.map((incident) => incident.toJson()).toList(),
      'providers': providers.map((provider) => provider.toJson()).toList(),
      if (map != null) 'map': map!.toJson(),
      if (lastUpdated != null) 'lastUpdated': lastUpdated!.toIso8601String(),
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
    required this.blogPosts,
    this.featuredBlog,
    this.fieldServices,
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
  final LearnerAssessmentsData? assessments;
  final List<BlogArticle> blogPosts;
  final BlogArticle? featuredBlog;
  final FieldServiceWorkspace? fieldServices;
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
      blogPosts: blogPosts,
      featuredBlog: featuredBlog,
      fieldServices: fieldServices,
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
    final assessmentsJson = learnerJson['assessments'] is Map
        ? Map<String, dynamic>.from(learnerJson['assessments'] as Map)
        : null;
    final liveClassroomsJson = learnerJson['liveClassrooms'] is Map
        ? Map<String, dynamic>.from(learnerJson['liveClassrooms'] as Map)
        : <String, dynamic>{};
    final fieldServicesJson = learnerJson['fieldServices'] is Map
        ? Map<String, dynamic>.from(learnerJson['fieldServices'] as Map)
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
      liveClassrooms:
          liveClassroomsJson.isEmpty ? null : LiveClassroomsSnapshot.fromJson(liveClassroomsJson),
      unreadMessages: (notificationsJson['unreadMessages'] is num)
          ? (notificationsJson['unreadMessages'] as num).round()
          : int.tryParse('${notificationsJson['unreadMessages'] ?? 0}') ?? 0,
      totalNotifications: (notificationsJson['total'] is num)
          ? (notificationsJson['total'] as num).round()
          : int.tryParse('${notificationsJson['total'] ?? 0}') ?? 0,
      syncedAt: syncedAt ?? DateTime.now(),
      assessments:
          assessmentsJson != null ? LearnerAssessmentsData.fromJson(assessmentsJson) : null,
      blogPosts: (learnerJson['blog'] is Map && (learnerJson['blog'] as Map)['highlights'] is List)
          ? ((learnerJson['blog'] as Map)['highlights'] as List)
              .map((item) => BlogArticle.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <BlogArticle>[],
      featuredBlog: (learnerJson['blog'] is Map && (learnerJson['blog'] as Map)['featured'] is Map)
          ? BlogArticle.fromJson(Map<String, dynamic>.from((learnerJson['blog'] as Map)['featured'] as Map))
          : null,
      fieldServices:
          fieldServicesJson != null ? FieldServiceWorkspace.fromJson(fieldServicesJson) : null,
    );
  }

  factory LearnerDashboardSnapshot.fromCache(Map<String, dynamic> json) {
    final profileJson = json['profile'] is Map ? Map<String, dynamic>.from(json['profile'] as Map) : <String, dynamic>{};
    final assessmentsJson = json['assessments'] is Map
        ? Map<String, dynamic>.from(json['assessments'] as Map)
        : null;
    final fieldServicesJson = json['fieldServices'] is Map
        ? Map<String, dynamic>.from(json['fieldServices'] as Map)
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
      assessments: assessmentsJson != null ? LearnerAssessmentsData.fromJson(assessmentsJson) : null,
      blogPosts: json['blogPosts'] is List
          ? (json['blogPosts'] as List)
              .map((item) => BlogArticle.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList()
          : <BlogArticle>[],
      featuredBlog: json['featuredBlog'] is Map
          ? BlogArticle.fromJson(Map<String, dynamic>.from(json['featuredBlog'] as Map))
          : null,
      fieldServices:
          fieldServicesJson != null ? FieldServiceWorkspace.fromJson(fieldServicesJson) : null,
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
      if (fieldServices != null) 'fieldServices': fieldServices!.toJson(),
      'unreadMessages': unreadMessages,
      'totalNotifications': totalNotifications,
      'syncedAt': syncedAt.toIso8601String(),
      if (assessments != null) 'assessments': assessments!.toJson(),
      'blogPosts': blogPosts.map((article) => article.toJson()).toList(),
      if (featuredBlog != null) 'featuredBlog': featuredBlog!.toJson(),
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
