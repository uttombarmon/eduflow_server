import { Router } from "express";
import * as courseController from "../controllers/courseController.js";

const courseRouter: Router = Router();

// public routes
courseRouter.get("/popular", courseController.getPopularCourses);
courseRouter.get("/:id", courseController.getCourseById);

// private routes
courseRouter.get("/dashboard");

export default courseRouter;
