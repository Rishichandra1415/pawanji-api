import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { meetingSubmitLimiter } from "../../middleware/rate-limit";
import { meetingAttachmentUpload } from "../../middleware/upload";
import { validate } from "../../middleware/validate";
import { deletePayloadSchema, idParamSchema } from "../../utils/common-validation";
import { create, getById, list, remove, restore, summary, update } from "./meeting-requests.controller";
import {
  createMeetingRequestSchema,
  meetingRequestListQuerySchema,
  updateMeetingRequestSchema,
} from "./meeting-requests.validation";

const router = Router();

/**
 * @openapi
 * /meeting-requests:
 *   post:
 *     tags: [Meeting Requests]
 *     summary: Public website form – request a meeting (multipart, optional photo / PDF)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/MeetingRequestInput' }
 *     responses:
 *       201: { description: Received, returns requestNo }
 *       422: { description: Validation failed }
 *       429: { description: Too many requests }
 *   get:
 *     tags: [Meeting Requests]
 *     summary: Admin meeting request list
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [all, new, contacted, scheduled, completed, cancelled] } }
 *       - { in: query, name: category, schema: { type: string, enum: [all, personal, public] } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: deleted, schema: { type: string, enum: [true, false] } }
 *     responses:
 *       200: { description: Paginated meeting requests }
 */
router.post("/", meetingSubmitLimiter, meetingAttachmentUpload, validate(createMeetingRequestSchema), create);

router.use(requireAuth);

router.get("/", validate(meetingRequestListQuerySchema, "query"), list);

/**
 * @openapi
 * /meeting-requests/summary:
 *   get:
 *     tags: [Meeting Requests]
 *     summary: Count of live requests per status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ all, new, contacted, scheduled, completed, cancelled }" }
 */
router.get("/summary", summary);

/**
 * @openapi
 * /meeting-requests/{id}:
 *   get:
 *     tags: [Meeting Requests]
 *     summary: Meeting request detail
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Meeting request }
 *   patch:
 *     tags: [Meeting Requests]
 *     summary: Update status / meeting time & place / admin note
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [new, contacted, scheduled, completed, cancelled] }
 *               meetingAt: { type: string, format: date-time, nullable: true }
 *               meetingPlace: { type: string, nullable: true }
 *               adminNote: { type: string, nullable: true }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Meeting Requests]
 *     summary: Soft delete meeting request (remarks required)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DeleteInput' }
 *     responses:
 *       200: { description: Deleted }
 * /meeting-requests/{id}/restore:
 *   patch:
 *     tags: [Meeting Requests]
 *     summary: Restore a soft-deleted meeting request
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Restored }
 */
router.get("/:id", validate(idParamSchema, "params"), getById);
router.patch("/:id", validate(idParamSchema, "params"), validate(updateMeetingRequestSchema), update);
router.delete("/:id", validate(idParamSchema, "params"), validate(deletePayloadSchema), remove);
router.patch("/:id/restore", validate(idParamSchema, "params"), restore);

export default router;
