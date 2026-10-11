import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { videoMediaUpload } from "../../middleware/upload";
import { validate } from "../../middleware/validate";
import { activePayloadSchema, deletePayloadSchema, idParamSchema } from "../../utils/common-validation";
import { create, getById, list, listPublic, remove, restore, setActive, update } from "./videos.controller";
import { publicVideoQuerySchema, videoListQuerySchema, videoPayloadSchema } from "./videos.validation";

const router = Router();

/**
 * @openapi
 * /videos/public:
 *   get:
 *     tags: [Videos]
 *     summary: Active videos for the website (home section / gallery)
 *     parameters:
 *       - { in: query, name: home, schema: { type: string, enum: [true, false] } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: limit, schema: { type: integer, default: 12, maximum: 50 } }
 *     responses:
 *       200: { description: Video list with playback / embed / thumbnail urls }
 */
router.get("/public", validate(publicVideoQuerySchema, "query"), listPublic);

router.use(requireAuth);

/**
 * @openapi
 * /videos:
 *   get:
 *     tags: [Videos]
 *     summary: Video list for admin
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: sourceType, schema: { type: string, enum: [youtube, url, upload] } }
 *       - { in: query, name: showOnHome, schema: { type: string, enum: [true, false] } }
 *       - { in: query, name: active, schema: { type: string, enum: [true, false, all] } }
 *       - { in: query, name: deleted, schema: { type: string, enum: [true, false] } }
 *     responses:
 *       200: { description: Paginated videos }
 *   post:
 *     tags: [Videos]
 *     summary: Add video (YouTube link, direct URL or file upload)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/VideoInput' }
 *     responses:
 *       201: { description: Created }
 */
router.get("/", validate(videoListQuerySchema, "query"), list);
router.post("/", videoMediaUpload, validate(videoPayloadSchema), create);

/**
 * @openapi
 * /videos/{id}:
 *   get:
 *     tags: [Videos]
 *     summary: Video detail
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Video }
 *   put:
 *     tags: [Videos]
 *     summary: Update video (files optional; send removeThumbnail=true to clear the custom thumbnail)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/VideoInput' }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Videos]
 *     summary: Soft delete video (remarks required)
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
router.put("/:id", validate(idParamSchema, "params"), videoMediaUpload, validate(videoPayloadSchema), update);
router.delete("/:id", validate(idParamSchema, "params"), validate(deletePayloadSchema), remove);

/**
 * @openapi
 * /videos/{id}/status:
 *   patch:
 *     tags: [Videos]
 *     summary: Activate / deactivate video
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { isActive: { type: boolean } } }
 *     responses:
 *       200: { description: Updated }
 * /videos/{id}/restore:
 *   patch:
 *     tags: [Videos]
 *     summary: Restore a soft-deleted video
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Restored }
 */
router.patch("/:id/status", validate(idParamSchema, "params"), validate(activePayloadSchema), setActive);
router.patch("/:id/restore", validate(idParamSchema, "params"), restore);

export default router;
