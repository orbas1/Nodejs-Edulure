import 'dart:io';

import 'package:dio/dio.dart';
import 'package:edulure_mobile/core/provider_transition/provider_transition_models.dart';
import 'package:edulure_mobile/core/provider_transition/provider_transition_repository.dart';
import 'package:edulure_mobile/services/provider_transition_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late ProviderTransitionRepository repository;
  late _FakeProviderTransitionService service;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('provider_transition_repo_test');
    Hive.init(tempDir.path);
    service = _FakeProviderTransitionService();
    repository = ProviderTransitionRepository(service);
  });

  tearDown(() async {
    if (Hive.isBoxOpen('provider_transition_announcements')) {
      final box = Hive.box('provider_transition_announcements');
      await box.clear();
      await box.close();
    }
    try {
      await Hive.deleteBoxFromDisk('provider_transition_announcements');
    } catch (_) {
      // Ignore when the box was never created.
    }
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  Future<void> _pumpMicrotasks() async {
    await pumpEventQueue(times: 3);
  }

  test('loadAnnouncements caches responses until ttl expires', () async {
    final initial = await repository.loadAnnouncements();

    expect(service.listCalls, 1);
    expect(initial.offlineFallback, isFalse);
    expect(initial.announcements, isNotEmpty);
    expect(initial.announcements.first.offlineSource, isFalse);

    final cached = await repository.loadAnnouncements();
    expect(service.listCalls, 1, reason: 'Cache should satisfy subsequent reads within ttl');
    expect(cached.offlineFallback, isFalse);

    final box = Hive.box('provider_transition_announcements');
    final cache = Map<String, dynamic>.from(box.get('announcements.bundle') as Map);
    final staleTimestamp = DateTime.now().toUtc().subtract(const Duration(hours: 5)).toIso8601String();
    cache['fetchedAt'] = staleTimestamp;
    cache['announcements'] = (cache['announcements'] as List)
        .map((entry) {
          final map = Map<String, dynamic>.from(entry as Map);
          map['fetchedAt'] = staleTimestamp;
          return map;
        })
        .toList();
    await box.put('announcements.bundle', cache);

    final refreshed = await repository.loadAnnouncements();
    expect(service.listCalls, 2, reason: 'Expired cache should trigger new network request');
    expect(refreshed.offlineFallback, isFalse);
    expect(refreshed.announcements.first.offlineSource, isFalse);
  });

  test('loadAnnouncements provides offline fallback when refresh fails', () async {
    await repository.loadAnnouncements();
    service.shouldFailList = true;

    final fallback = await repository.loadAnnouncements(forceRefresh: true);
    expect(service.listCalls, 2);
    expect(fallback.offlineFallback, isTrue);
    expect(fallback.announcements, isNotEmpty);
    expect(fallback.announcements.first.offlineSource, isTrue);
  });

  test('loadAnnouncements rethrows when no cache is available', () async {
    service.shouldFailList = true;
    expect(
      () => repository.loadAnnouncements(forceRefresh: true),
      throwsA(isA<ProviderTransitionApiException>()),
    );
    expect(service.listCalls, 1);
  });

  test('fetchAnnouncementDetail caches successful responses', () async {
    final detail = await repository.fetchAnnouncementDetail('transition-plan');
    expect(detail, isNotNull);
    expect(service.detailCalls, 1);
    expect(detail!.offlineSource, isFalse);

    final cached = await repository.fetchAnnouncementDetail('transition-plan');
    expect(service.detailCalls, 1, reason: 'Cached detail should satisfy subsequent requests within ttl');
    expect(cached, isNotNull);
    expect(cached!.offlineSource, isFalse);
  });

  test('fetchAnnouncementDetail falls back to cached detail on failure', () async {
    await repository.fetchAnnouncementDetail('transition-plan');

    final box = Hive.box('provider_transition_announcements');
    final cache = Map<String, dynamic>.from(box.get('announcement:transition-plan') as Map);
    final staleTimestamp = DateTime.now().toUtc().subtract(const Duration(hours: 5)).toIso8601String();
    cache['fetchedAt'] = staleTimestamp;
    await box.put('announcement:transition-plan', cache);

    service.shouldFailDetail = true;

    final fallback = await repository.fetchAnnouncementDetail('transition-plan', forceRefresh: true);
    expect(service.detailCalls, 2);
    expect(fallback, isNotNull);
    expect(fallback!.offlineSource, isTrue);
  });

  test('fetchAnnouncementDetail falls back to list cache when detail cache missing', () async {
    await repository.loadAnnouncements();
    final box = Hive.box('provider_transition_announcements');
    await box.delete('announcement:transition-plan');

    service.shouldFailDetail = true;

    final fallback = await repository.fetchAnnouncementDetail('transition-plan');
    expect(service.detailCalls, 1);
    expect(fallback, isNotNull);
    expect(fallback!.offlineSource, isTrue);
  });

  test('fetchAnnouncementDetail rethrows when no cache exists', () async {
    service.shouldFailDetail = true;
    expect(
      () => repository.fetchAnnouncementDetail('transition-plan'),
      throwsA(isA<ProviderTransitionApiException>()),
    );
    expect(service.detailCalls, 1);
  });

  test('acknowledge submits payload and refreshes caches', () async {
    await repository.loadAnnouncements();
    final request = ProviderTransitionAcknowledgementRequest(
      organisationName: 'Edulure Academy',
      contactName: 'Alex Rivers',
      contactEmail: 'alex@edulure.test',
      ackMethod: 'portal',
      providerReference: 'ref-42',
      followUpRequired: true,
      followUpNotes: 'Need onboarding call',
    );

    await repository.acknowledge('transition-plan', request);
    await _pumpMicrotasks();

    expect(service.acknowledgeCalls, 1);
    expect(service.lastAcknowledgedSlug, 'transition-plan');
    expect(service.lastAcknowledgementPayload, request.toJson());
    expect(service.listCalls, 2, reason: 'Acknowledgement should force announcements refresh');
    expect(service.detailCalls, 1, reason: 'Detail refresh should occur asynchronously');
  });

  test('acknowledge rethrows service errors', () async {
    await repository.loadAnnouncements();
    service.shouldFailAcknowledge = true;

    final request = ProviderTransitionAcknowledgementRequest(
      organisationName: 'Edulure Academy',
      contactName: 'Alex Rivers',
      contactEmail: 'alex@edulure.test',
    );

    expect(
      () => repository.acknowledge('transition-plan', request),
      throwsA(isA<ProviderTransitionApiException>()),
    );
    await _pumpMicrotasks();
    expect(service.listCalls, 1, reason: 'Failed acknowledgement should not trigger refresh');
  });

  test('recordStatus submits payload and refreshes caches', () async {
    await repository.loadAnnouncements();

    await repository.recordStatus(
      'transition-plan',
      statusCode: 'completed',
      providerReference: 'ref-99',
      notes: 'Migration wrapped up',
    );
    await _pumpMicrotasks();

    expect(service.recordStatusCalls, 1);
    expect(service.lastRecordedSlug, 'transition-plan');
    expect(service.lastRecordStatusPayload, {
      'statusCode': 'completed',
      'providerReference': 'ref-99',
      'notes': 'Migration wrapped up',
    });
    expect(service.listCalls, 2, reason: 'Status update should force announcements refresh');
    expect(service.detailCalls, 1, reason: 'Detail refresh should occur asynchronously');
  });

  test('recordStatus rethrows service errors', () async {
    await repository.loadAnnouncements();
    service.shouldFailRecordStatus = true;

    expect(
      () => repository.recordStatus('transition-plan', statusCode: 'blocked'),
      throwsA(isA<ProviderTransitionApiException>()),
    );
    await _pumpMicrotasks();
    expect(service.listCalls, 1, reason: 'Failed status update should not trigger refresh');
  });
}

class _FakeProviderTransitionService extends ProviderTransitionService {
  _FakeProviderTransitionService()
      : super(Dio());

  bool shouldFailList = false;
  bool shouldFailDetail = false;
  bool shouldFailAcknowledge = false;
  bool shouldFailRecordStatus = false;

  int listCalls = 0;
  int detailCalls = 0;
  int acknowledgeCalls = 0;
  int recordStatusCalls = 0;

  String? lastAcknowledgedSlug;
  Map<String, dynamic>? lastAcknowledgementPayload;
  String? lastRecordedSlug;
  Map<String, dynamic>? lastRecordStatusPayload;

  final Map<String, Map<String, dynamic>> _detailPayloads = {
    'transition-plan': _announcementPayload(slug: 'transition-plan'),
  };

  List<Map<String, dynamic>> listResponse = [
    _announcementPayload(slug: 'transition-plan'),
  ];

  @override
  Future<List<Map<String, dynamic>>> listAnnouncements({bool includeDetails = true}) async {
    listCalls += 1;
    if (shouldFailList) {
      throw ProviderTransitionApiException('Unable to load announcements');
    }
    return listResponse;
  }

  @override
  Future<Map<String, dynamic>> getAnnouncementDetail(String slug) async {
    detailCalls += 1;
    if (shouldFailDetail) {
      throw ProviderTransitionApiException('Unable to load announcement detail');
    }
    final payload = _detailPayloads[slug];
    if (payload == null) {
      throw ProviderTransitionApiException('Announcement detail not found');
    }
    return payload;
  }

  @override
  Future<void> acknowledge(String slug, Map<String, dynamic> payload) async {
    acknowledgeCalls += 1;
    lastAcknowledgedSlug = slug;
    lastAcknowledgementPayload = Map<String, dynamic>.from(payload);
    if (shouldFailAcknowledge) {
      throw ProviderTransitionApiException('Unable to acknowledge announcement');
    }
  }

  @override
  Future<void> recordStatus(String slug, Map<String, dynamic> payload) async {
    recordStatusCalls += 1;
    lastRecordedSlug = slug;
    lastRecordStatusPayload = Map<String, dynamic>.from(payload);
    if (shouldFailRecordStatus) {
      throw ProviderTransitionApiException('Unable to record status');
    }
  }
}

Map<String, dynamic> _announcementPayload({required String slug}) {
  final now = DateTime.now().toUtc().toIso8601String();
  return {
    'announcement': {
      'id': 101,
      'slug': slug,
      'title': 'Transition Update',
      'summary': 'Platform updates in progress',
      'bodyMarkdown': 'Full details about the migration.',
      'status': 'published',
      'effectiveFrom': now,
      'ackRequired': true,
    },
    'timeline': [
      {
        'id': 201,
        'occursOn': now,
        'headline': 'Migration window',
        'detailsMarkdown': 'Downtime scheduled for midnight.',
      },
    ],
    'resources': [
      {
        'id': 301,
        'label': 'Migration Guide',
        'url': 'https://docs.edulure.test/migration',
        'type': 'link',
        'locale': 'en-US',
        'sortOrder': 1,
      },
    ],
    'acknowledgements': {
      'total': 5,
    },
    'latestStatus': {
      'id': 401,
      'statusCode': 'in-progress',
      'providerReference': 'ref-77',
      'notes': 'Migration underway',
      'recordedAt': now,
    },
    'recentStatusUpdates': [
      {
        'id': 401,
        'statusCode': 'in-progress',
        'providerReference': 'ref-77',
        'notes': 'Migration underway',
        'recordedAt': now,
      },
    ],
  };
}
