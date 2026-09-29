import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/app-error";

type RequestPart = "body" | "params" | "query";

export function validate(schema: ZodSchema, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[part]);

    if (!parsed.success) {
      return next(
        new AppError("Validation failed", 422, parsed.error.flatten()),
      );
    }

    req[part] = parsed.data;
    return next();
  };
}
