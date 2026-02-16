import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import * as lessonController from "../controllers/lessonController.js";

const lessonRouter = Router();

// add new lesson
lessonRouter.post("/:c_id/lesson", protect, lessonController.addLesson);
// update lesson
lessonRouter.patch(
  "/:c_id/lesson/:l_id",
  protect,
  lessonController.updateLesson,
);
// delete lesson
lessonRouter.delete(
  "/:csid/lesson/:l_id",
  protect,
  lessonController.removeLesson,
);
