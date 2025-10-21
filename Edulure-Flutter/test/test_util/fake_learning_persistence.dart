import '../../lib/provider/learning/learning_models.dart';
import '../../lib/services/learning_persistence_service.dart';

class FakeLearningPersistence implements LearningPersistence {
  FakeLearningPersistence({List<Tutor>? tutors}) : _tutors = tutors;

  List<Tutor>? _tutors;

  @override
  Future<void> reset() async {
    _tutors = null;
  }

  @override
  Future<List<Course>?> loadCourses() async => null;

  @override
  Future<void> saveCourses(List<Course> courses) async {}

  @override
  Future<List<Ebook>?> loadEbooks() async => null;

  @override
  Future<void> saveEbooks(List<Ebook> ebooks) async {}

  @override
  Future<List<Tutor>?> loadTutors() async =>
      _tutors?.map((tutor) => tutor.copyWith(availability: List.of(tutor.availability))).toList();

  @override
  Future<void> saveTutors(List<Tutor> tutors) async {
    _tutors = tutors
        .map(
          (tutor) => tutor.copyWith(availability: List.of(tutor.availability)),
        )
        .toList();
  }

  @override
  Future<List<LiveSession>?> loadLiveSessions() async => null;

  @override
  Future<void> saveLiveSessions(List<LiveSession> sessions) async {}

  @override
  Future<List<ModuleProgressLog>?> loadProgressLogs() async => null;

  @override
  Future<void> saveProgressLogs(List<ModuleProgressLog> logs) async {}
}
