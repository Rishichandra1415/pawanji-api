import { NextFunction, Request, Response } from "express";
import { currentUser } from "../../middleware/auth";
import { sendPaginated, sendSuccess } from "../../utils/api-response";
import type { ListQuery } from "../../utils/pagination";
import * as videoCategoriesService from "./video-categories.service";

const idOf = (req: Request) => Number(req.params.id);

export const listPublic = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videoCategoriesService.listPublic();
    return sendSuccess(res, data, "Video categories fetched");
  } catch (error) {
    return next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, meta } = await videoCategoriesService.list(req.query as unknown as ListQuery);
    return sendPaginated(res, items, meta, "Video categories fetched");
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videoCategoriesService.getById(idOf(req));
    return sendSuccess(res, data, "Video category fetched");
  } catch (error) {
    return next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videoCategoriesService.create(req.body, currentUser(req).id);
    return sendSuccess(res, data, "Video category created", 201);
  } catch (error) {
    return next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videoCategoriesService.update(idOf(req), req.body, currentUser(req).id);
    return sendSuccess(res, data, "Video category updated");
  } catch (error) {
    return next(error);
  }
};

export const setActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videoCategoriesService.setActive(idOf(req), req.body.isActive, currentUser(req).id);
    return sendSuccess(res, data, data.isActive ? "Video category activated" : "Video category deactivated");
  } catch (error) {
    return next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await videoCategoriesService.remove(idOf(req), req.body.deletedRemarks, currentUser(req).id);
    return sendSuccess(res, null, "Video category deleted");
  } catch (error) {
    return next(error);
  }
};

export const restore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videoCategoriesService.restore(idOf(req), currentUser(req).id);
    return sendSuccess(res, data, "Video category restored");
  } catch (error) {
    return next(error);
  }
};
