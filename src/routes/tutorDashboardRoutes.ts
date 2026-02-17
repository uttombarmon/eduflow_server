import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { Dasboard } from "../controllers/tutorDashboardController.js";

const tDashboardRouter: Router = Router();

tDashboardRouter.get("/", protect, Dasboard);
export default tDashboardRouter;
