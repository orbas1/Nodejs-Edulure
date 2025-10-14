import 'package:dio/dio.dart';

import 'api_config.dart';
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

    final payload = response.data;
    if (payload is! Map<String, dynamic>) {
      throw Exception('Unexpected dashboard payload');
    }

    final data = payload['data'];
    if (data is! Map<String, dynamic>) {
      throw Exception('Malformed dashboard response');
    }

    final dashboards = data['dashboards'];
    if (dashboards is! Map<String, dynamic>) {
      throw Exception('Dashboards not available for this account');
    }

    final instructor = dashboards['instructor'];
    if (instructor is! Map<String, dynamic>) {
      throw Exception('Instructor workspace is not configured for this account');
    }

    return CourseDashboard.fromJson(instructor);
  }
}

class CourseDashboard {
  CourseDashboard({
    required this.metrics,
    required this.revenueMix,
    required this.pipeline,
    required this.production,
    required this.offers,
    required this.sessions,
    required this.insights,
  });

  factory CourseDashboard.fromJson(Map<String, dynamic> json) {
    final metrics = <DashboardMetric>[];
    final revenueMix = <RevenueSlice>[];
    final pipeline = <CoursePipelineEntry>[];
    final production = <CourseProductionTask>[];
    final offers = <CourseOffer>[];
    final sessions = <CourseSession>[];
    final insights = <String>[];

    final rawMetrics = json['metrics'];
    if (rawMetrics is List) {
      for (final entry in rawMetrics) {
        if (entry is Map<String, dynamic>) {
          metrics.add(DashboardMetric.fromJson(entry));
        }
      }
    }

    final analytics = json['analytics'];
    if (analytics is Map<String, dynamic>) {
      final rawRevenue = analytics['revenueStreams'];
      if (rawRevenue is List) {
        for (final entry in rawRevenue) {
          if (entry is Map<String, dynamic>) {
            revenueMix.add(RevenueSlice.fromJson(entry));
          }
        }
      }
    }

    final courses = json['courses'];
    if (courses is Map<String, dynamic>) {
      final rawPipeline = courses['pipeline'];
      if (rawPipeline is List) {
        for (final item in rawPipeline) {
          if (item is Map<String, dynamic>) {
            pipeline.add(CoursePipelineEntry.fromJson(item));
          }
        }
      }

      final rawProduction = courses['production'];
      if (rawProduction is List) {
        for (final item in rawProduction) {
          if (item is Map<String, dynamic>) {
            production.add(CourseProductionTask.fromJson(item));
          }
        }
      }
    }

    final pricing = json['pricing'];
    if (pricing is Map<String, dynamic>) {
      final rawOffers = pricing['offers'];
      if (rawOffers is List) {
        for (final item in rawOffers) {
          if (item is Map<String, dynamic>) {
            offers.add(CourseOffer.fromJson(item));
          }
        }
      }

      final rawSessions = pricing['sessions'];
      if (rawSessions is List) {
        for (final item in rawSessions) {
          if (item is Map<String, dynamic>) {
            sessions.add(CourseSession.fromJson(item));
          }
        }
      }

      final rawInsights = pricing['insights'];
      if (rawInsights is List) {
        for (final insight in rawInsights) {
          if (insight is String && insight.trim().isNotEmpty) {
            insights.add(insight.trim());
          }
        }
      }
    }

    return CourseDashboard(
      metrics: metrics,
      revenueMix: revenueMix,
      pipeline: pipeline,
      production: production,
      offers: offers,
      sessions: sessions,
      insights: insights,
    );
  }

  final List<DashboardMetric> metrics;
  final List<RevenueSlice> revenueMix;
  final List<CoursePipelineEntry> pipeline;
  final List<CourseProductionTask> production;
  final List<CourseOffer> offers;
  final List<CourseSession> sessions;
  final List<String> insights;

  bool get hasSignals =>
      metrics.isNotEmpty ||
      revenueMix.isNotEmpty ||
      pipeline.isNotEmpty ||
      production.isNotEmpty ||
      offers.isNotEmpty ||
      sessions.isNotEmpty ||
      insights.isNotEmpty;
}

class DashboardMetric {
  DashboardMetric({
    required this.label,
    required this.value,
    this.change,
    this.trend,
  });

  factory DashboardMetric.fromJson(Map<String, dynamic> json) {
    return DashboardMetric(
      label: (json['label'] ?? 'Metric').toString(),
      value: (json['value'] ?? '').toString(),
      change: json['change']?.toString(),
      trend: json['trend']?.toString(),
    );
  }

  final String label;
  final String value;
  final String? change;
  final String? trend;

  bool get isDownward => (trend ?? '').toLowerCase() == 'down';
}

class RevenueSlice {
  RevenueSlice({
    required this.name,
    required this.percent,
  });

  factory RevenueSlice.fromJson(Map<String, dynamic> json) {
    final value = json['percent'] ?? json['value'] ?? 0;
    final numeric = value is num ? value.toDouble() : double.tryParse(value.toString()) ?? 0;
    return RevenueSlice(
      name: (json['name'] ?? 'Stream').toString(),
      percent: numeric.clamp(0, 100),
    );
  }

  final String name;
  final double percent;

  String get formattedPercent => '${percent.toStringAsFixed(percent % 1 == 0 ? 0 : 1)}%';
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
