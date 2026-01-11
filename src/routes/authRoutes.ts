import { Router } from "express";
import * as authController from "../controllers/authController.js";
// import * as userController from '../controllers/userController.js';
// import { protect } from '../middleware/authMiddleware.js';

const authRouter: Router = Router();

// Public routes
authRouter.post("/", authController.signup);
authRouter.post("/login", authController.login);
// authRouter.get('/:id', userController.getUser);

export default authRouter;
