import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { activePayloadSchema, deletePayloadSchema, idParamSchema } from "../../utils/common-validation";
import { create, getById, list, listPublic, remove, restore, setActive, update } from "./departments.controller";
import { departmentListQuerySchema, departmentPayloadSchema } from "./departments.validation";

const router = Router();

/**
 * @openapi
 * /departments/public:
 *   get:
 *     tags: [Departments]
 *     summary: Active departments for the website form (no emails)
 *     responses:
 *       200: { description: Department options }
 */
router.get("/public", listPublic);

router.use(requireAuth);

/**
 * @openapi
 * /departments:
 *   get:
 *     tags: [Departments]
 *     summary: Department master list
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: active, schema: { type: string, enum: [true, false, all] } }
 *       - { in: query, name: deleted, schema: { type: string, enum: [true, false] } }
 *     responses:
 *       200: { description: Paginated departments }
 *   post:
 *     tags: [Departments]
 *     summary: Create department
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DepartmentInput' }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Code already exists }
 */
router.get("/", validate(departmentListQuerySchema, "query"), list);
router.post("/", validate(departmentPayloadSchema), create);

/**
 * @openapi
 * /departments/{id}:
 *   get:
 *     tags: [Departments]
 *     summary: Department detail
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Department }
 *   put:
 *     tags: [Departments]
 *     summary: Update department
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DepartmentInput' }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Departments]
 *     summary: Soft delete department (remarks required)
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
router.put("/:id", validate(idParamSchema, "params"), validate(departmentPayloadSchema), update);
router.delete("/:id", validate(idParamSchema, "params"), validate(deletePayloadSchema), remove);

/**
 * @openapi
 * /departments/{id}/status:
 *   patch:
 *     tags: [Departments]
 *     summary: Activate / deactivate department
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { isActive: { type: boolean } } }
 *     responses:
 *       200: { description: Updated }
 * /departments/{id}/restore:
 *   patch:
 *     tags: [Departments]
 *     summary: Restore a soft-deleted department
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Restored }
 */
router.patch("/:id/status", validate(idParamSchema, "params"), validate(activePayloadSchema), setActive);
router.patch("/:id/restore", validate(idParamSchema, "params"), restore);

export default router;
