CREATE DATABASE IF NOT EXISTS edulure CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'edulure_user'@'%' IDENTIFIED BY 'edulure_password';
GRANT ALL PRIVILEGES ON edulure.* TO 'edulure_user'@'%';
FLUSH PRIVILEGES;
