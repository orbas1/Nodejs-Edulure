import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/provider/learning/learning_models.dart';
import 'package:edulure_mobile/provider/learning/learning_store.dart';
import 'package:edulure_mobile/services/learning_persistence_service.dart';

class InMemoryLearningPersistence implements LearningPersistence {
  List<Course>? _courses;
  List<Ebook>? _ebooks;
  List<Tutor>? _tutors;
  List<LiveSession>? _sessions;
  List<ModuleProgressLog>? _logs;

  List<T>? _clone<T>(List<T>? source) {
    return source == null ? null : List<T>.from(source);
  }

  List<Course>? snapshotCourses() => _clone(_courses);
  List<Ebook>? snapshotEbooks() => _clone(_ebooks);
  List<Tutor>? snapshotTutors() => _clone(_tutors);
  List<LiveSession>? snapshotSessions() => _clone(_sessions);
  List<ModuleProgressLog>? snapshotLogs() => _clone(_logs);

  @override
  Future<List<Course>?> loadCourses() async => _clone(_courses);

  @override
  Future<void> saveCourses(List<Course> courses) async {
    _courses = List<Course>.from(courses);
  }

  @override
  Future<List<Ebook>?> loadEbooks() async => _clone(_ebooks);

  @override
  Future<void> saveEbooks(List<Ebook> ebooks) async {
    _ebooks = List<Ebook>.from(ebooks);
  }

  @override
  Future<List<Tutor>?> loadTutors() async => _clone(_tutors);

  @override
  Future<void> saveTutors(List<Tutor> tutors) async {
    _tutors = List<Tutor>.from(tutors);
  }

  @override
  Future<List<LiveSession>?> loadLiveSessions() async => _clone(_sessions);

  @override
  Future<void> saveLiveSessions(List<LiveSession> sessions) async {
    _sessions = List<LiveSession>.from(sessions);
  }

  @override
  Future<List<ModuleProgressLog>?> loadProgressLogs() async => _clone(_logs);

  @override
  Future<void> saveProgressLogs(List<ModuleProgressLog> logs) async {
    _logs = List<ModuleProgressLog>.from(logs);
  }

  @override
  Future<void> reset() async {
    _courses = null;
    _ebooks = null;
    _tutors = null;
    _sessions = null;
    _logs = null;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CourseStore', () {
    test('creates courses with multimedia metadata', () {
      final persistence = InMemoryLearningPersistence();
      final store = CourseStore(persistence: persistence);
      final module = CourseModule(
        id: 'module-form',
        title: 'Live collaboration',
        lessonCount: 4,
        durationMinutes: 180,
        description: 'Build async rituals and cadences.',
      );

      final course = store.buildCourseFromForm(
        title: 'Distributed Leadership Lab',
        category: 'Leadership',
        level: 'Intermediate',
        summary: 'Facilitate async-first teamwork.',
        thumbnailUrl: 'https://example.com/course.png',
        price: 199,
        language: 'English',
        tags: const ['Leadership'],
        modules: [module],
        isPublished: true,
        favorite: true,
        rating: 4.9,
        promoVideoUrl: 'https://videos.example.com/leadership/intro.mp4',
        syllabusUrl: 'https://cdn.example.com/leadership/syllabus.pdf',
        learningOutcomes: const ['Design async rituals', 'Coach distributed teams'],
      );

      store.createCourse(course);

      final created = store.state.firstWhere((item) => item.id == course.id);
      expect(created.promoVideoUrl, isNotEmpty);
      expect(created.syllabusUrl, contains('syllabus.pdf'));
      expect(created.learningOutcomes, contains('Coach distributed teams'));
    });
  });

  group('EbookStore', () {
    test('persists preview and audio sample URLs', () {
      final persistence = InMemoryLearningPersistence();
      final store = EbookStore(persistence: persistence);
      final chapter = EbookChapter(id: 'chap', title: 'Foundations', pageCount: 12, summary: 'Intro');

      final ebook = store.buildEbookFromForm(
        title: 'Community Launch Fieldbook',
        author: 'Devon Harper',
        coverUrl: 'https://example.com/cover.png',
        fileUrl: 'https://example.com/file.epub',
        description: 'Launch strategy for vibrant communities.',
        language: 'English',
        tags: const ['Community'],
        chapters: [chapter],
        previewVideoUrl: 'https://videos.example.com/community/trailer.mp4',
        audioSampleUrl: 'https://example.com/audio.mp3',
      );

      store.createEbook(ebook);

      final created = store.state.firstWhere((item) => item.id == ebook.id);
      expect(created.previewVideoUrl, contains('trailer'));
      expect(created.audioSampleUrl, contains('.mp3'));
    });
  });

  group('TutorStore', () {
    test('captures credentials and intro media', () {
      final persistence = InMemoryLearningPersistence();
      final store = TutorStore(persistence: persistence);
      final tutor = store.buildTutorFromForm(
        name: 'Maya Patel',
        headline: 'Accountability systems architect',
        expertise: const ['Operations'],
        bio: 'Designs measurable accountability frameworks.',
        languages: const ['English'],
        avatarUrl: 'https://example.com/avatar.png',
        availability: const [
          TutorAvailability(weekday: 'Monday', startTime: '09:00', endTime: '11:00'),
        ],
        rating: 4.8,
        sessionCount: 24,
        reviewCount: 12,
        introVideoUrl: 'https://videos.example.com/maya/intro.mp4',
        certifications: const ['PMP', 'Prosci Change Practitioner'],
      );

      store.createTutor(tutor);

      final created = store.state.firstWhere((item) => item.id == tutor.id);
      expect(created.introVideoUrl, contains('intro'));
      expect(created.certifications, contains('PMP'));
      expect(created.headline, startsWith('Accountability'));
    });
  });

  group('LiveSessionStore', () {
    test('captures agenda timeline and recordings', () {
      final persistence = InMemoryLearningPersistence();
      final store = LiveSessionStore(persistence: persistence);
      final resource = LiveSessionResource(label: 'Brief', url: 'https://example.com/brief.pdf');
      final start = DateTime.now().add(const Duration(days: 7));
      final end = start.add(const Duration(hours: 2));

      final session = store.buildSessionFromForm(
        title: 'Launch Readiness Lab',
        courseId: store.state.first.courseId,
        tutorId: store.state.first.tutorId,
        description: 'Prep final launch deliverables with the cohort.',
        startTime: start,
        endTime: end,
        roomLink: 'https://meet.example.com/room',
        resources: [resource],
        capacity: 40,
        enrolled: 18,
        isRecordingAvailable: true,
        recordingUrl: 'https://videos.example.com/sessions/readiness.mp4',
        agenda: const ['00:00 Kickoff', '00:30 Breakouts', '01:45 Retro'],
      );

      store.createSession(session);

      final created = store.state.firstWhere((item) => item.id == session.id);
      expect(created.recordingUrl, contains('readiness'));
      expect(created.agenda.length, 3);
      expect(created.isRecordingAvailable, isTrue);
    });
  });

  test('restoreSeedData resets course store to initial seed ordering', () async {
    final persistence = InMemoryLearningPersistence();
    final store = CourseStore(persistence: persistence);
    await store.ready;

    final originalIds = store.state.map((course) => course.id).toList(growable: false);

    final module = CourseModule(
      id: 'module-growth',
      title: 'Growth Engines',
      lessonCount: 5,
      durationMinutes: 150,
      description: 'Codify repeatable growth experiments.',
    );

    final course = store.buildCourseFromForm(
      title: 'Growth Operating System',
      category: 'Growth',
      level: 'Advanced',
      summary: 'Design sustainable experimentation pipelines.',
      thumbnailUrl: 'https://example.com/growth.png',
      price: 299,
      language: 'English',
      tags: const ['Growth'],
      modules: [module],
      isPublished: true,
      favorite: false,
      rating: 4.7,
      promoVideoUrl: 'https://videos.example.com/growth/intro.mp4',
      syllabusUrl: 'https://cdn.example.com/growth/syllabus.pdf',
      learningOutcomes: const ['Automate experiment workflows'],
    );

    store.createCourse(course);
    expect(store.state.map((item) => item.id), contains(course.id));

    await store.restoreSeedData();

    expect(store.state.map((item) => item.id), originalIds);
    expect(persistence.snapshotCourses()!.map((item) => item.id), originalIds);
  });
}
