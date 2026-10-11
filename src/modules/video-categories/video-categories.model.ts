import type { RowDataPacket } from "mysql2";
import type { BaseEntity } from "../../utils/base-entity";

/** video_categories master (referenced by videos.categoryId without a FK) */
export type VideoCategory = RowDataPacket &
  BaseEntity & {
    nameEn: string;
    nameHi: string;
    description: string | null;
    sortOrder: number;
    videoCount?: number;
    createdByName?: string | null;
    updatedByName?: string | null;
    deletedByName?: string | null;
  };

export type PublicVideoCategory = RowDataPacket & {
  id: number;
  nameEn: string;
  nameHi: string;
};
