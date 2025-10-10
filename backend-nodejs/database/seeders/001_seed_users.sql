INSERT INTO users (first_name, last_name, email, password_hash, role, age, address)
VALUES
  ('Alex', 'Morgan', 'alex@edulure.com', '$2a$10$D9S1mNqE9iHtlxgKOnY7Ge.2vB1hQn8sahFtF8DWZth/.RXRcvsrq', 'admin', 34, 'London, UK'),
  ('Jordan', 'Lee', 'jordan@edulure.com', '$2a$10$D9S1mNqE9iHtlxgKOnY7Ge.2vB1hQn8sahFtF8DWZth/.RXRcvsrq', 'instructor', 29, 'Austin, US'),
  ('Sasha', 'Flores', 'sasha@edulure.com', '$2a$10$D9S1mNqE9iHtlxgKOnY7Ge.2vB1hQn8sahFtF8DWZth/.RXRcvsrq', 'user', 31, 'Toronto, CA')
ON DUPLICATE KEY UPDATE email = email;
