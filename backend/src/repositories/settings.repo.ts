import { query } from "../db/client";

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
};
