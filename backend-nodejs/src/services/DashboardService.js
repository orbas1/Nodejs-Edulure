import crypto from 'crypto';

import logger from '../config/logger.js';
import OperatorDashboardService from './OperatorDashboardService.js';

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
let operatorDashboardService;
const log = logger.child({ service: 'DashboardService' });

function getOperatorDashboardService() {
  if (!operatorDashboardService) {
    operatorDashboardService = new OperatorDashboardService();
  }
  return operatorDashboardService;
}

export function formatCurrency(amountCents, currency = 'USD') {
  const amount = Number(amountCents ?? 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function resolveName(firstName, lastName, fallback) {
  const combined = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return combined || fallback;
}

export function buildAvatarUrl(email) {
  const hash = crypto
    .createHash('md5')
    .update(String(email ?? '').trim().toLowerCase())
    .digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=256&d=identicon`;
}

export function formatReleaseOffsetLabel(offsetDays) {
  if (offsetDays === 0) return 'Release day';
  if (offsetDays > 0) return `Day +${offsetDays}`;
  return `Day ${offsetDays}`;
}

export function humanizeRelativeTime(dateLike, referenceDate = new Date()) {
  if (!dateLike) return 'Just now';
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const diffMs = referenceDate.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.round(diffMonths / 12);
  return `${diffYears}y ago`;
}

function clampUtcDay(dateLike) {
  const date = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function resolveCompletionEntry(entry) {
  if (!entry) return null;
  const dateValue = entry.completedAt ?? entry.date ?? entry.timestamp ?? entry;
  const durationValue =
    entry.durationMinutes ?? entry.duration ?? entry.minutes ?? entry.studyMinutes ?? entry.totalMinutes ?? 0;

  const date = clampUtcDay(dateValue);
  if (!date) return null;

  const minutes = Number(durationValue ?? 0);
  return {
    date,
    isoDay: date.toISOString().slice(0, 10),
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0
  };
}

export function calculateLearningStreak(completionDates = [], referenceDate = new Date()) {
  const entries = completionDates.map(resolveCompletionEntry).filter(Boolean);
  if (entries.length === 0) {
    return {
      current: 0,
      longest: 0,
      totalDays: 0,
      currentRange: null,
      longestRange: null,
      lastCompletedAt: null
    };
  }

  const uniqueDays = new Map();
  for (const entry of entries) {
    if (!uniqueDays.has(entry.isoDay) || uniqueDays.get(entry.isoDay).date < entry.date) {
      uniqueDays.set(entry.isoDay, entry);
    }
  }

  const reference = clampUtcDay(referenceDate) ?? new Date();
  let current = 0;
  let cursor = new Date(reference);
  while (uniqueDays.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor = new Date(cursor.getTime() - DAY_IN_MS);
  }
  const currentRange =
    current > 0
      ? {
          start: new Date(cursor.getTime() + DAY_IN_MS).toISOString(),
          end: new Date(reference).toISOString()
        }
      : null;

  const sortedDays = Array.from(uniqueDays.keys()).sort();
  let longest = 0;
  let longestRange = null;
  let streak = 0;
  let streakStart = null;
  let previous = null;
  for (const isoDay of sortedDays) {
    if (previous) {
      const diff = Math.round((new Date(`${isoDay}T00:00:00Z`) - new Date(`${previous}T00:00:00Z`)) / DAY_IN_MS);
      if (diff === 1) {
        streak += 1;
      } else {
        streak = 1;
        streakStart = isoDay;
      }
    } else {
      streak = 1;
      streakStart = isoDay;
    }

    if (streak > longest) {
      longest = streak;
      longestRange = {
        start: new Date(`${streakStart}T00:00:00Z`).toISOString(),
        end: new Date(`${isoDay}T00:00:00Z`).toISOString()
      };
    }

    previous = isoDay;
  }

  const lastCompletedIso = sortedDays[sortedDays.length - 1];

  return {
    current,
    longest,
    totalDays: uniqueDays.size,
    currentRange,
    longestRange,
    lastCompletedAt: lastCompletedIso ? new Date(`${lastCompletedIso}T00:00:00Z`).toISOString() : null
  };
}

export function buildLearningPace(completions = [], referenceDate = new Date()) {
  const reference = clampUtcDay(referenceDate) ?? new Date();
  const start = new Date(reference.getTime() - 6 * DAY_IN_MS);
  const buckets = new Map();

  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start.getTime() + i * DAY_IN_MS);
    const isoDay = day.toISOString().slice(0, 10);
    buckets.set(isoDay, { isoDay, minutes: 0 });
  }

  for (const entry of completions.map(resolveCompletionEntry).filter(Boolean)) {
    if (!buckets.has(entry.isoDay)) continue;
    const bucket = buckets.get(entry.isoDay);
    bucket.minutes += entry.minutes;
  }

  const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  return Array.from(buckets.values()).map(({ isoDay, minutes }) => ({
    day: dayFormatter.format(new Date(`${isoDay}T00:00:00Z`)),
    minutes,
    isoDate: isoDay,
    effortLevel: minutes >= 90 ? 'intense' : minutes >= 45 ? 'steady' : minutes > 0 ? 'light' : 'idle'
  }));
}

function parseMonetizationTier(settings) {
  if (!settings) {
    return { defaultCommission: { tiers: [] } };
  }
  return settings;
}

export function buildAffiliateOverview({
  affiliates = [],
  affiliatePayouts = [],
  paymentIntents = [],
  memberships = [],
  monetizationSettings = {},
  now = new Date()
} = {}) {
  const normalizedSettings = parseMonetizationTier(monetizationSettings.affiliate);

  const programs = affiliates.map((affiliate) => {
    const codes = [affiliate.referralCode].filter(Boolean);
    const intents = paymentIntents.filter((intent) => {
      const metadata = safeJsonParse(intent.metadata, {});
      return codes.includes(metadata.referralCode);
    });

    const totalVolumeCents = intents.reduce(
      (total, intent) => total + Math.max(0, Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0)),
      0
    );

    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS);
    const recentVolumeCents = intents
      .filter((intent) => {
        const capturedAt = intent.capturedAt ? new Date(intent.capturedAt) : null;
        return capturedAt && capturedAt >= thirtyDaysAgo;
      })
      .reduce(
        (total, intent) => total + Math.max(0, Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0)),
        0
      );

    const conversions = intents.filter(
      (intent) => Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0) > 0
    );
    const conversions30d = conversions.filter((intent) => {
      const capturedAt = intent.capturedAt ? new Date(intent.capturedAt) : null;
      return capturedAt && capturedAt >= thirtyDaysAgo;
    });

    const programmeMembership = memberships.find((membership) => membership.communityId === affiliate.communityId);

    return {
      id: affiliate.id,
      referralCode: affiliate.referralCode,
      community: {
        id: affiliate.communityId,
        name: affiliate.communityName ?? programmeMembership?.communityName ?? null,
        slug: programmeMembership?.communitySlug ?? null
      },
      status: affiliate.status ?? 'pending',
      earnings: {
        totalCents: Number(affiliate.totalEarnedCents ?? 0),
        totalFormatted: formatCurrency(affiliate.totalEarnedCents ?? 0),
        paidCents: Number(affiliate.totalPaidCents ?? 0),
        outstandingCents: Math.max(0, Number(affiliate.totalEarnedCents ?? 0) - Number(affiliate.totalPaidCents ?? 0))
      },
      performance: {
        conversions: conversions.length,
        conversions30d: conversions30d.length,
        volumeCents: totalVolumeCents,
        volumeFormatted: formatCurrency(totalVolumeCents),
        volume30dCents: recentVolumeCents,
        volume30dFormatted: formatCurrency(recentVolumeCents)
      },
      commission: {
        rateBps: affiliate.commissionRateBps ?? normalizedSettings?.defaultCommission?.tiers?.[0]?.rateBps ?? 0
      }
    };
  });

  const outstandingCents = programs.reduce((total, program) => total + program.earnings.outstandingCents, 0);

  const nextPayout = affiliatePayouts
    .filter((payout) => ['scheduled', 'pending'].includes(payout.status))
    .map((payout) => ({
      ...payout,
      scheduledDate: payout.scheduledAt ? new Date(payout.scheduledAt) : null
    }))
    .sort((a, b) => {
      const aTime = a.scheduledDate ? a.scheduledDate.getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.scheduledDate ? b.scheduledDate.getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    })[0] ?? null;

  const statusPriority = new Map([
    ['scheduled', 0],
    ['pending', 1],
    ['processing', 1],
    ['completed', 2],
    ['cancelled', 3]
  ]);

  const payouts = affiliatePayouts
    .map((payout) => ({
      id: payout.id,
      affiliateId: payout.affiliateId,
      status: payout.status,
      amountCents: Number(payout.amountCents ?? 0),
      amountFormatted: formatCurrency(payout.amountCents ?? 0),
      scheduledAt: payout.scheduledAt ? new Date(payout.scheduledAt) : null,
      processedAt: payout.processedAt ? new Date(payout.processedAt) : null
    }))
    .sort((a, b) => {
      const statusRankA = statusPriority.get(a.status) ?? 99;
      const statusRankB = statusPriority.get(b.status) ?? 99;
      if (statusRankA !== statusRankB) return statusRankA - statusRankB;
      const aTime = a.scheduledAt ? a.scheduledAt.getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.scheduledAt ? b.scheduledAt.getTime() : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      const aProcessed = a.processedAt ? a.processedAt.getTime() : Number.POSITIVE_INFINITY;
      const bProcessed = b.processedAt ? b.processedAt.getTime() : Number.POSITIVE_INFINITY;
      if (aProcessed !== bProcessed) return aProcessed - bProcessed;
      return String(a.id).localeCompare(String(b.id));
    });

  const pendingApplications = programs.filter((program) => program.status === 'pending').length;

  const actions = [];
  if (programs.length === 0) {
    actions.push('Invite high-performing learners into the affiliate programme.');
  }
  if (outstandingCents > 0) {
    actions.push(`Release ${formatCurrency(outstandingCents)} in pending affiliate payouts.`);
  }
  if (pendingApplications > 0) {
    actions.push(`Review ${pendingApplications} pending affiliate application${pendingApplications === 1 ? '' : 's'}.`);
  }

  return {
    programs,
    payouts,
    summary: {
      totals: {
        programCount: programs.length,
        outstandingCents,
        outstandingFormatted: formatCurrency(outstandingCents)
      },
      nextPayout: nextPayout
        ? {
            id: nextPayout.id,
            affiliateId: nextPayout.affiliateId,
            amount: formatCurrency(nextPayout.amountCents),
            scheduledAt: nextPayout.scheduledDate
          }
        : null
    },
    actions
  };
}

function aggregateTutorAvailability({ availability = [], bookings = [], now }) {
  const byTutor = new Map();
  availability.forEach((slot) => {
    const tutorId = Number(slot.tutorId);
    if (!Number.isFinite(tutorId)) return;
    const record = byTutor.get(tutorId) ?? { slots: 0, learners: new Set() };
    record.slots += 1;
    byTutor.set(tutorId, record);
  });

  bookings.forEach((booking) => {
    const tutorId = Number(booking.tutorId);
    if (!Number.isFinite(tutorId)) return;
    if (!['confirmed', 'requested'].includes(booking.status)) return;
    const record = byTutor.get(tutorId) ?? { slots: 0, learners: new Set() };
    const learnerName = resolveName(booking.learnerFirstName, booking.learnerLastName, 'Learner');
    record.learners.add(learnerName);
    if (booking.status === 'confirmed' && booking.scheduledStart) {
      const start = new Date(booking.scheduledStart);
      if (start >= now) {
        record.slots += 1;
      }
    }
    byTutor.set(tutorId, record);
  });

  return Array.from(byTutor.entries()).map(([tutorId, record]) => ({
    tutorId,
    slotsCount: record.slots,
    learnersCount: record.learners.size
  }));
}

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ku', 'ps', 'ur']);

function createLanguageDisplay() {
  try {
    const display = new Intl.DisplayNames(['en'], { type: 'language' });
    return (code) => {
      if (!code) return 'Unknown';
      return display.of(code) ?? code;
    };
  } catch (_error) {
    return (code) => code ?? 'Unknown';
  }
}

function isRightToLeft(code) {
  if (!code) return false;
  const normalised = String(code).toLowerCase();
  return RTL_LANGUAGES.has(normalised);
}

function ensureMap(value) {
  if (!value) return new Map();
  if (value instanceof Map) return value;
  if (Array.isArray(value)) {
    return new Map(value);
  }
  return new Map(Object.entries(value));
}

function resolveAssignmentDueDate(assignment, course) {
  const releaseAt = course?.releaseAt ? new Date(course.releaseAt) : null;
  if (!releaseAt || Number.isNaN(releaseAt.getTime())) {
    return null;
  }
  const offsetDays = Number(assignment.dueOffsetDays ?? 0);
  if (!Number.isFinite(offsetDays)) {
    return null;
  }
  return new Date(releaseAt.getTime() + offsetDays * DAY_IN_MS);
}

function resolveNextLesson(lessons = [], stats = {}) {
  if (!lessons.length) return null;
  const completed = Number(stats.completedLessons ?? 0);
  const index = Math.min(completed, lessons.length - 1);
  const lesson = lessons[index];
  if (!lesson) return null;
  return lesson.title ?? null;
}

function determineRiskLevel(enrollment, stats, now) {
  if (enrollment.status !== 'active') {
    return 'low';
  }
  const startedAt = enrollment.startedAt ? new Date(enrollment.startedAt) : null;
  const progressPercent = Number(enrollment.progressPercent ?? (stats?.completionRatio ?? 0) * 100);
  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    return progressPercent < 20 ? 'medium' : 'low';
  }
  const daysSinceStart = Math.floor((now.getTime() - startedAt.getTime()) / DAY_IN_MS);
  if (daysSinceStart >= 21 && progressPercent < 30) {
    return 'critical';
  }
  if (daysSinceStart >= 14 && progressPercent < 40) {
    return 'high';
  }
  if (daysSinceStart >= 7 && progressPercent < 50) {
    return 'medium';
  }
  return 'low';
}

function buildCourseWorkspace({
  courses = [],
  modules = [],
  lessons = [],
  assignments = [],
  enrollments = [],
  courseProgress = [],
  creationProjects = [],
  creationCollaborators = new Map(),
  creationSessions = new Map(),
  collaboratorDirectory = new Map(),
  now = new Date()
} = {}) {
  const workspace = {
    pipeline: [],
    production: [],
    catalogue: [],
    analytics: { cohortHealth: [], velocity: { averageCompletion: 0, trending: [] } },
    assignments: {
      summary: { total: 0, dueThisWeek: 0, requiresReview: 0 },
      queues: { upcoming: [], review: [], automation: [] }
    },
    authoring: {
      drafts: [],
      activeSessions: [],
      localisationCoverage: { totalLanguages: 0, publishedLanguages: 0, missing: [] }
    },
    learners: { roster: [], riskAlerts: [] }
  };

  if (!courses.length) {
    return workspace;
  }

  const languageLabel = createLanguageDisplay();
  const courseById = new Map();
  courses.forEach((course) => {
    const metadata = safeJsonParse(course.metadata, {});
    courseById.set(course.id, { ...course, metadata });
  });

  const modulesByCourse = new Map();
  modules.forEach((module) => {
    const list = modulesByCourse.get(module.courseId) ?? [];
    list.push({ ...module, metadata: safeJsonParse(module.metadata, {}) });
    modulesByCourse.set(module.courseId, list);
  });
  modulesByCourse.forEach((list) => {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  });

  const lessonsByCourse = new Map();
  lessons.forEach((lesson) => {
    const list = lessonsByCourse.get(lesson.courseId) ?? [];
    list.push({ ...lesson, metadata: safeJsonParse(lesson.metadata, {}) });
    lessonsByCourse.set(lesson.courseId, list);
  });
  lessonsByCourse.forEach((list) => {
    list.sort((a, b) => {
      const moduleOrder = (a.moduleId ?? 0) - (b.moduleId ?? 0);
      if (moduleOrder !== 0) return moduleOrder;
      return (a.position ?? 0) - (b.position ?? 0);
    });
  });

  const assignmentsByCourse = new Map();
  assignments.forEach((assignment) => {
    const list = assignmentsByCourse.get(assignment.courseId) ?? [];
    list.push({ ...assignment, metadata: safeJsonParse(assignment.metadata, {}) });
    assignmentsByCourse.set(assignment.courseId, list);
  });

  const enrollmentsByCourse = new Map();
  enrollments.forEach((enrollment) => {
    const list = enrollmentsByCourse.get(enrollment.courseId) ?? [];
    list.push({ ...enrollment, metadata: safeJsonParse(enrollment.metadata, {}) });
    enrollmentsByCourse.set(enrollment.courseId, list);
  });

  const progressByEnrollment = new Map();
  courseProgress.forEach((entry) => {
    const stats = progressByEnrollment.get(entry.enrollmentId) ?? {
      totalLessons: 0,
      completedLessons: 0,
      lastCompletedAt: null,
      notes: [],
      lastLocation: null
    };
    stats.totalLessons += 1;
    if (entry.completed) {
      stats.completedLessons += 1;
      const completedAt = entry.completedAt ? new Date(entry.completedAt) : null;
      if (completedAt && (!stats.lastCompletedAt || completedAt > stats.lastCompletedAt)) {
        stats.lastCompletedAt = completedAt;
      }
    }
    const metadata = safeJsonParse(entry.metadata, {});
    if (metadata.note) {
      stats.notes.push(metadata.note);
    }
    if (metadata.lastLocation && !stats.lastLocation) {
      stats.lastLocation = metadata.lastLocation;
    }
    progressByEnrollment.set(entry.enrollmentId, stats);
  });
  progressByEnrollment.forEach((stats) => {
    stats.completionRatio = stats.totalLessons > 0 ? stats.completedLessons / stats.totalLessons : 0;
  });

  const catalogue = courses.map((course) => {
    const modulesForCourse = modulesByCourse.get(course.id) ?? [];
    const lessonsForCourse = lessonsByCourse.get(course.id) ?? [];
    const courseEnrollments = enrollmentsByCourse.get(course.id) ?? [];
    const activeEnrollments = courseEnrollments.filter((enrollment) => enrollment.status === 'active');
    const completedEnrollments = courseEnrollments.filter((enrollment) => enrollment.status === 'completed');
    const totalEnrollments = courseEnrollments.length;
    const averageProgress = totalEnrollments
      ? Math.round(
          courseEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.progressPercent ?? 0), 0) /
            totalEnrollments
        )
      : 0;
    const languages = Array.isArray(course.languages) ? course.languages : [];
    const publishedLocales = Array.isArray(course.metadata?.publishedLocales)
      ? course.metadata.publishedLocales
      : [];

    const languageEntries = languages.map((code) => {
      const lower = String(code).toLowerCase();
      const published = publishedLocales.includes(code) || publishedLocales.includes(lower);
      return {
        code: lower,
        label: languageLabel(lower),
        direction: isRightToLeft(lower) ? 'rtl' : 'ltr',
        published
      };
    });

    return {
      id: course.publicId ?? `course-${course.id}`,
      courseId: course.id,
      title: course.title,
      summary: course.summary,
      status: course.status,
      format: course.deliveryFormat ?? course.metadata?.format ?? 'cohort',
      languages: languageEntries,
      price: {
        currency: course.priceCurrency,
        amountCents: Number(course.priceAmount ?? 0),
        formatted: formatCurrency(course.priceAmount ?? 0, course.priceCurrency)
      },
      rating: {
        average: Number(course.ratingAverage ?? 0),
        count: Number(course.ratingCount ?? 0)
      },
      learners: {
        total: Number(course.enrolmentCount ?? totalEnrollments),
        active: activeEnrollments.length,
        completed: completedEnrollments.length
      },
      modules: modulesForCourse.length,
      lessons: lessonsForCourse.length,
      averageProgress,
      releaseAt: course.releaseAt ? course.releaseAt.toISOString() : null,
      updatedAt: course.updatedAt ? course.updatedAt.toISOString() : null,
      localisation: {
        totalLanguages: languageEntries.length,
        published: languageEntries.filter((entry) => entry.published).length,
        missing: languageEntries.filter((entry) => !entry.published).map((entry) => entry.code)
      },
      automation: course.metadata?.dripCampaign ?? null,
      refresherLessons: Array.isArray(course.metadata?.refresherLessons) ? course.metadata.refresherLessons : []
    };
  });

  workspace.catalogue = catalogue;

  const cohortMap = new Map();
  enrollments.forEach((enrollment) => {
    const course = courseById.get(enrollment.courseId);
    if (!course) return;
    const cohortLabel = enrollment.metadata?.cohort ?? 'General';
    const key = `${enrollment.courseId}:${cohortLabel}`;
    let record = cohortMap.get(key);
    if (!record) {
      record = {
        id: `cohort-${enrollment.courseId}-${cohortLabel}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
        courseId: enrollment.courseId,
        courseTitle: course.title,
        label: cohortLabel,
        enrollments: [],
        firstStartAt: null,
        releaseAt: course.releaseAt ?? null
      };
      cohortMap.set(key, record);
    }
    record.enrollments.push(enrollment);
    if (enrollment.startedAt) {
      if (!record.firstStartAt || enrollment.startedAt < record.firstStartAt) {
        record.firstStartAt = enrollment.startedAt;
      }
    }
  });

  const pipeline = [];
  const cohortHealth = [];
  cohortMap.forEach((cohort) => {
    const total = cohort.enrollments.length;
    const activeCount = cohort.enrollments.filter((enr) => enr.status === 'active').length;
    const completedCount = cohort.enrollments.filter((enr) => enr.status === 'completed').length;
    const invitedCount = cohort.enrollments.filter((enr) => enr.status === 'invited').length;
    const averageProgress = total
      ? Math.round(
          cohort.enrollments.reduce((sum, enr) => sum + Number(enr.progressPercent ?? 0), 0) / total
        )
      : 0;
    const startDate = cohort.firstStartAt ?? cohort.releaseAt;
    const stage = completedCount === total && total > 0 ? 'Completed' : activeCount > 0 ? 'In flight' : 'Scheduled';
    pipeline.push({
      id: cohort.id,
      name: `${cohort.courseTitle} · ${cohort.label}`,
      stage,
      startDate: startDate ? formatDateTime(startDate, { dateStyle: 'medium', timeStyle: undefined }) : 'TBD',
      learners: activeCount + invitedCount
    });

    const atRiskLearners = cohort.enrollments.filter((enr) => {
      const stats = progressByEnrollment.get(enr.id);
      return determineRiskLevel(enr, stats, now) !== 'low';
    });

    const lastActivityAt = cohort.enrollments.reduce((latest, enr) => {
      const stats = progressByEnrollment.get(enr.id);
      if (stats?.lastCompletedAt && (!latest || stats.lastCompletedAt > latest)) {
        return stats.lastCompletedAt;
      }
      return latest;
    }, null);

    cohortHealth.push({
      id: cohort.id,
      courseId: cohort.courseId,
      courseTitle: cohort.courseTitle,
      cohort: cohort.label,
      stage,
      activeLearners: activeCount,
      completionRate: total ? Number((completedCount / total).toFixed(2)) : 0,
      averageProgress,
      atRiskLearners: atRiskLearners.length,
      lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
      launchAt: startDate ? startDate.toISOString() : null
    });
  });

  workspace.pipeline = pipeline;
  workspace.analytics.cohortHealth = cohortHealth;

  const averageCompletion = cohortHealth.length
    ? Math.round(
        (cohortHealth.reduce((sum, entry) => sum + entry.completionRate, 0) / cohortHealth.length) * 100
      )
    : 0;
  const trending = [...catalogue]
    .sort((a, b) => b.averageProgress - a.averageProgress)
    .slice(0, 3)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      averageProgress: entry.averageProgress,
      learners: entry.learners.active + entry.learners.completed,
      localisation: entry.localisation
    }));
  workspace.analytics.velocity = { averageCompletion, trending };

  const production = [];
  modulesByCourse.forEach((moduleList, courseId) => {
    const course = courseById.get(courseId);
    moduleList.forEach((module) => {
      const creationMeta = safeJsonParse(module.metadata?.creation, {});
      production.push({
        id: `module-${module.id}`,
        asset: `${course?.title ?? 'Course'} · ${module.title}`,
        status: creationMeta.status ?? 'Backlog',
        owner: creationMeta.owner ?? resolveName(course?.instructorFirstName, course?.instructorLastName, 'Owner'),
        gating: module.metadata?.drip?.gating ?? null,
        updatedAt: module.updatedAt ? module.updatedAt.toISOString() : null
      });
    });
  });
  assignments.forEach((assignment) => {
    const course = courseById.get(assignment.courseId);
    const metadata = safeJsonParse(assignment.metadata, {});
    const dueDate = resolveAssignmentDueDate(assignment, course);
    production.push({
      id: `assignment-${assignment.id}`,
      asset: `${course?.title ?? 'Course'} · ${assignment.title}`,
      status: metadata.requiresReview ? 'Awaiting review' : 'Scheduled',
      owner: metadata.owner ?? 'Curriculum',
      dueDate: dueDate ? formatDateTime(dueDate, { dateStyle: 'medium', timeStyle: undefined }) : 'TBD'
    });
  });
  workspace.production = production;

  const assignmentEntries = assignments.map((assignment) => {
    const course = courseById.get(assignment.courseId);
    const metadata = safeJsonParse(assignment.metadata, {});
    const dueDate = resolveAssignmentDueDate(assignment, course);
    return {
      id: assignment.id,
      courseId: assignment.courseId,
      courseTitle: course?.title ?? 'Course',
      title: assignment.title,
      dueDate,
      dueLabel: dueDate ? formatDateTime(dueDate, { dateStyle: 'medium', timeStyle: undefined }) : 'TBD',
      requiresReview: Boolean(metadata.requiresReview),
      workflow: metadata.workflow ?? metadata.automation?.mode ?? 'manual',
      owner: metadata.owner ?? null
    };
  });
  const upcomingAssignments = assignmentEntries.filter(
    (entry) => entry.dueDate && entry.dueDate >= now && entry.dueDate.getTime() - now.getTime() <= 7 * DAY_IN_MS
  );
  const reviewQueue = assignmentEntries.filter((entry) => entry.requiresReview);
  const automationQueue = assignmentEntries.filter((entry) => String(entry.workflow).includes('automation'));
  workspace.assignments = {
    summary: {
      total: assignmentEntries.length,
      dueThisWeek: upcomingAssignments.length,
      requiresReview: reviewQueue.length
    },
    queues: {
      upcoming: upcomingAssignments.map((entry) => ({
        id: entry.id,
        title: entry.title,
        courseTitle: entry.courseTitle,
        dueAt: entry.dueDate ? entry.dueDate.toISOString() : null,
        owner: entry.owner
      })),
      review: reviewQueue.map((entry) => ({
        id: entry.id,
        title: entry.title,
        courseTitle: entry.courseTitle,
        owner: entry.owner
      })),
      automation: automationQueue.map((entry) => ({
        id: entry.id,
        title: entry.title,
        courseTitle: entry.courseTitle,
        mode: entry.workflow
      }))
    }
  };

  const collaboratorMap = ensureMap(creationCollaborators);
  const sessionMap = ensureMap(creationSessions);
  const drafts = creationProjects.map((project) => {
    const collaborators = collaboratorMap.get(project.id) ?? [];
    const sessions = sessionMap.get(project.id) ?? [];
    const collaboratorEntries = collaborators.map((collaborator) => {
      const user = collaboratorDirectory.get(collaborator.userId);
      return {
        id: collaborator.userId,
        role: collaborator.role ?? 'editor',
        displayName: user ? resolveName(user.firstName, user.lastName, user.email) : `User ${collaborator.userId}`,
        permissions: Array.isArray(collaborator.permissions) ? collaborator.permissions : []
      };
    });
    const sessionEntries = sessions.map((session) => {
      const user = collaboratorDirectory.get(session.participantId);
      return {
        id: session.publicId ?? session.id,
        participantId: session.participantId,
        participant: user ? resolveName(user.firstName, user.lastName, user.email) : `User ${session.participantId}`,
        role: session.role ?? 'viewer',
        capabilities: Array.isArray(session.capabilities) ? session.capabilities : [],
        joinedAt: session.joinedAt ? new Date(session.joinedAt).toISOString() : null
      };
    });
    return {
      id: project.publicId ?? `project-${project.id}`,
      projectId: project.id,
      courseId: project.metadata?.courseId ?? null,
      title: project.title,
      status: project.status,
      updatedAt: project.updatedAt ? project.updatedAt.toISOString?.() ?? new Date(project.updatedAt).toISOString() : null,
      outlineCount: Array.isArray(project.contentOutline) ? project.contentOutline.length : 0,
      collaborators: collaboratorEntries,
      activeSessions: sessionEntries,
      locales: Array.isArray(project.metadata?.locales) ? project.metadata.locales : [],
      complianceNotes: Array.isArray(project.complianceNotes) ? project.complianceNotes : [],
      publishingChannels: Array.isArray(project.publishingChannels) ? project.publishingChannels : [],
      analyticsTargets: project.analyticsTargets ?? {}
    };
  });

  const activeSessions = [];
  drafts.forEach((draft) => {
    draft.activeSessions.forEach((session) => {
      activeSessions.push({
        ...session,
        projectId: draft.projectId,
        projectPublicId: draft.id,
        projectTitle: draft.title
      });
    });
  });

  const languageUniverse = new Set();
  const publishedUniverse = new Set();
  catalogue.forEach((entry) => {
    entry.languages.forEach((language) => {
      languageUniverse.add(language.code);
      if (language.published) {
        publishedUniverse.add(language.code);
      }
    });
  });
  drafts.forEach((draft) => {
    draft.locales.forEach((locale) => {
      const code = String(locale).toLowerCase();
      languageUniverse.add(code);
      if (draft.status === 'published' || draft.status === 'approved') {
        publishedUniverse.add(code);
      }
    });
  });
  const missingLanguages = Array.from(languageUniverse).filter((code) => !publishedUniverse.has(code));
  workspace.authoring = {
    drafts,
    activeSessions,
    localisationCoverage: {
      totalLanguages: languageUniverse.size,
      publishedLanguages: publishedUniverse.size,
      missing: missingLanguages
    }
  };

  const roster = enrollments.map((enrollment) => {
    const stats = progressByEnrollment.get(enrollment.id) ?? { completionRatio: 0, lastCompletedAt: null };
    const course = courseById.get(enrollment.courseId);
    const user = collaboratorDirectory.get(enrollment.userId);
    const lessonsForCourse = lessonsByCourse.get(enrollment.courseId) ?? [];
    return {
      id: enrollment.publicId ?? `enrollment-${enrollment.id}`,
      learnerId: enrollment.userId,
      name: user ? resolveName(user.firstName, user.lastName, user.email) : `Learner ${enrollment.userId}`,
      courseId: enrollment.courseId,
      courseTitle: course?.title ?? 'Course',
      status: enrollment.status,
      progressPercent: Number.isFinite(Number(enrollment.progressPercent))
        ? Number(enrollment.progressPercent)
        : Math.round((stats.completionRatio ?? 0) * 100),
      cohort: enrollment.metadata?.cohort ?? 'General',
      lastActivityAt: stats.lastCompletedAt ? stats.lastCompletedAt.toISOString() : null,
      nextLesson: resolveNextLesson(lessonsForCourse, stats),
      riskLevel: determineRiskLevel(enrollment, stats, now),
      notes: stats.notes ?? [],
      lastLocation: stats.lastLocation ?? null
    };
  });

  const riskPriority = { critical: 0, high: 1, medium: 2, low: 3 };
  const riskAlerts = roster
    .filter((entry) => entry.riskLevel === 'critical' || entry.riskLevel === 'high')
    .sort((a, b) => {
      const riskDelta = (riskPriority[a.riskLevel] ?? 3) - (riskPriority[b.riskLevel] ?? 3);
      if (riskDelta !== 0) return riskDelta;
      return (a.progressPercent ?? 0) - (b.progressPercent ?? 0);
    })
    .slice(0, 10);

  workspace.learners = { roster, riskAlerts };

  return workspace;
}

function buildTutorNotifications({ bookings = [], now }) {
  const notifications = [];
  bookings
    .filter((booking) => booking.status === 'requested')
    .forEach((booking) => {
      notifications.push({
        id: `booking-request-${booking.id}`,
        type: 'request',
        message: `New mentorship request from ${resolveName(
          booking.learnerFirstName,
          booking.learnerLastName,
          'Learner'
        )}`,
        receivedAt: booking.requestedAt ? new Date(booking.requestedAt) : now
      });
    });
  bookings
    .filter((booking) => booking.status === 'confirmed' && booking.scheduledStart)
    .forEach((booking) => {
      notifications.push({
        id: `booking-upcoming-${booking.id}`,
        type: 'upcoming',
        message: `Upcoming session · ${booking.metadata?.topic ?? 'Mentorship session'}`,
        scheduledFor: formatDateTime(booking.scheduledStart, { dateStyle: 'medium', timeStyle: 'short' })
      });
    });
  return notifications;
}

function formatDateTime(dateLike, options) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

function resolveAdPlacement(campaign) {
  const metadata = safeJsonParse(campaign.metadata, {});
  if (typeof metadata.featureFlag === 'string' && metadata.featureFlag.includes('explorer')) {
    return 'Explorer';
  }
  if (metadata.promotedCommunityId) {
    return 'Community spotlight';
  }
  return 'Learning feed';
}

function parseTargetingList(value) {
  const parsed = safeJsonParse(value, []);
  return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
}

export function buildInstructorDashboard({
  user,
  now = new Date(),
  courses = [],
  courseEnrollments = [],
  modules = [],
  lessons = [],
  assignments = [],
  courseProgress = [],
  creationProjects = [],
  creationCollaborators = new Map(),
  creationSessions = new Map(),
  collaboratorDirectory = new Map(),
  tutorProfiles = [],
  tutorAvailability = [],
  tutorBookings = [],
  liveClassrooms = [],
  assets = [],
  assetEvents = [],
  communityMemberships = [],
  communityStats = [],
  communityResources = [],
  communityPosts = [],
  adsCampaigns = [],
  adsMetrics = [],
  paywallTiers = [],
  communitySubscriptions = [],
  ebookRows = [],
  ebookProgressRows = []
} = {}) {
  const hasSignals =
    courses.length ||
    communityMemberships.length ||
    tutorProfiles.length ||
    tutorBookings.length ||
    liveClassrooms.length ||
    adsCampaigns.length;

  if (!hasSignals) {
    return null;
  }

  const activeEnrollments = courseEnrollments.filter((enrollment) => enrollment.status === 'active');
  const recentEnrollments = activeEnrollments.filter((enrollment) => {
    if (!enrollment.startedAt) return false;
    const startedAt = new Date(enrollment.startedAt);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS);
    return startedAt >= thirtyDaysAgo;
  });

  const completedEnrollments = courseEnrollments.filter((enrollment) => enrollment.status === 'completed');
  const averageCompletion = courseEnrollments.length
    ? Math.round((completedEnrollments.length / courseEnrollments.length) * 100)
    : 0;

  const upcomingLive = liveClassrooms
    .map((session) => ({
      ...session,
      startAt: session.startAt ? new Date(session.startAt) : null
    }))
    .filter((session) => session.startAt && session.startAt >= now);

  const metrics = [
    {
      label: 'Active learners',
      value: `${activeEnrollments.length}`,
      change: `+${recentEnrollments.length} last 30d`
    },
    {
      label: 'Avg completion',
      value: `${averageCompletion}%`,
      change: `${completedEnrollments.length} cohorts completed`
    },
    {
      label: 'Upcoming sessions',
      value: `${upcomingLive.length}`,
      change: `${tutorAvailability.length} tutor slot${tutorAvailability.length === 1 ? '' : 's'}`
    }
  ];

  const pipelineBookings = tutorBookings
    .filter((booking) => booking.status === 'requested')
    .map((booking) => ({
      id: `booking-${booking.id}`,
      status: 'Requested',
      learner: resolveName(booking.learnerFirstName, booking.learnerLastName, 'Learner'),
      requested: booking.requestedAt ? humanizeRelativeTime(booking.requestedAt, now) : 'Awaiting review',
      topic: safeJsonParse(booking.metadata, {}).topic ?? 'Mentorship session'
    }));

  const roster = tutorProfiles.map((profile) => ({
    id: profile.id,
    name: profile.displayName ?? resolveName(user.firstName, user.lastName, user.email),
    status: profile.status ?? 'Active',
    headline: profile.headline ?? null,
    hourlyRate: profile.hourlyRateAmount ? formatCurrency(profile.hourlyRateAmount, profile.hourlyRateCurrency) : null,
    rating: profile.ratingAverage ? `${profile.ratingAverage.toFixed(1)} (${profile.ratingCount ?? 0})` : null
  }));

  const availabilitySummary = aggregateTutorAvailability({
    availability: tutorAvailability.map((entry) => ({
      ...entry,
      metadata: safeJsonParse(entry.metadata, {})
    })),
    bookings: tutorBookings.map((booking) => ({
      ...booking,
      metadata: safeJsonParse(booking.metadata, {})
    })),
    now
  });

  const tutorNotifications = buildTutorNotifications({
    bookings: tutorBookings.map((booking) => ({
      ...booking,
      metadata: safeJsonParse(booking.metadata, {})
    })),
    now
  });

  const communityMap = new Map();
  communityMemberships.forEach((membership) => {
    const communityId = Number(membership.communityId);
    if (!Number.isFinite(communityId)) return;
    communityMap.set(communityId, {
      id: communityId,
      title: membership.communityName ?? `Community ${communityId}`,
      role: membership.role ?? 'member',
      status: membership.status ?? 'active'
    });
  });

  communityStats.forEach((stat) => {
    const communityId = Number(stat.community_id ?? stat.communityId);
    if (!communityMap.has(communityId)) return;
    const entry = communityMap.get(communityId);
    entry.metrics = {
      active: Number(stat.active_members ?? 0),
      pending: Number(stat.pending_members ?? 0),
      moderators: Number(stat.moderators ?? 0)
    };
  });

  const manageDeck = Array.from(communityMap.values()).map((community) => ({
    id: `community-${community.id}`,
    title: community.title,
    role: community.role,
    status: community.status,
    metrics: community.metrics ?? { active: 0, pending: 0, moderators: 0 }
  }));

  const paywallSummary = paywallTiers.map((tier) => {
    const subscribers = communitySubscriptions.filter(
      (subscription) => subscription.tierName === tier.name && subscription.status === 'active'
    );
    return {
      id: tier.id,
      name: tier.name,
      price: formatCurrency(tier.priceCents, tier.currency ?? 'USD'),
      interval: tier.billingInterval ?? 'monthly',
      members: `${subscribers.length} active`
    };
  });

  const campaigns = adsCampaigns.map((campaign) => {
    const metadata = safeJsonParse(campaign.metadata, {});
    const metricsForCampaign = adsMetrics
      .filter((metric) => Number(metric.campaignId) === Number(campaign.id))
      .map((metric) => ({
        ...metric,
        metricDate: metric.metricDate ? new Date(metric.metricDate) : null
      }));

    const totals = metricsForCampaign.reduce(
      (acc, metric) => {
        acc.impressions += Number(metric.impressions ?? 0);
        acc.clicks += Number(metric.clicks ?? 0);
        acc.conversions += Number(metric.conversions ?? 0);
        acc.spendCents += Number(metric.spendCents ?? 0);
        acc.revenueCents += Number(metric.revenueCents ?? 0);
        return acc;
      },
      { impressions: 0, clicks: 0, conversions: 0, spendCents: 0, revenueCents: 0 }
    );

    const averageCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

    return {
      id: campaign.id,
      name: campaign.name,
      placement: {
        surface: resolveAdPlacement(campaign)
      },
      targeting: {
        keywords: parseTargetingList(campaign.targetingKeywords),
        audiences: parseTargetingList(campaign.targetingAudiences),
        locations: parseTargetingList(campaign.targetingLocations),
        languages: parseTargetingList(campaign.targetingLanguages)
      },
      budget: {
        currency: campaign.budgetCurrency ?? 'USD',
        dailyCents: Number(campaign.budgetDailyCents ?? 0)
      },
      metrics: {
        totals,
        averageCtr,
        cpcCents: Number(campaign.cpcCents ?? 0),
        cpaCents: Number(campaign.cpaCents ?? 0)
      },
      metadata
    };
  });

  const totalSpendCents = campaigns.reduce((total, campaign) => total + campaign.metrics.totals.spendCents, 0);
  const totalCtr = campaigns.length
    ? campaigns.reduce((sum, campaign) => sum + campaign.metrics.averageCtr, 0) / campaigns.length
    : 0;

  const adsSummary = {
    activeCampaigns: campaigns.length,
    totalSpend: {
      cents: totalSpendCents,
      formatted: formatCurrency(totalSpendCents)
    },
    averageCtr: `${totalCtr.toFixed(2)}%`
  };

  const adPlacements = campaigns.map((campaign) => ({
    id: `placement-${campaign.id}`,
    name: campaign.name,
    surface: campaign.placement.surface,
    budgetLabel: `${formatCurrency(campaign.budget.dailyCents, campaign.budget.currency)}/day`
  }));

  const adTags = campaigns.flatMap((campaign) =>
    campaign.targeting.keywords.slice(0, 3).map((keyword) => ({
      campaignId: campaign.id,
      category: 'Keyword',
      label: keyword
    }))
  );

  const upcomingAssignments = assignments
    .map((assignment) => ({
      ...assignment,
      metadata: safeJsonParse(assignment.metadata, {}),
      courseTitle: assignment.courseTitle,
      dueDate: (() => {
        if (assignment.courseReleaseAt && Number.isFinite(Number(assignment.dueOffsetDays))) {
          const base = new Date(assignment.courseReleaseAt);
          return new Date(base.getTime() + Number(assignment.dueOffsetDays ?? 0) * DAY_IN_MS);
        }
        return null;
      })()
    }))
    .filter((assignment) => assignment.dueDate && assignment.dueDate >= now);

  const assessmentOverview = [
    {
      id: 'active-assessments',
      label: 'Active assessments',
      value: assignments.length
    },
    {
      id: 'pending-grading',
      label: 'Pending grading',
      value: assignments.filter((assignment) => assignment.metadata?.status === 'pending').length
    }
  ];

  const learningPace = buildLearningPace(
    ebookProgressRows.map((progress) => ({
      completedAt: progress.completedAt ?? now,
      durationMinutes: Number(progress.progressPercent ?? 0)
    })),
    now
  );

  const coursesWorkspace = buildCourseWorkspace({
    courses,
    modules,
    lessons,
    assignments,
    enrollments: courseEnrollments,
    courseProgress,
    creationProjects,
    creationCollaborators,
    creationSessions,
    collaboratorDirectory,
    now
  });

  const searchIndex = [
    ...courses.map((course) => ({
      id: `search-course-${course.id}`,
      role: 'instructor',
      type: 'Course',
      title: course.title,
      url: '/dashboard/instructor/courses/manage'
    })),
    ...tutorProfiles.map((profile) => ({
      id: `search-tutor-${profile.id}`,
      role: 'instructor',
      type: 'Tutor',
      title: profile.displayName ?? resolveName(user.firstName, user.lastName, user.email),
      url: '/dashboard/instructor/tutor-management'
    }))
  ];

  const profileStats = [
    { label: 'Cohorts', value: `${courses.length} active` },
    { label: 'Communities', value: `${communityMemberships.length} managed` },
    { label: 'Tutor bookings', value: `${tutorBookings.length} total` }
  ];

  const profileBio = `Currently coaching ${courses.length} cohort${courses.length === 1 ? '' : 's'} and stewarding ${
    communityMemberships.length
  } community${communityMemberships.length === 1 ? '' : 'ies'}.`;

  return {
    role: { id: 'instructor', label: 'Instructor' },
    dashboard: {
      metrics,
      courses: coursesWorkspace,
      bookings: {
        pipeline: pipelineBookings
      },
      tutors: {
        roster,
        availability: availabilitySummary,
        notifications: tutorNotifications
      },
      communities: {
        manageDeck
      },
      pricing: {
        subscriptions: paywallSummary
      },
      ads: {
        summary: adsSummary,
        active: campaigns,
        placements: adPlacements,
        tags: adTags
      },
      assessments: {
        overview: assessmentOverview,
        timeline: {
          upcoming: upcomingAssignments.map((assignment) => ({
            id: `assignment-${assignment.id}`,
            course: assignment.courseTitle,
            type: 'Assignment',
            dueDate: formatDateTime(assignment.dueDate, {
              dateStyle: 'medium',
              timeStyle: undefined
            })
          }))
        }
      },
      analytics: {
        learningPace
      }
    },
    profileStats,
    profileBio,
    profileTitleSegment: 'Instructor operations overview',
    searchIndex
  };
}

export function buildCommunityDashboard() {
  return null;
}

export default class DashboardService {
  static async getDashboardForUser(userId, { referenceDate = new Date() } = {}) {
    const { default: UserModel } = await import('../models/UserModel.js');
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    let courseWorkspaceInput = {
      courses: [],
      modules: [],
      lessons: [],
      assignments: [],
      enrollments: [],
      courseProgress: [],
      creationProjects: [],
      creationCollaborators: new Map(),
      creationSessions: new Map(),
      collaboratorDirectory: new Map()
    };

    try {
      const { default: CourseModel } = await import('../models/CourseModel.js');
      const courses = await CourseModel.listByInstructor(user.id, {
        includeArchived: false,
        includeDrafts: true,
        limit: 50
      });
      courseWorkspaceInput.courses = courses;

      if (courses.length) {
        const courseIds = courses.map((course) => course.id);
        const [
          { default: CourseModuleModel },
          { default: CourseLessonModel },
          { default: CourseAssignmentModel },
          { default: CourseEnrollmentModel },
          { default: CourseProgressModel }
        ] = await Promise.all([
          import('../models/CourseModuleModel.js'),
          import('../models/CourseLessonModel.js'),
          import('../models/CourseAssignmentModel.js'),
          import('../models/CourseEnrollmentModel.js'),
          import('../models/CourseProgressModel.js')
        ]);

        const [modules, lessons, assignments, enrollments] = await Promise.all([
          CourseModuleModel.listByCourseIds(courseIds),
          CourseLessonModel.listByCourseIds(courseIds),
          CourseAssignmentModel.listByCourseIds(courseIds),
          CourseEnrollmentModel.listByCourseIds(courseIds)
        ]);

        const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
        const progress = enrollmentIds.length
          ? await CourseProgressModel.listByEnrollmentIds(enrollmentIds)
          : [];

        courseWorkspaceInput = {
          ...courseWorkspaceInput,
          modules,
          lessons,
          assignments,
          enrollments,
          courseProgress: progress
        };
      }
    } catch (error) {
      log.warn({ err: error }, 'Failed to load instructor course catalogue data');
    }

    try {
      const [
        { default: CreationProjectModel },
        { default: CreationProjectCollaboratorModel },
        { default: CreationCollaborationSessionModel }
      ] = await Promise.all([
        import('../models/CreationProjectModel.js'),
        import('../models/CreationProjectCollaboratorModel.js'),
        import('../models/CreationCollaborationSessionModel.js')
      ]);

      const projects = await CreationProjectModel.list({
        ownerId: user.id,
        type: ['course'],
        includeArchived: false,
        limit: 25
      });

      const collaboratorMap = new Map();
      const sessionMap = new Map();
      if (projects.length) {
        const [collaboratorLists, sessionLists] = await Promise.all([
          Promise.all(projects.map((project) => CreationProjectCollaboratorModel.listByProject(project.id))),
          Promise.all(projects.map((project) => CreationCollaborationSessionModel.listActiveByProject(project.id)))
        ]);
        projects.forEach((project, index) => {
          collaboratorMap.set(project.id, collaboratorLists[index] ?? []);
          sessionMap.set(project.id, sessionLists[index] ?? []);
        });
      }

      courseWorkspaceInput = {
        ...courseWorkspaceInput,
        creationProjects: projects,
        creationCollaborators: collaboratorMap,
        creationSessions: sessionMap
      };
    } catch (error) {
      log.warn({ err: error }, 'Failed to load instructor authoring workspace data');
    }

    try {
      const collaboratorIds = new Set();
      courseWorkspaceInput.enrollments.forEach((enrollment) => collaboratorIds.add(enrollment.userId));
      courseWorkspaceInput.creationCollaborators.forEach((collaborators) => {
        collaborators.forEach((collaborator) => collaboratorIds.add(collaborator.userId));
      });
      courseWorkspaceInput.creationSessions.forEach((sessions) => {
        sessions.forEach((session) => collaboratorIds.add(session.participantId));
      });
      collaboratorIds.add(user.id);

      if (collaboratorIds.size) {
        const collaboratorRecords = await UserModel.findByIds(Array.from(collaboratorIds));
        const directory = new Map();
        collaboratorRecords.forEach((record) => {
          directory.set(record.id, record);
        });
        courseWorkspaceInput = {
          ...courseWorkspaceInput,
          collaboratorDirectory: directory
        };
      }
    } catch (error) {
      log.warn({ err: error }, 'Failed to load collaborator directory for course workspace');
    }

    const instructorSnapshot =
      buildInstructorDashboard({
        user,
        now: referenceDate,
        courses: courseWorkspaceInput?.courses ?? [],
        courseEnrollments: courseWorkspaceInput?.enrollments ?? [],
        modules: courseWorkspaceInput?.modules ?? [],
        lessons: courseWorkspaceInput?.lessons ?? [],
        assignments: courseWorkspaceInput?.assignments ?? [],
        courseProgress: courseWorkspaceInput?.courseProgress ?? [],
        creationProjects: courseWorkspaceInput?.creationProjects ?? [],
        creationCollaborators: courseWorkspaceInput?.creationCollaborators ?? new Map(),
        creationSessions: courseWorkspaceInput?.creationSessions ?? new Map(),
        collaboratorDirectory: courseWorkspaceInput?.collaboratorDirectory ?? new Map()
      }) ?? undefined;
    let operatorSnapshot;
    if (['admin', 'operator'].includes(user.role)) {
      operatorSnapshot = await getOperatorDashboardService().build({ user, now: referenceDate });
    }

    const dashboards = {};
    const searchIndex = [];
    if (instructorSnapshot) {
      dashboards.instructor = instructorSnapshot.dashboard;
      searchIndex.push(...instructorSnapshot.searchIndex);
    }
    if (operatorSnapshot) {
      dashboards.admin = operatorSnapshot.dashboard;
      searchIndex.push(...operatorSnapshot.searchIndex);
    }

    const roles = [];
    if (operatorSnapshot) {
      roles.push({ id: 'admin', label: 'Admin' });
    }
    if (instructorSnapshot) {
      roles.push({ id: 'instructor', label: 'Instructor' });
    }
    if (user.role && !roles.some((role) => role.id === user.role)) {
      roles.push({ id: user.role, label: user.role.charAt(0).toUpperCase() + user.role.slice(1) });
    }

    const profileStats = [
      ...(instructorSnapshot?.profileStats ?? []),
      ...(operatorSnapshot?.profileStats ?? [])
    ];
    const profileBioSegments = [];
    if (instructorSnapshot?.profileBio) {
      profileBioSegments.push(instructorSnapshot.profileBio);
    }
    if (operatorSnapshot?.profileBio) {
      profileBioSegments.push(operatorSnapshot.profileBio);
    }
    const profileBio = profileBioSegments.join(' ').trim() || null;

    const profile = {
      id: user.id,
      name: resolveName(user.firstName, user.lastName, user.email),
      email: user.email,
      avatar: buildAvatarUrl(user.email),
      title: instructorSnapshot?.profileTitleSegment ?? operatorSnapshot?.profileTitleSegment ?? null,
      bio: profileBio,
      stats: profileStats,
      feedHighlights: []
    };

    return {
      profile,
      roles,
      dashboards,
      searchIndex
    };
  }
}
