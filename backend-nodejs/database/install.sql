-- Edulure database bootstrap helper.
--
-- Infrastructure automation runs `npm run db:install`, which provisions the
-- schema via Knex migrations. This SQL entry point exists for operations teams
-- that must validate that optional extensions (field service dispatch and
-- learner support desks) are present on long-lived environments. The procedure
-- below can be executed safely multiple times; it creates the extension tables
-- only when they are missing and raises a descriptive error if the core `users`
-- table has not been created yet.

DELIMITER $$
DROP PROCEDURE IF EXISTS ensure_edulure_extensions $$
CREATE PROCEDURE ensure_edulure_extensions()
BEGIN
  DECLARE core_missing BOOLEAN DEFAULT FALSE;

  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'users'
  ) THEN
    SET core_missing = TRUE;
  END IF;

  IF core_missing THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Core schema missing. Run `npm run db:install` before executing database/install.sql again.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'field_service_providers'
  ) THEN
    CREATE TABLE field_service_providers (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NULL,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NULL,
      phone VARCHAR(64) NULL,
      status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
      specialties JSON NULL DEFAULT (JSON_ARRAY()),
      rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
      last_check_in_at DATETIME NULL,
      location_lat DECIMAL(10,7) NULL,
      location_lng DECIMAL(10,7) NULL,
      location_label VARCHAR(255) NULL,
      location_updated_at DATETIME NULL,
      metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_field_service_providers_status (status),
      INDEX idx_field_service_providers_user (user_id),
      INDEX idx_field_service_providers_location_updated (location_updated_at),
      CONSTRAINT fk_field_service_providers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'field_service_providers'
  ) THEN
    ALTER TABLE field_service_providers
      ADD INDEX IF NOT EXISTS idx_field_service_providers_status (status),
      ADD INDEX IF NOT EXISTS idx_field_service_providers_user (user_id),
      ADD INDEX IF NOT EXISTS idx_field_service_providers_location_updated (location_updated_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'field_service_orders'
  ) THEN
    CREATE TABLE field_service_orders (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      reference VARCHAR(40) NOT NULL,
      customer_user_id INT UNSIGNED NOT NULL,
      provider_id INT UNSIGNED NULL,
      status VARCHAR(32) NOT NULL,
      priority VARCHAR(24) NOT NULL DEFAULT 'standard',
      service_type VARCHAR(160) NOT NULL,
      summary VARCHAR(255) NULL,
      requested_at DATETIME NOT NULL,
      scheduled_for DATETIME NULL,
      eta_minutes INT NULL,
      sla_minutes INT NULL,
      distance_km DECIMAL(6,2) NULL,
      location_lat DECIMAL(10,7) NOT NULL,
      location_lng DECIMAL(10,7) NOT NULL,
      location_label VARCHAR(255) NULL,
      address_line_1 VARCHAR(255) NULL,
      address_line_2 VARCHAR(255) NULL,
      city VARCHAR(120) NULL,
      region VARCHAR(120) NULL,
      postal_code VARCHAR(24) NULL,
      country VARCHAR(2) NOT NULL DEFAULT 'GB',
      metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_field_service_order_reference (reference),
      INDEX idx_field_service_orders_status (status),
      INDEX idx_field_service_orders_customer (customer_user_id),
      INDEX idx_field_service_orders_provider (provider_id),
      INDEX idx_field_service_orders_scheduled (scheduled_for),
      CONSTRAINT fk_field_service_orders_customer FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_field_service_orders_provider FOREIGN KEY (provider_id) REFERENCES field_service_providers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'field_service_orders'
  ) THEN
    ALTER TABLE field_service_orders
      ADD INDEX IF NOT EXISTS idx_field_service_orders_status (status),
      ADD INDEX IF NOT EXISTS idx_field_service_orders_customer (customer_user_id),
      ADD INDEX IF NOT EXISTS idx_field_service_orders_provider (provider_id),
      ADD INDEX IF NOT EXISTS idx_field_service_orders_scheduled (scheduled_for);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'field_service_events'
  ) THEN
    CREATE TABLE field_service_events (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_id INT UNSIGNED NOT NULL,
      event_type VARCHAR(64) NOT NULL,
      status VARCHAR(32) NULL,
      notes TEXT NULL,
      author VARCHAR(160) NULL,
      occurred_at DATETIME NOT NULL,
      metadata JSON NULL DEFAULT (JSON_OBJECT()),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_field_service_events_order (order_id),
      INDEX idx_field_service_events_occurred_at (occurred_at),
      CONSTRAINT fk_field_service_events_order FOREIGN KEY (order_id) REFERENCES field_service_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'field_service_events'
  ) THEN
    ALTER TABLE field_service_events
      ADD INDEX IF NOT EXISTS idx_field_service_events_order (order_id),
      ADD INDEX IF NOT EXISTS idx_field_service_events_occurred_at (occurred_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_support_cases'
  ) THEN
    CREATE TABLE learner_support_cases (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      reference VARCHAR(40) NOT NULL,
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
      UNIQUE KEY unique_support_case_reference (reference),
      INDEX idx_support_cases_user (user_id),
      INDEX idx_support_cases_status (status),
      CONSTRAINT fk_support_cases_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_support_cases'
  ) THEN
    ALTER TABLE learner_support_cases
      ADD INDEX IF NOT EXISTS idx_support_cases_user (user_id),
      ADD INDEX IF NOT EXISTS idx_support_cases_status (status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_support_messages'
  ) THEN
    CREATE TABLE learner_support_messages (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      case_id INT UNSIGNED NOT NULL,
      author ENUM('learner', 'support', 'system') NOT NULL DEFAULT 'support',
      body TEXT NOT NULL,
      attachments JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_support_messages_case (case_id),
      INDEX idx_support_messages_created_at (created_at),
      CONSTRAINT fk_support_messages_case FOREIGN KEY (case_id) REFERENCES learner_support_cases(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_support_messages'
  ) THEN
    ALTER TABLE learner_support_messages
      ADD INDEX IF NOT EXISTS idx_support_messages_case (case_id),
      ADD INDEX IF NOT EXISTS idx_support_messages_created_at (created_at);
  END IF;
END $$

CALL ensure_edulure_extensions() $$
DROP PROCEDURE ensure_edulure_extensions $$
DELIMITER ;
