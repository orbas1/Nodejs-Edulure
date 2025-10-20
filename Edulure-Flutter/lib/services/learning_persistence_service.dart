import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../provider/learning/learning_models.dart';

/// Contract for persisting the learning catalog entities locally.
abstract class LearningPersistence {
  const LearningPersistence();

  Future<List<Course>?> loadCourses();
  Future<void> saveCourses(List<Course> courses);

  Future<List<Ebook>?> loadEbooks();
  Future<void> saveEbooks(List<Ebook> ebooks);

  Future<List<Tutor>?> loadTutors();
  Future<void> saveTutors(List<Tutor> tutors);

  Future<List<LiveSession>?> loadLiveSessions();
  Future<void> saveLiveSessions(List<LiveSession> sessions);

  Future<List<ModuleProgressLog>?> loadProgressLogs();
  Future<void> saveProgressLogs(List<ModuleProgressLog> logs);

  Future<void> reset();
}

/// Hive-backed implementation that serializes entities to JSON for storage.
class LearningPersistenceService implements LearningPersistence {
  LearningPersistenceService({String boxName = _defaultBoxName})
      : _boxName = boxName;

  static const _defaultBoxName = 'learning.catalog';
  static const _coursesKey = 'courses';
  static const _ebooksKey = 'ebooks';
  static const _tutorsKey = 'tutors';
  static const _sessionsKey = 'sessions';
  static const _progressKey = 'progress';

  final String _boxName;
  Box<String>? _cachedBox;

  Future<Box<String>> _box() async {
    final cached = _cachedBox;
    if (cached != null && cached.isOpen) {
      return cached;
    }
    final box = await Hive.openBox<String>(_boxName);
    _cachedBox = box;
    return box;
  }

  @override
  Future<List<Course>?> loadCourses() {
    return _readList(_coursesKey, (json) => Course.fromJson(json));
  }

  @override
  Future<void> saveCourses(List<Course> courses) {
    return _writeList(_coursesKey, courses, (course) => course.toJson());
  }

  @override
  Future<List<Ebook>?> loadEbooks() {
    return _readList(_ebooksKey, (json) => Ebook.fromJson(json));
  }

  @override
  Future<void> saveEbooks(List<Ebook> ebooks) {
    return _writeList(_ebooksKey, ebooks, (ebook) => ebook.toJson());
  }

  @override
  Future<List<Tutor>?> loadTutors() {
    return _readList(_tutorsKey, (json) => Tutor.fromJson(json));
  }

  @override
  Future<void> saveTutors(List<Tutor> tutors) {
    return _writeList(_tutorsKey, tutors, (tutor) => tutor.toJson());
  }

  @override
  Future<List<LiveSession>?> loadLiveSessions() {
    return _readList(_sessionsKey, (json) => LiveSession.fromJson(json));
  }

  @override
  Future<void> saveLiveSessions(List<LiveSession> sessions) {
    return _writeList(_sessionsKey, sessions, (session) => session.toJson());
  }

  @override
  Future<List<ModuleProgressLog>?> loadProgressLogs() {
    return _readList(_progressKey, (json) => ModuleProgressLog.fromJson(json));
  }

  @override
  Future<void> saveProgressLogs(List<ModuleProgressLog> logs) {
    return _writeList(_progressKey, logs, (log) => log.toJson());
  }

  @override
  Future<void> reset() async {
    final box = await _box();
    await box.clear();
  }

  Future<List<T>?> _readList<T>(
    String key,
    T Function(Map<String, dynamic> json) mapper,
  ) async {
    try {
      final box = await _box();
      final raw = box.get(key);
      if (raw == null || raw.isEmpty) {
        return null;
      }
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((item) => mapper((item as Map).cast<String, dynamic>()))
          .toList(growable: false);
    } catch (error, stackTrace) {
      debugPrint('Failed to read persisted $key: $error');
      debugPrint('$stackTrace');
      return null;
    }
  }

  Future<void> _writeList<T>(
    String key,
    List<T> items,
    Map<String, dynamic> Function(T value) encoder,
  ) async {
    try {
      final box = await _box();
      if (items.isEmpty) {
        await box.delete(key);
        return;
      }
      final payload = jsonEncode(
        items.map((item) => encoder(item)).toList(growable: false),
      );
      await box.put(key, payload);
    } catch (error, stackTrace) {
      debugPrint('Failed to persist $key: $error');
      debugPrint('$stackTrace');
    }
  }
}
