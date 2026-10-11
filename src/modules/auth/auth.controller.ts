import { NextFunction, Request, Response } from "express";
import { currentUser } from "../../middleware/auth";
import { sendSuccess } from "../../utils/api-response";
import * as authService from "./auth.service";

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await authService.login(req.body.email, req.body.password);
    return sendSuccess(res, data, "Logged in");
  } catch (error) {
    return next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await authService.me(currentUser(req).id);
    return sendSuccess(res, data, "Profile fetched");
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.changePassword(currentUser(req).id, req.body.currentPassword, req.body.newPassword);
    return sendSuccess(res, null, "Password changed");
  } catch (error) {
    return next(error);
  }
};
