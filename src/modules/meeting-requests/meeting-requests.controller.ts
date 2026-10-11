import { NextFunction, Request, Response } from "express";
import { currentUser } from "../../middleware/auth";
import { storedUploadPath } from "../../middleware/upload";
import { sendPaginated, sendSuccess } from "../../utils/api-response";
import * as meetingRequestsService from "./meeting-requests.service";
import type { MeetingRequestListQuery } from "./meeting-requests.validation";

const idOf = (req: Request) => Number(req.params.id);

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await meetingRequestsService.create(req.body, {
      file: req.file,
      attachmentPath: storedUploadPath(req.file),
      ipAddress: req.ip ?? null,
    });
    return sendSuccess(res, data, "Your meeting request has been received", 201);
  } catch (error) {
    return next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, meta } = await meetingRequestsService.list(req.query as unknown as MeetingRequestListQuery);
    return sendPaginated(res, items, meta, "Meeting requests fetched");
  } catch (error) {
    return next(error);
  }
};

export const summary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await meetingRequestsService.statusCounts();
    return sendSuccess(res, data, "Meeting request summary");
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await meetingRequestsService.getById(idOf(req));
    return sendSuccess(res, data, "Meeting request fetched");
  } catch (error) {
    return next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await meetingRequestsService.update(idOf(req), req.body, currentUser(req).id);
    return sendSuccess(res, data, "Meeting request updated");
  } catch (error) {
    return next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await meetingRequestsService.remove(idOf(req), req.body.deletedRemarks, currentUser(req).id);
    return sendSuccess(res, null, "Meeting request deleted");
  } catch (error) {
    return next(error);
  }
};

export const restore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await meetingRequestsService.restore(idOf(req), currentUser(req).id);
    return sendSuccess(res, data, "Meeting request restored");
  } catch (error) {
    return next(error);
  }
};
