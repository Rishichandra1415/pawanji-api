import type { RowDataPacket } from "mysql2";
import type { BaseEntity } from "../../utils/base-entity";

export const GRIEVANCE_STATUSES = ["new", "forwarded", "in_progress", "resolved", "rejected"] as const;
export type GrievanceStatus = (typeof GRIEVANCE_STATUSES)[number];

/** grievances table shape (+ joined department / audit names) */
export type Grievance = RowDataPacket &
  BaseEntity & {
    ticketNo: string;
    name: string;
    mobile: string;
    village: string | null;
    address: string;
    description: string;
    photoPath: string | null;
    departmentId: number | null;
    status: GrievanceStatus;
    adminNote: string | null;
    source: string;
    language: string | null;
    ipAddress: string | null;
    lastForwardedAt: Date | string | null;
    departmentCode?: string | null;
    departmentNameEn?: string | null;
    departmentNameHi?: string | null;
    createdByName?: string | null;
    updatedByName?: string | null;
    deletedByName?: string | null;
  };

/** grievance_forwards table shape (email log) */
export type GrievanceForward = RowDataPacket &
  BaseEntity & {
    grievanceId: number;
    departmentId: number;
    toEmail: string;
    ccEmails: string | null;
    subject: string;
    message: string | null;
    status: "sent" | "failed";
    errorMessage: string | null;
    departmentNameEn?: string | null;
    createdByName?: string | null;
  };
