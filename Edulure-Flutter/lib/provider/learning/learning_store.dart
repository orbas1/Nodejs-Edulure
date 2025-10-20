import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'learning_models.dart';

final _random = Random();

String _generateId(String prefix) {
  final seed = DateTime.now().millisecondsSinceEpoch + _random.nextInt(9999);
  return '$prefix-$seed';
}

class CourseStore extends StateNotifier<List<Course>> {
  CourseStore() : super(_seedCourses());

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

class EbookStore extends StateNotifier<List<Ebook>> {
  EbookStore()
      : super([
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
        ]);

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

class TutorStore extends StateNotifier<List<Tutor>> {
  TutorStore()
      : super([
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
        ]);

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

class LiveSessionStore extends StateNotifier<List<LiveSession>> {
  LiveSessionStore()
      : super([
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
        ]);

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

class ProgressStore extends StateNotifier<List<ModuleProgressLog>> {
  ProgressStore()
      : super([
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
        ]);

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

final courseStoreProvider = StateNotifierProvider<CourseStore, List<Course>>((ref) {
  return CourseStore();
});

final ebookStoreProvider = StateNotifierProvider<EbookStore, List<Ebook>>((ref) {
  return EbookStore();
});

final tutorStoreProvider = StateNotifierProvider<TutorStore, List<Tutor>>((ref) {
  return TutorStore();
});

final liveSessionStoreProvider = StateNotifierProvider<LiveSessionStore, List<LiveSession>>((ref) {
  return LiveSessionStore();
});

final progressStoreProvider = StateNotifierProvider<ProgressStore, List<ModuleProgressLog>>((ref) {
  return ProgressStore();
});
