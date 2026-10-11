import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import departmentRoutes from "../modules/departments/departments.routes";
import grievanceRoutes from "../modules/grievances/grievances.routes";
import healthRoutes from "../modules/health/health.routes";
import meetingRequestRoutes from "../modules/meeting-requests/meeting-requests.routes";
import newsRoutes from "../modules/news/news.routes";
import videoCategoryRoutes from "../modules/video-categories/video-categories.routes";
import videoRoutes from "../modules/videos/videos.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/departments", departmentRoutes);
router.use("/grievances", grievanceRoutes);
router.use("/meeting-requests", meetingRequestRoutes);
router.use("/news", newsRoutes);
router.use("/video-categories", videoCategoryRoutes);
router.use("/videos", videoRoutes);

export default router;
