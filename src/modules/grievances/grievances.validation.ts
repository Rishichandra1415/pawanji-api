import { z } from "zod";
import { mobileSchema } from "../../utils/common-validation";
import { listQuerySchema } from "../../utils/pagination";
import { GRIEVANCE_STATUSES } from "./grievances.model";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** Public website form (multipart/form-data, so every value arrives as a string). */
export const createGrievanceSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  mobile: mobileSchema,
  village: z
    .string()
    .trim()
    .max(150)
    .optional()
    .transform((value) => value || null),
  address: z.string().trim().min(3, "Please enter your address").max(300),
  description: z.string().trim().min(10, "Please describe the problem in a few words").max(5000),
  departmentId: z.coerce.number().int().positive("Please choose a department"),
  language: z.enum(["hi", "en"]).optional(),
  /** Honeypot: real users never see or fill this field. */
  website: z.string().max(0).optional(),
});

export type CreateGrievanceInput = z.infer<typeof createGrievanceSchema>;

export const grievanceListQuerySchema = listQuerySchema.extend({
  status: z.enum([...GRIEVANCE_STATUSES, "all"]).default("all"),
  departmentId: z.coerce.number().int().positive().optional(),
  from: dateString.optional(),
  to: dateString.optional(),
});

export type GrievanceListQuery = z.infer<typeof grievanceListQuerySchema>;

export const updateGrievanceSchema = z
  .object({
    status: z.enum(GRIEVANCE_STATUSES).optional(),
    adminNote: z.string().trim().max(5000).nullable().optional(),
    departmentId: z.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");

export type UpdateGrievanceInput = z.infer<typeof updateGrievanceSchema>;

export const forwardGrievanceSchema = z.object({
  departmentId: z.number().int().positive(),
  message: z.string().trim().max(2000).optional(),
});

export type ForwardGrievanceInput = z.infer<typeof forwardGrievanceSchema>;

export const forwardPreviewQuerySchema = z.object({
  departmentId: z.coerce.number().int().positive(),
});
