import { query } from "../db/client";

export const onboardingRepo = {
    /* ─── Status check ─── */
    hasBudgetPeriod: async (userId: string): Promise<boolean> => {
        const result = await query(
            `SELECT COUNT(*) AS count FROM budget_periods WHERE user_id = $1`,
            [userId],
        );
        return parseInt(result.rows[0].count, 10) > 0;
    },

    getUserSettings: async (userId: string) => {
        const result = await query(
            `SELECT * FROM user_settings WHERE user_id = $1`,
            [userId],
        );
        return result.rows[0] ?? null;
    },

    /* ─── Categories ─── */
    getExpenseCategories: async () => {
        const result = await query(
            `SELECT id, name, icon FROM categories WHERE type = 'expense' ORDER BY name ASC`,
        );
        return result.rows as Array<{ id: string; name: string; icon: string | null }>;
    },

    verifyCategoryIds: async (ids: string[]): Promise<string[]> => {
        const result = await query(
            `SELECT id::text FROM categories WHERE id = ANY($1::text[]::uuid[])`,
            [ids],
        );
        return result.rows.map((r: { id: string }) => r.id);
    },

    /* ─── Write ─── */
    updateUserSettings: async (
        userId: string,
        cycleStartDay: number,
        targetCurrency: string,
    ) => {
        await query(
            `UPDATE user_settings
             SET cycle_start_day = $2,
                 target_currency = $3,
                 updated_at      = now()
             WHERE user_id = $1`,
            [userId, cycleStartDay, targetCurrency],
        );
    },

    deleteExistingPeriods: async (userId: string) => {
        // Delete budgets first (FK constraint), then periods
        await query(
            `DELETE FROM budgets
             WHERE period_id IN (
                 SELECT id FROM budget_periods WHERE user_id = $1
             )`,
            [userId],
        );
        await query(
            `DELETE FROM budget_periods WHERE user_id = $1`,
            [userId],
        );
    },

    createBudgetPeriod: async (
        userId: string,
        cycleStartDay: number,
    ): Promise<{ id: string }> => {
        const today = new Date();
        const todayDay = today.getDate();

        // Most recent occurrence of cycleStartDay on or before today
        let startDate: Date;
        if (cycleStartDay <= todayDay) {
            startDate = new Date(
                today.getFullYear(),
                today.getMonth(),
                cycleStartDay,
            );
        } else {
            startDate = new Date(
                today.getFullYear(),
                today.getMonth() - 1,
                cycleStartDay,
            );
        }

        // end_date = start_date + 1 month - 1 day
        const endDate = new Date(
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            cycleStartDay - 1,
        );

        const fmt = (d: Date) => d.toISOString().split("T")[0];

        const result = await query(
            `INSERT INTO budget_periods (user_id, start_date, end_date)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [userId, fmt(startDate), fmt(endDate)],
        );
        return result.rows[0];
    },

    createBudgets: async (
        periodId: string,
        budgets: Array<{ categoryId: string; amount: number }>,
        currency: string,
    ) => {
        for (const b of budgets) {
            await query(
                `INSERT INTO budgets (period_id, category_id, amount, currency)
                 VALUES ($1, $2, $3, $4)`,
                [periodId, b.categoryId, b.amount, currency],
            );
        }
    },

    createDefaultAccountIfMissing: async (userId: string, currency: string) => {
        const existing = await query(
            `SELECT id FROM accounts WHERE user_id = $1 LIMIT 1`,
            [userId],
        );
        if (existing.rows[0]) return;
        await query(
            `INSERT INTO accounts (user_id, name, type, currency, balance)
             VALUES ($1, 'Ví chính', 'wallet', $2, 0)`,
            [userId, currency],
        );
    },
};
