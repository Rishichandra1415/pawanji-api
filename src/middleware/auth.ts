import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "staff";
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.jwt.secret, { expiresIn: env.jwt.expiresIn as jwt.SignOptions["expiresIn"] });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) return next(new AppError("Please log in to continue", 401));

  try {
    const payload = jwt.verify(token, env.jwt.secret) as AuthUser & jwt.JwtPayload;
    req.user = { id: payload.id, name: payload.name, email: payload.email, role: payload.role };
    return next();
  } catch {
    return next(new AppError("Session expired, please log in again", 401));
  }
}

/** Returns the logged-in admin; only call after `requireAuth`. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new AppError("Please log in to continue", 401);
  return req.user;
}
