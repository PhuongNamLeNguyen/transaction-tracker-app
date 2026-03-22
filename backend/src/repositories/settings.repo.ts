import { query } from "../db/client";

function calcPeriodDates(cycleStartDay: number): { startDate: string; endDate: string } {
    const today = new Date();
    const todayDay = today.getDate();

    let startDate: Date;
    if (cycleStartDay <= todayDay) {
        startDate = new Date(today.getFullYear(), today.getMonth(), cycleStartDay);
    } else {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, cycleStartDay);
    }

    // end_date = start_date + 1 month - 1 day
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, cycleStartDay - 1);

    const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { startDate: fmt(startDate), endDate: fmt(endDate) };
}

export const settingsRepo = {
    /* ─── Get preferences + account ─── */
    getSettings: async (userId: string) => {
        const [prefResult, accountResult] = await Promise.all([
            query(
                `SELECT theme, target_currency, cycle_start_day, system_language, time_zone
                 FROM   user_settings
                 WHERE  user_id = $1`,
                [userId],
            ),
            query(
                `SELECT id, name, currency, balance
                 FROM   accounts
                 WHERE  user_id = $1
                 LIMIT  1`,
                [userId],
            ),
        ]);
        return {
            preferences: prefResult.rows[0] ?? null,
            account: accountResult.rows[0] ?? null,
        };
    },

    /* ─── Update user display name ─── */
    updateUserName: async (userId: string, name: string) => {
        await query(
            `UPDATE users SET name = $2, updated_at = now() WHERE id = $1`,
            [userId, name],
        );
    },

    /* ─── Partial update of user_settings ─── */
    updateSettings: async (
        userId: string,
        fields: Partial<{
            theme: string;
            targetCurrency: string;
            cycleStartDay: number;
            systemLanguage: string;
            timeZone: string;
        }>,
    ) => {
        const sets: string[] = [];
        const values: unknown[] = [userId];

        if (fields.theme !== undefined) {
            values.push(fields.theme);
            sets.push(`theme = $${values.length}`);
        }
        if (fields.targetCurrency !== undefined) {
            values.push(fields.targetCurrency);
            sets.push(`target_currency = $${values.length}`);
        }
        if (fields.cycleStartDay !== undefined) {
            values.push(fields.cycleStartDay);
            sets.push(`cycle_start_day = $${values.length}`);
        }
        if (fields.systemLanguage !== undefined) {
            values.push(fields.systemLanguage);
            sets.push(`system_language = $${values.length}`);
        }
        if (fields.timeZone !== undefined) {
            values.push(fields.timeZone);
            sets.push(`time_zone = $${values.length}`);
        }

        if (sets.length === 0) return;
        sets.push("updated_at = now()");

        await query(
            `UPDATE user_settings SET ${sets.join(", ")} WHERE user_id = $1`,
            values,
        );
    },

    /* ─── Recalculate the most recent budget period dates for a new cycleStartDay ─── */
    updateMostRecentPeriodDates: async (userId: string, cycleStartDay: number) => {
        const { startDate, endDate } = calcPeriodDates(cycleStartDay);
        await query(
            `UPDATE budget_periods
             SET    start_date = $2, end_date = $3
             WHERE  id = (
                 SELECT id FROM budget_periods
                 WHERE  user_id = $1
                 ORDER  BY start_date DESC
                 LIMIT  1
             )`,
            [userId, startDate, endDate],
        );
    },
};
