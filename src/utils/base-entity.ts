import type { RowDataPacket } from "mysql2";
import { execute, query } from "../config/database";
import { AppError } from "./app-error";

/**
 * Audit + soft-delete columns present on every table.
 */
export type BaseEntity = {
  id: number;
  isActive: number;
  isDeleted: number;
  createdBy: number | null;
  createdAt: Date | string;
  updatedBy: number | null;
  updatedAt: Date | string | null;
  deletedBy: number | null;
  deletedAt: Date | string | null;
  deletedRemarks: string | null;
};

export const BASE_COLUMNS_SQL = `
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  isDeleted TINYINT(1) NOT NULL DEFAULT 0,
  createdBy INT UNSIGNED NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedBy INT UNSIGNED NULL,
  updatedAt DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  deletedBy INT UNSIGNED NULL,
  deletedAt DATETIME NULL,
  deletedRemarks VARCHAR(500) NULL
`;

export const BASE_COLUMN_DEFINITIONS: Record<string, string> = {
  isActive: "TINYINT(1) NOT NULL DEFAULT 1",
  isDeleted: "TINYINT(1) NOT NULL DEFAULT 0",
  createdBy: "INT UNSIGNED NULL",
  createdAt: "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
  updatedBy: "INT UNSIGNED NULL",
  updatedAt: "DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP",
  deletedBy: "INT UNSIGNED NULL",
  deletedAt: "DATETIME NULL",
  deletedRemarks: "VARCHAR(500) NULL",
};

/** Tables that support the shared soft-delete helpers. */
export type SoftDeleteTable = "admin_users" | "departments" | "grievances" | "grievance_forwards" | "news";

/** SQL fragment that joins admin names for the audit columns. Expects the main table aliased as `t`. */
export const AUDIT_JOINS_SQL = `
  LEFT JOIN admin_users cu ON cu.id = t.createdBy
  LEFT JOIN admin_users uu ON uu.id = t.updatedBy
  LEFT JOIN admin_users du ON du.id = t.deletedBy
`;

export const AUDIT_SELECT_SQL = `
  cu.name AS createdByName,
  uu.name AS updatedByName,
  du.name AS deletedByName
`;

/** WHERE fragments for the shared `active` / `deleted` list filters. Expects alias `t`. */
export function stateFilters(active: "true" | "false" | "all", deleted: boolean): string[] {
  const where = [deleted ? "t.isDeleted = 1" : "t.isDeleted = 0"];
  if (active === "true") where.push("t.isActive = 1");
  if (active === "false") where.push("t.isActive = 0");
  return where;
}

type IdRow = RowDataPacket & { id: number; isDeleted: number };

async function findRow(table: SoftDeleteTable, id: number) {
  const rows = await query<IdRow[]>(`SELECT id, isDeleted FROM ${table} WHERE id = :id LIMIT 1`, { id });
  if (!rows[0]) throw new AppError("Record not found", 404);
  return rows[0];
}

export async function softDelete(table: SoftDeleteTable, id: number, userId: number, remarks: string) {
  const row = await findRow(table, id);
  if (row.isDeleted) throw new AppError("Record is already deleted", 409);

  await execute(
    `UPDATE ${table}
        SET isDeleted = 1, deletedBy = :userId, deletedAt = NOW(), deletedRemarks = :remarks
      WHERE id = :id`,
    { id, userId, remarks },
  );
}

export async function restore(table: SoftDeleteTable, id: number, userId: number) {
  const row = await findRow(table, id);
  if (!row.isDeleted) throw new AppError("Record is not deleted", 409);

  await execute(
    `UPDATE ${table}
        SET isDeleted = 0, deletedBy = NULL, deletedAt = NULL, deletedRemarks = NULL, updatedBy = :userId
      WHERE id = :id`,
    { id, userId },
  );
}

export async function setActive(table: SoftDeleteTable, id: number, isActive: boolean, userId: number) {
  const row = await findRow(table, id);
  if (row.isDeleted) throw new AppError("Deleted records cannot be changed", 409);

  await execute(`UPDATE ${table} SET isActive = :isActive, updatedBy = :userId WHERE id = :id`, {
    id,
    isActive: isActive ? 1 : 0,
    userId,
  });
}

export type WithBooleanFlags<T> = Omit<T, "isActive" | "isDeleted"> & {
  isActive: boolean;
  isDeleted: boolean;
};

/** Converts MySQL TINYINT flags on a row into real booleans for API responses. */
export function withBooleans<T extends { isActive: number; isDeleted: number }>(row: T): WithBooleanFlags<T> {
  return { ...row, isActive: Boolean(row.isActive), isDeleted: Boolean(row.isDeleted) };
}
