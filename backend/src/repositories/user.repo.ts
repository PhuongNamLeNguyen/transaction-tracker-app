import { query } from "../db/client";

export const userRepo = {
    findByEmail: async (email: string) => {
        const result = await query(
            "SELECT * FROM users WHERE email = $1 LIMIT 1",
            [email],
        );
        return result.rows[0] ?? null;
    },

    findById: async (id: string) => {
        const result = await query(
            "SELECT * FROM users WHERE id = $1 LIMIT 1",
            [id],
        );
        return result.rows[0] ?? null;
    },

    create: async (email: string, passwordHash: string) => {
        const result = await query(
            `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, is_verified, created_at`,
            [email, passwordHash],
        );
        return result.rows[0];
    },

    createSettings: async (userId: string) => {
        await query(`INSERT INTO user_settings (user_id) VALUES ($1)`, [
            userId,
        ]);
    },

    setVerified: async (userId: string) => {
        await query(
            `UPDATE users SET is_verified = true, updated_at = now()
       WHERE id = $1`,
            [userId],
        );
    },

    updatePassword: async (userId: string, passwordHash: string) => {
        await query(
            `UPDATE users SET password_hash = $2, updated_at = now()
       WHERE id = $1`,
            [userId, passwordHash],
        );
    },
};
