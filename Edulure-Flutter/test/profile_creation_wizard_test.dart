import 'package:edulure_mobile/services/content_service.dart';
import 'package:edulure_mobile/widgets/material_metadata_sheet.dart';
import 'package:edulure_mobile/widgets/profile/profile_creation_wizard.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ProfileCreationWizard', () {
    testWidgets('validates inputs and submits sanitized payload', (tester) async {
      ProfileFormData? submitted;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProfileCreationWizard(
              onSubmit: (data) async {
                submitted = data;
              },
            ),
          ),
        ),
      );

      await tester.enterText(find.byKey(const ValueKey('wizard_display_name')), '  Alex Morgan  ');
      await tester.enterText(find.byKey(const ValueKey('wizard_headline')), 'Growth Operator');
      await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
      await tester.pump();

      await tester.enterText(find.byKey(const ValueKey('wizard_email')), 'invalid-email');
      await tester.enterText(find.byKey(const ValueKey('wizard_phone')), '123');
      await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
      await tester.pump();

      expect(find.text('Enter a valid email address'), findsOneWidget);
      expect(find.text('Enter a valid phone number'), findsOneWidget);
      expect(find.text('Share your working location or timezone'), findsOneWidget);

      await tester.enterText(find.byKey(const ValueKey('wizard_email')), 'alex@example.com');
      await tester.enterText(find.byKey(const ValueKey('wizard_phone')), '+1 (555) 0100');
      await tester.enterText(find.byKey(const ValueKey('wizard_location')), 'Remote • GMT');
      await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
      await tester.pump();

      await tester.enterText(find.byKey(const ValueKey('wizard_avatar')), 'http://example.com/avatar.png');
      await tester.enterText(find.byKey(const ValueKey('wizard_banner')), 'https://example.com/banner.png');
      await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
      await tester.pump();

      expect(find.text('Enter a valid https:// link'), findsOneWidget);

      await tester.enterText(
        find.byKey(const ValueKey('wizard_avatar')),
        'https://127.0.0.1/avatar.png',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
      await tester.pump();
      expect(find.text('Link must target a public host.'), findsOneWidget);

      await tester.enterText(find.byKey(const ValueKey('wizard_avatar')), 'https://example.com/avatar.png');
      await tester.enterText(find.byKey(const ValueKey('wizard_video')), 'https://example.com/intro.mp4');
      await tester.enterText(find.byKey(const ValueKey('wizard_calendar')), 'https://example.com/calendar');
      await tester.enterText(find.byKey(const ValueKey('wizard_portfolio')), 'https://example.com');

      await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'Create profile'));
      await tester.pump();

      expect(
        find.text('Add at least one skill highlight to help learners understand your strengths.'),
        findsOneWidget,
      );

      await tester.tap(find.widgetWithText(TextButton, 'Back'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const ValueKey('wizard_skill_input')), 'growth strategy');
      await tester.tap(find.byKey(const ValueKey('wizard_skill_add')));
      await tester.pump();

      await tester.tap(find.widgetWithText(ActionChip, 'Growth Strategy'));
      await tester.pump(const Duration(milliseconds: 250));

      expect(find.text('Skill already added.'), findsOneWidget);

      await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
      await tester.pumpAndSettle();

      expect(find.text('Growth Strategy'), findsWidgets);

      await tester.tap(find.widgetWithText(FilledButton, 'Create profile'));
      await tester.pumpAndSettle();

      expect(submitted, isNotNull);
      expect(submitted!.displayName, 'Alex Morgan');
      expect(submitted!.headline, 'Growth Operator');
      expect(submitted!.email, 'alex@example.com');
      expect(submitted!.avatarUrl, 'https://example.com/avatar.png');
      expect(submitted!.bannerUrl, 'https://example.com/banner.png');
      expect(submitted!.calendarUrl, 'https://example.com/calendar');
      expect(submitted!.portfolioUrl, 'https://example.com');
      expect(submitted!.skills, equals(['Growth Strategy']));
      expect(submitted!.videoIntroUrl, 'https://example.com/intro.mp4');
    });
  });

  group('MaterialMetadataSheet', () {
    testWidgets('enforces accessible metadata before saving', (tester) async {
      final asset = ContentAsset(
        publicId: 'asset-1',
        originalFilename: 'operators-playbook.pdf',
        type: 'pdf',
        status: 'active',
        updatedAt: null,
        metadata: const {'custom': {}},
        visibility: 'workspace',
      );
      final service = _RecordingContentService();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MaterialMetadataSheet(
              asset: asset,
              service: service,
            ),
          ),
        ),
      );

      await tester.enterText(
        find.byKey(const ValueKey('material_cover_url')),
        'https://cdn.example.com/cover.png',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Save material profile'));
      await tester.pump();

      expect(
        find.text('Add alternative text for the cover image to ensure accessibility.'),
        findsOneWidget,
      );

      await tester.enterText(
        find.byKey(const ValueKey('material_cover_alt')),
        'Learners reviewing cohort insights',
      );
      await tester.enterText(
        find.byKey(const ValueKey('material_cta_label')),
        'Book now',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Save material profile'));
      await tester.pump();

      expect(find.text('Provide a call-to-action link when setting a label.'), findsOneWidget);

      await tester.enterText(
        find.byKey(const ValueKey('material_cta_url')),
        'https://localhost/cta',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Save material profile'));
      await tester.pump();

      expect(find.text('Call to action URL must point to a public host.'), findsOneWidget);

      await tester.enterText(
        find.byKey(const ValueKey('material_cta_url')),
        'https://cal.com/edulure/demo',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Save material profile'));
      await tester.pumpAndSettle();

      expect(service.updateCalls, 1);
      expect(service.lastUpdate?.callToActionLabel, 'Book now');
      expect(service.lastUpdate?.callToActionUrl, 'https://cal.com/edulure/demo');
    });
  });
}

class _RecordingContentService extends ContentService {
  int updateCalls = 0;
  MaterialMetadataUpdate? lastUpdate;

  @override
  Future<ContentAsset> updateMaterialMetadata(
    String assetId,
    MaterialMetadataUpdate metadata,
  ) async {
    updateCalls += 1;
    lastUpdate = metadata;
    return ContentAsset(
      publicId: assetId,
      originalFilename: 'operators-playbook.pdf',
      type: 'pdf',
      status: 'active',
      updatedAt: DateTime.now().toIso8601String(),
      metadata: const {'custom': {}},
      visibility: metadata.visibility,
    );
  }
}
