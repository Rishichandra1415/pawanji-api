import { NextFunction, Request, Response } from "express";
import { currentUser } from "../../middleware/auth";
import { storedUploadPath } from "../../middleware/upload";
import { sendPaginated, sendSuccess } from "../../utils/api-response";
import * as grievancesService from "./grievances.service";
import type { GrievanceListQuery } from "./grievances.validation";

const idOf = (req: Request) => Number(req.params.id);

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await grievancesService.create(req.body, {
      photoPath: storedUploadPath(req.file),
      ipAddress: req.ip ?? null,
    });
    return sendSuccess(res, data, "Your problem has been registered", 201);
  } catch (error) {
    return next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, meta } = await grievancesService.list(req.query as unknown as GrievanceListQuery);
    return sendPaginated(res, items, meta, "Grievances fetched");
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await grievancesService.getById(idOf(req));
    return sendSuccess(res, data, "Grievance fetched");
  } catch (error) {
    return next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await grievancesService.update(idOf(req), req.body, currentUser(req).id);
    return sendSuccess(res, data, "Grievance updated");
  } catch (error) {
    return next(error);
  }
};

export const forwardPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await grievancesService.forwardPreview(idOf(req), Number(req.query.departmentId));
    return sendSuccess(res, data, "Email preview");
  } catch (error) {
    return next(error);
  }
};

export const forward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await grievancesService.forward(idOf(req), req.body, currentUser(req).id);
    return sendSuccess(res, data, "Grievance forwarded to department");
  } catch (error) {
    return next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await grievancesService.remove(idOf(req), req.body.deletedRemarks, currentUser(req).id);
    return sendSuccess(res, null, "Grievance deleted");
  } catch (error) {
    return next(error);
  }
};

export const restore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await grievancesService.restore(idOf(req), currentUser(req).id);
    return sendSuccess(res, data, "Grievance restored");
  } catch (error) {
    return next(error);
  }
};
