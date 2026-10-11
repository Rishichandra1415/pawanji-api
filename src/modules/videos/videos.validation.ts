import { z } from "zod";
import { listQuerySchema } from "../../utils/pagination";
import { VIDEO_SOURCES } from "./videos.model";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

/** Multipart forms send booleans as strings. */
const formBoolean = (fallback: boolean) =>
  z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((value) => (value === undefined ? fallback : value === true || value === "true" || value === "1"));

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts watch, youtu.be, shorts, embed and live links (or a bare 11-char id). */
export function parseYoutubeId(input: string): string | null {
  const value = input.trim();
  if (YOUTUBE_ID.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/")[1] ?? "";
      return YOUTUBE_ID.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const fromQuery = url.searchParams.get("v");
      if (fromQuery && YOUTUBE_ID.test(fromQuery)) return fromQuery;
      const [, kind, id] = url.pathname.split("/");
      if (["shorts", "embed", "live"].includes(kind ?? "") && YOUTUBE_ID.test(id ?? "")) return id ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

const isPlayableUrl = (value: string) => {
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

export const videoPayloadSchema = z
  .object({
    titleEn: z.string().trim().min(2, "Title (English) is required").max(200),
    titleHi: z.string().trim().min(2, "Title (Hindi) is required").max(200),
    descriptionEn: optionalText(1000),
    descriptionHi: optionalText(1000),
    categoryId: z.coerce.number({ invalid_type_error: "Choose a category" }).int().positive("Choose a category"),
    sourceType: z.enum(VIDEO_SOURCES),
    youtubeUrl: optionalText(500),
    videoUrl: optionalText(500),
    location: optionalText(150),
    recordedOn: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"), z.literal(""), z.null()])
      .optional()
      .transform((value) => (value ? value : null)),
    showOnHome: formBoolean(false),
    sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
    isActive: formBoolean(true),
    removeThumbnail: formBoolean(false),
  })
  .superRefine((data, ctx) => {
    if (data.sourceType === "youtube" && !(data.youtubeUrl && parseYoutubeId(data.youtubeUrl))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["youtubeUrl"], message: "Enter a valid YouTube link" });
    }
    if (data.sourceType === "url" && !(data.videoUrl && isPlayableUrl(data.videoUrl))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["videoUrl"],
        message: "Enter a valid video link (https://… or /path/video.mp4)",
      });
    }
  });

export type VideoPayload = z.infer<typeof videoPayloadSchema>;

export const videoListQuerySchema = listQuerySchema.extend({
  categoryId: z.coerce.number().int().positive().optional(),
  sourceType: z.enum(VIDEO_SOURCES).optional(),
  showOnHome: z.enum(["true", "false"]).optional(),
});

export type VideoListQuery = z.infer<typeof videoListQuerySchema>;

export const publicVideoQuerySchema = z.object({
  home: z.enum(["true", "false"]).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type PublicVideoQuery = z.infer<typeof publicVideoQuerySchema>;
