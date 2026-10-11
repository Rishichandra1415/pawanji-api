import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { BASE_COLUMNS_SQL, BASE_COLUMN_DEFINITIONS } from "../utils/base-entity";
import { execute, query } from "./database";
import { env } from "./env";

/**
 * Auto-create / upgrade tables on API start.
 * Every step is idempotent, so it is safe to run on every boot.
 */
export async function runMigrations(): Promise<void> {
  await createAdminUsers();
  await upgradeNews();
  await createDepartments();
  await createGrievances();
  await createGrievanceForwards();

  await seedAdmin();
  await seedDepartments();
  await seedNews();

  console.log("[api] migrations ok (admin_users, news, departments, grievances, grievance_forwards)");
}

const TABLE_OPTIONS = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

type ColumnRow = RowDataPacket & { COLUMN_NAME: string };
type IndexRow = RowDataPacket & { INDEX_NAME: string };

async function columnsOf(table: string): Promise<Set<string>> {
  const rows = await query<ColumnRow[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table`,
    { table },
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function indexesOf(table: string): Promise<Set<string>> {
  const rows = await query<IndexRow[]>(
    `SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table`,
    { table },
  );
  return new Set(rows.map((row) => row.INDEX_NAME));
}

async function createAdminUsers() {
  await execute(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL,
      passwordHash VARCHAR(255) NOT NULL,
      role ENUM('admin','staff') NOT NULL DEFAULT 'admin',
      lastLoginAt DATETIME NULL,
      ${BASE_COLUMNS_SQL},
      PRIMARY KEY (id),
      KEY idx_admin_users_email (email, isDeleted)
    ) ${TABLE_OPTIONS}
  `);
}

async function upgradeNews() {
  await execute(`
    CREATE TABLE IF NOT EXISTS news (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(200) NOT NULL,
      slug VARCHAR(220) NOT NULL,
      summary VARCHAR(500) NULL,
      content TEXT NOT NULL,
      coverImage VARCHAR(500) NULL,
      isPublished TINYINT(1) NOT NULL DEFAULT 0,
      publishedAt DATETIME NULL,
      ${BASE_COLUMNS_SQL},
      PRIMARY KEY (id),
      KEY idx_news_slug (slug, isDeleted),
      KEY idx_news_published (isPublished, publishedAt)
    ) ${TABLE_OPTIONS}
  `);

  // Legacy snake_case columns -> camelCase
  const renames: [string, string, string][] = [
    ["cover_image", "coverImage", "VARCHAR(500) NULL"],
    ["is_published", "isPublished", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["published_at", "publishedAt", "DATETIME NULL"],
    ["created_at", "createdAt", BASE_COLUMN_DEFINITIONS.createdAt],
    ["updated_at", "updatedAt", BASE_COLUMN_DEFINITIONS.updatedAt],
  ];
  let columns = await columnsOf("news");
  for (const [from, to, definition] of renames) {
    if (columns.has(from) && !columns.has(to)) {
      await execute(`ALTER TABLE news CHANGE COLUMN \`${from}\` \`${to}\` ${definition}`);
    }
  }

  columns = await columnsOf("news");
  for (const [name, definition] of Object.entries(BASE_COLUMN_DEFINITIONS)) {
    if (!columns.has(name)) {
      await execute(`ALTER TABLE news ADD COLUMN \`${name}\` ${definition}`);
    }
  }

  // Slugs must stay reusable after a soft delete, so uniqueness is enforced in the service.
  const indexes = await indexesOf("news");
  if (indexes.has("uq_news_slug")) await execute("ALTER TABLE news DROP INDEX uq_news_slug");
  if (!indexes.has("idx_news_slug")) await execute("ALTER TABLE news ADD KEY idx_news_slug (slug, isDeleted)");
}

async function createDepartments() {
  await execute(`
    CREATE TABLE IF NOT EXISTS departments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      code VARCHAR(50) NOT NULL,
      nameEn VARCHAR(150) NOT NULL,
      nameHi VARCHAR(150) NOT NULL,
      email VARCHAR(190) NULL,
      ccEmails VARCHAR(500) NULL,
      contactPerson VARCHAR(120) NULL,
      phone VARCHAR(20) NULL,
      sortOrder INT NOT NULL DEFAULT 0,
      ${BASE_COLUMNS_SQL},
      PRIMARY KEY (id),
      KEY idx_departments_code (code, isDeleted),
      KEY idx_departments_state (isDeleted, isActive, sortOrder)
    ) ${TABLE_OPTIONS}
  `);
}

async function createGrievances() {
  await execute(`
    CREATE TABLE IF NOT EXISTS grievances (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      ticketNo VARCHAR(40) NOT NULL,
      name VARCHAR(120) NOT NULL,
      mobile VARCHAR(15) NOT NULL,
      village VARCHAR(150) NULL,
      address VARCHAR(300) NOT NULL,
      description TEXT NOT NULL,
      photoPath VARCHAR(300) NULL,
      departmentId INT UNSIGNED NULL,
      status ENUM('new','forwarded','in_progress','resolved','rejected') NOT NULL DEFAULT 'new',
      adminNote TEXT NULL,
      source VARCHAR(20) NOT NULL DEFAULT 'website',
      language VARCHAR(5) NULL,
      ipAddress VARCHAR(45) NULL,
      lastForwardedAt DATETIME NULL,
      ${BASE_COLUMNS_SQL},
      PRIMARY KEY (id),
      UNIQUE KEY uq_grievances_ticket (ticketNo),
      KEY idx_grievances_state (isDeleted, status, createdAt),
      KEY idx_grievances_department (departmentId),
      KEY idx_grievances_mobile (mobile),
      CONSTRAINT fk_grievances_department FOREIGN KEY (departmentId) REFERENCES departments (id)
    ) ${TABLE_OPTIONS}
  `);
}

async function createGrievanceForwards() {
  await execute(`
    CREATE TABLE IF NOT EXISTS grievance_forwards (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      grievanceId INT UNSIGNED NOT NULL,
      departmentId INT UNSIGNED NOT NULL,
      toEmail VARCHAR(190) NOT NULL,
      ccEmails VARCHAR(500) NULL,
      subject VARCHAR(300) NOT NULL,
      message TEXT NULL,
      status ENUM('sent','failed') NOT NULL,
      errorMessage VARCHAR(500) NULL,
      ${BASE_COLUMNS_SQL},
      PRIMARY KEY (id),
      KEY idx_forwards_grievance (grievanceId, createdAt),
      CONSTRAINT fk_forwards_grievance FOREIGN KEY (grievanceId) REFERENCES grievances (id),
      CONSTRAINT fk_forwards_department FOREIGN KEY (departmentId) REFERENCES departments (id)
    ) ${TABLE_OPTIONS}
  `);
}

type CountRow = RowDataPacket & { total: number };

async function isEmpty(table: string): Promise<boolean> {
  const rows = await query<CountRow[]>(`SELECT COUNT(*) AS total FROM ${table}`);
  return Number(rows[0]?.total ?? 0) === 0;
}

async function seedAdmin() {
  if (!(await isEmpty("admin_users"))) return;

  if (!env.admin.email || !env.admin.password) {
    console.warn("[api] no admin user yet — set ADMIN_EMAIL and ADMIN_PASSWORD in .env and restart");
    return;
  }

  await execute(
    `INSERT INTO admin_users (name, email, passwordHash, role) VALUES (:name, :email, :passwordHash, 'admin')`,
    {
      name: env.admin.name,
      email: env.admin.email.toLowerCase(),
      passwordHash: await bcrypt.hash(env.admin.password, 12),
    },
  );
  console.log(`[api] seeded admin user ${env.admin.email}`);
}

const DEFAULT_DEPARTMENTS = [
  { code: "electricity", nameEn: "Electricity / Light (बिजली)", nameHi: "बिजली / लाइट" },
  { code: "roads", nameEn: "Road / Bridge (सड़क / पुल)", nameHi: "सड़क / पुल" },
  { code: "water", nameEn: "Drinking Water (पानी)", nameHi: "पीने का पानी" },
  { code: "land", nameEn: "Land / Anchal Office (जमीन / अंचल)", nameHi: "जमीन / अंचल कार्यालय" },
  { code: "health", nameEn: "Hospital / Health (अस्पताल)", nameHi: "अस्पताल / स्वास्थ्य" },
  { code: "ration", nameEn: "Ration Card / Ayushman (राशन / आयुष्मान)", nameHi: "राशन कार्ड / आयुष्मान" },
  { code: "security", nameEn: "Police / Safety (पुलिस)", nameHi: "पुलिस / सुरक्षा" },
  { code: "general", nameEn: "Other Problem (अन्य समस्या)", nameHi: "अन्य समस्या" },
];

async function seedDepartments() {
  if (!(await isEmpty("departments"))) return;

  for (const [index, dept] of DEFAULT_DEPARTMENTS.entries()) {
    await execute(
      `INSERT INTO departments (code, nameEn, nameHi, sortOrder) VALUES (:code, :nameEn, :nameHi, :sortOrder)`,
      { ...dept, sortOrder: (index + 1) * 10 },
    );
  }
  console.log(`[api] seeded ${DEFAULT_DEPARTMENTS.length} departments`);
}

async function seedNews() {
  if (!(await isEmpty("news"))) return;

  await execute(
    `INSERT INTO news (title, slug, summary, content, isPublished, publishedAt)
     VALUES (:title, :slug, :summary, :content, 1, NOW())`,
    {
      title: "Welcome to Pawanji News",
      slug: "welcome-to-pawanji-news",
      summary: "Example news item seeded for API testing.",
      content: "This is a sample news article created so you can test GET /api/news and Swagger.",
    },
  );
}
