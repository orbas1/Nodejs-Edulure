CREATE TABLE IF NOT EXISTS community_members (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  community_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('owner', 'admin', 'moderator', 'member') NOT NULL DEFAULT 'member',
  status ENUM('active', 'pending', 'banned') NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  left_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_cm_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CONSTRAINT fk_cm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_member (community_id, user_id),
  INDEX idx_cm_user_status (user_id, status)
) ENGINE=InnoDB;
