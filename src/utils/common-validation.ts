import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const deletePayloadSchema = z.object({
  deletedRemarks: z.string().trim().min(3, "Please give a reason for deleting").max(500),
});

export const activePayloadSchema = z.object({
  isActive: z.boolean(),
});

export const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

export const emailListSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || value.split(",").every((email) => z.string().email().safeParse(email.trim()).success),
    "Enter valid email addresses separated by commas",
  );
