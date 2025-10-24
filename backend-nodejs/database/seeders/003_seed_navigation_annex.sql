INSERT INTO navigation_annex_backlog_items (
  nav_item_id,
  nav_item_label,
  nav_item_category,
  nav_item_route,
  role_scope,
  epic_id,
  summary,
  backlog_ref,
  impacted_files,
  priority,
  display_order
)
VALUES
  (
    'feed',
    'Feed',
    'primary',
    '/feed',
    JSON_ARRAY('user', 'instructor'),
    'UX-401',
    'Centralise feed navigation metadata and align breadcrumbs with the canonical registry.',
    '/handbook/navigation-annex#feed-registry',
    JSON_ARRAY(
      'frontend-reactjs/src/navigation/routes.js',
      'frontend-reactjs/src/layouts/MainLayout.jsx',
      'backend-nodejs/src/services/DashboardService.js'
    ),
    1,
    1
  ),
  (
    'courses',
    'Courses',
    'primary',
    '/courses',
    JSON_ARRAY('user', 'instructor'),
    'UX-402',
    'Adopt skeleton loaders and metadata hydration to reduce time-to-discovery in course browsing.',
    '/handbook/navigation-annex#courses-discovery',
    JSON_ARRAY(
      'frontend-reactjs/src/pages/Courses.jsx',
      'backend-nodejs/src/services/CatalogueService.js'
    ),
    2,
    2
  ),
  (
    'upload-course',
    'Upload course asset',
    'quick_action',
    '/dashboard/instructor/courses/create',
    JSON_ARRAY('instructor'),
    'OPS-218',
    'Guide instructors into the readiness workflow when creating new course assets from quick actions.',
    '/handbook/navigation-annex#quick-upload',
    JSON_ARRAY(
      'frontend-reactjs/src/navigation/routes.js',
      'frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx'
    ),
    3,
    1
  ),
  (
    'instructor-course-create',
    'Build course',
    'dashboard',
    '/dashboard/instructor/courses/create',
    JSON_ARRAY('instructor'),
    'OPS-219',
    'Surface upload readiness statuses and audit tasks directly inside the instructor course builder.',
    '/handbook/navigation-annex#course-upload-readiness',
    JSON_ARRAY(
      'frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx',
      'backend-nodejs/src/services/CourseAuthoringService.js'
    ),
    1,
    1
  )
ON DUPLICATE KEY UPDATE
  summary = VALUES(summary),
  backlog_ref = VALUES(backlog_ref),
  impacted_files = VALUES(impacted_files),
  priority = VALUES(priority),
  display_order = VALUES(display_order),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO navigation_annex_operation_tasks (
  nav_item_id,
  nav_item_label,
  nav_item_category,
  nav_item_route,
  role_scope,
  task_key,
  label,
  cadence,
  runbook_section,
  href,
  owner,
  priority,
  display_order,
  include_in_checklist
)
VALUES
  (
    'feed',
    'Feed',
    'primary',
    '/feed',
    JSON_ARRAY('user', 'instructor'),
    'ops-feed-registry-audit',
    'Verify registry export includes feed entry and deep links before release.',
    'pre-release',
    'navigation-registry-validation',
    '/docs/operations/navigation-readiness#registry-validation',
    'Operations Engineering',
    1,
    1,
    1
  ),
  (
    'feed',
    'Feed',
    'primary',
    '/feed',
    JSON_ARRAY('admin'),
    'ops-feed-breadcrumb-capture',
    'Capture feed breadcrumb screenshots for audit records.',
    'release',
    'navigation-registry-validation',
    '/docs/operations/navigation-readiness#evidence-capture',
    'Operations Engineering',
    2,
    2,
    1
  ),
  (
    'courses',
    'Courses',
    'primary',
    '/courses',
    JSON_ARRAY('user', 'instructor'),
    'ops-courses-skeleton-benchmark',
    'Benchmark skeleton loader performance on staging (<400ms render).',
    'pre-release',
    'course-discovery-verification',
    '/docs/operations/navigation-readiness#skeleton-performance',
    'Learning Operations',
    1,
    1,
    1
  ),
  (
    'upload-course',
    'Upload course asset',
    'quick_action',
    '/dashboard/instructor/courses/create',
    JSON_ARRAY('instructor'),
    'ops-quick-action-verify-route',
    'Confirm quick action routes to the canonical course builder path.',
    'pre-release',
    'quick-action-validation',
    '/docs/operations/navigation-readiness#quick-action',
    'Learning Operations',
    2,
    1,
    1
  ),
  (
    'instructor-course-create',
    'Build course',
    'dashboard',
    '/dashboard/instructor/courses/create',
    JSON_ARRAY('instructor'),
    'ops-upload-readiness-snapshot',
    'Archive upload readiness snapshot and checklist evidence post-release.',
    'post-release',
    'course-upload-readiness',
    '/docs/operations/navigation-readiness#upload-readiness',
    'Learning Operations',
    1,
    1,
    1
  )
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  cadence = VALUES(cadence),
  runbook_section = VALUES(runbook_section),
  href = VALUES(href),
  owner = VALUES(owner),
  priority = VALUES(priority),
  display_order = VALUES(display_order),
  include_in_checklist = VALUES(include_in_checklist),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO navigation_annex_design_dependencies (
  nav_item_id,
  nav_item_label,
  nav_item_category,
  nav_item_route,
  role_scope,
  dependency_key,
  dependency_type,
  value,
  notes,
  display_order
)
VALUES
  (
    'feed',
    'Feed',
    'primary',
    '/feed',
    JSON_ARRAY('user', 'instructor'),
    'feed-space-token',
    'token',
    '--space-4',
    'Apply shared spacing scale to feed header and notification drawer.',
    1
  ),
  (
    'feed',
    'Feed',
    'primary',
    '/feed',
    JSON_ARRAY('user', 'instructor'),
    'feed-focus-outline',
    'qa',
    'Ensure feed header controls expose the focus-visible ring token.',
    NULL,
    2
  ),
  (
    'feed',
    'Feed',
    'primary',
    '/feed',
    JSON_ARRAY('user', 'instructor'),
    'feed-reference-topbar',
    'reference',
    'frontend-reactjs/src/components/navigation/AppTopBar.jsx',
    NULL,
    3
  ),
  (
    'courses',
    'Courses',
    'primary',
    '/courses',
    JSON_ARRAY('user', 'instructor'),
    'courses-skeleton-color',
    'token',
    '--skeleton-base',
    'Keep skeleton loaders aligned with shared palette.',
    1
  ),
  (
    'courses',
    'Courses',
    'primary',
    '/courses',
    JSON_ARRAY('user', 'instructor'),
    'courses-motion-pref',
    'qa',
    'Validate skeleton shimmer honours prefers-reduced-motion.',
    NULL,
    2
  ),
  (
    'courses',
    'Courses',
    'primary',
    '/courses',
    JSON_ARRAY('user', 'instructor'),
    'courses-reference-page',
    'reference',
    'frontend-reactjs/src/pages/Courses.jsx',
    NULL,
    3
  ),
  (
    'instructor-course-create',
    'Build course',
    'dashboard',
    '/dashboard/instructor/courses/create',
    JSON_ARRAY('instructor'),
    'builder-progress-radius',
    'token',
    '--uploads-progress-radius',
    'Apply rounded corners to upload readiness indicator.',
    1
  ),
  (
    'instructor-course-create',
    'Build course',
    'dashboard',
    '/dashboard/instructor/courses/create',
    JSON_ARRAY('instructor'),
    'builder-progress-contrast',
    'qa',
    'Confirm readiness indicator meets 4.5:1 contrast ratio on light and dark themes.',
    NULL,
    2
  ),
  (
    'instructor-course-create',
    'Build course',
    'dashboard',
    '/dashboard/instructor/courses/create',
    JSON_ARRAY('instructor'),
    'builder-reference-component',
    'reference',
    'frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx',
    NULL,
    3
  )
ON DUPLICATE KEY UPDATE
  value = VALUES(value),
  notes = VALUES(notes),
  display_order = VALUES(display_order),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO navigation_annex_strategy_narratives (
  nav_item_id,
  nav_item_label,
  nav_item_category,
  nav_item_route,
  role_scope,
  narrative_key,
  pillar,
  narrative,
  display_order
)
VALUES
  (
    'feed',
    'Feed',
    'primary',
    '/feed',
    JSON_ARRAY('user', 'instructor'),
    'retention-feed-depth',
    'retention',
    'Reduce steps after sign-in by aligning navigation registry, breadcrumbs, and notification entry points.',
    1
  ),
  (
    'courses',
    'Courses',
    'primary',
    '/courses',
    JSON_ARRAY('user', 'instructor'),
    'activation-courses-discovery',
    'activation',
    'Improve time-to-value for new learners with consistent metadata hydration and skeleton loaders.',
    1
  ),
  (
    'instructor-course-create',
    'Build course',
    'dashboard',
    '/dashboard/instructor/courses/create',
    JSON_ARRAY('instructor'),
    'efficiency-upload-readiness',
    'efficiency',
    'Accelerate instructor onboarding by surfacing readiness checks and evidence capture directly in the builder.',
    1
  )
ON DUPLICATE KEY UPDATE
  pillar = VALUES(pillar),
  narrative = VALUES(narrative),
  display_order = VALUES(display_order),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO navigation_annex_strategy_metrics (
  narrative_id,
  metric_key,
  label,
  baseline,
  target,
  unit,
  display_order
)
VALUES
  (
    (SELECT id FROM navigation_annex_strategy_narratives WHERE narrative_key = 'retention-feed-depth' LIMIT 1),
    'nav-click-depth',
    'Average click depth to reach feed updates',
    '3.2',
    '2.1',
    'clicks',
    1
  ),
  (
    (SELECT id FROM navigation_annex_strategy_narratives WHERE narrative_key = 'retention-feed-depth' LIMIT 1),
    'return-visit-rate',
    '30-day returning learner rate',
    '41%',
    '48%',
    'percentage',
    2
  ),
  (
    (SELECT id FROM navigation_annex_strategy_narratives WHERE narrative_key = 'activation-courses-discovery' LIMIT 1),
    'course-discovery-time',
    'Median time to locate a course after sign-in',
    '4m 20s',
    '2m 30s',
    'duration',
    1
  ),
  (
    (SELECT id FROM navigation_annex_strategy_narratives WHERE narrative_key = 'activation-courses-discovery' LIMIT 1),
    'filter-engagement-rate',
    'Learners applying filters during first session',
    '18%',
    '32%',
    'percentage',
    2
  ),
  (
    (SELECT id FROM navigation_annex_strategy_narratives WHERE narrative_key = 'efficiency-upload-readiness' LIMIT 1),
    'upload-readiness-pass-rate',
    'Course uploads passing readiness checks on first attempt',
    '61%',
    '85%',
    'percentage',
    1
  ),
  (
    (SELECT id FROM navigation_annex_strategy_narratives WHERE narrative_key = 'efficiency-upload-readiness' LIMIT 1),
    'evidence-capture-latency',
    'Time to archive readiness evidence after release',
    '3d',
    '1d',
    'duration',
    2
  )
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  baseline = VALUES(baseline),
  target = VALUES(target),
  unit = VALUES(unit),
  display_order = VALUES(display_order),
  updated_at = CURRENT_TIMESTAMP;
