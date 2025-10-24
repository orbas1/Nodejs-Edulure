import 'dart:async';
import 'dart:math';

enum LessonDownloadStatus { queued, running, completed, failed, cancelled }

class LessonDownloadTask {
  const LessonDownloadTask({
    required this.id,
    required this.courseId,
    required this.moduleId,
    required this.lessonId,
    required this.title,
    required this.status,
    required this.progress,
    required this.enqueuedAt,
    this.startedAt,
    this.completedAt,
    this.error,
  });

  final String id;
  final String courseId;
  final String moduleId;
  final String lessonId;
  final String title;
  final LessonDownloadStatus status;
  final int progress;
  final DateTime enqueuedAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final String? error;

  bool get isTerminal =>
      status == LessonDownloadStatus.completed ||
      status == LessonDownloadStatus.failed ||
      status == LessonDownloadStatus.cancelled;

  double get progressFraction => progress.clamp(0, 100) / 100;

  LessonDownloadTask copyWith({
    LessonDownloadStatus? status,
    int? progress,
    DateTime? startedAt,
    DateTime? completedAt,
    String? error = _sentinel,
  }) {
    return LessonDownloadTask(
      id: id,
      courseId: courseId,
      moduleId: moduleId,
      lessonId: lessonId,
      title: title,
      status: status ?? this.status,
      progress: progress ?? this.progress,
      enqueuedAt: enqueuedAt,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      error: error == _sentinel ? this.error : error,
    );
  }

  static const _sentinel = Object();
}

class LessonDownloadService {
  LessonDownloadService({Duration tickInterval = const Duration(milliseconds: 350)})
      : _tickInterval = tickInterval {
    _emit();
  }

  final Duration _tickInterval;
  final Map<String, _LessonDownloadController> _controllers = {};
  final StreamController<Map<String, LessonDownloadTask>> _streamController =
      StreamController<Map<String, LessonDownloadTask>>.broadcast();
  final Random _random = Random();

  Stream<Map<String, LessonDownloadTask>> get downloads => _streamController.stream;

  Map<String, LessonDownloadTask> get snapshot => {
        for (final entry in _controllers.entries) entry.key: entry.value.task,
      };

  LessonDownloadTask enqueue({
    required String courseId,
    required String moduleId,
    required String lessonId,
    required String title,
  }) {
    final key = _composeKey(courseId, moduleId, lessonId);
    final existing = _controllers[key];
    if (existing != null) {
      return existing.task;
    }

    final task = LessonDownloadTask(
      id: key,
      courseId: courseId,
      moduleId: moduleId,
      lessonId: lessonId,
      title: title,
      status: LessonDownloadStatus.queued,
      progress: 0,
      enqueuedAt: DateTime.now(),
    );

    late final _LessonDownloadController controller;
    controller = _LessonDownloadController(
      initialTask: task,
      tickInterval: _tickInterval,
      random: _random,
      onUpdate: (updated) {
        _controllers[key] = controller;
        _emit();
      },
      onTerminal: (updated) {
        _controllers[key] = controller;
        _emit();
        if (updated.isTerminal) {
          Future<void>.delayed(const Duration(seconds: 4), () {
            final current = _controllers[key];
            if (current == controller && controller.task.isTerminal) {
              _controllers.remove(key)?.dispose();
              _emit();
            }
          });
        }
      },
    );

    _controllers[key] = controller;
    _emit();
    controller.start();
    return controller.task;
  }

  bool cancel({
    required String courseId,
    required String moduleId,
    required String lessonId,
  }) {
    final key = _composeKey(courseId, moduleId, lessonId);
    final controller = _controllers[key];
    if (controller == null) {
      return false;
    }
    controller.cancel();
    return true;
  }

  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    _controllers.clear();
    _streamController.close();
  }

  void _emit() {
    if (_streamController.isClosed) {
      return;
    }
    _streamController.add(snapshot);
  }

  String _composeKey(String courseId, String moduleId, String lessonId) {
    return '$courseId::$moduleId::$lessonId';
  }
}

class _LessonDownloadController {
  _LessonDownloadController({
    required LessonDownloadTask initialTask,
    required this.tickInterval,
    required this.onUpdate,
    required this.onTerminal,
    Random? random,
  })  : _task = initialTask,
        _random = random ?? Random();

  LessonDownloadTask _task;
  final Duration tickInterval;
  final void Function(LessonDownloadTask task) onUpdate;
  final void Function(LessonDownloadTask task) onTerminal;
  final Random _random;
  Timer? _timer;
  bool _disposed = false;

  LessonDownloadTask get task => _task;

  void start() {
    if (_disposed) return;
    _task = _task.copyWith(status: LessonDownloadStatus.running, startedAt: DateTime.now());
    onUpdate(_task);
    _timer = Timer.periodic(tickInterval, (timer) {
      if (_disposed) return;
      final increment = 8 + _random.nextInt(18);
      final nextProgress = (_task.progress + increment).clamp(0, 100);
      _task = _task.copyWith(progress: nextProgress, status: LessonDownloadStatus.running);
      onUpdate(_task);
      if (nextProgress >= 100) {
        _complete();
      }
    });
  }

  void cancel() {
    if (_disposed) return;
    _timer?.cancel();
    _task = _task.copyWith(
      status: LessonDownloadStatus.cancelled,
      completedAt: DateTime.now(),
    );
    onTerminal(_task);
  }

  void dispose() {
    _disposed = true;
    _timer?.cancel();
  }

  void _complete() {
    _timer?.cancel();
    _task = _task.copyWith(
      status: LessonDownloadStatus.completed,
      progress: 100,
      completedAt: DateTime.now(),
    );
    onTerminal(_task);
  }
}
