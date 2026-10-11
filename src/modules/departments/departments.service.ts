import type { RowDataPacket } from "mysql2";
import { execute, query } from "../../config/database";
import { AppError } from "../../utils/app-error";
import {
  AUDIT_JOINS_SQL,
  AUDIT_SELECT_SQL,
  restore as restoreRow,
  setActive as setActiveRow,
  softDelete,
  stateFilters,
  withBooleans,
  type WithBooleanFlags,
} from "../../utils/base-entity";
import { buildMeta, toLimitOffset, type ListQuery, type Paginated } from "../../utils/pagination";
import type { Department, PublicDepartment } from "./departments.model";
import type { DepartmentPayload } from "./departments.validation";

const TABLE = "departments";

export type DepartmentDto = WithBooleanFlags<Department>;

export const listPublic = async (): Promise<PublicDepartment[]> =>
  query<PublicDepartment[]>(
    `SELECT id, code, nameEn, nameHi FROM departments
      WHERE isDeleted = 0 AND isActive = 1
      ORDER BY sortOrder ASC, id ASC`,
  );

export const list = async (q: ListQuery): Promise<Paginated<DepartmentDto>> => {
  const where = stateFilters(q.active, q.deleted);
  const params: Record<string, string> = {};

  if (q.search) {
    where.push("(t.code LIKE :search OR t.nameEn LIKE :search OR t.nameHi LIKE :search OR t.email LIKE :search)");
    params.search = `%${q.search}%`;
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { limit, offset } = toLimitOffset(q.page, q.limit);

  const [rows, countRows] = await Promise.all([
    query<Department[]>(
      `SELECT t.*, ${AUDIT_SELECT_SQL}
         FROM departments t ${AUDIT_JOINS_SQL}
         ${whereSql}
        ORDER BY t.sortOrder ASC, t.id ASC
        LIMIT ${limit} OFFSET ${offset}`,
      params,
    ),
    query<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) AS total FROM departments t ${whereSql}`, params),
  ]);

  return { items: rows.map(withBooleans), meta: buildMeta(q.page, q.limit, Number(countRows[0]?.total ?? 0)) };
};

async function findById(id: number): Promise<Department> {
  const rows = await query<Department[]>(
    `SELECT t.*, ${AUDIT_SELECT_SQL} FROM departments t ${AUDIT_JOINS_SQL} WHERE t.id = :id LIMIT 1`,
    { id },
  );
  if (!rows[0]) throw new AppError("Department not found", 404);
  return rows[0];
}

export const getById = async (id: number): Promise<DepartmentDto> => withBooleans(await findById(id));

/** Active, non-deleted department used for routing; throws a clear error otherwise. */
export const getRoutable = async (id: number): Promise<Department> => {
  const dept = await findById(id);
  if (dept.isDeleted || !dept.isActive) throw new AppError("This department is inactive or deleted", 422);
  return dept;
};

async function assertCodeAvailable(code: string, ignoreId?: number) {
  const rows = await query<(RowDataPacket & { id: number })[]>(
    "SELECT id FROM departments WHERE code = :code AND isDeleted = 0 AND id <> :ignoreId LIMIT 1",
    { code, ignoreId: ignoreId ?? 0 },
  );
  if (rows[0]) throw new AppError(`Department code "${code}" already exists`, 409);
}

const columnsFrom = (data: DepartmentPayload) => ({
  code: data.code,
  nameEn: data.nameEn,
  nameHi: data.nameHi,
  email: data.email,
  ccEmails: data.ccEmails,
  contactPerson: data.contactPerson,
  phone: data.phone,
  sortOrder: data.sortOrder,
  isActive: data.isActive ? 1 : 0,
});

export const create = async (data: DepartmentPayload, userId: number): Promise<DepartmentDto> => {
  await assertCodeAvailable(data.code);

  const result = await execute(
    `INSERT INTO departments
       (code, nameEn, nameHi, email, ccEmails, contactPerson, phone, sortOrder, isActive, createdBy)
     VALUES
       (:code, :nameEn, :nameHi, :email, :ccEmails, :contactPerson, :phone, :sortOrder, :isActive, :userId)`,
    { ...columnsFrom(data), userId },
  );

  return getById(Number(result.insertId));
};

export const update = async (id: number, data: DepartmentPayload, userId: number): Promise<DepartmentDto> => {
  const existing = await findById(id);
  if (existing.isDeleted) throw new AppError("Deleted records cannot be edited. Restore it first.", 409);
  await assertCodeAvailable(data.code, id);

  await execute(
    `UPDATE departments
        SET code = :code, nameEn = :nameEn, nameHi = :nameHi, email = :email, ccEmails = :ccEmails,
            contactPerson = :contactPerson, phone = :phone, sortOrder = :sortOrder, isActive = :isActive,
            updatedBy = :userId
      WHERE id = :id`,
    { ...columnsFrom(data), id, userId },
  );

  return getById(id);
};

export const setActive = async (id: number, isActive: boolean, userId: number) => {
  await setActiveRow(TABLE, id, isActive, userId);
  return getById(id);
};

export const remove = async (id: number, remarks: string, userId: number) => {
  await softDelete(TABLE, id, userId, remarks);
};

export const restore = async (id: number, userId: number) => {
  const dept = await findById(id);
  if (dept.isDeleted) await assertCodeAvailable(dept.code, id);
  await restoreRow(TABLE, id, userId);
  return getById(id);
};
