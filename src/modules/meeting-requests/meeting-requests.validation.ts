import { z } from "zod";
import { mobileSchema } from "../../utils/common-validation";
import { listQuerySchema } from "../../utils/pagination";
import { MEETING_CATEGORIES, MEETING_STATUSES } from "./meeting-requests.model";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** Public website form (multipart/form-data, so every value arrives as a string). */
export const createMeetingRequestSchema = z.object({
  category: z.enum(MEETING_CATEGORIES, { message: "Please choose a category" }),
  name: z.string().trim().min(2, "Please enter your full name").max(120),
  mobile: mobileSchema,
  village: z.string().trim().min(2, "Please enter your village / panchayat / ward").max(150),
  subject: z.string().trim().min(3, "Please enter the topic of your meeting").max(150),
  details: z.string().trim().min(10, "Please explain your issue in a few words").max(2000),
  language: z.enum(["hi", "en"]).optional(),
  /** Honeypot: real users never see or fill this field. */
  website: z.string().max(0).optional(),
});

export type CreateMeetingRequestInput = z.infer<typeof createMeetingRequestSchema>;

export const meetingRequestListQuerySchema = listQuerySchema.extend({
  status: z.enum([...MEETING_STATUSES, "all"]).default("all"),
  category: z.enum([...MEETING_CATEGORIES, "all"]).default("all"),
  from: dateString.optional(),
  to: dateString.optional(),
});

export type MeetingRequestListQuery = z.infer<typeof meetingRequestListQuerySchema>;

export const updateMeetingRequestSchema = z
  .object({
    status: z.enum(MEETING_STATUSES).optional(),
    meetingAt: z.string().datetime({ offset: true, message: "Choose a valid date and time" }).nullable().optional(),
    meetingPlace: z.string().trim().max(200).nullable().optional(),
    adminNote: z.string().trim().max(5000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Nothing to update")
  .refine((data) => data.status !== "scheduled" || data.meetingAt !== null, {
    message: "Choose the meeting date and time",
    path: ["meetingAt"],
  });

export type UpdateMeetingRequestInput = z.infer<typeof updateMeetingRequestSchema>;
