import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.middleware";
import { aiController, aiUpload } from "../controllers/ai.controller";

export const aiRouter = Router();

aiRouter.use(authenticate, requireVerified);

// POST /ai/extract-by-url — extract receipt from an already-uploaded image URL
aiRouter.post("/extract-by-url", aiController.extractByUrl);

// POST /ai/extract-receipt — direct file upload + extraction in one request
aiRouter.post("/extract-receipt", aiUpload.single("file"), aiController.extractReceipt);
