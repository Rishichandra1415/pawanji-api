import type { RowDataPacket } from "mysql2";
import type { BaseEntity } from "../../utils/base-entity";

export const MEETING_CATEGORIES = ["personal", "public"] as const;
export type MeetingCategory = (typeof MEETING_CATEGORIES)[number];

export const MEETING_STATUSES = ["new", "contacted", "scheduled", "completed", "cancelled"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

/** meeting_requests table shape (+ joined audit names) */
export type MeetingRequest = RowDataPacket &
  BaseEntity & {
    requestNo: string;
    category: MeetingCategory;
    name: string;
    mobile: string;
    village: string;
    subject: string;
    details: string;
    attachmentPath: string | null;
    attachmentName: string | null;
    attachmentType: string | null;
    status: MeetingStatus;
    meetingAt: Date | string | null;
    meetingPlace: string | null;
    adminNote: string | null;
    source: string;
    language: string | null;
    ipAddress: string | null;
    createdByName?: string | null;
    updatedByName?: string | null;
    deletedByName?: string | null;
  };
