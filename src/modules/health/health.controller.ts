import { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response";
import * as healthService from "./health.service";

export const check = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, ok } = await healthService.getStatus();
    return sendSuccess(res, data, "API is healthy", ok ? 200 : 503);
  } catch (error) {
    return next(error);
  }
};
