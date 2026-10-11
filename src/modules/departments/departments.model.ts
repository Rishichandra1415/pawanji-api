import type { RowDataPacket } from "mysql2";
import type { BaseEntity } from "../../utils/base-entity";

/** departments table shape (master used to route grievances) */
export type Department = RowDataPacket &
  BaseEntity & {
    code: string;
    nameEn: string;
    nameHi: string;
    email: string | null;
    ccEmails: string | null;
    contactPerson: string | null;
    phone: string | null;
    sortOrder: number;
    createdByName?: string | null;
    updatedByName?: string | null;
    deletedByName?: string | null;
  };

export type PublicDepartment = RowDataPacket & {
  id: number;
  code: string;
  nameEn: string;
  nameHi: string;
};
