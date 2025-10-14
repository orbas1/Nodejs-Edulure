import db from '../config/database.js';
import logger from '../config/logger.js';

const ENROLLMENT_STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  INVITED: 'invited',
  CANCELLED: 'cancelled'
};

function normaliseCourseIdentifier(courseId) {
  if (typeof courseId !== 'string') {
    return String(courseId ?? '').trim();
  }
  return courseId.trim();
}

class CourseAccessService {
  async ensureCourseAccess(courseId, user, { allowInvited = false, requireActiveEnrollment = false } = {}) {
    const identifier = normaliseCourseIdentifier(courseId);
    if (!identifier) {
      const error = new Error('Course identifier missing');
      error.status = 400;
      throw error;
    }

    if (!user?.id) {
      const error = new Error('User context missing');
      error.status = 401;
      throw error;
    }

    const course = await db('courses as course')
      .select('course.id', 'course.slug', 'course.instructor_id as instructorId', 'course.status', 'course.is_published as isPublished')
      .where('course.slug', identifier)
      .first();

    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    const userId = Number(user.id);
    const instructorId = Number(course.instructorId);
    const userRole = user.role ?? 'learner';

    if (userRole === 'admin') {
      return { course, enrollment: null, access: 'admin' };
    }

    if (userRole === 'instructor' && userId === instructorId) {
      return { course, enrollment: null, access: 'instructor' };
    }

    const enrollment = await db('course_enrollments as enrollment')
      .select('enrollment.id', 'enrollment.status')
      .where('enrollment.course_id', course.id)
      .andWhere('enrollment.user_id', userId)
      .first();

    if (!enrollment) {
      logger.warn({ courseSlug: identifier, userId }, 'course access denied - no enrollment');
      const error = new Error('You are not enrolled in this course');
      error.status = 403;
      throw error;
    }

    const allowedStatuses = new Set([ENROLLMENT_STATUSES.ACTIVE, ENROLLMENT_STATUSES.COMPLETED]);
    if (allowInvited) {
      allowedStatuses.add(ENROLLMENT_STATUSES.INVITED);
    }

    if (requireActiveEnrollment && enrollment.status !== ENROLLMENT_STATUSES.ACTIVE) {
      logger.warn({ courseSlug: identifier, userId, status: enrollment.status }, 'course access denied - enrollment not active');
      const error = new Error('Course interaction requires an active enrollment');
      error.status = 403;
      throw error;
    }

    if (!allowedStatuses.has(enrollment.status)) {
      logger.warn({ courseSlug: identifier, userId, status: enrollment.status }, 'course access denied - invalid enrollment status');
      const error = new Error('Course is not available for your enrollment status');
      error.status = 403;
      throw error;
    }

    return { course, enrollment, access: 'learner' };
  }
}

const courseAccessService = new CourseAccessService();

export default courseAccessService;
