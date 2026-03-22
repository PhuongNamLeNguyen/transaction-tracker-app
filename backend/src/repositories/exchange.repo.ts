import { query } from "../db/client";

export const exchangeRepo = {
    /** Returns rate where 1 unit of `from` = rate units of `to`. Null if not found. */
    getRate: async (from: string, to: string): Promise<number | null> => {
        const result = await query(
            `SELECT rate
             FROM   exchange_rates
             WHERE  base_currency   = $1
             AND    target_currency = $2
             LIMIT  1`,
            [from.toUpperCase(), to.toUpperCase()],
        );
        if (!result.rows[0]) return null;
        return Number(result.rows[0].rate);
    },
};
