import { z } from "zod";

export const createNewsSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  summary: z.string().trim().max(500).optional(),
  content: z.string().trim().min(10),
  coverImage: z.string().url().optional(),
  isPublished: z.boolean().optional().default(false),
});

export const newsIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const newsSlugParamSchema = z.object({
  slug: z.string().trim().min(1),
});
