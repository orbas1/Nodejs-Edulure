INSERT INTO communities (owner_id, name, slug, description, cover_image_url)
VALUES
  (1, 'AI Builders Guild', 'ai-builders-guild', 'Weekly masterminds for AI-powered educators.', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80'),
  (2, 'Design Lab', 'design-lab', 'Critiques and co-building for design-led instructors.', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80')
ON DUPLICATE KEY UPDATE slug = slug;

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
