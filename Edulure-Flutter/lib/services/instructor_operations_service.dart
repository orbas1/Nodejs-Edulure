import 'dart:async';
import 'package:collection/collection.dart';

import '../provider/learning/learning_models.dart';
import '../services/commerce_models.dart';
import '../services/commerce_persistence_service.dart';
import 'learning_persistence_service.dart';

import 'course_service.dart';

class InstructorOperationsSnapshot {
  InstructorOperationsSnapshot({
    required this.actions,
    required this.conflicts,
    required this.pendingLogs,
    required this.conflictLogs,
    required this.generatedAt,
  });

  final List<InstructorQuickAction> actions;
  final List<InstructorSchedulingConflict> conflicts;
  final int pendingLogs;
  final int conflictLogs;
  final DateTime generatedAt;
}

class InstructorQuickAction {
  InstructorQuickAction({
    required this.id,
    required this.title,
    required this.description,
    required this.severity,
    required this.type,
    required this.ctaLabel,
  });

  final String id;
  final String title;
  final String description;
  final InstructorActionSeverity severity;
  final InstructorActionType type;
  final String ctaLabel;
}

enum InstructorActionSeverity { low, medium, high }

enum InstructorActionType { schedulingConflict, offlineSync, sessionFollowUp }

class InstructorSchedulingConflict {
  InstructorSchedulingConflict({
    required this.sessionTitle,
    required this.sessionStart,
    required this.sessionEnd,
    required this.bookingLearner,
    required this.bookingStart,
    required this.bookingEnd,
    this.tutorName,
  });

  final String sessionTitle;
  final DateTime sessionStart;
  final DateTime sessionEnd;
  final String bookingLearner;
  final DateTime bookingStart;
  final DateTime bookingEnd;
  final String? tutorName;
}

class InstructorOperationsService {
  InstructorOperationsService({
    LearningPersistence? learningPersistence,
    CommercePersistence? commercePersistence,
  })  : _learningPersistence = learningPersistence ?? LearningPersistenceService(),
        _commercePersistence = commercePersistence ?? CommercePersistenceService();

  final LearningPersistence _learningPersistence;
  final CommercePersistence _commercePersistence;

  Future<InstructorOperationsSnapshot> evaluate({CourseDashboard? dashboard}) async {
    final progressLogsFuture = _learningPersistence.loadProgressLogs();
    final sessionsFuture = _learningPersistence.loadLiveSessions();
    final tutorsFuture = _learningPersistence.loadTutors();
    final bookingsFuture = _commercePersistence.loadTutorBookings();

    final results = await Future.wait<dynamic>([
      progressLogsFuture,
      sessionsFuture,
      tutorsFuture,
      bookingsFuture,
    ]);

    final progressLogs = (results[0] as List<ModuleProgressLog>?) ?? const <ModuleProgressLog>[];
    final sessions = (results[1] as List<LiveSession>?) ?? const <LiveSession>[];
    final tutors = (results[2] as List<Tutor>?) ?? const <Tutor>[];
    final bookings = (results[3] as TutorBookingSnapshot?)?.requests ?? const <TutorBookingRequest>[];

    final tutorById = {for (final tutor in tutors) tutor.id: tutor};

    final conflicts = _detectConflicts(sessions, bookings, tutorById);
    final pendingLogs = progressLogs.where((log) => log.syncState == ProgressSyncState.pending).length;
    final conflictLogs = progressLogs.where((log) => log.syncState == ProgressSyncState.conflict).length;

    final actions = <InstructorQuickAction>[];

    if (conflicts.isNotEmpty) {
      final first = conflicts.first;
      actions.add(
        InstructorQuickAction(
          id: 'conflict-${first.sessionTitle}-${first.bookingLearner}',
          title: 'Resolve schedule conflict',
          description:
              'Session "${first.sessionTitle}" overlaps with ${first.bookingLearner}\'s tutoring slot. Coordinate a new time.',
          severity: InstructorActionSeverity.high,
          type: InstructorActionType.schedulingConflict,
          ctaLabel: 'Review conflicts',
        ),
      );
    }

    if (pendingLogs > 0 || conflictLogs > 0) {
      actions.add(
        InstructorQuickAction(
          id: 'sync-progress',
          title: 'Sync offline learner progress',
          description:
              '$pendingLogs update${pendingLogs == 1 ? '' : 's'} pending • $conflictLogs conflict${conflictLogs == 1 ? '' : 's'} awaiting resolution.',
          severity: InstructorActionSeverity.medium,
          type: InstructorActionType.offlineSync,
          ctaLabel: 'Open progress sync',
        ),
      );
    }

    if (dashboard != null) {
      final reviewSessions = dashboard.sessions
          .where((session) => session.status.toLowerCase().contains('await') || session.status.toLowerCase().contains('draft'))
          .toList();
      if (reviewSessions.isNotEmpty) {
        final session = reviewSessions.first;
        actions.add(
          InstructorQuickAction(
            id: 'session-${session.id}',
            title: 'Follow up on ${session.name}',
            description: 'Session status "${session.status}" needs attention. Confirm pricing ${session.price} and seats ${session.seats}.',
            severity: InstructorActionSeverity.medium,
            type: InstructorActionType.sessionFollowUp,
            ctaLabel: 'Review sessions',
          ),
        );
      }
    }

    return InstructorOperationsSnapshot(
      actions: actions,
      conflicts: conflicts,
      pendingLogs: pendingLogs,
      conflictLogs: conflictLogs,
      generatedAt: DateTime.now(),
    );
  }

  List<InstructorSchedulingConflict> _detectConflicts(
    List<LiveSession> sessions,
    List<TutorBookingRequest> bookings,
    Map<String, Tutor> tutorById,
  ) {
    final conflicts = <InstructorSchedulingConflict>[];
    for (final booking in bookings) {
      final scheduled = booking.scheduledAt;
      if (scheduled == null) {
        continue;
      }
      final bookingEnd = scheduled.add(Duration(minutes: booking.durationMinutes));
      for (final session in sessions) {
        final overlap = scheduled.isBefore(session.endTime) && bookingEnd.isAfter(session.startTime);
        if (overlap) {
          conflicts.add(
            InstructorSchedulingConflict(
              sessionTitle: session.title,
              sessionStart: session.startTime,
              sessionEnd: session.endTime,
              bookingLearner: booking.learnerName,
              bookingStart: scheduled,
              bookingEnd: bookingEnd,
              tutorName: booking.tutorId != null ? tutorById[booking.tutorId!]?.name : null,
            ),
          );
        }
      }
    }
    return conflicts.sorted((a, b) => a.sessionStart.compareTo(b.sessionStart));
  }
}
