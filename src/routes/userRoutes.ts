import { Router } from "express";
import * as userController from "../controllers/userController.js";

const userRouter: Router = Router();
userRouter.get("/:id", userController.getUser);
