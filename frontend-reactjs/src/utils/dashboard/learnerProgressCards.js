const DEFAULT_BASE_HREF = '/dashboard/courses';

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function deriveCourseKey(course) {
  if (!course) return null;
  return course.courseId ?? course.id ?? course.slug ?? null;
}

function normaliseDueLabel(goal) {
  if (!goal) return null;
  if (goal.dueLabel) return goal.dueLabel;
  if (goal.dueDate) {
    const date = new Date(goal.dueDate);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
  }
  return null;
}

function normaliseGoal(goal) {
  if (!goal) return null;
  const focusMinutes = toNumber(goal.focusMinutesPerWeek);
  const progressPercent = toNumber(goal.progressPercent);
  return {
    statusLabel: goal.statusLabel ?? goal.status ?? null,
    dueLabel: normaliseDueLabel(goal),
    focusMinutesPerWeek: focusMinutes ?? null,
    nextStep: goal.nextStep ?? goal.upNext ?? null,
    progressPercent: progressPercent ?? null,
    priority: toNumber(goal.priority)
  };
}

function deriveNextLabel(course, goal) {
  if (course?.nextLessonLabel) {
    return course.nextLessonLabel;
  }
  if (course?.nextLesson?.title) {
    const moduleTitle = course.nextLesson.moduleTitle ?? course.nextLesson.module?.title ?? null;
    return moduleTitle ? `${moduleTitle} · ${course.nextLesson.title}` : course.nextLesson.title;
  }
  if (course?.nextLesson) {
    return course.nextLesson;
  }
  const normalisedGoal = normaliseGoal(goal);
  if (normalisedGoal?.nextStep) {
    return normalisedGoal.nextStep;
  }
  if (goal?.nextLessonLabel) {
    return goal.nextLessonLabel;
  }
  return null;
}

function deriveProgressPercent(course, goal) {
  const goalPercent = normaliseGoal(goal)?.progressPercent;
  const coursePercent = toNumber(course?.progressPercent ?? course?.progress);
  if (coursePercent != null) {
    return Math.max(0, Math.min(100, coursePercent));
  }
  if (goalPercent != null) {
    return Math.max(0, Math.min(100, goalPercent));
  }
  return 0;
}

function normalisePromotion(promotion) {
  if (!promotion) {
    return null;
  }
  const headline = promotion.headline ?? promotion.title ?? null;
  if (!headline) {
    return null;
  }
  const caption = promotion.caption ?? promotion.body ?? null;
  const actionLabel = promotion.actionLabel ?? promotion.action?.label ?? null;
  const actionHref = promotion.actionHref ?? promotion.action?.href ?? null;
  const action = actionLabel && actionHref ? { label: actionLabel, href: actionHref } : null;
  return {
    headline,
    caption,
    action
  };
}

function deriveLinks(course, baseHref, courseKey) {
  const resolvedBaseHref = baseHref || DEFAULT_BASE_HREF;
  const defaultCourseHref = courseKey ? `${resolvedBaseHref}?courseId=${encodeURIComponent(courseKey)}` : null;
  const courseHref = course?.courseHref ?? course?.href ?? defaultCourseHref;
  const modulesHref = course?.modulesHref ?? (courseHref ? `${courseHref}#modules` : null);
  return { course: courseHref, modules: modulesHref };
}

function deriveMeta(course) {
  if (course?.meta?.lastUpdatedLabel) {
    return { lastUpdatedLabel: course.meta.lastUpdatedLabel };
  }
  if (course?.lastTouchedLabel) {
    return { lastUpdatedLabel: course.lastTouchedLabel };
  }
  return null;
}

function shouldHighlight(goal) {
  if (!goal) return false;
  const priority = toNumber(goal.priority);
  if (priority != null && priority <= 1) {
    return true;
  }
  const status = goal.status ?? goal.statusLabel ?? '';
  return typeof status === 'string' && status.toLowerCase().includes('focus');
}

export function buildLearnerProgressCardPayload(course, { goal: explicitGoal, promotion, baseHref, fallbackId } = {}) {
  const courseKey = deriveCourseKey(course);
  const goal = explicitGoal ?? course?.goal ?? null;
  const promo = promotion ?? course?.revenueOpportunity ?? null;
  const cardGoal = normaliseGoal(goal);
  const links = deriveLinks(course, baseHref, courseKey);
  const id = courseKey ?? fallbackId ?? course?.title ?? 'course';

  return {
    id,
    title: course?.title ?? 'Course',
    status: course?.status ?? 'Active',
    instructor: course?.instructor ?? null,
    progressPercent: deriveProgressPercent(course, goal),
    nextLabel: deriveNextLabel(course, goal),
    goal: cardGoal
      ? {
          statusLabel: cardGoal.statusLabel,
          dueLabel: cardGoal.dueLabel,
          focusMinutesPerWeek: cardGoal.focusMinutesPerWeek,
          nextStep: cardGoal.nextStep
        }
      : null,
    highlight: shouldHighlight(goal),
    revenue: normalisePromotion(promo),
    meta: deriveMeta(course),
    links
  };
}

export function buildLearnerProgressCards({
  courses = [],
  goals = [],
  promotions = [],
  baseHref = DEFAULT_BASE_HREF,
  limit = 3
} = {}) {
  const goalMap = new Map();
  goals.forEach((goal) => {
    const key = deriveCourseKey(goal);
    if (!key) return;
    goalMap.set(key, goal);
  });

  const promotionMap = new Map();
  promotions.forEach((promotion) => {
    const key = deriveCourseKey(promotion);
    if (!key) return;
    promotionMap.set(key, promotion);
  });

  const items = [];
  courses.forEach((course, index) => {
    if (limit != null && items.length >= limit) {
      return;
    }
    const courseKey = deriveCourseKey(course);
    const card = buildLearnerProgressCardPayload(course, {
      goal: goalMap.get(courseKey),
      promotion: promotionMap.get(courseKey),
      baseHref,
      fallbackId: `course-${index}`
    });
    items.push(card);
  });

  return items;
}

export default buildLearnerProgressCards;
