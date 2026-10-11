import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import departmentRoutes from "../modules/departments/departments.routes";
import grievanceRoutes from "../modules/grievances/grievances.routes";
import healthRoutes from "../modules/health/health.routes";
import newsRoutes from "../modules/news/news.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/departments", departmentRoutes);
router.use("/grievances", grievanceRoutes);
router.use("/news", newsRoutes);

export default router;
