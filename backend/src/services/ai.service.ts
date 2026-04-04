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
    suggestedNote: string | null;
    items: AiReceiptItem[];
}

type SupportedImageMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/* ─── Currency normalisation ─────────────────────────────────────────────── */
const CURRENCY_SYMBOL_MAP: Record<string, string> = {
    "¥": "JPY",   // Ambiguous (also CNY) but JPY far more common on receipts
    "円": "JPY",
    "yen": "JPY",
    "jpy": "JPY",
    "$": "USD",
    "usd": "USD",
    "us$": "USD",
    "€": "EUR",
    "eur": "EUR",
    "£": "GBP",
    "gbp": "GBP",
    "₫": "VND",
    "vnd": "VND",
    "dong": "VND",
    "₩": "KRW",
    "krw": "KRW",
    "won": "KRW",
    "฿": "THB",
    "thb": "THB",
    "baht": "THB",
    "s$": "SGD",
    "sgd": "SGD",
    "rmb": "CNY",
    "cny": "CNY",
    "元": "CNY",
    "a$": "AUD",
    "aud": "AUD",
    "c$": "CAD",
    "cad": "CAD",
};

function normalizeCurrency(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Already a valid ISO 4217 three-letter code
    if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();
    const lower = trimmed.toLowerCase();
    return CURRENCY_SYMBOL_MAP[lower] ?? CURRENCY_SYMBOL_MAP[trimmed] ?? trimmed.toUpperCase().slice(0, 3);
}

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
    const currentYear = new Date().getFullYear();

    const categoryList =
        categories.length > 0
            ? categories.map((c) => `- ${c.id}: ${c.name}`).join("\n")
            : "(no categories available — use null)";

    const prompt = `You are a financial transaction data extractor. You can read:
1. Physical receipts and invoices
2. Screenshots of banking/wallet apps showing transaction history or a single transaction detail
3. Bank statements or digital payment screenshots (MoMo, ZaloPay, ViettelPay, VNPay, Shopee Pay, etc.)

For each item found, predict the best matching category from the list below.

Available categories:
${categoryList}

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "merchant": "For receipts: the store/brand name at the top. For bank/wallet screenshots: the payee, merchant, or transfer recipient name shown in the transaction. For utility bills: the issuing company. null only if truly unidentifiable.",
  "storeAddress": "address or null",
  "transactionDate": "ISO8601 datetime or date string (YYYY-MM-DDTHH:mm or YYYY-MM-DD). For transaction history screenshots with multiple entries, use the date of the MOST RECENT or MOST PROMINENT transaction. If only month and day are visible, use ${currentYear} as the year. null only if date is truly not determinable.",
  "totalAmount": "For receipts: the total amount paid. For bank/wallet screenshots: the transaction amount (use the amount of the most prominent/largest/most recent transaction if multiple are shown). For transfer screenshots: the transferred amount. null only if no amount visible.",
  "currency": "ISO 4217 three-letter code ONLY (e.g. VND, JPY, USD, KRW, EUR). Infer from app language/country if not printed. null only if truly unknown.",
  "taxAmount": <number or null>,
  "discountAmount": <number or null>,
  "suggestedNote": "short activity description in Vietnamese (1–5 words). Examples: receipt at restaurant → 'Ăn tối'; bank transfer → 'Chuyển khoản'; ATM withdrawal → 'Rút tiền ATM'; MoMo payment → 'Thanh toán MoMo'; top-up → 'Nạp tiền'; supermarket → 'Mua sắm'; coffee → 'Uống cà phê'; electricity bill → 'Tiền điện'. Match the language of the image if not Vietnamese.",
  "items": [
    {
      "itemName": "item or transaction description",
      "quantity": <number, default 1>,
      "unitPrice": <number>,
      "subtotal": <number>,
      "predictedCategoryId": "uuid from the category list or null",
      "predictedCategoryName": "category name or null",
      "confidenceScore": <0.0 to 1.0>
    }
  ]
}

Rules:
- For bank/wallet app screenshots showing a SINGLE transaction detail: extract that transaction's data directly
- For bank/wallet app screenshots showing a TRANSACTION LIST: pick the most recent or most prominent single transaction
- items = [] is acceptable for simple transfers, ATM withdrawals, or utility payments with no itemized breakdown
- If items is empty but totalAmount is known, that is valid — do NOT invent items
- confidenceScore >= 0.85: strong keyword match; 0.70–0.84: moderate; 0.30–0.69: weak; < 0.30: null IDs
- Never invent values not visible in the image
- suggestedNote must describe the ACTIVITY, not list items`;

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
        // Normalize currency to ISO 4217 (handle symbols like ¥, 円, $, etc.)
        parsed.currency = normalizeCurrency(parsed.currency);
        return parsed;
    } catch (parseErr) {
        console.error("[ai.service] JSON parse error:", parseErr);
        throw new Error("AI_PROCESSING_FAILED");
    }
}
