import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { receiptsRepo } from "../repositories/receipts.repo";
import { parseReceiptWithCategories } from "../services/ai.service";

/* ─── Multer config: disk storage ─── */

const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/heic", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path.join(process.cwd(), "uploads", "receipts");
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const MIME_TO_EXT: Record<string, string> = {
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
            "image/heic": ".heic",
            "application/pdf": ".pdf",
        };
        const ext = MIME_TO_EXT[file.mimetype] ?? ".jpg";
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
});

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

export const receiptUpload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

/* ─── Helpers ─── */

function getMimeType(filePath: string): string {
    const map: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".heic": "image/jpeg", // treat as JPEG for Claude (best effort)
        ".pdf": "application/pdf",
    };
    return map[path.extname(filePath).toLowerCase()] ?? "image/jpeg";
}

function buildImageUrl(filename: string): string {
    const base = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
    return `${base}/uploads/receipts/${filename}`;
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

    if (!receiptData.totalAmount && receiptData.items.length === 0 && !receiptData.merchant && !receiptData.suggestedNote) {
        throw new AppError(
            "No transaction details found. Please upload a receipt or invoice.",
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

        const imageUrl = buildImageUrl(req.file.filename);
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
            // Read the image file from disk
            const filename = path.basename(receipt.image_url);
            const filePath = path.join(process.cwd(), "uploads", "receipts", filename);

            if (!fs.existsSync(filePath)) {
                throw new AppError("Image file not found on server", 404, "RESOURCE_NOT_FOUND");
            }

            const imageBuffer = fs.readFileSync(filePath);
            const mimeType = getMimeType(filePath);

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
