import { NextFunction, Request, Response } from "express";
import { currentUser } from "../../middleware/auth";
import { sendPaginated, sendSuccess } from "../../utils/api-response";
import type { ListQuery } from "../../utils/pagination";
import * as departmentsService from "./departments.service";

const idOf = (req: Request) => Number(req.params.id);

export const listPublic = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await departmentsService.listPublic();
    return sendSuccess(res, data, "Departments fetched");
  } catch (error) {
    return next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, meta } = await departmentsService.list(req.query as unknown as ListQuery);
    return sendPaginated(res, items, meta, "Departments fetched");
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await departmentsService.getById(idOf(req));
    return sendSuccess(res, data, "Department fetched");
  } catch (error) {
    return next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await departmentsService.create(req.body, currentUser(req).id);
    return sendSuccess(res, data, "Department created", 201);
  } catch (error) {
    return next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await departmentsService.update(idOf(req), req.body, currentUser(req).id);
    return sendSuccess(res, data, "Department updated");
  } catch (error) {
    return next(error);
  }
};

export const setActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await departmentsService.setActive(idOf(req), req.body.isActive, currentUser(req).id);
    return sendSuccess(res, data, data.isActive ? "Department activated" : "Department deactivated");
  } catch (error) {
    return next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await departmentsService.remove(idOf(req), req.body.deletedRemarks, currentUser(req).id);
    return sendSuccess(res, null, "Department deleted");
  } catch (error) {
    return next(error);
  }
};

export const restore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await departmentsService.restore(idOf(req), currentUser(req).id);
    return sendSuccess(res, data, "Department restored");
  } catch (error) {
    return next(error);
  }
};
