import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const authRouter: Router = Router();

// Public routes
authRouter.post("/signup", authController.signup);
authRouter.post("/login", authController.login);
authRouter.post("/logout", protect, authController.logout);
authRouter.get("/me", protect, authController.onStartUser);

export default authRouter;
