import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/learning_persistence_service.dart';
import '../../services/offline_learning_service.dart';
import 'learning_models.dart';

final _random = Random();

String _generateId(String prefix) {
  final seed = DateTime.now().millisecondsSinceEpoch + _random.nextInt(9999);
  return '$prefix-$seed';
}

abstract class PersistentLearningStore<T> extends StateNotifier<List<T>> {
  PersistentLearningStore({
    required List<T> seed,
  })  : _seed = List<T>.from(seed),
        super(List<T>.from(seed)) {
    unawaited(_hydrate());
  }

  final List<T> _seed;
  bool _hydrated = false;
  final Completer<void> _hydrationCompleter = Completer<void>();

  Future<void> get ready => _hydrationCompleter.future;

  @protected
  Future<List<T>?> readFromPersistence();

  @protected
  Future<void> writeToPersistence(List<T> value);

  Future<void> refreshFromPersistence() async {
    try {
      final restored = await readFromPersistence();
      if (restored != null) {
        super.state = restored;
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to refresh ${runtimeType.toString()}: $error');
      debugPrint('$stackTrace');
    }
  }

  Future<void> restoreSeedData() async {
    state = List<T>.from(_seed);
  }

  List<T> snapshotSeed() => List<T>.from(_seed);

  @override
  set state(List<T> value) {
    super.state = value;
    if (_hydrated) {
      unawaited(Future<void>(() async {
        try {
          await writeToPersistence(value);
        } catch (error, stackTrace) {
          debugPrint('Failed to persist ${runtimeType.toString()}: $error');
          debugPrint('$stackTrace');
        }
      }));
    }
  }

  Future<void> _hydrate() async {
    try {
      final restored = await readFromPersistence();
      if (restored != null && restored.isNotEmpty) {
        super.state = restored;
      } else {
        await writeToPersistence(super.state);
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to hydrate ${runtimeType.toString()}: $error');
      debugPrint('$stackTrace');
    } finally {
      _hydrated = true;
      if (!_hydrationCompleter.isCompleted) {
        _hydrationCompleter.complete();
      }
    }
  }
}

class CourseStore extends PersistentLearningStore<Course> {
  CourseStore({LearningPersistence? persistence})
      : _persistence = persistence ?? LearningPersistenceService(),
        super(seed: _seedCourses());

  final LearningPersistence _persistence;

  @override
  Future<List<Course>?> readFromPersistence() {
    return _persistence.loadCourses();
  }

  @override
  Future<void> writeToPersistence(List<Course> value) {
    return _persistence.saveCourses(value);
  }

  static List<Course> _seedCourses() {
    return [
      Course(
        id: 'course-1',
        title: 'Product Strategy Launchpad',
        category: 'Business',
        level: 'Intermediate',
        summary: 'Design and roll out market-ready product playbooks with cohort-based accountability.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f',
        price: 249,
        language: 'English',
        tags: const ['Product', 'Strategy', 'SaaS'],
        rating: 4.8,
        promoVideoUrl: 'https://videos.example.com/courses/product-strategy/teaser.mp4',
        syllabusUrl: 'https://cdn.example.com/courses/product-strategy/syllabus.pdf',
        learningOutcomes: const [
          'Launch a validated product playbook with quantified demand signals',
          'Operationalize persona research into reusable messaging assets',
          'Build async collaboration cadences for cross-functional launches',
        ],
        modules: const [
          CourseModule(
            id: 'module-1',
            title: 'Opportunity Assessment',
            lessonCount: 6,
            durationMinutes: 240,
            description: 'Quantify demand signals and synthesize research in a decision narrative.',
            completedLessons: 2,
          ),
          CourseModule(
            id: 'module-2',
            title: 'Persona Playbooks',
            lessonCount: 5,
            durationMinutes: 200,
            description: 'Build actionable persona frameworks and activation messaging.',
            completedLessons: 1,
          ),
        ],
        isPublished: true,
        favorite: true,
      ),
      Course(
        id: 'course-2',
        title: 'Async Leadership Systems',
        category: 'Leadership',
        level: 'Advanced',
        summary: 'Implement async rituals and documentation cadences for globally distributed teams.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6',
        price: 299,
        language: 'English',
        tags: const ['Remote Work', 'Leadership', 'Operations'],
        rating: 4.6,
        promoVideoUrl: 'https://videos.example.com/courses/async-leadership/intro.mp4',
        syllabusUrl: 'https://cdn.example.com/courses/async-leadership/syllabus.pdf',
        learningOutcomes: const [
          'Design asynchronous rituals for distributed leadership teams',
          'Ship knowledge bases with lifecycle governance and analytics',
        ],
        modules: const [
          CourseModule(
            id: 'module-3',
            title: 'Cadence Design',
            lessonCount: 4,
            durationMinutes: 160,
            description: 'Architect weekly, monthly, and quarterly rituals with async-first tooling.',
            completedLessons: 0,
          ),
          CourseModule(
            id: 'module-4',
            title: 'Documentation Systems',
            lessonCount: 6,
            durationMinutes: 210,
            description: 'Establish a living knowledge base with governance and lifecycle policies.',
            completedLessons: 0,
          ),
        ],
        isPublished: false,
      ),
    ];
  }

  void createCourse(Course course) {
    state = [...state, course];
  }

  void updateCourse(Course updated) {
    state = [
      for (final course in state)
        if (course.id == updated.id) updated else course,
    ];
  }

  void deleteCourse(String courseId) {
    state = state.where((course) => course.id != courseId).toList(growable: false);
  }

  void toggleFavorite(String courseId) {
    state = [
      for (final course in state)
        if (course.id == courseId) course.copyWith(favorite: !course.favorite) else course,
    ];
  }

  void updateModuleProgress({
    required String courseId,
    required String moduleId,
    required int completedLessons,
  }) {
    state = [
      for (final course in state)
        if (course.id == courseId)
          course.copyWith(
            modules: [
              for (final module in course.modules)
                if (module.id == moduleId)
                  module.copyWith(
                    completedLessons: completedLessons.clamp(0, module.lessonCount),
                  )
                else
                  module,
            ],
          )
        else
          course,
    ];
  }

  Course buildCourseFromForm({
    String? id,
    required String title,
    required String category,
    required String level,
    required String summary,
    required String thumbnailUrl,
    required double price,
    required String language,
    required List<String> tags,
    required List<CourseModule> modules,
    bool isPublished = false,
    bool favorite = false,
    double? rating,
    String? promoVideoUrl,
    String? syllabusUrl,
    List<String> learningOutcomes = const <String>[],
  }) {
    return Course(
      id: id ?? _generateId('course'),
      title: title,
      category: category,
      level: level,
      summary: summary,
      thumbnailUrl: thumbnailUrl,
      price: price,
      language: language,
      tags: tags,
      modules: modules,
      isPublished: isPublished,
      favorite: favorite,
      rating: rating,
      promoVideoUrl: promoVideoUrl,
      syllabusUrl: syllabusUrl,
      learningOutcomes: learningOutcomes,
    );
  }
}

class EbookStore extends PersistentLearningStore<Ebook> {
  EbookStore({LearningPersistence? persistence})
      : _persistence = persistence ?? LearningPersistenceService(),
        super(seed: _seedEbooks());

  final LearningPersistence _persistence;

  static List<Ebook> _seedEbooks() {
    return [
      Ebook(
        id: 'ebook-1',
        title: 'Designing Accountability Systems',
        author: 'Isabelle Cormier',
        coverUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f',
        fileUrl: 'https://cdn.example.com/ebooks/accountability.epub',
        description: 'A field guide for course builders creating measurable learner checkpoints.',
        language: 'English',
        tags: const ['Learning', 'Operations'],
        chapters: const [
          EbookChapter(id: 'ch-1', title: 'Setting the cadence', pageCount: 22),
          EbookChapter(id: 'ch-2', title: 'Feedback rituals', pageCount: 18),
          EbookChapter(id: 'ch-3', title: 'Scaling assessments', pageCount: 16),
        ],
        progress: 0.32,
        rating: 4.7,
        downloaded: true,
        previewVideoUrl: 'https://videos.example.com/ebooks/accountability/overview.mp4',
        audioSampleUrl: 'https://cdn.example.com/ebooks/accountability/sample.mp3',
      ),
      Ebook(
        id: 'ebook-2',
        title: 'Community Activation Playbook',
        author: 'Devon Harper',
        coverUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba',
        fileUrl: 'https://cdn.example.com/ebooks/community.epub',
        description: 'Spark momentum in private communities with measurable onboarding flows.',
        language: 'Spanish',
        tags: const ['Community', 'Engagement'],
        chapters: const [
          EbookChapter(id: 'ch-4', title: 'Signals of belonging', pageCount: 20),
          EbookChapter(id: 'ch-5', title: 'Designing rituals', pageCount: 24),
        ],
        progress: 0.12,
        rating: 4.5,
        previewVideoUrl: 'https://videos.example.com/ebooks/community/preview.mp4',
        audioSampleUrl: 'https://cdn.example.com/ebooks/community/sample.mp3',
      ),
    ];
  }

  @override
  Future<List<Ebook>?> readFromPersistence() {
    return _persistence.loadEbooks();
  }

  @override
  Future<void> writeToPersistence(List<Ebook> value) {
    return _persistence.saveEbooks(value);
  }

  void createEbook(Ebook ebook) {
    state = [...state, ebook];
  }

  void updateEbook(Ebook ebook) {
    state = [
      for (final item in state)
        if (item.id == ebook.id) ebook else item,
    ];
  }

  void deleteEbook(String ebookId) {
    state = state.where((ebook) => ebook.id != ebookId).toList(growable: false);
  }

  Ebook buildEbookFromForm({
    String? id,
    required String title,
    required String author,
    required String coverUrl,
    required String fileUrl,
    required String description,
    required String language,
    required List<String> tags,
    required List<EbookChapter> chapters,
    double progress = 0,
    double? rating,
    bool downloaded = false,
    String? previewVideoUrl,
    String? audioSampleUrl,
  }) {
    return Ebook(
      id: id ?? _generateId('ebook'),
      title: title,
      author: author,
      coverUrl: coverUrl,
      fileUrl: fileUrl,
      description: description,
      language: language,
      tags: tags,
      chapters: chapters,
      progress: progress,
      rating: rating,
      downloaded: downloaded,
      previewVideoUrl: previewVideoUrl,
      audioSampleUrl: audioSampleUrl,
    );
  }
}

class TutorStore extends PersistentLearningStore<Tutor> {
  TutorStore({LearningPersistence? persistence})
      : _persistence = persistence ?? LearningPersistenceService(),
        super(seed: _seedTutors());

  final LearningPersistence _persistence;

  static List<Tutor> _seedTutors() {
    return [
      Tutor(
        id: 'tutor-1',
        name: 'Akira Sato',
        headline: 'Fractional product discovery coach',
        expertise: const ['Product Research', 'Interviewing'],
        bio: 'Led discovery sprints for 30+ venture-backed products. Coaches teams on decision narratives.',
        languages: const ['English', 'Japanese'],
        avatarUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe',
        availability: const [
          TutorAvailability(weekday: 'Tuesday', startTime: '09:00', endTime: '12:00'),
          TutorAvailability(weekday: 'Thursday', startTime: '13:00', endTime: '17:00'),
        ],
        rating: 4.9,
        sessionCount: 128,
        reviewCount: 42,
        introVideoUrl: 'https://videos.example.com/tutors/akira/intro.mp4',
        certifications: const ['IDEO Design Thinking', 'Product Strategy Guild'],
      ),
      Tutor(
        id: 'tutor-2',
        name: 'Leila Haddad',
        headline: 'Community experience architect',
        expertise: const ['Community Ops', 'Facilitation'],
        bio: 'Community architect for global accelerators. Hosts immersive cohort rituals.',
        languages: const ['English', 'Arabic', 'French'],
        avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39',
        availability: const [
          TutorAvailability(weekday: 'Wednesday', startTime: '10:00', endTime: '14:00'),
          TutorAvailability(weekday: 'Friday', startTime: '09:00', endTime: '11:00'),
        ],
        rating: 4.8,
        sessionCount: 96,
        reviewCount: 36,
        introVideoUrl: 'https://videos.example.com/tutors/leila/intro.mp4',
        certifications: const ['IAF Certified Facilitator', 'CMX Masterclass Graduate'],
      ),
    ];
  }

  @override
  Future<List<Tutor>?> readFromPersistence() {
    return _persistence.loadTutors();
  }

  @override
  Future<void> writeToPersistence(List<Tutor> value) {
    return _persistence.saveTutors(value);
  }

  void createTutor(Tutor tutor) {
    state = [...state, tutor];
  }

  void updateTutor(Tutor tutor) {
    state = [
      for (final item in state)
        if (item.id == tutor.id) tutor else item,
    ];
  }

  void deleteTutor(String tutorId) {
    state = state.where((tutor) => tutor.id != tutorId).toList(growable: false);
  }

  Tutor buildTutorFromForm({
    String? id,
    required String name,
    required String headline,
    required List<String> expertise,
    required String bio,
    required List<String> languages,
    required String avatarUrl,
    required List<TutorAvailability> availability,
    double? rating,
    int sessionCount = 0,
    int reviewCount = 0,
    String? introVideoUrl,
    List<String> certifications = const <String>[],
  }) {
    return Tutor(
      id: id ?? _generateId('tutor'),
      name: name,
      headline: headline,
      expertise: expertise,
      bio: bio,
      languages: languages,
      avatarUrl: avatarUrl,
      availability: availability,
      rating: rating,
      sessionCount: sessionCount,
      reviewCount: reviewCount,
      introVideoUrl: introVideoUrl,
      certifications: certifications,
    );
  }
}

class LiveSessionStore extends PersistentLearningStore<LiveSession> {
  LiveSessionStore({LearningPersistence? persistence})
      : _persistence = persistence ?? LearningPersistenceService(),
        super(seed: _seedSessions());

  final LearningPersistence _persistence;

  static List<LiveSession> _seedSessions() {
    return [
      LiveSession(
        id: 'session-1',
        title: 'Opportunity Assessment Workshop',
        courseId: 'course-1',
        tutorId: 'tutor-1',
        description: 'Live working session to stress-test cohort problem statements.',
        startTime: DateTime.now().add(const Duration(days: 2, hours: 3)),
        endTime: DateTime.now().add(const Duration(days: 2, hours: 5)),
        roomLink: 'https://meet.edulure.com/rooms/opportunity',
        resources: const [
          LiveSessionResource(label: 'Brief template', url: 'https://cdn.example.com/files/brief-template.pdf'),
          LiveSessionResource(label: 'Session board', url: 'https://miro.com/app/board/opportunity'),
        ],
        capacity: 50,
        enrolled: 32,
        isRecordingAvailable: true,
        recordingUrl: 'https://videos.example.com/sessions/opportunity-recording.mp4',
        agenda: const [
          '00:00 – Check-in and context framing',
          '00:20 – Persona signal review',
          '01:10 – Breakout board working session',
          '01:50 – Retro and next steps',
        ],
      ),
      LiveSession(
        id: 'session-2',
        title: 'Community Ritual Lab',
        courseId: 'course-2',
        tutorId: 'tutor-2',
        description: 'Design ritual calendars and practice facilitation flows with peers.',
        startTime: DateTime.now().add(const Duration(days: 5, hours: 1)),
        endTime: DateTime.now().add(const Duration(days: 5, hours: 3)),
        roomLink: 'https://meet.edulure.com/rooms/rituals',
        resources: const [
          LiveSessionResource(label: 'Facilitator handbook', url: 'https://cdn.example.com/files/facilitation.pdf'),
        ],
        capacity: 35,
        enrolled: 20,
        agenda: const [
          '00:00 – Ritual design warm-up',
          '00:35 – Community journey mapping',
          '01:20 – Live facilitation labs',
        ],
      ),
    ];
  }

  @override
  Future<List<LiveSession>?> readFromPersistence() {
    return _persistence.loadLiveSessions();
  }

  @override
  Future<void> writeToPersistence(List<LiveSession> value) {
    return _persistence.saveLiveSessions(value);
  }

  void createSession(LiveSession session) {
    state = [...state, session];
  }

  void updateSession(LiveSession session) {
    state = [
      for (final existing in state)
        if (existing.id == session.id) session else existing,
    ];
  }

  void deleteSession(String sessionId) {
    state = state.where((session) => session.id != sessionId).toList(growable: false);
  }

  LiveSession buildSessionFromForm({
    String? id,
    required String title,
    required String courseId,
    required String tutorId,
    required String description,
    required DateTime startTime,
    required DateTime endTime,
    required String roomLink,
    required List<LiveSessionResource> resources,
    required int capacity,
    required int enrolled,
    bool isRecordingAvailable = false,
    String? recordingUrl,
    List<String> agenda = const <String>[],
  }) {
    return LiveSession(
      id: id ?? _generateId('session'),
      title: title,
      courseId: courseId,
      tutorId: tutorId,
      description: description,
      startTime: startTime,
      endTime: endTime,
      roomLink: roomLink,
      resources: resources,
      capacity: capacity,
      enrolled: enrolled,
      isRecordingAvailable: isRecordingAvailable,
      recordingUrl: recordingUrl,
      agenda: agenda,
    );
  }
}

class ProgressStore extends PersistentLearningStore<ModuleProgressLog> {
  ProgressStore({LearningPersistence? persistence})
      : _persistence = persistence ?? LearningPersistenceService(),
        super(seed: _seedLogs());

  final LearningPersistence _persistence;

  static List<ModuleProgressLog> _seedLogs() {
    return [
      ModuleProgressLog(
        id: 'log-1',
        courseId: 'course-1',
        moduleId: 'module-1',
        timestamp: DateTime.now().subtract(const Duration(days: 2, hours: 3)),
        notes: 'Completed persona interview synthesis. Ready for validation sprint.',
        completedLessons: 2,
      ),
      ModuleProgressLog(
        id: 'log-2',
        courseId: 'course-1',
        moduleId: 'module-2',
        timestamp: DateTime.now().subtract(const Duration(days: 1, hours: 4)),
        notes: 'Drafted messaging matrix and shared with tutor for review.',
        completedLessons: 1,
      ),
    ];
  }

  @override
  Future<List<ModuleProgressLog>?> readFromPersistence() {
    return _persistence.loadProgressLogs();
  }

  @override
  Future<void> writeToPersistence(List<ModuleProgressLog> value) {
    return _persistence.saveProgressLogs(value);
  }

  void recordProgress(ModuleProgressLog log) {
    state = [...state, log];
  }

  void deleteProgress(String logId) {
    state = state.where((entry) => entry.id != logId).toList(growable: false);
  }

  ModuleProgressLog buildLogFromForm({
    String? id,
    required String courseId,
    required String moduleId,
    required DateTime timestamp,
    required String notes,
    required int completedLessons,
  }) {
    return ModuleProgressLog(
      id: id ?? _generateId('log'),
      courseId: courseId,
      moduleId: moduleId,
      timestamp: timestamp,
      notes: notes,
      completedLessons: completedLessons,
    );
  }
}

final learningPersistenceProvider = Provider<LearningPersistence>((ref) {
  return LearningPersistenceService();
});

final offlineLearningServiceProvider = Provider<OfflineLearningService>((ref) {
  return OfflineLearningService();
});

final courseStoreProvider = StateNotifierProvider<CourseStore, List<Course>>((ref) {
  final persistence = ref.watch(learningPersistenceProvider);
  return CourseStore(persistence: persistence);
});

final ebookStoreProvider = StateNotifierProvider<EbookStore, List<Ebook>>((ref) {
  final persistence = ref.watch(learningPersistenceProvider);
  return EbookStore(persistence: persistence);
});

final tutorStoreProvider = StateNotifierProvider<TutorStore, List<Tutor>>((ref) {
  final persistence = ref.watch(learningPersistenceProvider);
  return TutorStore(persistence: persistence);
});

final liveSessionStoreProvider = StateNotifierProvider<LiveSessionStore, List<LiveSession>>((ref) {
  final persistence = ref.watch(learningPersistenceProvider);
  return LiveSessionStore(persistence: persistence);
});

final progressStoreProvider = StateNotifierProvider<ProgressStore, List<ModuleProgressLog>>((ref) {
  final persistence = ref.watch(learningPersistenceProvider);
  return ProgressStore(persistence: persistence);
});

final learningProgressControllerProvider = Provider<LearningProgressController>((ref) {
  final courseStore = ref.read(courseStoreProvider.notifier);
  final progressStore = ref.read(progressStoreProvider.notifier);
  final offlineService = ref.watch(offlineLearningServiceProvider);
  return LearningProgressController(
    courseStore: courseStore,
    progressStore: progressStore,
    offlineLearningService: offlineService,
  );
});

class LearningProgressController {
  LearningProgressController({
    required CourseStore courseStore,
    required ProgressStore progressStore,
    required OfflineLearningService offlineLearningService,
  })  : _courseStore = courseStore,
        _progressStore = progressStore,
        _offlineLearningService = offlineLearningService;

  final CourseStore _courseStore;
  final ProgressStore _progressStore;
  final OfflineLearningService _offlineLearningService;

  Future<void> updateModuleProgress({
    required String courseId,
    required String moduleId,
    required int completedLessons,
    String? note,
    DateTime? timestamp,
  }) async {
    Course? course;
    for (final entry in _courseStore.state) {
      if (entry.id == courseId) {
        course = entry;
        break;
      }
    }
    if (course == null) {
      return;
    }

    CourseModule? module;
    for (final candidate in course.modules) {
      if (candidate.id == moduleId) {
        module = candidate;
        break;
      }
    }
    if (module == null) {
      return;
    }

    final clampedValue = completedLessons.clamp(0, module.lessonCount);
    final int adjustedLessons = clampedValue is num ? clampedValue.toInt() : completedLessons;

    _courseStore.updateModuleProgress(
      courseId: courseId,
      moduleId: moduleId,
      completedLessons: adjustedLessons,
    );

    final logTimestamp = timestamp ?? DateTime.now();
    final log = _progressStore.buildLogFromForm(
      courseId: courseId,
      moduleId: moduleId,
      timestamp: logTimestamp,
      notes: (note != null && note.isNotEmpty)
          ? note
          : 'Updated ${module.title} to $adjustedLessons of ${module.lessonCount} lessons complete.',
      completedLessons: adjustedLessons,
    );
    _progressStore.recordProgress(log);

    final completionRatio = module.lessonCount == 0
        ? 0
        : adjustedLessons / module.lessonCount;
    await _offlineLearningService.recordModuleProgressSnapshot(
      courseId: courseId,
      moduleId: moduleId,
      completionRatio: completionRatio,
      notes: note,
    );
  }
}
