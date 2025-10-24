CREATE TABLE IF NOT EXISTS design_system_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token_key VARCHAR(160) NOT NULL,
  token_value VARCHAR(255) NOT NULL,
  source ENUM('base', 'media', 'data') NOT NULL DEFAULT 'base',
  context VARCHAR(255) NULL,
  selector VARCHAR(255) NOT NULL DEFAULT ':root',
  token_category VARCHAR(120) NOT NULL DEFAULT 'general',
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY design_system_tokens_unique (token_key, source, selector, context),
  INDEX idx_design_system_tokens_key (token_key),
  INDEX idx_design_system_tokens_category (token_category)
);

CREATE TABLE IF NOT EXISTS ux_research_insights (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('planned', 'scheduled', 'in_progress', 'completed') NOT NULL DEFAULT 'planned',
  recorded_at DATE NOT NULL,
  owner VARCHAR(160) NOT NULL,
  summary TEXT NOT NULL,
  tokens_impacted JSON NOT NULL DEFAULT (JSON_ARRAY()),
  documents JSON NOT NULL DEFAULT (JSON_ARRAY()),
  participants JSON NOT NULL DEFAULT (JSON_ARRAY()),
  evidence_url VARCHAR(255) NULL,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_research_insights_slug_unique (slug),
  INDEX idx_ux_research_insights_status (status),
  INDEX idx_ux_research_insights_recorded_at (recorded_at)
);
