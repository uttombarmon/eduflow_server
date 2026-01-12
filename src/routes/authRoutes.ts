import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const authRouter: Router = Router();

// Public routes
authRouter.post("/", authController.signup);
authRouter.post("/login", authController.login);
authRouter.post("/logout", protect, authController.logout);

export default authRouter;
