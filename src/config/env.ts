import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const nodeEnv = process.env.NODE_ENV ?? "development";
const port = Number(process.env.PORT ?? 4000);
const apiPrefix = process.env.API_PREFIX ?? "/api";

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port,
  apiPrefix,
  publicApiUrl: (process.env.PUBLIC_API_URL ?? `http://localhost:${port}${apiPrefix}`).replace(/\/$/, ""),
  corsOrigins: list(process.env.CORS_ORIGINS),
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "pawanji",
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? (nodeEnv === "production" ? "" : "dev-only-change-me"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
  admin: {
    name: process.env.ADMIN_NAME ?? "Super Admin",
    email: process.env.ADMIN_EMAIL ?? "",
    password: process.env.ADMIN_PASSWORD ?? "",
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? "",
  },
  upload: {
    dir: path.resolve(__dirname, "../../", process.env.UPLOAD_DIR ?? "uploads"),
    maxFileSizeMb: Number(process.env.UPLOAD_MAX_MB ?? 5),
    maxVideoSizeMb: Number(process.env.UPLOAD_VIDEO_MAX_MB ?? 100),
  },
};

if (env.isProduction && !env.jwt.secret) {
  throw new Error("Missing required env var: JWT_SECRET");
}

export { required };
