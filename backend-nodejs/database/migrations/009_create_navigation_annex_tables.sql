CREATE TABLE IF NOT EXISTS navigation_annex_backlog_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nav_item_id VARCHAR(80) NOT NULL,
  nav_item_label VARCHAR(160) NOT NULL,
  nav_item_category ENUM('primary', 'quick_action', 'dashboard') NOT NULL DEFAULT 'primary',
  nav_item_route VARCHAR(255) NOT NULL,
  role_scope JSON NOT NULL DEFAULT (JSON_ARRAY()),
  epic_id VARCHAR(120) NOT NULL,
  summary TEXT NOT NULL,
  backlog_ref VARCHAR(255) NULL,
  impacted_files JSON NOT NULL DEFAULT (JSON_ARRAY()),
  priority TINYINT UNSIGNED NOT NULL DEFAULT 3,
  display_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY navigation_annex_backlog_items_unique (nav_item_id, epic_id),
  INDEX idx_navigation_annex_backlog_nav (nav_item_id),
  INDEX idx_navigation_annex_backlog_priority (priority)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS navigation_annex_operation_tasks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nav_item_id VARCHAR(80) NOT NULL,
  nav_item_label VARCHAR(160) NOT NULL,
  nav_item_category ENUM('primary', 'quick_action', 'dashboard') NOT NULL DEFAULT 'primary',
  nav_item_route VARCHAR(255) NOT NULL,
  role_scope JSON NOT NULL DEFAULT (JSON_ARRAY()),
  task_key VARCHAR(120) NOT NULL,
  label VARCHAR(255) NOT NULL,
  cadence VARCHAR(120) NOT NULL,
  runbook_section VARCHAR(160) NULL,
  href VARCHAR(255) NULL,
  owner VARCHAR(160) NULL,
  priority TINYINT UNSIGNED NOT NULL DEFAULT 3,
  display_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  include_in_checklist TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY navigation_annex_operation_tasks_key_unique (task_key),
  INDEX idx_navigation_annex_operation_tasks_nav (nav_item_id),
  INDEX idx_navigation_annex_operation_tasks_priority (priority)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS navigation_annex_design_dependencies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nav_item_id VARCHAR(80) NOT NULL,
  nav_item_label VARCHAR(160) NOT NULL,
  nav_item_category ENUM('primary', 'quick_action', 'dashboard') NOT NULL DEFAULT 'primary',
  nav_item_route VARCHAR(255) NOT NULL,
  role_scope JSON NOT NULL DEFAULT (JSON_ARRAY()),
  dependency_key VARCHAR(120) NOT NULL,
  dependency_type ENUM('token', 'qa', 'reference') NOT NULL,
  value VARCHAR(255) NOT NULL,
  notes VARCHAR(255) NULL,
  display_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY navigation_annex_design_dependencies_unique (dependency_key, dependency_type),
  INDEX idx_navigation_annex_design_dependencies_nav (nav_item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS navigation_annex_strategy_narratives (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nav_item_id VARCHAR(80) NOT NULL,
  nav_item_label VARCHAR(160) NOT NULL,
  nav_item_category ENUM('primary', 'quick_action', 'dashboard') NOT NULL DEFAULT 'primary',
  nav_item_route VARCHAR(255) NOT NULL,
  role_scope JSON NOT NULL DEFAULT (JSON_ARRAY()),
  narrative_key VARCHAR(120) NOT NULL,
  pillar ENUM('activation', 'retention', 'engagement', 'expansion', 'efficiency') NOT NULL,
  narrative TEXT NOT NULL,
  display_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY navigation_annex_strategy_narratives_key_unique (narrative_key),
  INDEX idx_navigation_annex_strategy_narratives_nav (nav_item_id),
  INDEX idx_navigation_annex_strategy_narratives_pillar (pillar)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS navigation_annex_strategy_metrics (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  narrative_id INT UNSIGNED NOT NULL,
  metric_key VARCHAR(120) NOT NULL,
  label VARCHAR(255) NOT NULL,
  baseline VARCHAR(120) NULL,
  target VARCHAR(120) NULL,
  unit VARCHAR(60) NULL,
  display_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY navigation_annex_strategy_metrics_key_unique (metric_key),
  INDEX idx_navigation_annex_strategy_metrics_narrative (narrative_id),
  CONSTRAINT navigation_annex_strategy_metrics_narrative_fk FOREIGN KEY (narrative_id)
    REFERENCES navigation_annex_strategy_narratives (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
