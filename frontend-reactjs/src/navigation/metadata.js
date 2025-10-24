import { PRIMARY_NAVIGATION, QUICK_CREATE_ACTIONS, getDashboardNavigation } from './routes.js';

const DEFAULT_DASHBOARD_BASE = '/dashboard';

const NAVIGATION_INITIATIVES = {
  feed: {
    product: {
      epicId: 'UX-401',
      summary: 'Unify shell navigation metadata and breadcrumb logic to remove duplicate route lookups.',
      backlogRef: '/handbook/navigation-annex#ux-401-shell-registry',
      impactedFiles: [
        'frontend-reactjs/src/layouts/MainLayout.jsx',
        'frontend-reactjs/src/navigation/routes.js',
        'frontend-reactjs/src/components/navigation/AppTopBar.jsx'
      ]
    },
    operations: {
      runbookSection: 'shell-unification-runbook',
      owner: 'Operations Engineering',
      tasks: [
        {
          id: 'ops-shell-registry-rollout',
          label: 'Verify registry export includes feed deep links before feature flag lift.',
          href: '/handbook/navigation-annex#shell-unification-runbook',
          cadence: 'pre-release',
          roles: ['admin', 'instructor', 'learner']
        },
        {
          id: 'ops-breadcrumb-health',
          label: 'Run breadcrumb regression suite and archive screenshots for audit.',
          href: '/handbook/navigation-annex#operational-checklist',
          cadence: 'release',
          roles: ['admin']
        }
      ]
    },
    design: {
      tokens: ['--space-4', '--radius-xxl', '--color-primary'],
      qa: ['Verify focus-visible outlines match tokenised colour scale.', 'Confirm 8px grid alignment on feed header.'],
      references: [
        'frontend-reactjs/src/components/navigation/AppTopBar.jsx',
        'frontend-reactjs/src/styles/tokens.css'
      ]
    },
    strategy: {
      pillar: 'Retention',
      narrative:
        'Surface a consistent feed entry point so returning learners land within two clicks of personalised updates.',
      metrics: [
        {
          id: 'nav-click-depth',
          label: 'Average navigation depth to reach feed',
          baseline: 3.2,
          target: 2.4,
          unit: 'clicks'
        },
        {
          id: 'return-visit-rate',
          label: '30-day returning learner rate',
          baseline: '41%',
          target: '48%',
          unit: 'percentage'
        }
      ]
    }
  },
  courses: {
    product: {
      epicId: 'UX-402',
      summary: 'Refine course discovery with shared metadata and skeleton loaders.',
      backlogRef: '/handbook/navigation-annex#ux-402-curriculum-discovery',
      impactedFiles: [
        'frontend-reactjs/src/pages/Courses.jsx',
        'frontend-reactjs/src/components/navigation/AppSidebar.jsx',
        'frontend-reactjs/src/navigation/routes.js'
      ]
    },
    operations: {
      runbookSection: 'course-discovery-handover',
      owner: 'Learning Operations',
      tasks: [
        {
          id: 'ops-course-preview-audit',
          label: 'Validate course preview skeleton renders within 400ms on staging.',
          href: '/handbook/navigation-annex#course-discovery-handover',
          cadence: 'pre-release',
          roles: ['instructor', 'learner']
        },
        {
          id: 'ops-course-runbook-sync',
          label: 'Update support macros with new curriculum filters.',
          href: '/handbook/navigation-annex#operational-checklist',
          cadence: 'post-release',
          roles: ['support', 'instructor']
        }
      ]
    },
    design: {
      tokens: ['--grid-min-column', '--media-thumb-radius'],
      qa: ['Confirm skeleton shimmer honours prefers-reduced-motion.', 'Verify card spacing matches token scale.'],
      references: ['frontend-reactjs/src/pages/Courses.jsx', 'frontend-reactjs/src/styles/tokens.css']
    },
    strategy: {
      pillar: 'Activation',
      narrative: 'Reduce friction for first-time instructors building catalogue visibility.',
      metrics: [
        {
          id: 'course-publish-latency',
          label: 'Median time to publish new course asset',
          baseline: '2d 6h',
          target: '1d 12h',
          unit: 'duration'
        }
      ]
    }
  },
  communities: {
    product: {
      epicId: 'UX-403',
      summary: 'Unify community notifications and chat entry points.',
      backlogRef: '/handbook/navigation-annex#ux-403-community-cohesion',
      impactedFiles: [
        'frontend-reactjs/src/pages/Communities.jsx',
        'frontend-reactjs/src/components/navigation/AppNotificationPanel.jsx',
        'frontend-reactjs/src/navigation/utils.js'
      ]
    },
    operations: {
      runbookSection: 'community-ops-alignment',
      owner: 'Community Operations',
      tasks: [
        {
          id: 'ops-community-webhooks',
          label: 'Confirm chat webhook payloads include unified route identifiers.',
          href: '/handbook/navigation-annex#community-ops-alignment',
          cadence: 'pre-release',
          roles: ['moderator', 'admin']
        },
        {
          id: 'ops-community-training',
          label: 'Brief moderators on updated mention notifications.',
          href: '/handbook/navigation-annex#operational-checklist',
          cadence: 'post-release',
          roles: ['moderator']
        }
      ]
    },
    design: {
      tokens: ['--color-primary-soft', '--shadow-card'],
      qa: ['Check mention badges meet 4.5:1 contrast ratio.', 'Confirm avatar fallbacks display brand initials.'],
      references: ['frontend-reactjs/src/components/navigation/AppNotificationPanel.jsx']
    },
    strategy: {
      pillar: 'Engagement',
      narrative: 'Scale healthy community interactions with predictable notification slots.',
      metrics: [
        {
          id: 'mention-response',
          label: 'Median response time to community mention',
          baseline: '6h',
          target: '3h',
          unit: 'duration'
        },
        {
          id: 'chat-retention',
          label: 'Weekly active community chat participants',
          baseline: 820,
          target: 1100,
          unit: 'users'
        }
      ]
    }
  },
  tutors: {
    product: {
      epicId: 'UX-404',
      summary: 'Consolidate tutor marketplace discovery with consistent button hierarchy.',
      backlogRef: '/handbook/navigation-annex#ux-404-tutor-marketplace',
      impactedFiles: ['frontend-reactjs/src/pages/TutorProfile.jsx', 'frontend-reactjs/src/components/TopBar.jsx']
    },
    operations: {
      runbookSection: 'mentor-readiness',
      owner: 'Marketplace Operations',
      tasks: [
        {
          id: 'ops-tutor-onboarding-assets',
          label: 'Ensure mentor bios include updated CTA copy before go-live.',
          href: '/handbook/navigation-annex#mentor-readiness',
          cadence: 'pre-release',
          roles: ['support', 'instructor']
        }
      ]
    },
    design: {
      tokens: ['--form-field-padding-x', '--form-field-padding-y'],
      qa: ['Validate CTA buttons share consistent icon placement.', 'Audit avatar fallback illustrations.'],
      references: ['frontend-reactjs/src/components/TopBar.jsx', 'frontend-reactjs/src/styles/tokens.css']
    },
    strategy: {
      pillar: 'Expansion',
      narrative: 'Standardise tutor CTAs to improve conversion for marketplace upsells.',
      metrics: [
        {
          id: 'mentor-booking-rate',
          label: 'Tutor booking to profile view conversion',
          baseline: '12%',
          target: '18%',
          unit: 'percentage'
        }
      ]
    }
  },
  library: {
    product: {
      epicId: 'UX-405',
      summary: 'Add ebook previews and metadata badges for library assets.',
      backlogRef: '/handbook/navigation-annex#ux-405-library-previews',
      impactedFiles: ['frontend-reactjs/src/pages/Ebooks.jsx', 'frontend-reactjs/src/components/content/EbookReader.jsx']
    },
    operations: {
      runbookSection: 'library-previews',
      owner: 'Content Operations',
      tasks: [
        {
          id: 'ops-library-preview-cache',
          label: 'Warm CDN caches for hero previews using new asset manifest.',
          href: '/handbook/navigation-annex#library-previews',
          cadence: 'pre-release',
          roles: ['operations', 'content']
        },
        {
          id: 'ops-library-alt-text',
          label: 'Spot check alt-text coverage for top 20 ebooks.',
          href: '/handbook/navigation-annex#operational-checklist',
          cadence: 'post-release',
          roles: ['content']
        }
      ]
    },
    design: {
      tokens: ['--media-thumb-aspect', '--shadow-media'],
      qa: ['Confirm preview cards obey media aspect tokens.', 'Test dark mode overlays on asset hero.'],
      references: ['frontend-reactjs/src/pages/Ebooks.jsx']
    },
    strategy: {
      pillar: 'Engagement',
      narrative: 'Promote reusable intellectual property through richer previews.',
      metrics: [
        {
          id: 'ebook-open-rate',
          label: 'Unique ebook opens per week',
          baseline: 1420,
          target: 2000,
          unit: 'opens'
        }
      ]
    }
  },
  'create-post': {
    product: {
      epicId: 'UX-406',
      summary: 'Streamline announcement composer with shared autosave.',
      backlogRef: '/handbook/navigation-annex#ux-406-announcement-composer',
      impactedFiles: ['frontend-reactjs/src/pages/dashboard/LearnerCommunities.jsx']
    },
    operations: {
      runbookSection: 'community-ops-alignment',
      owner: 'Community Operations',
      tasks: [
        {
          id: 'ops-announcement-template',
          label: 'Publish new announcement template in macros workspace.',
          href: '/handbook/navigation-annex#community-ops-alignment',
          cadence: 'pre-release',
          roles: ['moderator']
        }
      ]
    },
    design: {
      tokens: ['--form-field-border', '--shadow-focus-ring'],
      qa: ['Confirm autosave toast respects reduced motion.', 'Verify CTA loading states match button hierarchy.'],
      references: ['frontend-reactjs/src/pages/dashboard/LearnerCommunities.jsx']
    },
    strategy: {
      pillar: 'Engagement',
      narrative: 'Keep cohorts informed without duplicative messaging workflows.',
      metrics: [
        {
          id: 'announcement-open-rate',
          label: 'Community announcement open rate',
          baseline: '57%',
          target: '68%',
          unit: 'percentage'
        }
      ]
    }
  },
  'launch-session': {
    product: {
      epicId: 'UX-407',
      summary: 'Tie live session scheduler to unified availability API.',
      backlogRef: '/handbook/navigation-annex#ux-407-live-scheduling',
      impactedFiles: ['frontend-reactjs/src/pages/dashboard/DashboardCalendar.jsx']
    },
    operations: {
      runbookSection: 'mentor-readiness',
      owner: 'Marketplace Operations',
      tasks: [
        {
          id: 'ops-session-checklist',
          label: 'Confirm booking confirmation emails include updated time zone tokens.',
          href: '/handbook/navigation-annex#mentor-readiness',
          cadence: 'pre-release',
          roles: ['instructor']
        }
      ]
    },
    design: {
      tokens: ['--motion-duration-medium', '--overlay-backdrop'],
      qa: ['Ensure dialog respects focus trap utilities.', 'Validate loader steps for slower networks.'],
      references: ['frontend-reactjs/src/pages/dashboard/DashboardCalendar.jsx', 'frontend-reactjs/src/utils/a11y.js']
    },
    strategy: {
      pillar: 'Retention',
      narrative: 'Shorten time to schedule live contact to reinforce cohort momentum.',
      metrics: [
        {
          id: 'live-session-lead-time',
          label: 'Median time from scheduler open to session publish',
          baseline: '18h',
          target: '10h',
          unit: 'duration'
        }
      ]
    }
  },
  'upload-course': {
    product: {
      epicId: 'UX-408',
      summary: 'Reuse media upload queue with consistent error handling across shells.',
      backlogRef: '/handbook/navigation-annex#ux-408-content-ingest',
      impactedFiles: ['frontend-reactjs/src/utils/uploads.js', 'frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx']
    },
    operations: {
      runbookSection: 'course-discovery-handover',
      owner: 'Learning Operations',
      tasks: [
        {
          id: 'ops-upload-monitoring',
          label: 'Configure ingest monitoring dashboards with new status codes.',
          href: '/handbook/navigation-annex#course-discovery-handover',
          cadence: 'pre-release',
          roles: ['operations']
        }
      ]
    },
    design: {
      tokens: ['--uploads-progress-radius', '--color-primary-dark'],
      qa: ['Review progress bar animation under reduced motion.', 'Align error badges with brand palette.'],
      references: ['frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx', 'frontend-reactjs/src/utils/uploads.js']
    },
    strategy: {
      pillar: 'Efficiency',
      narrative: 'Decrease content ingestion friction to unlock more catalog launches per sprint.',
      metrics: [
        {
          id: 'asset-processing-time',
          label: '95th percentile asset processing time',
          baseline: '42m',
          target: '25m',
          unit: 'duration'
        }
      ]
    }
  }
};

function flattenDashboardNavigation(role) {
  const basePath = `${DEFAULT_DASHBOARD_BASE}/${role ?? 'learner'}`;
  const tree = getDashboardNavigation(role ?? 'learner', basePath);
  return tree.flatMap((item) => {
    if (item.type === 'section') {
      return item.children.map((child) => ({ ...child }));
    }
    return item;
  });
}

function mapEntry(id) {
  return NAVIGATION_INITIATIVES[id] ?? null;
}

function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export function mapNavigationToInitiatives(role) {
  const primary = PRIMARY_NAVIGATION.map((item) => ({
    ...item,
    initiative: mapEntry(item.id)
  }));

  const quickActions = QUICK_CREATE_ACTIONS.map((action) => ({
    ...action,
    initiative: mapEntry(action.id)
  }));

  const dashboard = flattenDashboardNavigation(role).map((item) => ({
    ...item,
    initiative: mapEntry(item.id)
  }));

  return {
    primary,
    quickActions,
    dashboard
  };
}

export function buildOperationalChecklist(role) {
  const { primary, quickActions, dashboard } = mapNavigationToInitiatives(role);
  const collected = [...primary, ...quickActions, ...dashboard]
    .map((entry) => entry.initiative?.operations?.tasks ?? [])
    .flat();
  return dedupeById(
    collected.filter((task) => {
      if (!task.roles || task.roles.length === 0) {
        return true;
      }
      if (!role) {
        return false;
      }
      return task.roles.includes(role);
    })
  );
}

export function collectDesignDependencies(role) {
  const { primary, quickActions, dashboard } = mapNavigationToInitiatives(role);
  const dependencies = [...primary, ...quickActions, ...dashboard]
    .map((entry) => entry.initiative?.design)
    .filter(Boolean);
  const tokenSet = new Set();
  const qa = [];
  const references = new Set();

  dependencies.forEach((dependency) => {
    dependency.tokens?.forEach((token) => tokenSet.add(token));
    dependency.qa?.forEach((item, index) => {
      qa.push({ id: `${dependency.tokens?.[0] ?? 'design'}-${index}`, label: item });
    });
    dependency.references?.forEach((ref) => references.add(ref));
  });

  return {
    tokens: Array.from(tokenSet),
    qa,
    references: Array.from(references)
  };
}

export function collectStrategyNarratives(role) {
  const { primary, quickActions, dashboard } = mapNavigationToInitiatives(role);
  const narratives = [...primary, ...quickActions, ...dashboard]
    .map((entry) => entry.initiative?.strategy)
    .filter(Boolean);

  const groupedByPillar = narratives.reduce((acc, narrative) => {
    const key = narrative.pillar ?? 'Uncategorised';
    if (!acc[key]) {
      acc[key] = { pillar: key, narratives: [], metrics: [] };
    }
    acc[key].narratives.push(narrative.narrative);
    narrative.metrics?.forEach((metric) => acc[key].metrics.push(metric));
    return acc;
  }, {});

  return Object.values(groupedByPillar);
}

export function collectProductBacklog(role) {
  const { primary, quickActions, dashboard } = mapNavigationToInitiatives(role);
  const items = [...primary, ...quickActions, ...dashboard]
    .map((entry) => entry.initiative?.product)
    .filter(Boolean);

  return dedupeById(
    items.map((product) => ({
      id: product.epicId,
      summary: product.summary,
      backlogRef: product.backlogRef,
      impactedFiles: product.impactedFiles
    }))
  );
}

export const NAVIGATION_INITIATIVE_IDS = Object.keys(NAVIGATION_INITIATIVES);

