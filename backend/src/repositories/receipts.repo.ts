import { query } from "../db/client";

export const receiptsRepo = {
    /* ─── Create a new receipt record ─── */
    create: async (imageUrl: string): Promise<{ id: string; image_url: string; ocr_status: string }> => {
        const result = await query(
            `INSERT INTO receipts (image_url, ocr_status)
             VALUES ($1, 'pending')
             RETURNING id, image_url, ocr_status`,
            [imageUrl],
        );
        return result.rows[0];
    },

    /* ─── Fetch receipt by ID ─── */
    getById: async (id: string) => {
        const result = await query(
            `SELECT r.id, r.image_url, r.ocr_status, r.scan_data,
                    r.merchant_id, r.category_id, r.transaction_id,
                    m.name AS merchant_name
             FROM   receipts r
             LEFT JOIN merchants m ON r.merchant_id = m.id
             WHERE  r.id = $1`,
            [id],
        );
        return result.rows[0] ?? null;
    },

    /* ─── Fetch receipt by image URL ─── */
    getByImageUrl: async (imageUrl: string) => {
        const result = await query(
            `SELECT id, image_url, ocr_status, merchant_id, transaction_id
             FROM   receipts
             WHERE  image_url = $1
             LIMIT  1`,
            [imageUrl],
        );
        return result.rows[0] ?? null;
    },

    /* ─── Update OCR status and optional fields ─── */
    updateOcrStatus: async (
        id: string,
        status: "pending" | "processing" | "done" | "error",
        extra?: {
            scanData?: Record<string, unknown>;
            merchantId?: string | null;
            categoryId?: string | null;
            transactionId?: string | null;
        },
    ) => {
        const sets: string[] = ["ocr_status = $2", "updated_at = now()"];
        const params: unknown[] = [id, status];

        if (extra?.scanData !== undefined) {
            params.push(JSON.stringify(extra.scanData));
            sets.push(`scan_data = $${params.length}`);
        }
        if (extra?.merchantId !== undefined) {
            params.push(extra.merchantId);
            sets.push(`merchant_id = $${params.length}`);
        }
        if (extra?.categoryId !== undefined) {
            params.push(extra.categoryId);
            sets.push(`category_id = $${params.length}`);
        }
        if (extra?.transactionId !== undefined) {
            params.push(extra.transactionId);
            sets.push(`transaction_id = $${params.length}`);
        }

        await query(`UPDATE receipts SET ${sets.join(", ")} WHERE id = $1`, params);
    },

    /* ─── Insert a receipt line item ─── */
    createItem: async (params: {
        receiptId: string;
        itemName: string;
        price: number;
        quantity: number;
    }): Promise<{ id: string }> => {
        const result = await query(
            `INSERT INTO receipt_items (receipt_id, item_name, price, quantity)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [params.receiptId, params.itemName, params.price, params.quantity],
        );
        return result.rows[0];
    },

    /* ─── Insert an AI prediction for a receipt item ─── */
    createAiPrediction: async (params: {
        receiptItemId: string;
        predictedCategoryId: string | null;
        confidenceScore: number;
        modelVersion: string;
    }) => {
        await query(
            `INSERT INTO ai_predictions (receipt_item_id, predicted_category_id, confidence_score, model_version)
             VALUES ($1, $2, $3, $4)`,
            [params.receiptItemId, params.predictedCategoryId, params.confidenceScore, params.modelVersion],
        );
    },

    /* ─── Get categories by transaction type ─── */
    getCategoriesByType: async (type: string): Promise<{ id: string; name: string }[]> => {
        const result = await query(
            `SELECT id, name FROM categories WHERE type = $1 ORDER BY name`,
            [type],
        );
        return result.rows;
    },

    /* ─── Resolve or create a merchant by name ─── */
    getOrCreateMerchant: async (name: string): Promise<{
        id: string;
        name: string;
        default_category_id: string | null;
    }> => {
        const normalized = name
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .trim();

        const existing = await query(
            `SELECT m.id, m.name, m.default_category_id
             FROM   merchants m
             WHERE  m.normalized_name = $1
             UNION
             SELECT m.id, m.name, m.default_category_id
             FROM   merchants m
             JOIN   merchant_aliases ma ON ma.merchant_id = m.id
             WHERE  ma.alias_name = $1
             LIMIT  1`,
            [normalized],
        );
        if (existing.rows[0]) return existing.rows[0];

        const created = await query(
            `INSERT INTO merchants (name, normalized_name)
             VALUES ($1, $2)
             RETURNING id, name, default_category_id`,
            [name, normalized],
        );
        return created.rows[0];
    },
};
