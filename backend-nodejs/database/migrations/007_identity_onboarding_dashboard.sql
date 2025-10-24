CREATE TABLE IF NOT EXISTS user_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  display_name VARCHAR(200) NULL,
  tagline VARCHAR(240) NULL,
  location VARCHAR(160) NULL,
  avatar_url VARCHAR(500) NULL,
  banner_url VARCHAR(500) NULL,
  bio TEXT NULL,
  social_links JSON NOT NULL DEFAULT (JSON_ARRAY()),
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY user_profiles_user_id_unique (user_id),
  CONSTRAINT user_profiles_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS domain_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NULL,
  performed_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_domain_events_entity (entity_type, entity_id),
  INDEX idx_domain_events_event_type (event_type),
  INDEX idx_domain_events_created_at (created_at),
  CONSTRAINT domain_events_performed_by_fk FOREIGN KEY (performed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  refresh_token_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rotated_at TIMESTAMP NULL DEFAULT NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  revoked_reason VARCHAR(255) NULL,
  revoked_by INT UNSIGNED NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uniq_user_sessions_refresh_hash (user_id, refresh_token_hash),
  INDEX idx_user_sessions_expiration (user_id, expires_at),
  INDEX idx_user_sessions_last_used (user_id, last_used_at),
  INDEX idx_user_sessions_revoked (revoked_at),
  INDEX idx_user_sessions_rotated_at (rotated_at),
  INDEX idx_user_sessions_revoked_by (revoked_by),
  CONSTRAINT user_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_sessions_revoked_by_fk FOREIGN KEY (revoked_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_two_factor_challenges (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  delivery_channel VARCHAR(32) NOT NULL DEFAULT 'email',
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP NULL DEFAULT NULL,
  consumed_reason VARCHAR(32) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_two_factor_user_active (user_id, consumed_at, expires_at),
  INDEX idx_two_factor_token_hash (token_hash),
  CONSTRAINT user_two_factor_challenges_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS learner_onboarding_responses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(60) NOT NULL,
  user_id INT UNSIGNED NULL,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NULL,
  persona VARCHAR(120) NULL,
  goals JSON NOT NULL DEFAULT (JSON_ARRAY()),
  invites JSON NOT NULL DEFAULT (JSON_ARRAY()),
  preferences JSON NOT NULL DEFAULT (JSON_OBJECT()),
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  terms_accepted TINYINT(1) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY learner_onboarding_responses_email_role_unique (email, role),
  INDEX learner_onboarding_responses_submitted_idx (submitted_at),
  CONSTRAINT learner_onboarding_responses_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS courses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL,
  instructor_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  description LONGTEXT NULL,
  level VARCHAR(60) NULL,
  category VARCHAR(120) NULL,
  skills JSON NOT NULL DEFAULT (JSON_ARRAY()),
  tags JSON NOT NULL DEFAULT (JSON_ARRAY()),
  languages JSON NOT NULL DEFAULT (JSON_ARRAY()),
  delivery_format VARCHAR(60) NULL,
  thumbnail_url VARCHAR(500) NULL,
  hero_image_url VARCHAR(500) NULL,
  trailer_url VARCHAR(500) NULL,
  promo_video_url VARCHAR(500) NULL,
  syllabus_url VARCHAR(500) NULL,
  price_currency VARCHAR(12) NULL,
  price_amount BIGINT NULL,
  rating_average DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  rating_count INT UNSIGNED NOT NULL DEFAULT 0,
  enrolment_count INT UNSIGNED NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  release_at TIMESTAMP NULL DEFAULT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'draft',
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY courses_public_id_unique (public_id),
  UNIQUE KEY courses_slug_unique (slug),
  INDEX courses_instructor_idx (instructor_id),
  INDEX courses_status_idx (status),
  INDEX courses_deleted_idx (deleted_at),
  CONSTRAINT courses_instructor_fk FOREIGN KEY (instructor_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_modules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 0,
  release_offset_days INT NULL,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY course_modules_course_slug_unique (course_id, slug),
  INDEX course_modules_course_position_idx (course_id, position),
  CONSTRAINT course_modules_course_fk FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_lessons (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL,
  module_id BIGINT UNSIGNED NOT NULL,
  asset_id BIGINT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 0,
  duration_minutes INT NULL,
  release_at TIMESTAMP NULL DEFAULT NULL,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY course_lessons_course_slug_unique (course_id, slug),
  INDEX course_lessons_course_module_position_idx (course_id, module_id, position),
  CONSTRAINT course_lessons_course_fk FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT course_lessons_module_fk FOREIGN KEY (module_id) REFERENCES course_modules (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_enrollments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  started_at TIMESTAMP NULL DEFAULT NULL,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  last_accessed_at TIMESTAMP NULL DEFAULT NULL,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY course_enrollments_public_id_unique (public_id),
  INDEX course_enrollments_user_idx (user_id),
  INDEX course_enrollments_course_idx (course_id),
  INDEX course_enrollments_status_idx (status),
  CONSTRAINT course_enrollments_course_fk FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT course_enrollments_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_progress (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  enrollment_id BIGINT UNSIGNED NOT NULL,
  lesson_id BIGINT UNSIGNED NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY course_progress_enrollment_lesson_unique (enrollment_id, lesson_id),
  INDEX course_progress_lesson_idx (lesson_id),
  CONSTRAINT course_progress_enrollment_fk FOREIGN KEY (enrollment_id) REFERENCES course_enrollments (id) ON DELETE CASCADE,
  CONSTRAINT course_progress_lesson_fk FOREIGN KEY (lesson_id) REFERENCES course_lessons (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL,
  module_id BIGINT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  instructions TEXT NOT NULL,
  max_score INT UNSIGNED NOT NULL DEFAULT 100,
  due_offset_days INT NULL,
  rubric JSON NOT NULL DEFAULT (JSON_OBJECT()),
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX course_assignments_course_idx (course_id),
  CONSTRAINT course_assignments_course_fk FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT course_assignments_module_fk FOREIGN KEY (module_id) REFERENCES course_modules (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS learner_system_preferences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  language VARCHAR(12) NULL,
  region VARCHAR(12) NULL,
  timezone VARCHAR(64) NULL,
  notifications_enabled TINYINT(1) NOT NULL DEFAULT 1,
  digest_enabled TINYINT(1) NOT NULL DEFAULT 1,
  auto_play_media TINYINT(1) NOT NULL DEFAULT 0,
  high_contrast TINYINT(1) NOT NULL DEFAULT 0,
  reduced_motion TINYINT(1) NOT NULL DEFAULT 0,
  preferences JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY learner_system_preferences_user_unique (user_id),
  CONSTRAINT learner_system_preferences_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
