import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.middleware";
import { transactionsController } from "../controllers/transactions.controller";

export const transactionsRouter = Router();

transactionsRouter.use(authenticate, requireVerified);

// Static paths first to avoid collision with /:id
transactionsRouter.get("/categories", transactionsController.getCategories);
transactionsRouter.get("/splits/deleted", transactionsController.getDeletedSplits);
transactionsRouter.delete("/splits/permanent", transactionsController.bulkHardDeleteSplits);
transactionsRouter.patch("/splits/restore", transactionsController.bulkRestoreSplits);

transactionsRouter.get("/", transactionsController.list);
transactionsRouter.post("/", transactionsController.create);
transactionsRouter.get("/:id", transactionsController.getById);

// Split-level actions (must be after /:id to get correct param names)
transactionsRouter.delete("/:id/splits/:splitId", transactionsController.deleteSplit);
transactionsRouter.delete("/:id/splits/:splitId/permanent", transactionsController.hardDeleteSplit);
transactionsRouter.patch("/:id/splits/:splitId/restore", transactionsController.restoreSplit);
