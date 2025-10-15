import 'dart:io';

import 'package:edulure_mobile/services/privacy_preferences.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory tempDir;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('privacy-preferences-test');
    Hive.init(tempDir.path);
    await Hive.openBox('privacy_preferences');
  });

  tearDown(() async {
    final box = Hive.box('privacy_preferences');
    await box.clear();
    await box.close();
    await Hive.deleteBoxFromDisk('privacy_preferences');
    await tempDir.delete(recursive: true);
  });

  test('requires consent until the current policy version is accepted', () async {
    expect(await PrivacyPreferenceService.requiresConsent(), isTrue);

    final grantedAt = DateTime.utc(2025, 2, 1, 12, 0, 0);
    await PrivacyPreferenceService.recordConsentAccepted(grantedAt: grantedAt);

    expect(await PrivacyPreferenceService.requiresConsent(), isFalse);
    final current = PrivacyPreferenceService.currentConsent();
    expect(current?['version'], kCurrentPolicyVersion);
    expect(DateTime.parse(current?['grantedAt'] as String), equals(grantedAt));
  });

  test('reset removes stored consent metadata', () async {
    await PrivacyPreferenceService.recordConsentAccepted();
    expect(await PrivacyPreferenceService.requiresConsent(), isFalse);

    await PrivacyPreferenceService.reset();

    expect(await PrivacyPreferenceService.requiresConsent(), isTrue);
    expect(PrivacyPreferenceService.currentConsent(), isNull);
  });
}
