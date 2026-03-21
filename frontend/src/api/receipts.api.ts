import { getToken } from "@/utils/token-utils";
import { config } from "@/utils/config";

const BASE = config.apiBaseUrl;

const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
});

/* ─── Types ─── */

export interface UploadReceiptResponse {
    receiptId: string;
    imageUrl: string;
}

export interface ItemPrediction {
    categoryId: string | null;
    categoryName: string | null;
    confidenceScore: number;
    lowConfidence: boolean;
}

export interface SuggestionItem {
    receiptItemId: string | null;
    itemName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    prediction: ItemPrediction;
}

export interface TransactionSuggestion {
    receiptId: string | null;
    confidenceLevel: "high" | "low";
    merchant: {
        id: string;
        name: string;
        storeAddress: string | null;
    } | null;
    transactionDate: string | null;
    totalAmount: number | null;
    currency: string | null;
    taxAmount: number | null;
    discountAmount: number | null;
    items: SuggestionItem[];
}

export interface ScanReceiptResponse {
    suggestion: TransactionSuggestion;
    confidenceLevel: "high" | "low";
}

/* ─── API ─── */

export const receiptsApi = {
    /**
     * POST /receipts/upload
     * Upload a receipt image to the server.
     * Returns receiptId + imageUrl for use with scanReceipt or extractByUrl.
     */
    async upload(file: File, transactionType?: string): Promise<UploadReceiptResponse> {
        const form = new FormData();
        form.append("image", file);
        if (transactionType) form.append("transactionType", transactionType);

        const res = await fetch(`${BASE}/receipts/upload`, {
            method: "POST",
            headers: authHeaders(),
            credentials: "include",
            body: form,
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data as UploadReceiptResponse;
    },

    /**
     * POST /receipts/scan
     * Trigger AI OCR + category extraction for an already-uploaded receipt.
     * Returns TransactionSuggestion for user review.
     */
    async scan(receiptId: string, transactionType?: string): Promise<ScanReceiptResponse> {
        const res = await fetch(`${BASE}/receipts/scan`, {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ receiptId, transactionType }),
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data as ScanReceiptResponse;
    },

    /**
     * POST /ai/extract-by-url
     * Run AI extraction on an image URL (after upload).
     */
    async extractByUrl(imageUrl: string, transactionType?: string): Promise<ScanReceiptResponse> {
        const res = await fetch(`${BASE}/ai/extract-by-url`, {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ image_url: imageUrl, transaction_type: transactionType ?? "expense" }),
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data as ScanReceiptResponse;
    },

    /**
     * POST /ai/extract-receipt
     * Direct upload + AI extraction in one request (no pre-upload needed).
     * Returns TransactionSuggestion for user review.
     */
    async extractReceipt(file: File, transactionType?: string): Promise<ScanReceiptResponse> {
        const form = new FormData();
        form.append("file", file);
        if (transactionType) form.append("transaction_type", transactionType);

        const res = await fetch(`${BASE}/ai/extract-receipt`, {
            method: "POST",
            headers: authHeaders(),
            credentials: "include",
            body: form,
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data as ScanReceiptResponse;
    },

    /**
     * Convenience: upload image then immediately scan it (two-step flow).
     * Shows progress via callbacks.
     */
    async uploadAndScan(
        file: File,
        transactionType: string,
        onUploaded?: (receiptId: string, imageUrl: string) => void,
    ): Promise<ScanReceiptResponse> {
        const { receiptId, imageUrl } = await receiptsApi.upload(file, transactionType);
        onUploaded?.(receiptId, imageUrl);
        return receiptsApi.scan(receiptId, transactionType);
    },
};
