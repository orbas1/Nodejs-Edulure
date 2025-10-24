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
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'field_service_providers'
         AND index_name = 'idx_field_service_providers_status'
    ) THEN
      ALTER TABLE field_service_providers ADD INDEX idx_field_service_providers_status (status);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'field_service_providers'
         AND index_name = 'idx_field_service_providers_user'
    ) THEN
      ALTER TABLE field_service_providers ADD INDEX idx_field_service_providers_user (user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'field_service_providers'
         AND index_name = 'idx_field_service_providers_location_updated'
    ) THEN
      ALTER TABLE field_service_providers ADD INDEX idx_field_service_providers_location_updated (location_updated_at);
    END IF;
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
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'field_service_orders'
         AND index_name = 'idx_field_service_orders_status'
    ) THEN
      ALTER TABLE field_service_orders ADD INDEX idx_field_service_orders_status (status);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'field_service_orders'
         AND index_name = 'idx_field_service_orders_customer'
    ) THEN
      ALTER TABLE field_service_orders ADD INDEX idx_field_service_orders_customer (customer_user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'field_service_orders'
         AND index_name = 'idx_field_service_orders_provider'
    ) THEN
      ALTER TABLE field_service_orders ADD INDEX idx_field_service_orders_provider (provider_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'field_service_orders'
         AND index_name = 'idx_field_service_orders_scheduled'
    ) THEN
      ALTER TABLE field_service_orders ADD INDEX idx_field_service_orders_scheduled (scheduled_for);
    END IF;
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
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'field_service_events'
         AND index_name = 'idx_field_service_events_order'
    ) THEN
      ALTER TABLE field_service_events ADD INDEX idx_field_service_events_order (order_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'field_service_events'
         AND index_name = 'idx_field_service_events_occurred_at'
    ) THEN
      ALTER TABLE field_service_events ADD INDEX idx_field_service_events_occurred_at (occurred_at);
    END IF;
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
      escalation_breadcrumbs JSON NULL,
      knowledge_suggestions JSON NULL,
      ai_summary TEXT NULL,
      follow_up_due_at DATETIME NULL,
      ai_summary_generated_at DATETIME NULL,
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
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_support_cases'
         AND index_name = 'idx_support_cases_user'
    ) THEN
      ALTER TABLE learner_support_cases ADD INDEX idx_support_cases_user (user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_support_cases'
         AND index_name = 'idx_support_cases_status'
    ) THEN
      ALTER TABLE learner_support_cases ADD INDEX idx_support_cases_status (status);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_support_cases'
         AND column_name = 'escalation_breadcrumbs'
    ) THEN
      ALTER TABLE learner_support_cases ADD COLUMN escalation_breadcrumbs JSON NULL AFTER last_agent;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_support_cases'
         AND column_name = 'knowledge_suggestions'
    ) THEN
      ALTER TABLE learner_support_cases ADD COLUMN knowledge_suggestions JSON NULL AFTER escalation_breadcrumbs;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_support_cases'
         AND column_name = 'ai_summary'
    ) THEN
      ALTER TABLE learner_support_cases ADD COLUMN ai_summary TEXT NULL AFTER knowledge_suggestions;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_support_cases'
         AND column_name = 'follow_up_due_at'
    ) THEN
      ALTER TABLE learner_support_cases ADD COLUMN follow_up_due_at DATETIME NULL AFTER ai_summary;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_support_cases'
         AND column_name = 'ai_summary_generated_at'
    ) THEN
      ALTER TABLE learner_support_cases ADD COLUMN ai_summary_generated_at DATETIME NULL AFTER follow_up_due_at;
    END IF;
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
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_support_messages'
         AND index_name = 'idx_support_messages_case'
    ) THEN
      ALTER TABLE learner_support_messages ADD INDEX idx_support_messages_case (case_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_support_messages'
         AND index_name = 'idx_support_messages_created_at'
    ) THEN
      ALTER TABLE learner_support_messages ADD INDEX idx_support_messages_created_at (created_at);
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'support_articles'
  ) THEN
    CREATE TABLE support_articles (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(120) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      summary VARCHAR(512) NOT NULL,
      category VARCHAR(120) NOT NULL,
      keywords JSON NULL,
      url VARCHAR(512) NOT NULL,
      minutes INT UNSIGNED NOT NULL DEFAULT 3,
      helpfulness_score DECIMAL(6,2) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'support_articles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'support_articles'
         AND index_name = 'idx_support_articles_category'
    ) THEN
      ALTER TABLE support_articles ADD INDEX idx_support_articles_category (category);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'support_articles'
         AND index_name = 'idx_support_articles_score'
    ) THEN
      ALTER TABLE support_articles ADD INDEX idx_support_articles_score (helpfulness_score);
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_system_preferences'
  ) THEN
    CREATE TABLE learner_system_preferences (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      language VARCHAR(8) NOT NULL DEFAULT 'en',
      region VARCHAR(32) NOT NULL DEFAULT 'US',
      timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
      notifications_enabled TINYINT(1) NOT NULL DEFAULT 1,
      digest_enabled TINYINT(1) NOT NULL DEFAULT 1,
      auto_play_media TINYINT(1) NOT NULL DEFAULT 0,
      high_contrast TINYINT(1) NOT NULL DEFAULT 0,
      reduced_motion TINYINT(1) NOT NULL DEFAULT 0,
      preferences JSON NOT NULL DEFAULT (JSON_OBJECT()),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY learner_system_preferences_user_unique (user_id),
      CONSTRAINT fk_learner_system_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_financial_profiles'
  ) THEN
    CREATE TABLE learner_financial_profiles (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      auto_pay_enabled TINYINT(1) NOT NULL DEFAULT 0,
      reserve_target_cents INT UNSIGNED NOT NULL DEFAULT 0,
      preferences JSON NOT NULL DEFAULT (JSON_OBJECT()),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY learner_financial_profiles_user_unique (user_id),
      CONSTRAINT fk_learner_financial_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT learner_financial_profiles_reserve_chk CHECK (reserve_target_cents >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_financial_profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_financial_profiles'
         AND index_name = 'learner_financial_profiles_user_unique'
    ) THEN
      ALTER TABLE learner_financial_profiles
        ADD UNIQUE KEY learner_financial_profiles_user_unique (user_id);
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_payment_methods'
  ) THEN
    CREATE TABLE learner_payment_methods (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      label VARCHAR(120) NOT NULL,
      brand VARCHAR(60) NOT NULL,
      last4 VARCHAR(4) NOT NULL,
      expiry VARCHAR(10) NOT NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY learner_payment_methods_user_label_unique (user_id, label),
      KEY learner_payment_methods_user_primary_idx (user_id, is_primary),
      CONSTRAINT fk_learner_payment_methods_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_payment_methods'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_payment_methods'
         AND index_name = 'learner_payment_methods_user_primary_idx'
    ) THEN
      ALTER TABLE learner_payment_methods
        ADD INDEX learner_payment_methods_user_primary_idx (user_id, is_primary);
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_billing_contacts'
  ) THEN
    CREATE TABLE learner_billing_contacts (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(180) NOT NULL,
      phone VARCHAR(60) NULL,
      company VARCHAR(150) NULL,
      metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY learner_billing_contacts_user_email_unique (user_id, email),
      KEY learner_billing_contacts_user_idx (user_id),
      CONSTRAINT fk_learner_billing_contacts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_billing_contacts'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_billing_contacts'
         AND index_name = 'learner_billing_contacts_user_idx'
    ) THEN
      ALTER TABLE learner_billing_contacts
        ADD INDEX learner_billing_contacts_user_idx (user_id);
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_finance_purchases'
  ) THEN
    CREATE TABLE learner_finance_purchases (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      reference VARCHAR(64) NOT NULL,
      description VARCHAR(255) NOT NULL,
      amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
      currency CHAR(3) NOT NULL DEFAULT 'USD',
      status VARCHAR(32) NOT NULL DEFAULT 'paid',
      purchased_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY learner_finance_purchases_user_date_idx (user_id, purchased_at),
      KEY learner_finance_purchases_user_status_idx (user_id, status),
      CONSTRAINT fk_learner_finance_purchases_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT learner_finance_purchases_amount_chk CHECK (amount_cents >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'learner_finance_purchases'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_finance_purchases'
         AND index_name = 'learner_finance_purchases_user_date_idx'
    ) THEN
      ALTER TABLE learner_finance_purchases
        ADD INDEX learner_finance_purchases_user_date_idx (user_id, purchased_at);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'learner_finance_purchases'
         AND index_name = 'learner_finance_purchases_user_status_idx'
    ) THEN
      ALTER TABLE learner_finance_purchases
        ADD INDEX learner_finance_purchases_user_status_idx (user_id, status);
    END IF;
  END IF;
END $$

CALL ensure_edulure_extensions() $$
DROP PROCEDURE ensure_edulure_extensions $$
DELIMITER ;
