import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';

@immutable
class CourseModule {
  const CourseModule({
    required this.id,
    required this.title,
    required this.lessonCount,
    required this.durationMinutes,
    this.description = '',
    this.completedLessons = 0,
  });

  final String id;
  final String title;
  final int lessonCount;
  final int durationMinutes;
  final String description;
  final int completedLessons;

  double get completionRatio => lessonCount == 0 ? 0 : (completedLessons / lessonCount).clamp(0, 1);

  CourseModule copyWith({
    String? id,
    String? title,
    int? lessonCount,
    int? durationMinutes,
    String? description,
    int? completedLessons,
  }) {
    return CourseModule(
      id: id ?? this.id,
      title: title ?? this.title,
      lessonCount: lessonCount ?? this.lessonCount,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      description: description ?? this.description,
      completedLessons: completedLessons ?? this.completedLessons,
    );
  }
}

@immutable
class Course {
  const Course({
    required this.id,
    required this.title,
    required this.category,
    required this.level,
    required this.summary,
    required this.thumbnailUrl,
    required this.price,
    required this.modules,
    required this.language,
    required this.tags,
    this.isPublished = false,
    this.favorite = false,
    this.rating,
    this.promoVideoUrl,
    this.syllabusUrl,
    this.learningOutcomes = const <String>[],
  });

  final String id;
  final String title;
  final String category;
  final String level;
  final String summary;
  final String thumbnailUrl;
  final double price;
  final List<CourseModule> modules;
  final String language;
  final List<String> tags;
  final bool isPublished;
  final bool favorite;
  final double? rating;
  final String? promoVideoUrl;
  final String? syllabusUrl;
  final List<String> learningOutcomes;

  double get overallProgress {
    if (modules.isEmpty) return 0;
    final totalLessons = modules.fold<int>(0, (sum, module) => sum + module.lessonCount);
    if (totalLessons == 0) return 0;
    final completed = modules.fold<int>(0, (sum, module) => sum + module.completedLessons);
    return (completed / totalLessons).clamp(0, 1);
  }

  Course copyWith({
    String? id,
    String? title,
    String? category,
    String? level,
    String? summary,
    String? thumbnailUrl,
    double? price,
    List<CourseModule>? modules,
    String? language,
    List<String>? tags,
    bool? isPublished,
    bool? favorite,
    double? rating,
    String? promoVideoUrl,
    String? syllabusUrl,
    List<String>? learningOutcomes,
  }) {
    return Course(
      id: id ?? this.id,
      title: title ?? this.title,
      category: category ?? this.category,
      level: level ?? this.level,
      summary: summary ?? this.summary,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      price: price ?? this.price,
      modules: modules ?? this.modules,
      language: language ?? this.language,
      tags: tags ?? this.tags,
      isPublished: isPublished ?? this.isPublished,
      favorite: favorite ?? this.favorite,
      rating: rating ?? this.rating,
      promoVideoUrl: promoVideoUrl ?? this.promoVideoUrl,
      syllabusUrl: syllabusUrl ?? this.syllabusUrl,
      learningOutcomes: learningOutcomes ?? this.learningOutcomes,
    );
  }

  CourseModule? moduleById(String moduleId) => modules.firstWhereOrNull((module) => module.id == moduleId);
}

@immutable
class EbookChapter {
  const EbookChapter({
    required this.id,
    required this.title,
    required this.pageCount,
    this.summary = '',
  });

  final String id;
  final String title;
  final int pageCount;
  final String summary;
}

@immutable
class Ebook {
  const Ebook({
    required this.id,
    required this.title,
    required this.author,
    required this.coverUrl,
    required this.fileUrl,
    required this.description,
    required this.language,
    required this.tags,
    required this.chapters,
    this.progress = 0,
    this.rating,
    this.downloaded = false,
    this.previewVideoUrl,
    this.audioSampleUrl,
  });

  final String id;
  final String title;
  final String author;
  final String coverUrl;
  final String fileUrl;
  final String description;
  final String language;
  final List<String> tags;
  final List<EbookChapter> chapters;
  final double progress;
  final double? rating;
  final bool downloaded;
  final String? previewVideoUrl;
  final String? audioSampleUrl;

  Ebook copyWith({
    String? id,
    String? title,
    String? author,
    String? coverUrl,
    String? fileUrl,
    String? description,
    String? language,
    List<String>? tags,
    List<EbookChapter>? chapters,
    double? progress,
    double? rating,
    bool? downloaded,
    String? previewVideoUrl,
    String? audioSampleUrl,
  }) {
    return Ebook(
      id: id ?? this.id,
      title: title ?? this.title,
      author: author ?? this.author,
      coverUrl: coverUrl ?? this.coverUrl,
      fileUrl: fileUrl ?? this.fileUrl,
      description: description ?? this.description,
      language: language ?? this.language,
      tags: tags ?? this.tags,
      chapters: chapters ?? this.chapters,
      progress: progress ?? this.progress,
      rating: rating ?? this.rating,
      downloaded: downloaded ?? this.downloaded,
      previewVideoUrl: previewVideoUrl ?? this.previewVideoUrl,
      audioSampleUrl: audioSampleUrl ?? this.audioSampleUrl,
    );
  }
}

@immutable
class TutorAvailability {
  const TutorAvailability({
    required this.weekday,
    required this.startTime,
    required this.endTime,
  });

  final String weekday;
  final String startTime;
  final String endTime;
}

@immutable
class Tutor {
  const Tutor({
    required this.id,
    required this.name,
    required this.headline,
    required this.expertise,
    required this.bio,
    required this.languages,
    required this.avatarUrl,
    required this.availability,
    this.rating,
    this.sessionCount = 0,
    this.reviewCount = 0,
    this.introVideoUrl,
    this.certifications = const <String>[],
  });

  final String id;
  final String name;
  final String headline;
  final List<String> expertise;
  final String bio;
  final List<String> languages;
  final String avatarUrl;
  final List<TutorAvailability> availability;
  final double? rating;
  final int sessionCount;
  final int reviewCount;
  final String? introVideoUrl;
  final List<String> certifications;

  Tutor copyWith({
    String? id,
    String? name,
    String? headline,
    List<String>? expertise,
    String? bio,
    List<String>? languages,
    String? avatarUrl,
    List<TutorAvailability>? availability,
    double? rating,
    int? sessionCount,
    int? reviewCount,
    String? introVideoUrl,
    List<String>? certifications,
  }) {
    return Tutor(
      id: id ?? this.id,
      name: name ?? this.name,
      headline: headline ?? this.headline,
      expertise: expertise ?? this.expertise,
      bio: bio ?? this.bio,
      languages: languages ?? this.languages,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      availability: availability ?? this.availability,
      rating: rating ?? this.rating,
      sessionCount: sessionCount ?? this.sessionCount,
      reviewCount: reviewCount ?? this.reviewCount,
      introVideoUrl: introVideoUrl ?? this.introVideoUrl,
      certifications: certifications ?? this.certifications,
    );
  }
}

@immutable
class LiveSessionResource {
  const LiveSessionResource({
    required this.label,
    required this.url,
  });

  final String label;
  final String url;
}

@immutable
class LiveSession {
  const LiveSession({
    required this.id,
    required this.title,
    required this.courseId,
    required this.tutorId,
    required this.description,
    required this.startTime,
    required this.endTime,
    required this.roomLink,
    required this.resources,
    required this.capacity,
    required this.enrolled,
    this.isRecordingAvailable = false,
    this.recordingUrl,
    this.agenda = const <String>[],
  });

  final String id;
  final String title;
  final String courseId;
  final String tutorId;
  final String description;
  final DateTime startTime;
  final DateTime endTime;
  final String roomLink;
  final List<LiveSessionResource> resources;
  final int capacity;
  final int enrolled;
  final bool isRecordingAvailable;
  final String? recordingUrl;
  final List<String> agenda;

  LiveSession copyWith({
    String? id,
    String? title,
    String? courseId,
    String? tutorId,
    String? description,
    DateTime? startTime,
    DateTime? endTime,
    String? roomLink,
    List<LiveSessionResource>? resources,
    int? capacity,
    int? enrolled,
    bool? isRecordingAvailable,
    String? recordingUrl,
    List<String>? agenda,
  }) {
    return LiveSession(
      id: id ?? this.id,
      title: title ?? this.title,
      courseId: courseId ?? this.courseId,
      tutorId: tutorId ?? this.tutorId,
      description: description ?? this.description,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      roomLink: roomLink ?? this.roomLink,
      resources: resources ?? this.resources,
      capacity: capacity ?? this.capacity,
      enrolled: enrolled ?? this.enrolled,
      isRecordingAvailable: isRecordingAvailable ?? this.isRecordingAvailable,
      recordingUrl: recordingUrl ?? this.recordingUrl,
      agenda: agenda ?? this.agenda,
    );
  }
}

@immutable
class ModuleProgressLog {
  const ModuleProgressLog({
    required this.id,
    required this.courseId,
    required this.moduleId,
    required this.timestamp,
    required this.notes,
    required this.completedLessons,
  });

  final String id;
  final String courseId;
  final String moduleId;
  final DateTime timestamp;
  final String notes;
  final int completedLessons;
}

@immutable
class CourseProgressOverview {
  const CourseProgressOverview({
    required this.course,
    required this.history,
  });

  final Course course;
  final List<ModuleProgressLog> history;
}
