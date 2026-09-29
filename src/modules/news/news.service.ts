import { execute, query } from "../../config/database";
import { AppError } from "../../utils/app-error";
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
    ? `SELECT * FROM news WHERE is_published = 1 ORDER BY published_at DESC, id DESC`
    : `SELECT * FROM news ORDER BY id DESC`;

  return query<News[]>(sql);
};

export const getById = async (id: number): Promise<News> => {
  const rows = await query<News[]>("SELECT * FROM news WHERE id = :id LIMIT 1", {
    id,
  });

  if (!rows[0]) {
    throw new AppError("News item not found", 404);
  }

  return rows[0];
};

export const getBySlug = async (slug: string): Promise<News> => {
  const rows = await query<News[]>(
    "SELECT * FROM news WHERE slug = :slug LIMIT 1",
    { slug },
  );

  if (!rows[0]) {
    throw new AppError("News item not found", 404);
  }

  return rows[0];
};

export const create = async (data: CreateNewsInput): Promise<News> => {
  const existing = await query<News[]>(
    "SELECT id FROM news WHERE slug = :slug LIMIT 1",
    { slug: data.slug },
  );

  if (existing[0]) {
    throw new AppError("Slug already exists", 409);
  }

  const isPublished = Boolean(data.isPublished);
  const result = await execute(
    `INSERT INTO news
      (title, slug, summary, content, cover_image, is_published, published_at)
     VALUES
      (:title, :slug, :summary, :content, :cover_image, :is_published, :published_at)`,
    {
      title: data.title,
      slug: data.slug,
      summary: data.summary ?? null,
      content: data.content,
      cover_image: data.coverImage ?? null,
      is_published: isPublished ? 1 : 0,
      published_at: isPublished ? new Date() : null,
    },
  );

  return getById(Number(result.insertId));
};
