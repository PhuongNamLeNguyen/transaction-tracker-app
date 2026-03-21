import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.middleware";
import { transactionsController } from "../controllers/transactions.controller";

export const transactionsRouter = Router();

transactionsRouter.use(authenticate, requireVerified);

// Note: /categories must be declared before /:id to avoid route collision
transactionsRouter.get("/categories", transactionsController.getCategories);
transactionsRouter.get("/", transactionsController.list);
transactionsRouter.post("/", transactionsController.create);
transactionsRouter.get("/:id", transactionsController.getById);
