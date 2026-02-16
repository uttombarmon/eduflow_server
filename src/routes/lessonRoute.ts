import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import * as lessonController from "../controllers/lessonController.js";

const lessonRouter: Router = Router();

//get lessons
lessonRouter.get("/:c_id", protect, lessonController.getLessons);

// add new lesson
lessonRouter.post("/:c_id", protect, lessonController.addLesson);
// update lesson
lessonRouter.patch("/:l_id", protect, lessonController.updateLesson);
// delete lesson
lessonRouter.delete("/:l_id", protect, lessonController.removeLesson);

export default lessonRouter;
