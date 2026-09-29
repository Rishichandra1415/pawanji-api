import type { RowDataPacket } from "mysql2";

/**
 * news table shape (MySQL columns)
 */
export type News = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  cover_image: string | null;
  is_published: number;
  published_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};
