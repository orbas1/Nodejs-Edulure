import 'package:edulure_mobile/widgets/profile/profile_creation_wizard.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('profile creation wizard captures multi-step payload', (tester) async {
    ProfileFormData? submitted;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () async {
                  await showModalBottomSheet<bool>(
                    context: context,
                    isScrollControlled: true,
                    showDragHandle: true,
                    builder: (_) => ProfileCreationWizard(
                      onSubmit: (payload) async {
                        submitted = payload;
                      },
                    ),
                  );
                },
                child: const Text('Launch wizard'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Launch wizard'));
    await tester.pumpAndSettle();

    // Step 0 validation.
    await tester.tap(find.text('Continue'));
    await tester.pump();
    expect(find.text('Enter a display name'), findsOneWidget);

    await tester.enterText(find.byKey(const ValueKey('wizard_display_name')), 'Jordan Lee');
    await tester.enterText(find.byKey(const ValueKey('wizard_headline')), 'Learning Strategist');
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // Step 1 validation.
    await tester.tap(find.text('Continue'));
    await tester.pump();
    expect(find.text('Enter an email address'), findsOneWidget);

    await tester.enterText(find.byKey(const ValueKey('wizard_email')), 'jordan@example.com');
    await tester.enterText(find.byKey(const ValueKey('wizard_phone')), '+1 555 0100');
    await tester.enterText(find.byKey(const ValueKey('wizard_location')), 'Remote · PST');
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // Step 2 validation.
    await tester.tap(find.text('Continue'));
    await tester.pump();
    expect(find.text('Provide an avatar image URL'), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('wizard_avatar')),
      'https://example.com/avatar.png',
    );
    await tester.enterText(
      find.byKey(const ValueKey('wizard_banner')),
      'https://example.com/banner.png',
    );
    await tester.enterText(find.byKey(const ValueKey('wizard_skill_input')), 'Community Design');
    await tester.tap(find.byKey(const ValueKey('wizard_skill_add')));
    await tester.pump();
    expect(find.byKey(const ValueKey('wizard_skill_Community Design')), findsOneWidget);

    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // Review step shows summary information.
    expect(find.text('Jordan Lee'), findsWidgets);
    expect(find.textContaining('Learning Strategist'), findsWidgets);

    await tester.tap(find.text('Create profile'));
    await tester.pump();
    await tester.pumpAndSettle();

    expect(submitted, isNotNull);
    expect(submitted!.displayName, 'Jordan Lee');
    expect(submitted!.headline, 'Learning Strategist');
    expect(submitted!.email, 'jordan@example.com');
    expect(submitted!.skills, contains('Community Design'));
    expect(submitted!.avatarUrl, 'https://example.com/avatar.png');
    expect(submitted!.bannerUrl, 'https://example.com/banner.png');
  });
}
