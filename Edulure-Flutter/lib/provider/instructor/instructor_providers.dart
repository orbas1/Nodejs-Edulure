import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/instructor_service.dart';
import '../../services/scheduling_service.dart';

final instructorQuickActionsServiceProvider = Provider<InstructorQuickActionsService>((ref) {
  final service = InstructorQuickActionsService();
  unawaited(service.ensureReady());
  ref.onDispose(() {
    unawaited(service.dispose());
  });
  return service;
});

final instructorQuickActionsStreamProvider = StreamProvider<List<InstructorQuickAction>>((ref) {
  final service = ref.watch(instructorQuickActionsServiceProvider);
  return service.watchActions();
});

final instructorSchedulingServiceProvider = Provider<InstructorSchedulingService>((ref) {
  return InstructorSchedulingService();
});
