import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import * as studentController from "../controllers/studentController.js"

const studentRoute: Router = Router();
studentRoute.get("/dashboard", protect, studentController.getStudentDashboardData)
studentRoute.post("/enroll", protect, studentController.enrollInCourse)

export default studentRoute;
