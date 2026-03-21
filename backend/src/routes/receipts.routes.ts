import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.middleware";
import { receiptsController, receiptUpload } from "../controllers/receipts.controller";

export const receiptsRouter = Router();

receiptsRouter.use(authenticate, requireVerified);

// POST /receipts/upload — multipart image upload
receiptsRouter.post("/upload", receiptUpload.single("image"), receiptsController.upload);

// POST /receipts/scan — trigger AI extraction for an uploaded receipt
receiptsRouter.post("/scan", receiptsController.scan);
