import type { RowDataPacket } from "mysql2";
import { execute, query } from "./database";

/**
 * Auto-create tables on API start.
 * Safe to run every time — uses IF NOT EXISTS.
 */
export async function runMigrations(): Promise<void> {
  await execute(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Seed one sample row only if table is empty
  type IdRow = RowDataPacket & { id: number };
  const rows = await query<IdRow[]>("SELECT id FROM news LIMIT 1");

  if (!rows[0]) {
    await execute(
      `INSERT INTO news (title, slug, summary, content, is_published, published_at)
       VALUES (
         :title,
         :slug,
         :summary,
         :content,
         1,
         NOW()
       )`,
      {
        title: "Welcome to Pawanji News",
        slug: "welcome-to-pawanji-news",
        summary: "Example news item seeded for API testing.",
        content:
          "This is a sample news article created so you can test GET /api/news and Swagger.",
      },
    );
  }

  console.log("[api] migrations ok (news table ready)");
}
