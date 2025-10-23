CREATE TABLE IF NOT EXISTS saved_searches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  search_query VARCHAR(255) NOT NULL DEFAULT '',
  entity_types TEXT NOT NULL DEFAULT '[]',
  filters TEXT NOT NULL DEFAULT '{}',
  global_filters TEXT NOT NULL DEFAULT '{}',
  sort_preferences TEXT NOT NULL DEFAULT '{}',
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_saved_searches_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_saved_searches_user_name (user_id, name),
  INDEX idx_saved_searches_user_pinned (user_id, is_pinned, updated_at)
) ENGINE=InnoDB;
