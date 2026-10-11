import type { RowDataPacket } from "mysql2";
import type { BaseEntity } from "../../utils/base-entity";

/**
 * news table shape (MySQL columns)
 */
export type News = RowDataPacket &
  BaseEntity & {
    title: string;
    slug: string;
    summary: string | null;
    content: string;
    coverImage: string | null;
    isPublished: number;
    publishedAt: Date | string | null;
  };
