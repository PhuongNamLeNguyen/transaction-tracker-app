import { Request, Response } from "express";
import path from "path";
import multer from "multer";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { receiptsRepo } from "../repositories/receipts.repo";
import { parseReceiptWithCategories } from "../services/ai.service";
import { uploadToCloudinary } from "../config/cloudinary";

/* ─── Multer config: memory storage (no local disk, works on Railway) ─── */

const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/heic", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new AppError(
                "Unsupported file type. Please upload a JPG, PNG, HEIC, or PDF.",
                400,
                "INVALID_IMAGE_FORMAT",
            ),
        );
    }
};

export const receiptUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
});

/* ─── Helpers ─── */

function getMimeType(originalname: string, mimetype: string): string {
    const map: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".heic": "image/jpeg", // treat as JPEG for Claude (best effort)
        ".pdf": "application/pdf",
    };
    return map[path.extname(originalname).toLowerCase()] ?? mimetype ?? "image/jpeg";
}

/** Build the TransactionSuggestion from AI output and DB writes */
async function buildSuggestion(params: {
    receiptId: string;
    imageBuffer: Buffer;
    mimeType: string;
    transactionType: string;
    persistItems: boolean;
}) {
    const { receiptId, imageBuffer, mimeType, transactionType, persistItems } = params;

    // Load categories for the given type
    const categories = await receiptsRepo.getCategoriesByType(transactionType);

    // Call Claude — extract receipt data + predict categories in one call
    const receiptData = await parseReceiptWithCategories(imageBuffer, mimeType, categories);

    // Require at least one meaningful piece of data — amount OR a note/description
    const hasUsableData =
        receiptData.totalAmount != null ||
        receiptData.merchant != null ||
        receiptData.suggestedNote != null ||
        receiptData.items.length > 0;
    if (!hasUsableData) {
        throw new AppError(
            "No transaction details found. Please upload a receipt, invoice, or transaction screenshot.",
            400,
            "AI_NOT_A_RECEIPT",
        );
    }

    // Merchant resolution
    let merchantObj: { id: string; name: string; default_category_id: string | null } | null = null;
    if (receiptData.merchant) {
        merchantObj = await receiptsRepo.getOrCreateMerchant(receiptData.merchant);
    }

    // Write items + predictions, build result array
    const itemResults = [];
    for (const item of receiptData.items) {
        const highConfidence = item.confidenceScore >= 0.7;
        let receiptItemId: string | null = null;

        if (persistItems) {
            const receiptItem = await receiptsRepo.createItem({
                receiptId,
                itemName: item.itemName,
                price: item.unitPrice,
                quantity: item.quantity,
            });
            await receiptsRepo.createAiPrediction({
                receiptItemId: receiptItem.id,
                predictedCategoryId: item.predictedCategoryId,
                confidenceScore: item.confidenceScore,
                modelVersion: "claude-haiku-4-5-20251001",
            });
            receiptItemId = receiptItem.id;
        }

        itemResults.push({
            receiptItemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            prediction: {
                categoryId: highConfidence ? item.predictedCategoryId : null,
                categoryName: highConfidence ? item.predictedCategoryName : null,
                confidenceScore: item.confidenceScore,
                lowConfidence: !highConfidence,
            },
        });
    }

    // Determine overall confidence level
    const confidenceLevel = itemResults.every((i) => !i.prediction.lowConfidence) ? "high" : "low";

    // Most common predicted category → stored on receipt row
    const categoryCounts: Record<string, number> = {};
    for (const item of itemResults) {
        if (item.prediction.categoryId) {
            categoryCounts[item.prediction.categoryId] =
                (categoryCounts[item.prediction.categoryId] ?? 0) + 1;
        }
    }
    const dominantCategoryId =
        Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
        suggestion: {
            receiptId,
            confidenceLevel,
            merchant: merchantObj
                ? { id: merchantObj.id, name: receiptData.merchant, storeAddress: receiptData.storeAddress }
                : null,
            transactionDate: receiptData.transactionDate,
            totalAmount: receiptData.totalAmount,
            currency: receiptData.currency,
            taxAmount: receiptData.taxAmount,
            discountAmount: receiptData.discountAmount,
            suggestedNote: receiptData.suggestedNote,
            items: itemResults,
        },
        confidenceLevel,
        merchantId: merchantObj?.id ?? null,
        dominantCategoryId,
    };
}

/* ─── Controller ─── */

export const receiptsController = {
    /**
     * POST /receipts/upload
     * Accepts: multipart/form-data { image: File, transactionType?: string }
     * Returns: { receiptId, imageUrl }
     */
    upload: asyncHandler(async (req: Request, res: Response) => {
        if (!req.file) {
            throw new AppError("No image file provided", 400, "VALIDATION_ERROR");
        }

        // Upload to Cloudinary — persistent cloud storage, works on Railway
        const mimeType = getMimeType(req.file.originalname, req.file.mimetype);
        const imageUrl = await uploadToCloudinary(req.file.buffer, mimeType);
        const receipt = await receiptsRepo.create(imageUrl);

        res.status(201).json({
            success: true,
            data: { receiptId: receipt.id, imageUrl: receipt.image_url },
        });
    }),

    /**
     * POST /receipts/scan
     * Body: { receiptId: string, transactionType?: string }
     * Returns: { suggestion: TransactionSuggestion, confidenceLevel }
     */
    scan: asyncHandler(async (req: Request, res: Response) => {
        const receiptId = req.body.receiptId as string | undefined;
        const transactionType = (req.body.transactionType as string) ?? "expense";

        if (!receiptId) throw new AppError("receiptId is required", 400, "VALIDATION_ERROR");

        const receipt = await receiptsRepo.getById(receiptId);
        if (!receipt) throw new AppError("Receipt not found", 404, "RESOURCE_NOT_FOUND");

        // Mark as processing
        await receiptsRepo.updateOcrStatus(receiptId, "processing");

        try {
            // Download image from Cloudinary URL (replaces old disk read)
            const fetchRes = await fetch(receipt.image_url);
            if (!fetchRes.ok) throw new AppError("Image file not found", 404, "RESOURCE_NOT_FOUND");
            const arrayBuffer = await fetchRes.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            const mimeType = getMimeType(receipt.image_url, "image/jpeg");

            // Run AI pipeline
            const { suggestion, confidenceLevel, merchantId, dominantCategoryId } =
                await buildSuggestion({
                    receiptId,
                    imageBuffer,
                    mimeType,
                    transactionType,
                    persistItems: true,
                });

            // Update receipt to done
            await receiptsRepo.updateOcrStatus(receiptId, "done", {
                scanData: { extractedData: suggestion },
                merchantId,
                categoryId: dominantCategoryId,
            });

            sendSuccess(res, { suggestion, confidenceLevel });
        } catch (err) {
            // Silently try to mark receipt as error — never let this secondary DB call
            // mask the original error with a cascade failure.
            const code = err instanceof AppError ? err.code : "AI_PROCESSING_FAILED";
            if (code !== "RESOURCE_NOT_FOUND") {
                try {
                    await receiptsRepo.updateOcrStatus(receiptId, "error", {
                        scanData: { errorCode: code, errorDetail: String(err) },
                    });
                } catch {
                    // Ignore — the original error below is what the client needs to see
                }
            }

            if (process.env.NODE_ENV !== "production") {
                console.error("[receipts/scan] pipeline error:", err);
            }

            if (err instanceof AppError) throw err;
            throw new AppError(
                "Không thể đọc hóa đơn. Vui lòng thử lại hoặc nhập thủ công.",
                500,
                "AI_PROCESSING_FAILED",
            );
        }
    }),
};

export { buildSuggestion };
