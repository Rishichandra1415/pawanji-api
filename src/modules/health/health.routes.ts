import { Router } from "express";
import { check } from "./health.controller";

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     description: Returns API status and MySQL connectivity.
 *     responses:
 *       200:
 *         description: API is healthy and database is connected
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *       503:
 *         description: API is up but database is disconnected
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 */
router.get("/", check);

export default router;
