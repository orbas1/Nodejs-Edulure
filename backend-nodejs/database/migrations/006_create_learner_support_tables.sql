CREATE TABLE IF NOT EXISTS learner_support_cases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  reference VARCHAR(40) NOT NULL UNIQUE,
  subject VARCHAR(255) NOT NULL,
  category VARCHAR(120) NOT NULL DEFAULT 'General',
  priority ENUM('urgent', 'high', 'normal', 'low') NOT NULL DEFAULT 'normal',
  status ENUM('open', 'waiting', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  channel VARCHAR(80) NOT NULL DEFAULT 'Portal',
  satisfaction TINYINT NULL,
  owner VARCHAR(160) NULL,
  last_agent VARCHAR(160) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_support_cases_user (user_id),
  INDEX idx_support_cases_status (status),
  CONSTRAINT fk_support_cases_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learner_support_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_id BIGINT UNSIGNED NOT NULL,
  author ENUM('learner', 'support', 'system') NOT NULL DEFAULT 'support',
  body TEXT NOT NULL,
  attachments JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_support_messages_case (case_id),
  INDEX idx_support_messages_created_at (created_at),
  CONSTRAINT fk_support_messages_case FOREIGN KEY (case_id) REFERENCES learner_support_cases(id) ON DELETE CASCADE
);
