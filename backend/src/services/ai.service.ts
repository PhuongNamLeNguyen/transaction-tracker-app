import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { AppError } from "../utils/AppError";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey || apiKey.startsWith("sk-ant-...")) {
    console.warn("[ai.service] WARNING: ANTHROPIC_API_KEY is not set or is still a placeholder.");
}

const client = new Anthropic({ apiKey });

export interface AiReceiptItem {
    itemName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    predictedCategoryId: string | null;
    predictedCategoryName: string | null;
    confidenceScore: number;
}

export interface AiReceiptData {
    merchant: string | null;
    storeAddress: string | null;
    transactionDate: string | null;
    totalAmount: number | null;
    currency: string | null;
    taxAmount: number | null;
    discountAmount: number | null;
    items: AiReceiptItem[];
}

type SupportedImageMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const IMAGE_MIMES: SupportedImageMime[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Send a receipt image to Claude and extract structured transaction data
 * with per-item category predictions in a single API call.
 */
export async function parseReceiptWithCategories(
    imageBuffer: Buffer,
    mimeType: string,
    categories: { id: string; name: string }[],
): Promise<AiReceiptData> {
    const base64 = imageBuffer.toString("base64");

    const categoryList =
        categories.length > 0
            ? categories.map((c) => `- ${c.id}: ${c.name}`).join("\n")
            : "(no categories available — use null)";

    const prompt = `You are a receipt parser. Extract all transaction data from this receipt image.
For each item, predict the best matching category from the list below.

Available categories:
${categoryList}

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "merchant": "store name or null",
  "storeAddress": "address or null",
  "transactionDate": "ISO8601 datetime or null",
  "totalAmount": <number or null>,
  "currency": "currency code (e.g. VND, USD, JPY) or null",
  "taxAmount": <number or null>,
  "discountAmount": <number or null>,
  "items": [
    {
      "itemName": "item name",
      "quantity": <number>,
      "unitPrice": <number>,
      "subtotal": <number>,
      "predictedCategoryId": "uuid from the category list or null",
      "predictedCategoryName": "category name or null",
      "confidenceScore": <0.0 to 1.0>
    }
  ]
}

Rules:
- confidenceScore >= 0.85: strong keyword match
- confidenceScore 0.70-0.84: moderate match
- confidenceScore 0.30-0.69: weak/fallback match
- confidenceScore < 0.30: no match, set predictedCategoryId and predictedCategoryName to null
- If no items are visible, set items to []
- Never invent values not visible on the receipt`;

    const contentBlocks: Anthropic.MessageParam["content"] = [];

    if (mimeType === "application/pdf") {
        contentBlocks.push({
            type: "document",
            source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
            },
        } as unknown as Anthropic.ContentBlockParam);
    } else {
        const imgMime = IMAGE_MIMES.includes(mimeType as SupportedImageMime)
            ? (mimeType as SupportedImageMime)
            : "image/jpeg";
        contentBlocks.push({
            type: "image",
            source: { type: "base64", media_type: imgMime, data: base64 },
        });
    }

    contentBlocks.push({ type: "text", text: prompt });

    let response: Anthropic.Message;
    try {
        response = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2048,
            messages: [{ role: "user", content: contentBlocks }],
        });
    } catch (err) {
        if (err instanceof APIError) {
            // Extract the inner message from Anthropic's error body
            const body = err.error as { error?: { message?: string; type?: string } } | undefined;
            const innerMsg = body?.error?.message ?? err.message ?? "";
            const innerType = body?.error?.type ?? "";

            if (process.env.NODE_ENV !== "production") {
                console.error(`[ai.service] Anthropic API error — status=${err.status} type=${innerType} msg=${innerMsg}`);
            }

            // Credit / billing errors (status 400 + specific message)
            const isCreditError =
                err.status === 400 &&
                (innerMsg.toLowerCase().includes("credit balance") ||
                    innerMsg.toLowerCase().includes("too low"));
            if (isCreditError) {
                throw new AppError(
                    "Dịch vụ quét hóa đơn tạm thời không khả dụng (hết credit AI). Vui lòng nhập thủ công.",
                    503,
                    "AI_LIMIT_REACHED",
                );
            }

            // Rate limit
            if (err.status === 429) {
                throw new AppError(
                    "Đã đạt giới hạn quét hóa đơn. Vui lòng thử lại sau hoặc nhập thủ công.",
                    429,
                    "AI_LIMIT_REACHED",
                );
            }

            // Service unavailable / overloaded
            if (err.status === 529 || err.status === 502 || err.status === 503) {
                throw new AppError(
                    "Dịch vụ AI đang bận. Vui lòng thử lại sau hoặc nhập thủ công.",
                    503,
                    "THIRD_PARTY_ERROR",
                );
            }

            // Auth errors (invalid key)
            if (err.status === 401) {
                throw new AppError(
                    "API key không hợp lệ. Vui lòng kiểm tra ANTHROPIC_API_KEY trong .env.",
                    503,
                    "THIRD_PARTY_ERROR",
                );
            }
        }
        throw err;
    }

    const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";

    if (process.env.NODE_ENV !== "production") {
        console.log("[ai.service] Claude raw response:", text.slice(0, 500));
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error("[ai.service] No JSON found in Claude response");
        throw new Error("AI_PROCESSING_FAILED");
    }

    try {
        const parsed = JSON.parse(jsonMatch[0]) as AiReceiptData;
        // Ensure items is always an array
        if (!Array.isArray(parsed.items)) parsed.items = [];
        return parsed;
    } catch (parseErr) {
        console.error("[ai.service] JSON parse error:", parseErr);
        throw new Error("AI_PROCESSING_FAILED");
    }
}
