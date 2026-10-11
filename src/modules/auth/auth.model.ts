import type { RowDataPacket } from "mysql2";
import type { BaseEntity } from "../../utils/base-entity";

/** admin_users table shape */
export type AdminUser = RowDataPacket &
  BaseEntity & {
    name: string;
    email: string;
    passwordHash: string;
    role: "admin" | "staff";
    lastLoginAt: Date | string | null;
  };
