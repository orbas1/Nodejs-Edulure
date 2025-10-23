import logger from '../config/logger.js';
import CourseEnrollmentModel from '../models/CourseEnrollmentModel.js';
import CourseModuleModel from '../models/CourseModuleModel.js';
import CourseLessonModel from '../models/CourseLessonModel.js';
import CourseProgressModel from '../models/CourseProgressModel.js';
import CourseModel from '../models/CourseModel.js';

const log = logger.child({ service: 'LearnerProgressService' });

function toIsoString(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function formatDateLabel(value) {
  const iso = toIsoString(value);
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(iso));
  } catch (_error) {
    return null;
  }
}

function normaliseModules(modules = []) {
  const map = new Map();
  modules.forEach((module) => {
    if (!module?.id) return;
    map.set(module.id, {
      id: module.id,
      courseId: module.courseId,
      title: module.title,
      position: module.position ?? 0,
      releaseLabel: formatDateLabel(module.metadata?.releaseAt ?? module.metadata?.releaseDate),
      metadata: module.metadata ?? {},
      createdAt: toIsoString(module.createdAt),
      updatedAt: toIsoString(module.updatedAt)
    });
  });
  return map;
}

function normaliseLessons(lessons = []) {
  const map = new Map();
  lessons.forEach((lesson) => {
    if (!lesson?.id) return;
    map.set(lesson.id, {
      id: lesson.id,
      courseId: lesson.courseId,
      moduleId: lesson.moduleId,
      title: lesson.title,
      slug: lesson.slug,
      position: lesson.position ?? 0,
      durationMinutes: Number.isFinite(Number(lesson.durationMinutes))
        ? Number(lesson.durationMinutes)
        : null,
      releaseAt: toIsoString(lesson.releaseAt),
      metadata: lesson.metadata ?? {},
      createdAt: toIsoString(lesson.createdAt),
      updatedAt: toIsoString(lesson.updatedAt)
    });
  });
  return map;
}

function buildProgressLookup(progressRows = []) {
  const byEnrollment = new Map();
  progressRows.forEach((row) => {
    if (!row?.enrollmentId || !row.lessonId) return;
    const enrollmentMap = byEnrollment.get(row.enrollmentId) ?? new Map();
    enrollmentMap.set(row.lessonId, {
      enrollmentId: row.enrollmentId,
      lessonId: row.lessonId,
      completed: Boolean(row.completed) || Number(row.progressPercent ?? 0) >= 100,
      progressPercent: Number(row.progressPercent ?? 0),
      completedAt: toIsoString(row.completedAt),
      metadata: row.metadata ?? {},
      updatedAt: toIsoString(row.updatedAt)
    });
    byEnrollment.set(row.enrollmentId, enrollmentMap);
  });
  return byEnrollment;
}

function determineLessonStatus(lesson, progress) {
  if (progress?.completed) {
    return 'completed';
  }
  const releaseAt = lesson?.releaseAt ? new Date(lesson.releaseAt) : null;
  if (releaseAt && !Number.isNaN(releaseAt.getTime()) && releaseAt.getTime() > Date.now()) {
    return 'scheduled';
  }
  return 'ready';
}

function formatLessonSummary(lesson, progress) {
  if (!lesson) return null;
  const status = determineLessonStatus(lesson, progress);
  return {
    id: lesson.id,
    moduleId: lesson.moduleId,
    courseId: lesson.courseId,
    title: lesson.title,
    durationMinutes: lesson.durationMinutes,
    status,
    completed: Boolean(progress?.completed),
    progressPercent: progress?.progressPercent ?? 0,
    releaseAt: lesson.releaseAt,
    releaseLabel: formatDateLabel(lesson.releaseAt),
    metadata: lesson.metadata,
    completedAt: progress?.completedAt ?? null,
    updatedAt: progress?.updatedAt ?? lesson.updatedAt ?? null,
    nextActionLabel:
      status === 'completed'
        ? 'Reviewed'
        : status === 'scheduled'
          ? 'Unlocks soon'
          : 'Ready to start'
  };
}

function computeModuleSummary(module, lessons, progressLookup) {
  const moduleLessons = lessons.filter((lesson) => lesson.moduleId === module.id);
  const enrollmentProgress = progressLookup ?? new Map();
  let completedLessons = 0;
  let totalDuration = 0;
  const lessonSummaries = moduleLessons.map((lesson) => {
    const progress = enrollmentProgress.get(lesson.id);
    const summary = formatLessonSummary(lesson, progress);
    if (summary?.completed) {
      completedLessons += 1;
    }
    if (Number.isFinite(lesson.durationMinutes)) {
      totalDuration += lesson.durationMinutes;
    }
    return summary;
  });
  const totalLessons = lessonSummaries.length;
  const completionPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  const nextLesson = lessonSummaries.find((lesson) => !lesson.completed && lesson.status !== 'scheduled')
    ?? lessonSummaries.find((lesson) => lesson.status !== 'completed')
    ?? null;

  return {
    id: module.id,
    courseId: module.courseId,
    title: module.title,
    position: module.position,
    releaseLabel: module.releaseLabel,
    totalLessons,
    completedLessons,
    completionPercent,
    totalDurationMinutes: totalDuration,
    nextLesson,
    lessons: lessonSummaries
  };
}

function computeCourseSummary({
  course,
  enrollment,
  moduleMap,
  lessons,
  progressLookup
}) {
  const modules = Array.from(moduleMap.values())
    .filter((module) => module.courseId === course.id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const moduleSummaries = modules.map((module) => computeModuleSummary(module, lessons, progressLookup));
  const totalLessons = moduleSummaries.reduce((sum, module) => sum + module.totalLessons, 0);
  const completedLessons = moduleSummaries.reduce((sum, module) => sum + module.completedLessons, 0);
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  const nextLesson = moduleSummaries.find((module) => module.nextLesson)?.nextLesson ?? null;

  return {
    courseId: course.id,
    enrollmentId: enrollment?.id ?? null,
    enrollmentStatus: enrollment?.status ?? 'enrolled',
    progressPercent,
    completedLessons,
    totalLessons,
    nextLesson,
    modules: moduleSummaries,
    certificateTemplate: {
      courseId: course.id,
      accentColor: course.metadata?.brandColor ?? '#4338ca',
      backgroundUrl: course.metadata?.certificateBackgroundUrl ?? null,
      issuedBy: course.metadata?.certificateIssuer ?? course.instructorName ?? 'Edulure Academy'
    }
  };
}

export default class LearnerProgressService {
  static async listProgressForUser(userId) {
    if (!userId) {
      return {
        enrollments: [],
        courseSummaries: [],
        lessons: [],
        generatedAt: new Date().toISOString()
      };
    }

    try {
      const enrollments = await CourseEnrollmentModel.listByUserId(userId);
      if (!enrollments.length) {
        return {
          enrollments: [],
          courseSummaries: [],
          lessons: [],
          generatedAt: new Date().toISOString()
        };
      }

      const courseIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.courseId).filter(Boolean)));
      const [courses, modules, lessons, progressRows] = await Promise.all([
        CourseModel.listByIds(courseIds),
        CourseModuleModel.listByCourseIds(courseIds),
        CourseLessonModel.listByCourseIds(courseIds),
        CourseProgressModel.listByEnrollmentIds(enrollments.map((enrollment) => enrollment.id))
      ]);

      const moduleMap = normaliseModules(modules);
      const lessonMap = normaliseLessons(lessons);
      const progressByEnrollment = buildProgressLookup(progressRows);
      const lessonList = Array.from(lessonMap.values());

      const courseSummaries = enrollments.map((enrollment) => {
        const course = courses.find((record) => record.id === enrollment.courseId);
        const progressLookup = progressByEnrollment.get(enrollment.id) ?? new Map();
        if (!course) {
          return null;
        }
        return computeCourseSummary({
          course,
          enrollment,
          moduleMap,
          lessons: lessonList,
          progressLookup
        });
      }).filter(Boolean);

      return {
        enrollments: enrollments.map((enrollment) => ({
          id: enrollment.id,
          courseId: enrollment.courseId,
          publicId: enrollment.publicId,
          progressPercent: enrollment.progressPercent,
          status: enrollment.status,
          completedAt: toIsoString(enrollment.completedAt),
          startedAt: toIsoString(enrollment.startedAt),
          lastAccessedAt: toIsoString(enrollment.lastAccessedAt)
        })),
        courseSummaries,
        lessons: lessonList,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      log.error({ err: error }, 'Failed to load learner course progress');
      throw error;
    }
  }
}
