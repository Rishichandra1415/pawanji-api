import { z } from "zod";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  meta: PaginationMeta;
};

/**
 * Shared list query params for every admin list API.
 * `deleted=true` returns only soft-deleted rows (for the Restore view).
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  active: z.enum(["true", "false", "all"]).default("all"),
  deleted: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export function toLimitOffset(page: number, limit: number) {
  return { limit, offset: (page - 1) * limit };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
