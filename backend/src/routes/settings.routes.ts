import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.middleware";
import { settingsController } from "../controllers/settings.controller";

export const settingsRouter = Router();

settingsRouter.use(authenticate, requireVerified);

settingsRouter.get("/", settingsController.getSettings);
settingsRouter.patch("/", settingsController.updateSettings);
