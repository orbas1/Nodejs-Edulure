import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:edulure_mobile/provider/commerce/commerce_payments_controller.dart';
import 'package:edulure_mobile/provider/commerce/tutor_booking_controller.dart';
import 'package:edulure_mobile/provider/learning/learning_store.dart';
import 'package:edulure_mobile/services/commerce_models.dart';

import 'test_util/fake_commerce_persistence.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeCommercePersistence persistence;
  late ProviderContainer container;
  late TutorBookingController controller;

  setUp(() async {
    persistence = FakeCommercePersistence();
    container = ProviderContainer(overrides: [
      commercePersistenceProvider.overrideWithValue(persistence),
    ]);
    addTearDown(container.dispose);

    await container.read(tutorStoreProvider.notifier).ready;
    await container.read(commercePaymentsControllerProvider.notifier).bootstrap();

    controller = container.read(tutorBookingControllerProvider.notifier);
    await controller.bootstrap();
  });

  test('tutor booking lifecycle transitions update state and persistence', () async {
    final state = container.read(tutorBookingControllerProvider);
    final pending = state.pendingRequests.first;

    controller.assignTutor(requestId: pending.id, tutorId: container.read(tutorStoreProvider).first.id);
    controller.confirmRequest(
      requestId: pending.id,
      scheduledAt: DateTime.now().add(const Duration(days: 1)),
      meetingUrl: 'https://meet.example.com/demo',
    );
    controller.completeSession(pending.id);

    final updated = container.read(tutorBookingControllerProvider);
    expect(updated.completedSessions.any((session) => session.id == pending.id), isTrue);
    expect(persistence.tutorSnapshot?.requests.any((request) => request.status == TutorBookingStatus.completed), isTrue);
    expect(updated.monthlyRevenue, greaterThanOrEqualTo(0));
  });

  test('cancelling requests preserves audit notes and syncs persistence', () async {
    final state = container.read(tutorBookingControllerProvider);
    final intake = state.pendingRequests.first;

    controller.cancelRequest(intake.id, notes: 'Learner requested a reschedule.');

    final updated = container.read(tutorBookingControllerProvider);
    final canceled = updated.requests.firstWhere((request) => request.id == intake.id);
    expect(canceled.status, TutorBookingStatus.canceled);
    expect(canceled.notes, contains('reschedule'));
    expect(
      persistence.tutorSnapshot?.requests.any((request) => request.id == intake.id && request.status == TutorBookingStatus.canceled),
      isTrue,
    );
  });

  test('package updates persist inventory adjustments and clean deletions', () async {
    final state = container.read(tutorBookingControllerProvider);
    final package = state.packages.first;

    controller.upsertPackage(package.copyWith(price: package.price + 150));

    final remainingPackageId = container.read(tutorBookingControllerProvider).packages.last.id;
    controller.deletePackage(remainingPackageId);

    final updated = container.read(tutorBookingControllerProvider);
    final updatedPackage = updated.packages.firstWhere((item) => item.id == package.id);
    expect(updatedPackage.price, package.price + 150);
    expect(updated.packages.any((item) => item.id == remainingPackageId), isFalse);
    expect(
      persistence.tutorSnapshot?.packages.any((item) => item.id == package.id && item.price == package.price + 150),
      isTrue,
    );
    expect(updated.forecastedRevenue, greaterThanOrEqualTo(0));
  });
}
