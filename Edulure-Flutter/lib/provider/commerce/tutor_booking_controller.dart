import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../provider/commerce/commerce_payments_controller.dart';
import '../../provider/learning/learning_store.dart';
import '../../services/commerce_models.dart';
import '../../services/commerce_persistence_service.dart';

final tutorBookingControllerProvider =
    StateNotifierProvider<TutorBookingController, TutorBookingState>((ref) {
  final persistence = ref.watch(commercePersistenceProvider);
  return TutorBookingController(persistence: persistence, read: ref.read);
});

class TutorBookingState {
  const TutorBookingState({
    this.loading = false,
    this.error,
    this.requests = const <TutorBookingRequest>[],
    this.packages = const <TutorPackage>[],
    this.bootstrapped = false,
  });

  final bool loading;
  final String? error;
  final List<TutorBookingRequest> requests;
  final List<TutorPackage> packages;
  final bool bootstrapped;

  TutorBookingState copyWith({
    bool? loading,
    String? error,
    List<TutorBookingRequest>? requests,
    List<TutorPackage>? packages,
    bool? bootstrapped,
  }) {
    return TutorBookingState(
      loading: loading ?? this.loading,
      error: error,
      requests: requests ?? this.requests,
      packages: packages ?? this.packages,
      bootstrapped: bootstrapped ?? this.bootstrapped,
    );
  }

  List<TutorBookingRequest> get pendingRequests =>
      requests.where((request) => request.status == TutorBookingStatus.pending || request.status == TutorBookingStatus.intake).toList();

  List<TutorBookingRequest> get awaitingPayments =>
      requests.where((request) => request.status == TutorBookingStatus.awaitingPayment).toList();

  List<TutorBookingRequest> get confirmedSessions =>
      requests.where((request) => request.status == TutorBookingStatus.confirmed || request.status == TutorBookingStatus.inProgress).toList();

  List<TutorBookingRequest> get completedSessions =>
      requests.where((request) => request.status == TutorBookingStatus.completed).toList();

  double get forecastedRevenue =>
      requests.fold<double>(0, (sum, request) => sum + (request.status != TutorBookingStatus.canceled ? request.totalValue : 0));

  double get monthlyRevenue {
    final now = DateTime.now();
    return requests.where((request) {
      final scheduled = request.scheduledAt ?? request.requestedAt;
      return scheduled.year == now.year && scheduled.month == now.month;
    }).fold<double>(0, (sum, request) => sum + request.totalValue);
  }
}

class TutorBookingController extends StateNotifier<TutorBookingState> {
  TutorBookingController({
    required CommercePersistence persistence,
    required Reader read,
  })  : _persistence = persistence,
        _read = read,
        super(const TutorBookingState());

  final CommercePersistence _persistence;
  final Reader _read;
  bool _bootstrapping = false;

  Future<void> bootstrap() async {
    if (state.bootstrapped || _bootstrapping) {
      return;
    }
    _bootstrapping = true;
    state = state.copyWith(loading: true, error: null);
    try {
      await _read(commercePaymentsControllerProvider.notifier).bootstrap();
      final snapshot = await _persistence.loadTutorBookings();
      if (snapshot != null) {
        state = state.copyWith(
          requests: snapshot.requests,
          packages: snapshot.packages,
          bootstrapped: true,
        );
      } else {
        final seeded = _seedData();
        state = state.copyWith(
          requests: seeded.requests,
          packages: seeded.packages,
          bootstrapped: true,
        );
        await _persist();
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to bootstrap tutor bookings: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString(), bootstrapped: true);
    } finally {
      state = state.copyWith(loading: false);
      _bootstrapping = false;
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final snapshot = await _persistence.loadTutorBookings();
      if (snapshot != null) {
        state = state.copyWith(
          requests: snapshot.requests,
          packages: snapshot.packages,
          bootstrapped: true,
        );
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to refresh tutor bookings: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString());
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  void createRequest(TutorBookingRequest request) {
    state = state.copyWith(requests: [...state.requests, request]);
    _persist();
  }

  void updateRequest(TutorBookingRequest request) {
    final updated = [
      for (final item in state.requests)
        if (item.id == request.id) request else item,
    ];
    state = state.copyWith(requests: updated);
    _persist();
  }

  void deleteRequest(String requestId) {
    state = state.copyWith(
      requests: state.requests.where((request) => request.id != requestId).toList(growable: false),
    );
    _persist();
  }

  void assignTutor({required String requestId, required String tutorId, String? intakeUrl}) {
    final requests = [
      for (final request in state.requests)
        if (request.id == requestId)
          request.copyWith(
            tutorId: tutorId,
            status: request.status == TutorBookingStatus.intake
                ? TutorBookingStatus.pending
                : request.status,
            intakeUrl: intakeUrl ?? request.intakeUrl,
          )
        else
          request,
    ];
    state = state.copyWith(requests: requests);
    _persist();
  }

  void confirmRequest({
    required String requestId,
    required DateTime scheduledAt,
    required String meetingUrl,
    String? paymentMethodId,
  }) {
    final requests = [
      for (final request in state.requests)
        if (request.id == requestId)
          request.copyWith(
            status: TutorBookingStatus.confirmed,
            scheduledAt: scheduledAt,
            meetingUrl: meetingUrl,
            paymentMethodId: paymentMethodId ?? request.paymentMethodId,
          )
        else
          request,
    ];
    state = state.copyWith(requests: requests);
    _persist();
  }

  void markInProgress(String requestId) {
    final requests = [
      for (final request in state.requests)
        if (request.id == requestId)
          request.copyWith(status: TutorBookingStatus.inProgress)
        else
          request,
    ];
    state = state.copyWith(requests: requests);
    _persist();
  }

  void completeSession(String requestId) {
    final requests = [
      for (final request in state.requests)
        if (request.id == requestId)
          request.copyWith(status: TutorBookingStatus.completed)
        else
          request,
    ];
    state = state.copyWith(requests: requests);
    _persist();
  }

  void cancelRequest(String requestId, {String? notes}) {
    final requests = [
      for (final request in state.requests)
        if (request.id == requestId)
          request.copyWith(status: TutorBookingStatus.canceled, notes: notes ?? request.notes)
        else
          request,
    ];
    state = state.copyWith(requests: requests);
    _persist();
  }

  void upsertPackage(TutorPackage package) {
    final exists = state.packages.any((item) => item.id == package.id);
    final packages = exists
        ? [
            for (final item in state.packages)
              if (item.id == package.id) package else item,
          ]
        : [...state.packages, package];
    state = state.copyWith(packages: packages);
    _persist();
  }

  void deletePackage(String packageId) {
    state = state.copyWith(
      packages: state.packages.where((package) => package.id != packageId).toList(growable: false),
    );
    _persist();
  }

  TutorBookingSnapshot _seedData() {
    final tutors = _read(tutorStoreProvider);
    final tutorId = tutors.isNotEmpty ? tutors.first.id : 'tutor-1';
    final now = DateTime.now();
    final requests = <TutorBookingRequest>[
      TutorBookingRequest(
        id: generateCommerceId('booking'),
        learnerName: 'Jamie Chen',
        learnerEmail: 'jamie.chen@example.com',
        topic: 'RevOps pipeline automation playbook',
        requestedAt: now.subtract(const Duration(hours: 3)),
        durationMinutes: 60,
        rate: 240,
        currency: 'USD',
        status: TutorBookingStatus.awaitingPayment,
        tutorId: tutorId,
        notes: 'Needs async follow-up brief.',
        intakeUrl: 'https://forms.edulure.com/intake/revops',
      ),
      TutorBookingRequest(
        id: generateCommerceId('booking'),
        learnerName: 'Priya Patel',
        learnerEmail: 'priya.patel@example.com',
        topic: 'Enterprise onboarding workflow audit',
        requestedAt: now.subtract(const Duration(hours: 5)),
        durationMinutes: 90,
        rate: 260,
        currency: 'USD',
        status: TutorBookingStatus.confirmed,
        tutorId: tutorId,
        scheduledAt: now.add(const Duration(days: 2)),
        meetingUrl: 'https://meet.edulure.com/priya',
      ),
      TutorBookingRequest(
        id: generateCommerceId('booking'),
        learnerName: 'Malik Okafor',
        learnerEmail: 'malik.okafor@example.com',
        topic: 'Async coaching cadences',
        requestedAt: now.subtract(const Duration(days: 1)),
        durationMinutes: 60,
        rate: 220,
        currency: 'USD',
        status: TutorBookingStatus.intake,
      ),
    ];

    final packages = <TutorPackage>[
      TutorPackage(
        id: generateCommerceId('package'),
        name: 'RevOps Mentor Pod',
        description: '4 x 60-minute pod sessions + async coaching notes.',
        tutorId: tutorId,
        sessionCount: 4,
        sessionDurationMinutes: 60,
        price: 960,
        currency: 'USD',
        active: true,
      ),
      TutorPackage(
        id: generateCommerceId('package'),
        name: 'Async Coaching Intensive',
        description: '6 x 45-minute async-first coaching series.',
        tutorId: tutors.length > 1 ? tutors[1].id : tutorId,
        sessionCount: 6,
        sessionDurationMinutes: 45,
        price: 1050,
        currency: 'USD',
        active: true,
      ),
    ];

    return TutorBookingSnapshot(requests: requests, packages: packages);
  }

  Future<void> _persist() async {
    try {
      final snapshot = TutorBookingSnapshot(requests: state.requests, packages: state.packages);
      await _persistence.saveTutorBookings(snapshot);
    } catch (error, stackTrace) {
      debugPrint('Failed to persist tutor bookings: $error');
      debugPrint('$stackTrace');
    }
  }
}
