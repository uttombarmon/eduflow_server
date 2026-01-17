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
courseRouter.post(
  "/tutor/makecourse",
  protect,
  courseController.makeCourse
);
// courseRouter.get("/:c_id/lesson", courseController.leson)
courseRouter.post("/:c_id/lesson", protect, courseController.addLesson);
courseRouter.patch(
  "/:c_id/lesson/:l_id",
  protect,
  courseController.updateLesson
);
courseRouter.delete(
  "/:csid/lesson/:l_id",
  protect,
  courseController.removeLesson
);

export default courseRouter;
