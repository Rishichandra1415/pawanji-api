import { z } from "zod";
import { emailListSchema } from "../../utils/common-validation";
import { listQuerySchema } from "../../utils/pagination";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const departmentPayloadSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "Code must be lowercase letters/numbers, e.g. electricity"),
  nameEn: z.string().trim().min(2).max(150),
  nameHi: z.string().trim().min(2).max(150),
  email: z
    .union([z.string().trim().email("Enter a valid email"), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value.toLowerCase() : null)),
  ccEmails: emailListSchema
    .optional()
    .nullable()
    .transform((value) => (value ? value.split(",").map((e) => e.trim().toLowerCase()).join(",") : null)),
  contactPerson: optionalText(120),
  phone: optionalText(20),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});

export type DepartmentPayload = z.infer<typeof departmentPayloadSchema>;

export const departmentListQuerySchema = listQuerySchema;
