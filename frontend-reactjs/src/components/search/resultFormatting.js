import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  SparklesIcon,
  StarIcon,
  UserCircleIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

const ENTITY_ICON_MAP = {
  communities: UsersIcon,
  courses: AcademicCapIcon,
  ebooks: BookOpenIcon,
  tutors: UsersIcon,
  profiles: UserCircleIcon,
  events: CalendarDaysIcon
};

export function getEntityIcon(entityType) {
  return ENTITY_ICON_MAP[entityType] ?? ArrowTopRightOnSquareIcon;
}

export function formatNumber(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (Number.isNaN(number)) return null;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(number);
}

export function formatCurrency(value) {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }
  if (typeof value === 'object') {
    const amount = Number(value.amount ?? value.value);
    if (!Number.isFinite(amount)) {
      return null;
    }
    const currency = value.currency ?? 'USD';
    const divisor = amount >= 100 ? 100 : 1;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / divisor);
  }
  return null;
}

export function formatDuration(minutes) {
  if (!minutes || Number.isNaN(Number(minutes))) return null;
  const mins = Number(minutes);
  if (mins < 60) return `${Math.round(mins)} min`;
  const hours = mins / 60;
  return `${hours.toFixed(hours < 10 ? 1 : 0)} hr`;
}

export function extractImageUrl(hit = {}) {
  return (
    hit.imageUrl ??
    hit.coverImageUrl ??
    hit.thumbnailUrl ??
    hit.avatarUrl ??
    hit.preview?.imageUrl ??
    hit.previewImage ??
    hit.preview?.image ??
    hit.media?.[0]?.url ??
    hit.assets?.[0]?.url ??
    hit.raw?.coverImageUrl ??
    hit.raw?.thumbnailUrl ??
    hit.raw?.avatarUrl ??
    hit.raw?.previewImage ??
    hit.raw?.media?.[0]?.url ??
    null
  );
}

export function buildBadgeLabels(hit = {}) {
  const labels = [];
  const monetisationTag =
    hit.monetisationTag ??
    hit.monetisation?.tag ??
    hit.badges?.find((badge) => badge.type === 'sponsored')?.label ??
    (hit.isSponsored ? 'Sponsored' : null);

  if (monetisationTag) {
    labels.push({ label: monetisationTag, tone: 'amber' });
  }

  if (hit.featured || hit.badges?.some((badge) => badge.type === 'featured')) {
    labels.push({ label: 'Featured', tone: 'indigo' });
  }

  if (hit.badges?.length) {
    hit.badges
      .filter((badge) => badge.type !== 'featured' && badge.type !== 'sponsored')
      .slice(0, 3)
      .forEach((badge) => {
        labels.push({ label: badge.label ?? badge.type, tone: badge.tone ?? 'slate' });
      });
  }

  return labels;
}

export function extractMetrics(hit = {}) {
  const price = formatCurrency(hit.price ?? hit.metrics?.price ?? hit.raw?.price);
  const ratingValue = hit.metrics?.rating?.average ?? hit.raw?.rating?.average;
  const rating = ratingValue ? `${formatNumber(ratingValue)}★` : null;
  const enrolments = formatNumber(hit.metrics?.enrolments ?? hit.raw?.enrolmentCount);
  const readingTime = formatDuration(hit.metrics?.readingTimeMinutes ?? hit.raw?.readingTimeMinutes);
  const location = hit.geo?.country ?? hit.raw?.country ?? hit.metrics?.location;
  const availability = hit.metrics?.startAt ?? hit.raw?.startAt ?? hit.metrics?.upcomingSession;

  return { price, rating, enrolments, readingTime, location, availability };
}

export const ICONS = {
  CurrencyDollarIcon,
  StarIcon,
  SparklesIcon,
  GlobeAltIcon
};
