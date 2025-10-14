ALTER TABLE users
  ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER address,
  ADD COLUMN two_factor_secret VARBINARY(255) NULL AFTER two_factor_enabled,
  ADD COLUMN two_factor_enrolled_at TIMESTAMP NULL DEFAULT NULL AFTER two_factor_secret,
  ADD COLUMN two_factor_last_verified_at TIMESTAMP NULL DEFAULT NULL AFTER two_factor_enrolled_at;
