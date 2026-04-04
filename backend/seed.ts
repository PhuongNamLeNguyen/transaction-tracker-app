/**
 * seed.ts — Seeds categories and exchange_rates tables.
 * Safe to run multiple times — idempotent on both tables.
 * Usage: npm run seed
 */
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/* ─── Category data ─────────────────────────────────────────── */

const EXPENSE_CATEGORIES = [
    { name: "Ăn uống",       icon: "restaurant" },
    { name: "Di chuyển",     icon: "directions_car" },
    { name: "Phí sinh hoạt", icon: "home" },
    { name: "Giáo dục",      icon: "menu_book" },
    { name: "Thời trang",    icon: "checkroom" },
    { name: "Sức khỏe",      icon: "favorite" },
    { name: "Quà tặng",      icon: "card_giftcard" },
    { name: "Giải trí",      icon: "celebration" },
    { name: "Thú cưng",      icon: "pets" },
    { name: "Khác",           icon: "more_horiz" },
];

const INCOME_CATEGORIES = [
    { name: "Lương",    icon: "work" },
    { name: "Thưởng",   icon: "star" },
    { name: "Quà tặng", icon: "card_giftcard" },
];

const INVESTMENT_CATEGORIES = [
    { name: "Mua vàng",                    icon: "paid" },
    { name: "Mua bất động sản",            icon: "apartment" },
    { name: "Mua chứng khoán / cổ phiếu", icon: "trending_up" },
    { name: "Kinh doanh",                  icon: "store" },
];

const SAVING_CATEGORIES = [
    { name: "Gửi tiết kiệm cá nhân", icon: "savings" },
    { name: "Đóng bảo hiểm dài hạn", icon: "security" },
];

/* ─── Seed ──────────────────────────────────────────────────── */

async function seed() {
    const client = await pool.connect();
    try {
        // Categories — skip insert if already populated, but always fall through to exchange rates
        const { rows } = await client.query(
            `SELECT COUNT(*) AS count FROM categories`,
        );
        const count = parseInt(rows[0].count, 10);
        if (count > 0) {
            console.log(`⚠  categories already has ${count} rows — skipping category seed.`);
        } else {
            await client.query("BEGIN");

            const allCategories = [
                ...EXPENSE_CATEGORIES.map((c) => ({ ...c, type: "expense" })),
                ...INCOME_CATEGORIES.map((c) => ({ ...c, type: "income" })),
                ...INVESTMENT_CATEGORIES.map((c) => ({ ...c, type: "investment" })),
                ...SAVING_CATEGORIES.map((c) => ({ ...c, type: "saving" })),
            ];

            for (const cat of allCategories) {
                await client.query(
                    `INSERT INTO categories (name, type, icon) VALUES ($1, $2, $3)`,
                    [cat.name, cat.type, cat.icon],
                );
            }

            await client.query("COMMIT");
            console.log(`✅ Seeded ${allCategories.length} categories.`);
        }

        // Exchange rates — always upsert (idempotent, safe to run on every deploy)
        await seedExchangeRates(client);
    } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

/* ─── Exchange rates ──────────────────────────────────────────── */

const EXCHANGE_RATES: { base: string; target: string; rate: number }[] = [
    // JPY → others
    { base: "JPY", target: "VND", rate: 160.00 },
    { base: "JPY", target: "USD", rate: 0.0067 },
    { base: "JPY", target: "EUR", rate: 0.0061 },
    { base: "JPY", target: "THB", rate: 0.24 },
    { base: "JPY", target: "SGD", rate: 0.0089 },
    { base: "JPY", target: "KRW", rate: 8.80 },
    { base: "JPY", target: "GBP", rate: 0.0053 },
    // others → JPY
    { base: "VND", target: "JPY", rate: 0.00625 },
    { base: "USD", target: "JPY", rate: 149.50 },
    { base: "EUR", target: "JPY", rate: 163.00 },
    { base: "THB", target: "JPY", rate: 4.15 },
    { base: "SGD", target: "JPY", rate: 112.00 },
    { base: "KRW", target: "JPY", rate: 0.1136 },
    { base: "GBP", target: "JPY", rate: 189.00 },
    // common cross-rates (VND base)
    { base: "USD", target: "VND", rate: 25300.00 },
    { base: "VND", target: "USD", rate: 0.0000395 },
    { base: "EUR", target: "VND", rate: 27500.00 },
    { base: "VND", target: "EUR", rate: 0.0000364 },
    { base: "GBP", target: "VND", rate: 32000.00 },
    { base: "VND", target: "GBP", rate: 0.0000313 },
    { base: "SGD", target: "VND", rate: 18900.00 },
    { base: "VND", target: "SGD", rate: 0.0000529 },
    { base: "THB", target: "VND", rate: 700.00 },
    { base: "VND", target: "THB", rate: 0.00143 },
    { base: "KRW", target: "VND", rate: 18.00 },
    { base: "VND", target: "KRW", rate: 0.0556 },
    { base: "CNY", target: "VND", rate: 3500.00 },
    { base: "VND", target: "CNY", rate: 0.000286 },
    { base: "AUD", target: "VND", rate: 16000.00 },
    { base: "VND", target: "AUD", rate: 0.0000625 },
];

async function seedExchangeRates(client: import("pg").PoolClient) {
    for (const { base, target, rate } of EXCHANGE_RATES) {
        await client.query(
            `INSERT INTO exchange_rates (base_currency, target_currency, rate, updated_at)
             VALUES ($1, $2, $3, now())
             ON CONFLICT (base_currency, target_currency)
             DO UPDATE SET rate = EXCLUDED.rate, updated_at = now()`,
            [base, target, rate],
        );
    }
    console.log(`✅ Seeded ${EXCHANGE_RATES.length} exchange rate pairs.`);
}

seed().catch((err) => {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
});
