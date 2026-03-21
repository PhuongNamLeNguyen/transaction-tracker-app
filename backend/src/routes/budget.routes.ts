import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.middleware";
import { budgetController } from "../controllers/budget.controller";

export const budgetRouter = Router();

budgetRouter.use(authenticate, requireVerified);

budgetRouter.get("/", budgetController.getBudget);
