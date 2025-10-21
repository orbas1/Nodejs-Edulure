import 'package:edulure_mobile/provider/commerce/tutor_booking_controller.dart';
import 'package:edulure_mobile/provider/learning/learning_models.dart';
import 'package:edulure_mobile/provider/learning/learning_store.dart';
import 'package:edulure_mobile/screens/tutor_booking_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_util/fake_commerce_persistence.dart';
import '../test_util/fake_learning_persistence.dart';

class _StubTutorBookingController extends TutorBookingController {
  _StubTutorBookingController(Reader read)
      : super(persistence: FakeCommercePersistence(), read: read) {
    state = const TutorBookingState(
      bootstrapped: true,
      error: 'Network timeout',
      requests: <TutorBookingRequest>[],
      packages: <TutorPackage>[],
    );
  }

  @override
  Future<void> bootstrap() async {}
}

void main() {
  group('TutorBookingScreen', () {
    final tutors = [
      Tutor(
        id: 'tutor-1',
        name: 'Taylor Adams',
        headline: 'Growth mentor',
        expertise: const ['Growth'],
        bio: 'Helps teams design repeatable GTM plays.',
        languages: const ['English'],
        avatarUrl: '',
        availability: const [TutorAvailability(weekday: 'Monday', startTime: '09:00', endTime: '11:00')],
      ),
    ];

    Future<void> _pumpScreen(WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            learningPersistenceProvider.overrideWithValue(FakeLearningPersistence(tutors: tutors)),
            tutorBookingControllerProvider.overrideWith((ref) => _StubTutorBookingController(ref.read)),
          ],
          child: const MaterialApp(home: TutorBookingScreen()),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('shows error banner when controller exposes an error', (tester) async {
      await _pumpScreen(tester);

      expect(find.text("We couldn't refresh bookings"), findsOneWidget);
      expect(find.text('Network timeout'), findsOneWidget);
    });

    testWidgets('prefills tutor when launching new request from route argument', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            learningPersistenceProvider.overrideWithValue(FakeLearningPersistence(tutors: tutors)),
            tutorBookingControllerProvider.overrideWith((ref) => _StubTutorBookingController(ref.read)),
          ],
          child: MaterialApp(
            routes: {
              '/': (_) => const SizedBox.shrink(),
              '/bookings': (_) => const TutorBookingScreen(initialTutorId: 'tutor-1'),
            },
            initialRoute: '/bookings',
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('New booking request'));
      await tester.pumpAndSettle();

      final mentorField = find.bySemanticsLabel('Preferred mentor');
      expect(mentorField, findsOneWidget);
      final dropdown = tester.widget<DropdownButtonFormField>(mentorField);
      expect((dropdown.value as Tutor).id, equals('tutor-1'));
    });
  });
}
