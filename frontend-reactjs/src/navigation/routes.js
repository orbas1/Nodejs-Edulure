import {
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  BookmarkSquareIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  MegaphoneIcon,
  PencilSquareIcon,
  PlayCircleIcon,
  Squares2X2Icon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

export const PRIMARY_NAVIGATION = [
  {
    id: 'feed',
    label: 'Feed',
    to: '/feed',
    icon: Squares2X2Icon,
    description: 'Keep up with your enrolled cohorts and community signals.'
  },
  {
    id: 'courses',
    label: 'Courses',
    to: '/courses',
    icon: AcademicCapIcon,
    description: 'Browse adaptive programmes, self-paced paths, and workshops.'
  },
  {
    id: 'communities',
    label: 'Communities',
    to: '/communities',
    icon: UserGroupIcon,
    description: 'Join conversation-first learning spaces with live programming.'
  },
  {
    id: 'tutors',
    label: 'Tutors',
    to: '/tutors',
    icon: MegaphoneIcon,
    description: 'Book verified mentors for 1:1 or group sessions.'
  },
  {
    id: 'library',
    label: 'Library',
    to: '/ebooks',
    icon: BookmarkSquareIcon,
    description: 'Unlock playbooks, templates, and on-demand resources.'
  }
];

export const QUICK_CREATE_ACTIONS = [
  {
    id: 'create-post',
    label: 'New post',
    description: 'Publish an announcement or share a win with your community.',
    icon: PencilSquareIcon,
    to: '/dashboard/learner/communities',
    analyticsId: 'quick-action-create-post'
  },
  {
    id: 'launch-session',
    label: 'Schedule live session',
    description: 'Spin up a live classroom with chat, recordings, and attendance.',
    icon: CalendarDaysIcon,
    to: '/dashboard/instructor/live-classes',
    analyticsId: 'quick-action-launch-session'
  },
  {
    id: 'upload-course',
    label: 'Upload course asset',
    description: 'Add modules, lessons, or supporting downloads to a course.',
    icon: BuildingLibraryIcon,
    to: '/dashboard/instructor/courses/create',
    analyticsId: 'quick-action-upload-course'
  }
];

export const NOTIFICATION_GROUPS = [
  {
    id: 'communities',
    label: 'Communities',
    description: 'Mentions, replies, and scheduled event reminders.'
  },
  {
    id: 'courses',
    label: 'Courses',
    description: 'Assignment feedback, cohort milestones, and grading alerts.'
  },
  {
    id: 'payouts',
    label: 'Payouts & monetisation',
    description: 'Revenue summaries, invoice notices, and ads pacing updates.'
  }
];

const dashboardBaseNavigation = {
  learner: (basePath) => [
    { type: 'link', id: 'learner-home', name: 'Overview', to: basePath, icon: Squares2X2Icon, end: true },
    {
      type: 'section',
      id: 'learner-discover',
      name: 'Discover',
      icon: PlayCircleIcon,
      children: [
        { id: 'learner-courses', name: 'Courses', to: `${basePath}/courses`, icon: AcademicCapIcon },
        { id: 'learner-live', name: 'Live classes', to: `${basePath}/live-classes`, icon: CalendarDaysIcon },
        { id: 'learner-library', name: 'Library', to: `${basePath}/ebooks`, icon: BookmarkSquareIcon }
      ]
    },
    {
      type: 'section',
      id: 'learner-community',
      name: 'Community',
      icon: UserGroupIcon,
      children: [
        { id: 'learner-feed', name: 'Community feed', to: `${basePath}/communities`, icon: ChatBubbleLeftRightIcon },
        { id: 'learner-social', name: 'Social graph', to: `${basePath}/social`, icon: UserGroupIcon },
        { id: 'learner-inbox', name: 'Inbox', to: `${basePath}/community-chats`, icon: ChatBubbleLeftRightIcon }
      ]
    },
    {
      type: 'section',
      id: 'learner-growth',
      name: 'Growth',
      icon: ArrowTrendingUpIcon,
      children: [
        { id: 'learner-growth-dashboard', name: 'Growth workspace', to: `${basePath}/growth`, icon: ChartBarIcon },
        { id: 'learner-affiliate', name: 'Affiliate', to: `${basePath}/affiliate`, icon: MegaphoneIcon },
        { id: 'learner-settings', name: 'Settings', to: `${basePath}/settings`, icon: Cog6ToothIcon }
      ]
    }
  ],
  instructor: (basePath) => [
    { type: 'link', id: 'instructor-home', name: 'Overview', to: basePath, icon: Squares2X2Icon, end: true },
    {
      type: 'section',
      id: 'instructor-studio',
      name: 'Creation studio',
      icon: PencilSquareIcon,
      children: [
        { id: 'instructor-course-create', name: 'Build course', to: `${basePath}/courses/create`, icon: AcademicCapIcon },
        { id: 'instructor-library', name: 'Course library', to: `${basePath}/courses/library`, icon: BuildingLibraryIcon },
        { id: 'instructor-assets', name: 'Content assets', to: `${basePath}/ebooks`, icon: BookmarkSquareIcon }
      ]
    },
    {
      type: 'section',
      id: 'instructor-clients',
      name: 'Learners',
      icon: UserGroupIcon,
      children: [
        { id: 'instructor-roster', name: 'Rosters', to: `${basePath}/bookings`, icon: CalendarDaysIcon },
        { id: 'instructor-inbox', name: 'Inbox', to: `${basePath}/inbox`, icon: ChatBubbleLeftRightIcon },
        { id: 'instructor-calendar', name: 'Calendar', to: `${basePath}/calendar`, icon: CalendarDaysIcon }
      ]
    },
    {
      type: 'section',
      id: 'instructor-growth',
      name: 'Growth',
      icon: ArrowTrendingUpIcon,
      children: [
        { id: 'instructor-analytics', name: 'Analytics', to: `${basePath}/growth`, icon: ChartBarIcon },
        { id: 'instructor-ads', name: 'Ads', to: `${basePath}/ads`, icon: MegaphoneIcon },
        { id: 'instructor-pricing', name: 'Pricing', to: `${basePath}/pricing`, icon: ChartBarIcon }
      ]
    }
  ],
  admin: (basePath) => [
    { type: 'link', id: 'admin-home', name: 'Overview', to: basePath, icon: Squares2X2Icon, end: true },
    {
      type: 'section',
      id: 'admin-operations',
      name: 'Operations',
      icon: BuildingLibraryIcon,
      children: [
        { id: 'admin-control', name: 'Control', to: `${basePath}/control`, icon: BuildingLibraryIcon },
        { id: 'admin-support', name: 'Support', to: `${basePath}/support`, icon: ChatBubbleLeftRightIcon },
        { id: 'admin-integrations', name: 'Integrations', to: `${basePath}/integrations`, icon: MegaphoneIcon }
      ]
    },
    {
      type: 'section',
      id: 'admin-governance',
      name: 'Governance',
      icon: ChartBarIcon,
      children: [
        { id: 'admin-governance-hub', name: 'Governance hub', to: `${basePath}/governance`, icon: ChartBarIcon },
        { id: 'admin-ads', name: 'Monetisation', to: `${basePath}/finance`, icon: ArrowTrendingUpIcon }
      ]
    }
  ]
};

export function getDashboardNavigation(role, basePath) {
  const builder = dashboardBaseNavigation[role];
  if (!builder) {
    return dashboardBaseNavigation.learner(basePath);
  }
  return builder(basePath);
}

export function buildFocusOrder(primaryNavigation, quickActions = []) {
  const navOrder = Array.isArray(primaryNavigation) ? primaryNavigation.map((item) => item.id) : [];
  const quickOrder = Array.isArray(quickActions) ? quickActions.map((item) => item.id) : [];
  return [...navOrder, ...quickOrder];
}

