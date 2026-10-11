import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { grievanceSubmitLimiter } from "../../middleware/rate-limit";
import { grievancePhotoUpload } from "../../middleware/upload";
import { validate } from "../../middleware/validate";
import { deletePayloadSchema, idParamSchema } from "../../utils/common-validation";
import {
  create,
  forward,
  forwardPreview,
  getById,
  list,
  remove,
  restore,
  update,
} from "./grievances.controller";
import {
  createGrievanceSchema,
  forwardGrievanceSchema,
  forwardPreviewQuerySchema,
  grievanceListQuerySchema,
  updateGrievanceSchema,
} from "./grievances.validation";

const router = Router();

/**
 * @openapi
 * /grievances:
 *   post:
 *     tags: [Grievances]
 *     summary: Public website form – register a grievance (multipart, optional photo)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/GrievanceInput' }
 *     responses:
 *       201: { description: Registered, returns ticketNo }
 *       422: { description: Validation failed }
 *       429: { description: Too many requests }
 *   get:
 *     tags: [Grievances]
 *     summary: Admin grievance list
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [all, new, forwarded, in_progress, resolved, rejected] } }
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: deleted, schema: { type: string, enum: [true, false] } }
 *     responses:
 *       200: { description: Paginated grievances }
 */
router.post("/", grievanceSubmitLimiter, grievancePhotoUpload, validate(createGrievanceSchema), create);

router.use(requireAuth);

router.get("/", validate(grievanceListQuerySchema, "query"), list);

/**
 * @openapi
 * /grievances/{id}:
 *   get:
 *     tags: [Grievances]
 *     summary: Grievance detail with forward history
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Grievance }
 *   patch:
 *     tags: [Grievances]
 *     summary: Update status / admin note / department
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [new, forwarded, in_progress, resolved, rejected] }
 *               adminNote: { type: string, nullable: true }
 *               departmentId: { type: integer }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Grievances]
 *     summary: Soft delete grievance (remarks required)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DeleteInput' }
 *     responses:
 *       200: { description: Deleted }
 */
router.get("/:id", validate(idParamSchema, "params"), getById);
router.patch("/:id", validate(idParamSchema, "params"), validate(updateGrievanceSchema), update);
router.delete("/:id", validate(idParamSchema, "params"), validate(deletePayloadSchema), remove);

/**
 * @openapi
 * /grievances/{id}/forward-preview:
 *   get:
 *     tags: [Grievances]
 *     summary: Preview the email that will be sent to a department
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: departmentId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: to / cc / subject / html }
 * /grievances/{id}/forward:
 *   post:
 *     tags: [Grievances]
 *     summary: Email the grievance to a department and log it
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [departmentId]
 *             properties:
 *               departmentId: { type: integer }
 *               message: { type: string }
 *     responses:
 *       200: { description: Forwarded }
 *       422: { description: Department has no email }
 *       502: { description: Email sending failed (logged) }
 *       503: { description: SMTP not configured }
 * /grievances/{id}/restore:
 *   patch:
 *     tags: [Grievances]
 *     summary: Restore a soft-deleted grievance
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Restored }
 */
router.get(
  "/:id/forward-preview",
  validate(idParamSchema, "params"),
  validate(forwardPreviewQuerySchema, "query"),
  forwardPreview,
);
router.post("/:id/forward", validate(idParamSchema, "params"), validate(forwardGrievanceSchema), forward);
router.patch("/:id/restore", validate(idParamSchema, "params"), restore);

export default router;
