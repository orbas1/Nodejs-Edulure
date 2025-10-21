import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const warnSpy = vi.fn();

let coursesQuery;
let enrollmentsQuery;

const createQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  first: vi.fn()
});

const dbMock = vi.fn((table) => {
  if (table === 'courses as course') {
    return coursesQuery;
  }
  if (table === 'course_enrollments as enrollment') {
    return enrollmentsQuery;
  }
  throw new Error(`Unexpected table requested: ${table}`);
});

vi.mock('../src/config/database.js', () => ({
  default: dbMock
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    warn: warnSpy
  }
}));

const courseAccessServiceModulePromise = import('../src/services/CourseAccessService.js');

let courseAccessService;

beforeAll(async () => {
  ({ default: courseAccessService } = await courseAccessServiceModulePromise);
});

function setupCourse(courseRow) {
  coursesQuery.first.mockResolvedValue(courseRow);
}

function setupEnrollment(enrollmentRow) {
  enrollmentsQuery.first.mockResolvedValue(enrollmentRow);
}

describe('CourseAccessService.ensureCourseAccess', () => {
  beforeEach(() => {
    coursesQuery = createQueryBuilder();
    enrollmentsQuery = createQueryBuilder();
    dbMock.mockClear();
    warnSpy.mockReset();
  });

  it('throws when course identifier is missing', async () => {
    setupCourse(null);

    await expect(courseAccessService.ensureCourseAccess('', { id: 77 })).rejects.toMatchObject({
      message: 'Course identifier missing',
      status: 400
    });

    expect(coursesQuery.first).not.toHaveBeenCalled();
  });

  it('throws when user context is missing', async () => {
    setupCourse({});

    await expect(courseAccessService.ensureCourseAccess('growth-ops', null)).rejects.toMatchObject({
      message: 'User context missing',
      status: 401
    });
  });

  it('allows admin users to bypass enrollment checks', async () => {
    setupCourse({ id: 9, slug: 'growth-ops', instructorId: 44, status: 'published', isPublished: 1 });

    const result = await courseAccessService.ensureCourseAccess('growth-ops', { id: 12, role: 'admin' });

    expect(result).toEqual({
      course: expect.objectContaining({ slug: 'growth-ops' }),
      enrollment: null,
      access: 'admin'
    });
    expect(enrollmentsQuery.first).not.toHaveBeenCalled();
  });

  it('allows instructors to manage their own courses', async () => {
    setupCourse({ id: 9, slug: 'growth-ops', instructorId: 55, status: 'published', isPublished: 1 });

    const result = await courseAccessService.ensureCourseAccess('growth-ops', { id: 55, role: 'instructor' });

    expect(result).toEqual({
      course: expect.objectContaining({ id: 9 }),
      enrollment: null,
      access: 'instructor'
    });
  });

  it('throws when course does not exist', async () => {
    setupCourse(null);

    await expect(courseAccessService.ensureCourseAccess('missing-course', { id: 77, role: 'learner' })).rejects.toMatchObject({
      message: 'Course not found',
      status: 404
    });
  });

  it('throws when learner is not enrolled', async () => {
    setupCourse({ id: 9, slug: 'growth-ops', instructorId: 55, status: 'published', isPublished: 1 });
    setupEnrollment(null);

    await expect(courseAccessService.ensureCourseAccess('growth-ops', { id: 77, role: 'learner' })).rejects.toMatchObject({
      message: 'You are not enrolled in this course',
      status: 403
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ userId: 77, courseSlug: 'growth-ops' }), expect.stringContaining('no enrollment'));
  });

  it('rejects enrollments that are not active when active status is required', async () => {
    setupCourse({ id: 9, slug: 'growth-ops', instructorId: 55, status: 'published', isPublished: 1 });
    setupEnrollment({ id: 333, status: 'completed' });

    await expect(
      courseAccessService.ensureCourseAccess('growth-ops', { id: 77, role: 'learner' }, { requireActiveEnrollment: true })
    ).rejects.toMatchObject({
      message: 'Course interaction requires an active enrollment',
      status: 403
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }), expect.stringContaining('not active'));
  });

  it('rejects enrollment statuses that are not permitted', async () => {
    setupCourse({ id: 9, slug: 'growth-ops', instructorId: 55, status: 'published', isPublished: 1 });
    setupEnrollment({ id: 333, status: 'cancelled' });

    await expect(courseAccessService.ensureCourseAccess('growth-ops', { id: 77, role: 'learner' })).rejects.toMatchObject({
      message: 'Course is not available for your enrollment status',
      status: 403
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }), expect.stringContaining('invalid enrollment status'));
  });

  it('allows invited learners when explicitly enabled', async () => {
    setupCourse({ id: 9, slug: 'growth-ops', instructorId: 55, status: 'published', isPublished: 1 });
    setupEnrollment({ id: 333, status: 'invited' });

    const result = await courseAccessService.ensureCourseAccess(
      'growth-ops',
      { id: 77, role: 'learner' },
      { allowInvited: true }
    );

    expect(result).toEqual({
      course: expect.objectContaining({ id: 9 }),
      enrollment: expect.objectContaining({ status: 'invited' }),
      access: 'learner'
    });
  });
});
