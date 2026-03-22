import { Request, Response } from "express";
import multer from "multer";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { receiptsRepo } from "../repositories/receipts.repo";
import { parseReceiptWithCategories } from "../services/ai.service";

/* ─── Multer: memory storage (no file saved to disk) ─── */

const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/heic", "application/pdf"];

export const aiUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
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
    },
});

/* ─── Shared extraction logic ─── */

async function runExtraction(
    imageBuffer: Buffer,
    mimeType: string,
    transactionType: string,
): Promise<{ suggestion: object; confidenceLevel: string }> {
    const categories = await receiptsRepo.getCategoriesByType(transactionType);
    const receiptData = await parseReceiptWithCategories(imageBuffer, mimeType, categories);

    if (!receiptData.totalAmount && receiptData.items.length === 0) {
        throw new AppError(
            "No transaction details found. Please upload a receipt or invoice.",
            400,
            "AI_NOT_A_RECEIPT",
        );
    }

    let merchantObj: { id: string; name: string; default_category_id: string | null } | null = null;
    if (receiptData.merchant) {
        merchantObj = await receiptsRepo.getOrCreateMerchant(receiptData.merchant);
    }

    const itemResults = receiptData.items.map((item) => {
        const highConfidence = item.confidenceScore >= 0.7;
        return {
            receiptItemId: null,
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
        };
    });

    const confidenceLevel = itemResults.every((i) => !i.prediction.lowConfidence) ? "high" : "low";

    const suggestion = {
        receiptId: null,
        confidenceLevel,
        merchant: merchantObj
            ? { id: merchantObj.id, name: merchantObj.name, storeAddress: receiptData.storeAddress }
            : null,
        transactionDate: receiptData.transactionDate,
        totalAmount: receiptData.totalAmount,
        currency: receiptData.currency,
        taxAmount: receiptData.taxAmount,
        discountAmount: receiptData.discountAmount,
        suggestedNote: receiptData.suggestedNote ?? null,
        items: itemResults,
    };

    return { suggestion, confidenceLevel };
}

/* ─── Controller ─── */

export const aiController = {
    /**
     * POST /ai/extract-by-url
     * Body: { image_url: string, transaction_type?: string }
     * Returns: { suggestion: TransactionSuggestion, confidenceLevel }
     */
    extractByUrl: asyncHandler(async (req: Request, res: Response) => {
        const { image_url, transaction_type } = req.body as {
            image_url?: string;
            transaction_type?: string;
        };

        if (!image_url) throw new AppError("image_url is required", 400, "VALIDATION_ERROR");

        const txType = transaction_type ?? "expense";

        // Try to find an existing receipt row for this URL
        const receipt = await receiptsRepo.getByImageUrl(image_url);
        if (receipt) {
            await receiptsRepo.updateOcrStatus(receipt.id, "processing");
        }

        try {
            // Fetch the image
            const fetchRes = await fetch(image_url);
            if (!fetchRes.ok) {
                throw new AppError("Failed to fetch image from the provided URL.", 502, "THIRD_PARTY_ERROR");
            }
            const arrayBuffer = await fetchRes.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            const contentType = (fetchRes.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();

            let { suggestion, confidenceLevel } = await runExtraction(imageBuffer, contentType, txType);

            // Attach receiptId if we found one
            if (receipt) {
                (suggestion as Record<string, unknown>).receiptId = receipt.id;
                await receiptsRepo.updateOcrStatus(receipt.id, "done", {
                    scanData: { extractedData: suggestion },
                });
            }

            sendSuccess(res, { suggestion, confidenceLevel });
        } catch (err) {
            if (receipt) {
                try {
                    await receiptsRepo.updateOcrStatus(receipt.id, "error", {
                        scanData: {
                            errorCode: err instanceof AppError ? err.code : "AI_PROCESSING_FAILED",
                            errorDetail: String(err),
                        },
                    });
                } catch { /* ignore secondary failure */ }
            }
            if (process.env.NODE_ENV !== "production") {
                console.error("[ai/extract-by-url] error:", err);
            }
            if (err instanceof AppError) throw err;
            throw new AppError(
                "Không thể đọc hóa đơn. Vui lòng thử lại hoặc nhập thủ công.",
                500,
                "AI_PROCESSING_FAILED",
            );
        }
    }),

    /**
     * POST /ai/extract-receipt
     * Multipart: { file: File, transaction_type?: string }
     * Returns: { suggestion: TransactionSuggestion, confidenceLevel }
     */
    extractReceipt: asyncHandler(async (req: Request, res: Response) => {
        if (!req.file) throw new AppError("No file provided", 400, "VALIDATION_ERROR");

        const txType = (req.body.transaction_type as string) ?? "expense";

        try {
            const { suggestion, confidenceLevel } = await runExtraction(
                req.file.buffer,
                req.file.mimetype,
                txType,
            );
            sendSuccess(res, { suggestion, confidenceLevel });
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError(
                "Something went wrong reading your receipt. Please try again or use manual entry.",
                500,
                "AI_PROCESSING_FAILED",
            );
        }
    }),
};
