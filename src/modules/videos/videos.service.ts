import type { RowDataPacket } from "mysql2";
import { env } from "../../config/env";
import { execute, query } from "../../config/database";
import { publicUploadUrl, removeUpload, storedUploadPath } from "../../middleware/upload";
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
import { buildMeta, toLimitOffset, type Paginated } from "../../utils/pagination";
import { getAssignable } from "../video-categories/video-categories.service";
import type { PublicVideo, Video, VideoMedia } from "./videos.model";
import { parseYoutubeId, type PublicVideoQuery, type VideoListQuery, type VideoPayload } from "./videos.validation";

const TABLE = "videos";

/** Re-selected after `t.*` so DATE columns reach the client as plain `YYYY-MM-DD`. */
const DATE_SELECT_SQL = "DATE_FORMAT(t.recordedOn, '%Y-%m-%d') AS recordedOn";

export type VideoDto = Omit<WithBooleanFlags<Video>, "showOnHome"> & VideoMedia & { showOnHome: boolean };

export type VideoFiles = {
  video?: Express.Multer.File;
  thumbnail?: Express.Multer.File;
};

function mediaOf(row: Video): VideoMedia {
  const youtubeThumb = row.youtubeId ? `https://i.ytimg.com/vi/${row.youtubeId}/hqdefault.jpg` : null;
  return {
    playbackUrl:
      row.sourceType === "upload" ? publicUploadUrl(row.videoPath) : row.sourceType === "url" ? row.videoUrl : null,
    embedUrl: row.youtubeId ? `https://www.youtube-nocookie.com/embed/${row.youtubeId}` : null,
    watchUrl: row.youtubeId ? `https://www.youtube.com/watch?v=${row.youtubeId}` : null,
    thumbnailUrl: publicUploadUrl(row.thumbnailPath) ?? youtubeThumb,
  };
}

const toDto = (row: Video): VideoDto => ({
  ...withBooleans(row),
  showOnHome: Boolean(row.showOnHome),
  ...mediaOf(row),
});

const toPublic = (row: Video): PublicVideo => ({
  id: row.id,
  titleEn: row.titleEn,
  titleHi: row.titleHi,
  descriptionEn: row.descriptionEn,
  descriptionHi: row.descriptionHi,
  categoryId: row.categoryId,
  categoryName: row.categoryName,
  categoryNameHi: row.categoryNameHi ?? null,
  sourceType: row.sourceType,
  location: row.location,
  recordedOn: row.recordedOn,
  ...mediaOf(row),
});

export const listPublic = async (q: PublicVideoQuery): Promise<PublicVideo[]> => {
  const where = ["t.isDeleted = 0", "t.isActive = 1"];
  const params: Record<string, string> = {};

  if (q.home === "true") where.push("t.showOnHome = 1");
  if (q.categoryId) {
    where.push("t.categoryId = :categoryId");
    params.categoryId = String(q.categoryId);
  }

  const rows = await query<Video[]>(
    `SELECT t.*, ${DATE_SELECT_SQL}, vc.nameHi AS categoryNameHi
       FROM videos t
       LEFT JOIN video_categories vc ON vc.id = t.categoryId
      WHERE ${where.join(" AND ")}
      ORDER BY t.sortOrder ASC, t.recordedOn DESC, t.id DESC
      LIMIT ${q.limit}`,
    params,
  );
  return rows.map(toPublic);
};

export const list = async (q: VideoListQuery): Promise<Paginated<VideoDto>> => {
  const where = stateFilters(q.active, q.deleted);
  const params: Record<string, string> = {};

  if (q.search) {
    where.push("(t.titleEn LIKE :search OR t.titleHi LIKE :search OR t.location LIKE :search)");
    params.search = `%${q.search}%`;
  }
  if (q.categoryId) {
    where.push("t.categoryId = :categoryId");
    params.categoryId = String(q.categoryId);
  }
  if (q.sourceType) {
    where.push("t.sourceType = :sourceType");
    params.sourceType = q.sourceType;
  }
  if (q.showOnHome) where.push(q.showOnHome === "true" ? "t.showOnHome = 1" : "t.showOnHome = 0");

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { limit, offset } = toLimitOffset(q.page, q.limit);

  const [rows, countRows] = await Promise.all([
    query<Video[]>(
      `SELECT t.*, ${DATE_SELECT_SQL}, ${AUDIT_SELECT_SQL}
         FROM videos t ${AUDIT_JOINS_SQL}
         ${whereSql}
        ORDER BY t.sortOrder ASC, t.recordedOn DESC, t.id DESC
        LIMIT ${limit} OFFSET ${offset}`,
      params,
    ),
    query<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) AS total FROM videos t ${whereSql}`, params),
  ]);

  return { items: rows.map(toDto), meta: buildMeta(q.page, q.limit, Number(countRows[0]?.total ?? 0)) };
};

async function findById(id: number): Promise<Video> {
  const rows = await query<Video[]>(
    `SELECT t.*, ${DATE_SELECT_SQL}, ${AUDIT_SELECT_SQL} FROM videos t ${AUDIT_JOINS_SQL} WHERE t.id = :id LIMIT 1`,
    { id },
  );
  if (!rows[0]) throw new AppError("Video not found", 404);
  return rows[0];
}

export const getById = async (id: number): Promise<VideoDto> => toDto(await findById(id));

function assertThumbnailSize(file?: Express.Multer.File) {
  if (file && file.size > env.upload.maxFileSizeMb * 1024 * 1024) {
    throw new AppError(`Thumbnail must be smaller than ${env.upload.maxFileSizeMb} MB`, 422);
  }
}

const columnsFrom = (data: VideoPayload, categoryName: string) => ({
  titleEn: data.titleEn,
  titleHi: data.titleHi,
  descriptionEn: data.descriptionEn,
  descriptionHi: data.descriptionHi,
  categoryId: data.categoryId,
  categoryName,
  sourceType: data.sourceType,
  youtubeId: data.sourceType === "youtube" && data.youtubeUrl ? parseYoutubeId(data.youtubeUrl) : null,
  videoUrl: data.sourceType === "url" ? data.videoUrl : null,
  location: data.location,
  recordedOn: data.recordedOn,
  showOnHome: data.showOnHome ? 1 : 0,
  sortOrder: data.sortOrder,
  isActive: data.isActive ? 1 : 0,
});

export const create = async (data: VideoPayload, files: VideoFiles, userId: number): Promise<VideoDto> => {
  assertThumbnailSize(files.thumbnail);
  const category = await getAssignable(data.categoryId);
  if (data.sourceType === "upload" && !files.video) throw new AppError("Please choose a video file to upload", 422);

  const result = await execute(
    `INSERT INTO videos
       (titleEn, titleHi, descriptionEn, descriptionHi, categoryId, categoryName, sourceType, youtubeId, videoUrl, videoPath,
        thumbnailPath, location, recordedOn, showOnHome, sortOrder, isActive, createdBy)
     VALUES
       (:titleEn, :titleHi, :descriptionEn, :descriptionHi, :categoryId, :categoryName, :sourceType, :youtubeId, :videoUrl, :videoPath,
        :thumbnailPath, :location, :recordedOn, :showOnHome, :sortOrder, :isActive, :userId)`,
    {
      ...columnsFrom(data, category.nameEn),
      videoPath: data.sourceType === "upload" ? storedUploadPath(files.video) : null,
      thumbnailPath: storedUploadPath(files.thumbnail),
      userId,
    },
  );

  // A non-upload source never keeps an uploaded video file.
  if (data.sourceType !== "upload" && files.video) removeUpload(storedUploadPath(files.video));

  return getById(Number(result.insertId));
};

export const update = async (
  id: number,
  data: VideoPayload,
  files: VideoFiles,
  userId: number,
): Promise<VideoDto> => {
  const existing = await findById(id);
  if (existing.isDeleted) throw new AppError("Deleted records cannot be edited. Restore it first.", 409);
  assertThumbnailSize(files.thumbnail);
  const category = await getAssignable(data.categoryId, existing.categoryId === data.categoryId);

  const newVideoPath = storedUploadPath(files.video);
  const videoPath = data.sourceType === "upload" ? (newVideoPath ?? existing.videoPath) : null;
  if (data.sourceType === "upload" && !videoPath) throw new AppError("Please choose a video file to upload", 422);

  const newThumbPath = storedUploadPath(files.thumbnail);
  const thumbnailPath = newThumbPath ?? (data.removeThumbnail ? null : existing.thumbnailPath);

  await execute(
    `UPDATE videos
        SET titleEn = :titleEn, titleHi = :titleHi, descriptionEn = :descriptionEn, descriptionHi = :descriptionHi,
            categoryId = :categoryId, categoryName = :categoryName, sourceType = :sourceType, youtubeId = :youtubeId, videoUrl = :videoUrl,
            videoPath = :videoPath, thumbnailPath = :thumbnailPath, location = :location, recordedOn = :recordedOn,
            showOnHome = :showOnHome, sortOrder = :sortOrder, isActive = :isActive, updatedBy = :userId
      WHERE id = :id`,
    { ...columnsFrom(data, category.nameEn), videoPath, thumbnailPath, id, userId },
  );

  if (existing.videoPath && existing.videoPath !== videoPath) removeUpload(existing.videoPath);
  if (existing.thumbnailPath && existing.thumbnailPath !== thumbnailPath) removeUpload(existing.thumbnailPath);
  if (newVideoPath && newVideoPath !== videoPath) removeUpload(newVideoPath);

  return getById(id);
};

export const setActive = async (id: number, isActive: boolean, userId: number) => {
  await setActiveRow(TABLE, id, isActive, userId);
  return getById(id);
};

export const remove = async (id: number, remarks: string, userId: number) => {
  await softDelete(TABLE, id, userId, remarks);
};

export const restore = async (id: number, userId: number) => {
  await restoreRow(TABLE, id, userId);
  return getById(id);
};
