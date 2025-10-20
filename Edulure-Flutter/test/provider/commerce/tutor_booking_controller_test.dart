import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:edulure_mobile/provider/commerce/tutor_booking_controller.dart';
import 'package:edulure_mobile/provider/commerce/commerce_payments_controller.dart';
import 'package:edulure_mobile/provider/learning/learning_models.dart';
import 'package:edulure_mobile/provider/learning/learning_store.dart';
import 'package:edulure_mobile/services/commerce_models.dart';
import 'package:edulure_mobile/services/commerce_persistence_service.dart';

class _MockCommercePersistence extends Mock implements CommercePersistence {}

class _TestPaymentsController extends CommercePaymentsController {
  _TestPaymentsController()
      : super(
          persistence: _NoopCommercePersistence(),
        );

  bool warmed = false;

  @override
  Future<void> bootstrap() async {
    warmed = true;
  }
}

class _NoopCommercePersistence implements CommercePersistence {
  @override
  Future<void> reset() async {}

  @override
  Future<CourseCheckoutSnapshot?> loadCourseCheckout() async => null;

  @override
  Future<List<CommercePaymentMethod>?> loadPaymentMethods() async => null;

  @override
  Future<CommunitySubscriptionSnapshot?> loadCommunitySubscriptions() async => null;

  @override
  Future<TutorBookingSnapshot?> loadTutorBookings() async => null;

  @override
  Future<void> saveCourseCheckout(CourseCheckoutSnapshot snapshot) async {}

  @override
  Future<void> savePaymentMethods(List<CommercePaymentMethod> methods) async {}

  @override
  Future<void> saveCommunitySubscriptions(CommunitySubscriptionSnapshot snapshot) async {}

  @override
  Future<void> saveTutorBookings(TutorBookingSnapshot snapshot) async {}
}

void main() {
  late _MockCommercePersistence persistence;
  late _TestPaymentsController paymentsController;
  late TutorBookingController controller;
  late List<Tutor> tutors;

  setUp(() {
    persistence = _MockCommercePersistence();
    paymentsController = _TestPaymentsController();
    when(persistence.saveTutorBookings).thenAnswer((_) async {});
    tutors = <Tutor>[
      Tutor(
        id: 'tutor-1',
        name: 'Jamie',
        role: 'Coach',
        avatarUrl: null,
        headline: 'Ops mentor',
        skills: const ['Ops'],
        rating: 4.8,
        bio: 'Bio',
        timezone: 'UTC',
        languages: const ['en'],
      ),
    ];
  });

  Reader _reader() {
    return <T>(ProviderBase<T> provider) {
      if (provider == commercePaymentsControllerProvider.notifier) {
        return paymentsController as T;
      }
      if (provider == tutorStoreProvider) {
        return tutors as T;
      }
      throw UnsupportedError('Unsupported provider $provider');
    };
  }

  TutorBookingSnapshot _snapshot() {
    final request = TutorBookingRequest(
      id: 'req-1',
      learnerName: 'Jamie',
      learnerEmail: 'jamie@example.com',
      topic: 'Ops sprint',
      requestedAt: DateTime.now(),
      durationMinutes: 60,
      rate: 240,
      currency: 'USD',
      status: TutorBookingStatus.pending,
    );
    final pkg = TutorPackage(
      id: 'pkg-1',
      name: 'Ops Pod',
      description: 'Package',
      tutorId: 'tutor-1',
      sessionCount: 4,
      sessionDurationMinutes: 60,
      price: 900,
      currency: 'USD',
      active: true,
    );
    return TutorBookingSnapshot(
      requests: <TutorBookingRequest>[request],
      packages: <TutorPackage>[pkg],
    );
  }

  test('bootstrap hydrates snapshot from persistence', () async {
    when(persistence.loadTutorBookings).thenAnswer((_) async => _snapshot());

    controller = TutorBookingController(
      persistence: persistence,
      read: _reader(),
    );

    await controller.bootstrap();

    expect(paymentsController.warmed, isTrue);
    expect(controller.state.requests, isNotEmpty);
    expect(controller.state.packages, isNotEmpty);
  });

  test('assignTutor updates request and persists', () async {
    when(persistence.loadTutorBookings).thenAnswer((_) async => _snapshot());
    controller = TutorBookingController(
      persistence: persistence,
      read: _reader(),
    );
    await controller.bootstrap();

    controller.assignTutor(requestId: 'req-1', tutorId: 'tutor-1');

    final request = controller.state.requests.first;
    expect(request.tutorId, 'tutor-1');
    verify(() => persistence.saveTutorBookings(any())).called(greaterThan(0));
  });

  test('completeSession marks request as completed', () async {
    when(persistence.loadTutorBookings).thenAnswer((_) async => _snapshot());
    controller = TutorBookingController(
      persistence: persistence,
      read: _reader(),
    );
    await controller.bootstrap();

    controller.markInProgress('req-1');
    controller.completeSession('req-1');

    final request = controller.state.requests.first;
    expect(request.status, TutorBookingStatus.completed);
  });
}
