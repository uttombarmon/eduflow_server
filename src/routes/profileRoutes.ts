import { Router } from "express";
import * as profileController from "../controllers/profileController.js";
import { protect } from "../middleware/authMiddleware.js";

const profileRouter: Router = Router();
profileRouter.get("/:id", profileController.getFullProfile);
profileRouter.get("/getprojectsbytech", profileController.getProjectsByTech);

// private routes
profileRouter.post("/:id", protect, profileController.addProfile);
profileRouter.patch("/:id", protect, profileController.updateProfileInfo);
profileRouter.post("/:id/experience", protect, profileController.addExperience);
profileRouter.patch(
  "/:id/experience/:ex_id",
  protect,
  profileController.updateExperience,
);
profileRouter.delete(
  "/:id/experience/:ex_id",
  protect,
  profileController.deleteExperience,
);
profileRouter.post("/:id/project", protect, profileController.addProject);
profileRouter.patch(
  "/:id/project/:pid",
  protect,
  profileController.updateProject,
);
profileRouter.delete(
  "/:id/project/:pid",
  protect,
  profileController.deleteProject,
);

export default profileRouter;
