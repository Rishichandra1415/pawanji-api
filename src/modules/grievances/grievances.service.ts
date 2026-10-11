import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "../../config/database";
import { absoluteUploadPath, publicUploadUrl } from "../../middleware/upload";
import { AppError } from "../../utils/app-error";
import {
  AUDIT_JOINS_SQL,
  AUDIT_SELECT_SQL,
  restore as restoreRow,
  softDelete,
  stateFilters,
  withBooleans,
  type WithBooleanFlags,
} from "../../utils/base-entity";
import { isMailConfigured, sendMail } from "../../utils/mailer";
import { buildMeta, toLimitOffset, type Paginated } from "../../utils/pagination";
import * as departmentsService from "../departments/departments.service";
import type { Department } from "../departments/departments.model";
import { grievanceEmailHtml, grievanceEmailSubject } from "./grievance-email";
import type { Grievance, GrievanceForward } from "./grievances.model";
import type {
  CreateGrievanceInput,
  ForwardGrievanceInput,
  GrievanceListQuery,
  UpdateGrievanceInput,
} from "./grievances.validation";

const TABLE = "grievances";

export type GrievanceDto = WithBooleanFlags<Grievance> & { photoUrl: string | null };
export type GrievanceForwardDto = WithBooleanFlags<GrievanceForward>;

const toDto = (row: Grievance): GrievanceDto => ({ ...withBooleans(row), photoUrl: publicUploadUrl(row.photoPath) });

const SELECT_SQL = `
  SELECT t.*, d.code AS departmentCode, d.nameEn AS departmentNameEn, d.nameHi AS departmentNameHi,
         ${AUDIT_SELECT_SQL}
    FROM grievances t
    LEFT JOIN departments d ON d.id = t.departmentId
    ${AUDIT_JOINS_SQL}
`;

const ticketFor = (id: number, date = new Date()) => `PJ-${date.getFullYear()}-${String(id).padStart(5, "0")}`;

export const create = async (
  data: CreateGrievanceInput,
  meta: { photoPath: string | null; ipAddress: string | null },
) => {
  await departmentsService.getRoutable(data.departmentId);

  const result = await execute(
    `INSERT INTO grievances
       (ticketNo, name, mobile, village, address, description, photoPath, departmentId, language, ipAddress)
     VALUES
       (:ticketNo, :name, :mobile, :village, :address, :description, :photoPath, :departmentId, :language, :ipAddress)`,
    {
      ticketNo: `TMP-${crypto.randomUUID()}`,
      name: data.name,
      mobile: data.mobile,
      village: data.village,
      address: data.address,
      description: data.description,
      photoPath: meta.photoPath,
      departmentId: data.departmentId,
      language: data.language ?? null,
      ipAddress: meta.ipAddress,
    },
  );

  const id = Number(result.insertId);
  const ticketNo = ticketFor(id);
  await execute("UPDATE grievances SET ticketNo = :ticketNo WHERE id = :id", { id, ticketNo });

  return { id, ticketNo, createdAt: new Date().toISOString() };
};

export const list = async (q: GrievanceListQuery): Promise<Paginated<GrievanceDto>> => {
  const where = stateFilters(q.active, q.deleted);
  const params: Record<string, string | number> = {};

  if (q.search) {
    where.push(
      "(t.ticketNo LIKE :search OR t.name LIKE :search OR t.mobile LIKE :search OR t.village LIKE :search OR t.description LIKE :search)",
    );
    params.search = `%${q.search}%`;
  }
  if (q.status !== "all") {
    where.push("t.status = :status");
    params.status = q.status;
  }
  if (q.departmentId) {
    where.push("t.departmentId = :departmentId");
    params.departmentId = q.departmentId;
  }
  if (q.from) {
    where.push("t.createdAt >= :from");
    params.from = `${q.from} 00:00:00`;
  }
  if (q.to) {
    where.push("t.createdAt <= :to");
    params.to = `${q.to} 23:59:59`;
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { limit, offset } = toLimitOffset(q.page, q.limit);

  const [rows, countRows] = await Promise.all([
    query<Grievance[]>(`${SELECT_SQL} ${whereSql} ORDER BY t.id DESC LIMIT ${limit} OFFSET ${offset}`, params),
    query<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) AS total FROM grievances t ${whereSql}`, params),
  ]);

  return { items: rows.map(toDto), meta: buildMeta(q.page, q.limit, Number(countRows[0]?.total ?? 0)) };
};

async function findById(id: number): Promise<Grievance> {
  const rows = await query<Grievance[]>(`${SELECT_SQL} WHERE t.id = :id LIMIT 1`, { id });
  if (!rows[0]) throw new AppError("Grievance not found", 404);
  return rows[0];
}

async function findEditable(id: number): Promise<Grievance> {
  const grievance = await findById(id);
  if (grievance.isDeleted) throw new AppError("Deleted grievances cannot be changed. Restore it first.", 409);
  return grievance;
}

export const listForwards = async (grievanceId: number): Promise<GrievanceForwardDto[]> => {
  const rows = await query<GrievanceForward[]>(
    `SELECT t.*, d.nameEn AS departmentNameEn, ${AUDIT_SELECT_SQL}
       FROM grievance_forwards t
       LEFT JOIN departments d ON d.id = t.departmentId
       ${AUDIT_JOINS_SQL}
      WHERE t.grievanceId = :grievanceId AND t.isDeleted = 0
      ORDER BY t.id DESC`,
    { grievanceId },
  );
  return rows.map(withBooleans);
};

export const getById = async (id: number) => {
  const [grievance, forwards] = await Promise.all([findById(id), listForwards(id)]);
  return { ...toDto(grievance), forwards };
};

export const update = async (id: number, data: UpdateGrievanceInput, userId: number) => {
  await findEditable(id);
  if (data.departmentId) await departmentsService.getRoutable(data.departmentId);

  const sets: string[] = ["updatedBy = :userId"];
  const params: Record<string, string | number | null> = { id, userId };

  if (data.status) {
    sets.push("status = :status");
    params.status = data.status;
  }
  if (data.adminNote !== undefined) {
    sets.push("adminNote = :adminNote");
    params.adminNote = data.adminNote || null;
  }
  if (data.departmentId) {
    sets.push("departmentId = :departmentId");
    params.departmentId = data.departmentId;
  }

  await execute(`UPDATE grievances SET ${sets.join(", ")} WHERE id = :id`, params);
  return getById(id);
};

const ccList = (department: Department) =>
  (department.ccEmails ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

function assertForwardable(department: Department) {
  if (!department.email) {
    throw new AppError(`"${department.nameEn}" has no email yet. Add it in the Department master first.`, 422);
  }
}

export const forwardPreview = async (id: number, departmentId: number) => {
  const [grievance, department] = await Promise.all([findEditable(id), departmentsService.getRoutable(departmentId)]);

  return {
    to: department.email,
    cc: ccList(department),
    subject: grievanceEmailSubject(grievance, department),
    html: grievanceEmailHtml(grievance, department),
    mailConfigured: isMailConfigured(),
  };
};

export const forward = async (id: number, data: ForwardGrievanceInput, userId: number) => {
  const [grievance, department] = await Promise.all([
    findEditable(id),
    departmentsService.getRoutable(data.departmentId),
  ]);
  assertForwardable(department);

  const toEmail = department.email as string;
  const cc = ccList(department);
  const subject = grievanceEmailSubject(grievance, department);
  const photoFile = grievance.photoPath ? absoluteUploadPath(grievance.photoPath) : null;

  let errorMessage: string | null = null;
  try {
    await sendMail({
      to: toEmail,
      cc,
      subject,
      html: grievanceEmailHtml(grievance, department, data.message),
      attachments:
        photoFile && fs.existsSync(photoFile)
          ? [{ filename: `${grievance.ticketNo}${path.extname(photoFile)}`, path: photoFile }]
          : undefined,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    errorMessage = (error instanceof Error ? error.message : String(error)).slice(0, 500);
  }

  await execute(
    `INSERT INTO grievance_forwards
       (grievanceId, departmentId, toEmail, ccEmails, subject, message, status, errorMessage, createdBy)
     VALUES
       (:grievanceId, :departmentId, :toEmail, :ccEmails, :subject, :message, :status, :errorMessage, :userId)`,
    {
      grievanceId: id,
      departmentId: department.id,
      toEmail,
      ccEmails: cc.length ? cc.join(",") : null,
      subject,
      message: data.message || null,
      status: errorMessage ? "failed" : "sent",
      errorMessage,
      userId,
    },
  );

  if (errorMessage) {
    throw new AppError(`Email could not be sent: ${errorMessage}`, 502);
  }

  await execute(
    `UPDATE grievances
        SET departmentId = :departmentId,
            status = IF(status = 'new', 'forwarded', status),
            lastForwardedAt = NOW(),
            updatedBy = :userId
      WHERE id = :id`,
    { id, departmentId: department.id, userId },
  );

  return getById(id);
};

export const remove = async (id: number, remarks: string, userId: number) => {
  await softDelete(TABLE, id, userId, remarks);
};

export const restore = async (id: number, userId: number) => {
  await restoreRow(TABLE, id, userId);
  return getById(id);
};
