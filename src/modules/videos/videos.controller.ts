import { NextFunction, Request, Response } from "express";
import { currentUser } from "../../middleware/auth";
import { uploadedFile } from "../../middleware/upload";
import { sendPaginated, sendSuccess } from "../../utils/api-response";
import * as videosService from "./videos.service";
import type { PublicVideoQuery, VideoListQuery } from "./videos.validation";

const idOf = (req: Request) => Number(req.params.id);

const filesOf = (req: Request): videosService.VideoFiles => ({
  video: uploadedFile(req, "video"),
  thumbnail: uploadedFile(req, "thumbnail"),
});

export const listPublic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videosService.listPublic(req.query as unknown as PublicVideoQuery);
    return sendSuccess(res, data, "Videos fetched");
  } catch (error) {
    return next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, meta } = await videosService.list(req.query as unknown as VideoListQuery);
    return sendPaginated(res, items, meta, "Videos fetched");
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videosService.getById(idOf(req));
    return sendSuccess(res, data, "Video fetched");
  } catch (error) {
    return next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videosService.create(req.body, filesOf(req), currentUser(req).id);
    return sendSuccess(res, data, "Video added", 201);
  } catch (error) {
    return next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videosService.update(idOf(req), req.body, filesOf(req), currentUser(req).id);
    return sendSuccess(res, data, "Video updated");
  } catch (error) {
    return next(error);
  }
};

export const setActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videosService.setActive(idOf(req), req.body.isActive, currentUser(req).id);
    return sendSuccess(res, data, data.isActive ? "Video activated" : "Video deactivated");
  } catch (error) {
    return next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await videosService.remove(idOf(req), req.body.deletedRemarks, currentUser(req).id);
    return sendSuccess(res, null, "Video deleted");
  } catch (error) {
    return next(error);
  }
};

export const restore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await videosService.restore(idOf(req), currentUser(req).id);
    return sendSuccess(res, data, "Video restored");
  } catch (error) {
    return next(error);
  }
};
