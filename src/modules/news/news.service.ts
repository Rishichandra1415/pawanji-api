import type { RowDataPacket } from "mysql2";
import { execute, query } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { restore as restoreRow, softDelete } from "../../utils/base-entity";
import type { News } from "./news.model";

type CreateNewsInput = {
  title: string;
  slug: string;
  summary?: string;
  content: string;
  coverImage?: string;
  isPublished?: boolean;
};

export const list = async (onlyPublished = false): Promise<News[]> => {
  const sql = onlyPublished
    ? `SELECT * FROM news WHERE isDeleted = 0 AND isActive = 1 AND isPublished = 1 ORDER BY publishedAt DESC, id DESC`
    : `SELECT * FROM news WHERE isDeleted = 0 ORDER BY id DESC`;

  return query<News[]>(sql);
};

export const getById = async (id: number): Promise<News> => {
  const rows = await query<News[]>("SELECT * FROM news WHERE id = :id AND isDeleted = 0 LIMIT 1", {
    id,
  });

  if (!rows[0]) {
    throw new AppError("News item not found", 404);
  }

  return rows[0];
};

export const getBySlug = async (slug: string): Promise<News> => {
  const rows = await query<News[]>(
    "SELECT * FROM news WHERE slug = :slug AND isDeleted = 0 LIMIT 1",
    { slug },
  );

  if (!rows[0]) {
    throw new AppError("News item not found", 404);
  }

  return rows[0];
};

export const create = async (data: CreateNewsInput, userId: number | null = null): Promise<News> => {
  const existing = await query<(RowDataPacket & { id: number })[]>(
    "SELECT id FROM news WHERE slug = :slug AND isDeleted = 0 LIMIT 1",
    { slug: data.slug },
  );

  if (existing[0]) {
    throw new AppError("Slug already exists", 409);
  }

  const isPublished = Boolean(data.isPublished);
  const result = await execute(
    `INSERT INTO news
      (title, slug, summary, content, coverImage, isPublished, publishedAt, createdBy)
     VALUES
      (:title, :slug, :summary, :content, :coverImage, :isPublished, :publishedAt, :createdBy)`,
    {
      title: data.title,
      slug: data.slug,
      summary: data.summary ?? null,
      content: data.content,
      coverImage: data.coverImage ?? null,
      isPublished: isPublished ? 1 : 0,
      publishedAt: isPublished ? new Date() : null,
      createdBy: userId,
    },
  );

  return getById(Number(result.insertId));
};

export const remove = async (id: number, remarks: string, userId: number) => {
  await softDelete("news", id, userId, remarks);
};

export const restore = async (id: number, userId: number) => {
  await restoreRow("news", id, userId);
  return getById(id);
};
