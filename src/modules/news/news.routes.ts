import { Router } from "express";
import { validate } from "../../middleware/validate";
import { create, getById, getBySlug, list } from "./news.controller";
import {
  createNewsSchema,
  newsIdParamSchema,
  newsSlugParamSchema,
} from "./news.validation";

const router = Router();

/**
 * @openapi
 * /news:
 *   get:
 *     tags: [News]
 *     summary: List news items
 *     parameters:
 *       - in: query
 *         name: published
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: When true, only published news are returned
 *     responses:
 *       200:
 *         description: News list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/News'
 *   post:
 *     tags: [News]
 *     summary: Create a news item (example write API)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNewsInput'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/News'
 *       409:
 *         description: Slug already exists
 *       422:
 *         description: Validation failed
 */
router.get("/", list);
router.post("/", validate(createNewsSchema, "body"), create);

/**
 * @openapi
 * /news/slug/{slug}:
 *   get:
 *     tags: [News]
 *     summary: Get news by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: News item
 *       404:
 *         description: Not found
 */
router.get("/slug/:slug", validate(newsSlugParamSchema, "params"), getBySlug);

/**
 * @openapi
 * /news/{id}:
 *   get:
 *     tags: [News]
 *     summary: Get news by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: News item
 *       404:
 *         description: Not found
 */
router.get("/:id", validate(newsIdParamSchema, "params"), getById);

export default router;
