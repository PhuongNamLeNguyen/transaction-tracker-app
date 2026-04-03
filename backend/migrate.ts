/**
 * migrate.ts — Runs all SQL migration files in order.
 * Usage: npm run migrate
 */
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error("❌ Migration failed: DATABASE_URL environment variable is not set.");
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Migrations folder is inside backend/database/migrations
const MIGRATIONS_DIR = path.resolve(__dirname, "database/migrations");
console.log(`📁 Migrations dir: ${MIGRATIONS_DIR}`);

async function migrate() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    }

    const client = await pool.connect();
    try {
        // Get all .sql files, sorted by filename
        const files = fs
            .readdirSync(MIGRATIONS_DIR)
            .filter((f) => f.endsWith(".sql") && !fs.statSync(path.join(MIGRATIONS_DIR, f)).isDirectory())
            .sort();

        console.log(`Running ${files.length} migration(s)...\n`);

        for (const file of files) {
            const filePath = path.join(MIGRATIONS_DIR, file);
            const sql = fs.readFileSync(filePath, "utf8");
            console.log(`▶  ${file}`);
            try {
                await client.query(sql);
                console.log(`   ✓ done\n`);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                // Ignore "already exists" errors — idempotent
                if (msg.includes("already exists")) {
                    console.log(`   ⚠  already exists, skipped\n`);
                } else {
                    throw err;
                }
            }
        }

        console.log("✅ All migrations complete.");
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch((err) => {
    console.error("❌ Migration failed:", err instanceof Error ? err.stack : String(err));
    process.exit(1);
});
