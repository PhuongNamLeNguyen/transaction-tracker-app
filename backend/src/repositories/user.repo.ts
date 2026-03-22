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

    create: async (email: string, passwordHash: string, name: string) => {
        const result = await query(
            `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, is_verified, created_at`,
            [email, passwordHash, name],
        );
        return result.rows[0];
    },

    createSettings: async (userId: string) => {
        await query(`INSERT INTO user_settings (user_id) VALUES ($1)`, [
            userId,
        ]);
    },

    updateCredentials: async (userId: string, passwordHash: string, name: string) => {
        await query(
            `UPDATE users SET password_hash = $2, name = $3, updated_at = now() WHERE id = $1`,
            [userId, passwordHash, name],
        );
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

    findByGoogleId: async (googleId: string) => {
        const result = await query(
            "SELECT * FROM users WHERE google_id = $1 LIMIT 1",
            [googleId],
        );
        return result.rows[0] ?? null;
    },

    createOAuthUser: async (email: string, name: string, googleId: string) => {
        const result = await query(
            `INSERT INTO users (email, name, google_id, is_verified)
       VALUES ($1, $2, $3, true)
       RETURNING id, email, name, is_verified, created_at`,
            [email, name, googleId],
        );
        return result.rows[0];
    },

    linkGoogleId: async (userId: string, googleId: string) => {
        await query(
            `UPDATE users SET google_id = $2, is_verified = true, updated_at = now()
       WHERE id = $1`,
            [userId, googleId],
        );
    },
};
