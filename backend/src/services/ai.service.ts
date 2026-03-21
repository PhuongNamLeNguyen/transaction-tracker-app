import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: contentBlocks }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI_PROCESSING_FAILED");

    try {
        const parsed = JSON.parse(jsonMatch[0]) as AiReceiptData;
        // Ensure items is always an array
        if (!Array.isArray(parsed.items)) parsed.items = [];
        return parsed;
    } catch {
        throw new Error("AI_PROCESSING_FAILED");
    }
}
