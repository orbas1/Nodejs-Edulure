INSERT INTO explorer_search_events (
  event_uuid,
  user_id,
  session_id,
  trace_id,
  query,
  result_total,
  is_zero_result,
  latency_ms,
  filters,
  global_filters,
  sort_preferences,
  metadata
)
SELECT
  '11111111-1111-1111-1111-111111111111',
  u.id,
  'session-alex-search',
  'trace-alex-search',
  'design systems',
  12,
  0,
  145,
  '{"level":["intermediate"],"language":["english"]}',
  '{}',
  '{"primary":"trending"}',
  '{"source":"seed","surface":"global-bar"}'
FROM users u
WHERE u.email = 'alex@edulure.com'
ON DUPLICATE KEY UPDATE
  query = VALUES(query),
  result_total = VALUES(result_total),
  is_zero_result = VALUES(is_zero_result),
  latency_ms = VALUES(latency_ms),
  filters = VALUES(filters),
  global_filters = VALUES(global_filters),
  sort_preferences = VALUES(sort_preferences),
  metadata = VALUES(metadata);

INSERT INTO explorer_search_events (
  event_uuid,
  user_id,
  session_id,
  trace_id,
  query,
  result_total,
  is_zero_result,
  latency_ms,
  filters,
  global_filters,
  sort_preferences,
  metadata
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  u.id,
  'session-jordan-search',
  'trace-jordan-search',
  'community building',
  0,
  1,
  98,
  '{"timezone":["UTC"]}',
  '{"availability":"upcoming"}',
  '{"primary":"upcoming"}',
  '{"source":"seed","surface":"dashboard"}'
FROM users u
WHERE u.email = 'jordan@edulure.com'
ON DUPLICATE KEY UPDATE
  query = VALUES(query),
  result_total = VALUES(result_total),
  is_zero_result = VALUES(is_zero_result),
  latency_ms = VALUES(latency_ms),
  filters = VALUES(filters),
  global_filters = VALUES(global_filters),
  sort_preferences = VALUES(sort_preferences),
  metadata = VALUES(metadata);

INSERT INTO explorer_search_event_entities (
  event_id,
  entity_type,
  total_hits,
  displayed_hits,
  processing_time_ms,
  is_zero_result,
  click_count,
  conversion_count,
  metadata
)
SELECT
  e.id,
  'courses',
  120,
  6,
  140,
  0,
  4,
  1,
  '{"previewMedia":"video","badge":"featured"}'
FROM explorer_search_events e
WHERE e.event_uuid = '11111111-1111-1111-1111-111111111111'
ON DUPLICATE KEY UPDATE
  total_hits = VALUES(total_hits),
  displayed_hits = VALUES(displayed_hits),
  processing_time_ms = VALUES(processing_time_ms),
  is_zero_result = VALUES(is_zero_result),
  click_count = VALUES(click_count),
  conversion_count = VALUES(conversion_count),
  metadata = VALUES(metadata);

INSERT INTO explorer_search_event_entities (
  event_id,
  entity_type,
  total_hits,
  displayed_hits,
  processing_time_ms,
  is_zero_result,
  click_count,
  conversion_count,
  metadata
)
SELECT
  e.id,
  'communities',
  48,
  4,
  130,
  0,
  2,
  0,
  '{"previewMedia":"image","badge":"popular"}'
FROM explorer_search_events e
WHERE e.event_uuid = '11111111-1111-1111-1111-111111111111'
ON DUPLICATE KEY UPDATE
  total_hits = VALUES(total_hits),
  displayed_hits = VALUES(displayed_hits),
  processing_time_ms = VALUES(processing_time_ms),
  is_zero_result = VALUES(is_zero_result),
  click_count = VALUES(click_count),
  conversion_count = VALUES(conversion_count),
  metadata = VALUES(metadata);

INSERT INTO explorer_search_event_entities (
  event_id,
  entity_type,
  total_hits,
  displayed_hits,
  processing_time_ms,
  is_zero_result,
  click_count,
  conversion_count,
  metadata
)
SELECT
  e.id,
  'events',
  0,
  0,
  95,
  1,
  0,
  0,
  '{"reason":"no-results"}'
FROM explorer_search_events e
WHERE e.event_uuid = '22222222-2222-2222-2222-222222222222'
ON DUPLICATE KEY UPDATE
  total_hits = VALUES(total_hits),
  displayed_hits = VALUES(displayed_hits),
  processing_time_ms = VALUES(processing_time_ms),
  is_zero_result = VALUES(is_zero_result),
  click_count = VALUES(click_count),
  conversion_count = VALUES(conversion_count),
  metadata = VALUES(metadata);

INSERT INTO explorer_search_event_interactions (
  event_id,
  entity_type,
  result_id,
  interaction_type,
  position,
  metadata
)
SELECT
  e.id,
  'courses',
  'course-ux-fundamentals',
  'click',
  1,
  '{"action":"open-preview"}'
FROM explorer_search_events e
WHERE e.event_uuid = '11111111-1111-1111-1111-111111111111'
  AND NOT EXISTS (
    SELECT 1
    FROM explorer_search_event_interactions i
    WHERE i.event_id = e.id
      AND i.result_id = 'course-ux-fundamentals'
      AND i.interaction_type = 'click'
  );

INSERT INTO explorer_search_event_interactions (
  event_id,
  entity_type,
  result_id,
  interaction_type,
  position,
  metadata
)
SELECT
  e.id,
  'communities',
  'community-design-leadership',
  'favourite',
  NULL,
  '{"action":"pin"}'
FROM explorer_search_events e
WHERE e.event_uuid = '11111111-1111-1111-1111-111111111111'
  AND NOT EXISTS (
    SELECT 1
    FROM explorer_search_event_interactions i
    WHERE i.event_id = e.id
      AND i.result_id = 'community-design-leadership'
      AND i.interaction_type = 'favourite'
  );

INSERT INTO explorer_search_daily_metrics (
  metric_date,
  entity_type,
  searches,
  zero_results,
  displayed_results,
  total_results,
  clicks,
  conversions,
  average_latency_ms,
  metadata
)
VALUES
  (
    '2025-02-20',
    'courses',
    18,
    2,
    64,
    240,
    12,
    3,
    162,
    '{"source":"seed","surface":"global-bar"}'
  ),
  (
    '2025-02-20',
    'communities',
    11,
    1,
    38,
    96,
    6,
    1,
    154,
    '{"source":"seed","surface":"global-bar"}'
  ),
  (
    '2025-02-20',
    'events',
    7,
    4,
    0,
    0,
    1,
    0,
    108,
    '{"source":"seed","surface":"dashboard"}'
  )
ON DUPLICATE KEY UPDATE
  searches = VALUES(searches),
  zero_results = VALUES(zero_results),
  displayed_results = VALUES(displayed_results),
  total_results = VALUES(total_results),
  clicks = VALUES(clicks),
  conversions = VALUES(conversions),
  average_latency_ms = VALUES(average_latency_ms),
  metadata = VALUES(metadata),
  updated_at = NOW();
