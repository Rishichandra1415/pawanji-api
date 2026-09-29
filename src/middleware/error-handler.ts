import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";
import { sendError } from "../utils/api-response";
import { env } from "../config/env";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError("Route not found", 404));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errors);
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
