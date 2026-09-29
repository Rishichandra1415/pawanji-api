import { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response";
import * as newsService from "./news.service";

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const onlyPublished = req.query.published === "true";
    const data = await newsService.list(onlyPublished);
    return sendSuccess(res, data, "News list fetched");
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const data = await newsService.getById(id);
    return sendSuccess(res, data, "News item fetched");
  } catch (error) {
    return next(error);
  }
};

export const getBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await newsService.getBySlug(String(req.params.slug));
    return sendSuccess(res, data, "News item fetched");
  } catch (error) {
    return next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await newsService.create(req.body);
    return sendSuccess(res, data, "News item created", 201);
  } catch (error) {
    return next(error);
  }
};
