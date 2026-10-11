import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { activePayloadSchema, deletePayloadSchema, idParamSchema } from "../../utils/common-validation";
import { create, getById, list, listPublic, remove, restore, setActive, update } from "./video-categories.controller";
import { videoCategoryListQuerySchema, videoCategoryPayloadSchema } from "./video-categories.validation";

const router = Router();

/**
 * @openapi
 * /video-categories/public:
 *   get:
 *     tags: [Video Categories]
 *     summary: Active video categories (for website filters)
 *     responses:
 *       200: { description: Category options }
 */
router.get("/public", listPublic);

router.use(requireAuth);

/**
 * @openapi
 * /video-categories:
 *   get:
 *     tags: [Video Categories]
 *     summary: Video category master list (with video counts)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: active, schema: { type: string, enum: [true, false, all] } }
 *       - { in: query, name: deleted, schema: { type: string, enum: [true, false] } }
 *     responses:
 *       200: { description: Paginated categories }
 *   post:
 *     tags: [Video Categories]
 *     summary: Create video category
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VideoCategoryInput' }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Name already exists }
 */
router.get("/", validate(videoCategoryListQuerySchema, "query"), list);
router.post("/", validate(videoCategoryPayloadSchema), create);

/**
 * @openapi
 * /video-categories/{id}:
 *   get:
 *     tags: [Video Categories]
 *     summary: Video category detail
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Category }
 *   put:
 *     tags: [Video Categories]
 *     summary: Update video category (renames are copied to videos.categoryName)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VideoCategoryInput' }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Video Categories]
 *     summary: Soft delete category (blocked while videos use it)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DeleteInput' }
 *     responses:
 *       200: { description: Deleted }
 *       409: { description: Category still has videos }
 */
router.get("/:id", validate(idParamSchema, "params"), getById);
router.put("/:id", validate(idParamSchema, "params"), validate(videoCategoryPayloadSchema), update);
router.delete("/:id", validate(idParamSchema, "params"), validate(deletePayloadSchema), remove);

/**
 * @openapi
 * /video-categories/{id}/status:
 *   patch:
 *     tags: [Video Categories]
 *     summary: Activate / deactivate category
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { isActive: { type: boolean } } }
 *     responses:
 *       200: { description: Updated }
 * /video-categories/{id}/restore:
 *   patch:
 *     tags: [Video Categories]
 *     summary: Restore a soft-deleted category
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Restored }
 */
router.patch("/:id/status", validate(idParamSchema, "params"), validate(activePayloadSchema), setActive);
router.patch("/:id/restore", validate(idParamSchema, "params"), restore);

export default router;
