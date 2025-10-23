import db from '../config/database.js';
import logger from '../config/logger.js';
import CourseModuleModel from '../models/CourseModuleModel.js';
import CourseLessonModel from '../models/CourseLessonModel.js';
import CourseProgressModel from '../models/CourseProgressModel.js';
import CourseEnrollmentModel from '../models/CourseEnrollmentModel.js';
import AchievementTemplateModel from '../models/AchievementTemplateModel.js';
import LearnerAchievementModel from '../models/LearnerAchievementModel.js';

const COMPLETION_THRESHOLD = 99.5;
const DEFAULT_COMPLETION_TEMPLATE_SLUG = 'course-completion-classic';

function normalisePercent(value, fallback = 0) {
  if (value == null) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, numeric));
}

function buildReleaseLabel(module) {
  if (!module) return 'Available immediately';
  if (typeof module.releaseOffsetDays === 'number' && module.releaseOffsetDays > 0) {
    return `Unlocks +${module.releaseOffsetDays} days after enrolment`;
  }
  if (module.metadata?.releaseNote) {
    return module.metadata.releaseNote;
  }
  return 'Available immediately';
}

function determineLessonStatus(lesson) {
  const releaseAt = lesson.releaseAt instanceof Date ? lesson.releaseAt : lesson.releaseAt ? new Date(lesson.releaseAt) : null;
  if (lesson.completed) {
    return 'completed';
  }
  if (releaseAt && releaseAt.getTime() > Date.now()) {
    return 'scheduled';
  }
  return 'available';
}

function createCertificateUrl({ enrollment, template }) {
  const safeSlug = template.slug.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  return `https://cdn.edulure.test/certificates/${safeSlug}/${enrollment.publicId ?? enrollment.id}.pdf`;
}

class LearnerProgressService {
  async getCourseOutline(courseId, userId, connection = db) {
    if (!courseId || !userId) {
      throw new Error('Course outline requires a course and user context');
    }

    const enrollment = await CourseEnrollmentModel.findByCourseAndUser(courseId, userId, connection);
    const [modules, lessons, progressRows] = await Promise.all([
      CourseModuleModel.listByCourseId(courseId, connection),
      CourseLessonModel.listByCourseIds([courseId], connection),
      enrollment ? CourseProgressModel.listByEnrollmentIds([enrollment.id], connection) : []
    ]);

    const progressMap = new Map();
    let trackedLessons = 0;
    let trackedPercentSum = 0;
    let completedLessons = 0;

    for (const entry of progressRows) {
      progressMap.set(entry.lessonId, entry);
      trackedLessons += 1;
      trackedPercentSum += normalisePercent(entry.progressPercent, entry.completed ? 100 : 0);
      if (entry.completed) {
        completedLessons += 1;
      }
    }

    const lessonsByModule = new Map();
    for (const lesson of lessons) {
      const progress = progressMap.get(lesson.id);
      const completed = progress ? Boolean(progress.completed) : false;
      const completedAt = progress?.completedAt ?? null;
      const progressPercent = progress ? normalisePercent(progress.progressPercent, completed ? 100 : 0) : 0;
      const status = determineLessonStatus({ ...lesson, completed });
      const hydratedLesson = {
        ...lesson,
        completed,
        completedAt,
        progressPercent,
        status,
        progressSource: progress?.progressSource ?? 'manual',
        progressMetadata: progress?.progressMetadata ?? {}
      };
      if (!lessonsByModule.has(lesson.moduleId)) {
        lessonsByModule.set(lesson.moduleId, []);
      }
      lessonsByModule.get(lesson.moduleId).push(hydratedLesson);
    }

    let totalLessons = lessons.length;
    if (totalLessons === 0 && enrollment) {
      const countResult = await connection('course_lessons')
        .where('course_id', courseId)
        .count('* as total')
        .first();
      totalLessons = Number(countResult?.total ?? 0);
    }

    const modulesWithLessons = modules.map((module) => {
      const moduleLessons = (lessonsByModule.get(module.id) ?? []).sort((a, b) => a.position - b.position);
      const moduleCompleted = moduleLessons.filter((lesson) => lesson.completed).length;
      const moduleProgressPercent = moduleLessons.length
        ? Math.round(
            (moduleLessons.reduce((sum, lesson) => sum + normalisePercent(lesson.progressPercent, lesson.completed ? 100 : 0), 0) /
              moduleLessons.length) *
              10
          ) / 10
        : 0;
      const nextLesson = moduleLessons.find((lesson) => !lesson.completed) ?? null;
      return {
        ...module,
        releaseLabel: buildReleaseLabel(module),
        lessons: moduleLessons,
        nextLesson,
        progress: {
          totalLessons: moduleLessons.length,
          completedLessons: moduleCompleted,
          completionPercent: moduleLessons.length ? Math.round((moduleCompleted / moduleLessons.length) * 1000) / 10 : 0,
          averagePercent: moduleProgressPercent
        }
      };
    });

    const aggregatedCompleted = modulesWithLessons.reduce(
      (acc, module) => acc + (module.progress?.completedLessons ?? 0),
      0
    );

    const lessonsWithProgress = modulesWithLessons.reduce(
      (acc, module) => acc + (module.progress?.totalLessons ?? 0),
      0
    );

    const totalCompleted = aggregatedCompleted || completedLessons;

    const totalTracked = lessonsWithProgress || trackedLessons || totalLessons;
    const resolvedLessonCount = totalTracked || lessonsWithProgress || totalLessons;
    const percentBase = totalTracked > 0 ? totalTracked : 1;
    const aggregatedPercent = Math.round(((trackedPercentSum + 0) / percentBase) * 10) / 10;
    const completionPercent = totalTracked
      ? Math.max(
          aggregatedPercent,
          Math.round(((totalCompleted / totalTracked) * 100) * 10) / 10
        )
      : normalisePercent(enrollment?.progressPercent ?? 0, 0);

    let certificate = null;
    let achievement = null;
    if (enrollment?.certificateTemplateId) {
      certificate = await AchievementTemplateModel.findById(enrollment.certificateTemplateId, connection);
      if (certificate) {
        achievement = await LearnerAchievementModel.findByUserCourseAndTemplate(
          userId,
          courseId,
          certificate.id,
          connection
        );
      }
    }

    return {
      enrollment,
      modules: modulesWithLessons,
      totals: {
        lessonCount: resolvedLessonCount,
        completedLessons: Math.min(resolvedLessonCount || 0, totalCompleted),
        progressPercent: Number.isFinite(completionPercent) ? Math.min(100, completionPercent) : 0
      },
      certificate: certificate
        ? {
            template: certificate,
            issuedAt: enrollment?.certificateIssuedAt ?? achievement?.issuedAt ?? null,
            certificateUrl: enrollment?.certificateUrl ?? achievement?.certificateUrl ?? null
          }
        : null,
      achievement
    };
  }

  async updateLessonProgress({
    courseId,
    userId,
    lessonSlug,
    progressPercent = 0,
    completed = false,
    progressSource = 'manual',
    progressMetadata = {},
    metadata = {}
  }) {
    if (!courseId || !userId) {
      throw new Error('Lesson progress requires course and user context');
    }
    if (!lessonSlug) {
      throw new Error('Lesson slug is required to update progress');
    }

    return db.transaction(async (trx) => {
      const enrollment = await CourseEnrollmentModel.findByCourseAndUser(courseId, userId, trx);
      if (!enrollment) {
        const error = new Error('Enrollment not found for course');
        error.status = 404;
        throw error;
      }

      const lesson = await CourseLessonModel.findBySlug(courseId, lessonSlug, trx);
      if (!lesson) {
        const error = new Error('Lesson not found for course');
        error.status = 404;
        throw error;
      }

      const effectiveCompleted = completed || normalisePercent(progressPercent, 0) >= COMPLETION_THRESHOLD;

      await CourseProgressModel.upsertProgress(
        {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          completed: effectiveCompleted,
          progressPercent: normalisePercent(progressPercent, effectiveCompleted ? 100 : 0),
          progressSource,
          progressMetadata,
          metadata
        },
        trx
      );

      const progressRows = await CourseProgressModel.listByEnrollmentIds([enrollment.id], trx);
      const lessonsCountResult = await trx('course_lessons')
        .where('course_id', courseId)
        .count('* as total')
        .first();
      const totalLessons = Number(lessonsCountResult?.total ?? 0);

      const completedLessons = progressRows.filter((entry) => entry.completed).length;
      const progressSum = progressRows.reduce(
        (sum, entry) => sum + normalisePercent(entry.progressPercent, entry.completed ? 100 : 0),
        0
      );

      const aggregatedPercent = totalLessons
        ? Math.round(((progressSum + 0) / Math.max(totalLessons, 1)) * 10) / 10
        : normalisePercent(enrollment.progressPercent ?? 0, 0);

      const courseCompleted = totalLessons > 0 && completedLessons >= totalLessons;
      const status = courseCompleted ? 'completed' : enrollment.status;

      const enrollmentUpdates = {
        progress_percent: Math.min(100, aggregatedPercent),
        last_accessed_at: trx.fn.now()
      };

      if (courseCompleted) {
        enrollmentUpdates.completed_at = enrollment.completedAt ?? trx.fn.now();
        enrollmentUpdates.status = 'completed';
      }

      let certificateDetails = null;
      if (courseCompleted && !enrollment.certificateTemplateId) {
        certificateDetails = await this.issueCompletionCertificate({
          enrollment,
          courseId,
          userId,
          progressPercent: Math.min(100, aggregatedPercent),
          trx
        });
        if (certificateDetails?.templateId) {
          enrollmentUpdates.certificate_template_id = certificateDetails.templateId;
          enrollmentUpdates.certificate_issued_at = certificateDetails.issuedAt;
          enrollmentUpdates.certificate_url = certificateDetails.certificateUrl;
        }
      }

      await CourseEnrollmentModel.updateById(enrollment.id, enrollmentUpdates, trx);

      const outline = await this.getCourseOutline(courseId, userId, trx);

      return {
        outline,
        certificate: certificateDetails,
        status,
        totals: outline.totals
      };
    });
  }

  async issueCompletionCertificate({ enrollment, courseId, userId, progressPercent, trx }) {
    try {
      let template = await AchievementTemplateModel.findBySlug(DEFAULT_COMPLETION_TEMPLATE_SLUG, trx);
      if (!template) {
        const [firstTemplate] = await AchievementTemplateModel.listActiveByType('course_completion', trx);
        template = firstTemplate ?? null;
      }

      if (!template) {
        logger.warn({ courseId, enrollmentId: enrollment.id }, 'No certificate template configured for course completion');
        return null;
      }

      const certificateUrl = createCertificateUrl({ enrollment, template });
      const achievement = await LearnerAchievementModel.upsertCourseAchievement(
        {
          userId,
          courseId,
          templateId: template.id,
          certificateUrl,
          progressSnapshot: {
            progressPercent,
            enrollmentStatus: 'completed'
          },
          metadata: {
            enrollmentId: enrollment.id
          }
        },
        trx
      );

      return {
        templateId: template.id,
        certificateUrl,
        issuedAt: achievement?.issuedAt ?? trx.fn.now(),
        achievement
      };
    } catch (error) {
      logger.error({ error, courseId, enrollmentId: enrollment.id }, 'Failed to issue completion certificate');
      return null;
    }
  }
}

const learnerProgressService = new LearnerProgressService();

export default learnerProgressService;
