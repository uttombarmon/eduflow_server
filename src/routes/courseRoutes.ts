import { Router } from "express";
import * as courseController from "../controllers/courseController.js";
import { protect } from "../middleware/authMiddleware.js";

const courseRouter: Router = Router();

// public routes
courseRouter.get("/popular", courseController.getPopularCourses);
courseRouter.get("/getcourses", courseController.getCourses);
courseRouter.get("/:id", courseController.getCourseById);

// private routes
courseRouter.get("/tutor/courses", protect, courseController.getTutorCourses);
courseRouter.post("/tutor/makecourse", protect, courseController.makeCourse);
courseRouter.delete(
  "/tutor/course/:courseId",
  protect,
  courseController.deleteCourse,
);

export default courseRouter;
