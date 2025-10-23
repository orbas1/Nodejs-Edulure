CREATE TABLE IF NOT EXISTS explorer_search_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_uuid CHAR(36) NOT NULL,
  user_id INT UNSIGNED NULL,
  session_id VARCHAR(64) NOT NULL,
  trace_id VARCHAR(128) NULL,
  query VARCHAR(255) NOT NULL,
  result_total INT UNSIGNED NOT NULL DEFAULT 0,
  is_zero_result TINYINT(1) NOT NULL DEFAULT 0,
  latency_ms INT UNSIGNED NOT NULL DEFAULT 0,
  filters TEXT NOT NULL DEFAULT '{}',
  global_filters TEXT NOT NULL DEFAULT '{}',
  sort_preferences TEXT NOT NULL DEFAULT '{}',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_explorer_search_events_uuid UNIQUE (event_uuid),
  CONSTRAINT fk_explorer_search_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_explorer_search_events_uuid (event_uuid),
  INDEX idx_explorer_search_events_created (created_at),
  INDEX idx_explorer_search_events_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS explorer_search_event_entities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  total_hits INT UNSIGNED NOT NULL DEFAULT 0,
  displayed_hits INT UNSIGNED NOT NULL DEFAULT 0,
  processing_time_ms INT UNSIGNED NOT NULL DEFAULT 0,
  is_zero_result TINYINT(1) NOT NULL DEFAULT 0,
  click_count INT UNSIGNED NOT NULL DEFAULT 0,
  conversion_count INT UNSIGNED NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_explorer_search_event_entities_event FOREIGN KEY (event_id) REFERENCES explorer_search_events(id) ON DELETE CASCADE,
  UNIQUE KEY uq_explorer_search_event_entities_event_type (event_id, entity_type),
  INDEX idx_explorer_search_event_entities_event (event_id),
  INDEX idx_explorer_search_event_entities_type (entity_type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS explorer_search_event_interactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  result_id VARCHAR(255) NOT NULL,
  interaction_type VARCHAR(64) NOT NULL,
  position INT UNSIGNED NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_explorer_search_event_interactions_event FOREIGN KEY (event_id) REFERENCES explorer_search_events(id) ON DELETE CASCADE,
  INDEX idx_explorer_search_event_interactions_event (event_id),
  INDEX idx_explorer_search_event_interactions_entity (entity_type),
  INDEX idx_explorer_search_event_interactions_result (result_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS explorer_search_daily_metrics (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  metric_date DATE NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  searches BIGINT UNSIGNED NOT NULL DEFAULT 0,
  zero_results BIGINT UNSIGNED NOT NULL DEFAULT 0,
  displayed_results BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_results BIGINT UNSIGNED NOT NULL DEFAULT 0,
  clicks BIGINT UNSIGNED NOT NULL DEFAULT 0,
  conversions BIGINT UNSIGNED NOT NULL DEFAULT 0,
  average_latency_ms INT UNSIGNED NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_explorer_search_daily_metrics_date_type (metric_date, entity_type),
  INDEX idx_explorer_search_daily_metrics_date (metric_date),
  INDEX idx_explorer_search_daily_metrics_entity (entity_type)
) ENGINE=InnoDB;
