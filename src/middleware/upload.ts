import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function imageUpload(folder: string) {
  const destination = path.join(env.upload.dir, folder);
  fs.mkdirSync(destination, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination,
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
      },
    }),
    limits: { fileSize: env.upload.maxFileSizeMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
      return cb(new AppError("Only JPG, PNG, WEBP or HEIC photos are allowed", 422));
    },
  });
}

export const grievancePhotoUpload = imageUpload("grievances").single("photo");

/** Path stored in DB, relative to the uploads folder (e.g. `grievances/123.jpg`). */
export function storedUploadPath(file?: Express.Multer.File): string | null {
  if (!file) return null;
  return path.relative(env.upload.dir, file.path).split(path.sep).join("/");
}

export function publicUploadUrl(storedPath: string | null): string | null {
  return storedPath ? `${env.publicApiUrl}/uploads/${storedPath}` : null;
}

export function absoluteUploadPath(storedPath: string): string {
  return path.join(env.upload.dir, storedPath);
}
