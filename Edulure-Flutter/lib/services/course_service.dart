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
    final data = response.data['data'];
    if (data is! Map<String, dynamic>) {
      throw Exception('Unexpected dashboard payload');
    }
    return CourseDashboard.fromJson(data);
  }
}

class CourseDashboard {
  CourseDashboard({
    required this.pipeline,
    required this.production,
    required this.offers,
    required this.sessions,
    required this.insights,
    this.ads,
  });

  factory CourseDashboard.fromJson(Map<String, dynamic> json) {
    final courses = json['courses'];
    final pricing = json['pricing'];
    final adsJson = json['ads'];

    final pipeline = <CoursePipelineEntry>[];
    final production = <CourseProductionTask>[];
    final offers = <CourseOffer>[];
    final sessions = <CourseSession>[];
    final insights = <String>[];
    AdsWorkspace? ads;

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
        for (final item in rawInsights) {
          if (item is String && item.trim().isNotEmpty) {
            insights.add(item.trim());
          }
        }
      }
    }

    if (adsJson is Map<String, dynamic>) {
      ads = AdsWorkspace.fromJson(adsJson);
    }

    return CourseDashboard(
      pipeline: pipeline,
      production: production,
      offers: offers,
      sessions: sessions,
      insights: insights,
      ads: ads,
    );
  }

  final List<CoursePipelineEntry> pipeline;
  final List<CourseProductionTask> production;
  final List<CourseOffer> offers;
  final List<CourseSession> sessions;
  final List<String> insights;
  final AdsWorkspace? ads;

  bool get hasSignals =>
      pipeline.isNotEmpty ||
      production.isNotEmpty ||
      offers.isNotEmpty ||
      sessions.isNotEmpty ||
      insights.isNotEmpty ||
      (ads?.hasSignals ?? false);
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

class AdsWorkspace {
  AdsWorkspace({
    required this.summary,
    required this.active,
    required this.placements,
    required this.experiments,
    required this.targeting,
    required this.tags,
  });

  factory AdsWorkspace.fromJson(Map<String, dynamic> json) {
    final summaryJson = json['summary'];
    final activeJson = json['active'];
    final placementsJson = json['placements'];
    final experimentsJson = json['experiments'];
    final targetingJson = json['targeting'];
    final tagsJson = json['tags'];

    final summary = summaryJson is Map<String, dynamic>
        ? AdsSummary.fromJson(summaryJson)
        : AdsSummary.empty();

    final active = <AdsCampaign>[];
    if (activeJson is List) {
      for (final item in activeJson) {
        if (item is Map<String, dynamic>) {
          active.add(AdsCampaign.fromJson(item));
        }
      }
    }

    final placements = <AdsPlacement>[];
    if (placementsJson is List) {
      for (final item in placementsJson) {
        if (item is Map<String, dynamic>) {
          placements.add(AdsPlacement.fromJson(item));
        }
      }
    }

    final experiments = <AdsExperiment>[];
    if (experimentsJson is List) {
      for (final item in experimentsJson) {
        if (item is Map<String, dynamic>) {
          experiments.add(AdsExperiment.fromJson(item));
        }
      }
    }

    final targeting = targetingJson is Map<String, dynamic>
        ? AdsTargeting.fromJson(targetingJson)
        : AdsTargeting.empty();

    final tags = <AdsTag>[];
    if (tagsJson is List) {
      for (final item in tagsJson) {
        if (item is Map<String, dynamic>) {
          tags.add(AdsTag.fromJson(item));
        }
      }
    }

    return AdsWorkspace(
      summary: summary,
      active: active,
      placements: placements,
      experiments: experiments,
      targeting: targeting,
      tags: tags,
    );
  }

  final AdsSummary summary;
  final List<AdsCampaign> active;
  final List<AdsPlacement> placements;
  final List<AdsExperiment> experiments;
  final AdsTargeting targeting;
  final List<AdsTag> tags;

  bool get hasSignals =>
      summary.activeCampaigns > 0 ||
      active.isNotEmpty ||
      placements.isNotEmpty ||
      experiments.isNotEmpty ||
      tags.isNotEmpty;
}

class AdsSummary {
  AdsSummary({
    required this.activeCampaigns,
    required this.totalSpendFormatted,
    required this.averageCtr,
    required this.averageCpc,
    required this.averageCpa,
    required this.roas,
    required this.totalImpressions,
    required this.totalClicks,
    required this.totalConversions,
    required this.lastSyncedAt,
    required this.lastSyncedLabel,
  });

  factory AdsSummary.fromJson(Map<String, dynamic> json) {
    final totalSpend = json['totalSpend'];
    String formattedSpend = '';
    if (totalSpend is Map<String, dynamic>) {
      formattedSpend = (totalSpend['formatted'] ?? '').toString();
    } else if (totalSpend != null) {
      formattedSpend = totalSpend.toString();
    }
    return AdsSummary(
      activeCampaigns: (json['activeCampaigns'] as num?)?.toInt() ?? 0,
      totalSpendFormatted: formattedSpend.isEmpty ? '—' : formattedSpend,
      averageCtr: (json['averageCtr'] ?? '—').toString(),
      averageCpc: (json['averageCpc'] ?? '—').toString(),
      averageCpa: (json['averageCpa'] ?? '—').toString(),
      roas: (json['roas'] ?? '—').toString(),
      totalImpressions: (json['totalImpressions'] as num?)?.toInt() ?? 0,
      totalClicks: (json['totalClicks'] as num?)?.toInt() ?? 0,
      totalConversions: (json['totalConversions'] as num?)?.toInt() ?? 0,
      lastSyncedAt: json['lastSyncedAt']?.toString(),
      lastSyncedLabel: json['lastSyncedLabel']?.toString(),
    );
  }

  factory AdsSummary.empty() => AdsSummary(
        activeCampaigns: 0,
        totalSpendFormatted: '—',
        averageCtr: '—',
        averageCpc: '—',
        averageCpa: '—',
        roas: '—',
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        lastSyncedAt: null,
        lastSyncedLabel: null,
      );

  final int activeCampaigns;
  final String totalSpendFormatted;
  final String averageCtr;
  final String averageCpc;
  final String averageCpa;
  final String roas;
  final int totalImpressions;
  final int totalClicks;
  final int totalConversions;
  final String? lastSyncedAt;
  final String? lastSyncedLabel;

  String get syncedLabel => lastSyncedLabel ?? lastSyncedAt ?? 'Not yet synced';
}

class AdsCampaign {
  AdsCampaign({
    required this.id,
    required this.name,
    required this.objective,
    required this.status,
    required this.spendLabel,
    required this.dailyBudgetLabel,
    required this.ctr,
    required this.cpc,
    required this.cpa,
    required this.metrics,
    required this.placement,
    required this.targeting,
    required this.creative,
  });

  factory AdsCampaign.fromJson(Map<String, dynamic> json) {
    final spend = json['spend'];
    final dailyBudget = json['dailyBudget'];
    final metricsJson = json['metrics'];
    final placementJson = json['placement'];
    final targetingJson = json['targeting'];
    final creativeJson = json['creative'];

    return AdsCampaign(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      objective: (json['objective'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      spendLabel: spend is Map<String, dynamic> ? (spend['label'] ?? spend['formatted'] ?? '').toString() : (spend ?? '').toString(),
      dailyBudgetLabel: dailyBudget is Map<String, dynamic>
          ? (dailyBudget['label'] ?? dailyBudget['formatted'] ?? '').toString()
          : (dailyBudget ?? '').toString(),
      ctr: (json['ctr'] ?? '—').toString(),
      cpc: (json['cpc'] ?? '—').toString(),
      cpa: (json['cpa'] ?? '—').toString(),
      metrics: metricsJson is Map<String, dynamic>
          ? AdsCampaignMetrics.fromJson(metricsJson)
          : AdsCampaignMetrics.empty(),
      placement: placementJson is Map<String, dynamic>
          ? AdsCampaignPlacement.fromJson(placementJson)
          : AdsCampaignPlacement.empty(),
      targeting: targetingJson is Map<String, dynamic>
          ? AdsCampaignTargeting.fromJson(targetingJson)
          : AdsCampaignTargeting.empty(),
      creative: creativeJson is Map<String, dynamic>
          ? AdsCreative.fromJson(creativeJson)
          : AdsCreative.empty(),
    );
  }

  final String id;
  final String name;
  final String objective;
  final String status;
  final String spendLabel;
  final String dailyBudgetLabel;
  final String ctr;
  final String cpc;
  final String cpa;
  final AdsCampaignMetrics metrics;
  final AdsCampaignPlacement placement;
  final AdsCampaignTargeting targeting;
  final AdsCreative creative;
}

class AdsCampaignMetrics {
  AdsCampaignMetrics({
    required this.impressions,
    required this.clicks,
    required this.conversions,
    required this.spendFormatted,
    required this.revenueFormatted,
    required this.roas,
    required this.lastSyncedAt,
    required this.lastSyncedLabel,
  });

  factory AdsCampaignMetrics.fromJson(Map<String, dynamic> json) => AdsCampaignMetrics(
        impressions: (json['impressions'] as num?)?.toInt() ?? 0,
        clicks: (json['clicks'] as num?)?.toInt() ?? 0,
        conversions: (json['conversions'] as num?)?.toInt() ?? 0,
        spendFormatted: (json['spendFormatted'] ?? '—').toString(),
        revenueFormatted: (json['revenueFormatted'] ?? '—').toString(),
        roas: (json['roas'] ?? '—').toString(),
        lastSyncedAt: json['lastSyncedAt']?.toString(),
        lastSyncedLabel: json['lastSyncedLabel']?.toString(),
      );

  factory AdsCampaignMetrics.empty() => AdsCampaignMetrics(
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spendFormatted: '—',
        revenueFormatted: '—',
        roas: '—',
        lastSyncedAt: null,
        lastSyncedLabel: null,
      );

  final int impressions;
  final int clicks;
  final int conversions;
  final String spendFormatted;
  final String revenueFormatted;
  final String roas;
  final String? lastSyncedAt;
  final String? lastSyncedLabel;

  String get syncedLabel => lastSyncedLabel ?? lastSyncedAt ?? 'Not yet synced';
}

class AdsCampaignPlacement {
  AdsCampaignPlacement({
    required this.surface,
    required this.slot,
    required this.tags,
    required this.scheduleLabel,
  });

  factory AdsCampaignPlacement.fromJson(Map<String, dynamic> json) => AdsCampaignPlacement(
        surface: (json['surface'] ?? '').toString(),
        slot: (json['slot'] ?? '').toString(),
        tags: (json['tags'] as List?)?.map((tag) => tag.toString()).toList() ?? <String>[],
        scheduleLabel: (json['scheduleLabel'] ?? '').toString(),
      );

  factory AdsCampaignPlacement.empty() => AdsCampaignPlacement(
        surface: '',
        slot: '',
        tags: const [],
        scheduleLabel: '',
      );

  final String surface;
  final String slot;
  final List<String> tags;
  final String scheduleLabel;
}

class AdsCampaignTargeting {
  AdsCampaignTargeting({
    required this.keywords,
    required this.audiences,
    required this.locations,
    required this.languages,
  });

  factory AdsCampaignTargeting.fromJson(Map<String, dynamic> json) => AdsCampaignTargeting(
        keywords: (json['keywords'] as List?)?.map((value) => value.toString()).toList() ?? <String>[],
        audiences: (json['audiences'] as List?)?.map((value) => value.toString()).toList() ?? <String>[],
        locations: (json['locations'] as List?)?.map((value) => value.toString()).toList() ?? <String>[],
        languages: (json['languages'] as List?)?.map((value) => value.toString()).toList() ?? <String>[],
      );

  factory AdsCampaignTargeting.empty() => AdsCampaignTargeting(
        keywords: const [],
        audiences: const [],
        locations: const [],
        languages: const [],
      );

  final List<String> keywords;
  final List<String> audiences;
  final List<String> locations;
  final List<String> languages;
}

class AdsCreative {
  AdsCreative({
    required this.headline,
    required this.description,
    required this.url,
  });

  factory AdsCreative.fromJson(Map<String, dynamic> json) => AdsCreative(
        headline: (json['headline'] ?? '').toString(),
        description: (json['description'] ?? '').toString(),
        url: (json['url'] ?? '').toString(),
      );

  factory AdsCreative.empty() => AdsCreative(
        headline: '',
        description: '',
        url: '',
      );

  final String headline;
  final String description;
  final String url;
}

class AdsPlacement {
  AdsPlacement({
    required this.id,
    required this.name,
    required this.surface,
    required this.slot,
    required this.status,
    required this.budgetLabel,
    required this.optimisation,
    required this.scheduleLabel,
    required this.tags,
  });

  factory AdsPlacement.fromJson(Map<String, dynamic> json) => AdsPlacement(
        id: (json['id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        surface: (json['surface'] ?? '').toString(),
        slot: (json['slot'] ?? '').toString(),
        status: (json['status'] ?? '').toString(),
        budgetLabel: (json['budgetLabel'] ?? '').toString(),
        optimisation: (json['optimisation'] ?? '').toString(),
        scheduleLabel: (json['scheduleLabel'] ?? '').toString(),
        tags: (json['tags'] as List?)?.map((value) => value.toString()).toList() ?? <String>[],
      );

  final String id;
  final String name;
  final String surface;
  final String slot;
  final String status;
  final String budgetLabel;
  final String optimisation;
  final String scheduleLabel;
  final List<String> tags;
}

class AdsExperiment {
  AdsExperiment({
    required this.id,
    required this.name,
    required this.status,
    required this.hypothesis,
    required this.conversionsDeltaLabel,
    required this.lastObservedAt,
    required this.lastObservedLabel,
    required this.baselineLabel,
  });

  factory AdsExperiment.fromJson(Map<String, dynamic> json) => AdsExperiment(
        id: (json['id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        status: (json['status'] ?? '').toString(),
        hypothesis: (json['hypothesis'] ?? '').toString(),
        conversionsDeltaLabel: (json['conversionsDeltaLabel'] ?? '').toString(),
        lastObservedAt: json['lastObservedAt']?.toString(),
        lastObservedLabel: json['lastObservedLabel']?.toString(),
        baselineLabel: json['baselineLabel']?.toString(),
      );

  final String id;
  final String name;
  final String status;
  final String hypothesis;
  final String conversionsDeltaLabel;
  final String? lastObservedAt;
  final String? lastObservedLabel;
  final String? baselineLabel;

  String get observedLabel => lastObservedLabel ?? lastObservedAt ?? 'Not observed';
}

class AdsTargeting {
  AdsTargeting({
    required this.keywords,
    required this.audiences,
    required this.locations,
    required this.languages,
    required this.summary,
  });

  factory AdsTargeting.fromJson(Map<String, dynamic> json) => AdsTargeting(
        keywords: (json['keywords'] as List?)?.map((value) => value.toString()).toList() ?? <String>[],
        audiences: (json['audiences'] as List?)?.map((value) => value.toString()).toList() ?? <String>[],
        locations: (json['locations'] as List?)?.map((value) => value.toString()).toList() ?? <String>[],
        languages: (json['languages'] as List?)?.map((value) => value.toString()).toList() ?? <String>[],
        summary: (json['summary'] ?? '').toString(),
      );

  factory AdsTargeting.empty() => AdsTargeting(
        keywords: const [],
        audiences: const [],
        locations: const [],
        languages: const [],
        summary: '',
      );

  final List<String> keywords;
  final List<String> audiences;
  final List<String> locations;
  final List<String> languages;
  final String summary;
}

class AdsTag {
  AdsTag({
    required this.category,
    required this.label,
  });

  factory AdsTag.fromJson(Map<String, dynamic> json) => AdsTag(
        category: (json['category'] ?? '').toString(),
        label: (json['label'] ?? '').toString(),
      );

  final String category;
  final String label;
}
