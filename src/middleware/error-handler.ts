import fs from "fs";
import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { AppError } from "../utils/app-error";
import { sendError } from "../utils/api-response";
import { env } from "../config/env";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError("Route not found", 404));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // A failed request must not leave an orphan upload behind.
  if (req.file?.path) fs.unlink(req.file.path, () => undefined);

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `Photo must be smaller than ${env.upload.maxFileSizeMb} MB`
        : "Photo upload failed";
    return sendError(res, message, 422);
  }

  console.error("[api:error]", err);

  const message =
    env.nodeEnv === "production"
      ? "Internal server error"
      : err instanceof Error
        ? err.message
        : "Internal server error";

  return sendError(res, message, 500);
}
