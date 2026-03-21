import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.middleware";
import { dashboardController } from "../controllers/dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, requireVerified);

dashboardRouter.get("/", dashboardController.getDashboard);
