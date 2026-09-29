-- Run once on MySQL for the example News API
CREATE DATABASE IF NOT EXISTS pawanji
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pawanji;

CREATE TABLE IF NOT EXISTS news (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  summary VARCHAR(500) NULL,
  content TEXT NOT NULL,
  cover_image VARCHAR(500) NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_news_slug (slug),
  KEY idx_news_published (is_published, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO news (title, slug, summary, content, is_published, published_at)
VALUES (
  'Welcome to Pawanji News',
  'welcome-to-pawanji-news',
  'Example news item seeded for API testing.',
  'This is a sample news article created so you can test GET /api/news and Swagger.',
  1,
  NOW()
)
ON DUPLICATE KEY UPDATE title = VALUES(title);
