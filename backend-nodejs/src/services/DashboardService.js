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

function formatTimeSpent(seconds) {
  const totalSeconds = Number(seconds ?? 0);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0m';
  }
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function normaliseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatRelativeDay(target, now = new Date()) {
  const date = normaliseDate(target);
  if (!date) return null;
  const diffDays = Math.round((date.getTime() - now.getTime()) / DAY_IN_MS);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

function parseTagsList(tags) {
  const parsed = safeJsonParse(tags, []);
  if (Array.isArray(parsed)) {
    return parsed.map((tag) => String(tag));
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function summariseReactions(summary) {
  if (!summary) return 0;
  if (typeof summary === 'number') return summary;
  const parsed = safeJsonParse(summary, {});
  if (typeof parsed.total === 'number') return parsed.total;
  return Object.values(parsed).reduce((total, value) => (typeof value === 'number' ? total + value : total), 0);
}

function coercePositiveInteger(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 0;
}

export function buildLearnerDashboard({
  user,
  now = new Date(),
  enrollments = [],
  courses = [],
  courseProgress = [],
  tutorBookings = [],
  tutorAvailability = [],
  liveClassrooms = [],
  ebookProgress = [],
  ebooks = new Map(),
  invoices = [],
  communityMemberships = [],
  communityEvents = [],
  communityPipelines = [],
  communitySubscriptions = [],
  followerSummary = {},
  privacySettings = null,
  messagingSummary = null,
  notifications = []
} = {}) {
  const hasSignals =
    enrollments.length ||
    tutorBookings.length ||
    ebookProgress.length ||
    invoices.length ||
    liveClassrooms.length ||
    communityMemberships.length;

  if (!hasSignals) {
    return null;
  }

  const courseMap = new Map();
  courses.forEach((course) => {
    if (!course || !course.id) return;
    const metadata = safeJsonParse(course.metadata, {});
    courseMap.set(course.id, { ...course, metadata });
  });

  const progressByEnrollment = new Map();
  const completionEntries = [];
  courseProgress.forEach((entry) => {
    if (!entry || !entry.enrollmentId) return;
    const record = progressByEnrollment.get(entry.enrollmentId) ?? {
      totalLessons: 0,
      completedLessons: 0,
      lastCompletedAt: null
    };
    record.totalLessons += 1;
    if (entry.completed) {
      record.completedLessons += 1;
      const completedAt = normaliseDate(entry.completedAt);
      if (completedAt && (!record.lastCompletedAt || completedAt > record.lastCompletedAt)) {
        record.lastCompletedAt = completedAt;
      }
      completionEntries.push({
        completedAt,
        durationMinutes: Number(entry.metadata?.studyMinutes ?? entry.metadata?.durationMinutes ?? 30)
      });
    }
    progressByEnrollment.set(entry.enrollmentId, record);
  });

  const learningPace = buildLearningPace(completionEntries, now);
  const streak = calculateLearningStreak(completionEntries, now);

  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === 'active');
  const completedEnrollments = enrollments.filter((enrollment) => enrollment.status === 'completed');
  const recentEnrollments = activeEnrollments.filter((enrollment) => {
    const startedAt = normaliseDate(enrollment.startedAt);
    if (!startedAt) return false;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS);
    return startedAt >= thirtyDaysAgo;
  });

  const upcomingTutorBookings = tutorBookings
    .map((booking) => ({
      ...booking,
      scheduledStart: normaliseDate(booking.scheduledStart),
      scheduledEnd: normaliseDate(booking.scheduledEnd),
      metadata: safeJsonParse(booking.metadata, {})
    }))
    .filter((booking) =>
      booking.scheduledStart &&
      (booking.status === 'confirmed' || booking.status === 'requested') &&
      booking.scheduledStart >= now
    )
    .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());

  const historicalTutorBookings = tutorBookings
    .map((booking) => ({
      ...booking,
      scheduledStart: normaliseDate(booking.scheduledStart),
      scheduledEnd: normaliseDate(booking.scheduledEnd),
      metadata: safeJsonParse(booking.metadata, {})
    }))
    .filter((booking) => !upcomingTutorBookings.includes(booking));

  const upcomingLiveSessions = liveClassrooms
    .map((session) => ({
      ...session,
      startAt: normaliseDate(session.startAt),
      endAt: normaliseDate(session.endAt)
    }))
    .filter((session) => session.startAt && session.startAt >= now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const metrics = [
    {
      label: 'Active courses',
      value: `${activeEnrollments.length}`,
      change: recentEnrollments.length ? `+${recentEnrollments.length} started last 30d` : 'Stable'
    },
    {
      label: 'Learning streak',
      value: `${streak.current} day${streak.current === 1 ? '' : 's'}`,
      change: streak.longest ? `Best ${streak.longest} day${streak.longest === 1 ? '' : 's'}` : 'Getting started'
    },
    {
      label: 'Upcoming sessions',
      value: `${upcomingTutorBookings.length + upcomingLiveSessions.length}`,
      change: `${historicalTutorBookings.filter((booking) => booking.status === 'completed').length} completed`
    }
  ];

  const activeCourses = activeEnrollments.map((enrollment) => {
    const course = courseMap.get(enrollment.courseId);
    const progress = progressByEnrollment.get(enrollment.id) ?? {
      totalLessons: 0,
      completedLessons: 0,
      lastCompletedAt: null
    };
    const totalLessons = progress.totalLessons || course?.metadata?.totalLessons || 0;
    const completedLessons = progress.completedLessons || 0;
    const progressPercent = Number.isFinite(Number(enrollment.progressPercent))
      ? Number(enrollment.progressPercent)
      : totalLessons
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;
    const nextLesson = totalLessons && completedLessons < totalLessons ? `Lesson ${completedLessons + 1}` : null;

    return {
      id: enrollment.publicId ?? `enrollment-${enrollment.id}`,
      title: course?.title ?? `Course ${enrollment.courseId}`,
      status: enrollment.status,
      progress: Math.max(0, Math.min(100, progressPercent)),
      instructor: course?.metadata?.instructorName ?? (course?.instructorId ? `Instructor #${course.instructorId}` : 'Instructor'),
      nextLesson
    };
  });

  const recommendedCourses = courses
    .filter((course) => !activeEnrollments.some((enrollment) => enrollment.courseId === course.id))
    .slice(0, 5)
    .map((course) => ({
      id: course.publicId ?? `course-${course.id}`,
      title: course.title,
      summary: course.summary ?? course.description ?? null,
      rating: course.ratingAverage ? `${course.ratingAverage.toFixed(1)} (${course.ratingCount ?? 0})` : null
    }));

  const communityEngagement = communityMemberships.map((community) => {
    const members = coercePositiveInteger(community.stats?.members ?? community.stats?.memberCount ?? 0);
    const posts = coercePositiveInteger(community.stats?.posts ?? 0);
    const participation = members ? Math.min(100, Math.round((posts / members) * 100)) : 0;
    return {
      name: community.name ?? `Community ${community.id}`,
      participation
    };
  });

  const learningUpcoming = [];
  upcomingTutorBookings.forEach((booking) => {
    learningUpcoming.push({
      id: booking.publicId ?? `tutor-booking-${booking.id}`,
      title: booking.metadata?.topic ?? 'Mentorship session',
      type: 'Mentorship',
      date: booking.scheduledStart ? booking.scheduledStart.toISOString() : null,
      host: booking.tutorName
        ? booking.tutorName
        : resolveName(booking.tutorFirstName, booking.tutorLastName, 'Tutor'),
      action: booking.meetingUrl ?? booking.metadata?.meetingUrl ?? null,
      dateLabel: formatRelativeDay(booking.scheduledStart, now)
    });
  });

  communityEvents
    .map((event) => ({ ...event, startAt: normaliseDate(event.startAt) }))
    .filter((event) => event.startAt && event.startAt >= now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .forEach((event) => {
      learningUpcoming.push({
        id: event.id ? `community-event-${event.id}` : `community-event-${event.communityId}`,
        title: event.title ?? 'Community event',
        type: 'Community',
        date: event.startAt.toISOString(),
        host: event.facilitator ?? event.communityName ?? 'Community team',
        action: event.meetingUrl ?? null,
        dateLabel: formatRelativeDay(event.startAt, now)
      });
    });

  invoices
    .filter((invoice) => invoice.status && invoice.status !== 'paid')
    .forEach((invoice) => {
      const invoiceDate = normaliseDate(invoice.date);
      learningUpcoming.push({
        id: invoice.id ?? `invoice-${invoice.publicId ?? crypto.randomUUID()}`,
        title: invoice.label ?? 'Invoice payment',
        type: 'Billing',
        date: invoiceDate ? invoiceDate.toISOString() : null,
        host: invoice.currency ?? 'USD',
        action: null,
        dateLabel: invoiceDate ? formatRelativeDay(invoiceDate, now) : null
      });
    });

  const calendarMap = new Map();
  const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  learningUpcoming.forEach((item) => {
    if (!item.date) return;
    const dayIso = item.date.slice(0, 10);
    const dayEntry = calendarMap.get(dayIso) ?? {
      id: `calendar-${dayIso}`,
      day: dayFormatter.format(new Date(item.date)),
      items: []
    };
    dayEntry.items.push(item.title);
    calendarMap.set(dayIso, dayEntry);
  });

  const activeTutorBookings = upcomingTutorBookings.map((booking) => ({
    id: booking.publicId ?? `tutor-booking-${booking.id}`,
    topic: booking.metadata?.topic ?? 'Mentorship session',
    mentor: booking.tutorName
      ? booking.tutorName
      : resolveName(booking.tutorFirstName, booking.tutorLastName, 'Tutor'),
    date: booking.scheduledStart ? formatDateTime(booking.scheduledStart, { dateStyle: 'medium', timeStyle: 'short' }) : null,
    status: booking.status ?? 'confirmed',
    rating: booking.metadata?.rating ?? null
  }));

  const historicalTutorEntries = historicalTutorBookings.map((booking) => ({
    id: booking.publicId ?? `tutor-booking-${booking.id}`,
    topic: booking.metadata?.topic ?? 'Mentorship session',
    mentor: booking.tutorName
      ? booking.tutorName
      : resolveName(booking.tutorFirstName, booking.tutorLastName, 'Tutor'),
    date: booking.scheduledStart ? formatDateTime(booking.scheduledStart, { dateStyle: 'medium', timeStyle: 'short' }) : null,
    status: booking.status ?? null,
    rating: booking.metadata?.rating ?? null
  }));

  const ebookLibrary = ebookProgress.map((progress) => {
    const catalogEntry = ebooks.get(progress.assetId) ?? {};
    return {
      id: catalogEntry.id ?? `ebook-${progress.assetId}`,
      title: catalogEntry.title ?? `Ebook ${progress.assetId}`,
      status: progress.progressPercent >= 100 ? 'Completed' : 'In progress',
      progress: Number(progress.progressPercent ?? 0),
      price: formatCurrency(catalogEntry.priceAmount ?? 0, catalogEntry.priceCurrency ?? 'USD'),
      highlights: Number(progress.metadata?.highlights ?? 0),
      bookmarks: Number(progress.metadata?.bookmarks ?? 0),
      timeSpent: formatTimeSpent(progress.timeSpentSeconds)
    };
  });

  const activeSubscriptions = communitySubscriptions.filter((subscription) => subscription.status === 'active');
  const pendingInvoices = invoices.filter((invoice) => invoice.status && invoice.status !== 'paid');

  const financialSummary = [
    {
      label: 'Active subscriptions',
      value: `${activeSubscriptions.length}`,
      change: `${communityMemberships.length} communities`
    },
    {
      label: 'Outstanding invoices',
      value: `${pendingInvoices.length}`,
      change: pendingInvoices.length ? 'Action required' : 'All settled'
    },
    {
      label: 'Mentor sessions',
      value: `${tutorBookings.length}`,
      change: `${activeTutorBookings.length} upcoming`
    }
  ];

  const invoiceEntries = invoices.map((invoice) => ({
    id: invoice.id ?? `invoice-${invoice.publicId ?? crypto.randomUUID()}`,
    label: invoice.label ?? 'Invoice',
    amount: formatCurrency(invoice.amountCents ?? invoice.amount ?? 0, invoice.currency ?? 'USD'),
    status: invoice.status ?? 'open',
    date: invoice.date ? formatDateTime(invoice.date, { dateStyle: 'medium', timeStyle: undefined }) : null
  }));

  const notificationsList = [...notifications];
  activeTutorBookings.forEach((booking) => {
    notificationsList.push({
      id: `notification-booking-${booking.id}`,
      title: `Upcoming session with ${booking.mentor}`,
      timestamp: booking.date,
      type: 'mentor'
    });
  });
  pendingInvoices.forEach((invoice) => {
    notificationsList.push({
      id: `notification-invoice-${invoice.id}`,
      title: `${invoice.label ?? 'Invoice'} due`,
      timestamp: invoice.date,
      type: 'billing'
    });
  });

  const privacy = {
    visibility: privacySettings?.profileVisibility ?? 'public',
    followApprovalRequired: Boolean(privacySettings?.followApprovalRequired),
    shareActivity: privacySettings?.shareActivity ?? true,
    messagePermission: privacySettings?.messagePermission ?? 'followers'
  };

  const messaging = {
    unreadThreads: messagingSummary?.unreadThreads ?? 0,
    notificationsEnabled: messagingSummary?.notificationsEnabled ?? true
  };

  const communitySettings = communityMemberships.map((community) => ({
    id: `community-setting-${community.id}`,
    name: community.name ?? `Community ${community.id}`,
    role: community.membership?.role ?? 'member',
    status: community.membership?.status ?? 'active'
  }));

  const followerSection = {
    followers: followerSummary.followers ?? 0,
    following: followerSummary.following ?? 0,
    pending: Array.isArray(followerSummary.pending) ? followerSummary.pending : [],
    outgoing: Array.isArray(followerSummary.outgoing) ? followerSummary.outgoing : [],
    recommendations: Array.isArray(followerSummary.recommendations) ? followerSummary.recommendations : []
  };

  const managedCommunities = communityMemberships.map((community) => {
    const initiatives = [];
    if (coercePositiveInteger(community.stats?.resources ?? 0)) {
      initiatives.push(`${community.stats.resources} curated resources`);
    }
    if (coercePositiveInteger(community.stats?.posts ?? 0)) {
      initiatives.push(`${community.stats.posts} posts last 30d`);
    }
    if (coercePositiveInteger(community.stats?.channels ?? 0)) {
      initiatives.push(`${community.stats.channels} channels`);
    }
    if (initiatives.length === 0) {
      initiatives.push('Build momentum with new programmes');
    }

    return {
      id: community.id ? `community-${community.id}` : crypto.randomUUID(),
      communityId: community.id ?? null,
      slug: community.slug ?? null,
      name: community.name ?? `Community ${community.id}`,
      members: `${coercePositiveInteger(community.stats?.members ?? community.stats?.memberCount ?? 0)} members`,
      moderators: coercePositiveInteger(community.stats?.moderators ?? 0),
      health: community.stats?.lastActivityAt ? 'Healthy' : 'New',
      initiatives,
      role: community.membership?.role ?? null,
      metadata: { lastActivityAt: community.stats?.lastActivityAt }
    };
  });

  const pipelineEntries = [...communityPipelines];
  communityEvents
    .filter((event) => event.startAt && event.capacity)
    .forEach((event) => {
      const capacity = coercePositiveInteger(event.capacity);
      const reserved = coercePositiveInteger(event.reservedSeats ?? event.attendanceCount ?? 0);
      const progress = capacity ? Math.min(100, Math.round((reserved / capacity) * 100)) : 0;
      pipelineEntries.push({
        id: `pipeline-event-${event.id ?? event.title}`,
        title: event.title ?? 'Live classroom',
        owner: event.facilitator ?? 'Community ops',
        progress
      });
    });

  const dashboard = {
    metrics,
    analytics: {
      learningPace,
      communityEngagement
    },
    upcoming: learningUpcoming.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }),
    communities: {
      managed: managedCommunities,
      pipelines: pipelineEntries
    },
    courses: {
      active: activeCourses,
      recommendations: recommendedCourses
    },
    calendar: Array.from(calendarMap.values()),
    tutorBookings: {
      active: activeTutorBookings,
      history: historicalTutorEntries
    },
    ebooks: {
      library: ebookLibrary,
      recommendations: []
    },
    financial: {
      summary: financialSummary,
      invoices: invoiceEntries
    },
    notifications: {
      total: notificationsList.length,
      unreadMessages: messaging.unreadThreads ?? 0,
      items: notificationsList
    },
    assessments: {
      overview: [
        { id: 'assessments-upcoming', label: 'Upcoming assignments', value: 0 },
        { id: 'assessments-completed', label: 'Completed assessments', value: completionEntries.length }
      ],
      timeline: {
        upcoming: [],
        overdue: [],
        completed: []
      },
      courses: activeCourses.map((course) => ({
        id: course.id,
        title: course.title,
        pendingAssessments: 0
      })),
      schedule: {
        studyPlan: [],
        events: []
      },
      analytics: {
        byType: [],
        pendingReviews: 0,
        overdue: 0,
        averageLeadTimeDays: null,
        workloadWeight: completionEntries.length
      },
      resources: []
    },
    followers: followerSection,
    settings: {
      privacy,
      messaging,
      communities: communitySettings
    }
  };

  const profileStats = [
    { label: 'Courses', value: `${activeEnrollments.length} active` },
    { label: 'Communities', value: `${communityMemberships.length} joined` },
    { label: 'Mentor sessions', value: `${tutorBookings.length} total` }
  ];

  const profileBioSegments = [];
  if (activeEnrollments.length) {
    profileBioSegments.push(`Learning across ${activeEnrollments.length} course${activeEnrollments.length === 1 ? '' : 's'}`);
  }
  if (streak.current) {
    profileBioSegments.push(`maintaining a ${streak.current}-day streak`);
  }
  if (communityMemberships.length) {
    profileBioSegments.push(`while participating in ${communityMemberships.length} communit${
      communityMemberships.length === 1 ? 'y' : 'ies'
    }.`);
  }
  const profileBio = profileBioSegments.join(' ').trim() || null;

  const searchIndex = [
    {
      id: 'learner-overview',
      role: 'learner',
      type: 'Section',
      title: 'Learner overview',
      url: '/dashboard/learner'
    },
    ...activeCourses.map((course) => ({
      id: `learner-course-${course.id}`,
      role: 'learner',
      type: 'Course',
      title: course.title,
      url: '/dashboard/learner/courses'
    })),
    ...managedCommunities.map((community) => ({
      id: `learner-community-${community.id}`,
      role: 'learner',
      type: 'Community',
      title: community.name,
      url: '/dashboard/learner/communities'
    }))
  ];

  const feedHighlights = [];
  if (activeTutorBookings.length) {
    feedHighlights.push(
      `Mentorship with ${activeTutorBookings[0].mentor} scheduled for ${activeTutorBookings[0].date ?? 'soon'}.`
    );
  }
  if (ebookLibrary.length) {
    feedHighlights.push(`Reading ${ebookLibrary[0].title} (${ebookLibrary[0].progress}% complete).`);
  }

  return {
    role: { id: 'learner', label: 'Learner' },
    dashboard,
    profileStats,
    profileBio,
    profileTitleSegment: 'Learner journey insights',
    searchIndex,
    feedHighlights
  };
}

export function buildCommunityDashboard({
  user,
  now = new Date(),
  communities = [],
  eventsByCommunity = new Map(),
  runbooksByCommunity = new Map(),
  paywallTiersByCommunity = new Map(),
  subscriptionsByCommunity = new Map(),
  pendingMembersByCommunity = new Map(),
  moderatorsByCommunity = new Map(),
  moderationCases = [],
  communicationsByCommunity = new Map(),
  engagementTrend = [],
  engagementTotals = { current: {}, previous: {} }
} = {}) {
  const hasSignals =
    communities.length ||
    moderationCases.length ||
    subscriptionsByCommunity.size ||
    Array.from(runbooksByCommunity.values()).some((list) => list?.length);

  if (!hasSignals) {
    return null;
  }

  const metrics = [];
  const totalCommunities = communities.length;
  const totalMembers = communities.reduce(
    (sum, community) => sum + coercePositiveInteger(community.stats?.members ?? community.stats?.memberCount ?? 0),
    0
  );
  const totalPendingApprovals = Array.from(pendingMembersByCommunity.values()).reduce(
    (sum, members) => sum + coercePositiveInteger(members?.length ?? 0),
    0
  );
  const totalActiveSubscriptions = Array.from(subscriptionsByCommunity.values()).reduce(
    (sum, list) => sum + list.filter((subscription) => subscription.status === 'active').length,
    0
  );

  const totalRecurringCents = Array.from(subscriptionsByCommunity.entries()).reduce((sum, [communityId, subs]) => {
    const tiers = paywallTiersByCommunity.get(communityId) ?? [];
    const tierMap = new Map(tiers.map((tier) => [tier.id, tier]));
    const communitySum = subs.reduce((tierSum, subscription) => {
      const tier = tierMap.get(subscription.tierId);
      if (!tier) return tierSum;
      return tierSum + Number(tier.priceCents ?? 0);
    }, 0);
    return sum + communitySum;
  }, 0);

  metrics.push({
    label: 'Managed communities',
    value: `${totalCommunities}`,
    change: `${totalMembers} active members`
  });
  metrics.push({
    label: 'Pending approvals',
    value: `${totalPendingApprovals}`,
    change: totalPendingApprovals ? 'Review join requests' : 'All clear'
  });
  metrics.push({
    label: 'Recurring revenue',
    value: formatCurrency(totalRecurringCents),
    change: `${totalActiveSubscriptions} active subscriptions`
  });

  const caseByCommunity = new Map();
  moderationCases.forEach((incident) => {
    if (!incident.communityId) return;
    const list = caseByCommunity.get(incident.communityId) ?? [];
    list.push(incident);
    caseByCommunity.set(incident.communityId, list);
  });

  const healthOverview = communities.map((community) => {
    const communityId = community.id;
    const pendingMembers = coercePositiveInteger(pendingMembersByCommunity.get(communityId)?.length ?? 0);
    const moderators = coercePositiveInteger(moderatorsByCommunity.get(communityId)?.length ?? 0);
    const incidents = caseByCommunity.get(communityId) ?? [];
    const highSeverity = incidents.filter((incident) => incident.severity === 'high' || incident.severity === 'critical');
    const lastActivity = normaliseDate(community.stats?.lastActivityAt);
    const recentActivity = lastActivity && now - lastActivity <= 7 * DAY_IN_MS;
    const health = highSeverity.length ? 'At risk' : pendingMembers > 5 ? 'Attention' : recentActivity ? 'Healthy' : 'Monitoring';
    const trend = recentActivity ? 'up' : 'steady';

    return {
      id: communityId ? `community-${communityId}` : crypto.randomUUID(),
      name: community.name ?? `Community ${communityId}`,
      members: `${coercePositiveInteger(community.stats?.members ?? community.stats?.memberCount ?? 0)} members`,
      moderators,
      health,
      trend,
      approvalsPending: pendingMembers,
      incidentsOpen: incidents.length,
      escalationsOpen: highSeverity.length,
      metadata: { lastActivityAt: lastActivity?.toISOString() }
    };
  });

  const operationsRunbooks = [];
  runbooksByCommunity.forEach((runbooks, communityId) => {
    runbooks
      ?.slice(0, 10)
      .forEach((runbook) => {
        const tags = parseTagsList(runbook.tags);
        const metadata = safeJsonParse(runbook.metadata, {});
        operationsRunbooks.push({
          id: `runbook-${runbook.id}`,
          title: runbook.title ?? 'Operational runbook',
          owner: runbook.createdByName ?? 'Community ops',
          automationReady: Boolean(metadata.automationReady ?? metadata.auto ?? false),
          tags
        });
      });
  });

  const operationsEscalations = moderationCases
    .filter((incident) => incident.status && ['pending', 'in_review', 'escalated'].includes(incident.status))
    .slice(0, 10)
    .map((incident) => ({
      id: incident.id ? `case-${incident.id}` : crypto.randomUUID(),
      title: incident.reason ?? 'Moderation case',
      severity: incident.severity ?? 'low',
      status: incident.status ?? 'pending',
      openedAt: incident.createdAt ? formatDateTime(incident.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) : null,
      owner: incident.assignee?.name ?? 'Unassigned'
    }));

  const upcomingEvents = [];
  eventsByCommunity.forEach((events, communityId) => {
    const community = communities.find((entry) => entry.id === communityId);
    events
      ?.filter((event) => event.startAt && normaliseDate(event.startAt) >= now)
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
      .slice(0, 10)
      .forEach((event) => {
        const capacity = coercePositiveInteger(event.capacity ?? event.attendanceLimit ?? 0);
        const reserved = coercePositiveInteger(event.reservedSeats ?? event.attendanceCount ?? 0);
        const seats = capacity ? `${reserved}/${capacity} seats` : `${reserved} reserved`;
        upcomingEvents.push({
          id: event.id ? `event-${event.id}` : crypto.randomUUID(),
          title: event.title ?? 'Community event',
          date: event.startAt ? formatDateTime(event.startAt, { dateStyle: 'medium', timeStyle: 'short' }) : null,
          facilitator: event.facilitator ?? event.metadata?.host ?? 'Community team',
          seats,
          status: event.status ?? 'scheduled'
        });
      });
  });

  const tutorPods = upcomingEvents
    .filter((event) => (event.status ?? '').toLowerCase().includes('coaching'))
    .map((event) => ({
      id: `pod-${event.id}`,
      title: event.title,
      facilitator: event.facilitator,
      nextSession: event.date
    }));

  const broadcasts = [];
  communicationsByCommunity.forEach((posts, communityId) => {
    const community = communities.find((entry) => entry.id === communityId);
    posts
      ?.filter((post) => post.postType === 'announcement' || post.metadata?.stage)
      .slice(0, 10)
      .forEach((post) => {
        const metadata = safeJsonParse(post.metadata, {});
        broadcasts.push({
          id: `broadcast-${post.id}`,
          title: post.title ?? 'Broadcast',
          channel: post.channelName ?? 'General',
          stage: metadata.stage ?? post.status ?? 'draft',
          release: post.publishedAt ? formatDateTime(post.publishedAt, { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD',
          community: community?.name ?? `Community ${communityId}`
        });
      });
  });

  const monetisationTiers = [];
  paywallTiersByCommunity.forEach((tiers, communityId) => {
    const subscriptions = subscriptionsByCommunity.get(communityId) ?? [];
    const active = subscriptions.filter((subscription) => subscription.status === 'active');
    tiers
      ?.slice(0, 10)
      .forEach((tier) => {
        const members = active.filter((subscription) => subscription.tierId === tier.id).length;
        monetisationTiers.push({
          id: `tier-${tier.id}`,
          name: tier.name,
          price: formatCurrency(tier.priceCents ?? 0, tier.currency ?? 'USD'),
          interval: tier.billingInterval ?? 'monthly',
          members
        });
      });
  });

  const monetisationInsights = [];
  communities.forEach((community) => {
    const subs = subscriptionsByCommunity.get(community.id) ?? [];
    if (!subs.length) return;
    const tiers = paywallTiersByCommunity.get(community.id) ?? [];
    const tierMap = new Map(tiers.map((tier) => [tier.id, tier]));
    const recurringCents = subs.reduce((sum, subscription) => {
      const tier = tierMap.get(subscription.tierId);
      if (!tier) return sum;
      return sum + Number(tier.priceCents ?? 0);
    }, 0);
    monetisationInsights.push(
      `${community.name ?? `Community ${community.id}`} is generating ${formatCurrency(recurringCents)} in active recurring revenue.`
    );
  });

  const monetisationExperiments = monetisationTiers.map((tier) => ({
    id: `experiment-${tier.id}`,
    name: `${tier.name} adoption`,
    hypothesis: `Grow ${tier.name} to ${tier.members + 5} members`,
    status: tier.members ? 'running' : 'planned'
  }));

  const safetyIncidents = moderationCases.slice(0, 20).map((incident) => ({
    id: incident.id ? `incident-${incident.id}` : crypto.randomUUID(),
    communityId: incident.communityId,
    title: incident.reason ?? 'Moderation incident',
    severity: incident.severity ?? 'low',
    status: incident.status ?? 'pending',
    openedAt: incident.createdAt ? formatDateTime(incident.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) : null,
    assignee: incident.assignee?.name ?? 'Unassigned'
  }));

  const safetyBacklog = [];
  caseByCommunity.forEach((cases, communityId) => {
    const community = communities.find((entry) => entry.id === communityId);
    const highSeverity = cases.filter((incident) => incident.severity === 'high' || incident.severity === 'critical');
    const mediumSeverity = cases.filter((incident) => incident.severity === 'medium');
    if (highSeverity.length) {
      safetyBacklog.push({
        id: `backlog-high-${communityId}`,
        label: `${community?.name ?? `Community ${communityId}`} high severity`,
        count: highSeverity.length
      });
    }
    if (mediumSeverity.length) {
      safetyBacklog.push({
        id: `backlog-medium-${communityId}`,
        label: `${community?.name ?? `Community ${communityId}`} medium severity`,
        count: mediumSeverity.length
      });
    }
  });

  const moderatorRoster = [];
  moderatorsByCommunity.forEach((members, communityId) => {
    const community = communities.find((entry) => entry.id === communityId);
    members
      ?.slice(0, 10)
      .forEach((member) => {
        moderatorRoster.push({
          id: `moderator-${communityId}-${member.userId ?? member.id}`,
          community: community?.name ?? `Community ${communityId}`,
          role: member.role ?? 'moderator',
          coverage: member.metadata?.coverage ?? 'General'
        });
      });
  });

  const communicationsHighlights = [];
  communicationsByCommunity.forEach((posts, communityId) => {
    const community = communities.find((entry) => entry.id === communityId);
    posts
      ?.slice(0, 10)
      .forEach((post) => {
        const tags = parseTagsList(post.tags);
        communicationsHighlights.push({
          id: `highlight-${post.id}`,
          community: community?.name ?? `Community ${communityId}`,
          preview: post.title ?? (post.body ? String(post.body).slice(0, 80) : 'Member update'),
          postedAt: post.publishedAt ? formatDateTime(post.publishedAt, { dateStyle: 'medium', timeStyle: 'short' }) : null,
          reactions: summariseReactions(post.reactionSummary),
          tags
        });
      });
  });

  const communicationsTrends = [
    {
      id: 'trend-posts-7d',
      metric: 'Posts (7d)',
      current: engagementTotals.current.posts ?? 0,
      previous: engagementTotals.previous.posts ?? 0
    },
    {
      id: 'trend-comments-7d',
      metric: 'Comments (7d)',
      current: engagementTotals.current.comments ?? 0,
      previous: engagementTotals.previous.comments ?? 0
    },
    {
      id: 'trend-events-7d',
      metric: 'Event posts (7d)',
      current: engagementTotals.current.eventPosts ?? 0,
      previous: engagementTotals.previous.eventPosts ?? 0
    }
  ];

  const communicationsBroadcasts = broadcasts;

  const dashboard = {
    metrics,
    health: {
      overview: healthOverview
    },
    operations: {
      runbooks: operationsRunbooks,
      escalations: operationsEscalations
    },
    programming: {
      upcomingEvents,
      tutorPods,
      broadcasts: communicationsBroadcasts
    },
    monetisation: {
      tiers: monetisationTiers,
      experiments: monetisationExperiments,
      insights: monetisationInsights
    },
    safety: {
      incidents: safetyIncidents,
      backlog: safetyBacklog,
      moderators: moderatorRoster
    },
    communications: {
      highlights: communicationsHighlights,
      broadcasts: communicationsBroadcasts,
      trends: communicationsTrends
    }
  };

  const profileStats = [
    { label: 'Communities', value: `${totalCommunities} managed` },
    { label: 'Members', value: `${totalMembers} active` },
    { label: 'Moderation backlog', value: `${moderationCases.length} open` }
  ];

  const profileBioSegments = [];
  if (totalCommunities) {
    profileBioSegments.push(`Stewarding ${totalCommunities} communit${totalCommunities === 1 ? 'y' : 'ies'}`);
  }
  if (totalMembers) {
    profileBioSegments.push(`with ${totalMembers} engaged members`);
  }
  if (totalPendingApprovals) {
    profileBioSegments.push(`and ${totalPendingApprovals} approvals awaiting review.`);
  }
  const profileBio = profileBioSegments.join(' ').trim() || null;

  const searchIndex = [
    {
      id: 'community-operations-overview',
      role: 'community',
      type: 'Section',
      title: 'Community operations overview',
      url: '/dashboard/community'
    },
    ...communities.map((community) => ({
      id: `community-${community.id}`,
      role: 'community',
      type: 'Community',
      title: community.name ?? `Community ${community.id}`,
      url: `/dashboard/community/${community.slug ?? community.id}`
    }))
  ];

  const feedHighlights = [];
  if (upcomingEvents.length) {
    feedHighlights.push(`Upcoming community programme: ${upcomingEvents[0].title} on ${upcomingEvents[0].date}.`);
  }
  if (operationsRunbooks.length) {
    feedHighlights.push(`New runbook published: ${operationsRunbooks[0].title}.`);
  }

  return {
    role: { id: 'community', label: 'Community' },
    dashboard,
    profileStats,
    profileBio,
    profileTitleSegment: 'Community operations steward',
    searchIndex,
    feedHighlights
  };
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

    let learnerSnapshot;
    let communitySnapshot;
    let communitySummaries = [];
    const communityEventsByCommunity = new Map();
    const communityRunbooksByCommunity = new Map();
    const communityPaywallTiersByCommunity = new Map();
    const communitySubscriptionsByCommunity = new Map();
    const communityPendingMembersByCommunity = new Map();
    const communityModeratorsByCommunity = new Map();
    const communicationsByCommunity = new Map();
    let communityModerationCases = [];
    let engagementTotals = { current: {}, previous: {} };

    try {
      const [
        { default: db },
        { default: CourseEnrollmentModel },
        { default: CourseProgressModel },
        { default: CourseModel },
        { default: EbookProgressModel },
        { default: CommunityService },
        { default: CommunitySubscriptionModel },
        { default: CommunityEventModel },
        { default: UserFollowModel },
        { default: UserPrivacySettingModel },
        { default: FollowRecommendationModel }
      ] = await Promise.all([
        import('../config/database.js'),
        import('../models/CourseEnrollmentModel.js'),
        import('../models/CourseProgressModel.js'),
        import('../models/CourseModel.js'),
        import('../models/EbookProgressModel.js'),
        import('./CommunityService.js'),
        import('../models/CommunitySubscriptionModel.js'),
        import('../models/CommunityEventModel.js'),
        import('../models/UserFollowModel.js'),
        import('../models/UserPrivacySettingModel.js'),
        import('../models/FollowRecommendationModel.js')
      ]);

      const enrollmentRows = await db('course_enrollments as ce')
        .select([
          'ce.id',
          'ce.public_id as publicId',
          'ce.course_id as courseId',
          'ce.user_id as userId',
          'ce.status',
          'ce.progress_percent as progressPercent',
          'ce.started_at as startedAt',
          'ce.completed_at as completedAt',
          'ce.last_accessed_at as lastAccessedAt',
          'ce.metadata',
          'ce.created_at as createdAt',
          'ce.updated_at as updatedAt'
        ])
        .where('ce.user_id', user.id)
        .orderBy('ce.created_at', 'desc');
      const enrollments = enrollmentRows.map((row) => CourseEnrollmentModel.deserialize(row));
      const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
      const courseProgress = enrollmentIds.length
        ? await CourseProgressModel.listByEnrollmentIds(enrollmentIds)
        : [];

      const courseIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.courseId))).filter(Boolean);
      const courseRecords = courseIds.length
        ? await Promise.all(courseIds.map((id) => CourseModel.findById(id)))
        : [];
      const courses = courseRecords.filter(Boolean);

      const tutorBookingRows = await db('tutor_bookings as tb')
        .leftJoin('tutor_profiles as tp', 'tb.tutor_id', 'tp.id')
        .leftJoin('users as tu', 'tp.user_id', 'tu.id')
        .select([
          'tb.id',
          'tb.public_id as publicId',
          'tb.tutor_id as tutorId',
          'tb.learner_id as learnerId',
          'tb.scheduled_start as scheduledStart',
          'tb.scheduled_end as scheduledEnd',
          'tb.duration_minutes as durationMinutes',
          'tb.hourly_rate_amount as hourlyRateAmount',
          'tb.hourly_rate_currency as hourlyRateCurrency',
          'tb.meeting_url as meetingUrl',
          'tb.status',
          'tb.metadata',
          'tp.display_name as tutorDisplayName',
          'tu.first_name as tutorFirstName',
          'tu.last_name as tutorLastName'
        ])
        .where('tb.learner_id', user.id)
        .orderBy('tb.scheduled_start', 'desc')
        .limit(100);
      const tutorBookings = tutorBookingRows.map((row) => ({
        id: row.id,
        publicId: row.publicId,
        tutorId: row.tutorId,
        learnerId: row.learnerId,
        tutorFirstName: row.tutorFirstName,
        tutorLastName: row.tutorLastName,
        tutorName: row.tutorDisplayName ?? resolveName(row.tutorFirstName, row.tutorLastName, `Tutor ${row.tutorId}`),
        scheduledStart: row.scheduledStart ? new Date(row.scheduledStart) : null,
        scheduledEnd: row.scheduledEnd ? new Date(row.scheduledEnd) : null,
        durationMinutes: Number(row.durationMinutes ?? 60),
        hourlyRateAmount: Number(row.hourlyRateAmount ?? 0),
        hourlyRateCurrency: row.hourlyRateCurrency ?? 'USD',
        meetingUrl: row.meetingUrl ?? null,
        status: row.status ?? 'requested',
        metadata: safeJsonParse(row.metadata, {})
      }));

      const tutorIds = Array.from(new Set(tutorBookings.map((booking) => booking.tutorId).filter(Boolean)));
      const availabilityRows = tutorIds.length
        ? await db('tutor_availability_slots as tas')
            .select([
              'tas.id',
              'tas.tutor_id as tutorId',
              'tas.start_at as startAt',
              'tas.end_at as endAt',
              'tas.status',
              'tas.metadata'
            ])
            .whereIn('tas.tutor_id', tutorIds)
            .andWhere('tas.start_at', '>=', referenceDate)
            .orderBy('tas.start_at', 'asc')
            .limit(100)
        : [];
      const tutorAvailability = availabilityRows.map((row) => ({
        tutorId: row.tutorId,
        startAt: row.startAt ? new Date(row.startAt) : null,
        endAt: row.endAt ? new Date(row.endAt) : null,
        status: row.status,
        metadata: safeJsonParse(row.metadata, {})
      }));

      communitySummaries = await CommunityService.listForUser(user.id);
      const communityIds = communitySummaries
        .map((community) => (Number.isFinite(Number(community.id)) ? Number(community.id) : null))
        .filter((id) => id !== null);

      const ebookProgressRows = await db('ebook_read_progress as erp')
        .select([
          'erp.id',
          'erp.asset_id as assetId',
          'erp.user_id as userId',
          'erp.progress_percent as progressPercent',
          'erp.last_location as lastLocation',
          'erp.time_spent_seconds as timeSpentSeconds',
          'erp.updated_at as updatedAt',
          'erp.created_at as createdAt'
        ])
        .where('erp.user_id', user.id)
        .orderBy('erp.updated_at', 'desc')
        .limit(100);
      const ebookProgress = ebookProgressRows.map((row) => EbookProgressModel.deserialize(row));

      const ebookAssetIds = Array.from(new Set(ebookProgress.map((entry) => entry.assetId).filter(Boolean)));
      const ebookCatalog = new Map();
      if (ebookAssetIds.length) {
        const ebookRows = await db('ebooks')
          .select(['id', 'public_id as publicId', 'asset_id as assetId', 'title', 'price_amount as priceAmount', 'price_currency as priceCurrency', 'status'])
          .whereIn('asset_id', ebookAssetIds);
        ebookRows.forEach((row) => {
          ebookCatalog.set(row.assetId, {
            id: row.publicId ?? `ebook-${row.id}`,
            title: row.title,
            priceAmount: Number(row.priceAmount ?? 0),
            priceCurrency: row.priceCurrency ?? 'USD',
            status: row.status ?? 'draft'
          });
        });
      }

      const paymentRows = await db('payment_intents as pi')
        .select([
          'pi.id',
          'pi.public_id as publicId',
          'pi.amount_total as amountTotal',
          'pi.amount_refunded as amountRefunded',
          'pi.currency',
          'pi.status',
          'pi.metadata',
          'pi.created_at as createdAt'
        ])
        .where('pi.user_id', user.id)
        .orderBy('pi.created_at', 'desc')
        .limit(25);
      const invoices = paymentRows.map((row) => ({
        id: row.publicId ?? `invoice-${row.id}`,
        label: safeJsonParse(row.metadata, {}).description ?? 'Invoice',
        amountCents: Number(row.amountTotal ?? 0),
        currency: row.currency ?? 'USD',
        status: row.status ?? 'open',
        date: row.createdAt ? new Date(row.createdAt) : null
      }));

      const communitySubscriptions = await CommunitySubscriptionModel.listByUser(user.id);

      const [followersCount, followingCount, pendingFollowersData, outgoingFollowersData, recommendationData, privacySettings] =
        await Promise.all([
          UserFollowModel.countFollowers(user.id),
          UserFollowModel.countFollowing(user.id),
          UserFollowModel.listFollowers(user.id, { status: 'pending', limit: 10 }),
          UserFollowModel.listFollowing(user.id, { status: 'pending', limit: 10 }),
          FollowRecommendationModel.listForUser(user.id, { limit: 10 }),
          UserPrivacySettingModel.getForUser(user.id)
        ]);

      const mapFollowEntry = (entry, prefix) => ({
        id: `${prefix}-${entry.relationship.id}`,
        name: resolveName(entry.user?.firstName, entry.user?.lastName, entry.user?.email ?? 'Member'),
        email: entry.user?.email ?? null,
        requestedAt: entry.relationship?.createdAt ?? null,
        score: entry.relationship?.metadata?.score ?? null,
        reason: entry.relationship?.reason ?? null
      });

      const pendingFollowers = Array.isArray(pendingFollowersData?.items)
        ? pendingFollowersData.items.map((entry) => mapFollowEntry(entry, 'pending'))
        : [];
      const outgoingFollowers = Array.isArray(outgoingFollowersData?.items)
        ? outgoingFollowersData.items.map((entry) => mapFollowEntry(entry, 'outgoing'))
        : [];
      const followRecommendations = Array.isArray(recommendationData)
        ? recommendationData.map((entry) => ({
            id: `recommendation-${entry.recommendation.id}`,
            name: resolveName(entry.user?.firstName, entry.user?.lastName, entry.user?.email ?? 'Member'),
            email: entry.user?.email ?? null,
            score: entry.recommendation?.score ?? null,
            reason: entry.recommendation?.reasonCode ?? null
          }))
        : [];

      const communityEventsList =
        communityIds.length > 0
          ? await Promise.all(
              communityIds.map((communityId) =>
                CommunityEventModel.listForCommunity(communityId, { from: referenceDate, limit: 10 })
              )
            )
          : [];

      const flattenedCommunityEvents = [];
      communityIds.forEach((communityId, index) => {
        const events = communityEventsList[index] ?? [];
        communityEventsByCommunity.set(communityId, events);
        const community = communitySummaries.find((entry) => entry.id === communityId);
        events.forEach((event) => {
          flattenedCommunityEvents.push({
            ...event,
            communityId,
            communityName: community?.name ?? `Community ${communityId}`
          });
        });
      });

      const liveClassroomRows =
        communityIds.length > 0
          ? await db('live_classrooms as lc')
              .select([
                'lc.id',
                'lc.public_id as publicId',
                'lc.community_id as communityId',
                'lc.title',
                'lc.type',
                'lc.status',
                'lc.start_at as startAt',
                'lc.end_at as endAt',
                'lc.capacity',
                'lc.reserved_seats as reservedSeats',
                'lc.metadata'
              ])
              .whereIn('lc.community_id', communityIds)
              .andWhere('lc.status', 'scheduled')
              .andWhere('lc.start_at', '>=', referenceDate)
              .orderBy('lc.start_at', 'asc')
              .limit(50)
          : [];
      const liveClassrooms = liveClassroomRows.map((row) => ({
        id: row.publicId ?? `live-${row.id}`,
        communityId: row.communityId,
        title: row.title,
        type: row.type,
        status: row.status,
        startAt: row.startAt ? new Date(row.startAt) : null,
        endAt: row.endAt ? new Date(row.endAt) : null,
        capacity: Number(row.capacity ?? 0),
        reservedSeats: Number(row.reservedSeats ?? 0),
        metadata: safeJsonParse(row.metadata, {})
      }));

      const learnerFollowerSummary = {
        followers: followersCount ?? 0,
        following: followingCount ?? 0,
        pending: pendingFollowers,
        outgoing: outgoingFollowers,
        recommendations: followRecommendations
      };

      learnerSnapshot =
        buildLearnerDashboard({
          user,
          now: referenceDate,
          enrollments,
          courses,
          courseProgress,
          tutorBookings,
          tutorAvailability,
          liveClassrooms,
          ebookProgress,
          ebooks: ebookCatalog,
          invoices,
          communityMemberships: communitySummaries,
          communityEvents: flattenedCommunityEvents,
          communityPipelines: [],
          communitySubscriptions,
          followerSummary: learnerFollowerSummary,
          privacySettings,
          messagingSummary: null,
          notifications: []
        }) ?? undefined;
    } catch (error) {
      log.warn({ err: error }, 'Failed to load learner dashboard data');
    }

    try {
      if (communitySummaries.length) {
        const [
          { default: CommunityMemberModel },
          { default: CommunityResourceModel },
          { default: CommunityPaywallTierModel },
          { default: CommunitySubscriptionModel },
          { default: CommunityPostModerationCaseModel },
          { default: ReportingCommunityEngagementDailyView },
          { default: CommunityPostModel },
          { default: CommunityEventModel }
        ] = await Promise.all([
          import('../models/CommunityMemberModel.js'),
          import('../models/CommunityResourceModel.js'),
          import('../models/CommunityPaywallTierModel.js'),
          import('../models/CommunitySubscriptionModel.js'),
          import('../models/CommunityPostModerationCaseModel.js'),
          import('../models/ReportingCommunityEngagementDailyView.js'),
          import('../models/CommunityPostModel.js'),
          import('../models/CommunityEventModel.js')
        ]);

        const communityIds = communitySummaries
          .map((community) => (Number.isFinite(Number(community.id)) ? Number(community.id) : null))
          .filter((id) => id !== null);

        if (communityIds.length && communityEventsByCommunity.size === 0) {
          const eventsLists = await Promise.all(
            communityIds.map((communityId) =>
              CommunityEventModel.listForCommunity(communityId, { from: referenceDate, limit: 10 })
            )
          );
          communityIds.forEach((communityId, index) => {
            communityEventsByCommunity.set(communityId, eventsLists[index] ?? []);
          });
        }

        const memberLists = await Promise.all(communityIds.map((id) => CommunityMemberModel.listByCommunity(id)));
        const runbookLists = await Promise.all(
          communityIds.map((id) => CommunityResourceModel.listForCommunity(id, { resourceType: 'runbook', limit: 10 }))
        );
        const tierLists = await Promise.all(communityIds.map((id) => CommunityPaywallTierModel.listByCommunity(id)));
        const subscriptionLists = await Promise.all(
          communityIds.map((id) => CommunitySubscriptionModel.listByCommunity(id, { status: 'active' }))
        );
        const moderationLists = await Promise.all(
          communityIds.map((id) =>
            CommunityPostModerationCaseModel.list(
              { communityId: id, status: ['pending', 'in_review', 'escalated'] },
              { perPage: 50 }
            )
          )
        );
        const communicationsLists = await Promise.all(
          communityIds.map((id) => CommunityPostModel.paginateForCommunity(id, { perPage: 10 }))
        );

        communityIds.forEach((communityId, index) => {
          const members = memberLists[index] ?? [];
          communityPendingMembersByCommunity.set(
            communityId,
            members.filter((member) => member.status && member.status !== 'active')
          );
          communityModeratorsByCommunity.set(
            communityId,
            members.filter((member) => ['owner', 'admin', 'moderator'].includes(member.role))
          );
          communityRunbooksByCommunity.set(communityId, runbookLists[index]?.items ?? []);
          communityPaywallTiersByCommunity.set(communityId, tierLists[index] ?? []);
          communitySubscriptionsByCommunity.set(communityId, subscriptionLists[index] ?? []);
          communityModerationCases.push(...(moderationLists[index]?.items ?? []));
          communicationsByCommunity.set(communityId, communicationsLists[index]?.items ?? []);
        });

        const engagementStart = new Date(referenceDate.getTime() - 7 * DAY_IN_MS);
        const previousStart = new Date(engagementStart.getTime() - 7 * DAY_IN_MS);
        const previousEnd = new Date(engagementStart.getTime() - DAY_IN_MS);
        const currentTotals = await ReportingCommunityEngagementDailyView.fetchTotals({
          start: engagementStart,
          end: referenceDate
        });
        const previousTotals = await ReportingCommunityEngagementDailyView.fetchTotals({
          start: previousStart,
          end: previousEnd
        });
        engagementTotals = { current: currentTotals, previous: previousTotals };

        communitySnapshot =
          buildCommunityDashboard({
            user,
            now: referenceDate,
            communities: communitySummaries,
            eventsByCommunity: communityEventsByCommunity,
            runbooksByCommunity: communityRunbooksByCommunity,
            paywallTiersByCommunity: communityPaywallTiersByCommunity,
            subscriptionsByCommunity: communitySubscriptionsByCommunity,
            pendingMembersByCommunity: communityPendingMembersByCommunity,
            moderatorsByCommunity: communityModeratorsByCommunity,
            moderationCases: communityModerationCases,
            communicationsByCommunity,
            engagementTotals
          }) ?? undefined;
      }
    } catch (error) {
      log.warn({ err: error }, 'Failed to load community operations dashboard data');
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

    let learnerSnapshot;
    let communitySnapshot;
    let communityMemberships = [];

    try {
      const [
        { default: CourseEnrollmentModel },
        { default: CourseProgressModel },
        { default: CourseModel },
        { default: TutorBookingModel },
        { default: LiveClassroomModel },
        { default: EbookProgressModel },
        { default: EbookModel },
        { default: PaymentIntentModel },
        { default: CommunityService },
        { default: CommunityResourceModel },
        { default: CommunityEventModel },
        { default: CommunityPaywallTierModel },
        { default: CommunitySubscriptionModel },
        { default: SecurityIncidentModel }
      ] = await Promise.all([
        import('../models/CourseEnrollmentModel.js'),
        import('../models/CourseProgressModel.js'),
        import('../models/CourseModel.js'),
        import('../models/TutorBookingModel.js'),
        import('../models/LiveClassroomModel.js'),
        import('../models/EbookProgressModel.js'),
        import('../models/EbookModel.js'),
        import('../models/PaymentIntentModel.js'),
        import('../services/CommunityService.js'),
        import('../models/CommunityResourceModel.js'),
        import('../models/CommunityEventModel.js'),
        import('../models/CommunityPaywallTierModel.js'),
        import('../models/CommunitySubscriptionModel.js'),
        import('../models/SecurityIncidentModel.js')
      ]);

      const learnerEnrollments = await CourseEnrollmentModel.listByUserId(user.id);
      const learnerEnrollmentIds = learnerEnrollments.map((enrollment) => enrollment.id);
      const [
        learnerProgress,
        learnerBookings,
        learnerLiveClassrooms,
        learnerEbookProgress,
        learnerPaymentIntents,
        memberships
      ] = await Promise.all([
        learnerEnrollmentIds.length ? CourseProgressModel.listByEnrollmentIds(learnerEnrollmentIds) : Promise.resolve([]),
        TutorBookingModel.listByLearnerId(user.id, { limit: 50 }),
        LiveClassroomModel.listForLearner(user.id, { limit: 50 }),
        EbookProgressModel.listByUser(user.id),
        PaymentIntentModel.listByUser(user.id, { limit: 50 }),
        CommunityService.listForUser(user.id)
      ]);

      communityMemberships = memberships ?? [];
      const courseIds = Array.from(new Set(learnerEnrollments.map((enrollment) => enrollment.courseId).filter(Boolean)));
      const learnerCourses = courseIds.length ? await CourseModel.listByIds(courseIds) : [];
      const recommendedCourses = await CourseModel.listPublished({ limit: 6, excludeIds: courseIds });

      const instructorDirectory = new Map();
      const instructorIds = new Set(learnerCourses.map((course) => course.instructorId).filter(Boolean));
      if (instructorIds.size) {
        const instructorRecords = await UserModel.findByIds(Array.from(instructorIds));
        instructorRecords.forEach((record) => instructorDirectory.set(record.id, record));
      }

      const ebookAssetIds = learnerEbookProgress.map((progress) => progress.assetId).filter(Boolean);
      const ebookLibrary = ebookAssetIds.length ? await EbookModel.listByAssetIds(ebookAssetIds) : [];
      const ebookRecommendations = [];

      const communityIds = communityMemberships.map((community) => community.id).filter(Boolean);
      const [runbookLists, eventLists, tierLists, subscriptionLists, incidentLists] = communityIds.length
        ? await Promise.all([
            Promise.all(
              communityIds.map((communityId) =>
                CommunityResourceModel.listForCommunity(communityId, { limit: 10, resourceType: 'runbook' })
              )
            ),
            Promise.all(
              communityIds.map((communityId) =>
                CommunityEventModel.listForCommunity(communityId, {
                  from: new Date(referenceDate.getTime() - 14 * DAY_IN_MS).toISOString(),
                  limit: 15
                })
              )
            ),
            Promise.all(communityIds.map((communityId) => CommunityPaywallTierModel.listByCommunity(communityId))),
            Promise.all(communityIds.map((communityId) => CommunitySubscriptionModel.listByCommunity(communityId))),
            Promise.all(communityIds.map((communityId) => SecurityIncidentModel.listActive({ tenantId: `community-${communityId}` })))
          ])
        : [[], [], [], [], []];

      const runbookMap = new Map();
      const eventMap = new Map();
      const tierMap = new Map();
      const subscriptionMap = new Map();
      const incidentMap = new Map();

      communityIds.forEach((communityId, index) => {
        const runbookPayload = runbookLists[index];
        runbookMap.set(communityId, Array.isArray(runbookPayload?.items) ? runbookPayload.items : runbookPayload ?? []);
        eventMap.set(communityId, eventLists[index] ?? []);
        tierMap.set(communityId, tierLists[index] ?? []);
        subscriptionMap.set(communityId, subscriptionLists[index] ?? []);
        incidentMap.set(communityId, incidentLists[index] ?? []);
      });

      const communityPipelines = communityMemberships.flatMap((community) => {
        const pipelines = Array.isArray(community.metadata?.pipelines) ? community.metadata.pipelines : [];
        return pipelines.map((pipeline, index) => ({
          id: `${community.id}-pipeline-${index}`,
          title: pipeline.title ?? `${community.name} pipeline`,
          owner: pipeline.owner ?? 'Community ops',
          progress: Number(pipeline.progress ?? pipeline.completion ?? 50)
        }));
      });

      learnerSnapshot =
        buildLearnerDashboard({
          user,
          now: referenceDate,
          enrollments: learnerEnrollments,
          courses: [...learnerCourses, ...recommendedCourses],
          courseProgress: learnerProgress,
          instructorDirectory,
          tutorBookings: learnerBookings,
          liveClassrooms: learnerLiveClassrooms,
          ebookLibrary,
          ebookProgress: learnerEbookProgress,
          ebookRecommendations,
          paymentIntents: learnerPaymentIntents,
          communities: communityMemberships,
          communityPipelines
        }) ?? undefined;

      communitySnapshot =
        buildCommunityDashboard({
          now: referenceDate,
          communities: communityMemberships,
          runbooks: runbookMap,
          events: eventMap,
          paywallTiers: tierMap,
          subscriptions: subscriptionMap,
          safetyIncidents: incidentMap,
          communications: new Map()
        }) ?? undefined;
    } catch (error) {
      log.warn({ err: error }, 'Failed to load learner or community dashboard data');
    }

    const dashboards = {};
    const searchIndex = [];
    const roles = [];
    const profileStats = [];
    const profileBioSegments = [];
    const feedHighlights = [];
    let profileTitleSegment = null;

    const pushRole = (role) => {
      if (!role || !role.id) return;
      if (roles.some((entry) => entry.id === role.id)) return;
      roles.push({ id: role.id, label: role.label ?? role.id });
    };

    const applySnapshot = (key, snapshot) => {
      if (!snapshot) return;
      dashboards[key] = snapshot.dashboard;
      if (Array.isArray(snapshot.searchIndex)) {
        searchIndex.push(...snapshot.searchIndex);
      }
      if (Array.isArray(snapshot.profileStats)) {
        profileStats.push(...snapshot.profileStats);
      }
      if (snapshot.profileBio) {
        profileBioSegments.push(snapshot.profileBio);
      }
      if (!profileTitleSegment && snapshot.profileTitleSegment) {
        profileTitleSegment = snapshot.profileTitleSegment;
      }
      if (Array.isArray(snapshot.feedHighlights)) {
        feedHighlights.push(...snapshot.feedHighlights);
      }
      pushRole(snapshot.role);
    };

    applySnapshot('learner', learnerSnapshot);
    applySnapshot('community', communitySnapshot);
    applySnapshot('instructor', instructorSnapshot);

    if (operatorSnapshot) {
      dashboards.admin = operatorSnapshot.dashboard;
      if (Array.isArray(operatorSnapshot.searchIndex)) {
        searchIndex.push(...operatorSnapshot.searchIndex);
      }
      if (Array.isArray(operatorSnapshot.profileStats)) {
        profileStats.push(...operatorSnapshot.profileStats);
      }
      if (operatorSnapshot.profileBio) {
        profileBioSegments.push(operatorSnapshot.profileBio);
      }
      if (!profileTitleSegment && operatorSnapshot.profileTitleSegment) {
        profileTitleSegment = operatorSnapshot.profileTitleSegment;
      }
      if (Array.isArray(operatorSnapshot.feedHighlights)) {
        feedHighlights.push(...operatorSnapshot.feedHighlights);
      }
      pushRole({ id: 'admin', label: 'Admin' });
    }

    if (user.role && !roles.some((role) => role.id === user.role)) {
      roles.push({ id: user.role, label: user.role.charAt(0).toUpperCase() + user.role.slice(1) });
    }

    const profileBio = profileBioSegments.join(' ').trim() || null;
    const uniqueFeedHighlights = Array.from(new Set(feedHighlights));

    const profile = {
      id: user.id,
      name: resolveName(user.firstName, user.lastName, user.email),
      email: user.email,
      avatar: buildAvatarUrl(user.email),
      title: profileTitleSegment,
      bio: profileBio,
      stats: profileStats,
      feedHighlights: uniqueFeedHighlights
    };

    return {
      profile,
      roles,
      dashboards,
      searchIndex
    };
  }
}
