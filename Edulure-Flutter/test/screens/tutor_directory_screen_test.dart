import 'package:edulure_mobile/provider/learning/learning_models.dart';
import 'package:edulure_mobile/provider/learning/learning_store.dart';
import 'package:edulure_mobile/screens/tutor_directory_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_util/fake_learning_persistence.dart';

void main() {
  group('TutorDirectoryScreen', () {
    final tutors = [
      Tutor(
        id: 'tutor-1',
        name: 'Taylor Adams',
        headline: 'Growth mentor',
        expertise: const ['Growth'],
        bio: 'Coaches GTM teams on predictable playbooks.',
        languages: const ['English'],
        avatarUrl: '',
        availability: const [TutorAvailability(weekday: 'Monday', startTime: '09:00', endTime: '11:00')],
      ),
      Tutor(
        id: 'tutor-2',
        name: 'Leila Haddad',
        headline: 'Community architect',
        expertise: const ['Community'],
        bio: 'Designs cohort rituals for accelerators.',
        languages: const ['English'],
        avatarUrl: 'https://example.com/avatar.jpg',
        availability: const [TutorAvailability(weekday: 'Tuesday', startTime: '12:00', endTime: '14:00')],
      ),
    ];

    Future<void> _pumpDirectory(WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            learningPersistenceProvider.overrideWithValue(FakeLearningPersistence(tutors: tutors)),
          ],
          child: const MaterialApp(home: TutorDirectoryScreen()),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('shows fallback initials for tutors without avatars and filters list', (tester) async {
      await _pumpDirectory(tester);

      expect(find.text('Taylor Adams'), findsOneWidget);
      expect(find.text('TA'), findsWidgets);

      await tester.enterText(
        find.bySemanticsLabel('Search tutors by name, bio, or language'),
        'community',
      );
      await tester.pumpAndSettle();

      expect(find.text('Leila Haddad'), findsOneWidget);
      expect(find.text('Taylor Adams'), findsNothing);
    });

    testWidgets('validates tutor form when saving without required fields', (tester) async {
      await _pumpDirectory(tester);

      await tester.tap(find.text('Add tutor'));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'Add tutor'));
      await tester.pump();

      expect(find.text('Name required'), findsOneWidget);
      expect(find.text('Headline required'), findsOneWidget);
      expect(find.text('Bio required'), findsOneWidget);
    });
  });
}
