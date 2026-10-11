import type { RowDataPacket } from "mysql2";
import type { BaseEntity } from "../../utils/base-entity";

export const VIDEO_SOURCES = ["youtube", "url", "upload"] as const;
export type VideoSource = (typeof VIDEO_SOURCES)[number];

/** videos table shape (dynamic video gallery shown on the website) */
export type Video = RowDataPacket &
  BaseEntity & {
    titleEn: string;
    titleHi: string;
    descriptionEn: string | null;
    descriptionHi: string | null;
    categoryId: number | null;
    categoryName: string | null;
    categoryNameHi?: string | null;
    sourceType: VideoSource;
    youtubeId: string | null;
    videoUrl: string | null;
    videoPath: string | null;
    thumbnailPath: string | null;
    location: string | null;
    recordedOn: string | null;
    showOnHome: number;
    sortOrder: number;
    createdByName?: string | null;
    updatedByName?: string | null;
    deletedByName?: string | null;
  };

/** Playback fields resolved from the stored source, shared by admin and public responses. */
export type VideoMedia = {
  playbackUrl: string | null;
  embedUrl: string | null;
  watchUrl: string | null;
  thumbnailUrl: string | null;
};

export type PublicVideo = VideoMedia & {
  id: number;
  titleEn: string;
  titleHi: string;
  descriptionEn: string | null;
  descriptionHi: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryNameHi: string | null;
  sourceType: VideoSource;
  location: string | null;
  recordedOn: string | null;
};
