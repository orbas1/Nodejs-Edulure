INSERT INTO saved_searches (
  user_id,
  name,
  search_query,
  entity_types,
  filters,
  global_filters,
  sort_preferences,
  is_pinned,
  last_used_at
)
SELECT
  u.id,
  'Design Systems Spotlight',
  'design systems',
  '["courses","communities"]',
  '{"level":["intermediate"],"language":["english"]}',
  '{}',
  '{"primary":"trending"}',
  1,
  NOW()
FROM users u
WHERE u.email = 'alex@edulure.com'
ON DUPLICATE KEY UPDATE
  search_query = VALUES(search_query),
  entity_types = VALUES(entity_types),
  filters = VALUES(filters),
  global_filters = VALUES(global_filters),
  sort_preferences = VALUES(sort_preferences),
  is_pinned = VALUES(is_pinned),
  last_used_at = VALUES(last_used_at),
  updated_at = NOW();

INSERT INTO saved_searches (
  user_id,
  name,
  search_query,
  entity_types,
  filters,
  global_filters,
  sort_preferences,
  is_pinned,
  last_used_at
)
SELECT
  u.id,
  'Creator Economy Watchlist',
  'community building',
  '["communities","events"]',
  '{"timezone":["UTC"],"price":{"max":200}}',
  '{"availability":"upcoming"}',
  '{"primary":"upcoming"}',
  0,
  NOW()
FROM users u
WHERE u.email = 'jordan@edulure.com'
ON DUPLICATE KEY UPDATE
  search_query = VALUES(search_query),
  entity_types = VALUES(entity_types),
  filters = VALUES(filters),
  global_filters = VALUES(global_filters),
  sort_preferences = VALUES(sort_preferences),
  is_pinned = VALUES(is_pinned),
  last_used_at = VALUES(last_used_at),
  updated_at = NOW();
