import { Router } from "express";
import * as courseController from "../controllers/courseController.js";
import { protect } from "../middleware/authMiddleware.js";

const courseRouter: Router = Router();

// public routes
courseRouter.get("/popular", courseController.getPopularCourses);
courseRouter.get("/:id", courseController.getCourseById);

// private routes
courseRouter.post(
  "/dashboard/makecourse",
  protect,
  courseController.makeCourse
);

export default courseRouter;
