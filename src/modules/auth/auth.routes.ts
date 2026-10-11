import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { loginLimiter } from "../../middleware/rate-limit";
import { validate } from "../../middleware/validate";
import { changePassword, login, me } from "./auth.controller";
import { changePasswordSchema, loginSchema } from "./auth.validation";

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Admin login, returns a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginInput' }
 *     responses:
 *       200: { description: Logged in }
 *       401: { description: Invalid email or password }
 */
router.post("/login", loginLimiter, validate(loginSchema), login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Current admin profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile }
 *       401: { description: Not logged in }
 */
router.get("/me", requireAuth, me);

/**
 * @openapi
 * /auth/password:
 *   patch:
 *     tags: [Auth]
 *     summary: Change own password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password changed }
 */
router.patch("/password", requireAuth, validate(changePasswordSchema), changePassword);

export default router;
