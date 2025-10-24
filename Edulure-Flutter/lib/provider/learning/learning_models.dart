import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';

enum ProgressSyncState { pending, syncing, synced, conflict }

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

  factory CourseModule.fromJson(Map<String, dynamic> json) {
    return CourseModule(
      id: json['id'] as String,
      title: json['title'] as String,
      lessonCount: (json['lessonCount'] as num?)?.toInt() ?? 0,
      durationMinutes: (json['durationMinutes'] as num?)?.toInt() ?? 0,
      description: json['description'] as String? ?? '',
      completedLessons: (json['completedLessons'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'lessonCount': lessonCount,
      'durationMinutes': durationMinutes,
      'description': description,
      'completedLessons': completedLessons,
    };
  }

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

  factory Course.fromJson(Map<String, dynamic> json) {
    return Course(
      id: json['id'] as String,
      title: json['title'] as String,
      category: json['category'] as String,
      level: json['level'] as String,
      summary: json['summary'] as String,
      thumbnailUrl: json['thumbnailUrl'] as String,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      modules: (json['modules'] as List<dynamic>? ?? const <dynamic>[])
          .map((module) => CourseModule.fromJson((module as Map).cast<String, dynamic>()))
          .toList(growable: false),
      language: json['language'] as String,
      tags: (json['tags'] as List<dynamic>? ?? const <dynamic>[])
          .map((tag) => tag.toString())
          .toList(growable: false),
      isPublished: json['isPublished'] as bool? ?? false,
      favorite: json['favorite'] as bool? ?? false,
      rating: (json['rating'] as num?)?.toDouble(),
      promoVideoUrl: json['promoVideoUrl'] as String?,
      syllabusUrl: json['syllabusUrl'] as String?,
      learningOutcomes: (json['learningOutcomes'] as List<dynamic>? ?? const <dynamic>[])
          .map((outcome) => outcome.toString())
          .toList(growable: false),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'category': category,
      'level': level,
      'summary': summary,
      'thumbnailUrl': thumbnailUrl,
      'price': price,
      'modules': modules.map((module) => module.toJson()).toList(growable: false),
      'language': language,
      'tags': tags,
      'isPublished': isPublished,
      'favorite': favorite,
      'rating': rating,
      'promoVideoUrl': promoVideoUrl,
      'syllabusUrl': syllabusUrl,
      'learningOutcomes': learningOutcomes,
    };
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

  factory EbookChapter.fromJson(Map<String, dynamic> json) {
    return EbookChapter(
      id: json['id'] as String,
      title: json['title'] as String,
      pageCount: (json['pageCount'] as num?)?.toInt() ?? 0,
      summary: json['summary'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'pageCount': pageCount,
      'summary': summary,
    };
  }
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

  factory Ebook.fromJson(Map<String, dynamic> json) {
    return Ebook(
      id: json['id'] as String,
      title: json['title'] as String,
      author: json['author'] as String,
      coverUrl: json['coverUrl'] as String,
      fileUrl: json['fileUrl'] as String,
      description: json['description'] as String,
      language: json['language'] as String,
      tags: (json['tags'] as List<dynamic>? ?? const <dynamic>[])
          .map((tag) => tag.toString())
          .toList(growable: false),
      chapters: (json['chapters'] as List<dynamic>? ?? const <dynamic>[])
          .map((chapter) => EbookChapter.fromJson((chapter as Map).cast<String, dynamic>()))
          .toList(growable: false),
      progress: (json['progress'] as num?)?.toDouble() ?? 0,
      rating: (json['rating'] as num?)?.toDouble(),
      downloaded: json['downloaded'] as bool? ?? false,
      previewVideoUrl: json['previewVideoUrl'] as String?,
      audioSampleUrl: json['audioSampleUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'author': author,
      'coverUrl': coverUrl,
      'fileUrl': fileUrl,
      'description': description,
      'language': language,
      'tags': tags,
      'chapters': chapters.map((chapter) => chapter.toJson()).toList(growable: false),
      'progress': progress,
      'rating': rating,
      'downloaded': downloaded,
      'previewVideoUrl': previewVideoUrl,
      'audioSampleUrl': audioSampleUrl,
    };
  }

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

  factory TutorAvailability.fromJson(Map<String, dynamic> json) {
    return TutorAvailability(
      weekday: json['weekday'] as String,
      startTime: json['startTime'] as String,
      endTime: json['endTime'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'weekday': weekday,
      'startTime': startTime,
      'endTime': endTime,
    };
  }
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

  factory Tutor.fromJson(Map<String, dynamic> json) {
    return Tutor(
      id: json['id'] as String,
      name: json['name'] as String,
      headline: json['headline'] as String,
      expertise: (json['expertise'] as List<dynamic>? ?? const <dynamic>[])
          .map((item) => item.toString())
          .toList(growable: false),
      bio: json['bio'] as String,
      languages: (json['languages'] as List<dynamic>? ?? const <dynamic>[])
          .map((language) => language.toString())
          .toList(growable: false),
      avatarUrl: json['avatarUrl'] as String,
      availability: (json['availability'] as List<dynamic>? ?? const <dynamic>[])
          .map((slot) => TutorAvailability.fromJson((slot as Map).cast<String, dynamic>()))
          .toList(growable: false),
      rating: (json['rating'] as num?)?.toDouble(),
      sessionCount: (json['sessionCount'] as num?)?.toInt() ?? 0,
      reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
      introVideoUrl: json['introVideoUrl'] as String?,
      certifications: (json['certifications'] as List<dynamic>? ?? const <dynamic>[])
          .map((item) => item.toString())
          .toList(growable: false),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'headline': headline,
      'expertise': expertise,
      'bio': bio,
      'languages': languages,
      'avatarUrl': avatarUrl,
      'availability': availability.map((slot) => slot.toJson()).toList(growable: false),
      'rating': rating,
      'sessionCount': sessionCount,
      'reviewCount': reviewCount,
      'introVideoUrl': introVideoUrl,
      'certifications': certifications,
    };
  }

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

  factory LiveSessionResource.fromJson(Map<String, dynamic> json) {
    return LiveSessionResource(
      label: json['label'] as String,
      url: json['url'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'url': url,
    };
  }
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

  factory LiveSession.fromJson(Map<String, dynamic> json) {
    return LiveSession(
      id: json['id'] as String,
      title: json['title'] as String,
      courseId: json['courseId'] as String,
      tutorId: json['tutorId'] as String,
      description: json['description'] as String,
      startTime: DateTime.tryParse(json['startTime'] as String? ?? '') ?? DateTime.now(),
      endTime: DateTime.tryParse(json['endTime'] as String? ?? '') ?? DateTime.now(),
      roomLink: json['roomLink'] as String,
      resources: (json['resources'] as List<dynamic>? ?? const <dynamic>[])
          .map((resource) => LiveSessionResource.fromJson((resource as Map).cast<String, dynamic>()))
          .toList(growable: false),
      capacity: (json['capacity'] as num?)?.toInt() ?? 0,
      enrolled: (json['enrolled'] as num?)?.toInt() ?? 0,
      isRecordingAvailable: json['isRecordingAvailable'] as bool? ?? false,
      recordingUrl: json['recordingUrl'] as String?,
      agenda: (json['agenda'] as List<dynamic>? ?? const <dynamic>[])
          .map((entry) => entry.toString())
          .toList(growable: false),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'courseId': courseId,
      'tutorId': tutorId,
      'description': description,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'roomLink': roomLink,
      'resources': resources.map((resource) => resource.toJson()).toList(growable: false),
      'capacity': capacity,
      'enrolled': enrolled,
      'isRecordingAvailable': isRecordingAvailable,
      'recordingUrl': recordingUrl,
      'agenda': agenda,
    };
  }

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
    this.syncState = ProgressSyncState.pending,
    DateTime? updatedAt,
    this.syncedAt,
    this.deviceId = 'unknown-device',
    this.conflictReason,
    this.remoteSuggestion,
    this.revision = 0,
  }) : updatedAt = updatedAt ?? timestamp;

  final String id;
  final String courseId;
  final String moduleId;
  final DateTime timestamp;
  final String notes;
  final int completedLessons;
  final ProgressSyncState syncState;
  final DateTime updatedAt;
  final DateTime? syncedAt;
  final String deviceId;
  final String? conflictReason;
  final ModuleProgressLog? remoteSuggestion;
  final int revision;

  bool get hasConflict => syncState == ProgressSyncState.conflict;

  ModuleProgressLog copyWith({
    String? id,
    String? courseId,
    String? moduleId,
    DateTime? timestamp,
    String? notes,
    int? completedLessons,
    ProgressSyncState? syncState,
    DateTime? updatedAt,
    DateTime? syncedAt,
    String? deviceId,
    String? conflictReason,
    ModuleProgressLog? remoteSuggestion,
    int? revision,
  }) {
    return ModuleProgressLog(
      id: id ?? this.id,
      courseId: courseId ?? this.courseId,
      moduleId: moduleId ?? this.moduleId,
      timestamp: timestamp ?? this.timestamp,
      notes: notes ?? this.notes,
      completedLessons: completedLessons ?? this.completedLessons,
      syncState: syncState ?? this.syncState,
      updatedAt: updatedAt ?? this.updatedAt,
      syncedAt: syncedAt ?? this.syncedAt,
      deviceId: deviceId ?? this.deviceId,
      conflictReason: conflictReason ?? this.conflictReason,
      remoteSuggestion: remoteSuggestion ?? this.remoteSuggestion,
      revision: revision ?? this.revision,
    );
  }

  factory ModuleProgressLog.fromJson(Map<String, dynamic> json) {
    final remote = json['remoteSuggestion'];
    return ModuleProgressLog(
      id: json['id'] as String,
      courseId: json['courseId'] as String,
      moduleId: json['moduleId'] as String,
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
      notes: json['notes'] as String,
      completedLessons: (json['completedLessons'] as num?)?.toInt() ?? 0,
      syncState: _parseSyncState(json['syncState']?.toString()),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.tryParse(json['timestamp'] as String? ?? '') ??
          DateTime.now(),
      syncedAt: DateTime.tryParse(json['syncedAt'] as String? ?? ''),
      deviceId: json['deviceId']?.toString() ?? 'unknown-device',
      conflictReason: json['conflictReason']?.toString(),
      remoteSuggestion: remote is Map
          ? ModuleProgressLog.fromJson(Map<String, dynamic>.from(remote as Map))
              .copyWith(remoteSuggestion: null)
          : null,
      revision: (json['revision'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'courseId': courseId,
      'moduleId': moduleId,
      'timestamp': timestamp.toIso8601String(),
      'notes': notes,
      'completedLessons': completedLessons,
      'syncState': describeEnum(syncState),
      'updatedAt': updatedAt.toIso8601String(),
      'syncedAt': syncedAt?.toIso8601String(),
      'deviceId': deviceId,
      'conflictReason': conflictReason,
      'remoteSuggestion': remoteSuggestion?.copyWith(remoteSuggestion: null).toJson(),
      'revision': revision,
    }..removeWhere((key, value) => value == null);
  }

  static ProgressSyncState _parseSyncState(String? value) {
    switch (value) {
      case 'syncing':
        return ProgressSyncState.syncing;
      case 'synced':
        return ProgressSyncState.synced;
      case 'conflict':
        return ProgressSyncState.conflict;
      case 'pending':
      default:
        return ProgressSyncState.pending;
    }
  }
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
