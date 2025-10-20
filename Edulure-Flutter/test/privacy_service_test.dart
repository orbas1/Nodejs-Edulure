import 'dart:io';

import 'package:edulure_mobile/services/privacy_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart' as hive;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('privacy_service_test');
    hive.Hive.init(tempDir.path);
  });

  tearDown(() async {
    await hive.Hive.deleteFromDisk();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  test('persists preference toggles and retrieves stored values', () async {
    final service = PrivacyService(boxName: 'privacy_prefs_test');
    await service.ensureReady();

    final defaults = await service.loadSettings();
    expect(defaults.analyticsOptIn, isTrue);
    expect(defaults.marketingOptIn, isFalse);

    const updated = PrivacySettings(
      analyticsOptIn: false,
      marketingOptIn: true,
      betaOptIn: true,
    );
    await service.saveSettings(updated);

    final persisted = await service.loadSettings();
    expect(persisted.analyticsOptIn, isFalse);
    expect(persisted.marketingOptIn, isTrue);
    expect(persisted.betaOptIn, isTrue);
  });

  test('records request lifecycle and tracks status transitions', () async {
    final service = PrivacyService(boxName: 'privacy_requests_test');
    await service.ensureReady();

    final request = service.buildRequest(
      type: PrivacyRequestType.erasure,
      details: 'Please delete my learner profile and anonymize historical analytics.',
      preferredContact: 'privacy@example.com',
      attachments: const ['https://example.com/ticket/12345'],
    );

    await service.logRequest(request);

    var stored = await service.loadRequests();
    expect(stored, hasLength(1));
    expect(stored.first.status, PrivacyRequestStatus.pending);
    expect(stored.first.attachments.single, contains('ticket/12345'));

    await service.updateRequestStatus(request.id, PrivacyRequestStatus.inProgress);
    stored = await service.loadRequests();
    expect(stored.first.status, PrivacyRequestStatus.inProgress);
    expect(stored.first.resolvedAt, isNull);

    await service.updateRequestStatus(request.id, PrivacyRequestStatus.completed);
    stored = await service.loadRequests();
    expect(stored.first.status, PrivacyRequestStatus.completed);
    expect(stored.first.resolvedAt, isNotNull);
  });
}
