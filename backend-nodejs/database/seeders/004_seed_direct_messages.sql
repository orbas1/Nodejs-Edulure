SET @seed_now := NOW();
SET @thread_id := 101;
SET @admin_id := 1;
SET @instructor_id := 2;
SET @learner_id := 3;
SET @first_message_id := 1001;
SET @second_message_id := 1002;

INSERT INTO direct_message_threads (
  id,
  subject,
  is_group,
  metadata,
  last_message_at,
  last_message_preview,
  archive_metadata,
  created_at,
  updated_at
)
VALUES (
  @thread_id,
  'Launch Readiness Sync',
  0,
  JSON_OBJECT('seeded', TRUE, 'playbook', 'launch-readiness'),
  @seed_now,
  'Checklist signed off and synced to the ops drive.',
  JSON_OBJECT(),
  @seed_now,
  @seed_now
)
ON DUPLICATE KEY UPDATE
  subject = VALUES(subject),
  is_group = VALUES(is_group),
  metadata = VALUES(metadata),
  last_message_at = VALUES(last_message_at),
  last_message_preview = VALUES(last_message_preview),
  archive_metadata = VALUES(archive_metadata),
  updated_at = VALUES(updated_at);

INSERT INTO direct_message_participants (
  id,
  thread_id,
  user_id,
  role,
  notifications_enabled,
  is_muted,
  mute_until,
  last_read_at,
  last_read_message_id,
  metadata,
  archived_at,
  created_at,
  updated_at
)
VALUES
  (
    201,
    @thread_id,
    @admin_id,
    'admin',
    1,
    0,
    NULL,
    @seed_now,
    NULL,
    JSON_OBJECT('seeded', TRUE),
    NULL,
    @seed_now,
    @seed_now
  ),
  (
    202,
    @thread_id,
    @instructor_id,
    'member',
    1,
    0,
    NULL,
    @seed_now,
    NULL,
    JSON_OBJECT('seeded', TRUE),
    NULL,
    @seed_now,
    @seed_now
  )
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  notifications_enabled = VALUES(notifications_enabled),
  is_muted = VALUES(is_muted),
  metadata = VALUES(metadata),
  archived_at = VALUES(archived_at),
  updated_at = VALUES(updated_at);

INSERT INTO direct_messages (
  id,
  thread_id,
  sender_id,
  message_type,
  body,
  attachments,
  metadata,
  status,
  delivered_at,
  read_at,
  created_at,
  updated_at
)
VALUES
  (
    @first_message_id,
    @thread_id,
    @admin_id,
    'text',
    'Kai, can you confirm the launch checklist is ready for Friday’s dry run?',
    JSON_ARRAY(),
    JSON_OBJECT('topic', 'launch-checklist'),
    'delivered',
    @seed_now,
    NULL,
    @seed_now,
    @seed_now
  ),
  (
    @second_message_id,
    @thread_id,
    @instructor_id,
    'text',
    'Checklist signed off and synced to the ops drive. I added the QA runbook link.',
    JSON_ARRAY(),
    JSON_OBJECT('checklistVersion', '2024-Q4'),
    'read',
    @seed_now,
    @seed_now,
    @seed_now,
    @seed_now
  )
ON DUPLICATE KEY UPDATE
  body = VALUES(body),
  metadata = VALUES(metadata),
  status = VALUES(status),
  delivered_at = VALUES(delivered_at),
  read_at = VALUES(read_at),
  updated_at = VALUES(updated_at);

UPDATE direct_message_participants
SET
  last_read_message_id = @second_message_id,
  last_read_at = @seed_now,
  updated_at = @seed_now
WHERE thread_id = @thread_id
  AND user_id IN (@admin_id, @instructor_id);

UPDATE direct_message_threads
SET
  last_message_at = @seed_now,
  last_message_preview = 'Checklist signed off and synced to the ops drive.',
  updated_at = @seed_now
WHERE id = @thread_id;

INSERT INTO user_presence_sessions (
  id,
  user_id,
  session_id,
  client,
  status,
  connected_at,
  last_seen_at,
  expires_at,
  metadata
)
VALUES
  (
    301,
    @admin_id,
    'seed-admin-web',
    'web',
    'online',
    @seed_now,
    @seed_now,
    NULL,
    JSON_OBJECT('region', 'eu-west-1', 'appVersion', '1.0.0')
  ),
  (
    302,
    @instructor_id,
    'seed-instructor-mobile',
    'mobile',
    'away',
    @seed_now,
    @seed_now,
    DATE_ADD(@seed_now, INTERVAL 5 MINUTE),
    JSON_OBJECT('region', 'ap-southeast-1', 'appVersion', '1.0.0')
  )
ON DUPLICATE KEY UPDATE
  client = VALUES(client),
  status = VALUES(status),
  last_seen_at = VALUES(last_seen_at),
  expires_at = VALUES(expires_at),
  metadata = VALUES(metadata);

INSERT INTO user_privacy_settings (
  user_id,
  profile_visibility,
  follow_approval_required,
  message_permission,
  share_activity,
  metadata,
  created_at,
  updated_at
)
VALUES
  (
    @admin_id,
    'public',
    0,
    'anyone',
    1,
    JSON_OBJECT('spotlight', 'operations-guild'),
    @seed_now,
    @seed_now
  ),
  (
    @instructor_id,
    'followers',
    1,
    'followers',
    1,
    JSON_OBJECT('acceptsOfficeHours', TRUE),
    @seed_now,
    @seed_now
  ),
  (
    @learner_id,
    'private',
    1,
    'followers',
    0,
    JSON_OBJECT('notes', 'prefers async coaching'),
    @seed_now,
    @seed_now
  )
ON DUPLICATE KEY UPDATE
  profile_visibility = VALUES(profile_visibility),
  follow_approval_required = VALUES(follow_approval_required),
  message_permission = VALUES(message_permission),
  share_activity = VALUES(share_activity),
  metadata = VALUES(metadata),
  updated_at = VALUES(updated_at);
