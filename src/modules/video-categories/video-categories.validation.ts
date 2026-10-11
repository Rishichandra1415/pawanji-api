import { z } from "zod";
import { listQuerySchema } from "../../utils/pagination";

export const videoCategoryPayloadSchema = z.object({
  nameEn: z.string().trim().min(2, "English name is required").max(120),
  nameHi: z.string().trim().min(2, "Hindi name is required").max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});

export type VideoCategoryPayload = z.infer<typeof videoCategoryPayloadSchema>;

export const videoCategoryListQuerySchema = listQuerySchema;
