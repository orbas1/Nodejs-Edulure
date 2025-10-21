import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/provider/learning/learning_models.dart';
import 'package:edulure_mobile/provider/learning/learning_store.dart';
import 'package:edulure_mobile/services/learning_persistence_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CourseStore', () {
    late FakeLearningPersistence persistence;
    late CourseStore store;

    setUp(() {
      persistence = FakeLearningPersistence();
      store = CourseStore(persistence: persistence);
    });

    test('hydrates seed data and writes to persistence on init', () async {
      await store.ready;
      await pumpEventQueue();

      expect(store.state, isNotEmpty);
      expect(persistence.savedCourses, isNotEmpty);
      expect(persistence.savedCourses!.length, store.state.length);
    });

    test('createCourse updates state and persistence snapshot', () async {
      await store.ready;
      await pumpEventQueue();

      final newCourse = Course(
        id: 'course-new',
        title: 'Inclusive Facilitation',
        category: 'Leadership',
        level: 'Beginner',
        summary: 'Master facilitation techniques for inclusive learning pods.',
        thumbnailUrl: 'https://images.example.com/course-facilitation.jpg',
        price: 149,
        modules: const [
          CourseModule(
            id: 'module-1',
            title: 'Foundations',
            lessonCount: 4,
            durationMinutes: 120,
            description: 'Build shared agreements and facilitation confidence.',
            completedLessons: 0,
          ),
        ],
        language: 'English',
        tags: const ['Facilitation', 'Community'],
        learningOutcomes: const ['Model inclusive collaboration rituals'],
        isPublished: true,
        favorite: false,
      );

      store.createCourse(newCourse);
      await pumpEventQueue();

      expect(store.state.any((course) => course.id == 'course-new'), isTrue);
      expect(persistence.savedCourses!.any((course) => course.id == 'course-new'), isTrue);
    });

    test('restoreSeedData resets catalog to default snapshot', () async {
      await store.ready;
      await pumpEventQueue();

      final originalSeedIds = store.snapshotSeed().map((course) => course.id).toList();
      store.state = <Course>[];
      await pumpEventQueue();
      expect(store.state, isEmpty);

      await store.restoreSeedData();
      await pumpEventQueue();

      expect(store.state.map((course) => course.id), originalSeedIds);
    });
  });
}

class FakeLearningPersistence implements LearningPersistence {
  List<Course>? savedCourses;

  @override
  Future<void> reset() async {
    savedCourses = null;
  }

  @override
  Future<void> saveCourses(List<Course> courses) async {
    savedCourses = courses.map((course) => course).toList(growable: false);
  }

  @override
  Future<List<Course>?> loadCourses() async {
    return savedCourses == null
        ? null
        : savedCourses!.map((course) => course).toList(growable: false);
  }

  @override
  Future<void> saveEbooks(List<Ebook> ebooks) async {}

  @override
  Future<List<Ebook>?> loadEbooks() async => null;

  @override
  Future<void> saveLiveSessions(List<LiveSession> sessions) async {}

  @override
  Future<List<LiveSession>?> loadLiveSessions() async => null;

  @override
  Future<void> saveProgressLogs(List<ModuleProgressLog> logs) async {}

  @override
  Future<List<ModuleProgressLog>?> loadProgressLogs() async => null;

  @override
  Future<void> saveTutors(List<Tutor> tutors) async {}

  @override
  Future<List<Tutor>?> loadTutors() async => null;
}
