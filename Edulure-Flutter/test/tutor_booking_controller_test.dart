import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:edulure_mobile/provider/commerce/commerce_payments_controller.dart';
import 'package:edulure_mobile/provider/commerce/tutor_booking_controller.dart';
import 'package:edulure_mobile/provider/learning/learning_store.dart';
import 'package:edulure_mobile/services/commerce_models.dart';

import 'test_util/fake_commerce_persistence.dart';

void main() {
  test('tutor booking lifecycle transitions update state and persistence', () async {
    final persistence = FakeCommercePersistence();
    final container = ProviderContainer(overrides: [
      commercePersistenceProvider.overrideWithValue(persistence),
    ]);
    addTearDown(container.dispose);

    await container.read(tutorStoreProvider.notifier).ready;
    await container.read(commercePaymentsControllerProvider.notifier).bootstrap();

    final controller = container.read(tutorBookingControllerProvider.notifier);
    await controller.bootstrap();

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
  });
}
