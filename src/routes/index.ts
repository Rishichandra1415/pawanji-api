import { Router } from "express";
import healthRoutes from "../modules/health/health.routes";
import newsRoutes from "../modules/news/news.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/news", newsRoutes);

export default router;
