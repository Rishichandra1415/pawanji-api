import type { RowDataPacket } from "mysql2";
import { execute, query } from "../../config/database";
import { AppError } from "../../utils/app-error";
import {
  AUDIT_JOINS_SQL,
  AUDIT_SELECT_SQL,
  restore as restoreRow,
  setActive as setActiveRow,
  softDelete,
  stateFilters,
  withBooleans,
  type WithBooleanFlags,
} from "../../utils/base-entity";
import { buildMeta, toLimitOffset, type ListQuery, type Paginated } from "../../utils/pagination";
import type { PublicVideoCategory, VideoCategory } from "./video-categories.model";
import type { VideoCategoryPayload } from "./video-categories.validation";

const TABLE = "video_categories";

/** Live (non-deleted) videos per category. */
const VIDEO_COUNT_SQL = `(SELECT COUNT(*) FROM videos v WHERE v.categoryId = t.id AND v.isDeleted = 0) AS videoCount`;

export type VideoCategoryDto = WithBooleanFlags<VideoCategory>;

const toDto = (row: VideoCategory): VideoCategoryDto => ({
  ...withBooleans(row),
  videoCount: Number(row.videoCount ?? 0),
});

export const listPublic = async (): Promise<PublicVideoCategory[]> =>
  query<PublicVideoCategory[]>(
    `SELECT id, nameEn, nameHi FROM video_categories
      WHERE isDeleted = 0 AND isActive = 1
      ORDER BY sortOrder ASC, id ASC`,
  );

export const list = async (q: ListQuery): Promise<Paginated<VideoCategoryDto>> => {
  const where = stateFilters(q.active, q.deleted);
  const params: Record<string, string> = {};

  if (q.search) {
    where.push("(t.nameEn LIKE :search OR t.nameHi LIKE :search)");
    params.search = `%${q.search}%`;
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { limit, offset } = toLimitOffset(q.page, q.limit);

  const [rows, countRows] = await Promise.all([
    query<VideoCategory[]>(
      `SELECT t.*, ${VIDEO_COUNT_SQL}, ${AUDIT_SELECT_SQL}
         FROM video_categories t ${AUDIT_JOINS_SQL}
         ${whereSql}
        ORDER BY t.sortOrder ASC, t.id ASC
        LIMIT ${limit} OFFSET ${offset}`,
      params,
    ),
    query<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) AS total FROM video_categories t ${whereSql}`, params),
  ]);

  return { items: rows.map(toDto), meta: buildMeta(q.page, q.limit, Number(countRows[0]?.total ?? 0)) };
};

async function findById(id: number): Promise<VideoCategory> {
  const rows = await query<VideoCategory[]>(
    `SELECT t.*, ${VIDEO_COUNT_SQL}, ${AUDIT_SELECT_SQL}
       FROM video_categories t ${AUDIT_JOINS_SQL}
      WHERE t.id = :id LIMIT 1`,
    { id },
  );
  if (!rows[0]) throw new AppError("Video category not found", 404);
  return rows[0];
}

export const getById = async (id: number): Promise<VideoCategoryDto> => toDto(await findById(id));

/** Active, non-deleted category for saving a video; throws a clear error otherwise. */
/** `keepCurrent` lets an existing video keep a category that was deactivated later. */
export const getAssignable = async (id: number, keepCurrent = false): Promise<VideoCategory> => {
  const rows = await query<VideoCategory[]>(
    "SELECT * FROM video_categories WHERE id = :id AND isDeleted = 0 LIMIT 1",
    { id },
  );
  const category = rows[0];
  if (!category) throw new AppError("Selected category does not exist", 422, { fieldErrors: { categoryId: ["Choose a valid category"] } });
  if (!category.isActive && !keepCurrent) throw new AppError("Selected category is inactive", 422, { fieldErrors: { categoryId: ["This category is inactive"] } });
  return category;
};

async function assertNameAvailable(nameEn: string, ignoreId?: number) {
  const rows = await query<(RowDataPacket & { id: number })[]>(
    "SELECT id FROM video_categories WHERE nameEn = :nameEn AND isDeleted = 0 AND id <> :ignoreId LIMIT 1",
    { nameEn, ignoreId: ignoreId ?? 0 },
  );
  if (rows[0]) throw new AppError(`Category "${nameEn}" already exists`, 409);
}

const columnsFrom = (data: VideoCategoryPayload) => ({
  nameEn: data.nameEn,
  nameHi: data.nameHi,
  description: data.description,
  sortOrder: data.sortOrder,
  isActive: data.isActive ? 1 : 0,
});

export const create = async (data: VideoCategoryPayload, userId: number): Promise<VideoCategoryDto> => {
  await assertNameAvailable(data.nameEn);

  const result = await execute(
    `INSERT INTO video_categories (nameEn, nameHi, description, sortOrder, isActive, createdBy)
     VALUES (:nameEn, :nameHi, :description, :sortOrder, :isActive, :userId)`,
    { ...columnsFrom(data), userId },
  );

  return getById(Number(result.insertId));
};

export const update = async (id: number, data: VideoCategoryPayload, userId: number): Promise<VideoCategoryDto> => {
  const existing = await findById(id);
  if (existing.isDeleted) throw new AppError("Deleted records cannot be edited. Restore it first.", 409);
  await assertNameAvailable(data.nameEn, id);

  await execute(
    `UPDATE video_categories
        SET nameEn = :nameEn, nameHi = :nameHi, description = :description, sortOrder = :sortOrder,
            isActive = :isActive, updatedBy = :userId
      WHERE id = :id`,
    { ...columnsFrom(data), id, userId },
  );

  // videos keep a copy of the name for simple reads, so keep it in sync on rename.
  if (existing.nameEn !== data.nameEn) {
    await execute("UPDATE videos SET categoryName = :nameEn WHERE categoryId = :id", { nameEn: data.nameEn, id });
  }

  return getById(id);
};

export const setActive = async (id: number, isActive: boolean, userId: number) => {
  await setActiveRow(TABLE, id, isActive, userId);
  return getById(id);
};

export const remove = async (id: number, remarks: string, userId: number) => {
  const category = await findById(id);
  const inUse = Number(category.videoCount ?? 0);
  if (inUse > 0) {
    throw new AppError(
      `This category has ${inUse} video${inUse > 1 ? "s" : ""}. Move them to another category first.`,
      409,
    );
  }
  await softDelete(TABLE, id, userId, remarks);
};

export const restore = async (id: number, userId: number) => {
  const category = await findById(id);
  if (category.isDeleted) await assertNameAvailable(category.nameEn, id);
  await restoreRow(TABLE, id, userId);
  return getById(id);
};
