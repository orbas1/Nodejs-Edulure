import 'package:dio/dio.dart';

import 'api_config.dart';
import 'dashboard_service.dart';
import 'session_manager.dart';

class CourseService {
  CourseService()
      : _dio = Dio(
          BaseOptions(
            baseUrl: apiBaseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 30),
          ),
        );

  final Dio _dio;

  Future<CourseDashboard> fetchDashboard() async {
    final token = SessionManager.getAccessToken();
    if (token == null) {
      throw Exception('Authentication required');
    }
    final response = await _dio.get(
      '/dashboard/me',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final data = response.data['data'];
    if (data is! Map<String, dynamic>) {
      throw Exception('Unexpected dashboard payload');
    }
    final dashboards = data['dashboards'];
    Map<String, dynamic> instructorJson = <String, dynamic>{};
    if (dashboards is Map<String, dynamic>) {
      final instructor = dashboards['instructor'];
      if (instructor is Map<String, dynamic>) {
        instructorJson = Map<String, dynamic>.from(instructor);
      }
    }

    if (instructorJson.isEmpty) {
      instructorJson = Map<String, dynamic>.from(data);
    }

    return CourseDashboard.fromJson(instructorJson);
  }
}

class CourseDashboard {
  CourseDashboard({
    required this.pipeline,
    required this.production,
    required this.offers,
    required this.sessions,
    required this.insights,
    this.liveClassrooms,
  });

  factory CourseDashboard.fromJson(Map<String, dynamic> json) {
    final coursesSection = json['courses'] is Map<String, dynamic>
        ? Map<String, dynamic>.from(json['courses'] as Map)
        : json;
    final pricingSection = json['pricing'] is Map<String, dynamic>
        ? Map<String, dynamic>.from(json['pricing'] as Map)
        : <String, dynamic>{};
    final liveClassroomsJson = json['liveClassrooms'] is Map
        ? Map<String, dynamic>.from(json['liveClassrooms'] as Map)
        : null;

    final pipeline = <CoursePipelineEntry>[];
    final production = <CourseProductionTask>[];
    final offers = <CourseOffer>[];
    final sessions = <CourseSession>[];
    final insights = <String>[];

    final rawPipeline = coursesSection['pipeline'];
    if (rawPipeline is List) {
      for (final item in rawPipeline) {
        if (item is Map<String, dynamic>) {
          pipeline.add(CoursePipelineEntry.fromJson(item));
        }
      }
    }
    final rawProduction = coursesSection['production'];
    if (rawProduction is List) {
      for (final item in rawProduction) {
        if (item is Map<String, dynamic>) {
          production.add(CourseProductionTask.fromJson(item));
        }
      }
    }

    final rawOffers = pricingSection['offers'];
    if (rawOffers is List) {
      for (final item in rawOffers) {
        if (item is Map<String, dynamic>) {
          offers.add(CourseOffer.fromJson(item));
        }
      }
    }
    final rawSessions = pricingSection['sessions'];
    if (rawSessions is List) {
      for (final item in rawSessions) {
        if (item is Map<String, dynamic>) {
          sessions.add(CourseSession.fromJson(item));
        }
      }
    }
    final rawInsights = pricingSection['insights'];
    if (rawInsights is List) {
      for (final item in rawInsights) {
        if (item is String && item.trim().isNotEmpty) {
          insights.add(item.trim());
        }
      }
    }

    return CourseDashboard(
      pipeline: pipeline,
      production: production,
      offers: offers,
      sessions: sessions,
      insights: insights,
      liveClassrooms:
          liveClassroomsJson == null ? null : LiveClassroomsSnapshot.fromJson(liveClassroomsJson),
    );
  }

  final List<CoursePipelineEntry> pipeline;
  final List<CourseProductionTask> production;
  final List<CourseOffer> offers;
  final List<CourseSession> sessions;
  final List<String> insights;
  final LiveClassroomsSnapshot? liveClassrooms;

  bool get hasSignals =>
      pipeline.isNotEmpty ||
      production.isNotEmpty ||
      offers.isNotEmpty ||
      sessions.isNotEmpty ||
      insights.isNotEmpty ||
      (liveClassrooms != null &&
          (liveClassrooms!.metrics.isNotEmpty ||
              liveClassrooms!.active.isNotEmpty ||
              liveClassrooms!.upcoming.isNotEmpty ||
              liveClassrooms!.completed.isNotEmpty ||
              liveClassrooms!.readiness.isNotEmpty));
}

class CoursePipelineEntry {
  CoursePipelineEntry({
    required this.id,
    required this.name,
    required this.stage,
    required this.startDate,
    required this.learners,
  });

  factory CoursePipelineEntry.fromJson(Map<String, dynamic> json) {
    return CoursePipelineEntry(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Course').toString(),
      stage: (json['stage'] ?? 'Stage').toString(),
      startDate: (json['startDate'] ?? 'TBD').toString(),
      learners: (json['learners'] ?? '0 learners').toString(),
    );
  }

  final String id;
  final String name;
  final String stage;
  final String startDate;
  final String learners;
}

class CourseProductionTask {
  CourseProductionTask({
    required this.id,
    required this.asset,
    required this.owner,
    required this.status,
    required this.type,
  });

  factory CourseProductionTask.fromJson(Map<String, dynamic> json) {
    return CourseProductionTask(
      id: (json['id'] ?? '').toString(),
      asset: (json['asset'] ?? 'Asset').toString(),
      owner: (json['owner'] ?? 'Owner').toString(),
      status: (json['status'] ?? 'Scheduled').toString(),
      type: (json['type'] ?? 'Task').toString(),
    );
  }

  final String id;
  final String asset;
  final String owner;
  final String status;
  final String type;
}

class CourseOffer {
  CourseOffer({
    required this.id,
    required this.name,
    required this.price,
    required this.status,
    required this.conversion,
    required this.learners,
  });

  factory CourseOffer.fromJson(Map<String, dynamic> json) {
    return CourseOffer(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Offer').toString(),
      price: (json['price'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      conversion: (json['conversion'] ?? '').toString(),
      learners: (json['learners'] ?? '').toString(),
    );
  }

  final String id;
  final String name;
  final String price;
  final String status;
  final String conversion;
  final String learners;
}

class CourseSession {
  CourseSession({
    required this.id,
    required this.name,
    required this.date,
    required this.price,
    required this.status,
    required this.seats,
  });

  factory CourseSession.fromJson(Map<String, dynamic> json) {
    return CourseSession(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Session').toString(),
      date: (json['date'] ?? 'Scheduled').toString(),
      price: (json['price'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      seats: (json['seats'] ?? '').toString(),
    );
  }

  final String id;
  final String name;
  final String date;
  final String price;
  final String status;
  final String seats;
}
