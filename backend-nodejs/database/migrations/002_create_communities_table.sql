CREATE TABLE IF NOT EXISTS communities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  description TEXT NULL,
  cover_image_url VARCHAR(500) NULL,
  visibility ENUM('public', 'private') NOT NULL DEFAULT 'public',
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_communities_owner (owner_id),
  UNIQUE KEY unique_community_slug (slug),
  CONSTRAINT fk_communities_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
