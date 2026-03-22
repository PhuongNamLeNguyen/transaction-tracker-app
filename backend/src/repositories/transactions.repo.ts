import { query, pool } from "../db/client";
import type { PoolClient } from "pg";

/* Recalculate accounts.balance from all confirmed, non-deleted transactions */
async function recalcBalance(userId: string, client: PoolClient) {
    await client.query(
        `UPDATE accounts
         SET    balance = (
             SELECT COALESCE(SUM(
                 CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END
             ), 0)
             FROM   transactions t
             WHERE  t.user_id    = $1
               AND  t.status     = 'confirmed'
               AND  t.deleted_at IS NULL
         )
         WHERE  user_id = $1`,
        [userId],
    );
}

export const transactionsRepo = {
    /* ─── List transactions — year/month are optional ─── */
    list: async (
        userId: string,
        year?: number,
        month?: number,
        type?: string,
        categoryId?: string,
    ) => {
        const params: unknown[] = [userId];
        let dateClause = "";
        let typeClause = "";
        let categoryClause = "";

        if (year != null) {
            params.push(year);
            dateClause = `AND EXTRACT(YEAR FROM t.transaction_date) = $${params.length}`;
            if (month != null) {
                params.push(month);
                dateClause += `\n               AND EXTRACT(MONTH FROM t.transaction_date) = $${params.length}`;
            }
        }
        if (type) {
            params.push(type);
            typeClause = `AND t.type = $${params.length}`;
        }
        if (categoryId) {
            params.push(categoryId);
            categoryClause = `AND EXISTS (
                SELECT 1 FROM transaction_splits ts2
                WHERE ts2.transaction_id = t.id
                  AND ts2.category_id = $${params.length}
                  AND ts2.deleted_at IS NULL
            )`;
        }

        const result = await query(
            `SELECT
               t.id,
               t.type,
               t.amount,
               t.currency,
               t.transaction_date,
               t.created_at,
               t.note,
               t.source,
               m.name                                          AS merchant_name,
               COUNT(ts.id)                                    AS split_count,
               CASE WHEN COUNT(ts.id) = 1 THEN MIN(c.name) END AS category_name,
               CASE WHEN COUNT(ts.id) = 1 THEN MIN(c.icon) END AS category_icon
             FROM   transactions t
             LEFT JOIN merchants m           ON t.merchant_id      = m.id
             LEFT JOIN transaction_splits ts ON ts.transaction_id  = t.id AND ts.deleted_at IS NULL
             LEFT JOIN categories c          ON ts.category_id     = c.id
             WHERE  t.user_id    = $1
               AND  t.status     = 'confirmed'
               AND  t.deleted_at IS NULL
               ${dateClause}
               ${typeClause}
               ${categoryClause}
             GROUP BY t.id, t.transaction_date, t.created_at, t.type,
                      t.amount, t.currency, t.note, t.source, m.name
             ORDER BY t.transaction_date DESC, t.created_at DESC`,
            params,
        );
        return result.rows;
    },

    /* ─── Single transaction with splits + category + receipt ─── */
    getById: async (userId: string, id: string) => {
        const txResult = await query(
            `SELECT
               t.id,
               t.type,
               t.amount,
               t.currency,
               t.transaction_date,
               t.created_at,
               t.note,
               t.source,
               m.name AS merchant_name,
               r.image_url AS receipt_image_url
             FROM   transactions t
             LEFT JOIN merchants m  ON t.merchant_id   = m.id
             LEFT JOIN receipts   r ON r.transaction_id = t.id
             WHERE  t.id       = $1
               AND  t.user_id  = $2
               AND  t.deleted_at IS NULL`,
            [id, userId],
        );
        if (!txResult.rows[0]) return null;

        const splitsResult = await query(
            `SELECT
               ts.id,
               ts.amount,
               c.id   AS category_id,
               c.name AS category_name,
               c.icon AS category_icon
             FROM   transaction_splits ts
             JOIN   categories c ON ts.category_id = c.id
             WHERE  ts.transaction_id = $1
               AND  ts.deleted_at     IS NULL
             ORDER BY ts.amount DESC`,
            [id],
        );

        return {
            ...txResult.rows[0],
            splits: splitsResult.rows,
        };
    },

    /* ─── Categories filtered by type (for the filter dropdown) ─── */
    getCategoriesByType: async (type: string) => {
        const result = await query(
            `SELECT id, name, icon, type
             FROM   categories
             WHERE  type = $1
             ORDER BY name`,
            [type],
        );
        return result.rows;
    },

    /* ─── Get (or create) user's primary account ─── */
    getUserAccount: async (userId: string) => {
        const existing = await query(
            `SELECT id, currency, balance FROM accounts WHERE user_id = $1 LIMIT 1`,
            [userId],
        );
        if (existing.rows[0]) return existing.rows[0];

        // No account yet — derive currency from user_settings, default to VND
        const settings = await query(
            `SELECT target_currency FROM user_settings WHERE user_id = $1 LIMIT 1`,
            [userId],
        );
        const currency = settings.rows[0]?.target_currency ?? "VND";

        const created = await query(
            `INSERT INTO accounts (user_id, name, type, currency, balance)
             VALUES ($1, 'Ví chính', 'wallet', $2, 0)
             RETURNING id, currency, balance`,
            [userId, currency],
        );
        return created.rows[0];
    },

    /* ─── Create a receipt-scan transaction with multiple splits (pg transaction) ─── */
    createFromReceipt: async (params: {
        userId: string;
        accountId: string;
        type: string;
        amount: number;
        currency: string;
        transactionDate: string;
        receiptId: string;
        note?: string;
        items: { categoryId: string; amount: number }[];
    }) => {
        const { userId, accountId, type, amount, currency, transactionDate, receiptId, note, items } =
            params;
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            const txResult = await client.query(
                `INSERT INTO transactions
                   (user_id, account_id, type, amount, currency, status, source, transaction_date, note)
                 VALUES ($1, $2, $3, $4, $5, 'confirmed', 'receipt_scan', $6, $7)
                 RETURNING id, type, amount, currency, transaction_date, note, created_at`,
                [userId, accountId, type, amount, currency, transactionDate, note ?? null],
            );
            const tx = txResult.rows[0];

            for (const item of items) {
                await client.query(
                    `INSERT INTO transaction_splits (transaction_id, category_id, amount)
                     VALUES ($1, $2, $3)`,
                    [tx.id, item.categoryId, item.amount],
                );
            }

            await client.query(`UPDATE receipts SET transaction_id = $1 WHERE id = $2`, [
                tx.id,
                receiptId,
            ]);

            await recalcBalance(userId, client);
            await client.query("COMMIT");
            return tx;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    },

    /* ─── Soft-delete a transaction (sets deleted_at = now()) + recalc balance ─── */
    softDeleteTransaction: async (userId: string, transactionId: string) => {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const result = await client.query(
                `UPDATE transactions
                 SET    deleted_at = now()
                 WHERE  id         = $1
                   AND  user_id    = $2
                   AND  deleted_at IS NULL
                 RETURNING id`,
                [transactionId, userId],
            );
            if (result.rows[0]) {
                await recalcBalance(userId, client);
            }
            await client.query("COMMIT");
            return result.rows[0] ?? null;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    },

    /* ─── Soft-delete a split (sets deleted_at = now()) ─── */
    softDeleteSplit: async (userId: string, transactionId: string, splitId: string) => {
        const result = await query(
            `UPDATE transaction_splits ts
             SET    deleted_at = now()
             FROM   transactions t
             WHERE  ts.id             = $1
               AND  ts.transaction_id = $2
               AND  ts.deleted_at     IS NULL
               AND  t.id              = ts.transaction_id
               AND  t.user_id         = $3
             RETURNING ts.id`,
            [splitId, transactionId, userId],
        );
        return result.rows[0] ?? null;
    },

    /* ─── Hard-delete a single split (must already be soft-deleted) ─── */
    hardDeleteSplit: async (userId: string, transactionId: string, splitId: string) => {
        const result = await query(
            `DELETE FROM transaction_splits ts
             USING transactions t
             WHERE  ts.id             = $1
               AND  ts.transaction_id = $2
               AND  ts.deleted_at     IS NOT NULL
               AND  t.id              = ts.transaction_id
               AND  t.user_id         = $3
             RETURNING ts.id`,
            [splitId, transactionId, userId],
        );
        return result.rows[0] ?? null;
    },

    /* ─── Bulk hard-delete splits (must all be soft-deleted and belong to user) ─── */
    bulkHardDeleteSplits: async (userId: string, splitIds: string[]) => {
        if (splitIds.length === 0) return 0;
        const result = await query(
            `DELETE FROM transaction_splits ts
             USING transactions t
             WHERE  ts.id         = ANY($1::uuid[])
               AND  ts.deleted_at IS NOT NULL
               AND  t.id          = ts.transaction_id
               AND  t.user_id     = $2`,
            [splitIds, userId],
        );
        return result.rowCount ?? 0;
    },

    /* ─── Restore a single soft-deleted split ─── */
    restoreSplit: async (userId: string, transactionId: string, splitId: string) => {
        const result = await query(
            `UPDATE transaction_splits ts
             SET    deleted_at = NULL, updated_at = now()
             FROM   transactions t
             WHERE  ts.id             = $1
               AND  ts.transaction_id = $2
               AND  ts.deleted_at     IS NOT NULL
               AND  t.id              = ts.transaction_id
               AND  t.user_id         = $3
             RETURNING ts.id`,
            [splitId, transactionId, userId],
        );
        return result.rows[0] ?? null;
    },

    /* ─── Bulk restore soft-deleted splits ─── */
    bulkRestoreSplits: async (userId: string, splitIds: string[]) => {
        if (splitIds.length === 0) return 0;
        const result = await query(
            `UPDATE transaction_splits ts
             SET    deleted_at = NULL, updated_at = now()
             FROM   transactions t
             WHERE  ts.id         = ANY($1::uuid[])
               AND  ts.deleted_at IS NOT NULL
               AND  t.id          = ts.transaction_id
               AND  t.user_id     = $2`,
            [splitIds, userId],
        );
        return result.rowCount ?? 0;
    },

    /* ─── List all soft-deleted transactions for a user ─── */
    getDeletedTransactions: async (userId: string) => {
        const result = await query(
            `SELECT  t.id,
                     t.type            AS transaction_type,
                     t.amount,
                     t.currency,
                     t.transaction_date,
                     t.note,
                     t.deleted_at
             FROM   transactions t
             WHERE  t.user_id    = $1
               AND  t.deleted_at IS NOT NULL
             ORDER BY t.deleted_at DESC`,
            [userId],
        );
        return result.rows;
    },

    /* ─── Restore a soft-deleted transaction + recalc balance ─── */
    restoreTransaction: async (userId: string, transactionId: string) => {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const result = await client.query(
                `UPDATE transactions
                 SET    deleted_at = NULL
                 WHERE  id         = $1
                   AND  user_id    = $2
                   AND  deleted_at IS NOT NULL
                 RETURNING id`,
                [transactionId, userId],
            );
            if (result.rows[0]) {
                await recalcBalance(userId, client);
            }
            await client.query("COMMIT");
            return result.rows[0] ?? null;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    },

    /* ─── Hard-delete a soft-deleted transaction (with its splits) ─── */
    hardDeleteTransaction: async (userId: string, transactionId: string) => {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(
                `DELETE FROM transaction_splits WHERE transaction_id = $1`,
                [transactionId],
            );
            const result = await client.query(
                `DELETE FROM transactions
                 WHERE  id         = $1
                   AND  user_id    = $2
                   AND  deleted_at IS NOT NULL
                 RETURNING id`,
                [transactionId, userId],
            );
            await client.query("COMMIT");
            return result.rows[0] ?? null;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    },

    /* ─── List all soft-deleted splits for a user ─── */
    getDeletedSplits: async (userId: string) => {
        const result = await query(
            `SELECT
               ts.id,
               ts.amount,
               ts.deleted_at,
               ts.transaction_id,
               t.type            AS transaction_type,
               t.currency,
               t.transaction_date,
               c.id              AS category_id,
               c.name            AS category_name,
               c.icon            AS category_icon
             FROM   transaction_splits ts
             JOIN   transactions t  ON t.id  = ts.transaction_id
             JOIN   categories   c  ON c.id  = ts.category_id
             WHERE  t.user_id     = $1
               AND  ts.deleted_at IS NOT NULL
               AND  t.deleted_at  IS NULL
             ORDER BY ts.deleted_at DESC`,
            [userId],
        );
        return result.rows;
    },

    /* ─── Create a manual transaction with a single split + recalc balance ─── */
    create: async (params: {
        userId: string;
        accountId: string;
        type: string;
        amount: number;
        currency: string;
        transactionDate: string;
        categoryId: string;
        note?: string;
    }) => {
        const { userId, accountId, type, amount, currency, transactionDate, categoryId, note } = params;
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const txResult = await client.query(
                `INSERT INTO transactions
                   (user_id, account_id, type, amount, currency, status, source, transaction_date, note)
                 VALUES ($1, $2, $3, $4, $5, 'confirmed', 'manual', $6, $7)
                 RETURNING id, type, amount, currency, transaction_date, note, created_at`,
                [userId, accountId, type, amount, currency, transactionDate, note ?? null],
            );
            const tx = txResult.rows[0];
            await client.query(
                `INSERT INTO transaction_splits (transaction_id, category_id, amount)
                 VALUES ($1, $2, $3)`,
                [tx.id, categoryId, amount],
            );
            await recalcBalance(userId, client);
            await client.query("COMMIT");
            return tx;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    },
};
