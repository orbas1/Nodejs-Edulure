import 'dart:io';

import 'package:edulure_mobile/screens/home_screen.dart';
import 'package:edulure_mobile/services/dsr_client.dart';
import 'package:edulure_mobile/services/privacy_preferences.dart';
import 'package:edulure_mobile/services/session_manager.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

class _RecordingDsrClient extends DsrClient {
  Map<String, String>? lastPayload;

  @override
  Future<void> submitRequest({required String type, required String description}) async {
    lastPayload = {'type': type, 'description': description};
  }
}

Future<void> _openSessionBoxes() async {
  await Hive.openBox('session');
  await Hive.openBox('content_assets');
  await Hive.openBox('content_downloads');
  await Hive.openBox('ebook_progress');
  await Hive.openBox('ebook_reader_settings');
  await Hive.openBox('dashboard_snapshots');
  await Hive.openBox('privacy_preferences');
}

Future<void> _closeSessionBoxes() async {
  for (final name in [
    'session',
    'content_assets',
    'content_downloads',
    'ebook_progress',
    'ebook_reader_settings',
    'dashboard_snapshots',
    'privacy_preferences'
  ]) {
    if (Hive.isBoxOpen(name)) {
      final box = Hive.box(name);
      await box.clear();
      await box.close();
      await Hive.deleteBoxFromDisk(name);
    }
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory tempDir;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('home-screen-test');
    Hive.init(tempDir.path);
    await _openSessionBoxes();
  });

  tearDown(() async {
    await _closeSessionBoxes();
    await tempDir.delete(recursive: true);
  });

  Map<String, dynamic> _sessionFixture() => {
        'user': {
          'id': 42,
          'firstName': 'Alex',
          'lastName': 'Morgan',
          'role': 'admin',
          'email': 'alex@example.com'
        },
        'verification': {
          'status': 'verified'
        }
      };

  testWidgets('shows consent dialog and records acceptance', (tester) async {
    var consentRecorded = false;
    final dsrClient = _RecordingDsrClient();

    await tester.pumpWidget(
      MaterialApp(
        home: AuthenticatedHomeView(
          session: _sessionFixture(),
          dsrClient: dsrClient,
          requiresConsent: () async => true,
          recordConsentAccepted: ({DateTime? grantedAt}) async {
            consentRecorded = true;
            expect(grantedAt, isNull);
          },
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Review updated privacy policy'), findsOneWidget);

    await tester.tap(find.text('Accept & continue'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(consentRecorded, isTrue);
    expect(find.text('Review updated privacy policy'), findsNothing);
    expect(find.text('Thank you — your privacy preferences are up to date.'), findsOneWidget);
  });

  testWidgets('submits DSR requests when users request exports', (tester) async {
    final dsrClient = _RecordingDsrClient();

    await tester.pumpWidget(
      MaterialApp(
        home: AuthenticatedHomeView(
          session: _sessionFixture(),
          dsrClient: dsrClient,
          requiresConsent: () async => true,
          recordConsentAccepted: ({DateTime? grantedAt}) async {},
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.text('Request data export'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(dsrClient.lastPayload, {'type': 'access', 'description': 'Requested export from mobile privacy workflow'});
    expect(find.text('Your data access request has been filed. Our trust team will follow up shortly.'), findsOneWidget);
  });
}
