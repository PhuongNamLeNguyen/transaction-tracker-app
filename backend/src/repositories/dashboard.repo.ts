import { query } from "../db/client";

export const dashboardRepo = {
    /* ─── Active period ─── */
    getActivePeriod: async (userId: string) => {
        const result = await query(
            `SELECT id, start_date, end_date
             FROM   budget_periods
             WHERE  user_id    = $1
               AND  start_date <= CURRENT_DATE
               AND  end_date   >= CURRENT_DATE
             LIMIT 1`,
            [userId],
        );
        return result.rows[0] ?? null;
    },

    /* ─── Type totals for the period ─── */
    getSummary: async (userId: string, periodId: string) => {
        const result = await query(
            `SELECT t.type, SUM(t.amount) AS total
             FROM   transactions t
             JOIN   budget_periods bp ON bp.id = $2
             WHERE  t.user_id         = $1
               AND  t.status          = 'confirmed'
               AND  t.deleted_at      IS NULL
               AND  t.transaction_date::date BETWEEN bp.start_date AND bp.end_date
             GROUP BY t.type`,
            [userId, periodId],
        );
        return result.rows as Array<{ type: string; total: string }>;
    },

    /* ─── Account balance ─── */
    getAccountBalance: async (userId: string) => {
        const result = await query(
            `SELECT balance, currency
             FROM   accounts
             WHERE  user_id = $1
             LIMIT  1`,
            [userId],
        );
        return result.rows[0] ?? null;
    },

    /* ─── Category breakdown (all types) ─── */
    getCategoryBreakdown: async (userId: string, periodId: string) => {
        const result = await query(
            `SELECT
               c.id   AS category_id,
               c.name AS category_name,
               c.icon AS category_icon,
               t.type,
               SUM(ts.amount) AS total
             FROM   transaction_splits ts
             JOIN   transactions t    ON ts.transaction_id = t.id
             JOIN   categories   c    ON ts.category_id    = c.id
             JOIN   budget_periods bp ON bp.id = $2
             WHERE  t.user_id          = $1
               AND  t.status           = 'confirmed'
               AND  t.deleted_at       IS NULL
               AND  ts.deleted_at      IS NULL
               AND  t.transaction_date::date BETWEEN bp.start_date AND bp.end_date
             GROUP BY c.id, c.name, c.icon, t.type
             ORDER BY total DESC`,
            [userId, periodId],
        );
        return result.rows;
    },

    /* ─── Budget progress (expense categories only) ─── */
    getBudgetProgress: async (userId: string, periodId: string) => {
        const result = await query(
            `SELECT
               c.id                        AS category_id,
               c.name                      AS category_name,
               c.icon                      AS category_icon,
               b.amount                    AS budget_amount,
               b.currency                  AS budget_currency,
               COALESCE(SUM(ts.amount), 0) AS actual_amount
             FROM   budgets b
             JOIN   budget_periods bp ON bp.id = b.period_id AND bp.id = $2
             JOIN   categories c      ON b.category_id = c.id
             LEFT JOIN transactions t
               ON t.user_id         = $1
               AND t.type            = 'expense'
               AND t.status          = 'confirmed'
               AND t.deleted_at      IS NULL
               AND t.transaction_date BETWEEN bp.start_date AND bp.end_date
             LEFT JOIN transaction_splits ts
               ON ts.transaction_id = t.id
               AND ts.category_id   = c.id
               AND ts.deleted_at    IS NULL
             GROUP BY c.id, c.name, c.icon, b.amount, b.currency
             ORDER BY COALESCE(SUM(ts.amount), 0) / NULLIF(b.amount, 0) DESC NULLS LAST`,
            [userId, periodId],
        );
        return result.rows;
    },

    /* ─── User's preferred display currency ─── */
    getDisplayCurrency: async (userId: string): Promise<string> => {
        const result = await query(
            `SELECT target_currency FROM user_settings WHERE user_id = $1 LIMIT 1`,
            [userId],
        );
        return (result.rows[0]?.target_currency as string) ?? "VND";
    },

    /* ─── Expense category breakdown for an explicit date range (cycle-based) ─── */
    getExpenseBreakdownByDateRange: async (userId: string, startDate: string, endDate: string) => {
        const result = await query(
            `SELECT
               c.id   AS category_id,
               c.name AS category_name,
               c.icon AS category_icon,
               SUM(ts.amount) AS total
             FROM   transaction_splits ts
             JOIN   transactions t ON ts.transaction_id = t.id
             JOIN   categories   c ON ts.category_id    = c.id
             WHERE  t.user_id    = $1
               AND  t.type       = 'expense'
               AND  t.status     = 'confirmed'
               AND  t.deleted_at IS NULL
               AND  ts.deleted_at IS NULL
               AND  t.transaction_date::date BETWEEN $2::date AND $3::date
             GROUP BY c.id, c.name, c.icon
             ORDER BY total DESC`,
            [userId, startDate, endDate],
        );
        return result.rows;
    },

    /* ─── Expense category breakdown for a calendar month ─── */
    getExpenseBreakdownByMonth: async (userId: string, year: number, month: number) => {
        const result = await query(
            `SELECT
               c.id   AS category_id,
               c.name AS category_name,
               c.icon AS category_icon,
               SUM(ts.amount) AS total
             FROM   transaction_splits ts
             JOIN   transactions t ON ts.transaction_id = t.id
             JOIN   categories   c ON ts.category_id    = c.id
             WHERE  t.user_id    = $1
               AND  t.type       = 'expense'
               AND  t.status     = 'confirmed'
               AND  t.deleted_at IS NULL
               AND  ts.deleted_at IS NULL
               AND  EXTRACT(YEAR  FROM t.transaction_date) = $2
               AND  EXTRACT(MONTH FROM t.transaction_date) = $3
             GROUP BY c.id, c.name, c.icon
             ORDER BY total DESC`,
            [userId, year, month],
        );
        return result.rows;
    },

    /* ─── Type totals for a calendar month ─── */
    getSummaryByMonth: async (userId: string, year: number, month: number) => {
        const result = await query(
            `SELECT t.type, SUM(t.amount) AS total
             FROM   transactions t
             WHERE  t.user_id    = $1
               AND  t.status     = 'confirmed'
               AND  t.deleted_at IS NULL
               AND  EXTRACT(YEAR  FROM t.transaction_date) = $2
               AND  EXTRACT(MONTH FROM t.transaction_date) = $3
             GROUP BY t.type`,
            [userId, year, month],
        );
        return result.rows as Array<{ type: string; total: string }>;
    },

    /* ─── Type totals for an explicit date range (cycle-based) ─── */
    getSummaryByDateRange: async (userId: string, startDate: string, endDate: string) => {
        const result = await query(
            `SELECT t.type, SUM(t.amount) AS total
             FROM   transactions t
             WHERE  t.user_id         = $1
               AND  t.status          = 'confirmed'
               AND  t.deleted_at      IS NULL
               AND  t.transaction_date::date BETWEEN $2::date AND $3::date
             GROUP BY t.type`,
            [userId, startDate, endDate],
        );
        return result.rows as Array<{ type: string; total: string }>;
    },

    /* ─── Recent transactions ─── */
    getRecentTransactions: async (userId: string, periodId: string) => {
        const result = await query(
            `SELECT
               t.id,
               t.transaction_date,
               t.created_at,
               t.type,
               t.amount,
               t.currency,
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
             JOIN  budget_periods bp         ON bp.id = $2
             WHERE  t.user_id          = $1
               AND  t.status           = 'confirmed'
               AND  t.deleted_at       IS NULL
               AND  t.transaction_date::date BETWEEN bp.start_date AND bp.end_date
             GROUP BY t.id, t.transaction_date, t.type, t.amount, t.currency,
                      t.note, t.source, m.name
             ORDER BY t.transaction_date DESC, t.created_at DESC
             LIMIT 30`,
            [userId, periodId],
        );
        return result.rows;
    },
};
