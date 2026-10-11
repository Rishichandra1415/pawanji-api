import crypto from "crypto";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "../../config/database";
import { publicUploadUrl } from "../../middleware/upload";
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
import { buildMeta, toLimitOffset, type Paginated } from "../../utils/pagination";
import { MEETING_STATUSES, type MeetingRequest, type MeetingStatus } from "./meeting-requests.model";
import type {
  CreateMeetingRequestInput,
  MeetingRequestListQuery,
  UpdateMeetingRequestInput,
} from "./meeting-requests.validation";

const TABLE = "meeting_requests";

export type MeetingRequestDto = WithBooleanFlags<MeetingRequest> & { attachmentUrl: string | null };
export type MeetingStatusCounts = Record<MeetingStatus | "all", number>;

const toDto = (row: MeetingRequest): MeetingRequestDto => ({
  ...withBooleans(row),
  attachmentUrl: publicUploadUrl(row.attachmentPath),
});

const SELECT_SQL = `
  SELECT t.*, ${AUDIT_SELECT_SQL}
    FROM meeting_requests t
    ${AUDIT_JOINS_SQL}
`;

const requestNoFor = (id: number, date = new Date()) => `MR-${date.getFullYear()}-${String(id).padStart(5, "0")}`;

export const create = async (
  data: CreateMeetingRequestInput,
  meta: { file?: Express.Multer.File; attachmentPath: string | null; ipAddress: string | null },
) => {
  const result = await execute(
    `INSERT INTO meeting_requests
       (requestNo, category, name, mobile, village, subject, details,
        attachmentPath, attachmentName, attachmentType, language, ipAddress)
     VALUES
       (:requestNo, :category, :name, :mobile, :village, :subject, :details,
        :attachmentPath, :attachmentName, :attachmentType, :language, :ipAddress)`,
    {
      requestNo: `TMP-${crypto.randomUUID()}`,
      category: data.category,
      name: data.name,
      mobile: data.mobile,
      village: data.village,
      subject: data.subject,
      details: data.details,
      attachmentPath: meta.attachmentPath,
      attachmentName: meta.file ? meta.file.originalname.slice(0, 200) : null,
      attachmentType: meta.file?.mimetype ?? null,
      language: data.language ?? null,
      ipAddress: meta.ipAddress,
    },
  );

  const id = Number(result.insertId);
  const requestNo = requestNoFor(id);
  await execute("UPDATE meeting_requests SET requestNo = :requestNo WHERE id = :id", { id, requestNo });

  return { id, requestNo, createdAt: new Date().toISOString() };
};

export const list = async (q: MeetingRequestListQuery): Promise<Paginated<MeetingRequestDto>> => {
  const where = stateFilters(q.active, q.deleted);
  const params: Record<string, string | number> = {};

  if (q.search) {
    where.push(
      "(t.requestNo LIKE :search OR t.name LIKE :search OR t.mobile LIKE :search OR t.village LIKE :search OR t.subject LIKE :search)",
    );
    params.search = `%${q.search}%`;
  }
  if (q.status !== "all") {
    where.push("t.status = :status");
    params.status = q.status;
  }
  if (q.category !== "all") {
    where.push("t.category = :category");
    params.category = q.category;
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
    query<MeetingRequest[]>(`${SELECT_SQL} ${whereSql} ORDER BY t.id DESC LIMIT ${limit} OFFSET ${offset}`, params),
    query<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) AS total FROM meeting_requests t ${whereSql}`, params),
  ]);

  return { items: rows.map(toDto), meta: buildMeta(q.page, q.limit, Number(countRows[0]?.total ?? 0)) };
};

/** Per-status totals of live (non-deleted) requests, for the admin summary strip. */
export const statusCounts = async (): Promise<MeetingStatusCounts> => {
  const rows = await query<(RowDataPacket & { status: MeetingStatus; total: number })[]>(
    "SELECT status, COUNT(*) AS total FROM meeting_requests WHERE isDeleted = 0 GROUP BY status",
  );
  const counts = Object.fromEntries([...MEETING_STATUSES, "all"].map((s) => [s, 0])) as MeetingStatusCounts;
  for (const row of rows) {
    counts[row.status] = Number(row.total);
    counts.all += Number(row.total);
  }
  return counts;
};

async function findById(id: number): Promise<MeetingRequest> {
  const rows = await query<MeetingRequest[]>(`${SELECT_SQL} WHERE t.id = :id LIMIT 1`, { id });
  if (!rows[0]) throw new AppError("Meeting request not found", 404);
  return rows[0];
}

export const getById = async (id: number) => toDto(await findById(id));

export const update = async (id: number, data: UpdateMeetingRequestInput, userId: number) => {
  const current = await findById(id);
  if (current.isDeleted) throw new AppError("Deleted requests cannot be changed. Restore it first.", 409);

  const nextStatus = data.status ?? current.status;
  const nextMeetingAt = data.meetingAt !== undefined ? data.meetingAt : current.meetingAt;
  if (nextStatus === "scheduled" && !nextMeetingAt) {
    throw new AppError("Validation failed", 422, { fieldErrors: { meetingAt: ["Choose the meeting date and time"] } });
  }

  const sets: string[] = ["updatedBy = :userId"];
  const params: Record<string, string | number | Date | null> = { id, userId };

  if (data.status) {
    sets.push("status = :status");
    params.status = data.status;
  }
  if (data.meetingAt !== undefined) {
    sets.push("meetingAt = :meetingAt");
    params.meetingAt = data.meetingAt ? new Date(data.meetingAt) : null;
  }
  if (data.meetingPlace !== undefined) {
    sets.push("meetingPlace = :meetingPlace");
    params.meetingPlace = data.meetingPlace || null;
  }
  if (data.adminNote !== undefined) {
    sets.push("adminNote = :adminNote");
    params.adminNote = data.adminNote || null;
  }

  await execute(`UPDATE meeting_requests SET ${sets.join(", ")} WHERE id = :id`, params);
  return getById(id);
};

export const remove = async (id: number, remarks: string, userId: number) => {
  await softDelete(TABLE, id, userId, remarks);
};

export const restore = async (id: number, userId: number) => {
  await restoreRow(TABLE, id, userId);
  return getById(id);
};
