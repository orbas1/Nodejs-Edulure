INSERT INTO communities (owner_id, name, slug, description, cover_image_url, visibility, metadata)
VALUES
  (
    1,
    'AI Builders Guild',
    'ai-builders-guild',
    'Weekly masterminds for AI-powered educators.',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
    'public',
    JSON_OBJECT(
      'timezone', 'Etc/UTC',
      'topics', JSON_ARRAY('machine-learning', 'growth-experiments'),
      'cadence', 'weekly',
      'cta', 'Share your latest automation build in #launches'
    )
  ),
  (
    2,
    'Design Lab',
    'design-lab',
    'Critiques and co-building for design-led instructors.',
    'https://images.unsplash.com/photo-152202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
    'private',
    JSON_OBJECT(
      'timezone', 'America/New_York',
      'topics', JSON_ARRAY('ux-research', 'course-outlines'),
      'cadence', 'biweekly',
      'cta', 'Upload your latest walkthrough for async feedback'
    )
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  cover_image_url = VALUES(cover_image_url),
  visibility = VALUES(visibility),
  metadata = VALUES(metadata);

INSERT INTO community_members (community_id, user_id, role, status)
VALUES
  (1, 1, 'owner', 'active'),
  (1, 2, 'moderator', 'active'),
  (1, 3, 'member', 'active'),
  (2, 2, 'admin', 'active'),
  (2, 1, 'member', 'active')
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  status = VALUES(status);
