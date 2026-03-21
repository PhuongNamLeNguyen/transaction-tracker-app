import { query } from "../db/client";

export const transactionsRepo = {
    /* ─── List transactions for a given month ─── */
    listByMonth: async (
        userId: string,
        year: number,
        month: number,
        type?: string,
        categoryId?: string,
    ) => {
        const params: unknown[] = [userId, year, month];
        let typeClause = "";
        let categoryClause = "";

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
               AND  EXTRACT(YEAR  FROM t.transaction_date) = $2
               AND  EXTRACT(MONTH FROM t.transaction_date) = $3
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
};
