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

const ATTACHMENT_MIME = new Set([...ALLOWED_MIME, "application/pdf"]);

/** Website meeting form: optional `attachment` (photo or PDF letter). */
export const meetingAttachmentUpload = (() => {
  const destination = path.join(env.upload.dir, "meetings");
  fs.mkdirSync(destination, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination,
      filename: (_req, file, cb) => {
        const fallback = file.mimetype === "application/pdf" ? ".pdf" : ".jpg";
        const ext = path.extname(file.originalname).toLowerCase() || fallback;
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
      },
    }),
    limits: { fileSize: env.upload.maxFileSizeMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (ATTACHMENT_MIME.has(file.mimetype)) return cb(null, true);
      return cb(new AppError("Only JPG, PNG, WEBP or PDF files are allowed", 422));
    },
  }).single("attachment");
})();

const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

/** Admin video form: optional `video` file + optional `thumbnail` image in one multipart request. */
export const videoMediaUpload = (() => {
  const folders = { video: "videos", thumbnail: "videos/thumbnails" } as const;
  for (const folder of Object.values(folders)) fs.mkdirSync(path.join(env.upload.dir, folder), { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: (_req, file, cb) =>
        cb(null, path.join(env.upload.dir, folders[file.fieldname as keyof typeof folders] ?? "videos")),
      filename: (_req, file, cb) => {
        const fallback = file.fieldname === "video" ? ".mp4" : ".jpg";
        const ext = path.extname(file.originalname).toLowerCase() || fallback;
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
      },
    }),
    limits: { fileSize: env.upload.maxVideoSizeMb * 1024 * 1024, files: 2 },
    fileFilter: (_req, file, cb) => {
      if (file.fieldname === "video" && VIDEO_MIME.has(file.mimetype)) return cb(null, true);
      if (file.fieldname === "thumbnail" && ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
      return cb(
        new AppError(
          file.fieldname === "video" ? "Only MP4, WEBM or MOV videos are allowed" : "Thumbnail must be a JPG, PNG or WEBP image",
          422,
        ),
      );
    },
  }).fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]);
})();

/** Uploaded files of a multi-field request, keyed by field name. */
export function uploadedFile(req: Express.Request, field: string): Express.Multer.File | undefined {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return files?.[field]?.[0];
}

export function removeUpload(storedPath: string | null | undefined) {
  if (storedPath) fs.unlink(absoluteUploadPath(storedPath), () => undefined);
}

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
