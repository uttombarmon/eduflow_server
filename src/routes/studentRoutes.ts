import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import * as studentController from "../controllers/studentController.js"

const studentRoute: Router = Router();
studentRoute.get("/dashboard", protect, studentController.getStudentDashboardData)
studentRoute.get("/enrolled-courses", protect, studentController.getEnrolledCourses)
studentRoute.post("/enroll", protect, studentController.enrollInCourse)
studentRoute.post("/verify-payment", protect, studentController.verifyMockPayment)
studentRoute.post("/course/:courseId/lesson/:lessonId/progress", protect, studentController.updateLessonProgress)

export default studentRoute;
