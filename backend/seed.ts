/**
 * seed.ts — Seeds the categories table with default expense/income/etc. categories.
 * Safe to run multiple times — skips if categories already exist.
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
        // Check if already seeded
        const { rows } = await client.query(
            `SELECT COUNT(*) AS count FROM categories`,
        );
        const count = parseInt(rows[0].count, 10);
        if (count > 0) {
            console.log(`⚠  categories already has ${count} rows — skipping seed.`);
            return;
        }

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
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch((err) => {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
});
