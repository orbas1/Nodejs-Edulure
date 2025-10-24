const BACKLOG_TABLE = 'navigation_annex_backlog_items';
const OPERATIONS_TABLE = 'navigation_annex_operation_tasks';
const DESIGN_TABLE = 'navigation_annex_design_dependencies';
const NARRATIVES_TABLE = 'navigation_annex_strategy_narratives';
const METRICS_TABLE = 'navigation_annex_strategy_metrics';

const backlogItems = [
  {
    nav_item_id: 'feed',
    nav_item_label: 'Feed',
    nav_item_category: 'primary',
    nav_item_route: '/feed',
    role_scope: ['user', 'instructor'],
    epic_id: 'UX-401',
    summary: 'Centralise feed navigation metadata and align breadcrumbs with the canonical registry.',
    backlog_ref: '/handbook/navigation-annex#feed-registry',
    impacted_files: [
      'frontend-reactjs/src/navigation/routes.js',
      'frontend-reactjs/src/layouts/MainLayout.jsx',
      'backend-nodejs/src/services/DashboardService.js'
    ],
    priority: 1,
    display_order: 1
  },
  {
    nav_item_id: 'courses',
    nav_item_label: 'Courses',
    nav_item_category: 'primary',
    nav_item_route: '/courses',
    role_scope: ['user', 'instructor'],
    epic_id: 'UX-402',
    summary: 'Adopt skeleton loaders and metadata hydration to reduce time-to-discovery in course browsing.',
    backlog_ref: '/handbook/navigation-annex#courses-discovery',
    impacted_files: [
      'frontend-reactjs/src/pages/Courses.jsx',
      'backend-nodejs/src/services/CatalogueService.js'
    ],
    priority: 2,
    display_order: 2
  },
  {
    nav_item_id: 'upload-course',
    nav_item_label: 'Upload course asset',
    nav_item_category: 'quick_action',
    nav_item_route: '/dashboard/instructor/courses/create',
    role_scope: ['instructor'],
    epic_id: 'OPS-218',
    summary: 'Guide instructors into the readiness workflow when creating new course assets from quick actions.',
    backlog_ref: '/handbook/navigation-annex#quick-upload',
    impacted_files: [
      'frontend-reactjs/src/navigation/routes.js',
      'frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx'
    ],
    priority: 3,
    display_order: 1
  },
  {
    nav_item_id: 'instructor-course-create',
    nav_item_label: 'Build course',
    nav_item_category: 'dashboard',
    nav_item_route: '/dashboard/instructor/courses/create',
    role_scope: ['instructor'],
    epic_id: 'OPS-219',
    summary: 'Surface upload readiness statuses and audit tasks directly inside the instructor course builder.',
    backlog_ref: '/handbook/navigation-annex#course-upload-readiness',
    impacted_files: [
      'frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx',
      'backend-nodejs/src/services/CourseAuthoringService.js'
    ],
    priority: 1,
    display_order: 1
  }
];

const operationTasks = [
  {
    nav_item_id: 'feed',
    nav_item_label: 'Feed',
    nav_item_category: 'primary',
    nav_item_route: '/feed',
    role_scope: ['user', 'instructor'],
    task_key: 'ops-feed-registry-audit',
    label: 'Verify registry export includes feed entry and deep links before release.',
    cadence: 'pre-release',
    runbook_section: 'navigation-registry-validation',
    href: '/docs/operations/navigation-readiness#registry-validation',
    owner: 'Operations Engineering',
    priority: 1,
    display_order: 1,
    include_in_checklist: true
  },
  {
    nav_item_id: 'feed',
    nav_item_label: 'Feed',
    nav_item_category: 'primary',
    nav_item_route: '/feed',
    role_scope: ['admin'],
    task_key: 'ops-feed-breadcrumb-capture',
    label: 'Capture feed breadcrumb screenshots for audit records.',
    cadence: 'release',
    runbook_section: 'navigation-registry-validation',
    href: '/docs/operations/navigation-readiness#evidence-capture',
    owner: 'Operations Engineering',
    priority: 2,
    display_order: 2,
    include_in_checklist: true
  },
  {
    nav_item_id: 'courses',
    nav_item_label: 'Courses',
    nav_item_category: 'primary',
    nav_item_route: '/courses',
    role_scope: ['user', 'instructor'],
    task_key: 'ops-courses-skeleton-benchmark',
    label: 'Benchmark skeleton loader performance on staging (<400ms render).',
    cadence: 'pre-release',
    runbook_section: 'course-discovery-verification',
    href: '/docs/operations/navigation-readiness#skeleton-performance',
    owner: 'Learning Operations',
    priority: 1,
    display_order: 1,
    include_in_checklist: true
  },
  {
    nav_item_id: 'upload-course',
    nav_item_label: 'Upload course asset',
    nav_item_category: 'quick_action',
    nav_item_route: '/dashboard/instructor/courses/create',
    role_scope: ['instructor'],
    task_key: 'ops-quick-action-verify-route',
    label: 'Confirm quick action routes to the canonical course builder path.',
    cadence: 'pre-release',
    runbook_section: 'quick-action-validation',
    href: '/docs/operations/navigation-readiness#quick-action',
    owner: 'Learning Operations',
    priority: 2,
    display_order: 1,
    include_in_checklist: true
  },
  {
    nav_item_id: 'instructor-course-create',
    nav_item_label: 'Build course',
    nav_item_category: 'dashboard',
    nav_item_route: '/dashboard/instructor/courses/create',
    role_scope: ['instructor'],
    task_key: 'ops-upload-readiness-snapshot',
    label: 'Archive upload readiness snapshot and checklist evidence post-release.',
    cadence: 'post-release',
    runbook_section: 'course-upload-readiness',
    href: '/docs/operations/navigation-readiness#upload-readiness',
    owner: 'Learning Operations',
    priority: 1,
    display_order: 1,
    include_in_checklist: true
  }
];

const designDependencies = [
  {
    nav_item_id: 'feed',
    nav_item_label: 'Feed',
    nav_item_category: 'primary',
    nav_item_route: '/feed',
    role_scope: ['user', 'instructor'],
    dependency_key: 'feed-space-token',
    dependency_type: 'token',
    value: '--space-4',
    notes: 'Apply shared spacing scale to feed header and notification drawer.',
    display_order: 1
  },
  {
    nav_item_id: 'feed',
    nav_item_label: 'Feed',
    nav_item_category: 'primary',
    nav_item_route: '/feed',
    role_scope: ['user', 'instructor'],
    dependency_key: 'feed-focus-outline',
    dependency_type: 'qa',
    value: 'Ensure feed header controls expose the focus-visible ring token.',
    notes: null,
    display_order: 2
  },
  {
    nav_item_id: 'feed',
    nav_item_label: 'Feed',
    nav_item_category: 'primary',
    nav_item_route: '/feed',
    role_scope: ['user', 'instructor'],
    dependency_key: 'feed-reference-topbar',
    dependency_type: 'reference',
    value: 'frontend-reactjs/src/components/navigation/AppTopBar.jsx',
    notes: null,
    display_order: 3
  },
  {
    nav_item_id: 'courses',
    nav_item_label: 'Courses',
    nav_item_category: 'primary',
    nav_item_route: '/courses',
    role_scope: ['user', 'instructor'],
    dependency_key: 'courses-skeleton-color',
    dependency_type: 'token',
    value: '--skeleton-base',
    notes: 'Keep skeleton loaders aligned with shared palette.',
    display_order: 1
  },
  {
    nav_item_id: 'courses',
    nav_item_label: 'Courses',
    nav_item_category: 'primary',
    nav_item_route: '/courses',
    role_scope: ['user', 'instructor'],
    dependency_key: 'courses-motion-pref',
    dependency_type: 'qa',
    value: 'Validate skeleton shimmer honours prefers-reduced-motion.',
    notes: null,
    display_order: 2
  },
  {
    nav_item_id: 'courses',
    nav_item_label: 'Courses',
    nav_item_category: 'primary',
    nav_item_route: '/courses',
    role_scope: ['user', 'instructor'],
    dependency_key: 'courses-reference-page',
    dependency_type: 'reference',
    value: 'frontend-reactjs/src/pages/Courses.jsx',
    notes: null,
    display_order: 3
  },
  {
    nav_item_id: 'instructor-course-create',
    nav_item_label: 'Build course',
    nav_item_category: 'dashboard',
    nav_item_route: '/dashboard/instructor/courses/create',
    role_scope: ['instructor'],
    dependency_key: 'builder-progress-radius',
    dependency_type: 'token',
    value: '--uploads-progress-radius',
    notes: 'Apply rounded corners to upload readiness indicator.',
    display_order: 1
  },
  {
    nav_item_id: 'instructor-course-create',
    nav_item_label: 'Build course',
    nav_item_category: 'dashboard',
    nav_item_route: '/dashboard/instructor/courses/create',
    role_scope: ['instructor'],
    dependency_key: 'builder-progress-contrast',
    dependency_type: 'qa',
    value: 'Confirm readiness indicator meets 4.5:1 contrast ratio on light and dark themes.',
    notes: null,
    display_order: 2
  },
  {
    nav_item_id: 'instructor-course-create',
    nav_item_label: 'Build course',
    nav_item_category: 'dashboard',
    nav_item_route: '/dashboard/instructor/courses/create',
    role_scope: ['instructor'],
    dependency_key: 'builder-reference-component',
    dependency_type: 'reference',
    value: 'frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx',
    notes: null,
    display_order: 3
  }
];

const strategyNarratives = [
  {
    nav_item_id: 'feed',
    nav_item_label: 'Feed',
    nav_item_category: 'primary',
    nav_item_route: '/feed',
    role_scope: ['user', 'instructor'],
    narrative_key: 'retention-feed-depth',
    pillar: 'retention',
    narrative:
      'Reduce steps after sign-in by aligning navigation registry, breadcrumbs, and notification entry points.',
    display_order: 1
  },
  {
    nav_item_id: 'courses',
    nav_item_label: 'Courses',
    nav_item_category: 'primary',
    nav_item_route: '/courses',
    role_scope: ['user', 'instructor'],
    narrative_key: 'activation-courses-discovery',
    pillar: 'activation',
    narrative: 'Improve time-to-value for new learners with consistent metadata hydration and skeleton loaders.',
    display_order: 1
  },
  {
    nav_item_id: 'instructor-course-create',
    nav_item_label: 'Build course',
    nav_item_category: 'dashboard',
    nav_item_route: '/dashboard/instructor/courses/create',
    role_scope: ['instructor'],
    narrative_key: 'efficiency-upload-readiness',
    pillar: 'efficiency',
    narrative: 'Accelerate instructor onboarding by surfacing readiness checks and evidence capture directly in the builder.',
    display_order: 1
  }
];

const strategyMetrics = [
  {
    narrative_key: 'retention-feed-depth',
    metric_key: 'nav-click-depth',
    label: 'Average click depth to reach feed updates',
    baseline: '3.2',
    target: '2.1',
    unit: 'clicks',
    display_order: 1
  },
  {
    narrative_key: 'retention-feed-depth',
    metric_key: 'return-visit-rate',
    label: '30-day returning learner rate',
    baseline: '41%',
    target: '48%',
    unit: 'percentage',
    display_order: 2
  },
  {
    narrative_key: 'activation-courses-discovery',
    metric_key: 'course-discovery-time',
    label: 'Median time to locate a course after sign-in',
    baseline: '4m 20s',
    target: '2m 30s',
    unit: 'duration',
    display_order: 1
  },
  {
    narrative_key: 'activation-courses-discovery',
    metric_key: 'filter-engagement-rate',
    label: 'Learners applying filters during first session',
    baseline: '18%',
    target: '32%',
    unit: 'percentage',
    display_order: 2
  },
  {
    narrative_key: 'efficiency-upload-readiness',
    metric_key: 'upload-readiness-pass-rate',
    label: 'Course uploads passing readiness checks on first attempt',
    baseline: '61%',
    target: '85%',
    unit: 'percentage',
    display_order: 1
  },
  {
    narrative_key: 'efficiency-upload-readiness',
    metric_key: 'evidence-capture-latency',
    label: 'Time to archive readiness evidence after release',
    baseline: '3d',
    target: '1d',
    unit: 'duration',
    display_order: 2
  }
];

function serialiseJson(value) {
  return JSON.stringify(value ?? []);
}

export async function seed(knex) {
  await knex.transaction(async (trx) => {
    await trx(BACKLOG_TABLE)
      .insert(
        backlogItems.map((item) => ({
          ...item,
          role_scope: serialiseJson(item.role_scope),
          impacted_files: serialiseJson(item.impacted_files)
        }))
      )
      .onConflict(['nav_item_id', 'epic_id'])
      .merge([
        'nav_item_label',
        'nav_item_category',
        'nav_item_route',
        'role_scope',
        'summary',
        'backlog_ref',
        'impacted_files',
        'priority',
        'display_order'
      ]);

    await trx(OPERATIONS_TABLE)
      .insert(
        operationTasks.map((task) => ({
          ...task,
          role_scope: serialiseJson(task.role_scope),
          include_in_checklist: task.include_in_checklist ? 1 : 0
        }))
      )
      .onConflict('task_key')
      .merge([
        'nav_item_label',
        'nav_item_category',
        'nav_item_route',
        'role_scope',
        'label',
        'cadence',
        'runbook_section',
        'href',
        'owner',
        'priority',
        'display_order',
        'include_in_checklist'
      ]);

    await trx(DESIGN_TABLE)
      .insert(
        designDependencies.map((dependency) => ({
          ...dependency,
          role_scope: serialiseJson(dependency.role_scope),
          notes: dependency.notes ?? null
        }))
      )
      .onConflict(['dependency_key', 'dependency_type'])
      .merge([
        'nav_item_label',
        'nav_item_category',
        'nav_item_route',
        'role_scope',
        'value',
        'notes',
        'display_order'
      ]);

    await trx(NARRATIVES_TABLE)
      .insert(
        strategyNarratives.map((narrative) => ({
          ...narrative,
          role_scope: serialiseJson(narrative.role_scope)
        }))
      )
      .onConflict('narrative_key')
      .merge([
        'nav_item_label',
        'nav_item_category',
        'nav_item_route',
        'role_scope',
        'pillar',
        'narrative',
        'display_order'
      ]);

    const narrativeRows = await trx(NARRATIVES_TABLE)
      .select('id', 'narrative_key')
      .whereIn(
        'narrative_key',
        strategyNarratives.map((item) => item.narrative_key)
      );

    const narrativeIdByKey = new Map(narrativeRows.map((row) => [row.narrative_key, row.id]));

    const metricPayload = strategyMetrics
      .map((metric) => {
        const narrativeId = narrativeIdByKey.get(metric.narrative_key);
        if (!narrativeId) {
          return null;
        }
        return {
          narrative_id: narrativeId,
          metric_key: metric.metric_key,
          label: metric.label,
          baseline: metric.baseline ?? null,
          target: metric.target ?? null,
          unit: metric.unit ?? null,
          display_order: metric.display_order ?? 0
        };
      })
      .filter(Boolean);

    if (metricPayload.length) {
      await trx(METRICS_TABLE)
        .insert(metricPayload)
        .onConflict('metric_key')
        .merge(['label', 'baseline', 'target', 'unit', 'display_order', 'narrative_id']);
    }
  });
}
