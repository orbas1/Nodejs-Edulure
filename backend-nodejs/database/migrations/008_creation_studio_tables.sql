CREATE TABLE IF NOT EXISTS creation_projects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL,
  owner_id INT UNSIGNED NOT NULL,
  type ENUM('course', 'ebook', 'community', 'ads_asset') NOT NULL,
  status ENUM('draft', 'ready_for_review', 'in_review', 'changes_requested', 'approved', 'published', 'archived') NOT NULL DEFAULT 'draft',
  title VARCHAR(240) NOT NULL,
  summary TEXT NULL,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  content_outline JSON NOT NULL DEFAULT (JSON_ARRAY()),
  compliance_notes JSON NOT NULL DEFAULT (JSON_ARRAY()),
  analytics_targets JSON NOT NULL DEFAULT (JSON_OBJECT()),
  publishing_channels JSON NOT NULL DEFAULT (JSON_ARRAY()),
  review_requested_at TIMESTAMP NULL DEFAULT NULL,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  published_at TIMESTAMP NULL DEFAULT NULL,
  archived_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY creation_projects_public_id_unique (public_id),
  INDEX idx_creation_projects_owner (owner_id),
  INDEX idx_creation_projects_type (type),
  INDEX idx_creation_projects_status (status),
  INDEX idx_creation_projects_created_at (created_at),
  CONSTRAINT creation_projects_owner_fk FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS creation_project_collaborators (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('owner', 'editor', 'commenter', 'viewer') NOT NULL DEFAULT 'editor',
  permissions JSON NOT NULL DEFAULT (JSON_ARRAY()),
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY creation_project_collaborators_unique (project_id, user_id),
  INDEX idx_creation_project_collaborators_user (user_id),
  CONSTRAINT creation_project_collaborators_project_fk FOREIGN KEY (project_id) REFERENCES creation_projects (id) ON DELETE CASCADE,
  CONSTRAINT creation_project_collaborators_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS creation_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL,
  type ENUM('course', 'ebook', 'community', 'ads_asset') NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  schema JSON NOT NULL DEFAULT (JSON_OBJECT()),
  version INT UNSIGNED NOT NULL DEFAULT 1,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NOT NULL,
  governance_tags JSON NOT NULL DEFAULT (JSON_ARRAY()),
  published_at TIMESTAMP NULL DEFAULT NULL,
  retired_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY creation_templates_public_id_unique (public_id),
  UNIQUE KEY creation_templates_type_title_version_unique (type, title, version),
  INDEX idx_creation_templates_type (type),
  INDEX idx_creation_templates_is_default (is_default),
  CONSTRAINT creation_templates_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS creation_collaboration_sessions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL,
  project_id INT UNSIGNED NOT NULL,
  participant_id INT UNSIGNED NOT NULL,
  role ENUM('owner', 'editor', 'commenter', 'viewer') NOT NULL DEFAULT 'editor',
  capabilities JSON NOT NULL DEFAULT (JSON_ARRAY()),
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP NULL DEFAULT NULL,
  was_terminated TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY creation_collaboration_sessions_public_id_unique (public_id),
  INDEX idx_creation_collaboration_sessions_project (project_id),
  INDEX idx_creation_collaboration_sessions_participant (participant_id),
  INDEX idx_creation_collaboration_sessions_joined_at (joined_at),
  CONSTRAINT creation_collaboration_sessions_project_fk FOREIGN KEY (project_id) REFERENCES creation_projects (id) ON DELETE CASCADE,
  CONSTRAINT creation_collaboration_sessions_participant_fk FOREIGN KEY (participant_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS creation_project_versions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  snapshot JSON NOT NULL,
  change_summary JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY creation_project_versions_unique (project_id, version_number),
  CONSTRAINT creation_project_versions_project_fk FOREIGN KEY (project_id) REFERENCES creation_projects (id) ON DELETE CASCADE,
  CONSTRAINT creation_project_versions_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
