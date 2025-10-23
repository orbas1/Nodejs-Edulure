CREATE TABLE IF NOT EXISTS acquisition_plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  amount_cents INT UNSIGNED NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  billing_interval VARCHAR(32) NOT NULL DEFAULT 'monthly',
  best_value TINYINT(1) NOT NULL DEFAULT 0,
  badge VARCHAR(60) NULL,
  features JSON NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_acquisition_plan_slug (slug),
  UNIQUE KEY unique_acquisition_plan_public_id (public_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS acquisition_plan_addons (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id INT UNSIGNED NULL,
  public_id CHAR(36) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  amount_cents INT UNSIGNED NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  billing_interval VARCHAR(32) NOT NULL DEFAULT 'one_time',
  optional TINYINT(1) NOT NULL DEFAULT 1,
  upsell_descriptor VARCHAR(255) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_acquisition_addon_slug (slug),
  UNIQUE KEY unique_acquisition_addon_public_id (public_id),
  INDEX idx_acquisition_addons_plan_id (plan_id),
  CONSTRAINT fk_acquisition_addons_plan FOREIGN KEY (plan_id)
    REFERENCES acquisition_plans (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
