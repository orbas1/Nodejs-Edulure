import 'package:flutter/foundation.dart';

import 'instructor_service.dart';

@immutable
class InstructorScheduleSlot {
  const InstructorScheduleSlot({
    required this.start,
    required this.end,
    required this.label,
  });

  final DateTime start;
  final DateTime end;
  final String label;
}

class InstructorSchedulingService {
  InstructorSchedulingService({DateTime Function()? clock}) : _clock = clock ?? DateTime.now;

  final DateTime Function() _clock;

  Duration get slotLength => const Duration(minutes: 30);

  List<InstructorScheduleSlot> generateSlots({
    required List<InstructorQuickAction> actions,
    int maxSlots = 3,
  }) {
    if (actions.isEmpty) {
      return const <InstructorScheduleSlot>[];
    }
    final pending = actions
        .where((action) => action.status != InstructorQuickActionStatus.completed)
        .toList()
      ..sort((a, b) {
        final dueA = a.dueAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        final dueB = b.dueAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        if (dueA != dueB) {
          return dueA.compareTo(dueB);
        }
        return a.createdAt.compareTo(b.createdAt);
      });
    if (pending.isEmpty) {
      return const <InstructorScheduleSlot>[];
    }
    var start = _alignToQuarterHour(_clock());
    final slots = <InstructorScheduleSlot>[];
    for (final action in pending.take(maxSlots)) {
      final end = start.add(slotLength);
      slots.add(
        InstructorScheduleSlot(
          start: start,
          end: end,
          label: action.title,
        ),
      );
      start = end.add(const Duration(minutes: 5));
    }
    return slots;
  }

  String describeWorkload(List<InstructorQuickAction> actions) {
    if (actions.isEmpty) {
      return 'No outstanding actions for today.';
    }
    final pending = actions.where((action) => action.status != InstructorQuickActionStatus.completed).length;
    final failed = actions.where((action) => action.status == InstructorQuickActionStatus.failed).length;
    return '$pending actions pending • $failed require follow-up';
  }

  DateTime _alignToQuarterHour(DateTime value) {
    final minute = value.minute;
    final remainder = minute % 15;
    if (remainder == 0) {
      return value;
    }
    final delta = 15 - remainder;
    return DateTime(value.year, value.month, value.day, value.hour, minute + delta);
  }
}
